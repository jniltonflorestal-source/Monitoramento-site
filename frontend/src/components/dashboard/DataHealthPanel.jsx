import { Database, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { dataHealthRows } from '../../services/stateDashboard.js';
import '../../data-health.css';

const formatTime = value => {
  if (!value) return 'Não informado';
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toLocaleString('pt-BR') : value;
};

export function DataHealthPanel({ snapshot, refreshing, onRefresh }) {
  const detailsRef = useRef(null);
  useEffect(() => {
    const openFromHash = () => { if (window.location.hash === '#qualidade-dados' && detailsRef.current) detailsRef.current.open = true; };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    window.addEventListener('popstate', openFromHash);
    return () => { window.removeEventListener('hashchange', openFromHash); window.removeEventListener('popstate', openFromHash); };
  }, []);
  const rows = dataHealthRows(snapshot, refreshing);
  return <section className="data-health" id="qualidade-dados" aria-label="Qualidade dos dados">
    <details ref={detailsRef}>
      <summary><Database size={19} aria-hidden="true" /> Qualidade e atualização dos dados <span>{rows.filter(row=>!row.current).length} fontes exigem consulta ou verificação</span></summary>
      <div className="data-health-toolbar">
        <p>Verificação do portal: {formatTime(snapshot.attemptedAt)}. Consulta a cada 5 minutos com a página visível; isso não altera a frequência de publicação das fontes.</p>
        <button type="button" onClick={onRefresh} disabled={refreshing}><RefreshCw size={16} aria-hidden="true" /> {refreshing ? 'Atualizando fontes...' : 'Consultar novamente'}</button>
      </div>
      <p role="status">{refreshing ? 'Consulta em andamento, com tempo limite. As datas abaixo pertencem à última consulta concluída.' : 'Cadastro, leitura e referência mensal são informações distintas. Ausência de medição não significa ausência de risco.'}</p>
      <div className="data-health-grid">{rows.map(row=><article key={row.key} className="data-health-item">
        <h3>{row.label}</h3><strong className={row.current ? 'data-health-current' : ''}>{row.status}</strong>
        <p>{row.note}</p><dl><dt>Leitura / referência</dt><dd>{formatTime(row.updatedAt)}</dd><dt>Última tentativa</dt><dd>{formatTime(row.attemptedAt)}</dd></dl>
      </article>)}</div>
      <p>Critérios de exibição: chuva até 3h, consulta de alertas até 6h, INPE até 36h e S2ID até 48h. Seca é produto mensal: referência de até 120 dias, sempre identificada. Esses limites são controles do portal, não critérios oficiais de risco.</p>
    </details>
  </section>;
}
