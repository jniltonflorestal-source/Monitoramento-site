const fallbackPublications = {
  relatorioDestaque: {
    titulo: "Incêndios Florestais no Tocantins - 2025",
    subtitulo: "Panorama técnico sobre áreas queimadas, focos de calor, resposta operacional e impactos ambientais no Estado.",
    arquivo: "/docs/relatorios/relatorio-incendios-florestais-tocantins-2025.pdf",
    tipo: "Relatório técnico",
    ano: 2025,
    data: "2026-05-27",
    tags: ["incêndios florestais", "áreas queimadas", "focos de calor"],
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
