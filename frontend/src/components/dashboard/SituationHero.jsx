import { useMemo, useRef } from 'react';
import { TriangleAlert, CloudRain, Waves, Flame, LandPlot, SunDim, Landmark, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusCard } from '../cards/StatusCard';
import { buildStateDashboard, indicatorTime } from '../../services/stateDashboard.js';
import '../../state-dashboard.css';
import { MeteorologiaTocantinsPanel } from "./MeteorologiaTocantinsPanel";

export function SituationHero({ snapshot }) {
  const { cards, health } = useMemo(() => buildStateDashboard(snapshot), [snapshot]);
  const grid = useRef(null);
  const move = direction => grid.current?.scrollBy({left:direction * (grid.current.firstElementChild?.getBoundingClientRect().width + 14),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  const icons = { alerts:TriangleAlert, rain:CloudRain, rivers:Waves, fire:Flame, burned:LandPlot, drought:SunDim, emergency:Landmark, health:Database };
  return (
    <section className="situation-hero state-dashboard" id="situacao">
      <div className="hero-heading">
        <div>
          <p className="eyebrow">Monitorar para prevenir. Informar para proteger.</p>
          <h1>Panorama Atual!</h1>
          <p className="lead">
            Monitoramento de chuva, rios, fogo, seca, alertas oficiais e situações de emergência
            para orientar a população e apoiar a Defesa Civil.
          </p>
        </div>
        <MeteorologiaTocantinsPanel />
      </div>
      <p className="public-note">
        Visão estadual · {snapshot.attemptedAt ? `${health.available} de ${health.total} bases com dados confirmados · Consulta: ${indicatorTime({updatedAt:snapshot.attemptedAt})}` : 'Atualizando fontes'}. Cada indicador informa sua própria referência.
      </p>
      <div className="state-card-navigation"><button type="button" aria-label="Indicador anterior" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></button><button type="button" aria-label="Próximo indicador" onClick={() => move(1)}><ChevronRight aria-hidden="true" /></button></div>
      <div className="cards-grid hero-cards state-cards" ref={grid}>
        {cards.map(card => <StatusCard key={card.id} icon={icons[card.id]} title={card.title} indicator={card} className={`state-card theme-${card.id}`} />)}
      </div>
    </section>
  );
}
