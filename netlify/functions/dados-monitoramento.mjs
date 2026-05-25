const INPE_DAILY_DIR = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/";
const CEMADEN_ALERTS_URL = "https://painelalertas.cemaden.gov.br/wsAlertas2";
const INMET_WARNINGS_URL = "https://apiprevmet3.inmet.gov.br/avisos/ativos";
const CEMADEN_DROUGHT_META_URL = "https://mapasecas.cemaden.gov.br/rest/product/meta/iis3";
const CEMADEN_DROUGHT_WFS_URL = "https://secaswms.cemaden.gov.br/produtos/wfs";

const baseData = {
  atualizado_em: new Date().toISOString(),
  resumo: {
    alertas_cemaden_to: 0,
    alertas_cemaden_to_nivel_maximo: "Sem alerta vigente",
    avisos_inmet_to_hoje: 0,
    avisos_inmet_to_futuro: 0,
    avisos_inmet_to_severidade_maxima: "Sem aviso vigente",
    avisos_inmet_detalhes: [],
    estacoes_fluviometricas_ana: null,
    focos_calor_24h: 128,
    area_queimada_ano_ha: 245000,
    chuva_24h_mm: 18.4,
    estacoes_operando: 32
  },
  fontes: {
    alertas: "CEMADEN",
    alertas_geo: "Cemaden",
    avisos_meteorologicos: "INMET",
    seca: "Cemaden / Alerta-Secas - IIS3",
    s2id: "S2ID / SEDEC-MIDR",
    chuva: "INMET / CEMADEN",
    rios: "ANA / Telemetria",
    focos: "INPE Queimadas",
    area_queimada: "MapBiomas Fogo / INPE AQ"
  }
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map((header) => header.trim());

  return lines.map((line) => {
    const values = line.split(",");
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ? values[index].trim() : "";
      return row;
    }, {});
  });
}

async function findLatestInpeCsv() {
  const response = await fetch(INPE_DAILY_DIR);
  if (!response.ok) throw new Error("Diretorio diario do INPE indisponivel");

  const html = await response.text();
  const files = [...html.matchAll(/focos_diario_br_\d{8}\.csv/g)].map((match) => match[0]);
  if (!files.length) throw new Error("CSV diario do INPE nao encontrado");

  return `${INPE_DAILY_DIR}${files[files.length - 1]}`;
}

async function countTocantinsFires() {
  const csvUrl = await findLatestInpeCsv();
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error("CSV diario do INPE indisponivel");

  const rows = parseCsv(await response.text());
  return rows.filter((row) => {
    const state = String(row.estado || row.Estado || row.uf || row.UF || "").toUpperCase();
    return state === "TOCANTINS" || state === "TO";
  }).length;
}

async function fetchTocantinsAlerts() {
  const response = await fetch(CEMADEN_ALERTS_URL);
  if (!response.ok) throw new Error("Painel de alertas do CEMADEN indisponivel");

  const body = await response.json();
  const alerts = (body.alertas || []).filter((alert) => alert.status === 1 && alert.uf === "TO");
  const levels = { "Muito Alto": 3, Alto: 2, Moderado: 1 };
  const highest = alerts.reduce(
    (current, alert) => levels[alert.nivel] > levels[current] ? alert.nivel : current,
    "Sem alerta vigente"
  );
  return { count: alerts.length, highest };
}

function tocantinsMunicipalities(value) {
  const towns = String(value || "").split(",").filter((town) => / - TO \(/.test(town));
  if (!towns.length) return "Area do Tocantins indicada no poligono oficial.";
  const names = towns.slice(0, 6).map((town) => town.split(" - TO")[0].trim());
  return `${names.join(", ")}${towns.length > names.length ? ` e mais ${towns.length - names.length} municipio(s)` : ""}.`;
}

async function fetchTocantinsWeatherWarnings() {
  const response = await fetch(INMET_WARNINGS_URL);
  if (!response.ok) throw new Error("Avisos meteorologicos do INMET indisponiveis");
  const body = await response.json();
  const includesState = (warning) => String(warning.estados || "").split(",").includes("Tocantins");
  const today = (body.hoje || []).filter(includesState);
  const future = (body.futuro || []).filter(includesState);
  const rank = { "Perigo Potencial": 1, Perigo: 2, "Grande Perigo": 3 };
  const highest = today.reduce(
    (current, warning) => (rank[warning.severidade] || 0) > (rank[current] || 0) ? warning.severidade : current,
    "Sem aviso vigente"
  );
  const details = [...today.map((warning) => ({ warning, phase: "Vigente hoje" })), ...future.map((warning) => ({ warning, phase: "Previsto" }))]
    .map(({ warning, phase }) => ({
      title: `${phase}: ${warning.descricao}`,
      detail: `${warning.severidade} | ${warning.inicio} até ${warning.fim}`,
      location: tocantinsMunicipalities(warning.municipios)
    }));
  return { todayCount: today.length, futureCount: future.length, highest, details };
}

function droughtClassification(level) {
  if (level <= 2) return "Extrema";
  if (level === 3) return "Severa";
  if (level === 4) return "Moderada";
  if (level === 5) return "Fraca";
  return "Sem seca";
}

async function fetchDroughtMonth(viewparams) {
  const params = new URLSearchParams({
    service: "wfs",
    version: "2.0.0",
    request: "GetFeature",
    typeName: "produtos:iis3",
    outputFormat: "application/json",
    viewparams,
    CQL_FILTER: "sigla_uf='TO'",
    propertyName: "nm_mun,sigla_uf,nivel,referencia"
  });
  const response = await fetch(`${CEMADEN_DROUGHT_WFS_URL}?${params}`);
  if (!response.ok) throw new Error("Indice Integrado de Seca do CEMADEN indisponivel");
  const body = await response.json();
  return (body.features || []).map((feature) => ({
    nome: feature.properties.nm_mun,
    nivel: Number(feature.properties.nivel),
    classe: droughtClassification(Number(feature.properties.nivel)),
    referencia: feature.properties.referencia,
    s2id: { situacao: "Consultar S2ID", desastre: null, cobrade: null, decreto: null }
  }));
}

async function fetchTocantinsDrought() {
  const response = await fetch(CEMADEN_DROUGHT_META_URL);
  if (!response.ok) throw new Error("Metadados do Alerta-Secas indisponiveis");
  const metadata = await response.json();
  const dates = Object.keys(metadata.timesteps || {}).sort().reverse();
  const current = await fetchDroughtMonth(metadata.timesteps[dates[0]].viewparams);
  const previous = await fetchDroughtMonth(metadata.timesteps[dates[1]].viewparams);
  const prior = new Map(previous.map((city) => [city.nome, city.nivel]));
  const changes = current.reduce((result, city) => {
    const oldLevel = prior.get(city.nome);
    if (city.nivel > oldLevel) result.melhoraram += 1;
    else if (city.nivel < oldLevel) result.agravaram += 1;
    else result.estaveis += 1;
    return result;
  }, { melhoraram: 0, agravaram: 0, estaveis: 0 });
  const worstLevel = Math.min(...current.map((city) => city.nivel));
  return {
    produto: "IIS3",
    fonte: "Cemaden / Alerta-Secas - IIS3",
    referencia: dates[0],
    referencia_anterior: dates[1],
    situacao_geral: droughtClassification(worstLevel),
    tendencia: changes.melhoraram > changes.agravaram ? "Melhora" : changes.agravaram > changes.melhoraram ? "Agravamento" : "Estabilidade",
    resumo: {
      com_seca: current.filter((city) => city.nivel <= 5).length,
      moderada_ou_superior: current.filter((city) => city.nivel <= 4).length,
      severa_ou_extrema: current.filter((city) => city.nivel <= 3).length,
      municipios_criticos: current.filter((city) => city.nivel === worstLevel).map((city) => city.nome),
      ...changes
    },
    municipios: current,
    s2id: {
      fonte: "S2ID / SEDEC-MIDR",
      vigentes: null,
      ultima_base_aberta_identificada: "2022",
      status: "Consulta oficial necessária para reconhecimentos vigentes",
      url: "https://s2id.mi.gov.br/paginas/series/"
    }
  };
}

function buildStatuses(data) {
  const summary = data.resumo;
  return [
    {
      icon: "cloud-rain",
      label: "Chuvas",
      description: `${String(summary.chuva_24h_mm).replace(".", ",")} mm acumulados nas últimas 24h`,
      value: "Monitoramento"
    },
    {
      icon: "waves",
      label: "Rios",
      description: "Cotas consultáveis na rede telemétrica ANA",
      value: "Consulta"
    },
    {
      icon: "flame",
      label: "Focos de calor",
      description: `${summary.focos_calor_24h} focos registrados no arquivo diário do INPE`,
      value: summary.focos_calor_24h > 0 ? "Ativo" : "Sem foco"
    },
    {
      icon: "radio-tower",
      label: "Rede operacional",
      description: `${summary.estacoes_operando} estacoes ou pontos em acompanhamento`,
      value: "24h"
    }
  ];
}

export default async () => {
  const data = structuredClone(baseData);

  try {
    data.resumo.focos_calor_24h = await countTocantinsFires();
    const alertSummary = await fetchTocantinsAlerts();
    data.resumo.alertas_cemaden_to = alertSummary.count;
    data.resumo.alertas_cemaden_to_nivel_maximo = alertSummary.highest;
    const warningSummary = await fetchTocantinsWeatherWarnings();
    data.resumo.avisos_inmet_to_hoje = warningSummary.todayCount;
    data.resumo.avisos_inmet_to_futuro = warningSummary.futureCount;
    data.resumo.avisos_inmet_to_severidade_maxima = warningSummary.highest;
    data.resumo.avisos_inmet_detalhes = warningSummary.details;
    data.seca = await fetchTocantinsDrought();
    data.atualizado_em = new Date().toISOString();
    data.status = buildStatuses(data);
    data.automacao = {
      alertas_cemaden: "automatico_horario",
      avisos_inmet: "automatico_horario",
      seca_iis3: "automatico_mensal_consultado_horariamente",
      s2id: "estrutura_preparada_consulta_oficial",
      focos_calor: "automatico",
      chuva: "manual",
      rios: "automatico_ana_sob_demanda",
      area_queimada: "manual"
    };
  } catch (error) {
    data.status = buildStatuses(data);
    data.automacao = {
      alertas_cemaden: "fallback",
      avisos_inmet: "fallback",
      focos_calor: "falha_fallback_json",
      chuva: "manual",
      rios: "automatico_ana_sob_demanda",
      area_queimada: "manual"
    };
    data.erro = error.message;
  }

  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900"
    }
  });
};
