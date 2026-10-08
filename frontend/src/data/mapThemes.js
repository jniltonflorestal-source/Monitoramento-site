export const mapThemes = [
  { id:'overview', label:'Visão geral', anchor:'visao-geral-mapa' },
  { id:'state', label:'Situação Estadual', anchor:'situacao-estadual' },
  { id:'rivers', label:'Rios', anchor:'rios' },
  { id:'rain', label:'Chuva', title:'Chuva observada, previsão e clima', anchor:'chuva' },
  { id:'fire', label:'Fogo', title:'Focos de calor e áreas queimadas', anchor:'fogo' },
  { id:'drought', label:'Seca', anchor:'seca' },
  { id:'alerts', label:'Alertas', title:'Avisos oficiais e abrangência informada', anchor:'avisos-mapa' },
  { id:'emergency', label:'SE/ECP', title:'Situação de Emergência / Estado de Calamidade Pública', anchor:'emergencia-calamidade' }
];
export const mapAnchors = { ...Object.fromEntries(mapThemes.map(theme=>[theme.id,theme.anchor])), burned:'area-queimada' };
export const themeByHash = Object.fromEntries(Object.entries(mapAnchors).map(([theme,anchor])=>[`#${anchor}`,theme]));

// Hash links remain shareable; this event also handles a repeated click on the
// same card after the user changed themes without leaving the map.
export function activateMapLink(event, href) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const theme = themeByHash[href];
  if (!theme && href !== '#qualidade-dados') return;
  event.preventDefault();
  if (window.location.hash !== href) window.history.pushState(null, '', href);
  if (theme) window.dispatchEvent(new CustomEvent('monitoring:theme', {detail:{theme,scroll:true}}));
  else {
    const section = document.getElementById('qualidade-dados');
    const details = section?.querySelector('details');
    if (details) details.open = true;
    section?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    section?.querySelector('summary')?.focus({preventScroll:true});
  }
}
