
const DEFAULT_CSV_PATH = './data/spain_boys_2014_results_master.csv';
let allRows = [];
let filteredRows = [];
let currentView = 'standings';
let activeSwimmer = null;

const els = {
  fileInput: document.getElementById('fileInput'),
  resetDataBtn: document.getElementById('resetDataBtn'),
  searchInput: document.getElementById('searchInput'),
  seasonFilter: document.getElementById('seasonFilter'),
  provinceFilter: document.getElementById('provinceFilter'),
  venueFilter: document.getElementById('venueFilter'),
  clubFilter: document.getElementById('clubFilter'),
  strokeFilter: document.getElementById('strokeFilter'),
  eventFilter: document.getElementById('eventFilter'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  savedSwimmers: document.getElementById('savedSwimmers'),
  duplicateList: document.getElementById('duplicateList'),
  statRows: document.getElementById('statRows'),
  statSwimmers: document.getElementById('statSwimmers'),
  statEvents: document.getElementById('statEvents'),
  statLatest: document.getElementById('statLatest'),
  mainTableTitle: document.getElementById('mainTableTitle'),
  mainTable: document.getElementById('mainTable'),
  swimmerTitle: document.getElementById('swimmerTitle'),
  swimmerActions: document.getElementById('swimmerActions'),
  swimmerEmpty: document.getElementById('swimmerEmpty'),
  swimmerWrap: document.getElementById('swimmerWrap'),
  swimmerTable: document.getElementById('swimmerTable'),
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const parseLine = (line) => {
    const out = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current);
    return out;
  };
  const headers = parseLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = values[i] ?? '');
    row.Time_Seconds = Number(row.Time_Seconds || 0);
    row.Points = row.Points ? Number(row.Points) : '';
    row.Rank = row.Rank ? Number(row.Rank) : '';
    return row;
  });
}

function populateSelect(select, values, placeholder, preferredValue='') {
  const current = preferredValue || select.value || '';
  select.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = '';
  opt.textContent = placeholder;
  select.appendChild(opt);
  values.forEach((value) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = value;
    if (value === current) o.selected = true;
    select.appendChild(o);
  });
}

function uniqueSorted(rows, key) {
  return [...new Set(rows.map(r => r[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function getSavedSwimmers() {
  try { return JSON.parse(localStorage.getItem('spainswimming-saved') || '[]'); }
  catch { return []; }
}

function setSavedSwimmers(values) {
  localStorage.setItem('spainswimming-saved', JSON.stringify(values));
}

function toggleSaveSwimmer(name) {
  const current = getSavedSwimmers();
  const next = current.includes(name) ? current.filter(x => x !== name) : [...current, name].sort();
  setSavedSwimmers(next);
  renderSavedSwimmers();
  renderSwimmerPanel(activeSwimmer);
}

function formatDate(dateIso, fallback) {
  if (!dateIso) return fallback || '';
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return fallback || dateIso;
  return d.toLocaleDateString('en-GB');
}

function bestRowsByEvent(rows) {
  const bestMap = new Map();
  rows.forEach((row) => {
    const key = `${row.Event}__${row.Canonical_Swimmer}`;
    const existing = bestMap.get(key);
    if (!existing || row.Time_Seconds < existing.Time_Seconds) {
      bestMap.set(key, row);
    }
  });

  const grouped = new Map();
  [...bestMap.values()].forEach((row) => {
    if (!grouped.has(row.Event)) grouped.set(row.Event, []);
    grouped.get(row.Event).push(row);
  });

  const standings = [];
  [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([event, rowsForEvent]) => {
      rowsForEvent.sort((a, b) => a.Time_Seconds - b.Time_Seconds || a.Canonical_Swimmer.localeCompare(b.Canonical_Swimmer));
      rowsForEvent.forEach((row, idx) => standings.push({ ...row, Standing_Rank: idx + 1 }));
    });
  return standings;
}

function tableHTML(headers, rows, rowRenderer) {
  const thead = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
  const tbody = rows.map(rowRenderer).join('');
  return { thead, tbody };
}

function renderMainTable() {
  const table = els.mainTable;
  const search = els.searchInput.value.trim().toLowerCase();
  filteredRows = allRows
    .filter(r => !els.seasonFilter.value || r.Season === els.seasonFilter.value)
    .filter(r => !els.provinceFilter.value || r.Province === els.provinceFilter.value)
    .filter(r => !els.venueFilter.value || r.Venue === els.venueFilter.value)
    .filter(r => !els.clubFilter.value || r.Club === els.clubFilter.value)
    .filter(r => !els.strokeFilter.value || r.Stroke === els.strokeFilter.value)
    .filter(r => !els.eventFilter.value || r.Event === els.eventFilter.value)
    .filter(r => {
      if (!search) return true;
      return [r.Canonical_Swimmer, r.Swimmer_Raw, r.Club, r.Meet, r.Venue, r.Event]
        .some(value => String(value || '').toLowerCase().includes(search));
    });

  const latestIso = filteredRows.map(r => r.Date_ISO).sort().slice(-1)[0] || '';
  els.statRows.textContent = filteredRows.length.toLocaleString();
  els.statSwimmers.textContent = [...new Set(filteredRows.map(r => r.Canonical_Swimmer))].length.toLocaleString();
  els.statEvents.textContent = [...new Set(filteredRows.map(r => r.Event))].length.toLocaleString();
  els.statLatest.textContent = formatDate(latestIso, '');

  if (currentView === 'standings') {
    const standings = bestRowsByEvent(filteredRows);
    els.mainTableTitle.textContent = els.eventFilter.value
      ? `Standings • ${els.eventFilter.value}`
      : 'Event standings';

    const html = tableHTML(
      ['Rank', 'Event', 'Swimmer', 'Club', 'Best time', 'Meet', 'Date', 'Save'],
      standings,
      (r) => `<tr>
        <td class="rank">${r.Standing_Rank}</td>
        <td>${r.Event}</td>
        <td><span class="linkish" data-swimmer="${encodeURIComponent(r.Canonical_Swimmer)}">${r.Canonical_Swimmer}</span></td>
        <td>${r.Club}</td>
        <td class="mono">${r.Time}</td>
        <td>${r.Meet}<div class="subtle">${r.Venue}</div></td>
        <td>${formatDate(r.Date_ISO, r.Date)}</td>
        <td><button class="button secondary mini-save" data-save="${encodeURIComponent(r.Canonical_Swimmer)}">★</button></td>
      </tr>`
    );
    table.querySelector('thead').innerHTML = html.thead;
    table.querySelector('tbody').innerHTML = html.tbody || '<tr><td colspan="8" class="empty">No rows match the current filters.</td></tr>';
  } else {
    const results = [...filteredRows].sort((a, b) => a.Date_ISO.localeCompare(b.Date_ISO) || a.Event.localeCompare(b.Event) || a.Time_Seconds - b.Time_Seconds);
    els.mainTableTitle.textContent = 'All results';
    const html = tableHTML(
      ['Date', 'Event', 'Rank', 'Swimmer', 'Club', 'Time', 'Meet'],
      results,
      (r) => `<tr>
        <td>${formatDate(r.Date_ISO, r.Date)}</td>
        <td>${r.Event}</td>
        <td class="rank">${r.Rank || ''}</td>
        <td><span class="linkish" data-swimmer="${encodeURIComponent(r.Canonical_Swimmer)}">${r.Canonical_Swimmer}</span>${r.Swimmer_Raw !== r.Canonical_Swimmer ? `<div class="subtle">raw: ${r.Swimmer_Raw}</div>` : ''}</td>
        <td>${r.Club}</td>
        <td class="mono">${r.Time}</td>
        <td>${r.Meet}<div class="subtle">${r.Venue}</div></td>
      </tr>`
    );
    table.querySelector('thead').innerHTML = html.thead;
    table.querySelector('tbody').innerHTML = html.tbody || '<tr><td colspan="7" class="empty">No rows match the current filters.</td></tr>';
  }

  bindMainTableActions();
  renderDuplicateList();
  renderSwimmerPanel(activeSwimmer);
}

function bindMainTableActions() {
  document.querySelectorAll('[data-swimmer]').forEach((el) => {
    el.addEventListener('click', () => {
      activeSwimmer = decodeURIComponent(el.dataset.swimmer);
      renderSwimmerPanel(activeSwimmer);
    });
  });
  document.querySelectorAll('[data-save]').forEach((el) => {
    el.addEventListener('click', () => {
      toggleSaveSwimmer(decodeURIComponent(el.dataset.save));
    });
  });
}

function renderSwimmerPanel(name) {
  if (!name) {
    els.swimmerTitle.textContent = 'Swimmer history';
    els.swimmerEmpty.classList.remove('hidden');
    els.swimmerWrap.classList.add('hidden');
    els.swimmerActions.innerHTML = '';
    return;
  }
  const swimmerRows = filteredRows
    .filter(r => r.Canonical_Swimmer === name)
    .sort((a, b) => a.Date_ISO.localeCompare(b.Date_ISO) || a.Time_Seconds - b.Time_Seconds);

  els.swimmerTitle.textContent = `${name} • results`;
  els.swimmerEmpty.classList.toggle('hidden', swimmerRows.length > 0);
  els.swimmerWrap.classList.toggle('hidden', swimmerRows.length === 0);

  const saved = getSavedSwimmers().includes(name);
  els.swimmerActions.innerHTML = `
    <button class="button secondary" id="saveActiveBtn">${saved ? 'Unsave swimmer' : 'Save swimmer'}</button>
  `;
  document.getElementById('saveActiveBtn')?.addEventListener('click', () => toggleSaveSwimmer(name));

  const html = tableHTML(
    ['Date', 'Event', 'Rank', 'Time', 'Club', 'Meet', 'Source'],
    swimmerRows,
    (r) => `<tr>
      <td>${formatDate(r.Date_ISO, r.Date)}</td>
      <td>${r.Event}</td>
      <td class="rank">${r.Rank || ''}</td>
      <td class="mono">${r.Time}</td>
      <td>${r.Club}</td>
      <td>${r.Meet}<div class="subtle">${r.Venue}</div></td>
      <td><a href="${r.Source_URL}" target="_blank" rel="noreferrer">PDF</a></td>
    </tr>`
  );
  els.swimmerTable.querySelector('thead').innerHTML = html.thead;
  els.swimmerTable.querySelector('tbody').innerHTML = html.tbody || '<tr><td colspan="7" class="empty">No rows in the current filtered slice.</td></tr>';
}

function renderSavedSwimmers() {
  const saved = getSavedSwimmers();
  if (!saved.length) {
    els.savedSwimmers.className = 'chip-list empty';
    els.savedSwimmers.textContent = 'No saved swimmers yet.';
    return;
  }
  els.savedSwimmers.className = 'chip-list';
  els.savedSwimmers.innerHTML = saved.map(name => `
    <div class="chip">
      <span class="linkish" data-chip-swimmer="${encodeURIComponent(name)}">${name}</span>
      <button data-remove-swimmer="${encodeURIComponent(name)}">✕</button>
    </div>
  `).join('');
  document.querySelectorAll('[data-chip-swimmer]').forEach((el) => {
    el.addEventListener('click', () => {
      activeSwimmer = decodeURIComponent(el.dataset.chipSwimmer);
      renderSwimmerPanel(activeSwimmer);
    });
  });
  document.querySelectorAll('[data-remove-swimmer]').forEach((el) => {
    el.addEventListener('click', () => toggleSaveSwimmer(decodeURIComponent(el.dataset.removeSwimmer)));
  });
}

function renderDuplicateList() {
  const duplicates = [...new Map(
    filteredRows
      .filter(r => r.Alias_AutoLinked === 'Yes')
      .map(r => [`${r.Club}__${r.Swimmer_Raw}__${r.Canonical_Swimmer}`, r])
  ).values()];

  if (!duplicates.length) {
    els.duplicateList.className = 'small-list empty';
    els.duplicateList.textContent = 'No auto-linked variants in the current slice.';
    return;
  }

  els.duplicateList.className = 'small-list';
  els.duplicateList.innerHTML = duplicates.slice(0, 12).map(r => `
    <div class="small-item">
      <strong>${r.Club}</strong>
      <div>${r.Swimmer_Raw} → ${r.Canonical_Swimmer}</div>
      <div class="subtle">similarity ${r.Alias_Confidence}%</div>
    </div>
  `).join('');
}

function refreshFilters() {
  populateSelect(els.seasonFilter, uniqueSorted(allRows, 'Season'), 'All seasons', '2025/26');
  populateSelect(els.provinceFilter, uniqueSorted(allRows, 'Province'), 'All provinces', 'Valencia');
  populateSelect(els.venueFilter, uniqueSorted(allRows, 'Venue'), 'All venues');
  populateSelect(els.clubFilter, uniqueSorted(allRows, 'Club'), 'All clubs');
  populateSelect(els.strokeFilter, uniqueSorted(allRows, 'Stroke'), 'All strokes');
  populateSelect(els.eventFilter, uniqueSorted(allRows, 'Event'), 'All events');
}

async function loadDefaultCsv() {
  const response = await fetch(DEFAULT_CSV_PATH);
  const text = await response.text();
  allRows = parseCsv(text);
  refreshFilters();
  renderMainTable();
  renderSavedSwimmers();
}

function bindEvents() {
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderMainTable();
    });
  });

  [els.searchInput, els.seasonFilter, els.provinceFilter, els.venueFilter, els.clubFilter, els.strokeFilter, els.eventFilter]
    .forEach((el) => el.addEventListener('input', renderMainTable));

  els.clearFiltersBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    els.seasonFilter.value = '';
    els.provinceFilter.value = '';
    els.venueFilter.value = '';
    els.clubFilter.value = '';
    els.strokeFilter.value = '';
    els.eventFilter.value = '';
    activeSwimmer = null;
    renderMainTable();
  });

  els.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    allRows = parseCsv(text);
    activeSwimmer = null;
    refreshFilters();
    renderMainTable();
    renderSavedSwimmers();
  });

  els.resetDataBtn.addEventListener('click', async () => {
    activeSwimmer = null;
    await loadDefaultCsv();
  });
}

bindEvents();
loadDefaultCsv();
