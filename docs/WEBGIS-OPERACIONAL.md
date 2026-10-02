# Painel geográfico operacional

## Arquitetura e preservação

React/Vite e React-Leaflet foram mantidos. O mapa principal continua oferecendo seca, chuva observada, previsão INMET, rios, SE/ECP, busca e legendas. As novas camadas são componentes adicionais; o boletim e a home não foram substituídos.

- `operationalMap.js`: cache de promessas, timeout, filtros temporais e espaciais, consulta meteorológica.
- `FireControls.jsx`: filtros de período, satélite e município, contagem deduplicada e opacidade.
- `BurnedAreaControls.jsx` e `MapBiomasFireOverlay.jsx`: consultas territoriais por mês/ano, raster e suporte opcional a GeoJSON oficial.
- `HydrologyPanel.jsx`: estação selecionada, histórico, comparação de aproximadamente 24h e gráfico.
- `WeatherLayers.jsx`: previsão, linha do tempo, consulta por coordenada e partículas de vento.
- `update-fire-history.py`: coleta dos CSVs diários do INPE e publicação de uma base de sete dias.

## Focos de calor

Fonte exclusiva: [INPE / dados abertos](https://terrabrasilis.dpi.inpe.br/queimadas/portal/pages/secao_downloads/dados-abertos/index.html).

O coletor usa `csv.DictReader`, filtra o Tocantins, valida coordenadas e horários UTC e remove duplicatas por coordenada, instante e satélite. São preservadas detecções de sensores distintos, sem afirmar que representam incêndios distintos. A interface aplica uma janela móvel de 24h, 48h ou 168h e o limite cartográfico do estado.

`data/fire-history.json` informa arquivos consultados, datas ausentes, erros, última tentativa e última consulta bem-sucedida. Ausência de arquivo não equivale a ausência de fogo. Arquivos diários têm defasagem e podem estar em formação. Os totais são descritos como detecções na base disponível, não cobertura exaustiva em tempo real. NASA FIRMS não foi mesclado à contagem; sua API requer MAP_KEY e teria de ser uma fonte alternativa explicitamente selecionada.

O workflow horário existente executa o coletor Python e publica o JSON. Para executar manualmente: `python scripts/update-fire-history.py`. Em desenvolvimento, copie o resultado para `frontend/public/data/fire-history.json`.

## Área queimada

Fonte: [API MapBiomas Monitor do Fogo](https://plataforma.monitorfogo.mapbiomas.org/api/docs/).

Os seletores consultam os anos e meses realmente disponíveis; depois consultam hectares e raster para estado ou município IBGE. O raster é carregado somente quando solicitado, com transparência. URLs Earth Engine podem expirar; aplicar novamente o período solicita uma URL recente após o cache de cinco minutos.

A API consultada entrega raster, não polígonos de cada cicatriz. Portanto, não há seleção de cicatriz individual nem área individual derivada de focos. Para uma base vetorial oficial futura, fornecer `burnedArea.geoJsonUrl` contendo FeatureCollection Polygon/MultiPolygon; propriedades `municipio`, `periodo`, `area_ha`. O componente já realiza realce, popup seguro e enquadramento do polígono. Não cadastrar geometrias sintetizadas de focos de calor. O filtro de município atual consulta o recorte territorial do raster.

## Hidrologia

Fonte: ANA Telemetria, serviços HidroInventario e DadosHidrometeorologicos.

Leituras vazias permanecem nulas, a série é ordenada cronologicamente e contém cota em centímetros. Consultas de 1, 7 e 30 dias têm timeout de 12s e cache de cinco minutos. A comparação 24h exige leitura próxima do instante de referência, com tolerância de uma hora; caso contrário fica indisponível. Última leitura com mais de 24h é sinalizada como desatualizada.

Seta vermelha = subida; verde = descida; horizontal = estabilidade. Isso não constitui classificação de inundação. Linhas de referência dependem de `station.thresholds`, com `official: true`, `unit: "cm"`, `value` numérico e `label`. Atualmente não se pressupõem limites oficiais por estação. A consulta é sob demanda para evitar centenas de chamadas simultâneas. Indisponibilidade/CORS na ANA é mostrada ao usuário, sem gerar séries fictícias.

## Meteorologia e licenciamento

- [Open-Meteo](https://open-meteo.com/en/docs): previsão horária por coordenadas, temperatura, precipitação, nebulosidade, vento e rajadas; atribuição CC BY 4.0.
- [Termos](https://open-meteo.com/en/terms): uso gratuito não comercial, menos de 10 mil chamadas/dia, 5 mil/hora e 600/minuto. Verificar o enquadramento se houver publicidade, contratação comercial ou crescimento de tráfego. Consultas com múltiplas coordenadas também consomem capacidade do provedor.
- [Windy Map Forecast](https://api.windy.com/map-forecast/pricing): plano gratuito apenas para desenvolvimento. Não foi usado em produção nem incluída chave privada.

A grade amostrada tem 30 coordenadas, espaçamento de 1,5 grau de latitude e 1 grau de longitude. Os pontos e partículas são uma visualização aproximada dos modelos; não equivalem à resolução nativa de um produto Windy nem a medições locais. As partículas usam a direção meteorológica de origem e velocidade visual proporcional limitada. Não usar sua trajetória para estimar propagação real. O clique no estado consulta coordenadas específicas. Previsões usam UTC internamente e exibição local. Cache de uma hora e carregamento explícito evitam consultas na abertura da home.

Animação respeita preferência de movimento reduzido e pausa quando a aba fica oculta. Camadas de pontos são combináveis, com popup e legenda. Imagem de satélite usa NASA GIBS/MODIS do dia anterior, como apoio visual, sem garantia de ausência de nuvens. Não é imagem em tempo real.

## Segurança e implantação

Nenhuma credencial foi adicionada ao frontend. Fontes com autenticação devem ser consultadas em GitHub Actions com Secrets, publicando somente os dados autorizados; alternativamente usar serviço intermediário com cache e limites de acesso. GitHub Pages não protege segredos em JavaScript nem resolve CORS por si só.

As atualizações de código mantêm o fluxo Vite build e publicação de assets. Não substituir `dados-monitoramento.json` remoto por cópias antigas locais durante o deploy. A verificação deve incluir falhas de API, ausência de leituras, controles no celular, ausência de duplicatas e datas UTC.
