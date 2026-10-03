# Fase 2: qualidade, atualidade e falhas de fontes

## Implementação

- Painel recolhível **Qualidade e atualização dos dados**, depois do mapa: leitura/referência, última tentativa, diagnóstico e consulta manual.
- Nova consulta a cada cinco minutos com página visível; intervalo manual mínimo de 30 segundos. Requisições simultâneas de retrato e séries ANA são compartilhadas.
- HTTP do frontend limitado a 12 segundos, inclusive corpo da resposta; retrato limitado a 45 segundos por indicador. Coletor com limite de 15 segundos por requisição.
- JSONP CEMADEN isolado: respostas atrasadas não resolvem consultas seguintes nem chamam um callback global removido.
- Cadastro hidrológico não recebe mais selo verde de normalidade.
- Leituras ausentes, precipitação negativa e dados antigos não entram como zero. Zero numérico válido continua sendo exibido.
- INMET: exige 24 registros horários consecutivos, sem duplicidades, na janela UTC. Mesma soma no coletor e navegador. Não reutiliza dias antigos como chuva atual.
- Seca antiga permanece no mapa como referência histórica, com aviso explícito.
- Avisos futuros não entram no destaque de avisos ativos.

## Política de atualidade

Definida em `frontend/src/services/dataQuality.js`. Estes limites são controles do portal, **não critérios oficiais de risco nem garantia de atualização dos emissores**.

| Informação | Política |
| --- | --- |
| Chuva | Leitura até 3h; INMET exige janela horária completa |
| Alertas | Consulta até 6h, sem erro da fonte |
| Arquivo diário INPE | Até 36h; não equivale a uma janela móvel de 24h |
| S2ID | Consulta até 48h, sem erro na última tentativa |
| Seca | Referência mensal até 120 dias; depois disso, histórico |
| ANA rios | Cache de 5 minutos, data original e ressalva quando o fuso não estiver explícito |

Data de consulta não substitui medição. Valores nulos não equivalem a zero. Horários de observação sem fuso confirmado não são automaticamente classificados como atuais.

## Auditoria e limitações

A base pública consultada em 02/10/2026 tinha horário geral recente, mas falhas em `s2id` e `seca_iis3`; a seca permanecia na referência de maio. Por isso o horário geral não pode confirmar sozinho cada fonte.

- **CEMADEN:** principal fonte de chuva; fallback somente para leituras publicadas válidas e recentes.
- **INMET:** consulta pública depende da disponibilidade e das restrições da API. Autenticação permanece nos secrets do Actions. Série incompleta não é acumulado completo de 24h.
- **ANA chuva:** a soma anterior usava um intervalo de datas sem validar fuso, janela nem semântica do acumulado. Foi retirada da consolidação atual de 24h. Catálogo e níveis hidrológicos continuam funcionando. Reativar essa soma somente com janela comprovada; o adaptador aceita leituras futuras publicadas com dados e timestamps válidos.
- **SEMARH e IDAP:** integração não configurada, sem presumir ausência de ocorrências.
- **S2ID e seca:** falhas invalidam a aparência de atualidade mesmo que haja valor anterior. A interface não resolve indisponibilidade do provedor.
- Meteorologia municipal, MapBiomas e histórico de fogo preservam seus fluxos existentes; auditorias aprofundadas desses produtos e novas séries continuam como evolução posterior.

## Coleta agendada

`scripts/update-monitoring.mjs` registra `qualidade_fontes` por coletor, com `status`, `ultimaTentativa` e `ultimoSucesso`. Em falha, mantém o sucesso anterior e registra erro. A data geral da execução não limpa falhas individuais.

Bases legadas respeitam `erros_atualizacao` e a idade do retrato. Os novos metadados surgem na próxima execução do workflow existente. Não publicar o JSON local antigo sobre a base atualizada pelo Actions. Não colocar credenciais no frontend.

## Testes

- `node tests/data-quality.mjs`: nulos, zero, dados antigos, erros de fonte, datas futuras, soma horária e duplicidades.
- `node tests/data-quality-browser.cjs`: fixtures exclusivamente de teste, JSONP, zero válido, fonte antiga, catálogo e responsividade.
- `node tests/map-phase1.cjs`: seis temas, submodos, painel recolhível/redimensionável e celular.
- `node tests/operational-map.mjs` e `node tests/municipal-monitoring.mjs`: filtros e seleção territorial.
- `node --check scripts/update-monitoring.mjs` e build Vite/PWA.

Testes de navegador usam Playwright/Edge e servidor local na porta 4196. `PLAYWRIGHT_MODULE` permite indicar uma instalação existente. Nenhuma fixture é usada no site publicado.
