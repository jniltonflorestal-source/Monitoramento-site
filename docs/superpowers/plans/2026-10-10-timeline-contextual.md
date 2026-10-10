# Timeline contextual - Etapa 4E

Escopo aprovado: focos de calor e series hidrologicas existentes. Controles anterior/proximo, slider, reproduzir/pausar somente sobre instantes carregados. Sem novas APIs ou interpolacao.

Arquitetura: timeline.js prepara quadros validos; TimelineControl reutilizavel apresenta controles com fonte/periodo. FireTimeline aplica filtro cumulativo ao mapa dentro da janela 24h/48h/7d do arquivo carregado, com cobertura parcial/historica explicita. HydrologyPanel destaca a leitura selecionada no grafico, mantendo o resumo da ultima leitura separado. Estacoes e periodos continuam sob demanda.

- [x] Testes de datas, duplicatas, periodos, limites e quadros reais.
- [x] Controles acessiveis e integracao de fogo/rios.
- [x] Testes de navegador, falhas e responsividade.
- [x] Build/PWA e documentacao.
- [ ] Publicacao e verificacao publica.

Performance: no maximo 48 quadros para fogo e 120 para hidrologia; amostragem de instantes existentes, sem sintetizar observacoes. Sem requisicao por quadro. Reproducao para na aba oculta, ao mudar tema/filtro/estacao e ao atingir o ultimo quadro. Modo Operacional pausa sua rotacao quando o usuario interage na timeline.
