import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Download, ExternalLink, FileBarChart, FileText, Map } from "lucide-react";
import {
  checkPublicationFile,
  getPublicationPdfHref,
  getPublicationReadHref,
  getPublicacoes
} from "../../services/publications";

const categories = [
  { title: "Boletins informativos", icon: FileText },
  { title: "Boletins hidrometeorológicos", icon: CalendarDays },
  { title: "Relatórios técnicos", icon: FileBarChart },
  { title: "Mapas e produtos geoespaciais", icon: Map }
];

function formatDate(value) {
  if (!value) return "Data em atualização";
  return new Date(value).toLocaleDateString("pt-BR");
}

function statusClass(status) {
  const normalized = String(status || "rascunho").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("publicado")) return "published";
  if (normalized.includes("atualizacao")) return "updating";
  return "draft";
}

function PublicationActions({ publication, primary = false }) {
  const [pdfAvailable, setPdfAvailable] = useState(null);
  const readHref = getPublicationReadHref(publication);
  const pdfHref = getPublicationPdfHref(publication);

  useEffect(() => {
    let active = true;
    if (!pdfHref) {
      setPdfAvailable(false);
      return () => {
        active = false;
      };
    }
    checkPublicationFile(pdfHref).then((available) => {
      if (active) setPdfAvailable(available);
    });
    return () => {
      active = false;
    };
  }, [pdfHref]);

  return (
    <div className={primary ? "publication-actions featured-actions" : "publication-actions"}>
      {readHref && (
        <a className={primary ? "primary-button" : ""} href={readHref} target={readHref.startsWith("http") ? "_blank" : undefined} rel={readHref.startsWith("http") ? "noreferrer" : undefined}>
          Ler <ArrowRight aria-hidden="true" />
        </a>
      )}
      {pdfHref && pdfAvailable ? (
        <a href={pdfHref} target="_blank" rel="noreferrer">
          <Download aria-hidden="true" /> Baixar PDF
        </a>
      ) : (
        <span className="publication-disabled">PDF ainda não disponível</span>
      )}
    </div>
  );
}

function PublicationCard({ publication, icon: Icon }) {
  return (
    <article className="publication-card-v2 interactive-card">
      <header>
        <span><Icon aria-hidden="true" /></span>
        <div>
          <small>{publication.tipo || "Publicação"}</small>
          <h3>{publication.titulo}</h3>
        </div>
        <b className={`publication-status ${statusClass(publication.status)}`}>{publication.status || "rascunho"}</b>
      </header>
      <p>{publication.descricao}</p>
      <dl>
        <div>
          <dt>Data</dt>
          <dd>{formatDate(publication.data)}</dd>
        </div>
        <div>
          <dt>Período</dt>
          <dd>{publication.periodoReferencia || "Em atualização"}</dd>
        </div>
        <div>
          <dt>Fonte</dt>
          <dd>{publication.fonteDados || "Centro de Monitoramento"}</dd>
        </div>
      </dl>
      {publication.tags?.length > 0 && (
        <div className="publication-tags">
          {publication.tags.map((tag) => <small key={tag}>{tag}</small>)}
        </div>
      )}
      <PublicationActions publication={publication} />
    </article>
  );
}

export function PublicationsCenter() {
  const [data, setData] = useState({ destaque: null, publicacoes: [] });

  useEffect(() => {
    let active = true;
    getPublicacoes().then((result) => {
      if (active) setData(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      items: (data.publicacoes || []).filter((publication) => publication.categoria === category.title)
    }));
  }, [data.publicacoes]);

  const destaque = data.destaque;

  return (
    <section className="publications-center" id="boletins">
      <div className="section-heading">
        <p className="eyebrow">Publicações</p>
        <h2>Publicações do Centro de Monitoramento</h2>
        <p>Boletins digitais, PDFs, relatórios técnicos e produtos geoespaciais organizados para consulta pública.</p>
      </div>

      {destaque && (
        <article className="publication-feature">
          <div>
            <p className="eyebrow">Destaque</p>
            <h3>{destaque.titulo}</h3>
            <p>{destaque.descricao}</p>
            <div className="publication-feature-meta">
              <span>{destaque.tipo}</span>
              <span>{formatDate(destaque.data)}</span>
              <span>{destaque.periodoReferencia}</span>
              <b className={`publication-status ${statusClass(destaque.status)}`}>{destaque.status}</b>
            </div>
            {destaque.tags?.length > 0 && (
              <div className="publication-tags">
                {destaque.tags.map((tag) => <small key={tag}>{tag}</small>)}
              </div>
            )}
          </div>
          <div className="publication-feature-side">
            <ExternalLink aria-hidden="true" />
            <strong>{destaque.fonteDados || "Fonte oficial"}</strong>
            <PublicationActions publication={destaque} primary />
          </div>
        </article>
      )}

      <div className="publication-category-list">
        {grouped.map(({ title, icon: Icon, items }) => (
          <section className="publication-category" key={title}>
            <header>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
            </header>
            {items.length ? (
              <div className="publication-grid-v2">
                {items.map((publication) => (
                  <PublicationCard publication={publication} icon={Icon} key={publication.id || publication.titulo} />
                ))}
              </div>
            ) : (
              <p className="map-message">Nenhuma publicação cadastrada nesta categoria no momento.</p>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
