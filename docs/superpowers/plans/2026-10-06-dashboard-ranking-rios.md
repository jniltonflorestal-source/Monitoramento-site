# Evolução: dashboard, acompanhamento municipal e rios

**Objetivo:** Implementar somente etapas 1, 2 e 3 aprovadas, reaproveitando a arquitetura existente.

**Arquitetura:** Dashboard recebe o snapshot existente e um resumo hidrológico compacto. Ranking por tema usa observações válidas e associação espacial aos municípios; sem índice integrado. Hidrologia compartilha cálculos puros entre lista, gráfico e dashboard. Coleta ANA controlada no workflow existente; séries longas permanecem sob demanda.

**Tecnologias:** React/Vite, Leaflet, Turf, Recharts, Node para testes e Python padrão para coleta estruturada de XML. GitHub Pages preservado.

## Plano e critérios

- [x] Etapa 1: testes de resumo hidrológico e complementação do dashboard. Alertas com abrangência apenas confirmada; números indisponíveis não viram zero.
- [x] Etapa 2: serviço puro de ranking e componente recolhível por chuva/focos/rios. Coordenadas vinculadas por polígono municipal; maiores chuvas são máximos pontuais, não médias municipais; focos de uma única fonte e período. Clique reutiliza painel municipal.
- [x] Etapa 3: validar séries e diferenças anterior/6h/24h; deduplicar instantes, rejeitar horários ambíguos/futuros e conflitos; tolerância documentada de 1h para comparação, intervalo real visível. Minigráficos com resumo coletado e detalhes 1/7/30 dias sob demanda.
- [x] Coletor ANA com concorrência limitada, timeout, erros por estação e nenhum segredo público. Sem atribuir fuso a horário não documentado. Falha preserva histórico explicitamente não atual.
- [x] Regressões unitárias e de navegador: vazio, zero real, dados antigos, duplicados, fonte indisponível, navegação municipal e celular.
- [ ] Build/PWA, revisão, documentação e publicação seletiva; preservar dados atuais da produção.

## Fora do escopo

Radar, classificação integrada, mapa de atenção estadual, timeline adicional, videowall, PDF municipal e novas integrações de radar. Área queimada por município só terá ranking quando houver base consolidada comparável; não consultar 139 municípios ao abrir a página.
