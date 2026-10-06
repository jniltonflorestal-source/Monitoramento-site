# Dashboard estadual e navegação: fases 1 e 2

**Goal:** Entregar somente o dashboard de oito cards e a navegação temática aprovados pelo usuário, preservando mapas, municípios, boletins e integrações.

**Architecture:** Derivar indicadores do snapshot já consultado, sem endpoints adicionais. Reutilizar StatusCard, DataHealthPanel e PublicMapSection; centralizar os destinos em uma configuração de temas. Alertas usam os mesmos dados oficiais e a mesma seção detalhada existente. Não criar radar ou classificação integrada.

**Tech Stack:** React 18, Vite, Leaflet, lucide-react, CSS responsivo e testes Node/Playwright. Sem novas dependências.

## Escopo aprovado

Oito cards: Alertas, Chuva, Rios, Focos, Área queimada, Seca, SE/ECP e Saúde dos dados. Desktop largo 4x2; tablet em duas colunas; celular em faixa horizontal acessível. Meteorologia e cabeçalho preservados. Resumos contêm fonte, período e estados de qualidade. Estatísticas não existentes aparecem como indisponíveis, não são coletadas artificialmente nesta fase.

Mapa: Visão geral, Rios, Chuva, Fogo (submodos focos/áreas), Seca, Alertas e SE/ECP. Situação Estadual fica para a fase de radar, sem botão inoperante. Controles secundários ficam recolhidos. Links legados e navegação por teclado preservados.

## Execução

- [x] Testes unitários de derivação: oito cards, ausência/zero, período INPE, MapBiomas independente, saúde sem contar catálogo como medição.
- [x] Modelo puro em `frontend/src/services/stateDashboard.js`, configuração em `frontend/src/data/mapThemes.js`, metadados da área queimada preservados no parser.
- [x] Atualizar SituationHero/StatusCard e CSS isolado. Reutilizar o diagnóstico no card de saúde e abrir o painel existente.
- [x] Navegação centralizada e sincronização de cards, hash, voltar/avançar e temas. Novo resumo contextual de alertas, sem inventar polígonos.
- [x] Testar desktop/tablet/mobile, teclado, repetição de cliques, fontes indisponíveis, municípios, camadas e ausência de regressões.
- [x] Build e documentação. Revisão independente corrigiu estados ausentes na lateral de chuva/S2ID e histórico dos submodos de fogo.
- [ ] Publicação seletiva preservando dados atualizados pelo Actions; validar URL pública.

## Fora desta entrega

Radar estadual/municipal, classificação integrada, rankings territoriais, novas séries, boletim municipal, videowall e animações adicionais. Nenhuma fase 3+ será iniciada automaticamente.
