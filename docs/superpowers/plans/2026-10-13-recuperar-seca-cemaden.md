# Recuperar seca municipal CEMADEN

**Objetivo:** restaurar o card e a camada de seca com o IIS-3 municipal publicado pelo próprio CEMADEN, preservando os componentes existentes.

**Arquitetura:** a planilha pública dos boletins mensais em gov.br substitui o metadado legado que retorna 404. Um coletor Python/openpyxl descobre a edição mais recente, valida a legenda e os códigos IBGE, produz o contrato `seca` existente e conserva a qualidade por fonte. Nenhuma consulta à API da nova plataforma, cuja redistribuição exige autorização; nenhuma alteração no S2ID ou nas demais fontes.

**Stack:** Python 3.12/openpyxl 3.1.5 no Actions; frontend React/Vite existente. Dados são mensais, não tempo real.

- [x] Escrever e executar testes de descoberta, legenda oficial, IBGE, ausência de dado, comparação mensal e conservação de erros.
- [x] Implementar `scripts/cemaden_drought.py` e `scripts/requirements-drought.txt`; rodar testes e coleta real em modo preview, sem sobrescrever JSON operacional local.
- [x] Remover consulta antiga de `scripts/update-monitoring.mjs`; adicionar passo de seca no workflow atual com dependência instalada previamente.
- [x] Ajustar referência/atualização no parser e completar a legenda existente com seca excepcional e tendência municipal.
- [x] Executar regressões, teste de navegador card/mapa/município/PDF/mobile e build/PWA.
- [ ] Publicar apenas código/bundles; executar Actions com dados oficiais; verificar resultado no site.

Validações: somente links oficiais HTTPS dentro da área CEMADEN; período do arquivo igual à edição descoberta; 139 códigos únicos e presentes na malha; categoria ausente não é Normal; legenda 1=Excepcional, 2=Extrema, 3=Severa, 4=Moderada, 5=Fraca, 6=Normal. Tendência compara apenas o mês anterior e categorias válidas. Falha preserva último produto, não renova sucesso e nunca publica dados de testes.
