import { AlertasVigentesCard } from "../cards/AlertasVigentesCard";
import { Chuva24hCard } from "../cards/Chuva24hCard";
import { EmergenciaCalamidadeCard } from "../cards/EmergenciaCalamidadeCard";
import { FogoCard } from "../cards/FogoCard";
import { RiosMonitoradosCard } from "../cards/RiosMonitoradosCard";
import { SecaCard } from "../cards/SecaCard";
import { MeteorologiaTocantinsPanel } from "./MeteorologiaTocantinsPanel";

export function SituationHero({ snapshot }) {
  return (
    <section className="situation-hero" id="situacao">
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
        Dados oficiais e informações públicas reunidas para acompanhamento rápido de riscos no Estado.
      </p>
      <div className="cards-grid hero-cards">
        <AlertasVigentesCard data={snapshot.alerts} />
        <EmergenciaCalamidadeCard data={snapshot.emergency} />
        <Chuva24hCard data={snapshot.rain} />
        <RiosMonitoradosCard data={snapshot.rivers} />
        <FogoCard data={snapshot.fire} />
        <SecaCard data={snapshot.drought} />
      </div>
    </section>
  );
}
