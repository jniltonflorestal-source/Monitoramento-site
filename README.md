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

## Estrutura de publicações

O arquivo `frontend/public/data/publicacoes.json` controla o relatório em destaque, boletins, relatórios e mapas exibidos na página inicial. Assim, novas publicações podem ser adicionadas sem alterar componentes React.
