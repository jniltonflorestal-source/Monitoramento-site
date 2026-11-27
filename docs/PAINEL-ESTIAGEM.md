# Painel público de estiagem

A página [Monitoramento da estiagem](https://jniltonflorestal-source.github.io/Monitoramento-site/estiagem/) utiliza o levantamento municipal da Defesa Civil do Tocantins, publicado pelo Apps Script institucional em um feed de leitura.

## Publicação e manutenção

- Arquivos publicados: `estiagem/`. A cópia em `frontend/public/estiagem/` preserva a página em futuras reconstruções do frontend.
- O workflow `pages.yml` inclui essa pasta no artefato do GitHub Pages. O service worker da home exclui `/estiagem/` do fallback de navegação da aplicação.
- O endereço público da fonte está em `config.js`; não contém token nem credenciais.
- A página consulta o feed JSON sem credenciais do visitante a cada 60 segundos enquanto estiver visível. O backend tem cache de 60 segundos. O botão Atualizar tenta uma nova consulta.
- A malha IBGE local contém os 139 municípios oficiais do Tocantins.

## Dados publicados

A seleção pública sempre exige validação técnica, independentemente do modo de coleta interno. São publicados nome e código oficiais do município, referência temporal, prioridade preliminar, quantitativos e categorias permitidas pelo esquema. Contatos, responsáveis, campos livres, localidades e comprovantes não são publicados. Respostas pendentes ou rejeitadas não alimentam os quantitativos públicos.

Sem informação validada, os municípios aparecem em cinza e os quantitativos aparecem como NI; isso não significa ausência de impacto. Registros aprovados antigos conservam sua referência, ficam cinza e não entram nos agregados atuais. A classificação auxilia o acompanhamento e não representa classificação oficial de intensidade do desastre.

CSV é gerado no navegador com campos permitidos e proteção contra interpretação de fórmulas. Relatório/PDF abre uma versão imprimível; use **Imprimir / Salvar como PDF**.

## Verificação

`node --test tests/estiagem-publica.test.cjs`

A planilha, a validação das respostas, a edição do formulário e o painel administrativo permanecem na conta institucional, com seus controles de acesso. O código do backend é mantido no projeto Apps Script, fora desta página estática.
