# Centro de Monitoramento da Defesa Civil do Tocantins

Site público para acompanhamento de alertas, chuva, rios, focos de calor, seca, boletins e relatórios técnicos.

## Como adicionar novo relatório ou boletim

1. Coloque o PDF na pasta adequada:
   - Relatórios: `frontend/public/docs/relatorios/`
   - Boletins: `frontend/public/docs/boletins/`
   - Mapas ou produtos geoespaciais: `frontend/public/docs/mapas/`
2. Atualize `frontend/public/data/publicacoes.json`.
3. Faça commit e push para o GitHub.
4. Aguarde o GitHub Pages publicar.
5. Confira no site se os links funcionam.

## Padrão de nome de arquivo

Use nomes curtos, sem espaços e com ano/data:

```text
relatorio-incendios-florestais-tocantins-2025.pdf
boletim-defesa-civil-2026-05-27.pdf
mapa-seca-tocantins-2026-04.pdf
```

## Estrutura da central de publicações

O arquivo `frontend/public/data/publicacoes.json` controla a central **Publicações do Centro de Monitoramento**.

Estrutura principal:

- `destaque`: publicação principal exibida em maior evidência.
- `publicacoes`: lista de boletins digitais, PDFs, relatórios e mapas.

Categorias usadas na página:

- Boletins informativos
- Boletins hidrometeorológicos
- Relatórios técnicos
- Mapas e produtos geoespaciais

Cada publicação pode conter:

- `titulo`
- `descricao`
- `tipo`
- `categoria`
- `data`
- `periodoReferencia`
- `status`
- `fonteDados`
- `rota`
- `arquivoPdf`
- `tags`

Quando não houver PDF, deixe `arquivoPdf` vazio. O site exibirá `PDF ainda não disponível` e usará `rota` para o botão **Ler**.

## Como atualizar o Boletim Hidrometeorológico manualmente

1. Edite `frontend/public/data/boletim-atual.json`.
2. Atualize `numero`, `dataEmissao`, `periodoReferencia`, `resumoExecutivo` e os blocos temáticos.
3. Revise dados, fontes e recomendações.
4. Use `status: "rascunho"` enquanto o conteúdo ainda estiver em validação.
5. Altere para `status: "publicado"` apenas após revisão institucional.
6. Faça commit e push.
7. Confira a seção `#boletim-hidrometeorologico` no site publicado.

## Como adicionar PDF do boletim

1. Coloque o PDF em `frontend/public/docs/boletins/`.
2. Atualize `frontend/public/data/publicacoes.json` com título, data, tags e caminho do arquivo.
3. Confira se o botão do boletim abre o arquivo no site.

## Automação futura do boletim

O esboço `scripts/update-boletim-data.js` prepara o fluxo para buscar dados oficiais e atualizar `frontend/public/data/boletim-atual.json` como rascunho.

O workflow `.github/workflows/update-boletim.yml` pode ser acionado manualmente e está documentado para uma agenda futura. A regra institucional é: a automação prepara dados, mas boletins oficiais precisam de revisão humana antes de publicação.

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
