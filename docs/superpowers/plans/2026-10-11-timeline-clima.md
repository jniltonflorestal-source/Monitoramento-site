# Evolucao temporal de chuva e clima

Objetivo: aprimorar a timeline meteorologica existente, reutilizando controles 4E. Sem nova fonte, radar ou interpolacao de chuva observada.

- [x] Testes: alinhar por timestamp, zero/ausencia, horas futuras, cobertura parcial.
- [x] Controles anterior/proximo/play/pause, fim e aba oculta; mapa sincronizado.
- [x] Timeout de previsao INMET e remover falsos limiares numericos derivados de texto.
- [x] Testes de navegador, regressoes, mobile, build/PWA.
- [ ] Documentar, publicar e verificar.

Arquitetura: weatherTimeline.js prepara quadros da grade Open-Meteo/GFS pelo horario real, dentro de 72h. WeatherLayers usa as linhas do quadro, nao indices independentes. TimelineControl recebe playback controlado e indice inicial sem alterar fogo/rios. INMET 24h/48h permanece produto textual; chuva observada 24h continua sem animacao por falta de serie historica completa.
