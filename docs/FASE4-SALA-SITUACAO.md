# Fase 4: Sala de Situacao Estadual

## Escopo implementado

Somente 4A (modo municipal), 4B (radar descritivo) e 4C (lista operacional). Videowall, rotacao, timeline e boletim municipal nao fazem parte desta entrega.

## Arquitetura

PublicMapSection reutiliza os snapshots de chuva, rios, fogo, seca e alertas. stateSituation.js reutiliza municipalRanking, municipalMonitoring e hydrologyMetrics, sem novo backend ou chamadas de API. O modelo municipal e memoizado e criado apenas no tema Situacao Estadual.

StateSituation.jsx apresenta seletor de seis temas, radar recolhivel, GeoJSON com tooltip, legenda e lista de acompanhamento. MunicipalPanel recebe um resumo opcional, mantendo suas consultas, graficos e a selecao territorial existentes. Os controles adicionais do mapa continuam disponiveis.

## Arquivos

- frontend/src/services/stateSituation.js
- frontend/src/components/maps/StateSituation.jsx
- frontend/src/components/maps/PublicMapSection.jsx
- frontend/src/components/maps/MunicipalPanel.jsx
- frontend/src/components/maps/LayerSelector.jsx
- frontend/src/data/mapThemes.js
- frontend/src/state-situation.css
- frontend/src/map-workspace.css
- tests/state-situation.mjs
- tests/state-situation-browser.cjs
- tests/map-phase1.cjs

## Fontes e seguranca

Reutilizadas as integracoes CEMADEN/redes de chuva, ANA, INPE, indice de seca e emissores de avisos existentes. Nenhum provedor ou biblioteca nova. Nenhuma credencial adicionada. Dados de testes sao fixtures isoladas e nao fazem parte dos dados publicados.

## Metodologia

Consultar RADAR-SITUACAO.md. O radar e acompanhamento, nao classificacao de risco. Ausencia, zero observado e dado antigo sao distintos. Nao ha nota integrada. Area queimada mensal continua no modulo de fogo original, sem mistura temporal com deteccoes.

## Verificacao

Testes dedicados verificam zero observado, valores invalidos, atualidade, cobertura espacial, alertas estruturados, nivel estavel e ausencia de indice composto. Teste de navegador cobre os 139 municipios, seis temas, selecao, reutilizacao do painel, teclado, celular e ausencia de carga antecipada de series hidrologicas.

Benchmark local do modelo sobre 139 municipios e 2.000 pontos: cerca de 38 ms. E medicao de fixture, nao garantia de latencia das APIs ou de dispositivos moveis. Camadas externas podem falhar independentemente do modelo; testes isolados bloqueiam rede externa e por isso o mapa base aparece cinza nas capturas de teste.

## Pendencias conhecidas

Validacao em 08/10/2026: 11 suites unitarias JavaScript, 21 testes Python, oito roteiros de navegador Edge (incluindo desktop/tablet/mobile, teclado e regressoes), build Vite e geracao PWA concluidos com sucesso. Nao foi feita certificacao em Safari/Firefox nem teste de carga de APIs externas. As fontes mantem as limitacoes descritas abaixo.

Abrangencia municipal dos alertas exige codigos confirmados ainda nao presentes em todas as fontes. ANA sem horario validado nao permite tendencia automatica. Seca antiga nao vira situacao atual. Fontes ainda nao integradas permanecem explicitamente sem dado. Nao foram criados indices ou limites hidrologicos novos.
