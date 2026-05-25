# Portal Público e Seca no Tocantins - Design

## Objetivo

Transformar a página inicial do Centro de Monitoramento da Defesa Civil do Tocantins em um portal público de situação, com leitura simples do risco atual e uma seção específica para seca, sem perder os recursos técnicos já disponíveis.

## Hierarquia Pública

A primeira tela apresenta `Situação atual do Tocantins`, o vínculo institucional do Centro e ações diretas: situação, boletins, mapas, alertas e emergência. Logo abaixo, cartões mostram alertas oficiais, chuva, rios, seca, focos de calor e S2ID. As fontes técnicas permanecem visíveis nos detalhes, não como mensagem principal.

## Seca no Tocantins

O módulo usa o Índice Integrado de Seca em escala de 3 meses (`IIS3`) do Alerta-Secas/Cemaden. O atualizador consulta o produto mais recente, baixa as classificações municipais do Tocantins e compara com o mês anterior para informar tendência.

As classes exibidas são:

| IIS | Exibição pública |
| --- | --- |
| 6 | Sem seca |
| 5 | Seca fraca |
| 4 | Seca moderada |
| 3 | Seca severa |
| 2 ou 1 | Seca extrema |

O resumo estadual informa situação mais crítica observada, municípios com seca, municípios em classe moderada ou superior, municípios em classe severa ou extrema, localidades críticas, tendência, referência mensal e fonte.

## Mapa

Um mapa dedicado utiliza geometrias municipais oficiais do IBGE, associadas às classes IIS pelo nome municipal. O usuário alterna:

- `Severidade da seca`: preenchimento municipal por classe IIS.
- `SE/ECP - S2ID`: estrutura administrativa, exibindo indisponibilidade de contagem vigente enquanto não houver base pública atual verificável.
- `Focos de calor`: referência associada ao período seco e acesso ao painel de focos já existente.

Ao clicar em município na camada de seca, são mostrados nome, grau de seca, situação S2ID, COBRADE e decreto quando disponíveis, atualização e fonte.

## S2ID

O S2ID/SEDEC-MIDR é complementar ao índice técnico. O conjunto aberto identificado possui cobertura informada até 2022 e, por isso, não será usado para afirmar quantos reconhecimentos estão vigentes em 2026. O portal exibirá o acesso oficial e manterá a estrutura de dados pronta para registros estaduais ou fonte pública atualizada.

## Linguagem e Responsividade

Os textos principais serão corrigidos para português com acentuação e redigidos para o público geral. Recomendações ganham cards visuais e, em telas pequenas, uma faixa fixa destaca `Defesa Civil 199` e `Bombeiros 193`.

## Verificação

Serão verificados: geração automatizada dos dados IIS3; presença e conteúdo dos cartões públicos; desenho do mapa municipal e clique em município; comportamento em desktop e celular; console sem erros; propagação no GitHub Pages.
