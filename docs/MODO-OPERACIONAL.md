# Etapa 4D - Modo Operacional

## Uso

No mapa principal, selecione **Modo Operacional**. A apresentacao ocupa a janela do navegador e preserva o mesmo mapa, paineis e dados. **Modo Publico** ou Escape encerra e restaura o tema anterior. Nao requer permissao de tela cheia do navegador.

O seletor apresenta Visao estadual, Hidrologia, Chuva, Fogo e Seca. Alertas abrem pelo indicador superior. A visao estadual conserva o ranking e o painel municipal implementados em 4A-C. As ferramentas detalhadas continuam no modo publico.

## Rotacao

Comeca sempre desligada, inclusive ao reabrir. Intervalos permitidos: 15, 30 ou 60 segundos, padrao 30. Sequencia: estadual, rios, chuva, fogo, seca. Selecionar manualmente um tema ou interagir no mapa/painel pausa a rotacao. Aba oculta suspende o temporizador; ao voltar, inicia um intervalo completo. Sair elimina o temporizador. A rotacao nao cria entradas no historico do navegador.

Nao se trata de animacao temporal dos dados. Nenhum frame, medicao ou alerta e criado. Timeline e PDF municipal continuam fora de escopo.

## Dados e seguranca

SituationDashboard fornece o mesmo snapshot aos componentes existentes e ao OperationalMode. Indicadores reutilizam buildStateDashboard, fontes reutilizam dataHealthRows. A apresentacao operacional distingue fontes desatualizadas, indisponiveis, periodicas e ainda sem integracao. Fontes nao integradas nao entram no denominador das fontes disponiveis. Cadastro nao e leitura hidrologica.

Ultima consulta e diferente do horario de cada medicao; ambos ficam identificados. A atualizacao segue o ciclo existente de cinco minutos na aba visivel, sem nova coleta completa a cada rotacao. Consultas sob demanda dos temas existentes permanecem sujeitas ao cache e tratamento de erros desses modulos. Nenhuma API, chave privada ou dependencia foi acrescentada.

## Layout e acessibilidade

Apresentacao ampliada dentro da mesma pagina, com tipografia maior, indicadores compactos e barra de temas unica. Mapa usa ResizeObserver existente. Em telas pequenas, controles quebram linha, indicadores formam duas colunas e o painel fica abaixo do mapa. Conteudo externo fica inert durante a apresentacao; Escape, foco de retorno e rolagem sao restaurados. CSS respeita prefers-reduced-motion. Rotacao so inicia por acao explicita.

## Arquivos

- frontend/src/components/maps/OperationalMode.jsx
- frontend/src/services/operationalMode.js
- frontend/src/operational-mode.css
- frontend/src/components/maps/PublicMapSection.jsx
- frontend/src/components/dashboard/SituationDashboard.jsx
- tests/operational-mode.mjs
- tests/operational-mode-browser.cjs

## Limites

## Verificacao em 10/10/2026

Testes de regras e navegador passaram para entrada/saida, Escape, foco, rotacao de 15/60s, pausa ao interagir, suspensao na aba oculta e retomada. Capturas verificadas em 1920x1080, 2560x1440 e 390x844. Regressoes de temas, painel municipal e Sala de Situacao passaram. Build Vite e geracao PWA concluidos. Testes de navegador utilizaram Edge; nao houve certificacao em outros navegadores ou teste de sincronizacao entre telas fisicas.

Nao corrige a disponibilidade dos provedores. Dados antigos ou insuficientes continuam sinalizados. O modo nao utiliza Fullscreen API e nao bloqueia atalhos do navegador. Monitores de baixa altura podem exigir rolagem para preservar legibilidade. Sem videowall distribuido entre maquinas, backend ou sincronizacao externa.
