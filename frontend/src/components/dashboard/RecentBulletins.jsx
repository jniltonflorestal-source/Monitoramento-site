import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileBarChart, FileText, Map } from "lucide-react";
import { getPublicacoes, resolvePublicPath } from "../../services/publications";

const groups = [
  { key: "boletins", title: "Boletins informativos", icon: FileText },
  { key: "relatorios", title: "Relatórios técnicos", icon: FileBarChart },
  { key: "mapas", title: "Mapas e produtos geoespaciais", icon: Map }
];

function formatDate(value) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function RecentBulletins() {
  const [publications, setPublications] = useState({ boletins: [], relatorios: [], mapas: [] });

  useEffect(() => {
    let active = true;
    getPublicacoes().then((data) => {
      if (active) setPublications(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const hasItems = useMemo(
    () => groups.some((group) => publications[group.key]?.length),
    [publications]
  );

  return (
    <section className="bulletins-list">
      <div className="section-heading">
        <p className="eyebrow">Boletins recentes</p>
        <h2>Produtos técnicos disponíveis</h2>
      </div>
      {!hasItems && <p className="map-message">Nenhuma publicação cadastrada no momento.</p>}
      <div className="publication-groups">
        {groups.map(({ key, title, icon: Icon }) => (
          <div className="publication-group" key={key}>
            <h3>{title}</h3>
            <div className="publication-grid">
              {(publications[key] || []).map((item) => {
                const href = resolvePublicPath(item.arquivo);
                return (
                  <a className="publication-card interactive-card" href={href || "#boletins"} key={`${key}-${item.titulo}`} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined}>
                    <Icon aria-hidden="true" />
                    <div>
                      <span className="publication-type">{item.tipo} | {formatDate(item.data)}</span>
                      <h3>{item.titulo}</h3>
                      <p>{item.descricao}</p>
                      {item.tags?.length > 0 && (
                        <div className="publication-tags">
                          {item.tags.map((tag) => <small key={tag}>{tag}</small>)}
                        </div>
                      )}
                    </div>
                    <span className="publication-link">
                      {String(item.arquivo || "").endsWith(".pdf") ? "Abrir PDF" : "Consultar"} <ExternalLink aria-hidden="true" />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
