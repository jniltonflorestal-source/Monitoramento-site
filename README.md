# Centro de Monitoramento da Defesa Civil do Tocantins

Site público para acompanhamento de alertas, chuva, rios, focos de calor, seca, boletins e relatórios técnicos.

## Biblioteca de publicações

A seção `#boletins` funciona como uma biblioteca pública da Defesa Civil, separando dois tipos de documentos:

- **Relatórios Técnicos**: documentos analíticos produzidos sob demanda para subsidiar gestão de riscos, resposta a desastres, monitoramento ambiental e tomada de decisão institucional.
- **Boletins da Defesa Civil**: publicações periódicas, especialmente o Boletim Hidrometeorológico, com dados monitorados e histórico por data.

Arquivos principais:

- `frontend/public/data/publicacoes.json`: índice público usado pela biblioteca da home.
- `frontend/public/data/relatorios-tecnicos.json`: acervo separado de relatórios.
- `frontend/public/data/boletins.json`: histórico de boletins publicados ou em atualização.
- `frontend/public/data/boletim-atual.json`: dados estruturados do boletim hidrometeorológico digital.

Pastas de documentos:

- `frontend/public/docs/relatorios/`
- `frontend/public/docs/boletins/`
- `frontend/public/docs/mapas/`
- `frontend/public/docs/anexos/`

## Como adicionar novo relatório técnico

1. Coloque o PDF em `frontend/public/docs/relatorios/`.
2. Cadastre o documento em `frontend/public/data/publicacoes.json`, dentro de `relatoriosTecnicos`.
3. Se quiser manter um acervo separado, replique ou sincronize o item em `frontend/public/data/relatorios-tecnicos.json`.
4. Informe `tipo: "Relatório Técnico"` e uma categoria, como `Incêndios florestais`, `Estiagem e seca`, `Chuvas intensas`, `Recursos hídricos`, `Áreas de risco`, `Geoprocessamento` ou `Resposta operacional`.
5. Faça commit e push.
6. Aguarde o GitHub Pages publicar e confira a seção `#boletins`.

## Como adicionar boletim da Defesa Civil

1. Coloque o PDF em `frontend/public/docs/boletins/`.
2. Cadastre o boletim em `frontend/public/data/publicacoes.json`, dentro de `boletinsDefesaCivil`.
3. Atualize também `frontend/public/data/boletins.json` para manter o histórico.
4. Informe `tipo: "Boletim da Defesa Civil"` e, quando for o caso, `subtipo: "Boletim Hidrometeorológico"`.
5. Use status `rascunho`, `em revisão`, `em atualização` ou `publicado`.
6. Faça commit e push.

## Padrão de nome de arquivo

Use nomes curtos, sem espaços e com ano/data:

```text
relatorio-incendios-florestais-tocantins-2025.pdf
boletim-hidrometeorologico-2026-05-27.pdf
mapa-seca-tocantins-2026-04.pdf
```

## Como atualizar o Boletim Hidrometeorológico digital

1. Edite `frontend/public/data/boletim-atual.json`.
2. Atualize `numero`, `dataEmissao`, `periodoReferencia`, `resumoExecutivo` e os blocos temáticos.
3. Revise dados, fontes e recomendações.
4. Use `status: "rascunho"` enquanto o conteúdo estiver em validação.
5. Use `status: "em revisão"` quando estiver pronto para conferência institucional.
6. Altere para `status: "publicado"` apenas após validação.
7. Faça commit e push.
8. Confira a seção `#boletins` no site publicado.

## Como configurar a API do INMET com segurança

O site roda no GitHub Pages, portanto qualquer variável `VITE_*` ou token colocado no frontend fica público no JavaScript publicado. Nunca coloque credenciais INMET no frontend, no código público ou nos arquivos JSON servidos pelo site.

Para usar a consulta autenticada do INMET, cadastre as credenciais como **GitHub Actions Secrets** no repositório:

1. Abra o repositório no GitHub.
2. Acesse **Settings > Secrets and variables > Actions**.
3. Crie o secret `INMET_API_ID` com o ID fornecido pelo INMET.
4. Crie o secret `INMET_API_TOKEN` com o token fornecido pelo INMET.
5. Rode o workflow **Atualizar dados de monitoramento** manualmente ou aguarde a próxima execução horária.

O workflow `.github/workflows/atualizar-dados.yml` repassa esses secrets apenas para `scripts/update-monitoring.mjs`. O script consulta a API do INMET no ambiente do GitHub Actions e publica somente o resultado sanitizado em `dados-monitoramento.json`, sem expor ID ou token.

Se os secrets não estiverem configurados, a chuva do INMET continua tentando o endpoint público e a interface informa que a consulta autenticada ainda não está configurada.

## Como funciona o botão "Gerar Boletim Hidrometeorológico em PDF"

Na seção **Publicações da Defesa Civil**, o bloco **Boletins da Defesa Civil** possui o botão **Gerar Boletim Hidrometeorológico em PDF**.

Ao clicar, o site:

1. Consulta os dados estruturados de `frontend/public/data/boletim-atual.json`.
2. Consulta o retrato atual do painel, incluindo alertas, chuva, rios, focos de calor, seca e S2ID.
3. Consulta `frontend/public/data/meteorologia-tocantins.json` e tenta atualizar os pontos meteorológicos disponíveis.
4. Monta um template institucional em A4 no próprio navegador.
5. Abre a janela de impressão para o usuário selecionar **Salvar como PDF**.

Como o site roda no GitHub Pages, essa geração é feita no navegador, sem backend e sem salvar automaticamente arquivos no repositório.

Se alguma fonte estiver indisponível no momento da geração, o PDF indica `Dado em integração` ou `Não disponível no momento da geração`, em vez de inventar valores.

Dados usados pelo boletim:

- `frontend/public/data/boletim-atual.json`
- `frontend/public/data/meteorologia-tocantins.json`
- `dados-monitoramento.json`, publicado na raiz do site pelo fluxo automático de monitoramento
- serviços em `frontend/src/services/`, como `monitoringService`, `boletim` e `weather`

Para futuramente salvar PDFs gerados:

1. Gere o PDF pelo navegador ou por automação.
2. Salve o arquivo em `frontend/public/docs/boletins/`.
3. Registre o boletim em `frontend/public/data/boletins.json`.
4. Atualize `frontend/public/data/publicacoes.json`.
5. Publique com commit e push.

## Publicações sem PDF

Quando um PDF ainda não existir, deixe `arquivoPdf` vazio. O site mostrará `PDF ainda não disponível` e usará `rota` para o botão **Ler**, quando houver uma página digital ou notícia oficial.

## Automação futura dos boletins

O arquivo `scripts/generate-boletim.js` prepara o fluxo futuro de geração automática ou semiautomática do boletim diário:

1. Coletar dados de fontes oficiais.
2. Atualizar `frontend/public/data/boletim-atual.json`.
3. Gerar PDF em `frontend/public/docs/boletins/`.
4. Adicionar o boletim ao histórico em `frontend/public/data/boletins.json`.
5. Atualizar `frontend/public/data/publicacoes.json`.
6. Criar um rascunho para revisão humana.

O workflow `.github/workflows/generate-boletim.yml` pode ser acionado manualmente e está preparado para agendamento futuro. Como boletins são publicações oficiais, a regra é: automação gera rascunho, mas publicação exige revisão humana.

Fontes previstas para integração:

- INMET
- CEMADEN
- ANA
- INPE Queimadas
- CPTEC/INPE
- S2ID
- IDAP
- Monitor de Secas
- MapBiomas Fogo

Também existe o fluxo auxiliar `scripts/update-boletim-data.js` com o workflow `.github/workflows/update-boletim.yml`, voltado a atualizar o JSON do boletim atual como rascunho.
