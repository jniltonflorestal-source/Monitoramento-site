"""Bounded, credential-free ANA collection. No frontend-derived metrics."""
import json
import math
import os
from pathlib import Path
import queue
import re
import tempfile
import threading
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

BASE = 'https://telemetriaws1.ana.gov.br/ServiceANA.asmx/'
TARGET = Path(__file__).resolve().parents[1] / 'data/river-summary.json'
REQUEST_TIMEOUT = 12
COLLECTION_SECONDS = 235  # Reserve approximately five seconds for local persistence.
MAX_BYTES = 8 * 1024 * 1024
MAX_OUTPUT_BYTES = 32 * 1024 * 1024
MAX_STATIONS = 2000
MAX_POINTS = 192
USER_AGENT = 'Tocantins-River-Summary/1.0 (public ANA telemetry collector)'


def url_for(method, params):
    return BASE + method + '?' + urlencode(params)


def fetch_xml(url, timeout):
    request = Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'application/xml,text/xml'})
    with urlopen(request, timeout=timeout) as response:
        payload = response.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise ValueError('Resposta ANA excede limite')
    return payload


def local_name(tag):
    return tag.rsplit('}', 1)[-1]


def xml_root(payload):
    if len(payload) > MAX_BYTES:
        raise ValueError('XML excede limite')
    # ANA datasets do not require DTDs/entities (also catch UTF-16 encodings).
    guard = payload.replace(b'\x00', b'').upper() if isinstance(payload, bytes) else payload.upper()
    forbidden = (b'<!DOCTYPE', b'<!ENTITY') if isinstance(guard, bytes) else ('<!DOCTYPE', '<!ENTITY')
    if any(token in guard for token in forbidden):
        raise ValueError('DTD nao permitido')
    root = ET.fromstring(payload)
    if any(local_name(node.tag) == 'Fault' for node in root.iter()):
        raise ValueError('Falha SOAP')
    return root


def fields(node):
    return {local_name(child.tag): child for child in node}


def value(children, key):
    child = children.get(key)
    return (child.text or '').strip() if child is not None else ''


def number(raw):
    if isinstance(raw, bool) or raw is None or str(raw).strip() == '':
        raise ValueError('Numero ausente')
    parsed = float(str(raw).replace(',', '.'))
    if not math.isfinite(parsed):
        raise ValueError('Numero invalido')
    return parsed


def parse_inventory(payload):
    stations = {}
    for node in xml_root(payload).iter():
        if local_name(node.tag) != 'Table':
            continue
        children = fields(node)
        try:
            lat, lon = number(value(children, 'Latitude')), number(value(children, 'Longitude'))
            code = value(children, 'Codigo')
            if not code or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            stations[code] = dict(code=code, name=value(children, 'Nome'),
                                  river=value(children, 'RioNome'), city=value(children, 'nmMunicipio'),
                                  latitude=lat, longitude=lon)
        except ValueError:
            continue
    if not stations or len(stations) > MAX_STATIONS:
        raise ValueError('Inventario vazio, invalido ou acima do limite')
    return list(stations.values())


def timestamp(raw):
    if not isinstance(raw, str) or not re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', raw):
        raise ValueError('Data ISO invalida')
    return datetime.fromisoformat(raw.replace('Z', '+00:00'))


def reading_key(row):
    stamp = timestamp(row['dateTime'])
    # Naive timestamps are ordered as wall-clock values, never assigned a zone.
    return (stamp.astimezone(timezone.utc).replace(tzinfo=None)
            if stamp.tzinfo is not None else stamp)


def deduplicate_readings(readings):
    unique, conflicts = {}, set()
    for row in readings:
        # Aware datetimes compare by instant, naive ones only by wall clock.
        # Keep the original string in the retained row; never attach a timezone.
        instant = timestamp(row['dateTime'])
        if instant in conflicts:
            continue
        if instant in unique and unique[instant]['level'] != row['level']:
            del unique[instant]
            conflicts.add(instant)
        else:
            unique.setdefault(instant, row)
    return sorted(unique.values(), key=reading_key)[-MAX_POINTS:]


def parse_readings(payload, now):
    result = []
    for node in xml_root(payload).iter():
        if local_name(node.tag) not in ('DadosHidrometereologicos', 'DadosHidrometeorologicos'):
            continue
        children = fields(node)
        try:
            raw = value(children, 'DataHora')
            stamp = timestamp(raw)
            if stamp.tzinfo is not None:
                if not now - timedelta(days=2) <= stamp <= now:
                    continue
            elif not (now - timedelta(days=2)).date() <= stamp.date() <= now.date():
                continue
            level_node = children.get('Nivel')
            if level_node is None:
                continue
            nil = level_node.get('{http://www.w3.org/2001/XMLSchema-instance}nil') in ('true', '1')
            level = None if nil else number(value(children, 'Nivel'))
            result.append(dict(level=level, dateTime=raw))
        except (ValueError, TypeError):
            continue
    return deduplicate_readings(result)


def bounded_map(items, operation, deadline):
    """Daemon workers cannot delay process exit on stuck DNS or trickling reads.

    Workers only return results through a private queue; they never mutate output
    or write files. Inventory finishes before starting the three station workers.
    """
    jobs, results = queue.Queue(), queue.Queue()
    for index, item in enumerate(items):
        jobs.put((index, item))

    def worker():
        while time.monotonic() < deadline:
            try:
                index, item = jobs.get_nowait()
            except queue.Empty:
                return
            try:
                result = operation(item, min(REQUEST_TIMEOUT, max(.001, deadline - time.monotonic())))
            except Exception as error:
                result = error
            results.put((index, result))

    for _ in range(min(3, len(items))):
        threading.Thread(target=worker, daemon=True).start()
    received = {}
    while len(received) < len(items):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        try:
            index, result = results.get(timeout=remaining)
            received[index] = result
        except queue.Empty:
            break
    return [received.get(i, TimeoutError('Prazo global excedido')) for i in range(len(items))]


def previous_stations(previous):
    """Validate the persisted contract without dropping old, explicitly stale dates."""
    valid = {}
    for station in previous.get('stations', []):
        try:
            lat, lon = number(station['latitude']), number(station['longitude'])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180) or not station['code']:
                continue
            row = {key: str(station.get(key, '')) for key in ('code', 'name', 'river', 'city')}
            row.update(latitude=lat, longitude=lon)
            readings = []
            for point in station.get('readings', []):
                try:
                    timestamp(point['dateTime'])
                    level = None if point['level'] is None else number(point['level'])
                    readings.append(dict(level=level, dateTime=point['dateTime']))
                except (ValueError, TypeError, KeyError):
                    continue
            row['readings'] = deduplicate_readings(readings)
            valid[row['code']] = row
        except (ValueError, TypeError, KeyError):
            continue
    return valid


def collect(previous, fetch=fetch_xml, now=None, budget=COLLECTION_SECONDS):
    deadline = time.monotonic() + min(budget, COLLECTION_SECONDS)
    now = now or datetime.now(timezone.utc)
    attempted = now.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
    prior = previous_stations(previous)

    def fallback(station, message, status='error'):
        return dict(station, status=status, attemptedAt=attempted,
                    readings=prior.get(station['code'], {}).get('readings', []),
                    observation=message + '; historico anterior preservado, nao confirmado como atual.')

    params = dict(codEstDE='', codEstATE='', tpEst=1, nmEst='', nmRio='', codSubBacia='',
                  codBacia='', nmMunicipio='', nmEstado='Tocantins', sgResp='', sgOper='', telemetrica=1)
    inventory = bounded_map([url_for('HidroInventario', params)],
                            lambda url, timeout: parse_inventory(fetch(url, timeout)), deadline)[0]
    if isinstance(inventory, Exception):
        stations = [fallback(row, 'Falha no inventario: ' + type(inventory).__name__) for row in prior.values()]
    else:
        def read(station, timeout):
            params = dict(codEstacao=station['code'], dataInicio=(now - timedelta(days=2)).strftime('%d/%m/%Y'),
                          dataFim=now.strftime('%d/%m/%Y'))
            return parse_readings(fetch(url_for('DadosHidrometeorologicos', params), timeout), now)

        stations = []
        for station, result in zip(inventory, bounded_map(inventory, read, deadline)):
            if isinstance(result, Exception):
                stations.append(fallback(station, 'Falha na consulta: ' + type(result).__name__))
            elif not result:
                stations.append(fallback(station, 'Sem leituras validas na janela', 'unknown'))
            else:
                ambiguous = any(timestamp(point['dateTime']).tzinfo is None for point in result)
                status = 'unknown' if ambiguous or result[-1]['level'] is None else 'ok'
                observation = ('DataHora sem fuso; horario original preservado.' if ambiguous else
                               'Ultimo nivel nulo.' if status == 'unknown' else
                               'Consulta concluida; atualidade e deltas devem ser validados pelo consumidor.')
                stations.append(dict(station, status=status, attemptedAt=attempted,
                                     readings=result, observation=observation))
        present = {row['code'] for row in inventory}
        stations.extend(fallback(row, 'Estacao ausente no inventario atual')
                        for code, row in prior.items() if code not in present)
    statuses = {row['status'] for row in stations}
    status = 'ok' if statuses == {'ok'} else 'error' if not statuses or statuses == {'error'} else 'partial'
    return dict(source='ANA / Telemetria', attemptedAt=attempted, status=status, stations=stations)


def atomic_write(path, result):
    payload = json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode('utf-8')
    if len(payload) > MAX_OUTPUT_BYTES:
        raise ValueError('Resumo excede limite; arquivo anterior mantido')
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.river-', suffix='.tmp', delete=False) as stream:
            temporary = stream.name
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def main():
    previous = {}
    if TARGET.exists():
        # A corrupt/oversized local cache is not overwritten silently.
        if TARGET.stat().st_size > MAX_OUTPUT_BYTES:
            raise ValueError('Cache anterior acima do limite')
        previous = json.loads(TARGET.read_text(encoding='utf-8'))
    result = collect(previous)
    atomic_write(TARGET, result)
    print(f'ANA: {len(result["stations"])} stations; status={result["status"]}')


if __name__ == '__main__':
    main()
