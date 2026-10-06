import { nonNegativeValue, assessFreshness, publishedQuality, unavailableIndicator, FRESHNESS_HOURS, finiteValue } from './dataQuality.js';

function formatUpdate(value) {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function safeCount(value) {
  return nonNegativeValue(value);
}

function isOlderThan(value, hours) {
  return assessFreshness(value, hours).status !== 'current';
}

function formatAlertPeriod(value) {
  return value.replace(
    /(\d{4})-(\d{2})-(\d{2})/g,
    (_, year, month, day) => `${day}/${month}/${year}`
  );
}

function preventiveGuidance(title) {
  const eventName = title.toLocaleLowerCase("pt-BR");
  if (eventName.includes("umidade")) {
    return "Hidrate-se, evite exposição prolongada ao sol e redobre a atenção com crianças e idosos.";
  }
  if (eventName.includes("chuva") || eventName.includes("tempestade")) {
    return "Evite áreas alagadas e acompanhe as orientações dos órgãos oficiais.";
  }
  return "Acompanhe os canais oficiais e siga as orientações da Defesa Civil.";
}

function normalizeAlertDetail(detail) {
  const title = String(detail?.title || "Aviso meteorológico")
    .replace(/^Vigente hoje:\s*/i, "")
    .trim();
  const [severity = "Informativo", period = "Consulte a vigência no canal oficial"] = String(
    detail?.detail || ""
  )
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    title,
    severity,
    period: formatAlertPeriod(period),
    location: detail?.location || "Municípios não informados na consulta automática.",
    issuer: "INMET",
    recommendation: preventiveGuidance(title)
  };
}

export function parseFireIndicator(data, fallback) {
  const area = data?.area_queimada;
  const areaQuality = publishedQuality(data, ['area_queimada_mapbiomas'], 48);
  const burnedArea = nonNegativeValue(area?.area_queimada_ha) === null ? null : {
    hectares: Number(area.area_queimada_ha), year: area.ano_referencia, period: area.periodo,
    rasterUrl: area.raster_url, source: area.fonte || 'MapBiomas Monitor do Fogo',
    updatedAt: areaQuality.observedAt, quality: areaQuality
  };
  const fireData = data?.focos_calor || {};
  const count = safeCount(fireData?.quantidade24h ?? data?.resumo?.focos_calor_24h);
  const sourceUpdatedAt = fireData?.atualizadoEm || data?.atualizado_em;
  const quality = assessFreshness(sourceUpdatedAt, FRESHNESS_HOURS.fire);
  const updateFailed = fireData?.status === "erro" || Boolean(data?.erros_atualizacao?.focos_calor_inpe);
  const stale = isOlderThan(sourceUpdatedAt, 36);
  if (count === null || updateFailed) {
    return {
      ...fallback,
      state: "error",
      tone: "empty",
      value: "Dados indisponíveis",
      description: "Não foi possível atualizar este dado no momento. Consulte a fonte oficial.",
      source: "INPE Queimadas",
      quality: { ...quality, status: 'error', message: 'Não foi possível confirmar o arquivo diário do INPE.' },
      observedAt: sourceUpdatedAt,
      points: [],
      burnedArea,
      updatedAt: formatUpdate(sourceUpdatedAt)
    };
  }

  const points = (fireData?.pontos_24h || [])
    .map((point) => ({
      city: point.municipio || point.city || "Município não informado",
      latitude: finiteValue(point.latitude),
      longitude: finiteValue(point.longitude),
      satellite: point.satelite || point.satellite || "",
      detectedAt: point.data_hora_gmt || point.detectedAt || "",
      biome: point.bioma || point.biome || ""
    }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  return {
    ...fallback,
    quality,
    observedAt: sourceUpdatedAt,
    state: stale ? "error" : "ready",
    tone: stale ? "empty" : count > 0 ? "attention" : "normal",
    value: stale ? "Dados desatualizados" : `${count} ${count === 1 ? "foco" : "focos"}`,
    description: stale
      ? "Não foi possível confirmar uma atualização recente do INPE. Consulte a fonte oficial."
      : count
        ? `Pontos detectados no arquivo diário; ${points.length} localizados no mapa.`
        : "Nenhum foco identificado no arquivo diário consultado.",
    source: fireData?.fonte ? `${fireData.fonte} | arquivo diário` : "INPE Queimadas | arquivo diário",
    points: stale ? [] : points,
    burnedArea,
    updatedAt: formatUpdate(sourceUpdatedAt),
    csvUrl: fireData?.csv_url || null,
    period: fireData?.periodo || "arquivo diário",
    referenceFile: fireData?.referenciaArquivo || null,
    rawStatus: fireData?.status || "legado"
  };
}

export function parseAlertIndicator(data, fallback) {
  const quality = publishedQuality(data, ['alertas_cemaden', 'avisos_inmet'], FRESHNESS_HOURS.alerts);
  if (quality.status !== 'current') return unavailableIndicator(fallback, quality);
  const cemaden = safeCount(data?.resumo?.alertas_cemaden_to);
  const inmet = safeCount(data?.resumo?.avisos_inmet_to_hoje);
  if (cemaden === null || inmet === null) return unavailableIndicator(fallback, { ...quality, status: 'unknown', message: 'Contagem de alertas não informada pela fonte.' });

  const count = cemaden + inmet;
  const details = (data?.resumo?.avisos_inmet_detalhes || []).filter(detail => !/^Previsto:/i.test(detail?.title || '')).map(normalizeAlertDetail);
  return {
    ...fallback,
    state: "ready",
    tone: count > 0 ? "alert" : "normal",
    value: `${count} ${count === 1 ? "ativo" : "ativos"}`,
    description: count
      ? "Há avisos oficiais vigentes identificados nas consultas automáticas."
      : "Nenhum alerta vigente identificado nas consultas automáticas.",
    source: "CEMADEN / INMET",
    cemadenCount: cemaden,
    quality,
    observedAt: quality.observedAt,
    inmetCount: inmet,
    futureInmetCount: safeCount(data?.resumo?.avisos_inmet_to_futuro) || 0,
    details,
    primaryDetail: details[0] || null,
    updatedAt: formatUpdate(quality.observedAt)
  };
}

export function parseDroughtIndicator(data, fallback) {
  const drought = data?.seca;
  if (!drought?.situacao_geral || !drought?.resumo) {
    return { ...fallback, state: "error", value: "Dados indisponíveis" };
  }

  const tones = { "Sem seca": "normal", Fraca: "attention", Moderada: "alert", Severa: "emergency", Extrema: "emergency" };
  const count = safeCount(drought.resumo.com_seca);
  const reference = /^\d{4}-\d{2}-\d{2}/.test(drought.referencia || '') ? `${drought.referencia.slice(0,10)}T00:00:00Z` : null;
  const quality = assessFreshness(reference, FRESHNESS_HOURS.drought);
  const consultation = publishedQuality(data, ['seca_iis3'], 48);
  if (consultation.status === 'error') Object.assign(quality, consultation);
  return {
    ...fallback,
    state: quality.status === 'current' ? 'ready' : 'error',
    tone: quality.status === 'current' ? tones[drought.situacao_geral] || 'empty' : 'empty',
    value: drought.situacao_geral,
    description: `${quality.status !== 'current' ? 'Referência histórica. ' : ''}${count ?? 'Quantidade não informada de'} municípios com algum grau de seca | Tendência: ${drought.tendencia || "não informada"}.`,
    quality,
    observedAt: reference,
    source: drought.fonte || "CEMADEN / Alerta-Secas - IIS3",
    summary: drought.resumo,
    reference: drought.referencia,
    municipalities: drought.municipios || [],
    updatedAt: formatUpdate(data.atualizado_em)
  };
}

export function parseEmergencyIndicator(data, fallback) {
  const quality = publishedQuality(data, ['s2id'], FRESHNESS_HOURS.emergency);
  if (quality.status !== 'current') return unavailableIndicator(fallback, quality);
  const summary = data?.s2id?.resumo;
  const count = safeCount(summary?.federal);
  if (count === null) return unavailableIndicator(fallback, { ...quality, status: 'unknown', message: 'Contagem de reconhecimentos não informada.' });

  const points = (data.s2id.reconhecimentos_vigentes || [])
    .map((record) => ({
      ...record,
      latitude: finiteValue(record.latitude),
      longitude: finiteValue(record.longitude)
    }))
    .filter((record) => Number.isFinite(record.latitude) && Number.isFinite(record.longitude));

  return {
    ...fallback,
    state: "ready",
    tone: count > 0 ? "emergency" : "normal",
    value: `${count} ${count === 1 ? "município" : "municípios"}`,
    description: count
      ? "Com reconhecimento federal vigente identificado na consulta pública."
      : "Sem municípios com reconhecimento federal vigente identificado.",
    source: data.s2id.fonte || "S2ID / SEDEC-MIDR",
    se: safeCount(summary.se),
    ecp: safeCount(summary.ecp),
    federal: count,
    quality,
    observedAt: quality.observedAt,
    points,
    updatedAt: formatUpdate(quality.observedAt)
  };
}
