import { fetchWithDeadline } from './dataQuality.js';
let activePublishedRequest = null;

export async function fetchPublishedData() {
  if (activePublishedRequest) return activePublishedRequest;

  activePublishedRequest = fetchWithDeadline(`${import.meta.env.BASE_URL}dados-monitoramento.json?v=${Math.floor(Date.now() / 60000)}`)
    .finally(() => {
      activePublishedRequest = null;
    });

  return activePublishedRequest;
}
