# Dashboard, acompanhamento municipal e hidrologia

## Escopo

Etapas 1, 2 e 3: complementação dos oito indicadores existentes, ranking recolhível por tema e evolução das estações ANA. Sem radar, índice integrado, timeline, videowall ou alterações nos boletins.

## Integração

- `stateDashboard.js`: resumo de cobertura hidrológica, elevação/redução, comparações e validade informada dos avisos.
- `municipalRanking.js` e `MunicipalityRanking.jsx`: classificação separada por chuva, rios, focos e seca. Clique reutiliza o painel municipal e seu limite territorial.
- `hydrologyMetrics.js`: validação e comparação compartilhadas entre dashboard, ranking e gráficos.
- `HydrologyPanel.jsx`: minigráficos sob demanda, diferenças anterior/6h/24h e histórico existente de 24h/7d/30d.
- `ana.js` e `anaParser.js`: catálogo, resumo coletado e leitura XML, com cache e deduplicação de chamadas.
- `scripts/update-river-summary.py`: coleta limitada no workflow horário existente. Veja [operação ANA](COLETA-ANA-RESUMO.md).

## Regras de leitura

O ranking não classifica risco. Chuva usa o maior acumulado pontual válido dentro do polígono municipal, não soma nem média territorial. Focos usam exclusivamente o arquivo INPE consultado, com deduplicação; arquivo diário não significa necessariamente últimas 24h. Seca preserva categorias e referência da fonte. Rios são ordenados pela variação absoluta disponível, sem confundir subida com inundação. Área queimada não entra sem uma base municipal consolidada e comparável.

Comparações hidrológicas usam valores em centímetros e horários com fuso explícito. Valores nulos, horários futuros, horários ambíguos e duplicatas conflitantes são descartados. Zero e níveis negativos válidos são preservados. Para 6h/24h, busca-se a leitura mais próxima do instante-alvo com tolerância de 1h; o intervalo efetivo fica visível. Essa tolerância é uma política de comparação, não uma cota de risco. Sem leituras comparáveis, o resultado é indisponível, não zero.

Leituras acima de 24h são históricas. Resumo com tentativa de coleta acima de 3h não confirma atualidade. Minigráficos podem mostrar histórico, sempre com aviso. Cotas oficiais são apresentadas somente quando existentes para a estação. Nenhum limite de inundação foi criado.

## Fontes e limitações

Reutiliza CEMADEN/base consolidada de chuva, INPE, CEMADEN/índice de seca, limites municipais e ANA. Não introduz uma segunda base concorrente nem credenciais no frontend. Nenhuma biblioteca nova.

A tentativa real do coletor em 06/10/2026 retornou falha de consulta ao serviço legado ANA, sem catálogo utilizável. Portanto, não há garantia de leituras operacionais ANA nesta entrega. Horários legados sem fuso documentado não recebem um fuso inventado. A API moderna pode exigir acesso institucional: [orientação oficial ANA](https://www.snirh.gov.br/hidroweb/acesso-api). Solicitar acesso e confirmar unidade/fuso da série são pendências externas.

## Desempenho e validação

Ranking calculado apenas ao abrir; exibe cinco municípios inicialmente. Lista começa com seis estações e gráficos só são montados quando expandida. Não consulta o histórico de todas as estações na abertura; séries detalhadas têm cache de cinco minutos e chamadas simultâneas deduplicadas.

Testes unitários cobrem ausência, zero, dados antigos, conflitos, coordenadas e máximos pontuais. Testes de navegador usam fixtures isoladas para verificar gráficos, variações, seleção municipal, navegação e celular. Fixtures não são publicadas. O coletor possui 20 testes offline. Testes de navegador executados no Edge/Chromium; outros motores não foram validados neste ambiente.

O resumo local de falha não deve substituir dados mais recentes de produção. A publicação preserva os arquivos operacionais existentes; o workflow passa a produzir `data/river-summary.json` com status e tentativa explícitos.
