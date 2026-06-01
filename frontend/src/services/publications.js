const fallbackPublications = {
  relatorioDestaque: {
    titulo: "Defesa Civil do Tocantins divulga relatório técnico contra incêndios florestais",
    subtitulo: "Relatório técnico oficial para subsidiar planejamento e ações integradas contra incêndios florestais no Tocantins.",
    arquivo: "https://www.to.gov.br/defesacivil/noticias/defesa-civil-do-tocantins-divulga-relatorio-tecnico-para-subsidiar-planejamento-e-acoes-integradas-contra-incendios-florestais/5barcdp80apo",
    tipo: "Notícia oficial / Relatório técnico",
    ano: 2026,
    data: "2026-05-27",
    tags: ["incêndios florestais", "relatório técnico", "Defesa Civil"],
    mapasHref: "#mapa-prioritario"
  },
  boletins: [],
  relatorios: [],
  mapas: []
};

export function resolvePublicPath(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("#")) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
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

export async function getPublicacoes() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/publicacoes.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Publicações indisponíveis");
    return await response.json();
  } catch {
    return fallbackPublications;
  }
}
