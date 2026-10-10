# Modo Operacional - Etapa 4D

Escopo aprovado: alternancia publico/operacional, mapa ampliado, indicadores/fontes, rotacao opcional de 15/30/60s. Sem timeline, PDF, novos provedores ou novo dashboard.

Arquitetura: componente OperationalMode dentro do mapa existente; snapshot compartilhado por SituationDashboard. Rotacao apenas na aba visivel, pausada ao interagir no mapa, desligada ao sair. Entrada nao exige Fullscreen API. Escape e botao encerram; foco e rolagem sao restaurados. Conteudo externo fica inert enquanto o modo estiver aberto.

- [x] Testes de regras de rotacao e estados de fontes.
- [x] Componente, integracao e CSS responsivo.
- [x] Testes de navegador: rotação, pausa, Escape, foco, mobile e tela grande.
- [x] Regressoes e build/PWA.
- [ ] Documentacao e publicacao seletiva.
