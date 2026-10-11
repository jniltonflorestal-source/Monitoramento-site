# Etapa 4F - Boletim municipal em PDF

## Uso

Selecione qualquer municipio no mapa ou na busca e clique em **Gerar Resumo Municipal**. O portal prepara quatro paginas A4 e abre a impressao do navegador. Escolha Salvar como PDF. A previa tambem oferece Imprimir / Salvar PDF e Voltar ao mapa. Escape fecha a previa, preservando o Modo Operacional quando estiver ativo.

## Conteudo

1. Panorama, resumo deterministico, seis indicadores e limite municipal.
2. Chuva observada, estações, niveis, tendencia e grafico disponivel.
3. Focos de calor, area queimada mensal e categoria municipal de seca.
4. Previsao de modelo, avisos confirmados, orientacoes, fontes e limites.

Mapas vetoriais usam a geometria municipal carregada, com projecao Mercator e escala proporcional. Os pontos representam localizacoes reais das estacoes/deteccoes. O documento nao depende de tiles externos. Os mapas nao desenham rios, cicatrizes ou outros elementos inexistentes na base. Area queimada apresenta estatistica municipal MapBiomas; cicatrizes individuais/raster nao foram incorporados ao PDF nesta etapa.

## Arquitetura e fontes

MunicipalPanel compartilha chuva, catalogo ANA, arquivo INPE, consulta MapBiomas e previsao municipal existentes com MunicipalBulletinGenerator, carregado de forma progressiva. O gerador consulta apenas a serie de sete dias da estacao escolhida, pelo cache ANA existente, com espera maxima de 12 segundos. Aguarda ate cinco segundos pelas consultas ja iniciadas do painel, em paralelo, e usa os dados disponiveis ao concluir.

municipalBulletin.js valida recorte, valores e horarios e monta o resumo por regras locais. MunicipalBulletinTemplate apresenta mapas SVG, grafico Recharts e tabelas. Portal de previa e CSS exclusivo de impressao evitam menus e regras globais que antes ocultavam conteudo. O tamanho A4 e definido com pagina nomeada para preservar o boletim estadual anterior.

Nenhuma nova API, credencial ou dependencia. A consulta Open-Meteo municipal passa a incluir umidade relativa, variavel ja utilizada no projeto. Impressao e compativel com GitHub Pages, sem backend ou geracao oficial agendada.

## Regras

- Chuva: maior leitura pontual de 24h, valida, nao negativa e atualizada em ate 3h. Ate tres maiores estacoes na tabela; sem extrapolar 48h/7 dias.
- Rios: estacoes dentro do limite, unidade cm da ANA, horario identificado. Falha da ultima consulta e distinguida de leitura preservada. Tendencia somente com series comparaveis; nenhuma cota de risco criada. Ate duas estacoes na tabela, priorizando a escolhida; demais permanecem no painel. Grafico usa a serie disponivel da estacao priorizada.
- Focos: contagem deduplicada do arquivo na janela escolhida. Janela e cobertura explicitadas. Sem cobertura confirmada, ausencia de deteccao nao vira zero. Arquivo antigo aparece como historico.
- Queimadas: hectares municipais e mes de referencia da resposta MapBiomas, independente do filtro de horas.
- Seca: categoria municipal da fonte e referencia; dado antigo permanece identificado.
- Meteorologia: previsao GFS em ponto representativo, sem confundir com observacao ou media territorial. Acumulados previstos requerem todas as horas.
- Avisos: atribuicao apenas por codigos municipais estruturados, nunca por nomes abreviados em texto. Ausencia de abrangencia confirmada nao significa ausencia de alerta.

Zero medido e preservado. Ausencia, falha e dado antigo sao identificados. Nao ha numero oficial de boletim ou publicacao automatica institucional. O rodape informa natureza informativa, fontes, data/hora e canais 199/193.

## Verificacao

Testes unitarios: recorte espacial, zero/ausencia, horarios, cobertura, alerta estruturado, falha de fonte e resumo deterministico. Navegador: mapas, grafico, impressao automatica, foco, celular e duas versoes de PDF (com dados e sem dados). Os PDFs de teste sao fixtures locais, nao publicados. Validacao com pypdf e renderizacao com PDFium verificam quatro paginas A4, ausencia de paginas em branco, cabecalho/rodape e remocao de controles.

Os testes de navegador utilizam Edge. Demais navegadores e volumes extremos de textos precisam de validacao especifica. Documentos municipais refletem a disponibilidade das fontes no momento da consulta.

## Arquivos

- frontend/src/services/municipalBulletin.js
- frontend/src/components/dashboard/MunicipalBulletinGenerator.jsx
- frontend/src/components/dashboard/MunicipalBulletinTemplate.jsx
- frontend/src/municipal-bulletin.css
- frontend/src/components/maps/MunicipalPanel.jsx
- frontend/src/components/maps/PublicMapSection.jsx
- frontend/src/components/maps/OperationalMode.jsx
- frontend/src/services/municipalMonitoring.js
- tests/municipal-bulletin.mjs
- tests/municipal-bulletin-browser.cjs
- tests/render-municipal-pdf.py
