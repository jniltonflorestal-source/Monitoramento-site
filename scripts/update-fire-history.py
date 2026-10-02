"""Public INPE daily CSVs only; never combine sources in the detection count."""
import csv
import io
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import urlopen

BASE = 'https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/'
TARGET = Path(__file__).resolve().parents[1] / 'data/fire-history.json'

def fetch(url):
    with urlopen(url, timeout=25) as response:
        return response.read().decode('utf-8-sig')

def collect():
    now = datetime.now(timezone.utc)
    earliest = now - timedelta(days=7)
    previous = json.loads(TARGET.read_text(encoding='utf-8')) if TARGET.exists() else {}
    points, failures, files = [], [], []
    try:
        names = sorted(set(re.findall(r'focos_diario_br_\d{8}\.csv', fetch(BASE))))
        names = [n for n in names if earliest.strftime('%Y%m%d') <= n[-12:-4] <= now.strftime('%Y%m%d')]
        if not names:
            raise ValueError('Nenhum arquivo recente disponibilizado pelo INPE')
        for name in names:
            try:
                rows = csv.DictReader(io.StringIO(fetch(BASE + name)))
                for row in rows:
                    if (row.get('estado') or row.get('uf') or '').upper() not in ('TO', 'TOCANTINS'):
                        continue
                    try:
                        stamp = datetime.fromisoformat(row['data_hora_gmt'].replace('Z', '+00:00'))
                        if stamp.tzinfo is None:
                            stamp = stamp.replace(tzinfo=timezone.utc)
                        if not earliest <= stamp <= now:
                            continue
                        lat, lon = float(row['lat']), float(row['lon'])
                        if not (-14 <= lat <= -5 and -51 <= lon <= -45):
                            continue
                        points.append(dict(latitude=lat, longitude=lon, city=row.get('municipio'), satellite=row.get('satelite'), detectedAt=stamp.isoformat(), biome=row.get('bioma'), source='INPE'))
                    except (ValueError, KeyError):
                        continue
                files.append(name)
            except Exception as error:
                failures.append(f'{name}: {type(error).__name__}')
    except Exception as error:
        failures.append(str(error))
    for item in previous.get('points', []):
        try:
            if earliest <= datetime.fromisoformat(item['detectedAt']) <= now:
                points.append(item)
        except (ValueError, KeyError):
            pass
    unique = {(p['latitude'],p['longitude'],p['satellite'],p['detectedAt']):p for p in points}
    expected = {(earliest + timedelta(days=i)).strftime('%Y%m%d') for i in range(8)}
    missing = sorted(expected - {n[-12:-4] for n in files})
    result = dict(status='ready' if files and not failures and not missing else 'partial' if files else 'error', source='INPE Queimadas', updatedAt=now.isoformat() if files else previous.get('updatedAt'), lastAttempt=now.isoformat(), coverageStart=earliest.isoformat(), coverageEnd=now.isoformat(), files=files, missingDates=missing, errors=failures, points=list(unique.values()))
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'INPE: {len(unique)} detections; {len(files)} files; status={result["status"]}')

if __name__ == '__main__':
    collect()
