const DATA_URL = "data/spain_boys_2014_results_master_merged_clean.csv";

/* ------------------ STYLES ------------------ */
const styles = `
<style>
:root{
  --bg:#f5f7fb;
  --card:#fff;
  --line:#e5e7eb;
  --text:#0f172a;
  --muted:#64748b;
  --blue:#2563eb;
}

body{
  margin:0;
  font-family:system-ui,-apple-system;
  background:var(--bg);
  color:var(--text);
}

.wrap{
  max-width:1200px;
  margin:0 auto;
  padding:16px;
}

h1{
  font-size:32px;
  margin-bottom:16px;
}

.card{
  background:var(--card);
  border:1px solid var(--line);
  border-radius:16px;
  padding:14px;
}

.meet{
  margin-bottom:12px;
}

.meet h3{
  margin:0 0 6px;
  font-size:16px;
}

.meta{
  font-size:13px;
  color:var(--muted);
}

.btn{
  margin-top:8px;
  display:inline-block;
  padding:8px 12px;
  background:var(--blue);
  color:white;
  border-radius:10px;
  font-size:13px;
}
</style>
`;

function injectStyles(){
  document.head.insertAdjacentHTML("beforeend", styles);
}

/* ------------------ CSV ------------------ */

function parseCsvLine(line){
  const out=[];
  let cur="", q=false;

  for(let i=0;i<line.length;i++){
    const ch=line[i];
    const nx=line[i+1];

    if(ch === '"'){
      if(q && nx === '"'){ cur += '"'; i++; }
      else q = !q;
    }
    else if(ch === ',' && !q){
      out.push(cur);
      cur="";
    } else cur += ch;
  }

  out.push(cur);
  return out;
}

function parseCsv(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(x=>x.trim());
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map(line=>{
    const vals = parseCsvLine(line);
    const obj = {};

    headers.forEach((h,i)=> obj[h]=vals[i]);

    return {
      meet: obj.Meet,
      venue: obj.Venue,
      province: obj.Province,
      date: obj.Date_ISO || obj.Date,
      event: obj.Event,
      swimmer: obj.Canonical_Swimmer,
      club: obj.Club,
      time: obj.Time
    };
  });
}

async function loadRows(){
  const text = await fetch(DATA_URL, {cache:"no-store"}).then(r=>r.text());
  return parseCsv(text);
}

/* ------------------ HELPERS ------------------ */

function normalize(s){
  return String(s||"")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g,'')
    .trim();
}

function canonicalEventKey(event){
  const e = normalize(event);

  if(e.includes("espalda") || e.includes("back")) return "back";
  if(e.includes("libre") || e.includes("free")) return "free";
  if(e.includes("braza") || e.includes("breast")) return "breast";
  if(e.includes("mariposa") || e.includes("fly")) return "fly";
  if(e.includes("medley") || e.includes("estilo")) return "medley";

  return e;
}

/* ------------------ GROUP MEETS ------------------ */

function groupMeets(rows){
  const map = new Map();

  rows.forEach(r=>{
    const key = `${r.date}|${normalize(r.meet)}|${normalize(r.venue)}`;

    if(!map.has(key)){
      map.set(key,{
        meet:r.meet,
        venue:r.venue,
        province:r.province,
        date:r.date,
        rows:[]
      });
    }

    map.get(key).rows.push(r);
  });

  return [...map.values()]
    .map(m=>({
      ...m,
      swimmers: new Set(m.rows.map(r=>r.swimmer)).size,
      events: new Set(m.rows.map(r=>canonicalEventKey(r.event))).size
    }))
    .sort((a,b)=> b.date.localeCompare(a.date));
}

/* ------------------ HOME ------------------ */

async function renderHome(){
  injectStyles();

  const rows = await loadRows();
  const meets = groupMeets(rows);

  const html = `
    <div class="wrap">
      <h1>Spain Swimming Results (Boys 2014)</h1>

      ${meets.map(m=>`
        <div class="card meet">
          <h3>${m.meet}</h3>
          <div class="meta">
            ${m.venue} • ${m.date}<br>
            ${m.events} events • ${m.swimmers} swimmers
          </div>
          <a class="btn" href="meet.html?meet=${encodeURIComponent(m.meet)}">
            View results →
          </a>
        </div>
      `).join("")}
    </div>
  `;

  document.body.innerHTML = html;
}

/* ------------------ ROUTER ------------------ */

if(location.pathname === "/" || location.pathname.includes("index")){
  renderHome();
}
