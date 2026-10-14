import { finiteValue } from '../frontend/src/services/dataQuality.js';
import { fetchSource } from './source-fetch.mjs';
import { summarizeRecognitions } from './source-products.mjs';

const portalUrl = 'https://s2id.mi.gov.br/paginas/index.xhtml';
const recognitionsUrl = 'https://s2id.mi.gov.br/rest/portal/reconhecimentos';
const detailUrl = 'https://s2id.mi.gov.br/rest/portal/detalhareconhecimento';
const states = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

export async function collectS2id(fetcher = fetchSource) {
  const attemptedAt = new Date().toISOString();
  const portal = await fetcher(portalUrl);
  if (!portal.ok) throw new Error(`Portal S2ID indisponível (HTTP ${portal.status})`);
  // Anonymous token provided by the public map; never persisted or logged.
  const token = (await portal.text()).match(/var token = "([^"]+)"/)?.[1];
  if (!token) throw new Error('Token público do S2ID não encontrado');
  const headers = { 'auth-token': token };
  const response = await fetcher(recognitionsUrl, { headers });
  if (!response.ok) throw new Error(`Reconhecimentos do S2ID indisponíveis (HTTP ${response.status})`);
  const collection = await response.json();
  if (!Array.isArray(collection?.features)) throw new Error('Resposta S2ID sem lista válida de reconhecimentos');
  if (collection.features.some(feature => !states.has(feature?.properties?.uf))) throw new Error('Resposta S2ID contém registro inválido; contagem não confirmada');
  const features = collection.features.filter(feature => feature.properties?.uf === 'TO');
  const records = [];
  for (const feature of features) {
    const props = feature.properties;
    let details = {};
    let detailStatus = 'indisponivel';
    if (props.protocolo) {
      try {
        const detail = await fetcher(`${detailUrl}?protocolo=${encodeURIComponent(props.protocolo)}`, { headers });
        if (detail.ok) {
          const body = await detail.json();
          if (body && typeof body === 'object' && !Array.isArray(body)) {
            details = body;
            detailStatus = 'ok';
          }
        }
      } catch { /* The confirmed public list survives a missing optional detail. */ }
    }
    records.push({
      municipio: props.municipio, geocodigo: props.geocodigo, protocolo: props.protocolo,
      cobrade: String(details.cobrade?.cobrade || props.cobrade || ''),
      desastre: details.cobrade?.tipo || null,
      situacao: details.seEcp || 'Reconhecimento federal vigente',
      decreto: details.numeroDecreto || null, data_decreto: details.dataDecreto || null,
      portaria: details.numeroPortaria || null, vigencia: details.vigenciaPortaria || null,
      latitude: finiteValue(feature.geometry?.coordinates?.[1]),
      longitude: finiteValue(feature.geometry?.coordinates?.[0]), detalhe_status: detailStatus
    });
  }
  return {
    fonte: 'S2ID / SEDEC-MIDR', consulta: recognitionsUrl, portal: portalUrl,
    ultimaTentativa: attemptedAt, atualizadoEm: new Date().toISOString(),
    reconhecimentos_vigentes: records, resumo: summarizeRecognitions(records)
  };
}

export function applyS2idProduct(data, product) {
  data.s2id = product;
  data.resumo ||= {};
  data.resumo.municipios_s2id_vigentes = product.resumo.federal;
  data.resumo.municipios_s2id_se = product.resumo.se;
  data.resumo.municipios_s2id_ecp = product.resumo.ecp;
  data.qualidade_fontes ||= {};
  data.qualidade_fontes.s2id = { status: 'ok', ultimaTentativa: product.ultimaTentativa, ultimoSucesso: product.atualizadoEm };
  if (data.erros_atualizacao) delete data.erros_atualizacao.s2id;
}
