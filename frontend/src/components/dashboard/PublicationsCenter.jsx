import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Download,
  FileBarChart,
  FileText,
  Grid2X2,
  List,
  Search
} from "lucide-react";
import {
  checkPublicationFile,
  getPublicationPdfHref,
  getPublicationReadHref,
  getPublicacoes
} from "../../services/publications";
import { HydroBulletinPdfGenerator } from "./HydroBulletinPdfGenerator";

const tabs = [
  { id: "todos", label: "Todos" },
  { id: "relatorios", label: "Relatórios Técnicos" },
  { id: "boletins", label: "Boletins da Defesa Civil" }
];

function formatDate(value) {
  if (!value) return "Data em atualização";
  return new Date(value).toLocaleDateString("pt-BR");
}

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function statusClass(status) {
  const normalized = normalizeText(status);
  if (normalized.includes("publicado")) return "published";
  if (normalized.includes("revisao")) return "review";
  if (normalized.includes("atualizacao")) return "updating";
  return "draft";
}

function asCard(publication, group) {
  const isReport = group === "relatorios";
  return {
    ...publication,
    group,
    displayType: isReport ? "Relatório Técnico" : "Boletim da Defesa Civil",
    displayCategory: isReport ? publication.categoria : publication.subtipo,
    displayDate: isReport ? publication.dataPublicacao : publication.dataEmissao,
    displaySource: isReport ? publication.responsavel : (publication.fontes || []).join(" / "),
    icon: isReport ? FileBarChart : FileText,
    accent: isReport ? "report" : "bulletin"
  };
}

function matchesDate(item, start, end) {
  const date = item.displayDate;
  if (!date) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function PublicationActions({ publication }) {
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
    <div className="library-actions">
      {readHref && (
        <a className="primary-button" href={readHref} target={readHref.startsWith("http") ? "_blank" : undefined} rel={readHref.startsWith("http") ? "noreferrer" : undefined}>
          Ler <ArrowRight aria-hidden="true" />
        </a>
      )}
      {pdfHref && pdfAvailable ? (
        <a href={pdfHref} target="_blank" rel="noreferrer">
          <Download aria-hidden="true" /> Baixar PDF
        </a>
      ) : (
        <span>PDF ainda não disponível</span>
      )}
    </div>
  );
}

function LibraryCard({ publication, view }) {
  const Icon = publication.icon;
  return (
    <article className={`library-card ${publication.accent} ${view}`}>
      <header>
        <span className="library-icon"><Icon aria-hidden="true" /></span>
        <div>
          <small>{publication.displayType}</small>
          <h3>{publication.titulo}</h3>
        </div>
        <b className={`publication-status ${statusClass(publication.status)}`}>{publication.status || "rascunho"}</b>
      </header>
      <p>{publication.descricao}</p>
      <dl>
        <div>
          <dt>Data</dt>
          <dd>{formatDate(publication.displayDate)}</dd>
        </div>
        <div>
          <dt>Referência</dt>
          <dd>{publication.periodoReferencia || "Em atualização"}</dd>
        </div>
        <div>
          <dt>{publication.group === "relatorios" ? "Responsável" : "Fontes"}</dt>
          <dd>{publication.displaySource || "Defesa Civil do Tocantins"}</dd>
        </div>
      </dl>
      {publication.group === "boletins" && publication.numero && <small className="library-number">Nº {publication.numero}</small>}
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
  const [data, setData] = useState({ relatoriosTecnicos: [], boletinsDefesaCivil: [] });
  const [activeTab, setActiveTab] = useState("todos");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [view, setView] = useState("grid");

  useEffect(() => {
    let active = true;
    getPublicacoes().then((result) => {
      if (active) setData(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => [
    ...(data.relatoriosTecnicos || []).map((item) => asCard(item, "relatorios")),
    ...(data.boletinsDefesaCivil || []).map((item) => asCard(item, "boletins"))
  ], [data]);

  const categories = useMemo(() => {
    const values = cards.map((item) => item.displayCategory).filter(Boolean);
    return ["todas", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [cards]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    return cards.filter((item) => {
      if (activeTab !== "todos" && item.group !== activeTab) return false;
      if (category !== "todas" && item.displayCategory !== category) return false;
      if (!matchesDate(item, dateStart, dateEnd)) return false;
      const haystack = normalizeText([item.titulo, item.descricao, item.displayType, item.displayCategory, item.periodoReferencia, item.status, ...(item.tags || [])].join(" "));
      return !q || haystack.includes(q);
    });
  }, [activeTab, cards, category, dateEnd, dateStart, query]);

  const featuredReport = (data.relatoriosTecnicos || [])[0];

  return (
    <section className="publications-library" id="boletins">
      <div className="library-heading">
        <p className="eyebrow">Biblioteca</p>
        <h2>Publicações da Defesa Civil</h2>
        <p>
          Acervo público do Centro de Monitoramento, separando relatórios técnicos produzidos sob demanda
          e boletins periódicos gerados a partir dos dados monitorados.
        </p>
      </div>

      <div className="library-explainers">
        <article>
          <FileBarChart aria-hidden="true" />
          <h3>Relatórios Técnicos</h3>
          <p>Documentos analíticos produzidos sob demanda para aprofundar temas específicos de interesse da Defesa Civil.</p>
        </article>
        <article>
          <FileText aria-hidden="true" />
          <h3>Boletins da Defesa Civil</h3>
          <p>Publicações periódicas geradas a partir dos dados monitorados pelo Centro de Monitoramento.</p>
        </article>
      </div>

      <div className="library-highlight-grid">
        {featuredReport && (
          <article className="library-highlight report">
            <span>Relatório técnico em destaque</span>
            <h3>{featuredReport.titulo}</h3>
            <p>{featuredReport.descricao}</p>
            <PublicationActions publication={featuredReport} />
          </article>
        )}
        <HydroBulletinPdfGenerator />
      </div>

      <div className="library-toolbar" aria-label="Filtros da biblioteca">
        <div className="library-tabs" role="tablist" aria-label="Tipo de publicação">
          {tabs.map((tab) => (
            <button className={activeTab === tab.id ? "active" : ""} type="button" onClick={() => setActiveTab(tab.id)} key={tab.id}>
              {tab.label}
            </button>
          ))}
        </div>
        <label className="library-search">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por título, tema ou tag" />
        </label>
        <div className="library-filter-row">
          <label>
            Tipo/categoria
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option value={item} key={item}>{item === "todas" ? "Todas" : item}</option>)}
            </select>
          </label>
          <label>
            Data inicial
            <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
          </label>
          <label>
            Data final
            <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
          </label>
          <div className="library-view-toggle" aria-label="Visualização">
            <button className={view === "grid" ? "active" : ""} type="button" onClick={() => setView("grid")}><Grid2X2 aria-hidden="true" /> Grid</button>
            <button className={view === "list" ? "active" : ""} type="button" onClick={() => setView("list")}><List aria-hidden="true" /> Lista</button>
          </div>
        </div>
      </div>

      <div className={`library-results ${view}`}>
        {filtered.length ? filtered.map((publication) => (
          <LibraryCard publication={publication} view={view} key={`${publication.group}-${publication.id}`} />
        )) : (
          <p className="map-message">Nenhuma publicação encontrada com os filtros selecionados.</p>
        )}
      </div>
    </section>
  );
}
