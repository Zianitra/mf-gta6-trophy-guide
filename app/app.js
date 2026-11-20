// VICE GUIDE — offline trophy guide & tracker for GTA VI (PS5). Plain ES module, no build step, no network.
const KEY = 'gta6-trophy-checklist-v1';

const $ = (sel) => document.querySelector(sel);
const tiers = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const KIND_LABEL = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities' };

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const srcByName = new Map(doc.sources.map((s) => [s.name, s.url]));

// ---------------------------------------------------------------- state
let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let kind = 'all';
let grade = 'all';
let query = '';
let spoiler = false;

// Screenshot demo: seed a representative mid-run save so captures look lived-in.
if (new URLSearchParams(location.search).get('seed') === '1') {
  const seed = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 20, 21, 35];
  earned = new Set(seed);
  localStorage.setItem(KEY, JSON.stringify(seed));
}

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function toggle(id) {
  if (earned.has(id)) earned.delete(id);
  else earned.add(id);
  save();
  renderAll();
}

function isSpoiled(t) {
  return spoiler && t.spoiler && !earned.has(t.id);
}

// ---------------------------------------------------------------- helpers
function tierIcon(t) {
  return `<svg class="tier" viewBox="0 0 24 24"><use href="#i-trophy"></use></svg>`;
}

function sourceLinks(t) {
  return t.sources.map((n) => `<a href="${srcByName.get(n) ?? '#'}" target="_blank" rel="noopener noreferrer">${n}</a>`).join('');
}

// ---------------------------------------------------------------- stats
function renderStats() {
  const total = trophies.length;
  const n = earned.size;
  const pct = Math.round((n / total) * 100);
  $('#earned').textContent = n;
  $('#total').textContent = total;
  $('#stat-ring').style.setProperty('--pct', `${pct}%`);
  $('#stat-ring').querySelector('b').textContent = `${pct}%`;
  $('#bar-fill').style.width = `${pct}%`;

  const breakEl = $('#stat-break');
  breakEl.replaceChildren();
  for (const g of GRADE_ORDER) {
    const count = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    const tot = trophies.filter((t) => t.grade === g).length;
    const s = document.createElement('span');
    s.className = `g g-${g}`;
    s.textContent = `${g} ${count}/${tot}`;
    breakEl.append(s);
  }

  // chip counts by kind
  const kc = { story: 0, missable: 0, collectibles: 0, activities: 0 };
  for (const t of trophies) kc[t.kind]++;
  $('#c-all').textContent = total;
  $('#c-story').textContent = kc.story;
  $('#c-missable').textContent = trophies.filter((t) => t.missable).length;
  $('#c-collectibles').textContent = kc.collectibles;
  $('#c-activities').textContent = kc.activities;
}

// ---------------------------------------------------------------- tracker
function matches(t) {
  if (kind !== 'all') {
    if (kind === 'missable' ? !t.missable : t.kind !== kind) return false;
  }
  if (grade !== 'all' && t.grade !== grade) return false;
  if (query) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(query.toLowerCase())) return false;
  }
  return true;
}

function card(t) {
  const done = earned.has(t.id);
  const masked = isSpoiled(t);
  const el = document.createElement('article');
  el.className = `card grade-${t.grade}${done ? ' earned' : ''}`;

  const kindTag = `<span class="tag tag-kind ${t.kind}">${KIND_LABEL[t.kind]}</span>`;
  const missTag = t.missable ? `<span class="tag tag-miss">Missable</span>` : '';
  const spoilTag = masked ? `<span class="tag tag-spoil">Hidden</span>` : '';

  el.innerHTML = `
    ${tierIcon(t)}
    <div class="card-body">
      <div class="card-name${masked ? ' masked' : ''}">${masked ? 'Hidden Trophy' : t.name}</div>
      <p class="card-desc${masked ? ' masked' : ''}">${masked ? 'Earn this trophy to reveal its details.' : t.description}</p>
      <div class="tags">${kindTag}${missTag}${spoilTag}</div>
    </div>
    <button class="tick${done ? ' on' : ''}" type="button" title="Toggle earned" aria-label="Toggle earned">
      ${masked ? '<svg viewBox="0 0 24 24"><use href="#i-lock"></use></svg>' : '<svg viewBox="0 0 24 24"><use href="#i-check"></use></svg>'}
    </button>`;

  el.querySelector('.tick').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!masked) toggle(t.id);
  });
  el.addEventListener('click', () => { if (!masked) openDetail(t.id); });
  return el;
}

function renderTracker() {
  const grid = $('#grid');
  grid.replaceChildren();
  const list = trophies.filter(matches);
  $('#tracker-hint').textContent = `Showing ${list.length} of ${trophies.length} trophies`;
  if (list.length === 0) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'Nothing matches these filters.';
    grid.append(d);
    return;
  }
  for (const t of list) grid.append(card(t));
}

// ---------------------------------------------------------------- roadmap
function renderRoadmap() {
  const ol = $('#phases');
  ol.replaceChildren();
  for (const phase of doc.roadmap) {
    const items = trophies.filter((t) => t.phase === phase.phase);
    const done = items.filter((t) => earned.has(t.id)).length;
    const li = document.createElement('li');
    li.className = 'phase';

    const pills = items.map((t) => {
      const isDone = earned.has(t.id);
      const masked = isSpoiled(t);
      const dot = `<span class="g dot-${t.grade}"></span>`;
      const miss = t.missable ? `<span class="m">!</span>` : '';
      const name = masked ? 'Hidden' : t.name;
      return `<button class="pill${isDone ? ' done' : ''}${t.missable ? ' miss' : ''}" data-id="${t.id}" type="button">${dot}${name}${miss}</button>`;
    }).join('');

    li.innerHTML = `
      <div class="phase-top">
        <span class="phase-num">Phase ${phase.phase}</span>
        <span class="phase-title">${phase.title}</span>
        <span class="phase-count">${done}/${items.length} earned</span>
      </div>
      <p class="phase-blurb">${phase.blurb}</p>
      <ul class="phase-tips">${phase.tips.map((x) => `<li>${x}</li>`).join('')}</ul>
      <div class="phase-trophies">${pills}</div>`;

    li.querySelectorAll('.pill').forEach((b) => {
      b.addEventListener('click', () => openDetail(Number(b.dataset.id)));
    });
    ol.append(li);
  }
}

// ---------------------------------------------------------------- detail
function openDetail(id) {
  const t = byId.get(id);
  if (!t) return;
  const masked = isSpoiled(t);
  const done = earned.has(t.id);
  const inner = $('#detail-inner');

  const name = masked ? 'Hidden Trophy' : t.name;
  const desc = masked ? 'Earn this trophy to reveal its details.' : t.description;

  inner.innerHTML = `
    <button class="detail-close" type="button" aria-label="Close">✕</button>
    <div class="detail-head grade-${t.grade}">
      ${tierIcon(t)}
      <div>
        <div class="detail-grade">${t.grade}</div>
        <h3>${name}</h3>
        <p class="detail-desc">${desc}</p>
      </div>
    </div>
    <div class="tags">
      <span class="tag tag-kind ${t.kind}">${KIND_LABEL[t.kind]}</span>
      ${t.missable ? '<span class="tag tag-miss">Missable</span>' : ''}
      ${t.spoiler ? '<span class="tag tag-spoil">Spoiler</span>' : ''}
      <span class="tag tag-kind">Phase ${t.phase}</span>
    </div>
    ${masked ? '' : `
      <div class="detail-section">
        <h4>How to get it</h4>
        <p>${t.guide}</p>
      </div>
      <div class="detail-section">
        <h4>Where</h4>
        <p>${t.where}</p>
      </div>
      ${t.missableNote ? `<div class="miss-note"><b>Missable:</b> ${t.missableNote}</div>` : ''}
      <div class="detail-section">
        <h4>Sources</h4>
        <div class="sources">${sourceLinks(t)}</div>
      </div>
    `}
    <div class="detail-foot">
      <span class="hint" style="margin:0">Checklist is saved in this browser (localStorage).</span>
      <button class="btn mark-btn${done ? ' done' : ''}" id="mark" type="button">${done ? '✓ Earned — tap to undo' : 'Mark as earned'}</button>
    </div>`;

  $('#mark').addEventListener('click', () => {
    toggle(t.id);
    openDetail(t.id);
    renderTracker();
    renderRoadmap();
    renderStats();
  });
  inner.querySelector('.detail-close').addEventListener('click', () => $('#detail').close());
  $('#detail').showModal();
}

// ---------------------------------------------------------------- views
function setView(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
}

function renderAll() {
  renderStats();
  renderTracker();
  renderRoadmap();
}

// ---------------------------------------------------------------- routing
function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  $('#detail').close();
  if (hash.startsWith('roadmap')) {
    setView('roadmap');
  } else if (hash.startsWith('trophy/')) {
    setView('tracker');
    openDetail(Number(hash.slice('trophy/'.length)));
  } else {
    setView('tracker');
  }
}

// ---------------------------------------------------------------- wiring
$('#spoiler').addEventListener('click', () => {
  spoiler = !spoiler;
  const btn = $('#spoiler');
  btn.classList.toggle('on', spoiler);
  btn.setAttribute('aria-pressed', String(spoiler));
  btn.querySelector('span').textContent = spoiler ? 'ON' : 'OFF';
  renderAll();
});

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  location.hash = b.dataset.view === 'roadmap' ? '/roadmap' : '/tracker';
}));

document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
  kind = c.dataset.kind;
  document.querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x === c));
  renderTracker();
}));

$('#grade').addEventListener('change', (e) => { grade = e.target.value; renderTracker(); });
$('#search').addEventListener('input', (e) => { query = e.target.value.trim(); renderTracker(); });

$('#export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ game: doc.game, platform: doc.platform, earned: [...earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const arr = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(arr)) throw new Error('bad shape');
    earned = new Set(arr.map((x) => Number(x)).filter((x) => byId.has(x)));
    save();
    renderAll();
  } catch {
    alert('Could not read that file. Expected a JSON export from this tracker.');
  }
  e.target.value = '';
});

$('#detail').addEventListener('click', (e) => { if (e.target === $('#detail')) $('#detail').close(); });

window.addEventListener('hashchange', route);

// ---------------------------------------------------------------- boot
renderAll();
route();
