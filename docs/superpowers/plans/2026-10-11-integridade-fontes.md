# Integridade e recuperacao das fontes

Diagnostico: coleta publicada em 11/10 as 09h UTC; INPE/CEMADEN/INMET/MapBiomas operando, S2ID falhou transitoriamente e voltou a responder; seca legada HTTP 404. Resumo de hectares divergente do produto MapBiomas. INMET oferece geocodes estruturados nao preservados no contrato publicado. Cron ativo com intervalos efetivos variaveis.

- [x] Testes de produto diario, hectares/raster, municipio distinto e codigos oficiais.
- [x] Correcoes nos coletores e contrato de avisos; origem/severidade preservadas.
- [x] Regressoes frontend, mapa/boletim, build/PWA.
- [ ] Publicar codigo e executar coleta real no GitHub com secrets existentes.
- [ ] Conferir JSON operacional e documentar fontes ainda pendentes.

Sem novos provedores, backend ou credenciais. Dados indisponiveis continuam desconhecidos, nao zero. Nao inferir municipios de nomes truncados. Raster e area estatistica sao produtos separados. Lista S2ID vem do portal oficial de reconhecimentos vigentes e pode conter varios protocolos do mesmo municipio.
