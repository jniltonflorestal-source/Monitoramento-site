# Etapa 4F - Resumo municipal em PDF

Escopo autorizado: botao no painel municipal, template A4, mapas vetoriais, graficos, fontes, periodos e dados indisponiveis. Reutilizar consultas municipais e impressao do navegador; sem backend ou arquivo oficial numerado automaticamente.

Arquitetura: municipalBulletin.js recorta e valida dados ja carregados, gera resumo deterministico. MunicipalBulletinGenerator carrega sob demanda o historico da estacao selecionada, com limite de tempo e cache ANA existente. Preview em portal com CSS de impressao exclusivo e quatro paginas: panorama; chuva/rios; fogo/queimadas/seca; meteorologia/alertas/fontes. Mapas usam a geometria municipal existente; cicatrizes ausentes nao sao inventadas. Apenas alertas com abrangencia municipal estruturada sao atribuídos ao municipio.

- [x] Testes de recorte, zero, dados antigos, cobertura e resumo.
- [x] Template, mapas, graficos e integracao no painel.
- [x] Testes de navegador e PDFs completo/sem dados; renderizar A4.
- [x] Regressoes, build/PWA e documentacao.
- [ ] Publicacao e verificacao publica.

Qualidade: distinguir observado, historico e previsao. Chuva e maior leitura pontual de 24h, area queimada mensal, focos sao registros carregados e nao hectares. Cadastro ANA sem leitura continua sem nivel. Resumo nao classifica risco. Rodape identifica documento informativo e canais 199/193.
