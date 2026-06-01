function formatUpdate(value) {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function safeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
}

function isOlderThan(value, hours) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time > hours * 60 * 60 * 1000;
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
  const fireData = data?.focos_calor || {};
  const count = safeCount(fireData?.quantidade24h ?? data?.resumo?.focos_calor_24h);
  const sourceUpdatedAt = fireData?.atualizadoEm || data?.atualizado_em;
  const updateFailed = fireData?.status === "erro";
  const stale = isOlderThan(sourceUpdatedAt, 36);
  if (count === null || updateFailed) {
    return {
      ...fallback,
      state: "error",
      tone: "empty",
      value: "Dados indisponíveis",
      description: "Não foi possível atualizar este dado no momento. Consulte a fonte oficial.",
      source: "INPE Queimadas",
      points: [],
      updatedAt: formatUpdate(sourceUpdatedAt)
    };
  }

  const points = (fireData?.pontos_24h || [])
    .map((point) => ({
      city: point.municipio || point.city || "Município não informado",
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      satellite: point.satelite || point.satellite || "",
      detectedAt: point.data_hora_gmt || point.detectedAt || "",
      biome: point.bioma || point.biome || ""
    }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  return {
    ...fallback,
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
    burnedArea: data?.area_queimada?.area_queimada_ha
      ? {
          hectares: Number(data.area_queimada.area_queimada_ha),
          year: data.area_queimada.ano_referencia,
          period: data.area_queimada.periodo,
          rasterUrl: data.area_queimada.raster_url,
          source: data.area_queimada.fonte
        }
      : null,
    updatedAt: formatUpdate(sourceUpdatedAt),
    csvUrl: fireData?.csv_url || null,
    period: fireData?.periodo || "arquivo diário",
    referenceFile: fireData?.referenciaArquivo || null,
    rawStatus: fireData?.status || "legado"
  };
}

export function parseAlertIndicator(data, fallback) {
  const cemaden = safeCount(data?.resumo?.alertas_cemaden_to);
  const inmet = safeCount(data?.resumo?.avisos_inmet_to_hoje);
  if (cemaden === null || inmet === null) return { ...fallback, state: "error", value: "Dados indisponíveis" };

  const count = cemaden + inmet;
  const details = (data?.resumo?.avisos_inmet_detalhes || []).map(normalizeAlertDetail);
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
    inmetCount: inmet,
    futureInmetCount: safeCount(data?.resumo?.avisos_inmet_to_futuro) || 0,
    details,
    primaryDetail: details[0] || null,
    updatedAt: formatUpdate(data.atualizado_em)
  };
}

export function parseDroughtIndicator(data, fallback) {
  const drought = data?.seca;
  if (!drought?.situacao_geral || !drought?.resumo) {
    return { ...fallback, state: "error", value: "Dados indisponíveis" };
  }

  const tones = { "Sem seca": "normal", Fraca: "attention", Moderada: "alert", Severa: "emergency", Extrema: "emergency" };
  const count = safeCount(drought.resumo.com_seca) || 0;
  return {
    ...fallback,
    state: "ready",
    tone: tones[drought.situacao_geral] || "empty",
    value: drought.situacao_geral,
    description: `${count} municípios com algum grau de seca | Tendência: ${drought.tendencia || "não informada"}.`,
    source: drought.fonte || "CEMADEN / Alerta-Secas - IIS3",
    summary: drought.resumo,
    reference: drought.referencia,
    municipalities: drought.municipios || [],
    updatedAt: formatUpdate(data.atualizado_em)
  };
}

export function parseEmergencyIndicator(data, fallback) {
  const summary = data?.s2id?.resumo;
  const count = safeCount(summary?.federal);
  if (count === null) return { ...fallback, state: "error", value: "Dados indisponíveis" };

  const points = (data.s2id.reconhecimentos_vigentes || [])
    .map((record) => ({
      ...record,
      latitude: Number(record.latitude),
      longitude: Number(record.longitude)
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
    se: safeCount(summary.se) || 0,
    ecp: safeCount(summary.ecp) || 0,
    federal: count,
    points,
    updatedAt: formatUpdate(data.atualizado_em)
  };
}
