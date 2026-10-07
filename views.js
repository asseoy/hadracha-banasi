/* הדרכה בנשיא — shell, navigation, home, library, reader, my work */
'use strict';

/* ================================================================ navigation */
const Nav = {
  stack: [{ view: 'home', params: {} }],
  get cur() { return this.stack[this.stack.length - 1]; },
  go(view, params = {}, { replace = false } = {}) {
    this.cur.scroll = window.scrollY;
    if (replace) this.stack[this.stack.length - 1] = { view, params };
    else this.stack.push({ view, params });
    render(true);
  },
  tab(view, params = {}) {   // bottom-nav: reset stack
    this.cur.scroll = window.scrollY;
    if (this.cur.view === view && this.stack.length === 1 && !Object.keys(params).length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    this.stack = [{ view, params }];
    render(true);
  },
  back() {
    if (Sheet.open) { Sheet.close(); return; }
    if (this.stack.length > 1) { this.stack.pop(); render(false); }
  },
};

/* ================================================================ sheets */
const Sheet = {
  open: false, onClose: null,
  show({ title = '', body = '', foot = '', tall = false, wide = false, onClose = null, onMount = null } = {}) {
    this.close(true);
    const ov = $('#overlay');
    ov.innerHTML = `<div class="scrim"></div>
      <div class="sheet ${tall ? 'tall' : ''} ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="sheet-grab"></div>
        <div class="sheet-head"><h2>${title}</h2><button class="iconbtn" data-close aria-label="סגירה">${ic('x')}</button></div>
        <div class="sheet-body">${body}</div>
        ${foot ? `<div class="sheet-foot">${foot}</div>` : ''}
      </div>`;
    const sheet = ov.querySelector('.sheet'), scrim = ov.querySelector('.scrim');
    requestAnimationFrame(() => { scrim.classList.add('open'); sheet.classList.add('open'); });
    scrim.onclick = () => this.close();
    ov.querySelector('[data-close]').onclick = () => this.close();
    this.open = true; this.onClose = onClose;
    // swipe down to close (mobile)
    let y0 = null;
    const grab = ov.querySelector('.sheet-grab'), head = ov.querySelector('.sheet-head');
    for (const el of [grab, head]) {
      el.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
      el.addEventListener('touchmove', e => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
      el.addEventListener('touchend', e => { const dy = (e.changedTouches[0].clientY - (y0 ?? 0)); sheet.style.transform = ''; y0 = null; if (dy > 90) this.close(); });
    }
    document.addEventListener('keydown', this._esc = e => { if (e.key === 'Escape') this.close(); });
    if (onMount) onMount(sheet);
    const first = sheet.querySelector('[autofocus]');
    if (first && matchMedia('(min-width:760px)').matches) setTimeout(() => first.focus(), 60);
    return sheet;
  },
  close(silent) {
    if (!this.open) return;
    const ov = $('#overlay');
    const sheet = ov.querySelector('.sheet'), scrim = ov.querySelector('.scrim');
    sheet && sheet.classList.remove('open'); scrim && scrim.classList.remove('open');
    this.open = false;
    document.removeEventListener('keydown', this._esc);
    const cb = this.onClose; this.onClose = null;
    if (silent) ov.innerHTML = ''; else setTimeout(() => { if (!this.open) ov.innerHTML = ''; }, 240);
    if (cb) cb();
  },
  body() { return $('#overlay .sheet-body'); },
};

/* ================================================================ shell */
const NAV_ITEMS = [
  { view: 'home', name: 'בית', icon: 'home' },
  { view: 'library', name: 'ספרייה', icon: 'library' },
  { view: 'create', name: 'יצירה', icon: 'plus', create: true },
  { view: 'work', name: 'העבודה שלי', icon: 'work' },
];
function rootView() { return Nav.stack[0].view; }

function shell() {
  const app = $('#app');
  if (app.dataset.ready) return;
  app.dataset.ready = '1';
  app.innerHTML = `
  <nav class="rail" aria-label="ניווט ראשי">
    <div class="brand">${brandMark()}<div class="brand-name">הדרכה <span>בנשיא</span></div></div>
    <button class="railbtn create" data-nav="create">${ic('plus')}יצירה חדשה</button>
    ${NAV_ITEMS.filter(n => !n.create).map(n => `<button class="railbtn" data-nav="${n.view}">${ic(n.icon)}${n.name}</button>`).join('')}
    <div class="rail-foot" id="railfoot"></div>
  </nav>
  <div class="shell-col">
    <header class="topbar" id="topbar"><div class="topbar-in" id="topbar-in"></div></header>
    <main id="main" tabindex="-1"></main>
  </div>
  <nav class="bottomnav" aria-label="ניווט ראשי"><div class="bottomnav-in">
    ${NAV_ITEMS.map(n => `<button class="navbtn ${n.create ? 'create' : ''}" data-nav="${n.view}" aria-label="${n.name}">
      ${n.create ? `<span class="plus">${ic('plus', 'lg')}</span>` : ic(n.icon, 'lg')}<span>${n.name}</span></button>`).join('')}
  </div></nav>`;
  app.addEventListener('click', e => {
    const nb = e.target.closest('[data-nav]');
    if (nb) { const v = nb.dataset.nav; if (v === 'create') openCreate(); else Nav.tab(v); }
  });
  window.addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });
}
function brandMark() {
  return `<img class="brand-logo" src="img/logo-96.png" alt="" width="38" height="38" onerror="this.onerror=null;this.src=this.src.replace('/img/','/')">`;
}

function topbar({ title = '', sub = '', back = Nav.stack.length > 1, actions = '', brand = false } = {}) {
  $('#topbar').classList.toggle('flat', !!brand);
  $('#topbar-in').innerHTML = `
    ${back ? `<button class="iconbtn" id="tb-back" aria-label="חזרה">${ic('back')}</button>` : ''}
    ${brand ? `<div class="brand">${brandMark()}<div class="brand-name">הדרכה <span>בנשיא</span></div></div>` : `<div class="tb-title">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`}
    ${actions}`;
  const b = $('#tb-back'); if (b) b.onclick = () => Nav.back();
  for (const el of $$('[data-nav]')) el.setAttribute('aria-current', el.dataset.nav === rootView() ? 'page' : 'false');
}
function saveStateHtml() {
  const c = Store.cloud;
  if (c === 'synced') return `<span class="savestate" title="נשמר ומסונכרן לחשבון">${ic('cloudok')}נשמר</span>`;
  if (c === 'syncing') return `<span class="savestate">${ic('cloud')}שומר…</span>`;
  if (c === 'error') return `<span class="savestate" title="הסנכרון נכשל — העבודה שמורה במכשיר">${ic('device')}במכשיר</span>`;
  return `<span class="savestate" title="נשמר בדפדפן הזה">${ic('device')}נשמר</span>`;
}

/* ================================================================ render loop */
let mounted = null;
// ids of items open anywhere in the navigation stack (never discarded)
function navIds() {
  const s = new Set();
  for (const e of Nav.stack) { if (e.params?.id) s.add(e.params.id); if (e.params?.pick?.id) s.add(e.params.pick.id); }
  if (insertTarget) s.add(insertTarget.id);
  return s;
}
function render(fresh) {
  shell();
  Store.cleanup(navIds());
  if (mounted && mounted.unmount) mounted.unmount();
  mounted = null;
  const { view, params, scroll } = Nav.cur;
  // a fresh <main> per view, so listeners from the previous view never pile up
  const old = $('#main');
  const main = old.cloneNode(false);
  old.replaceWith(main);
  const V = VIEWS[view] || VIEWS.home;
  mounted = V(main, params) || null;
  window.scrollTo(0, fresh ? 0 : (scroll || 0));
  updateRailFoot();
}
function updateRailFoot() {
  const f = $('#railfoot'); if (!f) return;
  const n = Store.list().length;
  f.innerHTML = `${saveStateHtml()}<div style="margin-top:6px">${Lib.activities().length} פעולות בספרייה · ${n} שלי</div>`;
}
Store.on(w => {
  if (w === 'cloud') { for (const el of $$('[data-savestate]')) el.innerHTML = saveStateHtml(); updateRailFoot(); }
  if (w === 'remote' && mounted && mounted.onRemote) mounted.onRemote();
  if (w === 'work' || w === 'remote') idle(() => Lib.buildIndex());
});

const VIEWS = {};

/* ================================================================ HOME */
VIEWS.home = (main) => {
  topbar({ brand: true, back: false, actions: `<span data-savestate>${saveStateHtml()}</span><button class="iconbtn" id="settings-btn" aria-label="הגדרות">${ic('sliders')}</button>` });
  $('#settings-btn').onclick = openSettings;
  const mine = Store.list();
  const drafts = mine.slice(0, 8);
  const seasonal = Lib.seasonal(10);
  const acts = Lib.activities();
  const comps = Lib.comps;
  const favIds = Object.keys(Store.prefs.favs).sort((a, b) => Store.prefs.favs[b] - Store.prefs.favs[a]).slice(0, 8);
  const recent = Store.prefs.recent.filter(id => Lib.doc(id) || Lib.comp(id)).slice(0, 6);
  const stat = (n, label, tab) => `<button class="stat" data-lib="${tab}"><b class="num">${n}</b><span>${label}</span></button>`;
  const topicCounts = Lib.topics.map(t => [t, acts.filter(a => (a.tags || []).includes(t)).length]).filter(x => x[1]);
  main.innerHTML = `
  <section class="hero">
    <div class="hero-in">
      <div><span class="kicker">שבט הנשיא · ספריית ההדרכה</span>
        <h1>הדרכה<br>בנשיא</h1>
        <p>כל הפעולות, תיקי הטיול והמאגרים של השבט. מחפשים, משכפלים ובונים מחדש.</p></div>
      <img class="hero-logo" src="img/logo-192.png" alt="הסמל של שבט הנשיא" width="118" height="118" onerror="this.onerror=null;this.src=this.src.replace('/img/','/')">
    </div>
    <label class="searchbox" for="home-q">${ic('search')}<input id="home-q" type="search" placeholder="חיפוש פעולה, משחק, טקסט או נושא" enterkeyhint="search" autocomplete="off"></label>
    <div class="statgrid">
      ${stat(acts.length, 'פעולות', 'act')}${stat(comps.filter(c => c.type === 'game').length, 'משחקים', 'game')}${stat(comps.filter(c => c.type === 'text').length, 'טקסטים', 'text')}${stat(comps.filter(c => c.type === 'questions').length, 'דיונים', 'questions')}${stat(Lib.docs.filter(d => d.kind === 'trip').length, 'תיקי טיול', 'trips')}
    </div>
  </section>
  <div class="newrow">
    <button class="btn primary" data-create="activity">${ic('plus')}פעולה חדשה</button>
    <button class="btn" data-create="trip">${ic('tent')}תיק טיול</button>
    <button class="btn" data-create="seminar">${ic('users')}סמינר</button>
  </div>
  ${drafts.length ? `<section class="section"><div class="sec-head"><h2>בעבודה</h2><button class="link" data-go="work">הכל</button></div>
    <div class="list">${drafts.slice(0, 5).map(workRow).join('')}</div></section>` : ''}
  ${seasonal.length ? `<section class="section"><div class="sec-head"><h2>הועברו בתקופה הזו בשנה</h2><button class="link" data-lib="act" data-sort="year">לפי שנת הפעילות</button></div>
    <div class="list">${seasonal.slice(0, 5).map(d => docRow(d)).join('')}</div></section>` : ''}
  ${favIds.length ? `<section class="section"><div class="sec-head"><h2>שמורים</h2><button class="link" data-lib="favs">הכל</button></div>
    <div class="list">${favIds.slice(0, 4).map(id => anyRow(id)).join('')}</div></section>` : ''}
  <section class="section"><div class="sec-head"><h2>נושאים</h2></div>
    <div class="index">${topicCounts.map(([t, n]) => `<button data-topic="${esc(t)}"><span>${esc(t)}</span><span class="num">${n}</span></button>`).join('')}</div>
  </section>
  ${recent.length ? `<section class="section"><div class="sec-head"><h2>נצפו לאחרונה</h2></div><div class="list">${recent.slice(0, 4).map(id => anyRow(id)).join('')}</div></section>` : ''}
  <section class="section"><div class="sec-head"><h2>כלים</h2></div>
    <div class="list">
      <div class="row" role="button" tabindex="0" data-tool="groups"><span class="ic">${ic('shuffle')}</span><div class="bd"><h3>חלוקה לקבוצות</h3><div class="meta"><span>רשימת שמות ← קבוצות מאוזנות לסמינר, לתחנות או לאחוות</span></div></div></div>
      <div class="row" role="button" tabindex="0" data-doc="pdf-trip-helper"><span class="ic">${ic('book')}</span><div class="bd"><h3>עזרים לכתיבת תיק טיול</h3><div class="meta"><span>משחקי אוטובוס ומסלול, משחקים משודרגים, זמני צופיות, שלבי נקודת מבט</span></div></div></div>
    </div>
  </section>`;
  const q = $('#home-q');
  q.addEventListener('keydown', e => { if (e.key === 'Enter' && q.value.trim()) Nav.tab('library', { q: q.value.trim() }); });
  q.addEventListener('input', debounce(() => { if (q.value.trim().length >= 2) Nav.tab('library', { q: q.value.trim(), focus: true }); }, 450));
  bindCommon(main);
  main.addEventListener('click', e => {
    const t = e.target.closest('[data-topic]'); if (t) Nav.tab('library', { tab: 'act', topic: t.dataset.topic });
    const l = e.target.closest('[data-lib]'); if (l) Nav.tab('library', { tab: l.dataset.lib, sort: l.dataset.sort, q: '' });
    const tl = e.target.closest('[data-tool]'); if (tl) openGroupsTool();
  });
  return { onRemote: () => render(false) };
};

/* shared click handlers: rows, cards, favorite stars */
function bindCommon(root) {
  root.addEventListener('click', e => {
    const fav = e.target.closest('[data-fav]');
    if (fav) { e.stopPropagation(); const on = Store.toggleFav(fav.dataset.fav); fav.classList.toggle('on', on); fav.innerHTML = ic('star') + ''; fav.querySelector('svg').style.fill = on ? 'currentColor' : 'none'; toast(on ? 'נשמר לשמורים' : 'הוסר מהשמורים'); return; }
    const d = e.target.closest('[data-doc]'); if (d) { Nav.go('doc', { id: d.dataset.doc }); return; }
    const c = e.target.closest('[data-comp]'); if (c) { openComp(c.dataset.comp); return; }
    const s = e.target.closest('[data-snip]'); if (s) { openSnippet(s.dataset.snip); return; }
    const w = e.target.closest('[data-open]'); if (w) { openWork(w.dataset.open); return; }
    const g = e.target.closest('[data-go]'); if (g) { Nav.tab(g.dataset.go); return; }
    const cr = e.target.closest('[data-create]'); if (cr) { if (cr.dataset.create === 'activity') openNewActivity(); else newPlan(cr.dataset.create); return; }
  });
}

function favBtn(id) {
  const on = Store.isFav(id);
  return `<button class="iconbtn fav ${on ? 'on' : ''}" data-fav="${id}" aria-label="${on ? 'הסרה מהשמורים' : 'שמירה'}" style="width:36px;height:36px"><svg class="svg" viewBox="0 0 24 24" style="fill:${on ? 'currentColor' : 'none'}">${ICONS.star}</svg></button>`;
}

function docIcon(d) {
  if (d.kind === 'trip' || d.kind === 'trip-appendix') return ['tent', 'k-content'];
  if (d.kind && d.kind.startsWith('seminar')) return ['users', 'k-content'];
  if (d.kind === 'guide') return ['book', 'k-text'];
  if (d.kind === 'resource' || d.kind === 'collection' || d.kind === 'attachment') return ['box', 'k-summary'];
  return ({ course: ['tie', 'k-activity'], memorial: ['flag', 'k-pov'], peak: ['bolt', 'k-game'], home: ['home', 'k-activity'], zoom: ['device', 'k-discussion'], holiday: ['spark', 'k-text'], tribe: ['flag', 'k-summary'] }[d.cat]) || ['bolt', 'k-activity'];
}
function docKindName(d) {
  return { trip: 'תיק טיול', 'trip-appendix': 'נספח לתיק טיול', seminar: 'סמינר', 'seminar-sheet': 'גיליון סמינר', guide: 'מדריך', resource: 'מאגר', collection: 'מאגר', attachment: 'קובץ בדרייב' }[d.kind] || CATS[d.cat] || 'פעולה';
}
function docRow(d, q) {
  const [icn, kc] = docIcon(d);
  const sn = q ? snippet(Lib.bodyOf(d), q) : esc((d.goal || d.headline || '').slice(0, 150));
  return `<div class="row" role="button" tabindex="0" data-doc="${d.id}">
    <span class="ic ${kc}">${ic(icn)}</span>
    <div class="bd"><h3>${esc(d.title)}</h3>
      <div class="meta">${[esc(docKindName(d)), d.date ? esc(d.date) : '', d.minutes ? fmtMin(d.minutes) : '', ...(d.tags || []).slice(0, 2).map(esc)].filter(Boolean).map(x => `<span>${x}</span>`).join('<i class="dot"></i>')}</div>
      ${sn ? `<div class="snip">${sn}</div>` : ''}</div>
    <div class="end">${favBtn(d.id)}</div></div>`;
}
function compRow(c, q) {
  const T = COMP_TYPES[c.type] || COMP_TYPES.method;
  const from = c.from && Lib.doc(c.from);
  const sub = c.role ? GAME_ROLES[c.role] || '' : T.one;
  const sn = q ? snippet(c.body, q) : esc(plainMd(c.body || '').replace(/\s+/g, ' ').slice(0, 140));
  return `<div class="row" role="button" tabindex="0" data-comp="${c.id}">
    <span class="ic k-${T.k}">${ic(T.icon)}</span>
    <div class="bd"><h3>${esc(c.title)}</h3>
      <div class="meta"><span>${esc(sub)}</span>${c.count ? `<i class="dot"></i><span>${c.count} שאלות</span>` : ''}${from ? `<i class="dot"></i><span>מתוך: ${esc(from.title)}</span>` : ''}</div>
      ${sn ? `<div class="snip">${sn}</div>` : ''}</div>
    <div class="end">${favBtn(c.id)}</div></div>`;
}
function anyRow(id, q) {
  const d = Lib.doc(id); if (d) return docRow(d, q);
  const c = Lib.comp(id); if (c) return compRow(c, q);
  const s = (Store.prefs.snippets || []).find(x => x.id === id); if (s) return snipRow(s);
  const w = Store.get(id); if (w) return workRow(w);
  return '';
}
function snipRow(s) {
  return `<div class="row" role="button" tabindex="0" data-snip="${s.id}"><span class="ic k-${s.kind || 'activity'}">${ic('heart')}</span>
    <div class="bd"><h3>${esc(s.title || 'קטע ששמרתי')}</h3><div class="meta"><span>קטע ששמרתי</span><i class="dot"></i><span>${esc(kindOf(s.kind).name)}</span></div>
    <div class="snip">${esc(plainMd(s.body).slice(0, 140))}</div></div></div>`;
}
function workRow(w) {
  const p = progressOf(w);
  return `<div class="row" role="button" tabindex="0" data-open="${w.id}"><span class="ic ${w.type === 'activity' ? 'k-activity' : 'k-content'}">${ic(w.type === 'activity' ? 'bolt' : w.type === 'trip' ? 'tent' : 'users')}</span>
    <div class="bd"><h3>${esc(w.title || 'ללא שם')}</h3><div class="meta"><span>שלי · ${typeName(w)}</span><i class="dot"></i><span>${ago(w.updatedAt)}</span></div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:8px"><div class="progress ${p < 60 ? 'warn' : ''}"><i style="width:${p}%"></i></div><span class="faint num" style="font-size:12px">${p}%</span></div></div></div>`;
}
function typeName(w) { return w.type === 'activity' ? (w.isTemplate ? 'תבנית' : 'פעולה') : w.type === 'trip' ? 'תיק טיול' : 'סמינר'; }
function progressOf(w) {
  try { return w.type === 'activity' ? activityChecks(w).score : planChecks(w).score; } catch { return 0; }
}
function workCard(w) {
  const p = progressOf(w);
  const sub = w.type === 'activity' ? `${(w.segments || []).length} חלקים · ${fmtMin(totalMinutes(w))}` : `${(w.sections || []).length} חלקים${w.dateFrom ? ' · ' + fmtDate(w.dateFrom) : ''}`;
  return `<button class="wcard" data-open="${w.id}">
    <div class="top"><span class="tag ${w.type === 'activity' ? 'khaki' : 'red'}">${typeName(w)}</span><span class="faint" style="font-size:12px;margin-inline-start:auto">${ago(w.updatedAt)}</span></div>
    <h3>${esc(w.title || 'ללא שם')}</h3>
    <div class="muted" style="font-size:13px">${esc(sub)}</div>
    <div class="foot"><div class="progress ${p < 60 ? 'warn' : ''}"><i style="width:${p}%"></i></div><span class="num">${p}%</span></div>
  </button>`;
}
function openWork(id) {
  const w = Store.get(id); if (!w) return;
  if (w.type === 'activity') Nav.go('edit', { id }); else Nav.go('plan', { id });
}

/* ================================================================ LIBRARY */
const LIB_TABS = [
  { id: 'all', name: 'הכל' },
  { id: 'act', name: 'פעולות' },
  { id: 'game', name: 'משחקים' },
  { id: 'text', name: 'טקסטים' },
  { id: 'questions', name: 'שאלות לדיון' },
  { id: 'method', name: 'הפעלות' },
  { id: 'trips', name: 'טיולים וסמינרים' },
  { id: 'skills', name: 'צופיות ובוקר/לילה' },
  { id: 'favs', name: 'שמורים' },
];

VIEWS.library = (main, params) => {
  const st = Object.assign({ q: '', tab: 'all', cat: null, topic: null, aud: null, role: null, video: false, sort: null, shown: 40 }, LS.get('libstate', {}), params);
  if (params.q !== undefined || params.tab || params.topic) { st.shown = 40; }
  if (params.topic) { st.tab = 'act'; st.cat = null; }
  const picking = params.pick;   // inserting into a work item
  topbar({ title: picking ? 'הוספה מהספרייה' : 'ספרייה', sub: picking ? 'בחרו מה להוסיף' : '', back: Nav.stack.length > 1 });
  main.innerHTML = `
    <div class="lib-head">
      <label class="searchbox" for="lib-q">${ic('search')}<input id="lib-q" type="search" value="${esc(st.q)}" placeholder="חיפוש בכל החומרים…" enterkeyhint="search" autocomplete="off">
        <button class="iconbtn" id="lib-clear" aria-label="ניקוי" style="width:36px;height:36px" ${st.q ? '' : 'hidden'}>${ic('x')}</button></label>
      <div class="seg" id="lib-tabs" role="tablist"></div>
      <div class="filters" id="lib-filters"></div>
    </div>
    <div class="lib-layout" id="lib-layout">
      <div><div class="resinfo" id="lib-info"></div><div class="list" id="lib-list"></div><div class="more" id="lib-more"></div></div>
      <aside class="preview card" id="lib-preview"></aside>
    </div>`;
  const qEl = $('#lib-q');
  if (params.focus || params.pick) setTimeout(() => { qEl.focus(); const v = qEl.value; qEl.value = ''; qEl.value = v; }, 30);

  function save() { const { shown, ...keep } = st; LS.set('libstate', { tab: keep.tab, sort: keep.sort }); }

  function candidates() {
    const q = st.q.trim();
    const t = st.tab;
    const favs = Store.prefs.favs;
    const pass = (kind, obj) => {
      if (t === 'favs') return !!favs[obj.id || obj.ref];
      if (t === 'all') return true;
      if (t === 'act') return kind === 'doc' && obj.kind === 'activity';
      if (t === 'trips') return kind === 'doc' && /trip|seminar|guide/.test(obj.kind);
      if (t === 'skills') return kind === 'comp' && (obj.type === 'skill' || obj.type === 'idea' || obj.type === 'trip-part');
      return kind === 'comp' && obj.type === t;
    };
    const extra = (kind, obj) => {
      if (t === 'act' || (t === 'all' && kind === 'doc')) {
        if (st.cat && obj.cat !== st.cat) return false;
        if (st.topic && !(obj.tags || []).includes(st.topic)) return false;
        if (st.aud && obj.audience !== st.aud) return false;
        if (st.video && !(obj.videos || []).length) return false;
      }
      if (t === 'game' && st.role && obj.role !== st.role) return false;
      return true;
    };
    if (q) {
      const res = Search.query(q, it => {
        if (it.kind === 'work') return t === 'all';
        if (it.kind === 'snip') return t === 'all' || t === 'favs';
        const obj = it.kind === 'doc' ? Lib.doc(it.ref) : Lib.comp(it.ref);
        return obj && pass(it.kind, obj) && extra(it.kind, obj);
      });
      return { q, items: res.map(r => ({ id: r.it.ref, kind: r.it.kind, full: r.full })) };
    }
    let items = [];
    if (t === 'favs') items = Object.keys(favs).sort((a, b) => favs[b] - favs[a]).map(id => ({ id, kind: Lib.doc(id) ? 'doc' : 'comp' }))
      .concat((Store.prefs.snippets || []).map(s => ({ id: s.id, kind: 'snip' })));
    else {
      const docs = Lib.docs.filter(d => d.kind !== 'attachment' && !d.private && pass('doc', d) && extra('doc', d));
      const comps = (t === 'all' || t === 'act' || t === 'trips') ? [] : Lib.comps.filter(c => pass('comp', c) && extra('comp', c));
      items = docs.map(d => ({ id: d.id, kind: 'doc' })).concat(comps.map(c => ({ id: c.id, kind: 'comp' })));
    }
    // sorting (scouting year runs September → August)
    const sort = st.sort || (t === 'act' || t === 'all' ? 'year' : 'az');
    const yearPos = d => { if (!d || !d.date) return 999; const [dd, mm] = d.date.split('.').map(Number); return ((mm + 3) % 12) * 31 + dd; };
    const title = x => (Lib.doc(x.id) || Lib.comp(x.id) || {}).title || '';
    if (sort === 'year') items.sort((a, b) => yearPos(Lib.doc(a.id)) - yearPos(Lib.doc(b.id)) || title(a).localeCompare(title(b), 'he'));
    else if (sort === 'az') items.sort((a, b) => title(a).localeCompare(title(b), 'he'));
    else if (sort === 'long') items.sort((a, b) => ((Lib.doc(b.id) || {}).words || 0) - ((Lib.doc(a.id) || {}).words || 0));
    return { q: '', items };
  }

  function counts() {
    // counts per tab for the current query (cheap: reuse one search)
    const q = st.q.trim();
    const c = {};
    if (q) {
      const all = Search.query(q, null, 3000);
      for (const tb of LIB_TABS) c[tb.id] = 0;
      for (const r of all) {
        const it = r.it;
        if (it.kind === 'doc') { c.all++; if (it.dk === 'activity') c.act++; else if (/trip|seminar|guide/.test(it.dk)) c.trips++; }
        else if (it.kind === 'comp') { c.all++; if (c[it.ct] !== undefined) c[it.ct]++; if (['skill', 'idea', 'trip-part'].includes(it.ct)) c.skills++; }
        else c.all++;
        if (Store.prefs.favs[it.ref]) c.favs++;
      }
    } else {
      c.all = Lib.docs.filter(d => d.kind !== 'attachment' && !d.private).length;
      c.act = Lib.activities().length;
      for (const tp of ['game', 'text', 'questions', 'method']) c[tp] = Lib.comps.filter(x => x.type === tp).length;
      c.trips = Lib.docs.filter(d => /trip|seminar|guide/.test(d.kind)).length;
      c.skills = Lib.comps.filter(x => ['skill', 'idea', 'trip-part'].includes(x.type)).length;
      c.favs = Object.keys(Store.prefs.favs).length + (Store.prefs.snippets || []).length;
    }
    return c;
  }

  function renderTabs() {
    const c = counts();
    $('#lib-tabs').innerHTML = LIB_TABS.map(tb => `<button role="tab" aria-pressed="${st.tab === tb.id}" data-tab="${tb.id}">${tb.id === 'favs' ? ic('star', 'sm') : ''}${tb.name} <span class="n num">${c[tb.id] ?? ''}</span></button>`).join('');
  }
  function renderFilters() {
    const f = [];
    if (st.tab === 'act' || st.tab === 'all') {
      f.push(`<button class="chip" id="f-topic" aria-pressed="${!!st.topic}">${ic('filter', 'sm')}${esc(st.topic || 'נושא')}</button>`);
      for (const [k, v] of Object.entries(CATS)) if (st.tab === 'act' || st.cat === k) f.push(`<button class="chip" data-cat="${k}" aria-pressed="${st.cat === k}">${v}</button>`);
      f.push(`<button class="chip" data-aud="חמישית" aria-pressed="${st.aud === 'חמישית'}">לחמישית</button>`);
      f.push(`<button class="chip" id="f-video" aria-pressed="${st.video}">${ic('play', 'sm')}עם סרטון</button>`);
    }
    if (st.tab === 'game') for (const [k, v] of Object.entries(GAME_ROLES)) if (Lib.comps.some(c => c.type === 'game' && c.role === k)) f.push(`<button class="chip" data-role="${k}" aria-pressed="${st.role === k}">${v}</button>`);
    if (!st.q && st.tab !== 'favs') f.push(`<button class="chip" id="f-sort">${ic('sort', 'sm')}${{ year: 'לפי השנה', az: 'א–ת', long: 'הכי מפורטות' }[st.sort || (st.tab === 'act' || st.tab === 'all' ? 'year' : 'az')]}</button>`);
    if (st.cat || st.topic || st.aud || st.video || st.role) f.push(`<button class="chip" id="f-clear">${ic('x', 'sm')}ניקוי</button>`);
    $('#lib-filters').innerHTML = f.join('');
  }
  let current = [];
  function renderList() {
    const { q, items } = candidates();
    current = items;
    const shown = items.slice(0, st.shown);
    const partial = q && items.length && !items[0].full;
    $('#lib-info').innerHTML = q ? `<span>${items.length ? `${items.length} תוצאות${partial ? ' (התאמה חלקית)' : ''}` : ''}</span>` : `<span>${items.length} פריטים</span>`;
    if (!items.length) {
      $('#lib-list').innerHTML = `<div class="empty">${ic('search')}<h3>${q ? 'לא מצאנו' : 'אין כאן עדיין כלום'}</h3><p>${q ? 'נסו מילה אחרת, פחות מילים, או לחפש ב״הכל״.' : st.tab === 'favs' ? 'סמנו כוכב על פעולה, משחק או טקסט כדי לשמור אותם כאן.' : ''}</p>
        ${q && st.tab !== 'all' ? `<button class="btn sm" id="lib-all">חיפוש ב״הכל״</button>` : ''}</div>`;
      const a = $('#lib-all'); if (a) a.onclick = () => { st.tab = 'all'; refresh(); };
    } else {
      $('#lib-list').innerHTML = shown.map(x => x.kind === 'doc' ? docRow(Lib.doc(x.id), q) : x.kind === 'comp' ? compRow(Lib.comp(x.id), q) : anyRow(x.id, q)).join('');
    }
    $('#lib-more').innerHTML = items.length > st.shown ? `<button class="btn sm" id="lib-more-btn">עוד ${Math.min(40, items.length - st.shown)}</button>` : '';
    const mb = $('#lib-more-btn');
    if (mb) {
      mb.onclick = () => { st.shown += 40; renderList(); };
      if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); st.shown += 40; renderList(); } }, { rootMargin: '400px' }); io.observe(mb); }
    }
  }
  function refresh() { renderTabs(); renderFilters(); renderList(); save(); $('#lib-clear').hidden = !st.q; }

  const onInput = debounce(() => { st.q = qEl.value; st.shown = 40; renderTabs(); renderList(); $('#lib-clear').hidden = !st.q; renderFilters(); }, 90);
  qEl.addEventListener('input', onInput);
  qEl.addEventListener('keydown', e => { if (e.key === 'Enter') { qEl.blur(); } });
  $('#lib-clear').onclick = () => { qEl.value = ''; st.q = ''; refresh(); qEl.focus(); };
  main.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { st.tab = tb.dataset.tab; st.shown = 40; if (st.tab !== 'game') st.role = null; refresh(); return; }
    const ct = e.target.closest('[data-cat]'); if (ct) { st.cat = st.cat === ct.dataset.cat ? null : ct.dataset.cat; st.shown = 40; refresh(); return; }
    const au = e.target.closest('[data-aud]'); if (au) { st.aud = st.aud ? null : au.dataset.aud; refresh(); return; }
    const ro = e.target.closest('[data-role]'); if (ro) { st.role = st.role === ro.dataset.role ? null : ro.dataset.role; refresh(); return; }
    if (e.target.closest('#f-video')) { st.video = !st.video; refresh(); return; }
    if (e.target.closest('#f-clear')) { st.cat = st.topic = st.aud = st.role = null; st.video = false; refresh(); return; }
    if (e.target.closest('#f-sort')) {
      const order = ['year', 'az', 'long']; const cur = st.sort || (st.tab === 'act' || st.tab === 'all' ? 'year' : 'az');
      st.sort = order[(order.indexOf(cur) + 1) % order.length]; refresh(); return;
    }
    if (e.target.closest('#f-topic')) {
      Sheet.show({
        title: 'סינון לפי נושא', body: `<div class="menu">${['', ...Lib.topics].map(t => `<button data-pick-topic="${esc(t)}"><span class="ic">${ic(t ? 'layers' : 'x')}</span><div>${esc(t || 'כל הנושאים')}<small>${t ? Lib.activities().filter(a => (a.tags || []).includes(t)).length + ' פעולות' : ''}</small></div>${st.topic === t || (!t && !st.topic) ? `<span style="margin-inline-start:auto;color:var(--green)">${ic('check')}</span>` : ''}</button>`).join('')}</div>`,
        onMount: s => s.addEventListener('click', ev => { const b = ev.target.closest('[data-pick-topic]'); if (b) { st.topic = b.dataset.pickTopic || null; Sheet.close(); refresh(); } }),
      });
      return;
    }
    // picking mode: open item and offer "add"
    if (picking) {
      const d = e.target.closest('[data-doc]'); if (d && !e.target.closest('[data-fav]')) { e.stopPropagation(); Nav.go('doc', { id: d.dataset.doc, pick: picking }); return; }
      const c = e.target.closest('[data-comp]'); if (c && !e.target.closest('[data-fav]')) { e.stopPropagation(); openComp(c.dataset.comp, picking); return; }
    }
  }, true);
  bindCommon(main);
  // wide screens: hovering/focusing a row previews it
  const pv = $('#lib-preview');
  if (matchMedia('(min-width:1100px)').matches && !picking) {
    $('#lib-layout').classList.add('split');
    pv.innerHTML = `<div class="empty">${ic('eye')}<h3>תצוגה מקדימה</h3><p>העבירו את העכבר על פריט כדי לראות אותו כאן.</p></div>`;
    let last = null;
    $('#lib-list').addEventListener('mouseover', e => {
      const r = e.target.closest('[data-doc],[data-comp]'); if (!r) return;
      const id = r.dataset.doc || r.dataset.comp; if (id === last) return; last = id;
      pv.innerHTML = r.dataset.doc ? previewDoc(Lib.doc(id)) : previewComp(Lib.comp(id));
    });
  }
  refresh();
  return { unmount() { onInput.flush && 0; } };
};

function previewDoc(d) {
  if (!d) return '';
  const segs = (d.segments || d.sections || []).slice(0, 12);
  return `<div style="padding:18px"><span class="tag khaki">${esc(docKindName(d))}</span><h2 style="font:700 22px/1.25 var(--f-ui);margin:10px 0">${esc(d.title)}</h2>
    ${d.goal ? `<div class="goalbox"><b>מטרה</b><p>${esc(d.goal)}</p></div>` : ''}
    <div class="timeline">${segs.map(s => { const K = d.segments ? kindOf(s.kind) : (TRIP_KINDS[s.kind] || TRIP_KINDS.custom); return `<div class="tl-head" style="padding:6px 0"><span class="k k-${K.kind || s.kind}">${ic(K.icon)}</span><h3>${esc(s.title || K.name)}</h3>${s.minutes ? `<span class="mins">${s.minutes}′</span>` : ''}</div>`; }).join('')}</div>
    <button class="btn sm" style="margin-top:12px" data-doc="${d.id}">פתיחה ${ic('next', 'sm')}</button></div>`;
}
function previewComp(c) {
  if (!c) return '';
  return `<div style="padding:18px"><span class="tag khaki">${esc(COMP_TYPES[c.type]?.one || '')}</span><h2 style="font:700 22px/1.25 var(--f-ui);margin:10px 0">${esc(c.title)}</h2><div class="prose">${renderMd((c.body || '').slice(0, 2400))}</div></div>`;
}

/* ================================================================ READER (library doc) */
VIEWS.doc = (main, params) => {
  const d = Lib.doc(params.id);
  if (!d) { main.innerHTML = `<div class="empty"><h3>הפריט לא נמצא</h3></div>`; topbar({ title: '' }); return; }
  Store.touch(d.id);
  const picking = params.pick;
  topbar({
    title: d.title, sub: docKindName(d),
    actions: `${favBtn(d.id)}<button class="iconbtn" id="doc-more" aria-label="עוד פעולות">${ic('more')}</button>`,
  });
  const [icn, kc] = docIcon(d);
  let html = `<article class="reader">
    <header class="reader-head">
      <div class="tags"><span class="tag khaki">${ic(icn, 'sm')} ${esc(docKindName(d))}</span>${d.audience === 'חמישית' ? '<span class="tag">לחמישית</span>' : ''}${(d.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}${d.partial ? '<span class="tag amber">חלקי</span>' : ''}</div>
      <h1>${esc(d.title)}</h1>
      <div class="factrow">${d.date ? `<span>${ic('cal', 'sm')}${esc(d.date)}</span>` : ''}${d.minutes ? `<span>${ic('clock', 'sm')}${fmtMin(d.minutes)}</span>` : ''}${d.segments ? `<span>${ic('list', 'sm')}${d.segments.length} חלקים</span>` : ''}${d.path ? `<span>${ic('box', 'sm')}${esc(d.path.replace(/\//g, ' › '))}</span>` : ''}</div>
      ${d.headline && d.headline !== d.title ? `<p class="lead">${esc(d.headline)}</p>` : ''}
    </header>`;
  if (d.goal) html += `<div class="goalbox"><b>מטרת הפעולה</b><p>${esc(d.goal)}</p></div>`;
  if (d.concept) html += `<div class="goalbox" style="background:var(--surface-2);color:var(--ink-2)"><b>מסגרת / קונספט</b><p>${esc(d.concept)}</p></div>`;
  if (d.variants && d.variants.length) html += `<div class="notice" style="margin-block:10px">${ic('layers')}<div>יש ${d.variants.length === 1 ? 'גרסה נוספת' : d.variants.length + ' גרסאות נוספות'} של הפעולה הזו: ${d.variants.map(v => { const o = Lib.doc(v); return o ? `<a href="#" data-doc="${o.id}">${esc(o.title)}${o.date ? ' (' + o.date + ')' : ''}</a>` : ''; }).join(', ')}</div></div>`;

  if (d.segments) {
    html += `<div class="timeline">${d.segments.map((s, i) => segReader(s, i)).join('')}</div>`;
  } else if (d.sections && d.kind === 'trip') {
    html += `<div class="timeline">${d.sections.map((s, i) => tripSecReader(s, i)).join('')}</div>`;
  } else if (d.sections && d.kind === 'seminar-sheet') {
    html += d.sections.map(s => `<h3 style="font:700 18px/1.3 var(--f-ui);margin:18px 0 8px">${esc(s.title)}</h3><div class="prose">${renderMd(s.rows.map(r => '| ' + r.map(c => String(c).replace(/\|/g, '/')).join(' | ') + ' |').join('\n'))}</div>`).join('');
  } else if (d.kind === 'collection') {
    const items = Lib.comps.filter(c => c.from === d.id);
    html += `<p class="muted">${esc(d.note || '')}</p><div class="list">${items.map(c => compRow(c)).join('')}</div>`;
  } else if (d.kind === 'attachment') {
    html += `<div class="notice">${ic('info')}<div>${esc(d.note || '')}</div></div>`;
  } else if (d.body) {
    html += `<div class="prose card" style="padding:16px">${renderMd(d.body)}</div>`;
    if (d.povSteps) html += `<h3 style="font:700 18px var(--f-ui);margin:18px 0 8px">איך כותבים נקודת מבט — 3 שלבים</h3><ol class="prose">${d.povSteps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  }
  if (d.equipment && d.equipment.length) html += `<section class="section"><div class="sec-head"><h2>ציוד</h2><button class="link" id="copy-eq">${ic('copy', 'sm')} העתקה</button></div><ul class="eqlist">${d.equipment.map(e => `<li>${esc(e)}</li>`).join('')}</ul></section>`;
  const rel = (d.kind === 'activity' || d.kind === 'trip') ? Lib.related(d) : [];
  if (rel.length) html += `<section class="section"><div class="sec-head"><h2>קשור לזה</h2></div><div class="list">${rel.map(o => docRow(o)).join('')}</div></section>`;
  if (d.source) html += `<p class="faint" style="font-size:13px;margin-top:18px">המקור בדרייב: <a href="${d.source}" target="_blank" rel="noopener">פתיחת הקובץ המקורי ${ic('ext', 'sm')}</a> · תמונות מהמסמך המקורי לא הועתקו לכאן.</p>`;
  const canDup = d.kind === 'activity' || d.kind === 'trip' || d.kind === 'seminar' || d.kind === 'trip-appendix';
  html += `<div class="actionbar">
      ${picking ? `<button class="btn primary" id="doc-addall">${ic('plus')}הוספת כל המבנה</button>`
      : canDup ? `<button class="btn primary" id="doc-dup">${ic('dup')}שכפול ועריכה</button>` : ''}
      <button class="btn" id="doc-share">${ic('send')}שיתוף</button>
    </div></article>`;
  main.innerHTML = html;
  bindCommon(main);
  main.addEventListener('click', e => {
    const tg = e.target.closest('[data-toggle]');
    if (tg) { const it = tg.closest('.tl-item'); it.querySelector('.tl-body').hidden = !it.querySelector('.tl-body').hidden; tg.setAttribute('aria-expanded', String(!it.querySelector('.tl-body').hidden)); return; }
    const add = e.target.closest('[data-addseg]');
    if (add) { const s = (d.segments || d.sections)[+add.dataset.addseg]; insertFlow({ kind: d.segments ? s.kind : (TRIP_KINDS[s.kind]?.kind || 'activity'), title: s.title || '', body: s.body, minutes: s.minutes, source: d.title, tripKind: d.sections ? s.kind : null }, picking); return; }
    const cp = e.target.closest('[data-copyseg]');
    if (cp) { const s = (d.segments || d.sections)[+cp.dataset.copyseg]; copyText((s.title ? s.title + '\n' : '') + plainMd(s.body)); return; }
    const sv = e.target.closest('[data-saveseg]');
    if (sv) { const s = (d.segments || d.sections)[+sv.dataset.saveseg]; saveSnippet({ kind: d.segments ? s.kind : (TRIP_KINDS[s.kind]?.kind || 'activity'), title: (s.title || '') + ' · ' + d.title, body: s.body }); return; }
  });
  const dup = $('#doc-dup'); if (dup) dup.onclick = () => duplicateDoc(d);
  const aa = $('#doc-addall'); if (aa) aa.onclick = () => { insertWholeDoc(d, picking); };
  $('#doc-share').onclick = () => shareDocSheet(d);
  const ce = $('#copy-eq'); if (ce) ce.onclick = () => copyText(d.equipment.map(x => '• ' + x).join('\n'), 'רשימת הציוד הועתקה');
  $('#doc-more').onclick = () => {
    Sheet.show({
      title: d.title, body: `<div class="menu">
        ${canDup ? `<button data-a="dup"><span class="ic">${ic('dup')}</span><div>שכפול ועריכה<small>יוצר עותק שלכם — המקור לא משתנה</small></div></button>` : ''}
        <button data-a="copy"><span class="ic">${ic('copy')}</span><div>העתקת כל הטקסט<small>לשליחה בוואטסאפ או להדבקה במסמך</small></div></button>
        ${d.segments ? `<button data-a="export"><span class="ic">${ic('doc')}</span><div>ייצוא למסמך<small>Word או קובץ להדפסה</small></div></button>` : ''}
        ${d.source ? `<button data-a="src"><span class="ic">${ic('ext')}</span><div>פתיחת המקור בדרייב</div></button>` : ''}
      </div>`,
      onMount: s => s.addEventListener('click', ev => {
        const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a; Sheet.close();
        if (a === 'dup') duplicateDoc(d);
        if (a === 'copy') copyText(docToText(d), 'הטקסט המלא הועתק');
        if (a === 'export') openExport(libDocAsActivity(d));
        if (a === 'src') window.open(d.source, '_blank', 'noopener');
      }),
    });
  };
};

function segReader(s, i) {
  const K = kindOf(s.kind);
  return `<div class="tl-item"><button class="tl-head" data-toggle aria-expanded="true">
      <span class="k k-${s.kind}">${ic(K.icon)}</span><h3>${esc(s.title || K.name)}<small>${esc(K.name)}</small></h3>${s.minutes ? `<span class="mins">${s.minutes} דק׳</span>` : ''}</button>
    <div class="tl-body"><div class="prose">${renderMd(s.body) || '<p class="faint">(אין פירוט במקור)</p>'}</div></div>
    <div class="tl-actions"><button class="btn sm ghost" data-addseg="${i}">${ic('plus', 'sm')}הוספה לעבודה שלי</button><button class="btn sm ghost" data-copyseg="${i}">${ic('copy', 'sm')}העתקה</button><button class="btn sm ghost" data-saveseg="${i}">${ic('heart', 'sm')}שמירה</button></div></div>`;
}
function tripSecReader(s, i) {
  const K = TRIP_KINDS[s.kind] || { name: s.kind === 'reflection' ? 'שיקופי מצב' : s.kind === 'equipment' ? 'ציוד' : s.kind === 'appendix' ? 'נספחים' : 'כללי', icon: s.kind === 'reflection' ? 'users' : s.kind === 'equipment' ? 'box' : 'doc', kind: 'summary' };
  return `<div class="tl-item"><button class="tl-head" data-toggle aria-expanded="true">
      <span class="k k-${K.kind}">${ic(K.icon)}</span><h3>${esc(s.title || K.name)}<small>${esc(K.name)}</small></h3></button>
    <div class="tl-body"><div class="prose">${renderMd(s.body)}</div></div>
    ${s.kind !== 'equipment' ? `<div class="tl-actions"><button class="btn sm ghost" data-addseg="${i}">${ic('plus', 'sm')}הוספה לעבודה שלי</button><button class="btn sm ghost" data-copyseg="${i}">${ic('copy', 'sm')}העתקה</button></div>` : ''}</div>`;
}

function docToText(d) {
  const L = [d.title, ''];
  if (d.goal) L.push('מטרה: ' + d.goal, '');
  for (const s of d.segments || d.sections || []) { L.push('*' + (s.title || kindOf(s.kind).name) + '*' + (s.minutes ? ` (${s.minutes} דק׳)` : '')); L.push(plainMd(s.body || ''), ''); }
  if (d.equipment && d.equipment.length) L.push('ציוד:', ...d.equipment.map(e => '• ' + e));
  if (d.body) L.push(plainMd(d.body));
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function shareDocSheet(d) {
  Sheet.show({
    title: 'שיתוף', body: `<div class="menu">
      <button data-a="text"><span class="ic">${ic('copy')}</span><div>העתקת הפעולה כטקסט<small>מוכן להדבקה בוואטסאפ לראש״גד או לצוות</small></div></button>
      ${d.segments ? `<button data-a="eq"><span class="ic">${ic('box')}</span><div>העתקת רשימת הציוד בלבד</div></button>` : ''}
      ${d.source ? `<button data-a="link"><span class="ic">${ic('link')}</span><div>העתקת קישור לקובץ בדרייב</div></button>` : ''}
      ${d.segments ? `<button data-a="doc"><span class="ic">${ic('doc')}</span><div>ייצוא כמסמך<small>Word / קובץ להדפסה</small></div></button>` : ''}</div>`,
    onMount: s => s.addEventListener('click', ev => {
      const b = ev.target.closest('[data-a]'); if (!b) return; Sheet.close();
      if (b.dataset.a === 'text') copyText(docToText(d), 'הועתק — אפשר להדביק בוואטסאפ');
      if (b.dataset.a === 'eq') copyText([d.title + ' — ציוד', ...(d.equipment || []).map(e => '• ' + e)].join('\n'), 'רשימת הציוד הועתקה');
      if (b.dataset.a === 'link') copyText(d.source, 'הקישור הועתק');
      if (b.dataset.a === 'doc') openExport(libDocAsActivity(d));
    }),
  });
}

/* ================================================================ components */
function openComp(id, picking) {
  const c = Lib.comp(id); if (!c) return;
  Store.touch(id);
  const T = COMP_TYPES[c.type] || COMP_TYPES.method;
  const from = c.from && Lib.doc(c.from);
  const body = `
    <div class="tags" style="margin-bottom:10px"><span class="tag khaki">${ic(T.icon, 'sm')} ${esc(c.role ? GAME_ROLES[c.role] : T.one)}</span>${(c.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}${c.minutes ? `<span class="tag">${c.minutes} דק׳</span>` : ''}</div>
    <div class="prose">${renderMd(c.body) || `<p class="muted">${c.from === 'pdf-pazachim' ? 'פז״ח מתוך מאגר הפז״חים של השבט — שם המשחק בלבד.' : c.from && c.from.startsWith('board') ? 'מתוך לוח המשחקים/הצופיות על הקיר בשבט — שם בלבד.' : 'אין פירוט נוסף במקור.'}</p>`}</div>
    ${from ? `<button class="row" style="margin-top:14px" data-doc="${from.id}"><span class="ic">${ic('doc')}</span><div class="bd"><h3>מתוך: ${esc(from.title)}</h3><div class="meta">${esc(docKindName(from))} · פתיחת המקור המלא</div></div></button>` : ''}`;
  const foot = `<button class="btn primary" id="cmp-add">${ic('plus')}${picking ? 'הוספה' : 'הוספה לעבודה שלי'}</button><button class="btn" id="cmp-copy">${ic('copy')}העתקה</button>${favBtn(c.id)}`;
  Sheet.show({
    title: esc(c.title), body, foot, tall: (c.body || '').length > 900,
    onMount: s => {
      s.querySelector('#cmp-add').onclick = () => { Sheet.close(true); insertFlow(compToSeg(c), picking); };
      s.querySelector('#cmp-copy').onclick = () => copyText(c.title + '\n' + plainMd(c.body));
      s.addEventListener('click', e => {
        const f = e.target.closest('[data-fav]'); if (f) { const on = Store.toggleFav(f.dataset.fav); f.querySelector('svg').style.fill = on ? 'currentColor' : 'none'; f.classList.toggle('on', on); return; }
        const d = e.target.closest('[data-doc]'); if (d) { Sheet.close(true); Nav.go('doc', { id: d.dataset.doc }); }
      });
    },
  });
}
function compToSeg(c) {
  const T = COMP_TYPES[c.type] || COMP_TYPES.method;
  let kind = T.k;
  if (c.type === 'trip-part') kind = TRIP_KINDS[c.part]?.kind || 'activity';
  let title = c.title.split(' · ')[0];
  return { kind, title, body: c.body || '', minutes: c.minutes || null, source: (c.from && Lib.doc(c.from)?.title) || '', game: c.type === 'game' ? { title: c.title, body: c.body || '', role: c.role } : null, tripKind: c.type === 'trip-part' ? c.part : null };
}
function openSnippet(id) {
  const s = (Store.prefs.snippets || []).find(x => x.id === id); if (!s) return;
  Sheet.show({
    title: esc(s.title || 'קטע ששמרתי'), body: `<div class="prose">${renderMd(s.body)}</div>`,
    foot: `<button class="btn primary" id="sn-add">${ic('plus')}הוספה לעבודה</button><button class="btn" id="sn-del">${ic('trash')}מחיקה</button>`,
    onMount: el => {
      el.querySelector('#sn-add').onclick = () => { Sheet.close(true); insertFlow({ kind: s.kind, title: s.title.split(' · ')[0], body: s.body }); };
      el.querySelector('#sn-del').onclick = () => { Store.setPref('snippets', Store.prefs.snippets.filter(x => x.id !== id)); Sheet.close(); toast('נמחק'); render(false); };
    },
  });
}
function saveSnippet(seg) {
  const sn = { id: uid('s'), kind: seg.kind || 'activity', title: seg.title || 'קטע', body: seg.body || '', at: Date.now() };
  Store.setPref('snippets', [sn, ...(Store.prefs.snippets || [])].slice(0, 200));
  idle(() => Lib.buildIndex());
  toast('נשמר תחת ״שמורים״ בספרייה');
}

/* ---------------------------------------------------------------- insert into work */
let insertTarget = null;   // set by editors when they open the library in pick mode
function insertFlow(seg, picking) {
  const target = picking || insertTarget;
  if (target && Store.get(target.id)) { applyInsert(target, seg); return; }
  const mine = Store.list().slice(0, 8);
  Sheet.show({
    title: 'להוסיף לאן?', body: `<div class="menu">
      <button data-to="new"><span class="ic" style="background:var(--red);color:var(--on-red)">${ic('plus')}</span><div>פעולה חדשה<small>מתחילה עם החלק הזה</small></div></button>
      ${mine.map(w => `<button data-to="${w.id}"><span class="ic">${ic(w.type === 'activity' ? 'bolt' : 'tent')}</span><div>${esc(w.title || 'ללא שם')}<small>${typeName(w)} · ${ago(w.updatedAt)}</small></div></button>`).join('')}</div>`,
    onMount: s => s.addEventListener('click', e => {
      const b = e.target.closest('[data-to]'); if (!b) return; Sheet.close(true);
      if (b.dataset.to === 'new') {
        const w = newActivity({ title: '', segments: [] });
        applyInsert({ id: w.id }, seg); Nav.go('edit', { id: w.id });
      } else applyInsert({ id: b.dataset.to }, seg, true);
    }),
  });
}
function applyInsert(target, seg, openAfter) {
  const w = Store.get(target.id); if (!w) return;
  if (w.type === 'activity') {
    const s = { id: uid('g'), kind: seg.kind || 'activity', title: seg.title || '', minutes: seg.minutes || defaultMinutes(seg.kind), body: seg.body || '', equip: [], from: seg.source || '' };
    const at = target.at != null ? target.at : w.segments.length;
    w.segments.splice(at, 0, s);
    Store.put(w);
    toast(`נוסף ל״${w.title || 'הפעולה'}״`, openAfter ? { label: 'פתיחה', fn: () => openWork(w.id) } : null);
    if (target.focus !== false) target.lastAdded = s.id;
  } else {
    planInsert(w, seg, target);
    toast(`נוסף ל״${w.title || 'התיק'}״`, openAfter ? { label: 'פתיחה', fn: () => openWork(w.id) } : null);
  }
  if (target.returnAfter && Nav.cur.view === 'library') Nav.back();
}
function insertWholeDoc(d, target) {
  const w = Store.get(target.id); if (!w) return;
  const segs = (d.segments || []).map(s => ({ kind: s.kind, title: s.title, body: s.body, minutes: s.minutes, source: d.title }));
  if (w.type === 'activity') {
    for (const s of segs) w.segments.push({ id: uid('g'), kind: s.kind, title: s.title, minutes: s.minutes || defaultMinutes(s.kind), body: s.body, equip: [], from: d.title });
    if (!w.goal && d.goal) w.goal = d.goal;
    for (const e of d.equipment || []) if (!w.equipment.some(x => norm(x.name) === norm(e))) w.equipment.push({ id: uid('e'), name: e, done: false });
    Store.put(w);
  } else for (const s of segs) planInsert(w, s, target);
  toast(`נוספו ${segs.length} חלקים`);
  insertTarget = null;
  Nav.back(); Nav.back();
}

/* ---------------------------------------------------------------- duplicate */
function duplicateDoc(d) {
  if (d.kind === 'trip' || d.kind === 'seminar' || d.kind === 'trip-appendix') { const p = planFromLibrary(d); Nav.go('plan', { id: p.id }); toast('נוצר עותק שלכם — אפשר לערוך בחופשיות'); return; }
  const w = newActivity({
    title: d.title + ' (עותק)', goal: d.goal || '', cat: d.cat || 'regular', audience: d.audience || 'חניכים', tags: d.tags || [],
    segments: (d.segments || []).map(s => ({ id: uid('g'), kind: s.kind === 'intro' ? 'activity' : s.kind, title: s.title || (s.kind === 'intro' ? 'הקדמה' : ''), minutes: s.minutes || defaultMinutes(s.kind), body: s.body, equip: [] })),
    equipment: (d.equipment || []).map(e => ({ id: uid('e'), name: e, done: false })),
    origin: { id: d.id, title: d.title },
  });
  Nav.go('edit', { id: w.id });
  toast('נוצר עותק שלכם — המקור בספרייה לא ישתנה');
}
function libDocAsActivity(d) {
  return { type: 'activity', title: d.title, goal: d.goal || '', cat: d.cat, audience: d.audience, date: '', start: '', segments: (d.segments || []).map(s => ({ ...s, equip: [] })), equipment: (d.equipment || []).map(e => ({ name: e })) };
}

/* ================================================================ MY WORK */
VIEWS.work = (main) => {
  topbar({ title: 'העבודה שלי', back: false, actions: `<span data-savestate>${saveStateHtml()}</span>` });
  const st = Object.assign({ f: 'all' }, LS.get('workstate', {}));
  function draw() {
    const all = Store.list();
    const trash = Object.values(Store.work).filter(w => w.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
    const groups = { all: all.filter(w => !w.isTemplate), activity: all.filter(w => w.type === 'activity' && !w.isTemplate), trip: all.filter(w => w.type === 'trip'), seminar: all.filter(w => w.type === 'seminar'), tpl: all.filter(w => w.isTemplate), trash };
    const names = { all: 'הכל', activity: 'פעולות', trip: 'תיקי טיול', seminar: 'סמינרים', tpl: 'תבניות', trash: 'נמחקו' };
    const items = groups[st.f] || [];
    main.innerHTML = `
      <div class="seg" style="margin-block:8px 14px">${Object.keys(names).filter(k => k !== 'trash' || trash.length).map(k => `<button aria-pressed="${st.f === k}" data-f="${k}">${names[k]} <span class="n num">${groups[k].length}</span></button>`).join('')}</div>
      ${items.length ? (st.f === 'trash'
        ? `<div class="list">${items.map(w => `<div class="row"><span class="ic">${ic('trash')}</span><div class="bd"><h3>${esc(w.title || 'ללא שם')}</h3><div class="meta">${typeName(w)} · נמחק ${ago(w.updatedAt)}</div></div><button class="btn sm" data-restore="${w.id}">${ic('undo', 'sm')}שחזור</button></div>`).join('')}</div>`
        : `<div class="cards c3">${items.map(workCard).join('')}</div>`)
        : `<div class="empty">${ic('work')}<h3>${st.f === 'tpl' ? 'אין עדיין תבניות' : 'עוד אין כאן כלום'}</h3><p>${st.f === 'tpl' ? 'בכל פעולה שלכם אפשר לסמן ״שמירה כתבנית״ — והיא תופיע כאן ובתפריט היצירה.' : 'התחילו פעולה חדשה, או שכפלו פעולה מהספרייה.'}</p>
          <div class="btnrow" style="justify-content:center;margin-top:12px"><button class="btn primary" data-create="activity">${ic('plus')}פעולה חדשה</button><button class="btn" data-go="library">${ic('library')}לספרייה</button></div></div>`}`;
  }
  main.addEventListener('click', e => {
    const f = e.target.closest('[data-f]'); if (f) { st.f = f.dataset.f; LS.set('workstate', st); draw(); return; }
    const r = e.target.closest('[data-restore]'); if (r) { Store.restore(r.dataset.restore); toast('שוחזר'); draw(); }
  });
  bindCommon(main);
  draw();
  return { onRemote: draw };
};

/* ================================================================ CREATE */
const ACTIVITY_TEMPLATES = [
  { id: 'regular', name: 'פעולה רגילה', sub: 'מפקד · משחק פתיחה · הפעלות · טקסט ודיון · סיכום', cat: 'regular', target: 90,
    segs: [['mifkad', 'מפקד פתיחה', 10], ['game', 'משחק פתיחה', 10], ['activity', 'הפעלה ראשונה', 15], ['text', 'טקסט', 10], ['discussion', 'דיון', 15], ['activity', 'הפעלה שנייה', 15], ['summary', 'סיכום והעברת המסר', 5], ['mifkad', 'מפקד סיום', 10]] },
  { id: 'course', name: 'פעולת קורס', sub: 'למדריכי חמישיות — לפי טופס אסמכתא לאישור', cat: 'course', target: 120, audience: 'חמישית',
    segs: [['mifkad', 'מפקד פתיחה', 10], ['activity', 'ארוחת בוקר', 30], ['game', 'משחק פתיחה', 15], ['activity', 'הפעלה ראשונה', 10], ['activity', 'הפעלה שנייה', 10], ['discussion', 'דיון', 10], ['activity', 'הפעלה שלישית', 15], ['summary', 'סיכום', 10], ['mifkad', 'מפקד סיום', 10]] },
  { id: 'pov', name: 'נקודת מבט', sub: '3 השלבים: נושא קרוב → הפעלה שממחישה → דיון', cat: 'regular', target: 40,
    segs: [['game', 'משחק פתיחה', 5], ['activity', 'הפעלה שממחישה את העיקרון', 10], ['text', 'מקרה מהעולם / טקסט', 10], ['discussion', 'דיון', 15]] },
  { id: 'stop', name: 'זמן עצירה', sub: 'נושא אקטואלי שקורה עכשיו', cat: 'regular', target: 30,
    segs: [['activity', 'מה קרה? הצגת המקרה', 5], ['video', 'סרטון / כתבה', 5], ['discussion', 'דיון', 15], ['summary', 'מה לוקחים מזה', 5]] },
  { id: 'peak', name: 'פעולת שיא / תחנות', sub: 'מירוץ, אולימפיאדה, תחנות עם ניקוד', cat: 'peak', target: 120,
    segs: [['mifkad', 'מפקד והסבר החוקים', 10], ['activity', 'תחנה 1', 15], ['activity', 'תחנה 2', 15], ['activity', 'תחנה 3', 15], ['activity', 'תחנה 4', 15], ['summary', 'סיכום וניקוד', 10]] },
  { id: 'memorial', name: 'פעולת זיכרון', sub: 'יום השואה / יום הזיכרון / רבין', cat: 'memorial', target: 60,
    segs: [['activity', 'פתיחה שקטה', 5], ['text', 'קטע קריאה', 10], ['activity', 'הפעלה', 15], ['discussion', 'דיון', 15], ['summary', 'סיום — שיר / נר', 5]] },
  { id: 'home', name: 'פעולת בית', sub: 'קבוצה קטנה בבית של מדריך', cat: 'home', target: 90,
    segs: [['game', 'משחק פתיחה', 10], ['activity', 'הפעלה', 20], ['activity', 'הפעלה', 20], ['summary', 'סיכום', 10]] },
  { id: 'empty', name: 'דף ריק', sub: 'מתחילים מאפס', cat: 'regular', target: 90, segs: [] },
];
function defaultMinutes(k) { return ({ mifkad: 10, game: 10, activity: 15, discussion: 15, text: 10, video: 5, pov: 30, stop: 15, content: 45, skills: 20, summary: 5, appendix: 0 })[k] ?? 10; }

function newActivity(props = {}) {
  const w = Object.assign({
    id: uid('a'), type: 'activity', title: '', date: '', start: '', audience: 'חניכים', cat: 'regular', topic: '', goal: '', question: '',
    target: 90, segments: [], equipment: [], tags: [], notes: '', status: 'draft',
  }, props);
  Store.put(w, { pristine: true });
  return w;
}
function openCreate() {
  const tpls = Store.list('activity').filter(w => w.isTemplate);
  Sheet.show({
    title: 'מה בונים?', body: `<div class="menu">
      <button data-c="activity"><span class="ic" style="background:var(--red);color:var(--on-red)">${ic('bolt')}</span><div>פעולה<small>רגילה, קורס, נקודת מבט, שיא, זיכרון, בית</small></div></button>
      <button data-c="trip"><span class="ic">${ic('tent')}</span><div>תיק טיול<small>פתיחת שנה, יום שבט, פסח, מחנה</small></div></button>
      <button data-c="seminar"><span class="ic">${ic('users')}</span><div>סמינר<small>יעדים, לו״ז, יחידות, תפריט ותקציב, ציוד</small></div></button>
      <button data-c="lib"><span class="ic">${ic('dup')}</span><div>שכפול פעולה קיימת<small>מוצאים בספרייה ולוחצים ״שכפול ועריכה״</small></div></button>
      ${tpls.length ? `<div class="eyebrow" style="margin:14px 6px 4px">התבניות שלי</div>${tpls.map(t => `<button data-tpl="${t.id}"><span class="ic">${ic('layers')}</span><div>${esc(t.title)}<small>${t.segments.length} חלקים</small></div></button>`).join('')}` : ''}
    </div>`,
    onMount: s => s.addEventListener('click', e => {
      const b = e.target.closest('[data-c]');
      const tp = e.target.closest('[data-tpl]');
      if (tp) { Sheet.close(true); const t = Store.get(tp.dataset.tpl); const w = newActivity({ ...clone(t), id: uid('a'), isTemplate: false, title: '', createdAt: 0, origin: { title: t.title }, segments: t.segments.map(s => ({ ...s, id: uid('g') })) }); Nav.go('edit', { id: w.id }); return; }
      if (!b) return;
      const c = b.dataset.c;
      if (c === 'activity') { Sheet.close(true); openNewActivity(); }
      if (c === 'trip' || c === 'seminar') { Sheet.close(true); newPlan(c); }
      if (c === 'lib') { Sheet.close(true); Nav.tab('library', { tab: 'act' }); }
    }),
  });
}
function openNewActivity() {
  Sheet.show({
    title: 'פעולה חדשה — מאיזה מבנה?', body: `<div class="menu">${ACTIVITY_TEMPLATES.map(t => `<button data-t="${t.id}"><span class="ic">${ic(t.id === 'empty' ? 'doc' : 'layers')}</span><div>${t.name}<small>${t.sub}</small></div></button>`).join('')}</div>
      <p class="hint" style="margin:10px 6px 0">כל חלק אפשר להחליף, להזיז ולמלא מהספרייה. הזמנים מחושבים לבד.</p>`,
    onMount: s => s.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return; Sheet.close(true);
      const t = ACTIVITY_TEMPLATES.find(x => x.id === b.dataset.t);
      const w = newActivity({ cat: t.cat, target: t.target, audience: t.audience || 'חניכים', segments: t.segs.map(([k, ti, m]) => ({ id: uid('g'), kind: k, title: ti, minutes: m, body: '', equip: [] })) });
      Nav.go('edit', { id: w.id, focusTitle: true });
    }),
  });
}

/* ================================================================ settings */
function openSettings() {
  const th = Store.prefs.theme || 'system';
  Sheet.show({
    title: 'הגדרות', body: `
      <div class="lbl" style="margin-bottom:8px">מראה</div>
      <div class="seg" style="margin:0 0 18px">${[['system', 'לפי המכשיר'], ['light', 'בהיר'], ['dark', 'כהה']].map(([k, n]) => `<button aria-pressed="${th === k}" data-theme="${k}">${n}</button>`).join('')}</div>
      <div class="lbl" style="margin-bottom:8px">שמירה</div>
      <div class="notice" style="margin-bottom:16px">${ic(Store.db ? 'cloudok' : 'device')}<div>${Store.db ? 'העבודה שלכם נשמרת אוטומטית בחשבון — ותופיע גם בטלפון וגם במחשב. רק אתם רואים אותה.' : 'העבודה נשמרת אוטומטית בדפדפן הזה. בפתיחה מתוך Claude היא נשמרת גם בחשבון ומסתנכרנת בין מכשירים.'}</div></div>
      <div class="lbl" style="margin-bottom:8px">גיבוי</div>
      <div class="btnrow" style="margin-bottom:18px"><button class="btn sm" id="bk-export">${ic('download', 'sm')}הורדת גיבוי (JSON)</button><label class="btn sm" for="bk-import">${ic('undo', 'sm')}שחזור מגיבוי</label><input type="file" id="bk-import" accept=".json,application/json" hidden></div>
      <div class="lbl" style="margin-bottom:8px">על הספרייה</div>
      <div class="muted" style="font-size:14px">נבנתה מתיקיית ״הדרכה״ בדרייב: ${Lib.activities().length} פעולות, ${Lib.docs.filter(d => d.kind === 'trip').length} תיקי טיול, ${Lib.docs.filter(d => /seminar/.test(d.kind)).length} קבצי סמינר, ${Lib.comps.length} רכיבים לשימוש חוזר. התמונות שבתוך המסמכים נשארו בדרייב, ולכל פריט יש קישור למקור.</div>
      ${(Store.lib.locked || []).length ? `<details style="margin-top:12px"><summary class="muted" style="cursor:pointer;font-size:14px">${ic('lock', 'sm')} ${Store.lib.locked.length} קבצים בדרייב שאין אליהם גישה</summary><ul class="muted" style="font-size:13.5px">${Store.lib.locked.map(l => `<li>${esc(l.title)} <span class="faint">(${esc(l.path)})</span></li>`).join('')}</ul></details>` : ''}`,
    onMount: s => {
      s.addEventListener('click', e => {
        const t = e.target.closest('[data-theme]'); if (t) { Store.setPref('theme', t.dataset.theme); applyTheme(); $$('[data-theme]', s).forEach(b => b.setAttribute('aria-pressed', b === t)); }
      });
      s.querySelector('#bk-export').onclick = async () => {
        const data = JSON.stringify({ app: 'tarmil', at: Date.now(), work: Store.work, prefs: Store.prefs }, null, 1);
        const dl = window.claude?.use ? await window.claude.use('downloads') : null;
        if (!dl) { copyText(data, 'הגיבוי הועתק ללוח (הורדת קבצים לא זמינה כאן)'); return; }
        try { await dl.save({ filename: `hadracha-backup-${todayISO()}.json`, data }); toast('הגיבוי נשמר'); } catch (e) { if (e.code !== 'declined') toast('לא ניתן לשמור את הקובץ'); }
      };
      s.querySelector('#bk-import').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try {
          const j = JSON.parse(await f.text());
          if (!j.work) throw 0;
          let n = 0; for (const it of Object.values(j.work)) { const cur = Store.work[it.id]; if (!cur || (it.updatedAt || 0) > (cur.updatedAt || 0)) { Store.work[it.id] = it; Store.queueCloud(it.id); n++; } }
          Store.saveLocal(); Store.emit('work'); toast(`שוחזרו ${n} פריטים`); Sheet.close(); render(false);
        } catch { toast('הקובץ לא נראה כמו גיבוי של האתר'); }
      };
    },
  });
}
function applyTheme() {
  const t = Store.prefs.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
}

/* ================================================================ group divider tool */
function openGroupsTool(plan) {
  const saved = (plan && plan.groups) || LS.get('groups', { names: '', n: 4, mode: 'count' });
  Sheet.show({
    title: 'חלוקה לקבוצות', tall: true, body: `
      <div class="field"><label for="gr-names">שמות — שם בכל שורה</label><textarea class="textarea" id="gr-names" rows="7" placeholder="מדביקים כאן רשימה מהוואטסאפ או מהגיליון">${esc(saved.names || '')}</textarea><span class="hint" id="gr-count"></span></div>
      <div class="grid2"><div class="field"><label for="gr-mode">לחלק לפי</label><select class="select" id="gr-mode"><option value="count" ${saved.mode === 'count' ? 'selected' : ''}>מספר קבוצות</option><option value="size" ${saved.mode === 'size' ? 'selected' : ''}>גודל קבוצה</option></select></div>
      <div class="field"><label for="gr-n">כמה</label><input class="input" id="gr-n" type="number" inputmode="numeric" min="2" max="60" value="${saved.n || 4}"></div></div>
      <div id="gr-out"></div>`,
    foot: `<button class="btn primary" id="gr-go">${ic('shuffle')}חלוקה</button><button class="btn" id="gr-copy" disabled>${ic('copy')}העתקה</button>`,
    onMount: s => {
      const names = () => s.querySelector('#gr-names').value.split(/\n|,/).map(x => x.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
      const cnt = () => { s.querySelector('#gr-count').textContent = `${names().length} שמות`; };
      s.querySelector('#gr-names').addEventListener('input', cnt); cnt();
      let result = null;
      s.querySelector('#gr-go').onclick = () => {
        const list = names(); if (list.length < 2) { toast('צריך לפחות שני שמות'); return; }
        const mode = s.querySelector('#gr-mode').value; let n = Math.max(1, +s.querySelector('#gr-n').value || 2);
        const k = mode === 'count' ? Math.min(n, list.length) : Math.ceil(list.length / n);
        const sh = [...list]; for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
        result = Array.from({ length: k }, () => []); sh.forEach((x, i) => result[i % k].push(x));
        s.querySelector('#gr-out').innerHTML = `<div class="cards" style="margin-top:6px">${result.map((g, i) => `<div class="card" style="padding:12px"><b>קבוצה ${i + 1}</b> <span class="faint">(${g.length})</span><div class="muted" style="font-size:14px;margin-top:4px">${g.map(esc).join(' · ')}</div></div>`).join('')}</div>`;
        s.querySelector('#gr-copy').disabled = false;
        const keep = { names: s.querySelector('#gr-names').value, n, mode };
        if (plan) { plan.groups = keep; Store.put(plan, { quiet: true }); } else LS.set('groups', keep);
      };
      s.querySelector('#gr-copy').onclick = () => result && copyText(result.map((g, i) => `קבוצה ${i + 1}:\n${g.join('\n')}`).join('\n\n'), 'החלוקה הועתקה');
    },
  });
}
