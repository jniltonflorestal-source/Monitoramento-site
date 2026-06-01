import { getChuvaObservada24h } from "./rainfall";

export async function getChuva24h(fallback) {
  try {
    return await getChuvaObservada24h(fallback);
  } catch (error) {
    return { ...fallback, state: "error", value: "Dados indisponíveis", stations: [] };
  }
}

export { getChuvaObservada24h };
