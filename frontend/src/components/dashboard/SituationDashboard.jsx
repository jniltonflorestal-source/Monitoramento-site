import { lazy, Suspense, useEffect, useState } from "react";
import { QuickActions } from "../layout/QuickActions";
import { SituationHero } from "./SituationHero";
import { OfficialAlertsSection } from "./OfficialAlertsSection";
import { FeaturedBulletin } from "./FeaturedBulletin";
import { RecentBulletins } from "./RecentBulletins";
import { RecommendationsSection } from "./RecommendationsSection";
import { OfficialSourcesSection } from "./OfficialSourcesSection";
import { AboutCenterSection } from "./AboutCenterSection";
import { monitoringFallback } from "../../data/monitoringFallback";
import { fetchMonitoringSnapshot } from "../../services/monitoringService";

const PublicMapSection = lazy(() =>
  import("../maps/PublicMapSection").then((module) => ({ default: module.PublicMapSection }))
);

export function SituationDashboard() {
  const [snapshot, setSnapshot] = useState(monitoringFallback);

  useEffect(() => {
    let active = true;
    fetchMonitoringSnapshot().then((result) => {
      if (active) setSnapshot(result);
    });
    return () => {
      active = false;
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
      <FeaturedBulletin />
      <RecentBulletins />
      <RecommendationsSection />
      <OfficialSourcesSection />
      <AboutCenterSection />
    </>
  );
}
