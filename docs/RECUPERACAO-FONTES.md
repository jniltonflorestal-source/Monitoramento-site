# Recuperação das fontes (06/10/2026)

## Diagnóstico

O JSON de produção registrava sucesso de INPE, INMET e MapBiomas, mas erros de CEMADEN (alertas), seca e S2ID. O frontend descartava todos os alertas quando apenas um emissor falhava. A consulta direta confirmou chuva CEMADEN operacional; o endereço legado de metadados de seca retornou HTTP 404. S2ID e alertas CEMADEN responderam em nova tentativa, indicando indisponibilidade transitória.

## Correções

- Alertas avaliados individualmente por emissor: contagem indisponível permanece nula; o resultado parcial não é apresentado como total estadual.
- Detalhes INMET permanecem visíveis se sua própria atualização for válida. CEMADEN indisponível não se transforma em zero.
- Aviso principal não afirma ausência de alertas estaduais quando falta um emissor.
- Coletor faz no máximo duas tentativas em GET para falhas de transporte, 408, 429 e 5xx selecionados; 401, 403 e 404 não recebem repetição. Timeout de 15s por tentativa e pausa de 1,5s.
- Agendamento continua horário, deslocado para minuto 17 para evitar o pico do início da hora; GitHub Actions não oferece garantia de pontualidade.
- Arquivos antigos locais não substituem o JSON operacional; nova coleta executada no GitHub com os secrets já configurados.

## Limitações

Em 07/10 foi identificado e corrigido outro erro: `DataHora` da ANA usa espaço entre data e hora, enquanto o coletor exigia `T`. As leituras agora são preservadas com data original. Quando não houver fuso, o nível aparece apenas como informado, com atualidade não confirmada, sem entrar em tendências atuais. Duplicatas conflitantes e datas inválidas continuam excluídas. O catálogo retornou 164 estações; cadastro não equivale a leitura operacional.

ANA continua dependente do serviço legado e/ou acesso institucional à API moderna. Não foram inventadas leituras, cotas ou fusos. SEMARH e IDAP continuam sem integração pública configurada.

A nova [plataforma Alerta Secas](https://alertasecas.cemaden.gov.br/) apresenta API diferente e condições de divulgação que requerem avaliação institucional. A base antiga não será apresentada como seca atual. A migração precisa validar classificação, referência, cobertura municipal e autorização aplicável antes de substituir o contrato antigo.

## Testes

`partial-alerts.mjs`, `source-fetch.mjs` e regressões de qualidade/dashboard cobrem falha de um emissor, zero confirmado, contagem nula, repetição limitada e ausência de repetição para erros de autenticação/endereço. Build/PWA e navegação responsiva também verificados.
