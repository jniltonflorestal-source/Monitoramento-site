# S2ID: consulta pública e recuperação do card (14/10/2026)

## Diagnóstico confirmado

O card não tinha um problema de layout: a coleta agendada recebia HTTP 403
no portal S2ID. A execução GitHub Actions `38563469946` reproduziu o erro.
O acesso público direto neste computador respondeu HTTP 200 e retornou
Filadélfia e Formoso do Araguaia, ambos com Situação de Emergência.
A confirmação às 09:36 de 14/10/2026 (Brasília) identificou 2 municípios
com reconhecimento federal, 2 SE e 0 ECP. Esses números são uma consulta
datada, não valores fixos do frontend.

O MIDR confirma que reconhecimentos vigentes são acessíveis sem cadastro:
[perguntas frequentes](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/sistema-integrado-de-informacoes-sobre-desastres/s2id-perguntas-frequentes).
Relatórios gerenciais públicos também são indicados pelo
[MIDR](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/reconhecimentos-realizados).
Relatório histórico e notícia de reconhecimento não substituem uma lista
completa de reconhecimentos vigentes.

## Implementação

- `scripts/s2id-source.mjs`: leitor público compartilhado com o coletor
  agendado, token anônimo apenas em memória, contagem de municípios distintos,
  horários próprios e detalhes opcionais. Falha do detalhe não transforma
  classificação SE/ECP desconhecida em zero.
- `scripts/update-s2id.mjs`: atualização específica da fonte, sem alterar
  seca, chuva, fogo, rios ou os respectivos horários.
- `parseEmergencyIndicator`: exige confirmação própria do S2ID. Data global
  de atualização não confirma automaticamente um reconhecimento.
- Após falha de reconsulta, uma confirmação anterior de até 48h pode aparecer
  no card como **na última consulta**, com badge **Atualização pendente**,
  horário de confirmação e última tentativa. O estado da fonte continua erro;
  esses registros não pintam a camada de reconhecimentos vigentes.
- Depois de 48h, sem confirmação ou com horário inválido, o card apresenta
  indisponibilidade com a data da tentativa. Uma consulta vazia bem-sucedida
  continua sendo zero confirmado, diferente de ausência de dados.
- O acesso oficial leva ao mapa público, não à série histórica de desastres.

O prazo de 48h é uma política de apresentação do portal, não garantia de
vigência nem prazo oficial. Reconhecimento federal é um registro
administrativo; não representa classificação automática de risco.

## Atualização sob demanda

Com Node.js 20 ou superior, a partir da raiz do repositório atualizado:

```powershell
node scripts/update-s2id.mjs
```

Isso atualiza somente o produto S2ID no `dados-monitoramento.json` local.
Revisar a alteração e publicar pelo fluxo GitHub Pages existente.
Para exportar apenas a resposta validada, sem alterar o snapshot local:

```powershell
node scripts/update-s2id.mjs --output s2id-confirmado.json
```

Uma recuperação assistida deve aplicar esse produto sobre o JSON remoto
mais recente, preservando todas as outras fontes. Não enviar um snapshot
local antigo inteiro. Falhas encerram o comando sem substituir os dados.

## Limitação e segurança

O bloqueio 403 no runner do GitHub permanece uma limitação externa.
O código não tenta contornar o bloqueio, não repete 401/403, não usa proxies,
credenciais privadas ou dados fictícios. A coleta horária existente permanece
habilitada, mas uma confirmação local não comprova acesso automático estável.
Para estabilizar o runner, solicitar ao responsável pelo S2ID uma forma de
acesso autorizada. Nenhum segredo é necessário ou publicado para esta consulta.

## Verificação

`tests/s2id-source.mjs` cobre o contrato público, municípios duplicados,
resposta inválida, 403 sem desvio, detalhe indisponível, zero confirmado,
isolamento do token e atualização seletiva.
`tests/s2id-recovery.mjs` cobre confirmação anterior versus consulta ativa,
falta de procedência, horários ausentes/antigos/futuros e apresentação do card.
`tests/s2id-recovery-browser.cjs` verifica card, mapa, falha posterior,
mobile e erros JavaScript. A publicação deve ser verificada contra o JSON real.
