import { getPrevisao24hTocantins, getPrevisao48hTocantins } from "./inmetPrevisao";

export const RAIN_FORECAST_SOURCE = "INMET";
// source: "INMET"

export async function getRainForecastPoints(mode, options = {}) {
  if (mode === "forecast48") return getPrevisao48hTocantins(options);
  return getPrevisao24hTocantins(options);
}
