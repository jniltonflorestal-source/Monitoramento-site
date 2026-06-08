import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const updateScript = await read("scripts/update-monitoring.mjs");
assert.match(updateScript, /process\.env\.INMET_API_ID/, "update-monitoring deve ler INMET_API_ID do ambiente");
assert.match(updateScript, /process\.env\.INMET_API_TOKEN/, "update-monitoring deve ler INMET_API_TOKEN do ambiente");
assert.match(updateScript, /apitempo\.inmet\.gov\.br\/token\/estacao/, "update-monitoring deve usar endpoint autenticado do INMET quando houver secrets");
assert.match(updateScript, /INMET_AUTH_ENABLED/, "update-monitoring deve registrar se a consulta autenticada foi usada");
assert.match(updateScript, /credenciais INMET ausentes/i, "update-monitoring deve explicar fallback sem secrets");
assert.match(updateScript, /todasEstacoes/, "update-monitoring deve publicar catalogo de estacoes INMET mesmo sem leitura");
assert.match(updateScript, /statusLeitura/, "update-monitoring deve diferenciar leitura valida e estacao sem leitura");

const workflow = await read(".github/workflows/atualizar-dados.yml");
assert.match(workflow, /\$\{\{\s*secrets\.INMET_API_ID\s*\}\}/, "workflow deve receber INMET_API_ID via GitHub Secret");
assert.match(workflow, /\$\{\{\s*secrets\.INMET_API_TOKEN\s*\}\}/, "workflow deve receber INMET_API_TOKEN via GitHub Secret");

const readme = await read("README.md");
assert.match(readme, /INMET_API_ID/, "README deve orientar a configuração do ID INMET como Secret");
assert.match(readme, /INMET_API_TOKEN/, "README deve orientar a configuração do token INMET como Secret");
assert.match(readme, /nunca coloque.*frontend|nunca.*c[óo]digo p[úu]blico/i, "README deve alertar para não expor credenciais no frontend");

const clientInmet = await read("frontend/src/services/inmet.js");
assert.doesNotMatch(clientInmet, /VITE_INMET_TOKEN|INMET_API_TOKEN/, "frontend não deve ler token INMET");

console.log("Integração segura INMET por GitHub Secrets validada.");
