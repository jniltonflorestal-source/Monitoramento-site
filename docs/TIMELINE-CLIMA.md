# Evolucao temporal de chuva e clima

## Uso

No tema Chuva, abra Meteorologia - previsao e vento animado e clique em Carregar / atualizar previsao. A timeline existente agora possui controles anterior/proximo, reproduzir/pausar e slider, compartilhados com fogo e rios. Comeca no primeiro horario futuro disponivel e para no fim. Fechar a area, ocultar a aba ou trocar de tema/submodo pausa a reproducao.

## Dados

A grade Open-Meteo/GFS existente apresenta vento, rajadas, temperatura, precipitacao horaria e nebulosidade. Quadros utilizam timestamps reais, com janela futura de ate 72h. Os pontos sao alinhados por horario, nao pela posicao nas listas. Pontos com eixos diferentes ou valores ausentes nao sao associados ao horario errado nem convertidos em zero. Instantes duplicados ambiguos sao excluidos. A metrica e o maior valor da variavel escolhida entre os pontos validos dentro do Tocantins, com cobertura informada; nao e media territorial ou nivel de risco.

As particulas ilustram o vento do quadro. O deslocamento e esquematico. O horario selecionado indica validade da previsao; Consulta identifica a consulta do portal, sem atribuir esse horario a emissao do modelo. Cache inicial de uma hora; atualizar manualmente solicita nova consulta. Falha na atualizacao remove a grade anterior da apresentacao e mostra indisponibilidade.

## Produtos distintos

Chuva observada 24h permanece leitura de estacao. A base consolidada atual nao fornece serie temporal completa para animacao. Nao foram criados quadros observados a partir de acumulados isolados.

INMET 24h/48h permanece previsao textual por dia, com referencia do proprio produto. Nao e acumulado em mm. Os campos de contagem acima de 10/30/50mm agora sao nulos, pois nao podem ser inferidos de descricao textual. Temperaturas ausentes nao viram zero. Datas invalidas/anteriores ao dia atual sao descartadas, e um segundo dia ausente nao e substituido pelo primeiro. Requisicoes tem prazo de 12 segundos e sao compartilhadas por cidade entre submodos. Nenhuma nova fonte ou credencial foi adicionada.

## Desempenho e testes

Carregamento da grade segue explicitamente solicitado, em seis consultas agrupadas a 30 pontos, com duas consultas simultaneas. Avancar quadros usa os dados carregados, sem chamadas de API. Controles de 44px, foco visivel e layout movel reutilizam TimelineControl. Reproducao temporal e desligada inicialmente; particulas continuam respeitando prefers-reduced-motion.

Testes unitarios verificam horario exato, cobertura parcial, datas futuras, zero/ausencia, dados invalidos, deduplicacao de requisicoes e limites numericos nao inferidos. Navegador Edge verifica fim da reproducao, aba oculta, falha/atualizacao, um unico quadro, pixel nao vazio das particulas, mobile e limpeza ao trocar tema. Regressoes de fogo, rios, Modo Operacional e PDF municipal passaram. Nao houve nova integracao de radar meteorologico ou animacao de imagens de satelite.

## Arquivos

- frontend/src/services/weatherTimeline.js
- frontend/src/services/operationalMap.js
- frontend/src/services/inmetPrevisao.js
- frontend/src/components/maps/WeatherLayers.jsx
- frontend/src/components/maps/TimelineControl.jsx
- frontend/src/components/maps/PublicMapSection.jsx
- frontend/src/timeline.css
- tests/weather-timeline.mjs
- tests/rain-forecast-quality.mjs
- tests/weather-timeline-browser.cjs
