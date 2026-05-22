import { readFile, writeFile } from "node:fs/promises";

const INPE_DAILY_DIR = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/";
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
      description: `${summary.rios_em_atencao} pontos hidrologicos em nivel de atencao`,
      value: summary.rios_em_atencao > 0 ? "Atencao" : "Normal"
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
data.atualizado_em = new Date().toISOString();
data.status = buildStatuses(data);
data.automacao = {
  focos_calor: "automatico_inpe_diario",
  chuva: "manual",
  rios: "manual",
  area_queimada: "manual"
};

await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
