import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { DataHealthPanel } from './DataHealthPanel';
import { QuickActions } from "../layout/QuickActions";
import { SituationHero } from "./SituationHero";
import { OfficialAlertsSection } from "./OfficialAlertsSection";
import { PublicationsCenter } from "./PublicationsCenter";
import { RecommendationsSection } from "./RecommendationsSection";
import { OfficialSourcesSection } from "./OfficialSourcesSection";
import { AboutCenterSection } from "./AboutCenterSection";
import { monitoringFallback } from "../../data/monitoringFallback";
import { fetchMonitoringSnapshot } from "../../services/monitoringService";

const PublicMapSection = lazy(() =>
  import("../maps/PublicMapSection").then((module) => ({ default: module.PublicMapSection }))
);

export function SituationDashboard() {
  const [snapshot, setSnapshot] = useState(() => ({ ...monitoringFallback,
    ...Object.fromEntries(['alerts', 'emergency', 'rain', 'rivers', 'fire', 'drought'].map(key => [key, { ...monitoringFallback[key], state: 'loading' }])),
    generalStatus: { tone: 'empty', label: 'Atualizando dados', note: 'Consultando as fontes disponíveis, com tempo limite.' }
  }));
  const [refreshing, setRefreshing] = useState(true);
  const refresh = useRef(() => {});

  useEffect(() => {
    let active = true;
    let running = false, lastAttempt = 0;
    const update = async () => {
      if (running || Date.now() - lastAttempt < 30000) return;
      running = true;
      lastAttempt = Date.now();
      setRefreshing(true);
      try {
        const result = await fetchMonitoringSnapshot();
        if (active) setSnapshot(result);
      } catch {
        if (active) setSnapshot({ ...monitoringFallback, attemptedAt: new Date().toISOString(), generalStatus: { tone: 'empty', label: 'Consulta indisponível', note: 'Não foi possível atualizar as fontes neste momento.' } });
      } finally {
        running = false;
        if (active) setRefreshing(false);
      }
    };
    refresh.current = update;
    update();
    const interval = setInterval(() => { if (!document.hidden) update(); }, 300000);
    const onVisible = () => { if (!document.hidden && Date.now() - lastAttempt >= 300000) update(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <>
      <SituationHero snapshot={snapshot} />
      <QuickActions />
      <OfficialAlertsSection alerts={snapshot.alerts} emergency={snapshot.emergency} />
      <Suspense fallback={<section className="map-loading">Preparando visualização territorial...</section>}>
        <PublicMapSection
          rainStations={snapshot.rain.stations}
          rainSummary={snapshot.rain}
          riverStations={snapshot.rivers.stations || []}
          firePoints={snapshot.fire.points || []}
          fireSummary={snapshot.fire}
          emergencyPoints={snapshot.emergency.points || []}
          emergencySummary={snapshot.emergency}
          droughtSummary={snapshot.drought}
        />
      </Suspense>
      <DataHealthPanel snapshot={snapshot} refreshing={refreshing} onRefresh={() => refresh.current()} />
      <PublicationsCenter />
      <RecommendationsSection />
      <OfficialSourcesSection />
      <AboutCenterSection />
    </>
  );
}
