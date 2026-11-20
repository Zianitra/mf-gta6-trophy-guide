// GTA VI trophy tracker & guide: localStorage ticks, export/import, filters by kind,
// spoiler mode hiding story trophies until earned, roadmap view, detail dialog.
const KEY = 'gta6-trophy-checklist';
const KEY_SPOILER = 'gta6-trophy-spoiler';
const rows = document.getElementById('rows');
const gradeSel = document.getElementById('grade');
const spoilerBox = document.getElementById('spoiler');
const spoilerNote = document.getElementById('spoiler-note');
const dialog = document.getElementById('trophy-dialog');

let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let filter = 'all';
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

function isSpoiled(t) {
  return spoilerBox.checked && t.kind === 'story' && !earned.has(t.name);
}

function gradeClass(t) {
  return 'g-' + t.grade;
}

function render() {
  rows.replaceChildren();
  const list = trophies
    .filter(t => filter === 'all' || (filter === 'missable' ? t.missable : t.kind === filter))
    .filter(t => gradeSel.value === 'all' || t.grade === gradeSel.value)
    .sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
  for (const t of list) {
    const done = earned.has(t.name);
    const spoiled = isSpoiled(t);
    const li = document.createElement('li');
    li.className = ['trophy', gradeClass(t), done ? 'done' : '', spoiled ? 'spoiled' : ''].join(' ');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = done;
    box.setAttribute('aria-label', 'Mark ' + (spoiled ? 'story trophy' : t.name));
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      save();
      render();
    });

    const medal = document.createElement('div');
    medal.className = 'medal ' + t.grade;

    const main = document.createElement('div');
    main.className = 't-main';
    const name = document.createElement('h3');
    name.textContent = spoiled ? '· · · story trophy — mark earned to reveal · · ·' : t.name;
    const desc = document.createElement('p');
    desc.className = 't-desc';
    desc.textContent = spoiled ? 'Description hidden in spoiler mode.' : t.description;
    main.append(name, desc);

    const meta = document.createElement('div');
    meta.className = 't-meta';
    const tags = [];
    if (t.missable) tags.push('MISSABLE');
    tags.push(t.kind);
    for (const tag of tags) {
      const s = document.createElement('span');
      s.className = 'tag' + (tag === 'MISSABLE' ? ' miss' : '');
      s.textContent = tag;
      meta.append(s);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'detail-btn';
    btn.textContent = 'Guide';
    btn.addEventListener('click', () => openDetail(t));

    li.append(box, medal, main, meta, btn);
    rows.append(li);
  }
  const pct = Math.round((earned.size / trophies.length) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-count').textContent = earned.size;
}

function openDetail(t) {
  const spoiled = isSpoiled(t);
  const d = document.getElementById('trophy-detail');
  d.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = spoiled ? 'Spoiler hidden — mark this trophy earned first' : t.name;
  h.className = gradeClass(t);
  d.append(h);
  if (!spoiled) {
    const desc = document.createElement('p');
    desc.className = 'd-desc';
    desc.textContent = '"' + t.description + '"';
    d.append(desc);
    const tags = document.createElement('p');
    tags.className = 'd-tags';
    tags.textContent = t.grade.toUpperCase() + ' · ' + t.kind + (t.missable ? ' · MISSABLE' : '');
    d.append(tags);
    for (const para of t.guide.split('\n')) {
      const p = document.createElement('p');
      p.className = 'd-guide';
      p.textContent = para;
      d.append(p);
    }
    if (t.missable_note) {
      const note = document.createElement('p');
      note.className = 'd-note';
      note.textContent = 'Missability: ' + t.missable_note;
      d.append(note);
    }
  }
  const mark = document.createElement('button');
  mark.type = 'button';
  mark.textContent = earned.has(t.name) ? 'Mark NOT earned' : 'Mark earned';
  mark.addEventListener('click', () => {
    if (earned.has(t.name)) earned.delete(t.name); else earned.add(t.name);
    save();
    render();
    openDetail(t);
  });
  d.append(mark);
  dialog.showModal();
}

// Filters
document.getElementById('filters').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-filter]');
  if (!chip) return;
  filter = chip.dataset.filter;
  for (const c of document.querySelectorAll('.chip')) c.classList.toggle('active', c === chip);
  render();
});
// Deep links: ?view=roadmap jumps to the roadmap, ?trophy=<id> opens that trophy's guide.
{
  const q = new URLSearchParams(location.search);
  if (q.get('view') === 'roadmap') showView('roadmap');
  const id = Number(q.get('trophy'));
  if (id) {
    const t = trophies.find(x => x.id === id);
    if (t) openDetail(t);
  }
}

render();


gradeSel.addEventListener('change', render);

// Spoiler mode
spoilerBox.checked = localStorage.getItem(KEY_SPOILER) === '1';
spoilerNote.hidden = !spoilerBox.checked;
spoilerBox.addEventListener('change', () => {
  localStorage.setItem(KEY_SPOILER, spoilerBox.checked ? '1' : '0');
  spoilerNote.hidden = !spoilerBox.checked;
  render();
});

// Export / import
document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ earned: [...earned] }, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const parsed = JSON.parse(await file.text());
  const list = Array.isArray(parsed) ? parsed : parsed.earned;
  earned = new Set(list);
  save();
  render();
});

// Views
function showView(name) {
  document.getElementById('view-tracker').hidden = name !== 'tracker';
  document.getElementById('view-roadmap').hidden = name !== 'roadmap';
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.id === 'nav-' + name);
  }
}
document.getElementById('nav-tracker').addEventListener('click', () => showView('tracker'));
document.getElementById('nav-roadmap').addEventListener('click', () => showView('roadmap'));

// Roadmap
{
  const body = document.getElementById('roadmap-body');
  const intro = document.createElement('p');
  intro.className = 'rm-intro';
  intro.textContent = doc.roadmap.intro;
  body.append(intro);
  for (const ph of doc.roadmap.phases) {
    const card = document.createElement('div');
    card.className = 'rm-phase';
    const n = document.createElement('div');
    n.className = 'rm-num';
    n.textContent = ph.n;
    const txt = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = ph.title;
    const t = document.createElement('p');
    t.className = 'rm-trophies';
    t.textContent = ph.trophies;
    const d = document.createElement('p');
    d.textContent = ph.detail;
    txt.append(h, t, d);
    card.append(n, txt);
    body.append(card);
  }
  const src = document.createElement('div');
  src.className = 'rm-sources';
  const sh = document.createElement('h3');
  sh.textContent = 'Sources';
  src.append(sh);
  for (const s of doc.sources) {
    const p = document.createElement('p');
    p.textContent = s;
    src.append(p);
  }
  body.append(src);
}

render();
