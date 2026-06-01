const officialReportUrl = "https://www.to.gov.br/defesacivil/noticias/defesa-civil-do-tocantins-divulga-relatorio-tecnico-para-subsidiar-planejamento-e-acoes-integradas-contra-incendios-florestais/5barcdp80apo";

const fallbackPublications = {
  destaque: {
    id: "relatorio-incendios-florestais-oficial",
    titulo: "Relatório técnico contra incêndios florestais",
    descricao: "Publicação oficial da Defesa Civil do Tocantins para subsidiar planejamento e ações integradas contra incêndios florestais.",
    tipo: "Relatório técnico",
    categoria: "Relatórios técnicos",
    data: "2026-05-27",
    periodoReferencia: "2025/2026",
    status: "publicado",
    fonteDados: "Defesa Civil do Tocantins",
    arquivoPdf: "",
    rota: officialReportUrl,
    tags: ["incêndios florestais", "relatório técnico", "Defesa Civil"]
  },
  publicacoes: []
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

function fromLegacy(data) {
  const publicacoes = [
    ...(data.boletins || []).map((item) => ({ ...item, categoria: item.categoria || "Boletins informativos", rota: item.arquivo })),
    ...(data.relatorios || []).map((item) => ({ ...item, categoria: item.categoria || "Relatórios técnicos", rota: item.arquivo })),
    ...(data.mapas || []).map((item) => ({ ...item, categoria: item.categoria || "Mapas e produtos geoespaciais", rota: item.arquivo }))
  ];
  return {
    destaque: data.destaque || {
      id: "relatorio-destaque",
      titulo: data.relatorioDestaque?.titulo,
      descricao: data.relatorioDestaque?.subtitulo,
      tipo: data.relatorioDestaque?.tipo,
      categoria: "Relatórios técnicos",
      data: data.relatorioDestaque?.data,
      periodoReferencia: data.relatorioDestaque?.ano,
      status: "publicado",
      fonteDados: "Defesa Civil do Tocantins",
      arquivoPdf: String(data.relatorioDestaque?.arquivo || "").toLowerCase().endsWith(".pdf") ? data.relatorioDestaque.arquivo : "",
      rota: data.relatorioDestaque?.arquivo || officialReportUrl,
      tags: data.relatorioDestaque?.tags || []
    },
    publicacoes
  };
}

export function normalizePublicacoes(data) {
  if (Array.isArray(data?.publicacoes)) {
    return {
      destaque: data.destaque || fallbackPublications.destaque,
      publicacoes: data.publicacoes
    };
  }
  return fromLegacy(data || fallbackPublications);
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
