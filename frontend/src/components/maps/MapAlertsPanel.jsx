import { TriangleAlert, ArrowRight } from 'lucide-react';
import { indicatorTime } from '../../services/stateDashboard.js';

export function MapAlertsPanel({ alerts }) {
  const available = alerts?.state === 'ready';
  return <aside className="map-alerts-panel" aria-label="Avisos oficiais no mapa">
    <h3><TriangleAlert size={20} aria-hidden="true" /> Alertas e avisos oficiais</h3>
    <strong>{available ? alerts.value : 'Dados atuais não confirmados'}</strong>
    <p>{available ? alerts.description : 'Consulte os órgãos emissores. Ausência de dados não significa ausência de alerta.'}</p>
    <p>Fonte: {alerts?.source || 'CEMADEN / INMET'}<br />Atualização: {indicatorTime(alerts)}</p>
    {available && alerts.details?.map((alert, index) => <article key={index}>
      <h4>{alert.title}</h4><strong>{alert.severity}</strong>
      <p>{alert.location}</p><p>{alert.period}</p><p>{alert.recommendation}</p>
    </article>)}
    <p>A abrangência é a informada no aviso. O mapa não atribui risco aos municípios sem geometria oficial do alerta.</p>
    <a href="#alertas">Consultar avisos e canais oficiais <ArrowRight size={16} aria-hidden="true" /></a>
  </aside>;
}
