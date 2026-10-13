# Integridade das fontes e abrangência municipal

Auditoria iniciada em 11/10/2026 e validada novamente em 13/10/2026.

## Diagnóstico

- O produto MapBiomas publicava 1.023.369,62 ha de janeiro a agosto de 2026, enquanto o campo legado do resumo continuava em 245.000 ha. O período é mensal e não deve ser apresentado como medição diária.
- O INMET fornece `geocodes` oficiais, mas o coletor descartava esses códigos e preservava apenas uma descrição municipal truncada. O mapa e o boletim não podiam identificar a abrangência completa a partir desse texto.
- A contagem do S2ID precisava distinguir municípios de protocolos e não presumir SE quando a classificação não estivesse disponível.
- A seleção do CSV diário INPE dependia da ordem do diretório, sem verificar a idade do arquivo.
- A atualização do JSON geral não prova que todas as fontes tiveram sucesso. Cada produto conserva sua própria qualidade, tentativa e último sucesso.

## Correções

### Alertas oficiais

`officialMunicipalityCodes.js` aceita somente identificadores estruturados de sete dígitos. O coletor limita a abrangência aos códigos do Tocantins presentes na base municipal do projeto. Identificadores de outros estados não entram no mapa estadual; códigos inválidos tornam a abrangência incompleta. Não são inferidos municípios de nomes resumidos ou truncados.

Os detalhes publicados preservam `municipalityCodes`, `municipalityCoverageComplete` e `sourceId`. O parser mantém esses campos para o dashboard, Situação Estadual, ranking e boletim municipal. Os avisos futuros continuam separados dos vigentes; a consulta parcial de um emissor não significa ausência de alertas no Estado. A fonte municipal identifica o emissor que realmente forneceu o aviso.

### INPE

O arquivo diário mais recente é selecionado pela data válida do nome, independentemente da ordem do diretório. Datas futuras ou inválidas são descartadas. Se decorrerem mais de 36 horas após o término do dia UTC do último arquivo disponível, a atualização não é confirmada e o coletor registra erro. Um arquivo diário não equivale automaticamente a uma janela móvel de 24 horas; o histórico existente continua responsável pelos filtros temporais.

### MapBiomas Monitor do Fogo

O coletor valida os anos e meses disponíveis e solicita janeiro até o último mês confirmado. A estatística de hectares e o raster são produtos separados: falha do raster não invalida a estatística retornada com sucesso. O corpo de cada resposta é consumido dentro de seu próprio timeout, sem aguardar tentativas do outro produto. O campo `raster_status` identifica sua disponibilidade. Há teste com servidor HTTP local para raster lento e estatística válida.

`area_queimada.area_queimada_ha` é o produto canônico e alimenta também `resumo.area_queimada_ano_ha`. Em uma falha de consulta, o último produto válido pode manter o resumo histórico consistente, mas a qualidade permanece em erro, sem alterar o último sucesso. Valor ausente, negativo ou inválido não substitui o produto válido.

### S2ID

A contagem federal considera municípios distintos, não o número de protocolos. SE e ECP usam apenas a classificação explícita da fonte. Quando faltar identificação ou classificação, a contagem correspondente permanece nula; uma lista oficial válida e vazia confirma zero. Resposta sem lista válida é erro, não ausência de reconhecimento.

O token anônimo disponibilizado pelo próprio portal é usado apenas em memória no coletor. Não é gravado no frontend nem nos arquivos de dados. Erros HTTP agora incluem o código de resposta, sem divulgar credenciais.

## Fontes e limitações observadas

Situação conferida no JSON publicado em 13/10/2026, antes da nova coleta desta revisão:

| Fonte/produto | Situação observada | Limitação |
| --- | --- | --- |
| CEMADEN chuva | 35 estações cadastradas, 35 com leitura | Leitura pontual, não média municipal |
| INMET avisos | Consulta operacional | Abrangência depende dos códigos oficiais fornecidos |
| INMET chuva | 20 cadastradas, sem leitura válida | API recusou a credencial configurada; não houve alteração de secrets |
| ANA chuva | 175 cadastradas, sem leitura válida | Acumulação de 24h e fuso ainda não validados |
| ANA rios | Integração existente preservada | Leituras sem fuso confirmado não geram tendência atual |
| INPE | Arquivo diário operacional | Período diário identificado separadamente de 24h móvel |
| MapBiomas | Estatística mensal operacional | Último mês disponível era agosto; não se inventa mês seguinte |
| S2ID | Coletor publicado havia falhado | Consulta direta do portal respondeu; execução no GitHub precisa ser conferida separadamente |
| Seca IIS3 legada | HTTP 404 | Migração para a nova plataforma requer validação do contrato e das condições de uso |
| SEMARH / IDAP | Sem integração pública configurada | Não são classificados como erro de uma integração existente |

Ausência de leitura não é zero e cadastro não é estação operacional. Esta revisão não cria novas APIs, backend, credenciais ou classificação automática de risco.

## Atualização e segurança

O workflow `atualizar-dados.yml` existente usa os secrets institucionais somente no GitHub Actions. Seu agendamento horário permanece ativo, mas o GitHub não garante execução pontual. A leitura do frontend continua utilizando os mecanismos de cache e atualização já existentes.

A publicação de código é seletiva: arquivos locais antigos de `dados-monitoramento.json`, `fire-history.json` e `river-summary.json` não substituem os operacionais. A atualização real é solicitada pelo workflow depois da publicação.

## Verificação

Testes unitários executados: `source-products.mjs`, `official-alert-municipal.mjs`, `partial-alerts.mjs`, `source-fetch.mjs`, `state-dashboard.mjs`, `state-situation.mjs`, `data-quality.mjs` e `municipal-bulletin.mjs`.

Testes de navegador executados em Microsoft Edge/Playwright: `official-alert-municipal-browser.cjs`, `state-dashboard-browser.cjs`, `state-situation-browser.cjs` e `municipal-bulletin-browser.cjs`. Cobrem códigos oficiais sem nome no texto, mapa/ranking/boletim, 139 municípios, seis temas, links dos cards, navegação por teclado, tablet/celular, dados ausentes e impressão. As fixtures permanecem apenas nos testes, nunca nos dados publicados.

Build Vite/PWA concluído. Nenhuma biblioteca nova. O registro de execução real e a conferência do JSON publicado complementam os testes locais; sucesso do workflow não é tratado como sucesso de todas as APIs.

## Referências

- [Avisos ativos INMET](https://apiprevmet3.inmet.gov.br/avisos/ativos)
- [Arquivo diário INPE](https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/)
- [API Monitor do Fogo MapBiomas](https://plataforma.monitorfogo.mapbiomas.org/api/docs/)
- [Portal público S2ID](https://s2id.mi.gov.br/paginas/index.xhtml)
- [Recuperação das fontes](RECUPERACAO-FONTES.md)
