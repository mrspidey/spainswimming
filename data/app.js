
const DATA_URL = "data/spain_boys_2014_results_master.csv";
const JACK_BASELINES = [
  { key: "50 back", label: "50m Backstroke", time: "00:33.04", source: "Bulgarian 11-12 Championship" },
  { key: "100 back", label: "100m Backstroke", time: "01:12.42", source: "Bulgarian 11-12 Championship" },
  { key: "200 back", label: "200m Backstroke", time: "02:34.85", source: "Bulgarian 11-12 Championship" },
  { key: "50 fly", label: "50m Butterfly", time: "00:34.19", source: "Bulgarian 11-12 Championship" },
  { key: "100 free", label: "100m Freestyle", time: "01:07.39", source: "Bulgarian 11-12 Championship" },
  { key: "200 free", label: "200m Freestyle", time: "02:33.13", source: "World School Swim Championship" }
];

const styles = `
<style>
:root{--bg:#f5f7fb;--card:#fff;--line:#e5e7eb;--text:#0f172a;--muted:#64748b;--blue:#2563eb;--green:#16a34a;--red:#dc2626}
*{box-sizing:border-box} body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text)}
a{color:var(--blue);text-decoration:none}
.wrap{max-width:1280px;margin:0 auto;padding:12px}
h1{margin:0 0 14px;font-size:clamp(28px,5vw,56px);line-height:1.05}
h2{margin:0 0 12px;font-size:18px} h3{margin:0 0 8px;font-size:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:0 1px 2px rgba(0,0,0,.04)} .panel{padding:14px}
.stack{display:grid;gap:12px} .grid{display:grid;gap:14px} .grid.sidebar{grid-template-columns:320px 1fr}
input,select,button{width:100%;padding:12px 14px;border-radius:14px;border:1px solid #cbd5e1;background:#fff;font:inherit;color:inherit}
button{background:var(--blue);color:#fff;border:none;font-weight:700;cursor:pointer}
.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#f1f5f9;font-size:12px;margin-right:6px;margin-bottom:6px}
.muted{color:var(--muted);font-size:14px}.small{font-size:12px;color:var(--muted)} .empty{padding:18px;color:var(--muted)}
.tableWrap{overflow:auto;border:1px solid var(--line);border-radius:16px;-webkit-overflow-scrolling:touch} table{width:100%;min-width:760px;border-collapse:collapse;background:#fff}
th,td{padding:11px 9px;border-bottom:1px solid #eef2f7;text-align:left;vertical-align:top} th{background:#f8fafc;font-size:14px} td{font-size:14px}
.rank{font-weight:700}.nav{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.nav a{padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:#fff;color:var(--text);font-weight:700}
.nav a.active{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.listCard{padding:14px;border:1px solid var(--line);border-radius:16px;background:#fff}
.hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.kpiGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.kpi{padding:14px;border:1px solid var(--line);border-radius:16px;background:#fff}.kpi .label{font-size:12px;color:var(--muted);margin-bottom:6px}.kpi .value{font-size:24px;font-weight:700}
.good{color:var(--green);font-weight:700}.bad{color:var(--red);font-weight:700}
@media (max-width:900px){.grid.sidebar,.kpiGrid{grid-template-columns:1fr}.wrap{padding:10px}h1{font-size:26px}}
@media (max-width:640px){table{min-width:0}.tableWrap{border:none;overflow:visible}table,thead,tbody,tr,td,th{display:block}thead{display:none}tr{border:1px solid var(--line);border-radius:16px;margin-bottom:10px;background:#fff;overflow:hidden}td{border-bottom:1px solid #eef2f7;padding:10px 12px}td:last-child{border-bottom:none}td::before{content:attr(data-label);display:block;font-size:12px;color:var(--muted);margin-bottom:4px}}
</style>`;

function injectStyles(){ document.head.insertAdjacentHTML('beforeend', styles); }
function getParam(name){ return new URLSearchParams(location.search).get(name) || ""; }
function parseCsvLine(line){
  const out=[]; let cur="", q=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i], nx=line[i+1];
    if(ch === '"'){ if(q && nx === '"'){ cur += '"'; i++; } else q = !q; }
    else if(ch === ',' && !q){ out.push(cur); cur=""; }
    else cur += ch;
  }
  out.push(cur); return out;
}
function pick(obj, keys){ for(const k of keys){ if(obj[k] !== undefined && String(obj[k]).trim() !== "") return String(obj[k]).trim(); } return ""; }
function parseCsv(text){
  const clean = text.replace(/^\uFEFF/,'').replace(/\r/g,'');
  const lines = clean.split('\n').filter(x => x.trim() !== '');
  if(!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const obj = {};
    headers.forEach((h,i)=> obj[h] = (vals[i] ?? '').trim());
    const event = pick(obj, ["Event","event"]);
    const stroke = pick(obj, ["Stroke","stroke"]);
    const canonical = pick(obj, ["Canonical_Swimmer","Canonical","canonical_swimmer"]);
    const swimmerRaw = pick(obj, ["Swimmer_Raw","Swimmer","swimmer_raw"]);
    const club = pick(obj, ["Club","club"]);
    const meet = pick(obj, ["Meet","meet"]);
    const venue = pick(obj, ["Venue","venue"]);
    const province = pick(obj, ["Province","province"]);
    const region = pick(obj, ["Region","region"]);
    const season = pick(obj, ["Season","season"]);
    const dateIso = pick(obj, ["Date_ISO","date_iso"]);
    const date = pick(obj, ["Date","date"]) || dateIso;
    const time = pick(obj, ["Time","time"]);
    const rank = Number(pick(obj, ["Rank","rank"]) || 0);
    const distance = Number(pick(obj, ["Distance_m","Distance","distance_m","distance"]) || (event.match(/\d+/)?.[0] || 0));
    return {season,province,region,meet,venue,event,stroke,distance,date,dateIso,swimmer_raw:swimmerRaw,canonical_swimmer:canonical || swimmerRaw,club,time,rank,timeSeconds:timeToSeconds(time)};
  }).filter(r => r.event && r.canonical_swimmer && r.club && r.time);
}
async function loadRows(){ const text = await fetch(DATA_URL, {cache:'no-store'}).then(r=>r.text()); return parseCsv(text); }
function timeToSeconds(t){ if(!t) return Infinity; const p=String(t).trim().split(':'); if(p.length===2) return Number(p[0])*60+Number(p[1]); if(p.length===3) return Number(p[0])*3600+Number(p[1])*60+Number(p[2]); return Number(t); }
function secondsToDelta(secs){ if(!isFinite(secs)) return ''; const sign=secs>0?'+':secs<0?'-':'±'; const val=Math.abs(secs); const mins=Math.floor(val/60); const rem=(val-mins*60).toFixed(2).padStart(5,'0'); return mins?`${sign}${mins}:${rem}`:`${sign}${rem}`; }
function normalize(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function uniqueSorted(items){ return [...new Set(items.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')); }
function eventSort(a,b,rows){ return ((rows.find(r=>r.event===a)?.distance||0)-(rows.find(r=>r.event===b)?.distance||0)) || a.localeCompare(b,'es'); }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function displaySwimmerName(name){ if(!name) return ''; if(name.includes(',')){ const p=name.split(','); return `${p[1].trim()} ${p[0].trim()}`.replace(/\s+/g,' '); } return name; }
function isJackName(name){ const n=normalize(name); return n.includes('jack') && n.includes('simeonov'); }
function canonicalEventKey(event){
  const e=normalize(event), d=(e.match(/\d+/)||[''])[0];
  if(e.includes('espalda')||e.includes('back')) return `${d} back`;
  if(e.includes('libre')||e.includes('free')) return `${d} free`;
  if(e.includes('mariposa')||e.includes('fly')) return `${d} fly`;
  if(e.includes('braza')||e.includes('breast')) return `${d} breast`;
  if(e.includes('estilo')||e.includes('medley')||e.includes('im')) return `${d} im`;
  return `${d} ${e}`.trim();
}
function meetId(row){ return normalize([row.meet,row.venue,row.dateIso||row.date].join('|')).replace(/ /g,'-'); }
function eventId(row){ return normalize([row.meet,row.venue,row.dateIso||row.date,row.event].join('|')).replace(/ /g,'-'); }
function groupMeets(rows){
  const map = new Map();
  rows.forEach(r=>{
    const id=meetId(r);
    if(!map.has(id)) map.set(id,{id,meet:r.meet,venue:r.venue,province:r.province,region:r.region,date:r.date,dateIso:r.dateIso||r.date,season:r.season,rows:[]});
    map.get(id).rows.push(r);
  });
  return [...map.values()].map(m=>({...m,eventCount:uniqueSorted(m.rows.map(r=>r.event)).length,swimmerCount:uniqueSorted(m.rows.map(r=>r.canonical_swimmer)).length,complete:true})).sort((a,b)=>String(b.dateIso).localeCompare(String(a.dateIso))||a.meet.localeCompare(b.meet,'es'));
}
function strokeEnglish(strokeOrEvent){
  const s = String(strokeOrEvent || '');
  const n = normalize(s);

  if(n.includes('espalda') || n.includes('back')) return 'Backstroke';
  if(n.includes('libre') || n.includes('free')) return 'Freestyle';
  if(n.includes('mariposa') || n.includes('fly')) return 'Butterfly';
  if(n.includes('braza') || n.includes('breast')) return 'Breaststroke';
  if(n.includes('estilos') || n.includes('estilo') || n.includes('medley') || n.includes('im')) return 'Medley';

  return '';
}

function eventDisplay(event){
  const en = strokeEnglish(event);
  return en ? `${event} / ${en}` : event;
}

function buildAutocompleteOptions(rows){
  const swimmers = uniqueSorted(rows.map(r => displaySwimmerName(r.canonical_swimmer)));
  const clubs = uniqueSorted(rows.map(r => r.club));
  return uniqueSorted([...swimmers, ...clubs]);
}

function mountAutocomplete(datalistId, inputId, rows){
  let datalist = document.getElementById(datalistId);

  if(!datalist){
    datalist = document.createElement('datalist');
    datalist.id = datalistId;
    document.body.appendChild(datalist);
  }

  const input = document.getElementById(inputId);
  if(input) input.setAttribute('list', datalistId);

  datalist.innerHTML = buildAutocompleteOptions(rows)
    .map(v => `<option value="${escapeHtml(v)}"></option>`)
    .join('');
}
