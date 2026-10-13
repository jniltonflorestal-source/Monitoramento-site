export function officialMunicipalityCodes(value,allowed=null) {
  const tokens=Array.isArray(value)?value:typeof value==='string'?value.split(','):[];
  const codes=new Set();let complete=tokens.length>0;
  for(const item of tokens){
    const code=String(item).trim();
    if(!/^[1-5]\d{6}$/.test(code)){complete=false;continue;}
    if(!code.startsWith('17'))continue;
    if(allowed&&!allowed.has(code)){complete=false;continue;}
    codes.add(code);
  }
  return {codes:[...codes],complete:complete&&codes.size>0};
}
