# Coleta ANA: resumo dos rios

`python scripts/update-river-summary.py` grava `data/river-summary.json` na raiz
do repositorio, independentemente do diretorio de execucao. Requer Python 3.10+
e apenas biblioteca padrao (`urllib`, `xml.etree.ElementTree`, etc.). Sem pip,
credenciais, calculos de tendencia, ranking ou alteracoes no frontend.

## Origem e limites

- HTTPS em `telemetriaws1.ana.gov.br/ServiceANA.asmx/`: `HidroInventario`
  com `tpEst=1`, `nmEstado=Tocantins`, `telemetrica=1` e demais filtros vazios;
  depois `DadosHidrometeorologicos` por `codEstacao`.
- Parametros escapados por `urlencode`; User-Agent identificavel; sem retries.
- Janela solicitada: data UTC de hoje menos dois dias ate hoje, `dd/MM/yyyy`.
  Leituras com offset sao filtradas para as ultimas 48 horas, sem datas futuras.
- Maximo de tres requisicoes simultaneas, timeout de socket de 12 segundos,
  prazo compartilhado de 235 segundos para inventario e leituras. Workers daemon
  nao escrevem arquivos e nao impedem a saida se DNS/leitura permanecer bloqueada.
  Estacoes nao concluidas dentro do prazo recebem `error`, inclusive nao iniciadas.
- Reserva aproximada de cinco segundos para persistencia: limite operacional de
  cerca de quatro minutos. Filesystem travado nao tem garantia de tempo real;
  workflow possui limite externo de cinco minutos para a etapa.
- Maximo de 8 MiB por XML, 2.000 estacoes no inventario e 32 MiB no JSON.
  Inventario acima do limite e rejeitado, sem truncamento silencioso.
- Ate 192 pontos por estacao, ordenados do mais antigo ao mais recente.
  Antes do corte, duplicatas do mesmo instante e nivel ficam uma unica vez,
  preservando o primeiro `dateTime` original. Offsets equivalentes identificam
  o mesmo instante. Niveis conflitantes (inclusive null versus numero) removem
  todas as amostras daquele instante, independentemente da ordem. A mesma regra
  vale para historico em cache. Datas sem fuso sao comparadas apenas entre si,
  nunca equiparadas a UTC. Null nao conflitante permanece, inclusive como ultima
  leitura. Nao ha agregacao/interpolacao.

## Contrato e qualidade

Objeto raiz: `source: "ANA / Telemetria"`, `attemptedAt` ISO UTC, `status`
(`ok`, `partial`, `error`) e `stations`.

Cada estacao: `code`, `name`, `river`, `city`, `latitude`, `longitude`, `status`
(`ok`, `error`, `unknown`), `attemptedAt`, `readings` e `observation`.
Cada leitura: `level` numerico em cm, ou **null explicitamente fornecido pela ANA**
(`xsi:nil`), e `dateTime` ISO original. Zero e niveis negativos sao preservados:
valores negativos podem ser relativos ao datum da regua. Texto vazio, nivel ausente,
NaN, infinito e numeros invalidos sao rejeitados, nunca convertidos em zero.
Coordenadas devem ser finitas e estar em [-90, 90] / [-180, 180].

Datas sem fuso nao recebem `Z`, offset brasileiro ou conversao implicita. Sao
mantidas literalmente e tornam a estacao `unknown`. Nesse caso a janela so pode
ser filtrada por dia civil; a ordem usa horario de parede, sem afirmar equivalencia
com instantes UTC. Misturar datas com/sem fuso nao permite comparar instantes com
seguranca. O frontend deve validar timestamps, atualidade e calcular deltas.
`ok` confirma coleta valida, nao confirma nivel normal nem leitura em tempo real.
Ultimo nivel explicitamente nulo tambem resulta em `unknown`.

Falha de inventario (inclusive XML invalido/vazio) preserva as estacoes anteriores
com leituras anteriores, `status: error` e novo `attemptedAt`. Falha individual
preserva historico com `error`; resposta sem leituras validas preserva historico
com `unknown`. Estacoes desaparecidas do inventario permanecem como `error`.
Historico preservado pode estar fora da janela; observacao explicita que nao foi
confirmado como atual. `attemptedAt` nunca substitui o horario da medicao.

Raiz `ok`: todas as estacoes `ok`; `error`: nenhuma estacao ou todas `error`;
`partial`: demais combinacoes, inclusive todas `unknown`. Falhas de rede sao
persistidas e encerram normalmente para permitir o commit do estado de erro.
Cache local corrompido ou falha de escrita encerram com erro, sem substituir o
arquivo anterior. Gravacao compacta em temporario no mesmo diretorio, `fsync`
e `os.replace`; sem retries de escrita e com limpeza do temporario.

## Automacao e testes

O workflow horario executa monitoring, fire-history e entao river-summary;
inclui `data/river-summary.json` no `git add`. Etapas de deploy existentes ficam
inalteradas. Nao e necessario gerar o arquivo localmente para executar os testes:

```sh
python -B -m unittest discover -s tests -p test_river_collector.py -v
```

Fixtures XML inline, com namespaces, executam offline. Cobrem zero, negativos,
null explicito, datas ambiguas, janela/cap, falhas, deadline, concorrencia,
URLs escapadas e preservacao atomica. Nao consultam a frota real da ANA.
