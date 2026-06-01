const fallbackBoletim = {
  numero: "001/2026",
  dataEmissao: "",
  periodoReferencia: "Dado em integração",
  status: "rascunho",
  responsavel: "Centro de Monitoramento da Defesa Civil do Tocantins",
  resumoExecutivo: "Boletim hidrometeorológico em estruturação. Os dados serão exibidos após integração e validação institucional.",
  situacaoGeral: {
    status: "sem_dados",
    texto: "Não foi possível atualizar este dado no momento."
  },
  alertas: {
    status: "sem_dados",
    quantidade: 0,
    descricao: "Não foi possível atualizar este dado no momento.",
    fonte: "IDAP / INMET / CEMADEN"
  },
  previsaoTempo: {
    status: "integracao",
    descricao: "Dado em integração",
    fonte: "INMET / CPTEC-INPE"
  },
  chuva: {
    estacoesConsultadas: 0,
    maiorAcumulado: "Dado em integração",
    municipioMaiorAcumulado: "Dado em integração",
    fonte: "CEMADEN / INMET / ANA / SEMARH",
    atualizadoEm: ""
  },
  rios: {
    estacoesMonitoradas: 0,
    normal: 0,
    atencao: 0,
    alerta: 0,
    emergencia: 0,
    tendenciaPredominante: "Dado em integração",
    fonte: "ANA / Telemetria",
    atualizadoEm: ""
  },
  usinas: [],
  focosCalor: {
    quantidade24h: 0,
    quantidadePeriodo: 0,
    periodo: "Dado em integração",
    fonte: "INPE Queimadas",
    atualizadoEm: ""
  },
  riscoFogo: {
    status: "integracao",
    descricao: "Dado em integração",
    fonte: "INPE / MapBiomas Fogo"
  },
  seca: {
    situacao: "Dado em integração",
    municipiosAfetados: 0,
    fonte: "Monitor de Secas / CEMADEN",
    atualizadoEm: ""
  },
  recomendacoes: [],
  fontes: []
};

export async function getBoletimAtual() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/boletim-atual.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Boletim indisponível");
    return await response.json();
  } catch {
    return fallbackBoletim;
  }
}
