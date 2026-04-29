const DATA_URL = "/data/spain_boys_2014_results_master_merged_clean.csv";

const STYLE = `
<style>
:root{--bg:#f7fbff;--card:#fff;--line:#d9e9f7;--text:#0f172a;--muted:#52657a;--blue:#0ea5e9;--blue2:#0284c7;--soft:#e0f2fe}
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:linear-gradient(#f8fcff,#f4f8fc);color:var(--text)}
a{color:var(--blue2);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1280px;margin:0 auto;padding:18px}.nav{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.nav a{padding:10px 14px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--text);font-weight:800}.nav a.active{background:var(--soft);color:#075985}
h1{font-size:clamp(34px,5vw,58px);line-height:1.03;margin:0}h2{margin:0 0 12px;font-size:20px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}.panel{padding:14px}.stack{display:grid;gap:12px}.grid{display:grid;gap:14px}
.hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;min-width:520px}
.kpi{border:1px solid var(--line);border-radius:16px;padding:14px;background:#fff}.kpi .label{font-size:12px;color:var(--muted)}.kpi .value{font-size:25px;font-weight:900;margin-top:6px}
input,select,button{width:100%;padding:12px 14px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;font:inherit;color:var(--text)}
button,.btn{display:inline-flex;justify-content:center;align-items:center;width:auto;min-width:130px;padding:12px 18px;border-radius:14px;background:var(--blue);color:#fff!important;border:0;font-weight:900;text-decoration:none!important;cursor:pointer}
.btn.secondary{background:#fff;color:var(--text)!important;border:1px solid var(--line)}
.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:var(--soft);border:1px solid #b8def8;color:#075985;font-size:12px;font-weight:900;margin:4px 6px 4px 0}
.muted{color:var(--muted)}.small{font-size:12px;color:var(--muted)}.filters{display:grid;grid-template-columns:1fr 220px 220px 220px;gap:10px}
.sidebar{grid-template-columns:260px 1fr}.sideControls{display:grid;gap:10px;align-content:start}
.listCard{padding:14px;border:1px solid var(--line);border-radius:16px;background:#fff}
.tableWrap{overflow:auto;border:1px solid var(--line);border-radius:16px;background:#fff}table{width:100%;border-collapse:collapse;min-width:860px}th,td{padding:11px 9px;border-bottom:1px solid #eef2f7;text-align:left;vertical-align:top;font-size:14px}th{background:#f8fbfe;font-weight:900}
.eventCard{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff}.eventHead{display:flex;justify-content:space-between;gap:12px;padding:14px 16px;background:#f5fbff;border-bottom:1px solid #eef2f7}
.eventTitle{font-weight:900;font-size:18px}.top3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px}.podium{border:1px solid var(--line);border-radius:14px;padding:12px}.gold{background:#fff7da;border-color:#edd98b}.silver{background:#f3f5f7}.bronze{background:#fff1e7;border-color:#e6bf9d}
.medal{font-weight:900;font-size:18px}.good{color:#16a34a;font-weight:900}.bad{color:#dc2626;font-weight:900}
@media(max-width:900px){.hero,.sidebar{display:block}.kpis,.filters{grid-template-columns:1fr;min-width:0;margin-top:12px}.top3{grid-template-columns:1fr}.wrap{padding:10px}}
</style>`;

const JACK_BASELINES = [
  ["50m Backstroke","00:33.04","Bulgarian 11-12 Championship"],
  ["100m Backstroke","01:12.42","Bulgarian 11-12 Championship"],
  ["200m Backstroke","02:34.85","Bulgarian 11-12 Championship"],
  ["50m Butterfly","00:34.19","Bulgarian 11-12 Championship"],
  ["100m Freestyle","01:07.39","Bulgarian 11-12 Championship"],
  ["200m Freestyle","02:33.13","World School Swim Championship"]
];

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function titlePart(s){return s? s[0].toUpperCase()+s.slice(1).toLowerCase():""}
function displayName(n){let s=String(n||"").trim();if(s.includes(",")){let p=s.split(",");s=(p.slice(1).join(" ")+" "+p[0]).trim()}return s.split(/\s+/).map(titlePart).join(" ")}
function keyName(n){return norm(displayName(n))}
function csvLine(line){let a=[],c="",q=false;for(let i=0;i<line.length;i++){let ch=line[i],nx=line[i+1];if(ch=='"'){if(q&&nx=='"'){c+='"';i++}else q=!q}else if(ch==","&&!q){a.push(c);c=""}else c+=ch}a.push(c);return a}
function parseDate(s){s=String(s||"").trim();let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;return s}
function dateDisp(s){let iso=parseDate(s);let m=iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:s}
function timeFmt(t){let s=String(t||"").trim();if(/^\d+\.\d+$/.test(s))return "00:"+s.padStart(5,"0");if(/^\d+:\d+\.\d+$/.test(s)){let [m,r]=s.split(":");return m.padStart(2,"0")+":"+r}return s}
function secs(t){let s=timeFmt(t).split(":").map(Number);if(s.length===2)return s[0]*60+s[1];if(s.length===3)return s[0]*3600+s[1]*60+s[2];return Number(t)||Infinity}
function eventKey(e){let s=norm(e);let d=(s.match(/\b(25|50|100|200|400|800|1500)\b/)||[""])[0];let st="";if(/\b(backstroke|back|espalda)\b/.test(s))st="Backstroke";else if(/\b(freestyle|free|libre)\b/.test(s))st="Freestyle";else if(/\b(butterfly|fly|mariposa)\b/.test(s))st="Butterfly";else if(/\b(breaststroke|breast|braza)\b/.test(s))st="Breaststroke";else if(/\b(medley|estilos|im)\b/.test(s))st="Medley";return d&&st?`${d}m ${st}`:""}
function slug(s){return norm(s).replaceAll(" ","-")}
function uniq(a){return [...new Set(a.filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y),"es"))}
function genderLabel(g){return g==="M"?"Male":g==="F"?"Female":"Unknown"}
function genderClass(g){return g==="M"?"Boys":g==="F"?"Girls":"Unknown"}
function compType(m){let s=norm(m);if(s.includes("liga")||s.includes("jornada"))return "Liga";if(s.includes("control"))return "Control";if(s.includes("trofeo")||s.includes("campeonato"))return "Meet/Trophy";return "Other"}
function cleanMeet(m,venue){
  let s=String(m||"").replace(/FICHA TÉCNICA DE LA COMPETICIÓN/gi,"").trim();
  if(!s||norm(s).startsWith("clasificacion")||/^\(?\d+\)?$/.test(s)) return venue?`FNCV Meet ${venue}`:"FNCV Meet";
  return s.replace(/\s+/g," ").trim();
}
function parseCSV(txt){
  let lines=txt.replace(/^\uFEFF/,"").replace(/\r/g,"").split("\n").filter(Boolean);
  let h=csvLine(lines.shift()).map(x=>x.trim());
  return lines.map(l=>{let v=csvLine(l),o={};h.forEach((k,i)=>o[k]=v[i]??"");
    let event=eventKey(o.Event);
    return {
      swimmerRaw:o.Swimmer, swimmer:displayName(o.Swimmer), swimmerKey:keyName(o.Swimmer),
      event, date:dateDisp(o.Date), iso:parseDate(o.Date), time:timeFmt(o.Time), seconds:Number(o.Seconds)||secs(o.Time),
      club:o.Club, rank:Number(o.Rank)||"", meet:cleanMeet(o.Meet,o.Venue), venue:o.Venue, province:String(o.Province||"").toLowerCase(),
      source:o.Source, distance:Number(o.Distance)||Number((event.match(/\d+/)||[0])[0]),
      gender:String(o.Gender||"").trim().toUpperCase(), birthYear:2014, comp:o.Competition_Type||compType(o.Meet),
      pRank:Number(o.Provincial_Rank)||"", nRank:Number(o.National_Rank)||""
    }
  }).filter(r=>r.swimmer&&r.event&&r.time&&r.club&&r.gender);
}
async function load(){return parseCSV(await fetch(DATA_URL,{cache:"no-store"}).then(r=>r.text()))}
function layout(active,content){document.head.insertAdjacentHTML("beforeend",STYLE);document.body.innerHTML=`<div class="wrap"><div class="nav"><a class="${active==="home"?"active":""}" href="/">Home</a><a class="${active==="search"?"active":""}" href="/search">Search</a><a class="${active==="clubs"?"active":""}" href="/clubs">Clubs</a></div>${content}</div>`}
function meetId(r){return slug([r.meet,r.venue,r.iso].join(" "))}
function eventId(r){return slug([r.meet,r.venue,r.iso,r.gender,r.event].join(" "))}
function groupMeets(rows){let m=new Map();rows.forEach(r=>{let id=meetId(r);if(!m.has(id))m.set(id,{id,meet:r.meet,venue:r.venue,province:r.province,date:r.date,iso:r.iso,rows:[]});m.get(id).rows.push(r)});return [...m.values()].sort((a,b)=>String(b.iso).localeCompare(String(a.iso)))}
function table(headers,rows){return `<div class="tableWrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`}
function bestBySwimmer(rows){let m=new Map();rows.forEach(r=>{let k=r.swimmerKey; if(!m.has(k)||r.seconds<m.get(k).seconds)m.set(k,r)});return [...m.values()].sort((a,b)=>a.seconds-b.seconds)}
function rankRows(all,event,gender,province=""){let rs=all.filter(r=>r.event===event&&r.gender===gender&&(!province||r.province===province));return bestBySwimmer(rs).map((r,i)=>({...r,calcRank:i+1}))}
function rankUrl(r){return `/search?mode=rankings&event=${encodeURIComponent(r.event)}&gender=${encodeURIComponent(r.gender)}&province=${encodeURIComponent(r.province||"")}`}

async function home(){
  let rows=await load(), meets=groupMeets(rows);
  let q="", prov="";
  layout("home",`
  <div class="card panel hero"><div><h1>Spain Swimming Results</h1><p class="muted">2014 swimmers with gender-aware rankings.</p></div><div class="kpis"><div class="kpi"><div class="label">Completed meets</div><div class="value">${meets.length}</div></div><div class="kpi"><div class="label">Athletes</div><div class="value">${uniq(rows.map(r=>r.swimmerKey)).length}</div></div><div class="kpi"><div class="label">Swims</div><div class="value">${rows.length}</div></div></div></div>
  <div class="card panel" style="margin-top:14px"><div class="filters"><input id="q" placeholder="Search meet or venue"><select id="prov"><option value="">All provinces</option>${uniq(rows.map(r=>r.province)).map(p=>`<option>${p}</option>`).join("")}</select></div></div>
  <div class="card panel stack" style="margin-top:14px"><h2>Latest completed meets <span class="small">${meets.length} meets</span></h2><div id="meetList"></div></div>`);
  function draw(){q=norm(document.getElementById("q").value);prov=document.getElementById("prov").value;let list=meets.filter(m=>(!prov||m.province===prov)&&(!q||norm(`${m.meet} ${m.venue}`).includes(q))).slice(0,80);
    document.getElementById("meetList").innerHTML=list.map(m=>`<div class="listCard"><h2>${esc(m.meet)}</h2><p class="muted">${esc(m.venue)} · ${esc(m.date)}</p><span class="badge">${esc(m.province)}</span><span class="badge">${uniq(m.rows.map(r=>r.event)).length} events</span><span class="badge">${uniq(m.rows.map(r=>r.swimmerKey)).length} swimmers</span><p><a class="btn" href="/meet?id=${m.id}">View results</a></p></div>`).join("")||`<p class="muted">No meets found.</p>`}
  document.getElementById("q").oninput=draw;document.getElementById("prov").onchange=draw;draw();
}

async function meetPage(){
  let rows=await load(), id=new URLSearchParams(location.search).get("id"), m=groupMeets(rows).find(x=>x.id===id);
  if(!m){layout("home",`<p>Meet not found.</p>`);return}
  let groups=new Map();m.rows.forEach(r=>{let k=`${r.gender}|${r.event}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)});
  layout("",`<p><a class="btn secondary" href="/">← Back to latest meets</a></p><div class="card panel hero"><div><h1>${esc(m.meet)}</h1><p class="muted">${esc(m.venue)} · ${esc(m.date)} · ${esc(m.province)}</p></div><div class="kpis"><div class="kpi"><div class="label">Events</div><div class="value">${groups.size}</div></div><div class="kpi"><div class="label">Swimmers</div><div class="value">${uniq(m.rows.map(r=>r.swimmerKey)).length}</div></div><div class="kpi"><div class="label">Results</div><div class="value">${m.rows.length}</div></div></div></div><div class="stack" style="margin-top:14px">${[...groups.entries()].map(([k,rs])=>{rs.sort((a,b)=>(a.rank||99)-(b.rank||99)||a.seconds-b.seconds);let r0=rs[0],top=rs.slice(0,3);return `<div class="eventCard"><div class="eventHead"><div><div class="eventTitle">${esc(r0.event)} · ${genderClass(r0.gender)} · Born ${r0.birthYear}</div><div class="small">${rs.length} results</div></div><a class="btn" href="/event?id=${eventId(r0)}">Open event</a></div><div class="top3">${top.map((r,i)=>`<div class="podium ${i==0?"gold":i==1?"silver":"bronze"}"><div class="small">${r.rank||i+1} PLACE</div><b><a href="/swimmer?name=${encodeURIComponent(r.swimmer)}">${esc(r.swimmer)}</a></b><div class="small">${esc(r.club)}</div><div class="medal">${esc(r.time)}</div></div>`).join("")}</div>${table(["Place","Swimmer","Club","Gender","Birth year","Time"],rs.map(r=>`<tr><td>${r.rank}</td><td><a href="/swimmer?name=${encodeURIComponent(r.swimmer)}">${esc(r.swimmer)}</a></td><td>${esc(r.club)}</td><td>${genderLabel(r.gender)}</td><td>${r.birthYear}</td><td>${r.time}</td></tr>`))}</div>`}).join("")}</div>`);
}

async function eventPage(){
  let rows=await load(), id=new URLSearchParams(location.search).get("id"), all=rows.filter(r=>eventId(r)===id), r0=all[0];
  if(!r0){layout("",`<p>Event not found.</p>`);return}
  all.sort((a,b)=>(a.rank||99)-(b.rank||99)||a.seconds-b.seconds);
  layout("",`<p><a class="btn secondary" href="/meet?id=${meetId(r0)}">← Back to meet</a></p><div class="card panel"><h1>${esc(r0.event)}</h1><p class="muted">${genderClass(r0.gender)} · Born ${r0.birthYear} · ${esc(r0.meet)} · ${esc(r0.venue)} · ${esc(r0.date)}</p><p><a class="btn" href="${rankUrl(r0)}">Open full ranking</a></p></div><div style="margin-top:14px">${table(["Place","Swimmer","Club","Gender","Birth year","Time"],all.map(r=>`<tr><td>${r.rank}</td><td><a href="/swimmer?name=${encodeURIComponent(r.swimmer)}">${esc(r.swimmer)}</a></td><td>${esc(r.club)}</td><td>${genderLabel(r.gender)}</td><td>${r.birthYear}</td><td>${r.time}</td></tr>`))}</div>`);
}

async function searchPage(){
  let rows=await load(), p=new URLSearchParams(location.search);
  let mode=p.get("mode")||"rankings", q=p.get("q")||"", ev=p.get("event")||"", gender=p.get("gender")||"M", prov=p.get("province")||"";
  let events=uniq(rows.map(r=>r.event)), provinces=uniq(rows.map(r=>r.province));
  layout("search",`<h1>Search results</h1><p class="muted">Filter by swimmer, club, province, gender, stroke, or event.</p><div class="grid sidebar"><div class="card panel sideControls"><a class="btn secondary" href="/search?mode=all">All results</a><a class="btn secondary" href="/search?mode=rankings">Rankings</a><input id="q" placeholder="Search swimmer or club" value="${esc(q)}"><select id="gender"><option value="">All genders</option><option value="M"${gender==="M"?" selected":""}>Boys / Male</option><option value="F"${gender==="F"?" selected":""}>Girls / Female</option></select><select id="province"><option value="">All provinces</option>${provinces.map(x=>`<option ${x===prov?"selected":""}>${x}</option>`).join("")}</select><select id="event"><option value="">All events</option>${events.map(x=>`<option ${x===ev?"selected":""}>${x}</option>`).join("")}</select><button id="clear">Clear filters</button></div><div class="card panel"><h2 id="title"></h2><div id="results"></div></div></div>`);
  function draw(){q=document.getElementById("q").value;gender=document.getElementById("gender").value;prov=document.getElementById("province").value;ev=document.getElementById("event").value;
    let filtered=rows.filter(r=>(!gender||r.gender===gender)&&(!prov||r.province===prov)&&(!ev||r.event===ev)&&(!q||norm(`${r.swimmer} ${r.club}`).includes(norm(q))));
    if(mode==="all"){document.getElementById("title").textContent=`All results (${filtered.length})`;document.getElementById("results").innerHTML=table(["Swimmer","Club","Event","Gender","Birth year","Time","Meet","Date"],filtered.slice(0,500).map(r=>`<tr><td><a href="/swimmer?name=${encodeURIComponent(r.swimmer)}">${esc(r.swimmer)}</a></td><td>${esc(r.club)}</td><td>${esc(r.event)}</td><td>${genderLabel(r.gender)}</td><td>${r.birthYear}</td><td>${r.time}</td><td>${esc(r.meet)}</td><td>${r.date}</td></tr>`));}
    else{let ranked=bestBySwimmer(filtered).map((r,i)=>({...r,calcRank:i+1}));document.getElementById("title").textContent=`Rankings (${ranked.length})`;document.getElementById("results").innerHTML=table(["Rank","Swimmer","Club","Event","Gender","Birth year","Time","Meet","Date"],ranked.slice(0,500).map(r=>`<tr><td>${r.calcRank}</td><td><a href="/swimmer?name=${encodeURIComponent(r.swimmer)}">${esc(r.swimmer)}</a></td><td>${esc(r.club)}</td><td>${esc(r.event)}</td><td>${genderLabel(r.gender)}</td><td>${r.birthYear}</td><td>${r.time}</td><td>${esc(r.meet)}<div class="small">${esc(r.venue)}</div></td><td>${r.date}</td></tr>`));}}
  ["q","gender","province","event"].forEach(id=>document.getElementById(id).oninput=draw);document.getElementById("clear").onclick=()=>location.href="/search?mode="+mode;draw();
}

async function swimmerPage(){
  let rows=await load(), name=new URLSearchParams(location.search).get("name")||"", k=keyName(name), rs=rows.filter(r=>r.swimmerKey===k);
  if(!rs.length){layout("",`<p>Swimmer not found.</p>`);return}
  let s=rs[0], best=bestBySwimmer(rs.map(r=>r)).sort((a,b)=>a.event.localeCompare(b.event)), events=uniq(rs.map(r=>r.event));
  layout("",`<p><a class="btn secondary" href="javascript:history.back()">← Back</a></p><div class="card panel hero"><div><h1>${esc(s.swimmer)}</h1><p class="muted">${esc(s.club)}<br>${genderLabel(s.gender)} · Born ${s.birthYear}</p></div><div class="kpis"><div class="kpi"><div class="label">Races</div><div class="value">${rs.length}</div></div><div class="kpi"><div class="label">Events</div><div class="value">${events.length}</div></div><div class="kpi"><div class="label">Gender</div><div class="value">${s.gender}</div></div></div></div><div class="card panel" style="margin-top:14px"><h2>Best times</h2>${table(["Event","Best time","Meet","Date","Gender","Birth year","Provincial rank","National rank"],best.map(r=>{let nat=rankRows(rows,r.event,r.gender,""), pr=rankRows(rows,r.event,r.gender,r.province);let nr=nat.findIndex(x=>x.swimmerKey===r.swimmerKey)+1, rr=pr.findIndex(x=>x.swimmerKey===r.swimmerKey)+1;return `<tr><td><a href="${rankUrl(r)}">${esc(r.event)}</a></td><td>${r.time}</td><td>${esc(r.meet)}</td><td>${r.date}</td><td>${genderLabel(r.gender)}</td><td>${r.birthYear}</td><td><a href="${rankUrl(r)}">${rr||""}</a></td><td><a href="${rankUrl({...r,province:""})}">${nr||""}</a></td></tr>`}).join(""))}</div><div class="card panel" style="margin-top:14px"><h2>All results</h2>${table(["Date","Event","Gender","Birth year","Time","Rank","Meet","Venue"],rs.sort((a,b)=>String(b.iso).localeCompare(String(a.iso))).map(r=>`<tr><td>${r.date}</td><td>${esc(r.event)}</td><td>${genderLabel(r.gender)}</td><td>${r.birthYear}</td><td>${r.time}</td><td>${r.rank}</td><td>${esc(r.meet)}</td><td>${esc(r.venue)}</td></tr>`))}</div>`);
}

async function clubsPage(){
  let rows=await load(), clubs=uniq(rows.map(r=>r.club));
  layout("clubs",`<h1>Club directory</h1><p class="muted">Browse clubs and open swimmer profiles.</p><div class="card panel"><input id="q" placeholder="Search club"><div id="clubs" class="stack" style="margin-top:12px"></div></div>`);
  function draw(){let q=norm(document.getElementById("q").value);document.getElementById("clubs").innerHTML=clubs.filter(c=>!q||norm(c).includes(q)).map(c=>{let cr=rows.filter(r=>r.club===c);return `<div class="listCard"><h2>${esc(c)}</h2><span class="badge">${uniq(cr.map(r=>r.swimmerKey)).length} swimmers</span><span class="badge">${cr.length} swims</span><div>${uniq(cr.map(r=>r.swimmer)).slice(0,40).map(s=>`<a class="badge" href="/swimmer?name=${encodeURIComponent(s)}">${esc(s)}</a>`).join("")}</div></div>`}).join("")}
  document.getElementById("q").oninput=draw;draw();
}

document.addEventListener("DOMContentLoaded",async()=>{
  try{
    let path=location.pathname;
    if(path.startsWith("/search")) await searchPage();
    else if(path.startsWith("/clubs")) await clubsPage();
    else if(path.startsWith("/swimmer")) await swimmerPage();
    else if(path.startsWith("/meet")) await meetPage();
    else if(path.startsWith("/event")) await eventPage();
    else await home();
  }catch(e){document.body.innerHTML=`<pre style="white-space:pre-wrap;padding:20px">APP ERROR:\n${esc(e.stack||e)}</pre>`}
});
