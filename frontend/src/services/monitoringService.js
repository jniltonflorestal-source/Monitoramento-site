import { monitoringFallback } from "../data/monitoringFallback";
import { getAlertasVigentes } from "./idap";
import { getMunicipiosEmergencia } from "./s2id";
import { getChuva24h } from "./cemaden";
import { getSituacaoRios } from "./ana";
import { getFocosCalor24h } from "./inpe";
import { getSituacaoSeca } from "./monitorSecas";
import { unavailableIndicator } from './dataQuality.js';

let pendingSnapshot = null;

function boundedIndicator(fetcher, fallback) {
  let timer;
  return Promise.race([
    Promise.resolve().then(() => fetcher(fallback)),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Tempo limite da consulta')), 45000); })
  ]).catch(() => unavailableIndicator(fallback, { status: 'error', message: 'Não foi possível atualizar este dado no momento.' }))
    .finally(() => clearTimeout(timer));
}

export async function fetchMonitoringSnapshot() {
  if (pendingSnapshot) return pendingSnapshot;
  pendingSnapshot = collectMonitoringSnapshot().finally(() => { pendingSnapshot = null; });
  return pendingSnapshot;
}

async function collectMonitoringSnapshot() {
  const attemptedAt = new Date().toISOString();
  const [alerts, emergency, rain, rivers, fire, drought] = await Promise.all([
    boundedIndicator(getAlertasVigentes, monitoringFallback.alerts),
    boundedIndicator(getMunicipiosEmergencia, monitoringFallback.emergency),
    boundedIndicator(getChuva24h, monitoringFallback.rain),
    boundedIndicator(getSituacaoRios, monitoringFallback.rivers),
    boundedIndicator(getFocosCalor24h, monitoringFallback.fire),
    boundedIndicator(getSituacaoSeca, monitoringFallback.drought)
  ]);

  const hasError = [alerts, emergency, rain, rivers, fire, drought].some(
    (indicator) => indicator.state !== "ready"
  );
  const liveIndicators = [alerts, emergency, rain, rivers, fire, drought].filter(
    (indicator) => indicator.state === "ready"
  ).length;
  const hasEmergency = emergency.tone === "emergency";
  const attention = [alerts, rain, fire, drought].some(
    (indicator) => indicator.tone === "alert" || indicator.tone === "emergency"
  );

  const generalStatus = hasEmergency
    ? {
        tone: "emergency",
        label: "Emergência reconhecida",
        note: "Há municípios com reconhecimento federal vigente no S2ID. Consulte a situação municipal."
      }
    : attention
    ? {
        tone: "alert",
        label: "Atenção",
        note: "Há condições monitoradas que merecem acompanhamento nos canais oficiais."
      }
    : hasError
      ? {
          tone: "empty",
          label: "Dados parcialmente indisponíveis",
          note: "Consulte os canais oficiais para verificar avisos vigentes."
        }
      : liveIndicators
        ? {
            tone: "empty",
            label: "Monitoramento ativo",
            note: "As fontes automáticas disponíveis foram consultadas para esta visualização."
          }
        : monitoringFallback.generalStatus;

  return {
    ...monitoringFallback,
    mode: hasError ? "error" : "live",
    updatedAt: new Date().toISOString(),
    attemptedAt,
    generalStatus,
    alerts,
    emergency,
    rain,
    rivers,
    fire,
    drought
  };
}
