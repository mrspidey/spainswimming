const DATA_URL = "data/spain_boys_2014_results_master_merged_clean.csv";

const styles = `
<style>
:root{--bg:#f7fbff;--card:#fff;--line:#d9e9f7;--text:#0f172a;--muted:#5b6b7f;--blue:#0ea5e9;--blue-dark:#0284c7;--blue-soft:#e0f2fe;--green:#16a34a;--red:#dc2626;--shadow:0 1px 2px rgba(15,23,42,.04)}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,Arial,Helvetica,sans-serif;background:linear-gradient(180deg,#f8fcff 0%,#f4f8fc 100%);color:var(--text)}
a{color:var(--blue-dark);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1280px;margin:0 auto;padding:18px}
h1{margin:0 0 14px;font-size:clamp(28px,5vw,56px);line-height:1.05}
h2{margin:0 0 12px;font-size:20px}
h3{margin:0 0 8px;font-size:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow)}
.panel{padding:14px}
.stack{display:grid;gap:12px}
.grid{display:grid;gap:14px}
.grid.sidebar{grid-template-columns:minmax(220px,270px) minmax(0,1fr)}
input,select,button{width:100%;padding:12px 14px;border-radius:14px;border:1px solid #cbd5e1;background:#fff;font:inherit;color:inherit}
button{background:var(--blue);color:#fff;border:none;font-weight:700;cursor:pointer}
button:hover{background:var(--blue-dark)}
.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:var(--blue-soft);color:#075985;font-size:12px;margin-right:6px;margin-bottom:6px;font-weight:700;border:1px solid #b8def8}
.muted{color:var(--muted);font-size:14px}
.small{font-size:12px;color:var(--muted)}
.empty{padding:18px;color:var(--muted)}
.tableWrap{overflow:auto;border:1px solid var(--line);border-radius:16px;-webkit-overflow-scrolling:touch}
table{width:100%;min-width:840px;border-collapse:collapse;background:#fff}
th,td{padding:11px 9px;border-bottom:1px solid #eef2f7;text-align:left;vertical-align:top}
th{background:#f8fbfe;font-size:14px}
td{font-size:14px}
.nav{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.nav a{padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:#fff;color:var(--text);font-weight:700}
.nav a.active{background:var(--blue-soft);border-color:#bfdbfe;color:#075985}
.listCard{padding:14px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,#ffffff 0%,#fbfeff 100%)}
.hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.kpiGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.kpi{padding:14px;border:1px solid var(--line);border-radius:16px;background:#fff}
.kpi .label{font-size:12px;color:var(--muted);margin-bottom:6px}
.kpi .value{font-size:24px;font-weight:700}
.primaryBtn,.secondaryBtn{display:inline-flex;align-items:center;justify-content:center;width:auto;min-width:130px;padding:12px 18px;border-radius:14px;font-weight:700;text-decoration:none!important}
.primaryBtn{background:var(--blue);color:#fff!important;border:none}
.secondaryBtn{background:#fff;color:var(--text)!important;border:1px solid var(--line)}
.eventCard{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff}
.eventCardHead{padding:14px 16px;border-bottom:1px solid #eef2f7;background:linear-gradient(180deg,#fbfeff 0%,#f5fbff 100%);display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.eventCardTitle{font-weight:800;font-size:18px;margin:0 0 4px}
.eventCardMeta{color:var(--muted);font-size:13px}
.topThreeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.topThreeCard{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff}
.topThreeCard.gold{background:#fff7da;border-color:#edd98b}
.topThreeCard.silver{background:#f3f5f7;border-color:#d9dde2}
.topThreeCard.bronze{background:#fff1e7;border-color:#e6bf9d}
.topThreePlace{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
.topThreeSwimmer{font-weight:800;margin-bottom:4px}
.filters{display:grid;grid-template-columns:1fr 180px 180px 180px;gap:10px}
.good{color:var(--green);font-weight:700}
.bad{color:var(--red);font-weight:700}
@media(max-width:900px){.wrap{padding:10px}.hero{display:block}.kpiGrid,.filters,.grid.sidebar,.topThreeGrid{grid-template-columns:1fr}.kpiGrid{margin-top:12px}table{min-width:760px}}
</style>
`;

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function normalize(value){
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g," ")
    .trim();
}

function parseCsvLine(line){
  const out = [];
  let cur = "";
  let quoted = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    const next = line[i+1];
    if(ch === '"'){
      if(quoted && next === '"'){ cur += '"'; i++; }
      else quoted = !quoted;
    } else if(ch === "," && !quoted){
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseDateIso(value){
  const s = String(value ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m) return s;
  return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
}

function displayDate(value){
  const s = String(value ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m) return s;
  return `${String(m[1]).padStart(2,"0")}/${String(m[2]).padStart(2,"0")}/${m[3]}`;
}

function secondsToTime(seconds){
  const n = Number(seconds);
  if(!Number.isFinite(n)) return "";
  const m = Math.floor(n / 60);
  const s = (n - m * 60).toFixed(2).padStart(5,"0");
  return m > 0 ? `${String(m).padStart(2,"0")}:${s}` : `00:${s}`;
}

function formatTime(value, seconds){
  const s = String(value ?? "").trim();
  if(!s && seconds) return secondsToTime(seconds);
  if(/^\d{1,2}\.\d{2}$/.test(s)) return `00:${s.padStart(5,"0")}`;
  if(/^\d+:\d{2}\.\d{2}$/.test(s)){
    const [m, rest] = s.split(":");
    return `${String(m).padStart(2,"0")}:${rest}`;
  }
  return s;
}

function cleanName(raw){
  const s = String(raw ?? "").trim();
  if(!s.includes(",")) return s;
  const [last, ...rest] = s.split(",");
  return `${rest.join(",").trim()} ${last.trim()}`.replace(/\s+/g," ");
}

function swimmerKey(name){
  return normalize(cleanName(name));
}

function genderLabel(g){
  if(g === "M") return "Male";
  if(g === "F") return "Female";
  return "Unknown";
}

function eventKey(event){
  return normalize(event);
}

function meetKey(row){
  return normalize(`${row.source}|${row.date}|${row.venue}|${row.meet}`);
}

function eventPageKey(row){
  return normalize(`${row.source}|${row.date}|${row.venue}|${row.event}|${row.gender}|${row.birthYear}`);
}

function rankingUrl(row, province){
  const params = new URLSearchParams();
  params.set("mode", "rankings");
  params.set("event", row.event);
  params.set("gender", row.gender);
  params.set("birthYear", row.birthYear || "2014");
  if(province) params.set("province", row.province);
  return `search.html?${params.toString()}`;
}

function swimmerUrl(name){
  return `swimmer.html?name=${encodeURIComponent(name)}`;
}

function meetUrl(row){
  return `meet.html?id=${encodeURIComponent(meetKey(row))}`;
}

function eventUrl(row){
  return `event.html?id=${encodeURIComponent(eventPageKey(row))}`;
}

function layout(active, html){
  document.head.insertAdjacentHTML("beforeend", styles);
  document.body.innerHTML = `
    <div class="wrap">
      <nav class="nav">
        <a class="${active==="home"?"active":""}" href="index.html">Home</a>
        <a class="${active==="search"?"active":""}" href="search.html">Search</a>
        <a class="${active==="clubs"?"active":""}" href="clubs.html">Clubs</a>
      </nav>
      ${html}
    </div>
  `;
}

async function loadRows(){
  const text = await fetch(DATA_URL, {cache:"no-store"}).then(r => r.text());
  const lines = text.replace(/^\uFEFF/,"").replace(/\r/g,"").split("\n").filter(Boolean);
  const headers = parseCsvLine(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const obj = {};
    headers.forEach((h,i) => obj[h] = (vals[i] ?? "").trim());

    const seconds = Number(obj.Seconds);
    const row = {
      swimmerRaw: obj.Swimmer,
      swimmer: cleanName(obj.Swimmer),
      swimmerKey: swimmerKey(obj.Swimmer),
      event: obj.Event,
      date: displayDate(obj.Date),
      dateIso: parseDateIso(obj.Date),
      time: formatTime(obj.Time, seconds),
      club: obj.Club,
      rank: Number(obj.Rank) || "",
      meet: obj.Meet,
      venue: obj.Venue,
      province: String(obj.Province || "").toLowerCase(),
      source: obj.Source,
      seconds,
      distance: Number(obj.Distance) || "",
      gender: String(obj.Gender || "").toUpperCase(),
      competitionType: obj.Competition_Type || "",
      birthYear: Number(obj.BirthYear) || 2014,
      provincialRank: Number(obj.Provincial_Rank) || "",
      nationalRank: Number(obj.National_Rank) || "",
      dedupeKey: obj.Dedupe_Key
    };

    return row;
  }).filter(r =>
    r.swimmer &&
    r.event &&
    r.time &&
    r.club &&
    r.gender &&
    Number.isFinite(r.seconds)
  );
}

function uniqueSorted(values){
  return [...new Set(values.filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b),"es"));
}

function groupBy(rows, fn){
  const map = new Map();
  rows.forEach(r => {
    const k = fn(r);
    if(!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return map;
}

function table(headers, rows){
  return `
    <div class="tableWrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

function bestRowsPerSwimmer(rows){
  const map = new Map();
  rows.forEach(r => {
    const existing = map.get(r.swimmerKey);
    if(!existing || r.seconds < existing.seconds) map.set(r.swimmerKey, r);
  });
  return [...map.values()].sort((a,b) => a.seconds - b.seconds || a.swimmer.localeCompare(b.swimmer,"es"));
}

function getMeetGroups(rows){
  const grouped = groupBy(rows, meetKey);
  return [...grouped.entries()].map(([id, meetRows]) => {
    const first = meetRows[0];
    return {
      id,
      meet: first.meet,
      venue: first.venue,
      province: first.province,
      date: first.date,
      dateIso: first.dateIso,
      rows: meetRows,
      eventCount: uniqueSorted(meetRows.map(r => `${r.event}|${r.gender}|${r.birthYear}`)).length,
      swimmerCount: uniqueSorted(meetRows.map(r => r.swimmerKey)).length
    };
  }).sort((a,b) => String(b.dateIso).localeCompare(String(a.dateIso)) || a.meet.localeCompare(b.meet,"es"));
}

function renderTopThree(rows){
  const top = [...rows].sort((a,b) => Number(a.rank) - Number(b.rank) || a.seconds - b.seconds).slice(0,3);
  const cls = ["gold","silver","bronze"];
  return `
    <div class="topThreeGrid">
      ${top.map((r,i) => `
        <div class="topThreeCard ${cls[i] || ""}">
          <div class="topThreePlace">${r.rank || i+1} PLACE</div>
          <div class="topThreeSwimmer"><a href="${swimmerUrl(r.swimmerRaw)}">${escapeHtml(r.swimmer)}</a></div>
          <div class="small">${escapeHtml(r.club)}</div>
          <div style="font-size:22px;font-weight:800;margin-top:8px">${escapeHtml(r.time)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

async function renderHome(){
  const rows = await loadRows();
  const meets = getMeetGroups(rows);

  layout("home", `
    <section class="card panel hero">
      <div>
        <h1>Spain Swimming Results</h1>
        <p class="muted">2014 swimmers · gender-aware rankings · FNCV results.</p>
      </div>
      <div class="kpiGrid">
        <div class="kpi"><div class="label">Meets</div><div class="value">${meets.length}</div></div>
        <div class="kpi"><div class="label">Swimmers</div><div class="value">${uniqueSorted(rows.map(r=>r.swimmerKey)).length}</div></div>
        <div class="kpi"><div class="label">Results</div><div class="value">${rows.length}</div></div>
      </div>
    </section>

    <section class="card panel" style="margin-top:14px">
      <div class="filters">
        <input id="q" placeholder="Search meet, venue, province">
        <select id="province"><option value="">All provinces</option>${uniqueSorted(rows.map(r=>r.province)).map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("")}</select>
        <select id="gender"><option value="">All genders</option><option value="M">Male</option><option value="F">Female</option></select>
        <select id="type"><option value="">All types</option>${uniqueSorted(rows.map(r=>r.competitionType)).map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}</select>
      </div>
    </section>

    <section class="card panel stack" style="margin-top:14px">
      <h2>Latest completed meets</h2>
      <div id="meetList"></div>
    </section>
  `);

  function draw(){
    const q = normalize(document.getElementById("q").value);
    const province = document.getElementById("province").value;
    const gender = document.getElementById("gender").value;
    const type = document.getElementById("type").value;

    const filtered = meets.filter(m => {
      const meetRows = m.rows.filter(r =>
        (!gender || r.gender === gender) &&
        (!type || r.competitionType === type)
      );
      return meetRows.length &&
        (!province || m.province === province) &&
        (!q || normalize(`${m.meet} ${m.venue} ${m.province}`).includes(q));
    });

    document.getElementById("meetList").innerHTML = filtered.slice(0,100).map(m => `
      <div class="listCard">
        <h2>${escapeHtml(m.meet)}</h2>
        <p class="muted">${escapeHtml(m.venue)} · ${escapeHtml(m.date)} · ${escapeHtml(m.province)}</p>
        <span class="badge">${m.eventCount} events</span>
        <span class="badge">${m.swimmerCount} swimmers</span>
        <span class="badge">${m.rows.length} swims</span>
        <p><a class="primaryBtn" href="meet.html?id=${encodeURIComponent(m.id)}">View meet</a></p>
      </div>
    `).join("") || `<div class="empty">No meets found.</div>`;
  }

  ["q","province","gender","type"].forEach(id => document.getElementById(id).addEventListener("input", draw));
  draw();
}

async function renderMeet(){
  const rows = await loadRows();
  const id = new URLSearchParams(location.search).get("id");
  const meet = getMeetGroups(rows).find(m => m.id === id);

  if(!meet){
    layout("", `<div class="card panel"><h1>Meet not found</h1><p><a href="index.html">Back home</a></p></div>`);
    return;
  }

  const eventGroups = [...groupBy(meet.rows, r => `${r.gender}|${r.birthYear}|${eventKey(r.event)}`).values()]
    .sort((a,b) => a[0].gender.localeCompare(b[0].gender) || a[0].event.localeCompare(b[0].event,"es"));

  layout("", `
    <p><a class="secondaryBtn" href="index.html">← Back</a></p>
    <section class="card panel hero">
      <div>
        <h1>${escapeHtml(meet.meet)}</h1>
        <p class="muted">${escapeHtml(meet.venue)} · ${escapeHtml(meet.date)} · ${escapeHtml(meet.province)}</p>
      </div>
      <div class="kpiGrid">
        <div class="kpi"><div class="label">Events</div><div class="value">${eventGroups.length}</div></div>
        <div class="kpi"><div class="label">Swimmers</div><div class="value">${meet.swimmerCount}</div></div>
        <div class="kpi"><div class="label">Results</div><div class="value">${meet.rows.length}</div></div>
      </div>
    </section>

    <section class="stack" style="margin-top:14px">
      ${eventGroups.map(group => {
        const sorted = [...group].sort((a,b) => Number(a.rank) - Number(b.rank) || a.seconds - b.seconds);
        const first = sorted[0];
        return `
          <div class="eventCard">
            <div class="eventCardHead">
              <div>
                <div class="eventCardTitle">${escapeHtml(first.event)}</div>
                <div class="eventCardMeta">${genderLabel(first.gender)} · Born ${first.birthYear} · ${sorted.length} results</div>
              </div>
              <a class="primaryBtn" href="${eventUrl(first)}">Open event</a>
            </div>
            <div class="panel">
              ${renderTopThree(sorted)}
              ${table(["Place","Swimmer","Club","Gender","Birth year","Time"], sorted.map(r => `
                <tr>
                  <td>${escapeHtml(r.rank)}</td>
                  <td><a href="${swimmerUrl(r.swimmerRaw)}">${escapeHtml(r.swimmer)}</a></td>
                  <td>${escapeHtml(r.club)}</td>
                  <td>${genderLabel(r.gender)}</td>
                  <td>${r.birthYear}</td>
                  <td>${escapeHtml(r.time)}</td>
                </tr>
              `))}
            </div>
          </div>
        `;
      }).join("")}
    </section>
  `);
}

async function renderEvent(){
  const rows = await loadRows();
  const id = new URLSearchParams(location.search).get("id");
  const eventRows = rows.filter(r => eventPageKey(r) === id).sort((a,b) => Number(a.rank) - Number(b.rank) || a.seconds - b.seconds);
  const first = eventRows[0];

  if(!first){
    layout("", `<div class="card panel"><h1>Event not found</h1><p><a href="index.html">Back home</a></p></div>`);
    return;
  }

  layout("", `
    <p><a class="secondaryBtn" href="${meetUrl(first)}">← Back to meet</a></p>
    <section class="card panel">
      <h1>${escapeHtml(first.event)}</h1>
      <p class="muted">${genderLabel(first.gender)} · Born ${first.birthYear} · ${escapeHtml(first.meet)} · ${escapeHtml(first.venue)} · ${escapeHtml(first.date)}</p>
      <p><a class="primaryBtn" href="${rankingUrl(first, false)}">Open full ranking</a></p>
    </section>
    <section style="margin-top:14px">
      ${table(["Place","Swimmer","Club","Gender","Birth year","Time"], eventRows.map(r => `
        <tr>
          <td>${escapeHtml(r.rank)}</td>
          <td><a href="${swimmerUrl(r.swimmerRaw)}">${escapeHtml(r.swimmer)}</a></td>
          <td>${escapeHtml(r.club)}</td>
          <td>${genderLabel(r.gender)}</td>
          <td>${r.birthYear}</td>
          <td>${escapeHtml(r.time)}</td>
        </tr>
      `))}
    </section>
  `);
}

async function renderSearch(){
  const rows = await loadRows();
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode") || "rankings";
  const initialQ = params.get("q") || "";
  const initialEvent = params.get("event") || "";
  const initialGender = params.get("gender") || "";
  const initialProvince = params.get("province") || "";
  const initialBirthYear = params.get("birthYear") || "2014";

  const events = uniqueSorted(rows.map(r=>r.event));
  const provinces = uniqueSorted(rows.map(r=>r.province));
  const years = uniqueSorted(rows.map(r=>String(r.birthYear)));

  layout("search", `
    <h1>Search</h1>
    <div class="grid sidebar">
      <aside class="card panel stack">
        <a class="secondaryBtn" href="search.html?mode=rankings">Rankings</a>
        <a class="secondaryBtn" href="search.html?mode=all">All results</a>
        <input id="q" placeholder="Search swimmer or club" value="${escapeHtml(initialQ)}">
        <select id="event"><option value="">All events</option>${events.map(e=>`<option value="${escapeHtml(e)}" ${e===initialEvent?"selected":""}>${escapeHtml(e)}</option>`).join("")}</select>
        <select id="gender"><option value="">All genders</option><option value="M" ${initialGender==="M"?"selected":""}>Male</option><option value="F" ${initialGender==="F"?"selected":""}>Female</option></select>
        <select id="birthYear">${years.map(y=>`<option value="${escapeHtml(y)}" ${y===initialBirthYear?"selected":""}>Born ${escapeHtml(y)}</option>`).join("")}</select>
        <select id="province"><option value="">All provinces</option>${provinces.map(p=>`<option value="${escapeHtml(p)}" ${p===initialProvince?"selected":""}>${escapeHtml(p)}</option>`).join("")}</select>
        <button id="clear">Clear</button>
      </aside>
      <main class="card panel">
        <h2 id="title"></h2>
        <div id="results"></div>
      </main>
    </div>
  `);

  function draw(){
    const q = normalize(document.getElementById("q").value);
    const event = document.getElementById("event").value;
    const gender = document.getElementById("gender").value;
    const birthYear = Number(document.getElementById("birthYear").value);
    const province = document.getElementById("province").value;

    let filtered = rows.filter(r =>
      (!q || normalize(`${r.swimmer} ${r.club}`).includes(q)) &&
      (!event || r.event === event) &&
      (!gender || r.gender === gender) &&
      (!birthYear || r.birthYear === birthYear) &&
      (!province || r.province === province)
    );

    if(mode === "all"){
      filtered = filtered.sort((a,b) => String(b.dateIso).localeCompare(String(a.dateIso)) || a.event.localeCompare(b.event,"es"));
      document.getElementById("title").textContent = `All results (${filtered.length})`;
      document.getElementById("results").innerHTML = table(
        ["Date","Swimmer","Club","Event","Gender","Birth year","Time","Meet","Venue"],
        filtered.slice(0,600).map(r => `
          <tr>
            <td>${escapeHtml(r.date)}</td>
            <td><a href="${swimmerUrl(r.swimmerRaw)}">${escapeHtml(r.swimmer)}</a></td>
            <td>${escapeHtml(r.club)}</td>
            <td>${escapeHtml(r.event)}</td>
            <td>${genderLabel(r.gender)}</td>
            <td>${r.birthYear}</td>
            <td>${escapeHtml(r.time)}</td>
            <td>${escapeHtml(r.meet)}</td>
            <td>${escapeHtml(r.venue)}</td>
          </tr>
        `)
      );
    } else {
      const best = bestRowsPerSwimmer(filtered);
      document.getElementById("title").textContent = `Rankings (${best.length})`;
      document.getElementById("results").innerHTML = table(
        ["Rank","Swimmer","Club","Event","Gender","Birth year","Time","Meet","Venue"],
        best.slice(0,600).map((r,i) => `
          <tr>
            <td>${i+1}</td>
            <td><a href="${swimmerUrl(r.swimmerRaw)}">${escapeHtml(r.swimmer)}</a></td>
            <td>${escapeHtml(r.club)}</td>
            <td>${escapeHtml(r.event)}</td>
            <td>${genderLabel(r.gender)}</td>
            <td>${r.birthYear}</td>
            <td>${escapeHtml(r.time)}</td>
            <td>${escapeHtml(r.meet)}</td>
            <td>${escapeHtml(r.venue)}</td>
          </tr>
        `)
      );
    }
  }

  ["q","event","gender","birthYear","province"].forEach(id => document.getElementById(id).addEventListener("input", draw));
  document.getElementById("clear").addEventListener("click", () => location.href = `search.html?mode=${mode}`);
  draw();
}

async function renderSwimmer(){
  const rows = await loadRows();
  const name = new URLSearchParams(location.search).get("name") || "";
  const key = swimmerKey(name);
  const swimmerRows = rows.filter(r => r.swimmerKey === key).sort((a,b) => String(b.dateIso).localeCompare(String(a.dateIso)));

  if(!swimmerRows.length){
    layout("", `<div class="card panel"><h1>Swimmer not found</h1><p><a href="search.html">Search swimmers</a></p></div>`);
    return;
  }

  const first = swimmerRows[0];
  const bestByEvent = new Map();
  swimmerRows.forEach(r => {
    const k = eventKey(r.event);
    const existing = bestByEvent.get(k);
    if(!existing || r.seconds < existing.seconds) bestByEvent.set(k, r);
  });

  const bestRows = [...bestByEvent.values()].sort((a,b) => a.distance - b.distance || a.event.localeCompare(b.event,"es"));

  layout("", `
    <p><a class="secondaryBtn" href="javascript:history.back()">← Back</a></p>
    <section class="card panel hero">
      <div>
        <h1>${escapeHtml(first.swimmer)}</h1>
        <p class="muted">${escapeHtml(first.club)}<br>${genderLabel(first.gender)} · Born ${first.birthYear}</p>
      </div>
      <div class="kpiGrid">
        <div class="kpi"><div class="label">Results</div><div class="value">${swimmerRows.length}</div></div>
        <div class="kpi"><div class="label">Events</div><div class="value">${bestRows.length}</div></div>
        <div class="kpi"><div class="label">Gender</div><div class="value">${first.gender}</div></div>
      </div>
    </section>

    <section class="card panel" style="margin-top:14px">
      <h2>Best times</h2>
      ${table(["Event","Best time","Meet","Date","Provincial rank","National rank"], bestRows.map(r => `
        <tr>
          <td><a href="${rankingUrl(r, false)}">${escapeHtml(r.event)}</a></td>
          <td>${escapeHtml(r.time)}</td>
          <td>${escapeHtml(r.meet)}</td>
          <td>${escapeHtml(r.date)}</td>
          <td><a href="${rankingUrl(r, true)}">${escapeHtml(r.provincialRank || "")}</a></td>
          <td><a href="${rankingUrl(r, false)}">${escapeHtml(r.nationalRank || "")}</a></td>
        </tr>
      `))}
    </section>

    <section class="card panel" style="margin-top:14px">
      <h2>All results</h2>
      ${table(["Date","Event","Gender","Birth year","Time","Place","Meet","Venue"], swimmerRows.map(r => `
        <tr>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.event)}</td>
          <td>${genderLabel(r.gender)}</td>
          <td>${r.birthYear}</td>
          <td>${escapeHtml(r.time)}</td>
          <td>${escapeHtml(r.rank)}</td>
          <td>${escapeHtml(r.meet)}</td>
          <td>${escapeHtml(r.venue)}</td>
        </tr>
      `))}
    </section>
  `);
}

async function renderClubs(){
  const rows = await loadRows();
  const grouped = [...groupBy(rows, r => r.club).entries()]
    .map(([club, clubRows]) => ({club, rows: clubRows}))
    .sort((a,b) => a.club.localeCompare(b.club,"es"));

  layout("clubs", `
    <h1>Clubs</h1>
    <section class="card panel">
      <input id="q" placeholder="Search club">
      <div id="clubList" class="stack" style="margin-top:12px"></div>
    </section>
  `);

  function draw(){
    const q = normalize(document.getElementById("q").value);
    const filtered = grouped.filter(g => !q || normalize(g.club).includes(q));

    document.getElementById("clubList").innerHTML = filtered.map(g => {
      const swimmers = uniqueSorted(g.rows.map(r => r.swimmer));
      return `
        <div class="listCard">
          <h2>${escapeHtml(g.club)}</h2>
          <span class="badge">${swimmers.length} swimmers</span>
          <span class="badge">${g.rows.length} swims</span>
          <div>
            ${swimmers.slice(0,60).map(s => `<a class="badge" href="${swimmerUrl(s)}">${escapeHtml(s)}</a>`).join("")}
          </div>
        </div>
      `;
    }).join("") || `<div class="empty">No clubs found.</div>`;
  }

  document.getElementById("q").addEventListener("input", draw);
  draw();
}

document.addEventListener("DOMContentLoaded", async () => {
  try{
    const path = location.pathname.toLowerCase();
    if(path.includes("search")) await renderSearch();
    else if(path.includes("clubs")) await renderClubs();
    else if(path.includes("swimmer")) await renderSwimmer();
    else if(path.includes("meet")) await renderMeet();
    else if(path.includes("event")) await renderEvent();
    else await renderHome();
  } catch(err){
    document.head.insertAdjacentHTML("beforeend", styles);
    document.body.innerHTML = `<div class="wrap"><div class="card panel"><h1>App error</h1><pre>${escapeHtml(err.stack || err)}</pre></div></div>`;
    console.error(err);
  }
});