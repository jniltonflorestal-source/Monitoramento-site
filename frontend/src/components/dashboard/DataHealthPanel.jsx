import { Database, RefreshCw } from 'lucide-react';
import '../../data-health.css';

const formatTime = value => {
  if (!value) return 'Não informado';
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toLocaleString('pt-BR') : value;
};

export function DataHealthPanel({ snapshot, refreshing, onRefresh }) {
  const themes = [['alerts', 'Alertas · CEMADEN / INMET'], ['emergency', 'Reconhecimentos · S2ID'], ['rivers', 'Estações de rios · ANA'], ['fire', 'Focos · INPE'], ['drought', 'Seca · CEMADEN']];
  const rows = themes.map(([key, label]) => {
    const item = snapshot[key];
    const quality = item.quality;
    return {
      key, label,
      status: quality?.status === 'catalog' ? 'Cadastro disponível' : quality?.status === 'stale' ? 'Dados desatualizados' : item.state === 'ready' ? 'Dados disponíveis' : refreshing && !snapshot.attemptedAt ? 'Atualizando' : 'Dados indisponíveis',
      updatedAt: key === 'drought' && /^\d{4}-\d{2}/.test(item.reference || '') ? `${item.reference.slice(5,7)}/${item.reference.slice(0,4)}` : item.observedAt || (key === 'rain' ? item.updatedAt : null),
      attemptedAt: quality?.attemptedAt || item.attemptedAt || snapshot.attemptedAt,
      note: quality?.message || item.description,
      current: item.state === 'ready' && quality?.status !== 'catalog'
    };
  });
  for (const source of ['CEMADEN', 'INMET', 'ANA', 'SEMARH']) {
    const item = snapshot.rain.sourceBreakdown?.[source];
    rows.push({ key: `rain-${source}`, label: `Chuva · ${source}`, status: item?.label || (refreshing ? 'Atualizando' : 'Consulta indisponível'), updatedAt: item?.updatedAt, attemptedAt: item?.attemptedAt || snapshot.attemptedAt, current: item?.status === 'ready', note: item ? `${item.registeredCount ?? 'Não informado'} cadastradas; ${item.validCount ?? 'não informado'} com leitura válida; ${item.staleCount ?? 0} desatualizadas. ${item.message || ''}` : 'Consulta não concluída.' });
  }
  rows.push({key:'idap',label:'Alertas · IDAP', status:'Fonte em integração', note:'Consulta automática pública não configurada. Confirme no canal oficial.', current:false});
  return <section className="data-health" id="qualidade-dados" aria-label="Qualidade dos dados">
    <details>
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
