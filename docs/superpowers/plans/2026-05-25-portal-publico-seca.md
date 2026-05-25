# Portal Público e Seca no Tocantins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma home cidadã com situação rápida e um painel municipal de seca alimentado pelo IIS3/Cemaden, com transparência sobre S2ID.

**Architecture:** `scripts/update-monitoring.mjs` amplia o JSON publicado com a fotografia mensal da seca e sua tendência. `index.html`, `styles.css` e `script.js` renderizam cards públicos e um mapa Leaflet municipal, associando o IIS a malhas do IBGE no navegador; S2ID tem contrato de dados preparado e estado de indisponibilidade verificado.

**Tech Stack:** HTML, CSS, JavaScript sem framework, Leaflet, GitHub Pages, GitHub Actions, APIs oficiais Cemaden/INMET/ANA/IBGE.

---

### Task 1: Contrato de dados da seca

**Files:**
- Modify: `scripts/update-monitoring.mjs`
- Modify: `dados-monitoramento.json`
- Test: `tests/validate-public-portal.mjs`

- [ ] Escrever verificação que exige `seca.resumo`, `seca.municipios` e fonte `Cemaden / Alerta-Secas - IIS3`.
- [ ] Executar a verificação e observar falha por ausência do novo contrato.
- [ ] Consultar `rest/product/meta/iis3`, buscar os dois últimos meses via WFS filtrado para `sigla_uf='TO'` e gerar contagens/tendência.
- [ ] Executar o atualizador e a verificação até obter passagem com 139 municípios.

### Task 2: Entrada pública e recomendações

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `script.js`
- Test: `tests/validate-public-portal.mjs`

- [ ] Exigir na verificação os identificadores `situationGrid`, `todaySummary`, `recommendationGrid` e `mobileEmergencyBar`.
- [ ] Alterar hero, ações rápidas e cartões para destacar a situação em linguagem simples.
- [ ] Renderizar valores oficiais do JSON nos cartões, mantendo fontes no detalhamento.
- [ ] Criar cards de orientação e faixa fixa de emergência para celular.

### Task 3: Mapa de seca e S2ID transparente

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `script.js`
- Test: `tests/validate-public-portal.mjs`

- [ ] Exigir os identificadores `droughtMap`, `droughtLayerSwitcher` e texto explicativo da complementaridade S2ID/IIS.
- [ ] Buscar limites municipais e nomes pelo IBGE, associar aos dados IIS3 e desenhar a camada por severidade.
- [ ] Implementar alternadores para seca, S2ID e focos; a camada S2ID deve informar ausência de base vigente verificável, sem mostrar zero como dado.
- [ ] Mostrar detalhe municipal no clique, incluindo campos administrativos quando disponíveis.

### Task 4: Publicação e validação

**Files:**
- Modify: `github_upload/index.html`
- Modify: `github-pages-index.html`

- [ ] Empacotar CSS, JavaScript, logo e silhueta na página de publicação.
- [ ] Validar desktop e celular no navegador local, incluindo mapa, clique municipal e barra de emergência.
- [ ] Publicar `index.html`, `dados-monitoramento.json` e atualizador no branch `main`.
- [ ] Abrir o GitHub Pages com cache-bust e confirmar a versão pública.
