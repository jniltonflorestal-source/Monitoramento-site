# Panorama, Focos, Rios E Chuva Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar a home para “Panorama Atual!”, corrigir a publicação/estado dos focos de calor e tornar as camadas de rios e chuva mais úteis no mapa público.

**Architecture:** A interface continua em React/Vite, com componentes Leaflet pequenos adicionados ao painel geográfico. A atualização automática mantém `dados-monitoramento.json` no repositório, mas passa a publicar o GitHub Pages no mesmo workflow para evitar artefato antigo.

**Tech Stack:** React, Vite, React Leaflet, scripts Node, GitHub Actions Pages.

---

### Task 1: Regression Test

**Files:**
- Create: `tests/validate-panorama-fire-rain-rivers.mjs`

- [ ] **Step 1: Write the failing test**

Create a Node validation that asserts:
- `SituationHero.jsx` contains `Panorama Atual!`.
- `PublicMapSection.jsx` uses `FloatingMapLegend`, `RainModeTabs`, `rainMode`, `Resumo da chuva`, `Situação hidrológica`, `Previsão 24h`, `Previsão 48h`, `Satélite`.
- `publishedSnapshotParser.js` reads source-specific fire metadata `focos_calor.atualizadoEm` and `focos_calor.status`.
- `scripts/update-monitoring.mjs` writes `quantidade24h`, `quantidadeMapa`, `atualizadoEm`, `status: "ok"` for INPE.
- `.github/workflows/atualizar-dados.yml` deploys Pages after data refresh.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/validate-panorama-fire-rain-rivers.mjs`
Expected: FAIL before implementation.

### Task 2: Hero And Fire Data Freshness

**Files:**
- Modify: `frontend/src/components/dashboard/SituationHero.jsx`
- Modify: `frontend/src/services/publishedSnapshotParser.js`
- Modify: `scripts/update-monitoring.mjs`
- Modify: `.github/workflows/atualizar-dados.yml`

- [ ] **Step 1: Change hero title**

Replace the hero H1 with `Panorama Atual!`.

- [ ] **Step 2: Make INPE metadata explicit**

On successful INPE update, write:
`status`, `quantidade24h`, `quantidadeMapa`, `periodo`, `fonte`, `atualizadoEm`, `csv_url`, `pontos_24h`, and `features`.

- [ ] **Step 3: Make fire parser respect source state**

Use source-specific `focos_calor.atualizadoEm`; show error/fallback when `focos_calor.status === "erro"` or count is unavailable.

- [ ] **Step 4: Publish data workflow**

Add Pages permissions and deploy steps to `Atualizar dados de monitoramento`, so hourly JSON updates reach GitHub Pages.

### Task 3: Rios And Chuva Map UX

**Files:**
- Create: `frontend/src/components/maps/FloatingMapLegend.jsx`
- Create: `frontend/src/components/maps/RainModeTabs.jsx`
- Modify: `frontend/src/components/maps/MapInfoPanel.jsx`
- Modify: `frontend/src/components/maps/PublicMapSection.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add floating map legend**

Show compact rain/river legend inside the map, with river status described as reference while official classification is in integration.

- [ ] **Step 2: Add rain mode tabs**

Add `Observado 24h`, `Previsão 24h`, `Previsão 48h`, and `Satélite`. Only observed mode renders station points and heat circles; the other modes show integration placeholders.

- [ ] **Step 3: Move top summaries above search**

Render `Resumo da chuva` and `Situação hidrológica` at the top of the side panel.

- [ ] **Step 4: Improve river popup**

Show station, river, municipality, cota, trend, update, status, and source when a station is selected.

### Task 4: Verify, Build, Publish

**Files:**
- Build output under `frontend/dist/`
- Remote repo `jniltonflorestal-source/Monitoramento-site`

- [ ] **Step 1: Run validations**

Run:
`node tests/validate-panorama-fire-rain-rivers.mjs`
`node tests/validate-live-official-integrations.mjs`
`node tests/validate-geographic-dashboard.mjs`
`node tests/validate-public-home-react.mjs`

- [ ] **Step 2: Build**

Run: `npm run build` from `frontend`.

- [ ] **Step 3: Browser check**

Open local preview and verify hero title, fire state, rain tabs, river legend, and side summaries.

- [ ] **Step 4: Publish**

Commit changed source/build files to GitHub without overwriting the latest remote `dados-monitoramento.json`, trigger/allow Pages deployment, and verify the public URL.
