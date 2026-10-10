# Etapa 4E - Timeline contextual

## Escopo

Implementada para focos de calor e series hidrologicas existentes. Chuva e previsao permanecem nas ferramentas anteriores; a expansao da timeline para essas fontes depende da cobertura temporal apropriada. Nao ha novas APIs, bibliotecas ou credenciais.

## Focos de calor

No tema Fogo, a area recolhivel Linha do tempo dos focos de calor utiliza o arquivo fire-history.json e as deteccoes ja carregadas. Os filtros existentes de 24h, 48h e 7 dias, satelite e municipio tambem se aplicam a timeline.

O mapa mostra deteccoes acumuladas entre o inicio da janela do arquivo e o instante selecionado. Contagem e painel lateral acompanham o cursor. Fechar a timeline devolve a janela recente original do mapa. Reproducao avanca somente por timestamps de deteccoes reais, sem criar quadros meteorologicos ou incendios.

A referencia e o fim da cobertura do arquivo ou a deteccao mais recente carregada, limitado ao presente. Arquivos com referencia superior a 36h sao identificados como historicos. A cobertura so e declarada completa quando o historico informa status ready, inicio/fim abrangendo toda a janela e nenhuma data faltante. Fora disso, a contagem e apenas a dos registros carregados. Nao se substitui ausencia de cobertura por zero observado.

Deduplicacao reutiliza coordenadas, instante e satelite do filtro INPE existente. O processamento espacial e feito ao abrir a timeline ou alterar seus filtros; avancar quadros nao repete consultas ou operacoes territoriais completas. Marcadores preservados entre quadros sao memoizados.

## Rios

Selecionar uma estacao continua carregando seu historico sob demanda, com cache e deduplicacao de chamadas existentes. Periodos: 24h, 7 dias e 30 dias. O cursor marca no grafico o nivel efetivamente registrado no instante selecionado; o resumo da ultima leitura permanece separado.

Somente leituras finitas, com timezone confirmado, dentro do periodo e sem conflitos ou datas futuras participam. Historicos sem horario confirmado continuam consultaveis como leitura informada, com reproducao desabilitada. Nenhum limite hidrologico ou cota de risco foi criado.

## Controles e acessibilidade

Anterior, proximo, reproduzir/pausar e slider com nome acessivel e horario/valor em aria-valuetext. Botoes de 44px, foco visivel, layout responsivo. Sem reproducao automatica ao abrir. Uma leitura permite consulta, mas nao reproducao; nenhuma leitura mostra dados insuficientes.

Reproducao a cada 1,5s, interrompida no ultimo quadro, na aba oculta, ao mudar filtros/estacao/periodo ou ao sair do tema. No Modo Operacional, interagir com a timeline pausa a rotacao de telas. Historico carregado nao e recarregado por quadro.

## Desempenho e limites

Amostragem de ate 48 instantes existentes para fogo e 120 para rios, incluindo primeiro e ultimo. O grafico hidrologico preserva as leituras disponiveis. O slider representa ordem de observacoes, nao escala uniforme de tempo. Nao ha geracao de valores intermediarios.

Benchmark local sobre 18.967 deteccoes do arquivo existente: aproximadamente 33ms para preparar 48 quadros, sem recorte territorial. Nao e garantia de desempenho de renderizacao ou de dispositivos moveis. Leaflet continua usando Canvas; sem carga simultanea de historicos de todas as estacoes.

## Arquivos

- frontend/src/services/timeline.js
- frontend/src/components/maps/TimelineControl.jsx
- frontend/src/components/maps/FireTimeline.jsx
- frontend/src/components/maps/FirePointMarker.jsx
- frontend/src/components/maps/PublicMapSection.jsx
- frontend/src/components/maps/FireControls.jsx
- frontend/src/components/maps/HydrologyPanel.jsx
- frontend/src/timeline.css
- tests/timeline.mjs
- tests/timeline-browser.cjs

## Testes

Fixtures isoladas de navegador verificam contagem/duplicatas, atualizacao do mapa, periodos, cursor no grafico, ausencia de requisicao por quadro, horarios sem fuso, pausa na aba oculta, teclado, celular e pausa da rotacao operacional. Os dados de teste nao sao publicados. Testes das regras validam janelas, datas futuras, arquivo historico, ausencia e zero medido, conflitos e limite de quadros.
