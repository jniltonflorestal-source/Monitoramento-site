import { readFile, writeFile } from "node:fs/promises";

const INPE_DAILY_DIR = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/";
const CEMADEN_ALERTS_URL = "https://painelalertas.cemaden.gov.br/wsAlertas2";
const INMET_WARNINGS_URL = "https://apiprevmet3.inmet.gov.br/avisos/ativos";
const DATA_FILE = new URL("../dados-monitoramento.json", import.meta.url);

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
  const containsTocantins = (warning) => String(warning.estados || "").split(",").includes("Tocantins");
  const today = (body.hoje || []).filter(containsTocantins);
  const future = (body.futuro || []).filter(containsTocantins);
  const severityRank = { "Perigo Potencial": 1, Perigo: 2, "Grande Perigo": 3 };
  const highest = today.reduce(
    (current, warning) => (severityRank[warning.severidade] || 0) > (severityRank[current] || 0) ? warning.severidade : current,
    "Sem aviso vigente"
  );
  const details = [...today.map((warning) => ({ warning, phase: "Vigente hoje" })), ...future.map((warning) => ({ warning, phase: "Previsto" }))]
    .map(({ warning, phase }) => ({
      title: `${phase}: ${warning.descricao}`,
      detail: `${warning.severidade} | ${warning.inicio} ate ${warning.fim}`,
      location: tocantinsMunicipalities(warning.municipios)
    }));

  return { todayCount: today.length, futureCount: future.length, highest, details };
}

function buildStatuses(data) {
  const summary = data.resumo;
  return [
    {
      icon: "cloud-rain",
      label: "Chuvas",
      description: `${String(summary.chuva_24h_mm).replace(".", ",")} mm acumulados nas ultimas 24h`,
      value: "Monitoramento"
    },
    {
      icon: "waves",
      label: "Rios",
      description: "Cotas consultaveis na rede telemetrica ANA",
      value: "Consulta"
    },
    {
      icon: "flame",
      label: "Focos de calor",
      description: `${summary.focos_calor_24h} focos registrados no arquivo diario do INPE`,
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

const data = JSON.parse(await readFile(DATA_FILE, "utf8"));
data.resumo.focos_calor_24h = await countTocantinsFires();
const alertSummary = await fetchTocantinsAlerts();
data.resumo.alertas_cemaden_to = alertSummary.count;
data.resumo.alertas_cemaden_to_nivel_maximo = alertSummary.highest;
const warningSummary = await fetchTocantinsWeatherWarnings();
data.resumo.avisos_inmet_to_hoje = warningSummary.todayCount;
data.resumo.avisos_inmet_to_futuro = warningSummary.futureCount;
data.resumo.avisos_inmet_to_severidade_maxima = warningSummary.highest;
data.resumo.avisos_inmet_detalhes = warningSummary.details;
data.atualizado_em = new Date().toISOString();
data.status = buildStatuses(data);
data.fontes.alertas_geo = "Cemaden";
data.fontes.avisos_meteorologicos = "INMET";
data.automacao = {
  alertas_cemaden: "automatico_horario",
  avisos_inmet: "automatico_horario",
  focos_calor: "automatico_inpe_diario",
  chuva: "manual",
  rios: "automatico_ana_sob_demanda",
  area_queimada: "manual"
};

await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
