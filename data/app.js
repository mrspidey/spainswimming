// ===== DATA LOAD =====
async function loadData() {
  const res = await fetch("data/spain_boys_2014_results_master_merged_clean.csv");
  const text = await res.text();

  const rows = text.split("\n").slice(1).map(line => {
    const cols = line.split(",");
    if (cols.length < 16) return null;

    return {
      Swimmer: cols[0],
      Event: cols[1],
      Date: cols[2],
      Time: cols[3],
      Club: cols[4],
      Rank: parseInt(cols[5]) || null,
      Meet: cols[6],
      Venue: cols[7],
      Province: cols[8],
      Seconds: parseFloat(cols[10]) || null,
      Distance: parseInt(cols[11]) || null,
      Gender: cols[12] || "M",
      Competition: cols[13],
      ProvincialRank: parseInt(cols[14]) || null,
      NationalRank: parseInt(cols[15]) || null
    };
  }).filter(Boolean);

  return rows;
}

// ===== DATE PARSER =====
function parseDate(d) {
  const parts = d.split("/");
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

// ===== CLEAN NAME =====
function cleanName(name) {
  if (!name) return "";
  if (name.includes(",")) {
    const [last, first] = name.split(",");
    return `${first.trim()} ${last.trim()}`;
  }
  return name;
}

// ===== GENDER LABEL =====
function genderLabel(g) {
  return g === "F" ? "Girls" : "Boys";
}

// ===== GROUP BY =====
function groupBy(arr, key) {
  return arr.reduce((acc, x) => {
    acc[x[key]] = acc[x[key]] || [];
    acc[x[key]].push(x);
    return acc;
  }, {});
}

// ===== HOMEPAGE =====
async function renderHome() {
  const data = await loadData();

  const meets = groupBy(data, "Meet");

  const meetList = Object.keys(meets).map(name => {
    const rows = meets[name];
    return {
      name,
      date: rows[0].Date,
      venue: rows[0].Venue,
      province: rows[0].Province,
      count: rows.length,
      swimmers: new Set(rows.map(r => r.Swimmer)).size
    };
  });

  // 🔥 FIX: SORT BY DATE
  meetList.sort((a, b) => parseDate(b.date) - parseDate(a.date));

  const container = document.getElementById("meets");
  container.innerHTML = "";

  meetList.slice(0, 30).forEach(m => {
    container.innerHTML += `
      <div class="meet-card">
        <h3>${m.name}</h3>
        <p>${m.venue} • ${m.date}</p>
        <p>${m.swimmers} swimmers • ${m.count} results</p>
        <a href="meet.html?meet=${encodeURIComponent(m.name)}">View results</a>
      </div>
    `;
  });
}

// ===== MEET PAGE =====
async function renderMeet(meetName) {
  const data = await loadData();
  let rows = data.filter(r => r.Meet === meetName);

  // gender filter
  const genderFilter = document.getElementById("genderFilter");
  if (genderFilter && genderFilter.value) {
    rows = rows.filter(r => r.Gender === genderFilter.value);
  }

  const events = groupBy(rows, "Event");
  const container = document.getElementById("events");
  container.innerHTML = "";

  Object.keys(events).forEach(event => {
    const ev = events[event];

    ev.sort((a, b) => a.Seconds - b.Seconds);

    container.innerHTML += `
      <div class="event-block">
        <h3>${event} (${genderLabel(ev[0].Gender)})</h3>
        <table>
          ${ev.map(r => `
            <tr>
              <td>${r.Rank}</td>
              <td><a href="swimmer.html?name=${encodeURIComponent(r.Swimmer)}">${cleanName(r.Swimmer)}</a></td>
              <td>${r.Time}</td>
            </tr>
          `).join("")}
        </table>
      </div>
    `;
  });
}

// ===== SWIMMER PAGE =====
async function renderSwimmer(name) {
  const data = await loadData();
  const rows = data.filter(r => r.Swimmer === name);

  if (!rows.length) return;

  const container = document.getElementById("swimmer");
  const gender = rows[0].Gender;

  container.innerHTML = `
    <h1>${cleanName(name)}</h1>
    <p>${genderLabel(gender)} • Born ${rows[0].BirthYear || "2014"}</p>
  `;

  // BEST TIMES
  const best = {};

  rows.forEach(r => {
    if (!best[r.Event] || r.Seconds < best[r.Event].Seconds) {
      best[r.Event] = r;
    }
  });

  const bestContainer = document.getElementById("best");
  bestContainer.innerHTML = Object.values(best).map(r => `
    <tr>
      <td>${r.Event}</td>
      <td>${r.Time}</td>
      <td>
        <a href="meet.html?meet=${encodeURIComponent(r.Meet)}">
          ${r.Meet}
        </a>
      </td>
      <td>
        <a href="meet.html?meet=${encodeURIComponent(r.Meet)}&event=${encodeURIComponent(r.Event)}&gender=${r.Gender}">
          #${r.Rank}
        </a>
      </td>
    </tr>
  `).join("");
}

// ===== SEARCH =====
async function renderSearch() {
  const data = await loadData();
  const input = document.getElementById("search");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();

    const results = data.filter(r =>
      r.Swimmer.toLowerCase().includes(q)
    );

    const unique = {};
    results.forEach(r => unique[r.Swimmer] = r);

    const container = document.getElementById("results");
    container.innerHTML = Object.values(unique).slice(0, 50).map(r => `
      <div>
        <a href="swimmer.html?name=${encodeURIComponent(r.Swimmer)}">
          ${cleanName(r.Swimmer)}
        </a> (${genderLabel(r.Gender)})
      </div>
    `).join("");
  });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  if (document.getElementById("meets")) {
    renderHome();
  }

  if (params.get("meet")) {
    renderMeet(params.get("meet"));
  }

  if (params.get("name")) {
    renderSwimmer(params.get("name"));
  }

  if (document.getElementById("search")) {
    renderSearch();
  }
});