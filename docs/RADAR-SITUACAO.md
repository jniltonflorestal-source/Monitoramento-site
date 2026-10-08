# Radar de Situacao Estadual

## Finalidade

Indicador de acompanhamento baseado nos dados disponiveis. Nao substitui alertas oficiais ou analise tecnica. Nao calcula risco, probabilidade de desastre ou uma nota municipal.

## Regras

- Chuva: maior acumulado pontual observado em 24h de estacao situada dentro do municipio. Leitura valida, nao negativa, atualizada em ate 3h. Zero medido e diferente de ausencia de estacao. Nao representa media nem toda a superficie municipal.
- Hidrologia: maior variacao absoluta municipal entre leituras comparaveis em aproximadamente 24h (tolerancia de 1h), reutilizando hydrologyMetrics. Exige horario com fuso, ultima leitura em ate 24h e ausencia de conflitos. Variacao zero preserva cobertura. Elevacao nao significa inundacao; nao sao criadas cotas de referencia.
- Fogo: contagem espacial e deduplicada das deteccoes no arquivo INPE disponivel, reutilizando municipalRanking. Atualizacao do arquivo em ate 36h; registros validos com ate 48h, sem datas futuras. O periodo e o do arquivo consultado, nao uma janela completa garantida de 24h. Sem deteccao territorial nao confirma zero, pois a completude da cobertura nao esta garantida. Area queimada mensal nao e somada a deteccoes recentes.
- Seca: categorias oficiais do produto existente (Sem seca, Fraca, Moderada, Severa, Extrema, Excepcional), referencia e qualidade preservadas. Exige qualidade atual e referencia atualizada em ate 120 dias. Essa janela de exibicao nao altera a periodicidade oficial da fonte.
- Alertas: consulta atualizada em ate 6h. Contagens confirmadas dos emissores existentes, com aviso de consulta parcial quando aplicavel. O mapa exige codigos municipais explicitos em municipalityCodes. Nomes em textos resumidos nunca sao usados para inferir abrangencia. A integracao atual pode fornecer alerta estadual sem geometria municipal confirmada.

As janelas acima sao politicas de atualidade da exibicao, nao limites de risco. Sao herdadas dos componentes de qualidade existentes.

## Estados do radar

- Dados insuficientes: nenhum indicador valido e atribuivel ao municipio/tema.
- Acompanhamento: dado valido disponivel; nao significa risco ou normalidade confirmada.
- Atencao: categoria Moderada de seca ou aviso oficial Perigo Potencial/Moderado.
- Atencao elevada: categorias Severa/Extrema/Excepcional de seca ou aviso oficial Perigo/Alto/Grande Perigo/Muito Alto.

Os dois ultimos estados sao rotulos de acompanhamento que preservam a categoria original visivel, nao reclassificacao oficial. Nao ha limiares numericos de chuva/fogo inventados. Normal nao e inferido de falta de dados ou ausencia parcial de alertas.

## Simbologia e integracao

Por tema, intensidade de cor representa magnitude relativa ao maior valor valido nesta consulta, nao nivel de risco. Hidrologia usa magnitude absoluta; sinal e intervalo continuam no detalhe. Seca usa ordem das categorias da fonte.

Na visao integrada, aviso oficial territorial confirmado tem destaque. Quando existe apenas um fator nao nulo, sua cor identifica o tema. Varios fatores recebem a cor de multiplos fatores, sem escolher um vencedor arbitrario. Todos permanecem visiveis no painel municipal. Dados insuficientes usam cinza.

Nao ha soma, pesos ou comparacao entre mm, cm, focos e categorias. Ranking por tema ordena magnitude absoluta. A lista integrada agrupa avisos confirmados primeiro, depois fator e nome do municipio; nao e ranking de risco.

## Limitacoes

Periodos diferentes nao sao fundidos. Nao se atribui uma estacao proxima fora do limite ao municipio. ANA com horario ambiguo pode permanecer consultavel no modulo original, mas nao entra no calculo de tendencia. Fontes sem integracao e fontes antigas permanecem ausentes no radar, nao zero. Alertas municipais dependem de identificadores territoriais estruturados da fonte.

O calculo usa o snapshot ja carregado e a malha municipal existente, sem requisitar historicos de todas as estacoes. A atualizacao segue o dashboard existente. Fontes e horarios acompanham indicadores e motivos.
