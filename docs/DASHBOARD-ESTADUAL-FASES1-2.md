# Dashboard estadual e navegação contextual

Entrega de 6 de outubro de 2026, limitada às fases 1 e 2 do novo plano.

## Funcionalidades

- Oito indicadores derivados do snapshot existente: alertas, chuva, rios, focos, área queimada, seca, SE/ECP e saúde dos dados.
- Grade 4x2 em desktop largo; duas colunas em tablet; faixa horizontal com botões e navegação por teclado no celular.
- Meteorologia, documentos, boletins e consulta municipal preservados.
- Sete temas do mapa: Visão geral, Rios, Chuva, Fogo, Seca, Alertas e SE/ECP. Camadas adicionais permanecem recolhidas e combináveis.
- Links dos indicadores, submodos do fogo e visão geral sincronizados com o endereço e o histórico do navegador.
- Painel contextual de avisos usa a mesma consulta existente, sem gerar polígonos ou alertas artificiais.
- Área queimada é independente da disponibilidade do INPE. O período mensal permanece visível.
- Diagnóstico usa a mesma função do card de saúde, distinguindo cadastro, leitura, atraso e indisponibilidade.
- Corrigidos dois estados antigos na lateral: chuva ausente não vira “sem chuva relevante” e falha no S2ID não vira zero reconhecimentos.

## Dados e limitações

Não foram adicionadas APIs, credenciais, bibliotecas ou rotinas de coleta. Fontes reutilizadas: CEMADEN, INMET, ANA, INPE, MapBiomas e S2ID; meteorologia existente via Open-Meteo. IDAP e SEMARH continuam com o estado real de integração.

O contador de saúde mede produtos/bases consultados, não quantidade de APIs únicas. Cadastro de estações ANA não é medição atual. A disponibilidade de um produto mensal não significa observação em tempo real.

O arquivo diário do INPE não é rotulado como uma janela móvel de 24 horas. Comparação com período anterior, ranking de área queimada e totais estaduais de subida/descida permanecem explicitamente sem consolidação. Alertas só apresentam severidade e abrangência informadas pelos emissores.

Não foram implementados radar integrado, pontuação de risco, rankings municipais, novas séries ou videowall. São fases posteriores.

## Arquivos principais

- `frontend/src/services/stateDashboard.js`: modelo e diagnóstico compartilhado.
- `frontend/src/data/mapThemes.js`: temas e destinos.
- `frontend/src/components/dashboard/SituationHero.jsx` e `frontend/src/state-dashboard.css`: dashboard responsivo.
- `frontend/src/components/cards/StatusCard.jsx`: indicadores e links acessíveis.
- `frontend/src/components/dashboard/DataHealthPanel.jsx`: diagnóstico compartilhado.
- `frontend/src/components/dashboard/SituationDashboard.jsx`: reaproveitamento dos alertas no mapa.
- `frontend/src/components/maps/PublicMapSection.jsx`, `LayerSelector.jsx`, `MapAlertsPanel.jsx` e `frontend/src/map-workspace.css`: navegação e contexto.
- `frontend/src/services/publishedSnapshotParser.js`: metadados independentes de área queimada.

## Verificação

Testes Node: `state-dashboard.mjs`, `data-quality.mjs`, `operational-map.mjs`, `municipal-monitoring.mjs`, `validate-react-foundation.mjs`.

Testes Playwright: `state-dashboard-browser.cjs`, `map-phase1.cjs`, `data-quality-browser.cjs`, `municipal-browser.cjs`, `municipal-errors.cjs`, `map-missing-data.cjs`.

Cobertura: oito indicadores, zero real versus ausência, fonte antiga, MapBiomas independente, grid, celular/tablet, teclado, cliques repetidos, histórico, 139 municípios, painéis recolhíveis e redimensionáveis, submodos e falhas de APIs.

Execução visual em Edge/Chromium nos tamanhos 1600x1000, 1440x1000, 820x1180 e 390x844. Chrome e Firefox não estavam instalados; não há certificação independente nesses navegadores. Testes automatizados não substituem validação operacional pela equipe.

## Desempenho e segurança

Sem novas chamadas ao trocar cards. Mantidos cache, atualização controlada e importação sob demanda do mapa e da hidrologia. Nenhuma credencial nova foi adicionada ao frontend. A publicação substitui apenas código e bundles selecionados, preservando dados recentes gerados pelo Actions.
