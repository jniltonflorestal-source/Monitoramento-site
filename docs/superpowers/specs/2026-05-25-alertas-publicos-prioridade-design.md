# Alertas Publicos com Prioridade - Design

## Objetivo

Reorganizar a pagina inicial do Centro de Monitoramento para que o cidadao identifique primeiro se ha risco vigente, onde confirmar o aviso e como agir, mantendo mapas e produtos tecnicos acessiveis em segundo nivel.

## Decisao de Produto

O topo da pagina tera um semaforo geral e uma faixa `Avisos e alertas vigentes`, antes dos indicadores ambientais. A faixa reunira Cemaden e INMET com resultados automatizados e IDAP / Defesa Civil Alerta com acesso oficial destacado. Como nao foi identificada API publica consultavel para alertas IDAP vigentes no Tocantins, o portal nao declarara ausencia de alerta IDAP; mostrara `Consulta oficial necessaria`.

## Ordem da Pagina

1. Cabecalho e hero `Situacao atual do Tocantins`, com semaforo geral.
2. `Avisos e alertas vigentes`, incluindo Cemaden, INMET e IDAP.
3. `Consultar avisos oficiais`, com botoes para INMET, Cemaden, IDAP, S2ID e boletins.
4. `Situacao do Tocantins agora`, com indicadores de leitura rapida.
5. `O que voce precisa saber agora`, produzido a partir dos avisos integrados.
6. Recomendacoes a populacao.
7. Boletins e relatorios.
8. `Mapas e paineis`, contendo o mapa territorial e o modulo completo `Seca no Tocantins`.
9. Explicacao de dados, area para gestores, fontes e sobre o Centro.

## Integridade dos Dados

Cemaden e INMET podem exibir `Sem registro vigente` somente apos resposta automatizada valida. IDAP e S2ID terao estado `Consulta oficial necessaria` enquanto nao houver contrato publico atual para consulta automatica. O portal nunca transformara fonte nao integrada ou indisponivel em zero.

O card administrativo separara:

- Situacao de Emergencia: `Consultar S2ID`.
- Estado de Calamidade Publica: `Consultar S2ID`.
- Reconhecimento federal vigente: `Consultar S2ID`.

## Linguagem e Acessibilidade

Os rotulos traduzem termos tecnicos: Cemaden aparece como risco de alagamento, enxurrada ou deslizamento; INMET como aviso de chuva, vento, baixa umidade ou tempestade; focos de calor recebem explicacao por satelite. A barra fixa para celular mantem `199` e `193` permanentemente visiveis.

## Verificacao

O teste estrutural exigira a nova ordem da pagina, a faixa de alertas, o bloco de consulta oficial, o resumo administrativo transparente e a seca dentro de mapas. A verificacao visual cobrira desktop e celular no site publicado, carregamento das camadas e ausencia de erros no console.
