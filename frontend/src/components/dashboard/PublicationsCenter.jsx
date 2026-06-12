import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  FileBarChart,
  FileText,
  LibraryBig
} from "lucide-react";
import {
  getPublicationReadHref,
  getPublicacoes
} from "../../services/publications";
import { HydroBulletinPdfGenerator } from "./HydroBulletinPdfGenerator";

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function PublicationsCenter() {
  const [data, setData] = useState({ relatoriosTecnicos: [], boletinsDefesaCivil: [] });

  useEffect(() => {
    let active = true;
    getPublicacoes().then((result) => {
      if (active) setData(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const featuredReport = (data.relatoriosTecnicos || [])[0];
  const featuredReportHref = getPublicationReadHref(featuredReport);
  const reportCount = data.relatoriosTecnicos?.length || 0;
  const bulletinCount = data.boletinsDefesaCivil?.length || 0;

  const reportMeta = useMemo(() => {
    if (!featuredReport) return "Acervo em atualização";
    return [featuredReport.categoria, featuredReport.periodoReferencia].filter(Boolean).join(" | ");
  }, [featuredReport]);

  return (
    <section className="publications-library clean" id="boletins">
      <div className="library-heading clean">
        <p className="eyebrow">Biblioteca</p>
        <h2>Publicações da Defesa Civil</h2>
        <p>
          Acesse os produtos técnicos e os boletins gerados pelo Centro de Monitoramento de forma direta,
          organizada e com foco no que precisa ser consultado.
        </p>
      </div>

      <div className="library-primary-grid">
        <article className="library-primary-card report">
          <header>
            <span className="library-primary-icon"><FileBarChart aria-hidden="true" /></span>
            <div>
              <small>{countLabel(reportCount, "documento", "documentos")}</small>
              <h3>Relatórios Técnicos</h3>
            </div>
          </header>
          <p>
            Documentos analíticos produzidos sob demanda para aprofundar temas específicos de interesse da Defesa Civil.
          </p>
          <div className="library-featured-item">
            <span>Destaque</span>
            <strong>{featuredReport?.titulo || "Relatórios técnicos em atualização"}</strong>
            <small>{reportMeta}</small>
          </div>
          <div className="library-primary-actions">
            {featuredReportHref ? (
              <>
                <a className="primary-button" href={featuredReportHref} target={featuredReportHref.startsWith("http") ? "_blank" : undefined} rel={featuredReportHref.startsWith("http") ? "noreferrer" : undefined}>
                  Ver relatórios <ArrowRight aria-hidden="true" />
                </a>
                <a href={featuredReportHref} target={featuredReportHref.startsWith("http") ? "_blank" : undefined} rel={featuredReportHref.startsWith("http") ? "noreferrer" : undefined}>
                  Ler relatório
                </a>
              </>
            ) : (
              <span>Acervo em atualização</span>
            )}
          </div>
        </article>

        <article className="library-primary-card bulletin">
          <header>
            <span className="library-primary-icon"><FileText aria-hidden="true" /></span>
            <div>
              <small>{countLabel(bulletinCount, "boletim cadastrado", "boletins cadastrados")}</small>
              <h3>Boletins da Defesa Civil</h3>
            </div>
          </header>
          <p>
            Publicações periódicas geradas com base nos dados monitorados pelo Centro de Monitoramento.
          </p>
          <div className="library-featured-item">
            <span>Boletim Hidrometeorológico</span>
            <strong>Gerado sob demanda com os dados disponíveis no painel.</strong>
            <small>Chuva, rios, alertas, fogo, seca e recomendações à população.</small>
          </div>
          <HydroBulletinPdfGenerator />
        </article>
      </div>

      <div className="library-clean-note" aria-label="Acervo de publicações">
        <LibraryBig aria-hidden="true" />
        <span>Relatórios são produtos técnicos sob demanda. Boletins são publicações periódicas de monitoramento.</span>
      </div>
    </section>
  );
}
