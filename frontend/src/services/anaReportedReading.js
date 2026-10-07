import { finiteValue } from './dataQuality.js';

// Preserve ANA wall-clock observations for inspection, never as current UTC readings.
export function getAnaReportedReading(rows = []) {
  const readings = new Map(), conflicts = new Set();
  for (const row of rows) {
    const raw = String(row.dateTime || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(raw)) continue;
    const key = raw.replace(' ', 'T'), level = finiteValue(row.level);
    const parsed = new Date(`${key}Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,19) !== key) continue;
    if (readings.has(key) && readings.get(key).level !== level) conflicts.add(key);
    readings.set(key, {level, dateTime: raw});
  }
  return [...readings].filter(([key,row]) => !conflicts.has(key) && row.level !== null)
    .sort(([a],[b]) => a.localeCompare(b)).at(-1)?.[1] || null;
}
