# Navegação contextual e monitoramento municipal

## Interface

O mapa principal mantém cinco temas: Clima, Rios, Focos de calor, Área queimada e Seca. Somente o tema selecionado apresenta controles. O modo técnico fica recolhido inicialmente e permite sobreposições independentes e consulta SE/ECP. Sobreposições fixadas são intencionais e permanecem ao trocar de tema; o contador do modo técnico indica opções adicionais.

O seletor contém os 139 municípios da malha existente. A seleção pelo nome ou pelo clique territorial destaca o município e abre o painel lateral. No celular o painel fica abaixo do mapa. Fechar retorna ao resumo temático; Centralizar Tocantins também limpa a seleção territorial. Os links anteriores de chuva, rios, fogo, seca e SE/ECP permanecem atendidos.

## Dados e interpretação

- Chuva: recorte espacial das estações consolidadas do projeto. O indicador é o maior acumulado válido de 24h, não média municipal nem soma entre estações. Zero é preservado somente como valor numérico existente. Sem medições, o valor é indisponível. Referências ausentes ou antigas geram aviso. Acumulados observados de 48h e sete dias ainda não possuem série suficiente nesta integração.
- Rios: estações dentro do polígono municipal; consulta ANA sob demanda para a estação escolhida, com gráfico de 24h, sete ou 30 dias. Não se dispara consulta simultânea para todas as estações. Tendência não é nível de risco e limites só aparecem quando oficiais.
- Focos: INPE, recorte espacial exato e janelas móveis de 24h, 48h e sete dias, com deduplicação já existente. As janelas se sobrepõem, não devem ser somadas. Cobertura parcial ou desatualizada é indicada. Falha no histórico não é zero detecções.
- Queimadas: último mês disponível da API MapBiomas para o código IBGE selecionado. A referência mensal independe do filtro de horas. O raster é solicitado somente ao clicar em Ver área queimada. Não há polígonos fictícios derivados de focos.
- Meteorologia: Open-Meteo/GFS, previsão para um ponto representativo dentro do município, identificado como previsão de modelo. Temperatura, vento, direção de origem, rajadas e precipitação horária são usados sem substituir observações. Acumulados previstos exigem todas as horas da janela; sete dias não são extrapolados da previsão de três dias.

## Arquitetura

`municipalMonitoring.js` centraliza recorte, valores nulos e consultas. `MunicipalSelection.jsx` resolve o clique e o destaque. `MunicipalPanel.jsx` mantém consultas independentes por município e ignora respostas de seleções anteriores. `PublicMapSection.jsx` coordena tema, seleção e camadas; os serviços anteriores continuam em uso. `municipal-panel.css` organiza o painel responsivo.

Consultas externas usam cache e timeout do serviço existente; erro de uma fonte não bloqueia as demais. Nenhuma credencial privada é enviada ao navegador. Limitações de licença, resolução e cobertura continuam documentadas em WEBGIS-OPERACIONAL.md.

## Verificação

Executar `node tests/municipal-monitoring.mjs`, `node tests/operational-map.mjs` e o build Vite no diretório frontend.

Para o navegador, instalar Playwright no ambiente de testes e executar `node tests/municipal-browser.cjs` com o Vite na porta 4196. `PLAYWRIGHT_MODULE` permite indicar o módulo já instalado; `QA_URL` permite testar o endereço publicado. O teste cobre temas contextuais, 139 municípios, período sem histórico, seleção no mapa/lista, ativação de camada, fechamento e largura móvel. Requer Microsoft Edge e rede para carregar a base do site.
