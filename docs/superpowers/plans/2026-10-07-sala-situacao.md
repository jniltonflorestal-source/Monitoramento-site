# Sala de Situação: etapas 4A, 4B e 4C

**Objetivo:** Adicionar visão municipal integrada ao mapa existente, Radar descritivo e ranking contextual, sem novos provedores ou índices de risco.

**Arquitetura:** Serviço puro compartilha dados municipais com o ranking existente; componente Leaflet apresenta a malha já carregada; painel lateral contextual mantém seleção municipal. React/Vite, Leaflet, Turf e ícones existentes, sem novas dependências.

- [x] Testes unitários antes da implementação: ausência, zero, dados antigos, alertas sem abrangência estruturada, múltiplos fatores e hidrologia sem fuso.
- [x] 4A: tema estadual, seis filtros, camada municipal, tooltip, legenda, clique/seleção acessível no painel existente.
- [x] 4B: cinco dimensões, cobertura, fonte e período; metodologia documentada, sem soma de indicadores heterogêneos.
- [x] 4C: ranking reutilizado por tema; visão integrada agrupa fatores sem ordenar milímetros contra focos; clique enquadra município.
- [x] Testes desktop/mobile, regressões, medição de cálculo sobre 139 polígonos e build/PWA.
- [x] Documentação final e entrega limitada a 4A–4C.

**Fora de escopo:** Videowall, rotação, timeline, PDF municipal, novas APIs, backend, autenticação e novas classificações oficiais.
