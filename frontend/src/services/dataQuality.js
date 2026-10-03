// Portal display policies, not official alert thresholds or source SLAs.
export const FRESHNESS_HOURS = { alerts: 6, emergency: 48, fire: 36, rain: 3, drought: 24 * 120 };

export function finiteValue(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

export function nonNegativeValue(value) {
  const number = finiteValue(value);
  return number !== null && number >= 0 ? number : null;
}

export function timestamp(value) {
  if (typeof value !== 'string') return null;
  // Do not guess DD/MM dates, date ranges, or an observation's timezone.
  const normalized = value.trim().replace(/ (\d\d:\d\d:\d\d) UTC$/, 'T$1Z');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(normalized)) return null;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}

export function assessFreshness(value, hours, now = Date.now()) {
  const time = timestamp(value);
  if (time === null) return { status: 'unknown', message: 'Horário da leitura não confirmado', observedAt: null };
  if (time > now + 5 * 60000) return { status: 'invalid', message: 'Horário da leitura inconsistente', observedAt: value };
  if (now - time > hours * 3600000) return { status: 'stale', message: 'Dados desatualizados', observedAt: value };
  return { status: 'current', message: 'Atualização recente', observedAt: value };
}

export function publishedQuality(data, labels, hours) {
  const results = labels.map(label => {
    const metadata = data?.qualidade_fontes?.[label];
    const observedAt = metadata ? metadata.ultimoSucesso || null : data?.atualizado_em;
    const quality = assessFreshness(observedAt, hours);
    if (data?.erros_atualizacao?.[label] || metadata?.status === 'erro') {
      return { ...quality, status: 'error', message: 'Falha na última consulta da fonte; valor anterior não confirmado', attemptedAt: metadata?.ultimaTentativa || data?.atualizado_em };
    }
    return { ...quality, attemptedAt: metadata?.ultimaTentativa || data?.atualizado_em };
  });
  return results.find(result => result.status !== 'current') || results.sort((a,b) => timestamp(a.observedAt) - timestamp(b.observedAt))[0];
}

export function unavailableIndicator(fallback, quality) {
  return { ...fallback, state: 'error', tone: 'empty', value: quality?.status === 'stale' ? 'Dados desatualizados' : 'Dados indisponíveis', description: quality?.message || 'Não foi possível atualizar este dado no momento.', quality, observedAt: quality?.observedAt || null, updatedAt: quality?.observedAt ? new Date(quality.observedAt).toLocaleString('pt-BR') : null, points: [], stations: [], details: [], primaryDetail: null };
}

export async function fetchWithDeadline(url, type = 'json', timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`Fonte indisponível (HTTP ${response.status})`);
    return await response[type]();
  } finally { clearTimeout(timer); }
}

export function sumHourlyRain24h(rows, now = Date.now()) {
  const readings = new Map();
  for (const row of rows) {
    const time = timestamp(row.time), amount = nonNegativeValue(row.amount);
    if (time === null || amount === null || time <= now - 86400000 || time > now) continue;
    readings.set(time, amount);
  }
  const times = [...readings.keys()].sort((a,b)=>a-b);
  const continuous = times.length === 24 && times.every((t,i)=>!i || t-times[i-1] === 3600000);
  return { amount: continuous ? [...readings.values()].reduce((a,b)=>a+b,0) : null, validHours: times.length, updatedAt: times.length ? new Date(times.at(-1)).toISOString() : null };
}
