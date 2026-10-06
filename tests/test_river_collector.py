import importlib.util
import io
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from datetime import datetime, timezone, timedelta
from urllib.parse import parse_qs, urlsplit

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/update-river-summary.py'
spec = importlib.util.spec_from_file_location('river', SCRIPT)
river = importlib.util.module_from_spec(spec) if SCRIPT.exists() else None
if river:
    spec.loader.exec_module(river)

NOW = datetime(2026, 10, 6, 12, tzinfo=timezone.utc)


def inventory(code='123', lat='-10,2'):
    return f'''<DataSet xmlns="urn:ana"><Table><Codigo>{code}</Codigo>
    <Nome>Porto</Nome><RioNome>Tocantins</RioNome><nmMunicipio>Palmas</nmMunicipio>
    <Latitude>{lat}</Latitude><Longitude>-48.3</Longitude></Table></DataSet>'''.encode()


def readings(level='0', date='2026-10-06T11:00:00Z'):
    return f'''<DataSet xmlns="urn:ana" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <DadosHidrometereologicos><DataHora>{date}</DataHora>
    <Nivel>{level}</Nivel></DadosHidrometereologicos></DataSet>'''.encode()


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(river, 'collector must exist')

    def collect(self, fetch, previous=None, **kwargs):
        return river.collect(previous or {}, fetch=fetch, now=NOW, **kwargs)

    def test_namespaces_and_coordinates(self):
        row = river.parse_inventory(inventory())[0]
        self.assertEqual((row['code'], row['latitude'], row['river']), ('123', -10.2, 'Tocantins'))
        for invalid in ('', 'nan', '91', '-91', 'Infinity'):
            with self.assertRaises(ValueError):
                river.parse_inventory(inventory(lat=invalid))

    def test_zero_negative_null_but_not_empty_or_invalid(self):
        for level, expected in [('0', 0), ('-12,5', -12.5)]:
            self.assertEqual(river.parse_readings(readings(level), NOW)[0]['level'], expected)
        nil = readings().replace(b'<Nivel>0</Nivel>', b'<Nivel xsi:nil="true"/>')
        self.assertIsNone(river.parse_readings(nil, NOW)[0]['level'])
        for invalid in ('', 'NaN', 'Infinity', 'broken'):
            self.assertEqual(river.parse_readings(readings(invalid), NOW), [])

    def test_raw_naive_timestamp_is_unknown(self):
        raw = '2026-10-06T11:00:00'
        result = self.collect(lambda url, timeout: inventory() if 'HidroInventario?' in url else readings(date=raw))
        self.assertEqual(result['stations'][0]['status'], 'unknown')
        self.assertEqual(result['stations'][0]['readings'][0]['dateTime'], raw)
        self.assertEqual(result['status'], 'partial')

    def test_window_dedup_and_cap(self):
        rows = b''.join(readings(str(i), (NOW - timedelta(minutes=i)).isoformat()) for i in range(220))
        parsed = river.parse_readings(b'<root>' + rows + readings('4', '2020-01-01T00:00:00Z') + b'</root>', NOW)
        self.assertEqual(len(parsed), 192)
        self.assertEqual(parsed[-1]['level'], 0)
        self.assertEqual(river.parse_readings(readings(date='nonsense'), NOW), [])
        self.assertEqual(river.parse_readings(readings(date='2026-10-07T00:00:00Z'), NOW), [])

    def test_success_and_escaped_url(self):
        urls = []
        def fetch(url, timeout):
            urls.append(url)
            self.assertLessEqual(timeout, 12)
            return inventory('a&amp;b') if 'HidroInventario?' in url else readings()
        result = self.collect(fetch)
        self.assertEqual(result['status'], 'ok')
        params = parse_qs(urlsplit(urls[1]).query)
        self.assertEqual(params['codEstacao'], ['a&b'])
        self.assertEqual(params['dataInicio'], ['04/10/2026'])
        self.assertEqual(result['source'], 'ANA / Telemetria')

    def prior(self):
        return self.collect(lambda url, timeout: inventory() if 'HidroInventario?' in url else readings('-1'))

    def test_inventory_failures_preserve_history(self):
        prior = self.prior()
        for body in (b'<broken', b'<DataSet/>', b'<Fault/>'):
            result = self.collect(lambda url, timeout: body, prior)
            self.assertEqual(result['status'], 'error')
            self.assertEqual(result['stations'][0]['status'], 'error')
            self.assertEqual(result['stations'][0]['readings'], prior['stations'][0]['readings'])

    def test_reading_failure_and_empty_preserve_history(self):
        prior = self.prior()
        for body, expected in [(b'<broken', 'error'), (b'<DataSet/>', 'unknown')]:
            result = self.collect(lambda url, timeout: inventory() if 'HidroInventario?' in url else body, prior)
            self.assertEqual(result['stations'][0]['status'], expected)
            self.assertEqual(result['stations'][0]['readings'], prior['stations'][0]['readings'])
            self.assertIn('anterior', result['stations'][0]['observation'])
            self.assertNotEqual(result['status'], 'ok')

    def test_deadline_including_stuck_inventory(self):
        def stuck(url, timeout):
            time.sleep(.3)
            return inventory()
        started = time.monotonic()
        result = self.collect(stuck, self.prior(), budget=.04)
        self.assertLess(time.monotonic() - started, .2)
        self.assertEqual(result['stations'][0]['status'], 'error')

    def test_concurrency_and_deadline_preserve_all_rows(self):
        lock = threading.Lock()
        active = peak = 0
        def fetch(url, timeout):
            nonlocal active, peak
            if 'HidroInventario?' in url:
                return b'<root>' + b''.join(inventory(str(i)) for i in range(9)) + b'</root>'
            with lock:
                active += 1
                peak = max(peak, active)
            time.sleep(.12)
            with lock:
                active -= 1
            return readings()
        result = self.collect(fetch, budget=.04)
        self.assertEqual(len(result['stations']), 9)
        self.assertLessEqual(peak, 3)
        self.assertTrue(all(row['status'] == 'error' for row in result['stations']))

    def test_atomic_write_failure_keeps_old_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'summary.json'
            river.atomic_write(path, {'old': True})
            with patch.object(river.os, 'replace', side_effect=OSError('locked')):
                with self.assertRaises(OSError):
                    river.atomic_write(path, {'new': True})
            self.assertEqual(json.loads(path.read_text()), {'old': True})
            self.assertEqual(len(list(path.parent.iterdir())), 1)

    def test_main_offline_writes_contract(self):
        result = self.prior()
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'data/river-summary.json'
            with patch.object(river, 'TARGET', target), patch.object(river, 'collect', return_value=result):
                with patch('sys.stdout', new=io.StringIO()):
                    river.main()
            self.assertEqual(json.loads(target.read_text()), result)

    def test_network_headers_and_size_limit(self):
        with patch.object(river, 'urlopen', return_value=io.BytesIO(b'<DataSet/>')) as opener:
            self.assertEqual(river.fetch_xml('https://example.test/', 12), b'<DataSet/>')
            request = opener.call_args.args[0]
            self.assertEqual(request.get_header('User-agent'), river.USER_AGENT)
            self.assertEqual(opener.call_args.kwargs['timeout'], 12)
        with patch.object(river, 'MAX_BYTES', 2):
            with patch.object(river, 'urlopen', return_value=io.BytesIO(b'abc')):
                with self.assertRaises(ValueError):
                    river.fetch_xml('https://example.test/', 12)

    def test_partial_failure_and_missing_station(self):
        prior = self.prior()
        result = self.collect(lambda url, timeout: inventory('456') if 'HidroInventario?' in url else readings(), prior)
        self.assertEqual(result['status'], 'partial')
        by_code = {s['code']: s for s in result['stations']}
        self.assertEqual(by_code['456']['status'], 'ok')
        self.assertEqual(by_code['123']['status'], 'error')
        self.assertEqual(by_code['123']['readings'], prior['stations'][0]['readings'])

    def test_duplicate_dates_null_state_and_exception(self):
        raw = readings()
        self.assertEqual(len(river.parse_readings(b'<root>' + raw + raw + b'</root>', NOW)), 1)
        nil = raw.replace(b'<Nivel>0</Nivel>', b'<Nivel xsi:nil="true"/>')
        result = self.collect(lambda url, timeout: inventory() if 'HidroInventario?' in url else nil)
        self.assertEqual(result['stations'][0]['status'], 'unknown')
        def failed(url, timeout):
            raise OSError('offline')
        result = self.collect(failed, self.prior())
        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['stations'][0]['readings'][0]['level'], -1)

    def test_dtd_rejected_and_oversized_write_preserves_file(self):
        with self.assertRaises(ValueError):
            river.parse_inventory(b'<!DOCTYPE root><root/>')
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'summary.json'
            river.atomic_write(target, {'old': True})
            with patch.object(river, 'MAX_OUTPUT_BYTES', 2):
                with self.assertRaises(ValueError):
                    river.atomic_write(target, {'new': True})
            self.assertEqual(json.loads(target.read_text()), {'old': True})

    def test_conflicting_instants_removed_regardless_of_order(self):
        for alternate in ('2026-10-06T11:00:00Z', '2026-10-06T08:00:00-03:00'):
            for levels in (('1', '2', '1'), ('2', '1', '2')):
                with self.subTest(alternate=alternate, levels=levels):
                    payload = b'<root>' + readings(levels[0]) + readings(levels[1], alternate) + readings(levels[2]) + b'</root>'
                    self.assertEqual(river.parse_readings(payload, NOW), [])

    def test_equivalent_duplicates_keep_first_raw_timestamp_and_latest_null(self):
        first = '2026-10-06T08:00:00-03:00'
        nil = readings(date='2026-10-06T12:00:00Z').replace(b'<Nivel>0</Nivel>', b'<Nivel xsi:nil="true"/>')
        payload = b'<root>' + readings('-2', first) + readings('-2') + nil + nil + b'</root>'
        parsed = river.parse_readings(payload, NOW)
        self.assertEqual(parsed, [{'level': -2, 'dateTime': first}, {'level': None, 'dateTime': '2026-10-06T12:00:00Z'}])
        result = self.collect(lambda url, timeout: inventory() if 'HidroInventario?' in url else payload)
        self.assertEqual(result['stations'][0]['status'], 'unknown')

    def test_null_numeric_conflict_is_not_resolved_by_picking_number(self):
        nil = readings().replace(b'<Nivel>0</Nivel>', b'<Nivel xsi:nil="true"/>')
        for payload in (nil + readings(), readings() + nil):
            self.assertEqual(river.parse_readings(b'<root>' + payload + b'</root>', NOW), [])

    def test_naive_duplicates_never_assumed_equivalent_to_utc(self):
        naive = '2026-10-06T11:00:00'
        payload = b'<root>' + readings('1', naive) + readings('2', naive) + readings('3') + b'</root>'
        self.assertEqual(river.parse_readings(payload, NOW), [{'level': 3, 'dateTime': '2026-10-06T11:00:00Z'}])

    def test_cached_conflicts_removed_before_fallback_and_cap(self):
        prior = self.prior()
        good = {'level': -1, 'dateTime': '2026-10-06T10:00:00Z'}
        latest = {'level': None, 'dateTime': '2026-10-06T12:00:00Z'}
        prior['stations'][0]['readings'] = [
            {'level': 1, 'dateTime': '2026-10-06T11:00:00Z'},
            {'level': 2, 'dateTime': '2026-10-06T08:00:00-03:00'},
            {'level': 1, 'dateTime': '2026-10-06T11:00:00Z'},
            good, good, latest, latest]
        with patch.object(river, 'MAX_POINTS', 2):
            result = self.collect(lambda url, timeout: b'<broken', prior)
        self.assertEqual(result['stations'][0]['readings'], [good, latest])
        self.assertEqual(result['stations'][0]['status'], 'error')


if __name__ == '__main__':
    unittest.main()
