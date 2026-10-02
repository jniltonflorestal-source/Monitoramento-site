# Fase 1: interface e usabilidade

Escopo aprovado: seis temas, fogo unificado com submodos, camadas adicionais recolhidas e painel lateral recolhível/redimensionável. A consulta municipal e os serviços de dados existentes são preservados. Não inclui ainda rankings novos, coleta histórica adicional, boletim municipal nem videowall.

Estratégia: manter identificadores internos e âncoras; agrupar fire/burned apenas na navegação. Um componente de layout controla largura e recolhimento sem desmontar os dados. A visão geral encaminha para os temas, sem inferir normalidade. O Leaflet reutiliza o ResizeObserver existente.

Validação: teste de navegação, seis temas, submodos, recolhimento, largura por teclado, consulta municipal e tela móvel; testes de dados existentes e build de produção.

## Implementação

- `MapWorkspace.jsx` e `map-workspace.css`: painel de 300 a 520 px no desktop, controle por teclado, recolhimento sem desmontar consultas e layout empilhado no celular. Mudar tema ou selecionar um elemento reabre o painel.
- `MapOverview.jsx`: atalhos e resumo das bases já recebidas, com fonte e referência quando disponíveis. Cadastro hidrológico não é classificação de risco.
- `PublicMapSection.jsx`, `LayerSelector.jsx`, `MapInfoPanel.jsx`: seis temas, Fogo com submodos independentes e camadas adicionais recolhidas. Mantidos os links #chuva, #rios, #fogo, #area-queimada, #seca e #emergencia-calamidade.
- `tests/map-phase1.cjs`: navegação, dimensões reais do painel, teclado e viewport móvel. Testes municipais adaptados aos novos nomes sem remover verificações.

Nenhuma API nova ou credencial foi adicionada. As fontes e os limites descritos em WEBGIS-OPERACIONAL.md continuam aplicáveis. Qualidade das leituras, timeout de todas as fontes, rankings, boletim municipal e videowall permanecem nas próximas fases, não são entregas desta fase.
