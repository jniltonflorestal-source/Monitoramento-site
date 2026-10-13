# Recuperação da seca municipal CEMADEN

## Causa e fonte utilizada

O endereço legado `mapasecas.cemaden.gov.br/rest/product/meta/iis3` passou a responder HTTP 404. A atualização geral do portal não corrige um endereço removido: era necessária a migração da coleta.

A fonte utilizada é a planilha municipal IIS publicada pelo CEMADEN junto aos [boletins mensais de seca](https://www.gov.br/cemaden/pt-br/assuntos/monitoramento/impactos-seca/monitoramento-de-seca-para-o-brasil). Não é utilizada a API da nova plataforma Alerta Secas, cujas condições específicas de redistribuição exigem autorização. São preservados os valores e categorias do arquivo público oficial, com identificação do CEMADEN/MCTI e link à publicação de origem.

Referência validada localmente: [setembro de 2026](https://www.gov.br/cemaden/pt-br/assuntos/monitoramento/impactos-seca/monitoramento-de-seca-para-o-brasil/monitoramento-de-secas-e-impactos-no-brasil-2013-setembro-2026). O mês aparece explicitamente no card, mapa e documento; não é dado em tempo real.

## Resultado da planilha

Os 139 códigos municipais foram conferidos contra a malha do projeto. Os nomes exibidos vêm dessa malha, mantendo os acentos mesmo quando o nome da planilha contém caracteres corrompidos. O valor oficial é associado pelo código IBGE, nunca inferido de uma semelhança textual.

| Categoria oficial / apresentação | Municípios em setembro |
| --- | ---: |
| Normal / Sem seca | 51 |
| Seca Fraca | 76 |
| Seca Moderada | 12 |
| Seca Severa | 0 |
| Seca Extrema | 0 |
| Seca Excepcional | 0 |

Total com algum grau: 88. Categoria mais intensa identificada: Moderada. Na comparação com agosto, 74 melhoraram, 1 agravou e 64 mantiveram a categoria. Esse resumo descreve o índice, não uma classificação administrativa de emergência ou um alerta oficial.

## Arquitetura e arquivos

- `scripts/cemaden_drought.py`: descoberta da última edição no índice oficial, download da planilha, leitura via openpyxl, validação de legenda/cobertura e atualização do mesmo `dados-monitoramento.json` já usado pelo portal.
- `scripts/requirements-drought.txt`: openpyxl 3.1.5, instalado somente no coletor; não aumenta as dependências do frontend.
- `.github/workflows/atualizar-dados.yml`: instala o leitor e executa o coletor mensal depois do coletor geral, antes de publicar o JSON.
- `scripts/update-monitoring.mjs`: remove o caminho legado de seca, preservando INPE, alertas, chuva, MapBiomas e S2ID.
- `publishedSnapshotParser.js`: preserva a consulta própria da seca e reconhece a categoria Excepcional.
- `PublicMapSection.jsx`: completa a legenda, exibe a consulta e o link oficial, e mostra a tendência individual disponível.
- `stateDashboard.js`: esclarece que o valor estadual é a categoria mais intensa identificada, não a condição de todos os municípios.

O mapa, ranking, painel municipal e boletim reutilizam o contrato existente. Não foi criado um segundo módulo de seca.

## Validação e tratamento de erro

A legenda é conferida na própria planilha: 1=Excepcional, 2=Extrema, 3=Severa, 4=Moderada, 5=Fraca, 6=Normal. O coletor antigo agrupava 1 e 2 como Extrema; isso foi corrigido.

Somente o IIS-3 da edição publicada é utilizado, sem trocar por IIS-1/IIS-6 ou selecionar uma coluna futura. Ausência, categoria inválida, duplicação, código não identificado, legenda diferente ou cobertura incompleta interrompem a atualização do produto. Nada disso é convertido em Normal ou zero.

Tendência exige categorias válidas do mês imediatamente anterior. Falta de comparação não significa estabilidade. A classificação original permanece acompanhada de `classe_oficial`; o campo `classe` é compatível com a legenda existente.

Na falha, o último produto é preservado e `qualidade_fontes.seca_iis3` registra erro/tentativa sem renovar `ultimoSucesso`. As demais fontes não são alteradas. Requisições têm timeout, tamanho limitado e no máximo duas tentativas para falhas transitórias. Links e redirecionamentos são limitados ao domínio e à seção oficial CEMADEN em gov.br.

O frontend exige confirmação própria da consulta nas últimas 48h, além da referência mensal válida. Atualização global de outras fontes não confirma seca; consulta ausente ou desatualizada é sinalizada. Se todos os municípios estiverem em Normal, a lista de municípios críticos fica vazia.

## Como conferir

```powershell
python -m pip install -r scripts/requirements-drought.txt
python tests/test_cemaden_drought.py
python scripts/cemaden_drought.py --preview
node tests/cemaden-drought.mjs
```

`--preview` imprime o produto oficial sem modificar o JSON operacional. O teste `cemaden-drought-browser.cjs` utiliza essa saída temporária, nunca dados simulados publicados. Conferência visual inclui canvas municipal não vazio, categorias, card, seleção municipal/PDF e celular. Regressões do dashboard, mapa estadual, qualidade, boletim e build/PWA são executadas antes da publicação.

## Limites

### Verificação publicada

Código publicado no commit `056c4d02dc5af5da61b31dbcaf600c763d49d4cd`. A [coleta no GitHub Actions](https://github.com/jniltonflorestal-source/Monitoramento-site/actions/runs/38415230255) concluiu com sucesso em 13/10/2026; `qualidade_fontes.seca_iis3` registrou OK e último sucesso às 14:40:16 UTC (11:40:16 em Brasília), sem erro de seca no JSON.

Conferência do JSON público confirmou os 139 códigos únicos e a distribuição da tabela acima. Teste de navegador em produção confirmou card, cores municipais no canvas Leaflet, legenda completa, resumo municipal/PDF, celular sem overflow e nenhum erro crítico de JavaScript. Os testes de regressão do dashboard, mapa estadual e boletim também passaram; build Vite/PWA concluído.

### Periodicidade e fontes independentes

O arquivo é mensal e pode conter histórico desde 2021; só a referência publicada é exibida como produto mais recente. O collector consulta a edição publicada, não inventa o mês corrente. Pode haver revisão posterior da fonte, atraso de publicação ou indisponibilidade do gov.br; nesses casos a referência e a qualidade continuam explícitas.

A condição de seca não equivale a decreto ou reconhecimento no S2ID. O erro 403 do S2ID no runner é independente desta correção. Nenhuma credencial nova foi usada ou exposta.
