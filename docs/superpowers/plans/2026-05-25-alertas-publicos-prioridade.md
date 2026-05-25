# Alertas Publicos com Prioridade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar a home para priorizar alertas oficiais e orientacao imediata, mantendo a seca detalhada dentro dos mapas.

**Architecture:** A pagina estatica recebe novas secoes e ordem sem alterar o mecanismo de publicacao. `script.js` calcula estado geral e renderiza alertas automaticos de Cemaden/INMET, enquanto IDAP e S2ID usam estados explicitos de consulta oficial por nao possuirem fonte automatizada atual verificada.

**Tech Stack:** HTML, CSS, JavaScript, Leaflet, JSON gerado por Node, GitHub Pages, fontes oficiais MIDR/Cemaden/INMET/ANA/INPE.

---

### Task 1: Contrato visual de prioridade publica

**Files:**
- Modify: `tests/validate-public-portal.mjs`
- Modify: `index.html`

- [ ] Exigir `#currentAlertsBand`, `#officialAccess`, `#generalState` e `#administrativeStatus` e verificar que `#alertas` ocorre antes de `#situacao`, e `#seca` depois de `#mapas`.
- [ ] Executar a verificacao e observar falha por ausencia dos novos elementos e da nova ordem.
- [ ] Reordenar a pagina e inserir faixa de alertas, consulta oficial e card administrativo.
- [ ] Executar novamente a verificacao estrutural.

### Task 2: Estados e mensagens publicas

**Files:**
- Modify: `script.js`
- Modify: `styles.css`
- Modify: `tests/validate-public-portal.mjs`

- [ ] Exigir as mensagens `Consulta oficial necessaria`, `Como receber alertas` e `S2ID`.
- [ ] Renderizar semaforo geral, cartoes Cemaden/INMET/IDAP e tres linhas administrativas sem zeros indevidos.
- [ ] Acrescentar os estilos de destaque, botoes oficiais e comportamento responsivo.
- [ ] Validar que dados automaticos exibem registro vigente ou sem registro somente para fontes consultadas.

### Task 3: Mapas, publicacao e comprovacao

**Files:**
- Modify: `github_upload/index.html`
- Modify: `github-pages-index.html`

- [ ] Empacotar HTML/CSS/JavaScript atualizados no artefato do GitHub Pages.
- [ ] Executar verificacao estrutural e abrir desktop/celular no navegador incorporado.
- [ ] Publicar os arquivos no branch `main` do GitHub.
- [ ] Confirmar propagacao na URL publica com cache-bust, camadas do mapa e console sem erros.
