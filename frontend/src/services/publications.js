const officialReportUrl = "https://www.to.gov.br/defesacivil/noticias/defesa-civil-do-tocantins-divulga-relatorio-tecnico-para-subsidiar-planejamento-e-acoes-integradas-contra-incendios-florestais/5barcdp80apo";

const fallbackPublications = {
  relatoriosTecnicos: [
    {
      id: "relatorio-incendios-florestais-2025",
      titulo: "Incêndios Florestais no Tocantins - 2025",
      descricao: "Panorama técnico sobre áreas queimadas, focos de calor, resposta operacional e impactos ambientais no Estado.",
      tipo: "Relatório Técnico",
      categoria: "Incêndios florestais",
      dataPublicacao: "2026-05-27",
      periodoReferencia: "2025",
      arquivoPdf: "",
      rota: officialReportUrl,
      responsavel: "Centro de Monitoramento da Defesa Civil do Tocantins",
      status: "publicado",
      tags: ["incêndios florestais", "áreas queimadas", "focos de calor"]
    }
  ],
  boletinsDefesaCivil: [
    {
      id: "boletim-hidrometeorologico-atual",
      titulo: "Boletim Hidrometeorológico de Hoje",
      numero: "001/2026",
      descricao: "Panorama diário de chuva, rios, previsão meteorológica, alertas, focos de calor, seca e recomendações à população.",
      tipo: "Boletim da Defesa Civil",
      subtipo: "Boletim Hidrometeorológico",
      dataEmissao: "2026-06-01",
      periodoReferencia: "Monitoramento em atualização contínua",
      arquivoPdf: "",
      rota: "#boletim-hidrometeorologico",
      status: "em atualização",
      fontes: ["INMET", "CEMADEN", "ANA", "INPE Queimadas", "S2ID", "IDAP"],
      tags: ["chuva", "rios", "previsão", "alertas", "hidrometeorologia"]
    }
  ]
};

export function resolvePublicPath(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("#")) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

export function getPublicationReadHref(publication) {
  return resolvePublicPath(publication?.rota || publication?.url || publication?.arquivo || publication?.arquivoPdf);
}

export function getPublicationPdfHref(publication) {
  return resolvePublicPath(publication?.arquivoPdf || (String(publication?.arquivo || "").toLowerCase().endsWith(".pdf") ? publication.arquivo : ""));
}

export async function checkPublicationFile(path) {
  if (!path || path.startsWith("#")) return true;
  if (/^https?:\/\//i.test(path)) return true;
  try {
    const response = await fetch(resolvePublicPath(path), { method: "HEAD", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

function normalizeLegacyPublication(item, kind) {
  if (kind === "relatorio") {
    return {
      id: item.id || item.titulo,
      titulo: item.titulo,
      descricao: item.descricao || item.subtitulo,
      tipo: "Relatório Técnico",
      categoria: item.categoria || "Relatórios técnicos",
      dataPublicacao: item.data,
      periodoReferencia: item.periodoReferencia || item.ano || "",
      arquivoPdf: String(item.arquivo || "").toLowerCase().endsWith(".pdf") ? item.arquivo : "",
      rota: item.rota || item.arquivo,
      responsavel: item.responsavel || "Centro de Monitoramento da Defesa Civil do Tocantins",
      status: item.status || "publicado",
      tags: item.tags || []
    };
  }

  return {
    id: item.id || item.titulo,
    titulo: item.titulo,
    numero: item.numero || "",
    descricao: item.descricao,
    tipo: "Boletim da Defesa Civil",
    subtipo: item.subtipo || item.tipo || "Boletim informativo",
    dataEmissao: item.data,
    periodoReferencia: item.periodoReferencia || "",
    arquivoPdf: String(item.arquivo || "").toLowerCase().endsWith(".pdf") ? item.arquivo : "",
    rota: item.rota || item.arquivo,
    status: item.status || "publicado",
    fontes: item.fontes || [item.fonteDados || "Defesa Civil do Tocantins"],
    tags: item.tags || []
  };
}

export function normalizePublicacoes(data) {
  if (Array.isArray(data?.relatoriosTecnicos) || Array.isArray(data?.boletinsDefesaCivil)) {
    return {
      relatoriosTecnicos: data.relatoriosTecnicos || [],
      boletinsDefesaCivil: data.boletinsDefesaCivil || []
    };
  }

  if (Array.isArray(data?.publicacoes)) {
    return {
      relatoriosTecnicos: [
        ...(data.destaque ? [normalizeLegacyPublication(data.destaque, "relatorio")] : []),
        ...data.publicacoes.filter((item) => String(item.tipo || "").toLowerCase().includes("relat")).map((item) => normalizeLegacyPublication(item, "relatorio"))
      ],
      boletinsDefesaCivil: data.publicacoes.filter((item) => !String(item.tipo || "").toLowerCase().includes("relat")).map((item) => normalizeLegacyPublication(item, "boletim"))
    };
  }

  return fallbackPublications;
}

export async function getPublicacoes() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/publicacoes.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Publicações indisponíveis");
    return normalizePublicacoes(await response.json());
  } catch {
    return fallbackPublications;
  }
}
