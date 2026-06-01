import { useEffect, useState } from "react";
import { ArrowRight, Download, ExternalLink, FileText } from "lucide-react";
import { checkPublicationFile, getPublicacoes, resolvePublicPath } from "../../services/publications";

export function FeaturedBulletin() {
  const [publication, setPublication] = useState(null);
  const [fileAvailable, setFileAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    getPublicacoes().then(async (data) => {
      if (!active) return;
      const featured = data.relatorioDestaque;
      setPublication(featured);
      setFileAvailable(await checkPublicationFile(featured?.arquivo));
    });
    return () => {
      active = false;
    };
  }, []);

  const fileHref = resolvePublicPath(publication?.arquivo);
  const mapsHref = publication?.mapasHref || "#mapa-prioritario";
  const isPdf = String(fileHref || "").toLowerCase().includes(".pdf");

  return (
    <section className="featured-bulletin" id="boletins">
      <div>
        <p className="eyebrow">Relatório em destaque</p>
        <h2>{publication?.titulo || "Relatório técnico"}</h2>
        <p>{publication?.subtitulo || "Arquivo ainda não disponível"}</p>
        {!fileAvailable && <small className="publication-unavailable">Arquivo ainda não disponível</small>}
      </div>
      <div className="bulletin-actions">
        {fileAvailable && fileHref ? (
          <>
            <a className="primary-button" href={fileHref} target="_blank" rel="noreferrer">
              {isPdf ? <FileText aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
              {isPdf ? "Ler relatório" : "Abrir notícia oficial"}
            </a>
            {isPdf && (
              <a href={fileHref} download>
                <Download aria-hidden="true" /> Baixar PDF
              </a>
            )}
          </>
        ) : (
          <span className="publication-disabled">Arquivo ainda não disponível</span>
        )}
        <a href={mapsHref}>
          Ver mapas <ArrowRight aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
