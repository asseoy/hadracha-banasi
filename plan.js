/* הדרכה בנשיא — trip files & seminars */
'use strict';

const GAME_SEC = { bus: 'bus-games', route: 'route-games', upgraded: 'upgraded-games', warmup: 'regular-games', opening: 'regular-games', activity: 'regular-games', zoom: 'regular-games' };

// the last seminar's real numbers (from "תיק סמינר שכבת ראם") — offered as a starting point
const SAMPLE_MENU = [
  ['ארוחת בוקר', 'כיכר לחם', 'רגיל', 38, 0], ['ארוחת בוקר', 'לחם ללא גלוטן', 'ללא גלוטן', 2, 0], ['ארוחת בוקר', 'ממרח שוקולד', 'רגיל', 15, 13.7],
  ['ארוחת בוקר', 'חומוס (קופסה גדולה)', 'רגיל', 12, 8], ['ארוחת בוקר', 'גבינה לבנה (קופסה גדולה)', 'רגיל', 6, 17], ['ארוחת בוקר', 'גבינה צהובה (חפיסה גדולה)', 'רגיל', 5, 20],
  ['ארוחת בוקר', 'פסטרמה (חפיסה גדולה)', 'רגיל', 10, 12], ['ארוחת ערב', 'שניצל אמריקאי', 'רגיל', 35, 0], ['ארוחת ערב', 'שניצל תירס ללא גלוטן (שקית 8 יח׳)', 'ללא גלוטן', 3, 0],
  ['ארוחת ערב', 'פסטה (שקית)', 'רגיל', 25, 0], ['ארוחת ערב', 'אורז', 'ללא גלוטן', 2, 0], ['ארוחת ערב', 'רסק עגבניות (בקבוק גדול)', 'רגיל', 12, 10],
  ['ארוחת ערב', 'שמן (בקבוק)', 'רגיל', 6, 9.3], ['ארוחת ערב', 'מלח (חבילה)', 'רגיל', 2, 2], ['ארוחת ערב', 'פפריקה אדומה', 'רגיל', 1, 17.5],
  ['קידוש', 'חלה', 'רגיל', 6, 16], ['קידוש', 'מיץ ענבים', 'רגיל', 10, 8], ['אחר', 'צלחות חד״פ', 'רגיל', 200, 0.21], ['אחר', 'כוסות חד״פ', 'רגיל', 400, 0.09],
  ['אחר', 'מזלגות חד״פ', 'רגיל', 100, 0.08], ['אחר', 'סכינים חד״פ', 'רגיל', 200, 0.16], ['אחר', 'נייר סופג (גליל)', 'רגיל', 3, 12], ['אחר', 'שקיות אוכל', 'רגיל', 3, 3],
];
const SAMPLE_SEMINAR_SCHEDULE = [
  [0, '18:00', 30, 'יציאה מהשבט — כל הציוד מעלים לאוטובוסים'], [0, '18:30', 15, 'הגעה, חלוקה לחדרים, סידור ציוד לבישול'], [0, '18:45', 90, 'בישול ארוחת ערב (מועבר ע״י המדריכים)'],
  [0, '20:15', 45, 'ארוחת ערב וניקיון'], [0, '21:30', 90, 'גיבוש ערב ופעולת לילה טוב (קידוש)'], [0, '23:15', 0, 'כיבוי אורות — חניכים לא יוצאים מהחדרים'],
  [1, '06:30', 30, 'השכמת מדריכים'], [1, '07:00', 30, 'התארגנות חניכים'], [1, '07:45', 30, 'קיפול ציוד וניקיון חדרים'], [1, '08:15', 30, 'ארוחת בוקר באחוות קורס'],
  [1, '08:45', 30, 'פעולת בוקר טוב'], [1, '09:15', 45, 'זמן חופשי בשבט (כולל ניקיון)'], [1, '10:00', 90, 'יחידה 1 — אחוות רנדומליות'], [1, '11:30', 30, 'זמן חופשי'],
  [1, '12:00', 40, 'יחידה 2 — אחוות רנדומליות'], [1, '12:40', 20, 'חלוקת חולצות והתארגנות'], [1, '13:00', 120, 'טורניר כדורגל'], [1, '15:00', 60, 'מלחמת מים'],
  [1, '16:00', 30, 'ניקיון שבט'], [1, '16:30', 0, 'יציאה חזרה לשבט'],
];

/* ================================================================ create */
function newPlan(type, props = {}) {
  if (type === 'trip' && !props.subtype && !props.skipAsk) { askTripType(); return; }
  const isSem = type === 'seminar';
  const sub = props.subtype || (isSem ? 'סמינר' : 'טיול אחר');
  const T = TRIP_TYPES[sub];
  const kinds = isSem ? ['unit', 'unit', 'evening', 'morning'] : (T ? T.sections : ['content', 'opening', 'closing']);
  const days = isSem ? 2 : (T ? T.days : 1);
  const w = Object.assign({
    id: uid('p'), type, title: '', subtype: sub, dateFrom: '', dateTo: '', days, place: '', battalion: '', team: '',
    participants: 0, counselors: [], goal: '', successShort: '', successLong: '',
    sections: kinds.map((k, i) => ({ id: uid('s'), kind: k, title: isSem && k === 'unit' ? `יחידה ${kinds.slice(0, i + 1).filter(x => x === 'unit').length}` : TRIP_KINDS[k].name, owner: '', minutes: 0, body: '', equip: [], games: [] })),
    reflections: [], schedule: [], equipment: [], packed: [], menu: [], diets: {},
    checklist: (isSem ? SEMINAR_CHECKLIST : TRIP_CHECKLIST).map(t => ({ id: uid('c'), text: t, done: false })),
    notes: '',
  }, props);
  delete w.skipAsk;
  Store.put(w, { pristine: true });
  Nav.go('plan', { id: w.id, tab: 'details' });
  return w;
}
function askTripType() {
  Sheet.show({
    title: 'איזה טיול?', body: `<div class="menu">${Object.entries(TRIP_TYPES).map(([k, v]) => `<button data-t="${k}"><span class="ic">${ic(v.days > 1 ? 'tent' : 'route')}</span><div>${k}<small>${v.days > 1 ? `${v.days} ימים · כולל בוקר טוב ולילה טוב` : 'יום אחד'} · ${v.sections.length} חלקים בתבנית</small></div></button>`).join('')}</div>
      <p class="hint" style="margin:10px 6px 0">התבניות בנויות לפי תיקי הטיול של השבט. אפשר להוסיף ולהסיר חלקים בכל שלב.</p>`,
    onMount: s => s.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; Sheet.close(true); newPlan('trip', { subtype: b.dataset.t }); }),
  });
}

function parseGames(body) {
  const out = [];
  for (const raw of String(body || '').split('\n')) {
    const l = raw.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').replace(/\*\*/g, '').trim();
    if (!l || l.length < 2) continue;
    if (/^(ציוד|משחק (ראשון|שני|שלישי|רביעי|חמישי|שישי)\s*[-:]?\s*$)/.test(l)) continue;
    const m = l.match(/^(?:משחק (?:ראשון|שני|שלישי|רביעי|חמישי|שישי)\s*[-–:]\s*)?(.{2,40}?)(?:\s*[-–:]\s+(.+))?$/);
    if (m) out.push({ id: uid('m'), title: m[1].trim(), body: (m[2] || '').trim() });
  }
  return out.slice(0, 20);
}

function planFromLibrary(d) {
  const isSem = d.kind === 'seminar';
  const sections = [], reflections = [], equipment = [];
  const src = d.sections || (d.segments || []).map(s => ({ kind: isSem ? 'unit' : (s.kind === 'pov' ? 'pov' : 'custom'), title: s.title, body: s.body }));
  for (const s of src) {
    if (s.kind === 'equipment') { for (const it of s.items || parseGames(s.body).map(g => g.title)) if (it) equipment.push({ id: uid('e'), name: it }); continue; }
    if (s.kind === 'reflection') {
      const r = { id: uid('r'), who: '', goal: '', desc: '', strengths: '', weaknesses: '', expSelf: '', expKids: '', expTeam: '', fearTrip: '', fearKids: '', fearOther: '', prep: '', kids: KID_ROLES.map(() => ({ name: '', how: '' })) };
      const body = s.body || '';
      const grab = re => { const m = body.match(re); return m ? m[1].trim() : ''; };
      r.goal = grab(/מטרת הטיול\s*[-:]\s*(.+)/); r.desc = grab(/תיאור של הקבוצה\s*[-:]\s*(.+)/); r.strengths = grab(/חוזקות של הקבוצה\s*[-:]\s*(.+)/); r.weaknesses = grab(/חולשות של הקבוצה\s*[-:]\s*(.+)/);
      r.expSelf = grab(/מעצמי\s*[-:]\s*(.+)/); r.expKids = grab(/מהחניכים\s*[-:]\s*(.+)/); r.expTeam = grab(/מהצוות[^-:]*[-:]\s*(.+)/);
      r.fearTrip = grab(/מהטיול\s*[-:]\s*(.+)/); r.fearOther = grab(/אחר\s*[-:]\s*(.+)/);
      if (s.table) s.table.slice(1).forEach((row, i) => { if (r.kids[i]) { r.kids[i].name = row[1] || ''; r.kids[i].how = row[2] || ''; } });
      // names of kids are personal: keep the structure, leave who-is-who to the counselors
      r.kids = r.kids.map(k => ({ name: '', how: k.how }));
      reflections.push(r); continue;
    }
    const kind = TRIP_KINDS[s.kind] ? s.kind : (s.kind === 'other' ? 'custom' : s.kind === 'appendix' ? 'custom' : 'custom');
    const sec = { id: uid('s'), kind, title: s.title || TRIP_KINDS[kind].name, owner: '', minutes: 0, body: s.body || '', equip: [], games: [] };
    if (TRIP_KINDS[kind].games) { sec.games = parseGames(s.body); sec.body = ''; }
    if (kind === 'pov') { const m = (s.title || '').match(/(?:נקודת מבט|נק[׳']?\s*מבט)(?: אישית)?\s*[-–]?\s*([א-ת]+)/); if (m && m[1].length < 10) sec.owner = m[1]; }
    if (kind === 'custom' && !sec.games.length && (sec.body.length < 3 || (s.kind === 'other' && sec.body.length < 150))) continue;
    sections.push(sec);
  }
  const w = {
    id: uid('p'), type: isSem ? 'seminar' : 'trip', title: d.title + ' (עותק)', subtype: isSem ? 'סמינר' : (/פתיחת שנה/.test(d.title) ? 'פתיחת שנה' : /שבט/.test(d.title) ? 'יום שבט' : /פסח/.test(d.title) ? 'טיול פסח' : /מחנ/.test(d.title) ? 'מחנה' : 'טיול אחר'),
    dateFrom: '', dateTo: '', days: isSem ? 2 : 1, place: '', battalion: '', team: '', participants: 0,
    counselors: [...new Set(sections.filter(s => s.owner).map(s => s.owner))], goal: d.goal || '', successShort: '', successLong: '',
    sections, reflections, schedule: [], equipment, packed: [], menu: [], diets: {},
    checklist: (isSem ? SEMINAR_CHECKLIST : TRIP_CHECKLIST).map(t => ({ id: uid('c'), text: t, done: false })), notes: '', origin: { id: d.id, title: d.title },
  };
  w.days = TRIP_TYPES[w.subtype]?.days || w.days;
  Store.put(w, { pristine: true });
  return w;
}

function planInsert(w, seg, target = {}) {
  let sec = target.sec ? w.sections.find(s => s.id === target.sec) : null;
  if (seg.game) {
    if (!sec || !TRIP_KINDS[sec.kind]?.games) sec = w.sections.find(s => s.kind === GAME_SEC[seg.game.role]) || w.sections.find(s => TRIP_KINDS[s.kind]?.games);
    if (sec) { sec.games.push({ id: uid('m'), title: seg.game.title, body: seg.game.body || '' }); Store.put(w); return sec; }
  }
  if (sec) {
    if (TRIP_KINDS[sec.kind]?.games) parseGames(seg.title + (seg.body ? ' - ' + seg.body.split('\n')[0] : '')).forEach(g => sec.games.push(g));
    else sec.body = (sec.body ? sec.body.trim() + '\n\n' : '') + (seg.title ? `**${seg.title}**\n` : '') + (seg.body || '');
    Store.put(w); return sec;
  }
  const kind = seg.tripKind && TRIP_KINDS[seg.tripKind] ? seg.tripKind : (seg.kind === 'pov' ? 'pov' : seg.kind === 'skills' ? 'skills' : 'custom');
  const ns = { id: uid('s'), kind, title: seg.title || TRIP_KINDS[kind].name, owner: '', minutes: seg.minutes || 0, body: seg.body || '', equip: [], games: [] };
  w.sections.push(ns); Store.put(w); return ns;
}

/* ================================================================ checks */
function secStatus(s) {
  const T = TRIP_KINDS[s.kind] || TRIP_KINDS.custom;
  if (T.games) { const n = (s.games || []).length; return n >= (T.target || 3) ? 'ok' : n ? 'warn' : 'todo'; }
  const len = (s.body || '').trim().length;
  if (s.kind === 'pov' && len > 40 && countQuestions(s.body) < 3) return 'warn';
  return len > 80 ? 'ok' : len ? 'warn' : 'todo';
}
function planDays(w) {
  if (w.dateFrom && w.dateTo) return clamp(daysBetween(w.dateFrom, w.dateTo) + 1, 1, 14);
  return w.days || 1;
}
function equipmentOfPlan(w) {
  const map = new Map();
  const per = +w.participants || 0;
  const push = (name, from, qty) => {
    let n = String(name || '').trim(); if (!n) return;
    let q = +qty || 0;
    const m = n.match(/^(\d+)\s+(.+)$/) || n.match(/^(.+?)\s*[x×*]\s*(\d+)$/);
    if (m && !q) { const num = /^\d/.test(m[1]) ? +m[1] : +m[2]; n = (/^\d/.test(m[1]) ? m[2] : m[1]).trim(); q = num; }
    let auto = false;
    if (/לכל חניך|לחניך|לכל אחד/.test(n) && per) { q = (q || 1) * per; auto = true; }
    const k = norm(n.replace(/\(.*?\)/g, ''));
    const cur = map.get(k);
    if (cur) { if (from && !cur.from.includes(from)) cur.from.push(from); if (q) cur.qty = (cur.qty || 0) + q; cur.auto = cur.auto || auto; }
    else map.set(k, { key: k, name: n, from: from ? [from] : [], qty: q, auto });
  };
  for (const e of w.equipment || []) push(e.name, '', e.qty);
  for (const s of w.sections || []) {
    for (const e of s.equip || []) push(e, s.title);
    for (const g of s.games || []) for (const e of g.equip || []) push(e, s.title);
  }
  return [...map.values()];
}
function planChecks(w) {
  const out = [];
  const add = (ok, title, detail, fix, level = 'warn', scoring = true) => out.push({ ok, title, detail, fix, level: ok ? 'ok' : level, scoring });
  const isSem = w.type === 'seminar';
  add(!!(w.title || '').trim(), 'יש שם', '', 'details:title');
  add(!!w.dateFrom, 'נקבע תאריך', 'התאריך קובע את ימי הלו״ז.', 'details:date');
  if (!isSem) add(!!(w.place || '').trim(), 'מסלול / מקום', 'לאן יוצאים? חשוב לסקירה ולמשחקי המסלול.', 'details:place');
  add((w.counselors || []).length > 0, 'רשימת מדריכים', 'מכל מדריך נבנית נקודת מבט ושיקוף מצב.', 'details:counselors');
  add(+w.participants > 0, 'מספר משתתפים', 'משמש לחישוב ציוד ״לכל חניך״ ותקציב.', 'details:participants');
  add(!!(w.goal || '').trim(), isSem ? 'מטרות הסמינר' : 'מטרת הטיול', '', 'details:goal');
  if (isSem) add(!!((w.successShort || '') + (w.successLong || '')).trim(), 'מדדי הצלחה', '״איפה נראה הצלחה״ — בטווח הקצר והארוך.', 'details:success');
  const oneDay = planDays(w) === 1;
  for (const s of w.sections) {
    const st = secStatus(s);
    const T = TRIP_KINDS[s.kind] || TRIP_KINDS.custom;
    const req = REQUIRED_TRIP.has(s.kind) && !(oneDay && (s.kind === 'morning' || s.kind === 'night'));
    const detail = T.games ? `${(s.games || []).length} מתוך ${T.target} משחקים` : st === 'warn' && s.kind === 'pov' ? 'כדאי לפחות 3 שאלות לדיון' : st === 'todo' ? 'עוד לא נכתב' : st === 'warn' ? 'נכתב חלקית' : '';
    add(st === 'ok', s.title + (s.owner ? ` — ${s.owner}` : ''), detail, 'sec:' + s.id, req ? 'warn' : 'info', req || T.games);
  }
  if (!isSem) {
    for (const c of w.counselors || []) {
      const has = w.sections.some(s => s.kind === 'pov' && norm(s.owner) === norm(c));
      if (!has) add(false, `נקודת מבט של ${c}`, 'לכל מדריך נקודת מבט משלו.', 'pov:' + c);
    }
    const refl = w.reflections || [];
    add(refl.length > 0 && refl.every(r => r.goal && r.desc && r.kids.some(k => k.how)), 'שיקופי מצב', refl.length ? 'חסרים שדות בחלק מהשיקופים' : 'לכל זוג מדריכים: מטרה, תיאור הקבוצה, ציפיות, חששות וטבלת חניכים.', 'tab:refl');
  }
  const sch = w.schedule || [];
  add(sch.length >= 3, 'לו״ז', 'שעות לכל חלק — כדי שכולם יידעו מה קורה מתי.', 'tab:sched');
  const conf = scheduleConflicts(w);
  if (sch.length) add(!conf.size, 'אין חפיפות בלו״ז', conf.size ? `${conf.size} פריטים חופפים בזמן` : '', 'tab:sched');
  const eq = equipmentOfPlan(w);
  add(eq.length > 0, 'רשימת ציוד', 'נאספת אוטומטית מכל החלקים — אפשר להוסיף ידנית.', 'tab:eq');
  if (isSem) add((w.menu || []).length > 0, 'תפריט ותקציב', 'ארוחות, כמויות, רגישויות ועלות.', 'tab:menu');
  const cl = w.checklist || [];
  if (cl.length) add(cl.every(c => c.done), 'צ׳ק ליסט לפני יציאה', `${cl.filter(c => c.done).length} מתוך ${cl.length} בוצעו`, 'tab:check', 'info', false);
  const sc = out.filter(o => o.scoring);
  return { items: out, score: sc.length ? Math.round(100 * sc.filter(o => o.ok).length / sc.length) : 0, open: out.filter(o => !o.ok && o.level === 'warn').length };
}
function scheduleConflicts(w) {
  const bad = new Set();
  const byDay = {};
  for (const it of w.schedule || []) (byDay[it.day || 0] = byDay[it.day || 0] || []).push(it);
  for (const list of Object.values(byDay)) {
    const s = list.filter(x => toMin(x.time) != null).sort((a, b) => toMin(a.time) - toMin(b.time));
    for (let i = 1; i < s.length; i++) if (toMin(s[i - 1].time) + (+s[i - 1].minutes || 0) > toMin(s[i].time)) { bad.add(s[i - 1].id); bad.add(s[i].id); }
  }
  return bad;
}

/* ================================================================ view */
const PLAN_TABS = {
  trip: [['overview', 'סקירה'], ['details', 'פרטים'], ['content', 'תוכן'], ['refl', 'שיקופי מצב'], ['sched', 'לו״ז'], ['eq', 'ציוד'], ['check', 'צ׳ק ליסט']],
  seminar: [['overview', 'סקירה'], ['details', 'פרטים ויעדים'], ['content', 'יחידות'], ['sched', 'לו״ז'], ['menu', 'תפריט ותקציב'], ['eq', 'ציוד'], ['check', 'צ׳ק ליסט']],
};

VIEWS.plan = (main, params) => {
  const w = Store.get(params.id);
  if (!w || w.deleted) { main.innerHTML = `<div class="empty"><h3>לא נמצא</h3></div>`; topbar({ title: '' }); return; }
  Store.touch(w.id);
  let tab = params.tab || LS.get('plantab:' + w.id, 'overview');
  const save = debounce(() => Store.put(w, { quiet: true }), 350);
  const changed = () => { save(); drawTabsBar(); };

  topbar({
    title: w.title || (w.type === 'trip' ? 'תיק טיול חדש' : 'סמינר חדש'), sub: w.type === 'trip' ? `תיק טיול · ${w.subtype}` : 'סמינר',
    actions: `<span data-savestate>${saveStateHtml()}</span><button class="iconbtn" id="pl-export" aria-label="ייצוא">${ic('doc')}</button><button class="iconbtn" id="pl-more" aria-label="עוד">${ic('more')}</button>`,
  });
  $('#pl-export').onclick = () => openExport(w);
  $('#pl-more').onclick = () => {
    Sheet.show({
      title: w.title || 'תיק', body: `<div class="menu">
        <button data-a="preview"><span class="ic">${ic('eye')}</span><div>תצוגת מסמך</div></button>
        <button data-a="export"><span class="ic">${ic('doc')}</span><div>ייצוא<small>Word / קובץ להדפסה / טקסט</small></div></button>
        <button data-a="dup"><span class="ic">${ic('dup')}</span><div>שכפול<small>לטיול הבא, עם אותו מבנה ותוכן</small></div></button>
        ${w.type === 'seminar' ? `<button data-a="groups"><span class="ic">${ic('shuffle')}</span><div>חלוקה לקבוצות</div></button>` : ''}
        <button data-a="del" class="danger"><span class="ic">${ic('trash')}</span>מחיקה</button></div>`,
      onMount: el => el.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a; Sheet.close(true);
        if (a === 'preview') openPreview(w);
        if (a === 'export') openExport(w);
        if (a === 'groups') openGroupsTool(w);
        if (a === 'dup') { const c = clone(w); c.id = uid('p'); c.title = w.title + ' (עותק)'; c.createdAt = 0; c.packed = []; c.checklist = c.checklist.map(x => ({ ...x, done: false })); Store.put(c, { pristine: true }); Nav.go('plan', { id: c.id }, { replace: true }); toast('נוצר עותק'); }
        if (a === 'del') { Store.remove(w.id); Nav.back(); toast('נמחק', { label: 'ביטול', fn: () => Store.restore(w.id) }); }
      }),
    });
  };

  main.innerHTML = `<div class="ed" style="max-width:900px">
    <div class="planhead"><div class="ring" id="pl-ring"><span></span></div>
      <div style="flex:1;min-width:0"><textarea class="input title-input" id="pl-title" rows="1" placeholder="${w.type === 'trip' ? 'שם הטיול' : 'שם הסמינר'}" aria-label="שם" style="font-size:34px;min-height:40px">${esc(w.title)}</textarea>
      <div class="faint" style="font-size:13px" id="pl-sub"></div></div></div>
    <div class="tabs" role="tablist" id="pl-tabs"></div>
    <div id="pl-body" style="padding-top:14px"></div></div>`;
  $('#pl-title').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
  autoGrow($('#pl-title'));
  $('#pl-title').addEventListener('input', e => { e.target.value = e.target.value.replace(/\n/g, ' '); autoGrow(e.target); w.title = e.target.value; const t = $('.tb-title'); if (t) t.firstChild.textContent = w.title || 'ללא שם'; changed(); });

  function drawTabsBar() {
    const ch = planChecks(w);
    $('#pl-ring').style.setProperty('--p', ch.score);
    $('#pl-ring span').textContent = ch.score + '%';
    $('#pl-sub').textContent = [w.dateFrom ? fmtDate(w.dateFrom) + (w.dateTo && w.dateTo !== w.dateFrom ? '–' + fmtDate(w.dateTo) : '') : '', w.place, w.participants ? w.participants + ' משתתפים' : ''].filter(Boolean).join(' · ') || (w.type === 'trip' ? 'מלאו את הפרטים כדי להתחיל' : '');
    const st = tabState(ch);
    $('#pl-tabs').innerHTML = PLAN_TABS[w.type].map(([k, n]) => `<button role="tab" aria-selected="${tab === k}" data-tab="${k}">${k !== 'overview' ? `<i class="st ${st[k] || ''}"></i>` : ''}${n}</button>`).join('');
  }
  function tabState(ch) {
    const map = {};
    const ofTab = fix => fix?.startsWith('details') ? 'details' : fix?.startsWith('sec:') || fix?.startsWith('pov:') ? 'content' : fix?.startsWith('tab:') ? fix.slice(4) : null;
    for (const c of ch.items) { const t = ofTab(c.fix); if (!t) continue; if (!c.ok && c.level === 'warn') map[t] = 'warn'; else if (!map[t]) map[t] = 'ok'; }
    return map;
  }
  $('#pl-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; LS.set('plantab:' + w.id, tab); drawTabsBar(); drawBody(); b.scrollIntoView({ inline: 'center', block: 'nearest' }); window.scrollTo({ top: 0 }); } });

  function drawBody() {
    const el = $('#pl-body');
    ({ overview: drawOverview, details: drawDetails, content: drawContent, refl: drawRefl, sched: drawSched, eq: drawEq, check: drawCheck, menu: drawMenu }[tab] || drawOverview)(el);
  }
  const go = (t) => { tab = t; LS.set('plantab:' + w.id, t); drawTabsBar(); drawBody(); window.scrollTo({ top: 0 }); };
  function runFix(fix) {
    if (!fix) return;
    if (fix.startsWith('details')) { go('details'); const f = fix.split(':')[1]; setTimeout(() => { const el = $(`[data-focus="${f}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); } }, 60); return; }
    if (fix.startsWith('sec:')) { openSection(fix.slice(4)); return; }
    if (fix.startsWith('pov:')) { const name = fix.slice(4); const s = { id: uid('s'), kind: 'pov', title: `נקודת מבט — ${name}`, owner: name, minutes: 30, body: '', equip: [], games: [] }; w.sections.push(s); changed(); openSection(s.id); return; }
    if (fix.startsWith('tab:')) go(fix.slice(4));
  }

  /* ---------- overview ---------- */
  function drawOverview(el) {
    const ch = planChecks(w);
    const next = ch.items.find(c => !c.ok && c.level === 'warn') || ch.items.find(c => !c.ok);
    const groups = { todo: [], warn: [], ok: [] };
    el.innerHTML = `
      ${next ? `<div class="nextstep"><div class="bd"><small>הצעד הבא</small><b>${esc(next.title)}</b>${next.detail ? `<small>${esc(next.detail)}</small>` : ''}</div><button class="btn sm" data-fix="${esc(next.fix || '')}">קדימה</button></div>`
        : `<div class="nextstep" style="background:var(--green)"><div class="bd"><b>הכל מוכן ✓</b><small>אפשר לייצא את התיק ולשלוח לראש״גד</small></div><button class="btn sm" id="ov-exp">ייצוא</button></div>`}
      <div class="sec-head"><h2>חלקי ה${w.type === 'trip' ? 'תיק' : 'סמינר'}</h2><button class="link" data-go-tab="content">עריכה ${ic('next', 'sm')}</button></div>
      <div class="secgrid">${w.sections.map(s => secTile(s)).join('')}</div>
      <div class="sec-head" style="margin-top:22px"><h2>בדיקת מוכנות</h2><span class="faint num">${ch.score}%</span></div>
      <div class="checks">${ch.items.filter(c => !c.ok).slice(0, 8).map(c => `<div class="ck ${c.level}">${ic(c.level === 'info' ? 'info' : 'alert')}<div style="flex:1"><b>${esc(c.title)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ''}</div>${c.fix ? `<button class="btn sm" data-fix="${esc(c.fix)}">פתיחה</button>` : ''}</div>`).join('') || `<div class="ck ok">${ic('checkc')}<div><b>אין דברים פתוחים</b></div></div>`}</div>
      ${w.origin ? `<p class="hint" style="margin-top:14px">מבוסס על: <a href="#" data-doc="${w.origin.id}">${esc(w.origin.title)}</a></p>` : ''}`;
    const ex = $('#ov-exp'); if (ex) ex.onclick = () => openExport(w);
  }
  function secTile(s) {
    const T = TRIP_KINDS[s.kind] || TRIP_KINDS.custom;
    const st = secStatus(s);
    const sub = T.games ? `${(s.games || []).length}/${T.target} משחקים${s.games.length ? ': ' + s.games.slice(0, 3).map(g => g.title).join(', ') : ''}` : plainMd(s.body || '').slice(0, 90) || T.hint || '';
    return `<button class="sectile" data-sec="${s.id}"><span class="k k-${T.kind}">${ic(T.icon)}</span><div class="bd"><h3>${esc(s.title || T.name)}${s.owner ? ` <span class="faint" style="font-weight:500">· ${esc(s.owner)}</span>` : ''}</h3><p>${esc(sub)}</p></div>
      <span class="state ${st}">${st === 'ok' ? ic('checkc', 'sm') : st === 'warn' ? ic('alert', 'sm') : ''}${st === 'ok' ? 'מוכן' : st === 'warn' ? 'חלקי' : 'ריק'}</span></button>`;
  }

  /* ---------- details ---------- */
  function drawDetails(el) {
    const isSem = w.type === 'seminar';
    el.innerHTML = `
      ${!isSem ? `<div class="field"><label>סוג הטיול</label><div class="btnrow">${Object.keys(TRIP_TYPES).map(t => `<button class="chip" data-sub="${t}" aria-pressed="${w.subtype === t}">${t}</button>`).join('')}</div></div>` : ''}
      <div class="grid2"><div class="field"><label for="d-from">${isSem ? 'מתאריך' : 'תאריך יציאה'}</label><input class="input" type="date" id="d-from" data-focus="date" value="${esc(w.dateFrom)}"></div>
      <div class="field"><label for="d-to">עד תאריך</label><input class="input" type="date" id="d-to" value="${esc(w.dateTo)}"></div></div>
      ${!isSem ? `<div class="field"><label for="d-place">מסלול / מקום</label><input class="input" id="d-place" data-focus="place" value="${esc(w.place)}" placeholder="למשל: כוכב הירדן, נחל תבור"></div>` : `<div class="field"><label for="d-place">מקום</label><input class="input" id="d-place" value="${esc(w.place)}" placeholder="שבט מארח / אתר"></div>`}
      <div class="grid3"><div class="field"><label for="d-bat">גדוד / שכבה</label><input class="input" id="d-bat" value="${esc(w.battalion)}" placeholder="גדוד זאב"></div>
      <div class="field"><label for="d-team">צוות</label><input class="input" id="d-team" value="${esc(w.team)}" placeholder="בויה קאשה"></div>
      <div class="field"><label for="d-n">משתתפים</label><input class="input" id="d-n" data-focus="participants" type="number" inputmode="numeric" min="0" value="${w.participants || ''}" placeholder="0"></div></div>
      <div class="field"><label>${isSem ? 'צוות הדרכה' : 'המדריכים בצוות'}</label>
        <div class="chipsinput" id="d-coun" data-focus="counselors">${(w.counselors || []).map((c, i) => `<span class="chip">${esc(c)}<button class="x" data-rmc="${i}" aria-label="הסרה">${ic('x', 'sm')}</button></span>`).join('')}<input id="d-cin" placeholder="שם ואנטר…" enterkeyhint="done" aria-label="הוספת מדריך"></div>
        ${!isSem ? '<span class="hint">לכל מדריך נוצרת משבצת לנקודת מבט, ובשיקופי המצב מוצעים זוגות.</span>' : ''}</div>
      <div class="field"><label for="d-goal">${isSem ? 'מטרות הסמינר' : 'מטרת הטיול'}</label><textarea class="textarea" id="d-goal" data-focus="goal" rows="3" placeholder="${isSem ? 'לגבש את השכבה; שיהנו ויהיה להם חוויה; רענון התכנים שנלמדו' : 'להכיר יותר את החניכים, לגבש את הקבוצה…'}">${esc(w.goal)}</textarea></div>
      ${isSem ? `<div class="grid2"><div class="field"><label for="d-ss">איפה נראה הצלחה — טווח קצר</label><textarea class="textarea" id="d-ss" data-focus="success" rows="3" placeholder="שהם מתגבשים כשכבה ומתערבבים">${esc(w.successShort)}</textarea></div>
        <div class="field"><label for="d-sl">טווח ארוך</label><textarea class="textarea" id="d-sl" rows="3" placeholder="שבימים ירוקים נראה אותם מיישמים">${esc(w.successLong)}</textarea></div></div>` : ''}
      <div class="field"><label for="d-notes">הערות</label><textarea class="textarea" id="d-notes" rows="2">${esc(w.notes || '')}</textarea></div>`;
    const bind = (id, key, num) => { const e = $('#' + id); if (e) e.addEventListener('input', () => { w[key] = num ? (+e.value || 0) : e.value; changed(); }); };
    bind('d-from', 'dateFrom'); bind('d-to', 'dateTo'); bind('d-place', 'place'); bind('d-bat', 'battalion'); bind('d-team', 'team'); bind('d-n', 'participants', true);
    bind('d-goal', 'goal'); bind('d-ss', 'successShort'); bind('d-sl', 'successLong'); bind('d-notes', 'notes');
    $('#d-from').addEventListener('change', () => { if (!w.dateTo || w.dateTo < w.dateFrom) { w.dateTo = (w.days || 1) > 1 ? addDays(w.dateFrom, (w.days || 1) - 1) : w.dateFrom; $('#d-to').value = w.dateTo; changed(); } });
    const addC = () => { const i = $('#d-cin'); const v = i.value.trim(); if (!v) return; for (const n of v.split(/[,،]/).map(x => x.trim()).filter(Boolean)) if (!w.counselors.includes(n)) w.counselors.push(n); i.value = ''; syncPov(); changed(); drawDetails(el); $('#d-cin').focus(); };
    $('#d-cin').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addC(); } });
    $('#d-cin').addEventListener('blur', () => { if ($('#d-cin').value.trim()) addC(); });
    el.onclick = e => {
      const r = e.target.closest('[data-rmc]'); if (r) { w.counselors.splice(+r.dataset.rmc, 1); changed(); drawDetails(el); return; }
      const sb = e.target.closest('[data-sub]'); if (sb) { switchSubtype(sb.dataset.sub); drawDetails(el); }
    };
  }
  function switchSubtype(sub) {
    if (w.subtype === sub) return;
    w.subtype = sub; w.days = TRIP_TYPES[sub].days;
    // add sections the new type expects; never delete what was written
    for (const k of TRIP_TYPES[sub].sections) if (!w.sections.some(s => s.kind === k)) w.sections.push({ id: uid('s'), kind: k, title: TRIP_KINDS[k].name, owner: '', minutes: 0, body: '', equip: [], games: [] });
    changed(); toast(`עודכן ל״${sub}״ — נוספו החלקים החסרים`);
  }
  function syncPov() {
    if (w.type !== 'trip') return;
    for (const c of w.counselors) if (!w.sections.some(s => s.kind === 'pov' && norm(s.owner) === norm(c))) w.sections.push({ id: uid('s'), kind: 'pov', title: `נקודת מבט — ${c}`, owner: c, minutes: 30, body: '', equip: [], games: [] });
  }

  /* ---------- content (sections list) ---------- */
  function drawContent(el) {
    const order = Object.keys(TRIP_KINDS);
    el.innerHTML = `
      <div class="notice" style="margin-bottom:12px">${ic('info')}<div>${w.type === 'trip' ? 'לחצו על חלק כדי לכתוב אותו או להביא תוכן מהספרייה. משחקים נבחרים מתוך מאגר המשחקים לפי סוג.' : 'כל יחידה בסמינר נכתבת כמו פעולה — עם מטרות, הפעלות ודיון.'}</div></div>
      <div class="secgrid" id="pl-secs">${w.sections.map(s => secTile(s)).join('')}</div>
      <div class="addbar"><button class="btn" id="sec-add">${ic('plus')}חלק נוסף</button><button class="btn" id="sec-lib">${ic('library')}מהספרייה</button></div>`;
    $('#sec-add').onclick = () => {
      const kinds = w.type === 'seminar' ? ['unit', 'evening', 'morning', 'night', 'skills', 'peak', 'regular-games', 'upgraded-games', 'custom'] : order.filter(k => k !== 'unit' && k !== 'evening');
      Sheet.show({
        title: 'איזה חלק להוסיף?', body: `<div class="menu">${kinds.map(k => `<button data-k="${k}"><span class="ic k-${TRIP_KINDS[k].kind}">${ic(TRIP_KINDS[k].icon)}</span><div>${TRIP_KINDS[k].name}<small>${esc(TRIP_KINDS[k].hint || (TRIP_KINDS[k].games ? `יעד: ${TRIP_KINDS[k].target} משחקים` : ''))}</small></div></button>`).join('')}</div>`,
        onMount: s => s.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; Sheet.close(true); const k = b.dataset.k; const ns = { id: uid('s'), kind: k, title: k === 'unit' ? `יחידה ${w.sections.filter(x => x.kind === 'unit').length + 1}` : TRIP_KINDS[k].name, owner: '', minutes: 0, body: '', equip: [], games: [] }; w.sections.push(ns); changed(); openSection(ns.id); }),
      });
    };
    $('#sec-lib').onclick = () => { insertTarget = { id: w.id, returnAfter: true }; Nav.go('library', { pick: insertTarget, tab: 'skills', focus: true }); };
  }

  /* ---------- reflections ---------- */
  function drawRefl(el) {
    const R = w.reflections || (w.reflections = []);
    const pairs = [];
    for (let i = 0; i < (w.counselors || []).length; i += 2) pairs.push(w.counselors.slice(i, i + 2).join(' ו'));
    const missing = pairs.filter(p => !R.some(r => norm(r.who) === norm(p)));
    el.innerHTML = `
      <p class="muted" style="margin-top:0">שיקוף מצב לכל זוג מדריכים — כמו בתיקי הטיול: מטרה, תיאור הקבוצה, ציפיות, חששות והכנה, וטבלת החניכים.</p>
      ${R.map((r, i) => reflCard(r, i)).join('')}
      <div class="btnrow" style="margin-top:12px">${missing.map(p => `<button class="btn sm" data-addr="${esc(p)}">${ic('plus', 'sm')}${esc(p)}</button>`).join('')}<button class="btn sm" data-addr="">${ic('plus', 'sm')}שיקוף חדש</button></div>`;
    el.oninput = e => {
      const c = e.target.closest('[data-r]'); if (!c) return; const r = R[+c.dataset.r]; const f = e.target.dataset.rf;
      if (f && f.startsWith('kid')) { const [, i, part] = f.split(':'); r.kids[+i][part] = e.target.value; } else if (f) r[f] = e.target.value;
      changed();
    };
    el.onclick = e => {
      const a = e.target.closest('[data-addr]'); if (a) { R.push({ id: uid('r'), who: a.dataset.addr, goal: '', desc: '', strengths: '', weaknesses: '', expSelf: '', expKids: '', expTeam: '', fearTrip: '', fearKids: '', fearOther: '', prep: '', kids: KID_ROLES.map(() => ({ name: '', how: '' })) }); changed(); drawRefl(el); return; }
      const d = e.target.closest('[data-delr]'); if (d) { const i = +d.dataset.delr; const bk = R[i]; R.splice(i, 1); changed(); drawRefl(el); toast('השיקוף נמחק', { label: 'ביטול', fn: () => { R.splice(i, 0, bk); changed(); drawRefl(el); } }); }
    };
  }
  function reflCard(r, i) {
    const f = (k, label, ph, rows = 2) => `<div class="field"><label>${label}</label><textarea class="textarea" rows="${rows}" style="min-height:${rows * 26 + 20}px" data-rf="${k}" placeholder="${ph}">${esc(r[k] || '')}</textarea></div>`;
    return `<div class="card" style="padding:14px;margin-bottom:12px" data-r="${i}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input class="input" data-rf="who" value="${esc(r.who)}" placeholder="שמות המדריכים" style="font-weight:600"><button class="iconbtn" data-delr="${i}" aria-label="מחיקת השיקוף">${ic('trash')}</button></div>
      ${f('goal', 'מטרת הטיול', 'להכיר יותר את החניכים ולהתחבר אליהם')}
      ${f('desc', 'תיאור הקבוצה', 'אוהבים את הצופים, אוהבים משחקים ופחות תוכן')}
      <div class="grid2">${f('strengths', 'חוזקות', 'חברים טובים אחד של השני')}${f('weaknesses', 'חולשות', 'קשה להם לשבת הרבה זמן')}</div>
      <div class="lbl" style="margin:4px 0 6px">ציפיות</div>
      <div class="grid3">${f('expSelf', 'מעצמי', '')}${f('expKids', 'מהחניכים', '')}${f('expTeam', 'מהצוות ומהראש״גדית', '')}</div>
      <div class="lbl" style="margin:4px 0 6px">חששות</div>
      <div class="grid3">${f('fearTrip', 'מהטיול', '')}${f('fearKids', 'מהחניכים', '')}${f('fearOther', 'אחר', '')}</div>
      ${f('prep', 'מה אפשר לעשות מראש כדי למנוע בעיות', 'להביא תיק עזרה ראשונה, להיות בקשר עם ההורים…')}
      <div class="lbl" style="margin:4px 0 6px">שיקופי חניכים</div>
      <div class="tbl-wrap"><table class="grid kidtable stack" style="--cols:2"><thead><tr><th style="width:38%">שיקוף</th><th style="width:22%">שם החניך</th><th>דרך התמודדות וביצוע</th></tr></thead><tbody>
        ${KID_ROLES.map((role, k) => `<tr><td class="role wide">${role}</td><td data-l="שם החניך"><input data-rf="kid:${k}:name" value="${esc(r.kids[k]?.name || '')}" aria-label="שם"></td><td data-l="דרך התמודדות"><input data-rf="kid:${k}:how" value="${esc(r.kids[k]?.how || '')}" aria-label="דרך התמודדות"></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }

  /* ---------- schedule ---------- */
  function drawSched(el) {
    const days = planDays(w);
    const conf = scheduleConflicts(w);
    const S = w.schedule || (w.schedule = []);
    const dayLabel = d => w.dateFrom ? fmtDay(addDays(w.dateFrom, d)) : `יום ${d + 1}`;
    const unscheduled = w.sections.filter(s => !S.some(x => x.sectionId === s.id));
    el.innerHTML = `
      ${!S.length && w.type === 'seminar' ? `<div class="notice" style="margin-bottom:12px">${ic('history')}<div>אפשר להתחיל מהלו״ז של הסמינר הקודם (שישי–שבת) ולערוך.<div style="margin-top:8px"><button class="btn sm" id="sc-sample">טעינת הלו״ז הקודם</button></div></div></div>` : ''}
      ${Array.from({ length: days }, (_, d) => {
        const items = S.filter(x => (x.day || 0) === d).sort((a, b) => (toMin(a.time) ?? 9999) - (toMin(b.time) ?? 9999));
        return `<div class="dayhead"><span>${esc(dayLabel(d))}</span><button class="btn sm ghost" data-addrow="${d}">${ic('plus', 'sm')}שורה</button></div>
        <div class="tbl-wrap"><table class="grid stack" style="--cols:4"><thead><tr><th style="width:96px">שעה</th><th style="width:78px">דק׳</th><th>מה קורה</th><th style="width:78px">עד</th><th style="width:44px"></th></tr></thead><tbody>
          ${items.map(x => `<tr data-row="${x.id}" ${conf.has(x.id) ? 'style="background:var(--amber-soft)"' : ''}><td data-l="שעה"><input type="time" data-sf="time" value="${esc(x.time)}" aria-label="שעה"></td><td data-l="דקות"><input type="number" inputmode="numeric" data-sf="minutes" value="${x.minutes || ''}" aria-label="דקות"></td><td class="wide" style="order:-1"><input data-sf="title" value="${esc(x.title)}" aria-label="מה קורה" placeholder="מה קורה" style="font-weight:600"></td><td data-l="עד" class="num faint" style="padding:12px 8px">${x.time && x.minutes ? addMin(x.time, x.minutes) : ''}</td><td class="act"><button class="iconbtn" data-delrow="${x.id}" aria-label="מחיקה" style="width:36px;height:36px">${ic('x', 'sm')}</button></td></tr>`).join('') || `<tr><td colspan="5" class="faint" style="padding:12px">אין עדיין פריטים ביום הזה</td></tr>`}
        </tbody></table></div>`;
      }).join('')}
      ${conf.size ? `<div class="ck warn" style="margin-top:12px">${ic('alert')}<div><b>יש חפיפה בזמנים</b><small>השורות המסומנות מתחילות לפני שהקודמת הסתיימה.</small></div></div>` : ''}
      ${unscheduled.length ? `<div class="sec-head" style="margin-top:18px"><h2>חלקים שעוד לא בלו״ז</h2></div><div class="tags">${unscheduled.map(s => `<button class="chip" data-schedsec="${s.id}">${ic('plus', 'sm')}${esc(s.title)}</button>`).join('')}</div>` : ''}`;
    el.oninput = e => {
      const tr = e.target.closest('[data-row]'); if (!tr) return; const x = S.find(r => r.id === tr.dataset.row); const f = e.target.dataset.sf;
      x[f] = f === 'minutes' ? (+e.target.value || 0) : e.target.value; changed();
      const endCell = tr.children[3]; endCell.textContent = x.time && x.minutes ? addMin(x.time, x.minutes) : '';
    };
    el.onchange = e => { if (e.target.dataset.sf === 'time') drawSched(el); };
    el.onclick = e => {
      const a = e.target.closest('[data-addrow]');
      if (a) { const d = +a.dataset.addrow; const last = S.filter(x => (x.day || 0) === d).sort((p, q) => (toMin(q.time) ?? 0) - (toMin(p.time) ?? 0))[0]; S.push({ id: uid('t'), day: d, time: last && last.time ? addMin(last.time, last.minutes || 30) : '08:00', minutes: 30, title: '' }); changed(); drawSched(el); return; }
      const del = e.target.closest('[data-delrow]'); if (del) { w.schedule = S.filter(x => x.id !== del.dataset.delrow); changed(); drawSched(el); return; }
      const ss = e.target.closest('[data-schedsec]');
      if (ss) {
        const s = w.sections.find(x => x.id === ss.dataset.schedsec);
        const d = 0; const last = S.filter(x => (x.day || 0) === d).sort((p, q) => (toMin(q.time) ?? 0) - (toMin(p.time) ?? 0))[0];
        S.push({ id: uid('t'), day: s.kind === 'morning' && days > 1 ? 1 : 0, time: s.kind === 'morning' ? '08:00' : s.kind === 'night' ? '21:30' : last && last.time ? addMin(last.time, last.minutes || 30) : '09:00', minutes: s.minutes || (TRIP_KINDS[s.kind]?.games ? 15 : 45), title: s.title, sectionId: s.id });
        changed(); drawSched(el); return;
      }
      if (e.target.closest('#sc-sample')) { for (const [d, t, m, ti] of SAMPLE_SEMINAR_SCHEDULE) S.push({ id: uid('t'), day: d, time: t, minutes: m, title: ti }); if ((w.days || 1) < 2) w.days = 2; changed(); drawSched(el); }
    };
  }

  /* ---------- equipment ---------- */
  function drawEq(el) {
    const list = equipmentOfPlan(w);
    const packed = new Set(w.packed || []);
    const who = w.eqWho || (w.eqWho = {});
    el.innerHTML = `
      <div class="notice" style="margin-bottom:12px">${ic('info')}<div>הרשימה נאספת אוטומטית מכל חלקי ה${w.type === 'trip' ? 'תיק' : 'סמינר'}. פריטים ״לכל חניך״ מוכפלים במספר המשתתפים${w.participants ? ` (${w.participants})` : ' — הזינו אותו בפרטים'}.</div></div>
      ${list.length ? `<div class="card" style="padding:4px 12px">${list.map(e => `<div class="eqrow"><label class="check ${packed.has(e.key) ? 'done' : ''}"><input type="checkbox" data-pack="${esc(e.key)}" ${packed.has(e.key) ? 'checked' : ''}><span>${esc(e.name)}${e.from.length ? `<span class="src"> · ${esc(e.from.slice(0, 2).join(', '))}</span>` : ''}</span></label>
        ${e.qty ? `<span class="qty num" title="${e.auto ? 'חושב לפי מספר המשתתפים' : ''}">×${e.qty}${e.auto ? '*' : ''}</span>` : ''}
        <input class="input" style="width:96px;min-height:40px;padding:4px 8px;font-size:16px" data-who="${esc(e.key)}" value="${esc(who[e.key] || '')}" placeholder="מי מביא" aria-label="מי מביא">
        ${(w.equipment || []).some(x => norm(x.name.replace(/\(.*?\)/g, '')) === e.key || norm(x.name) === e.key) ? `<button class="iconbtn" data-rmeq="${esc(e.key)}" aria-label="הסרה" style="width:36px;height:36px">${ic('x', 'sm')}</button>` : ''}</div>`).join('')}</div>
        <div class="hint" style="margin-top:6px">${list.filter(e => packed.has(e.key)).length} מתוך ${list.length} נארזו</div>` : `<p class="faint">אין עדיין ציוד.</p>`}
      <div class="chipsinput" style="margin-top:12px"><input id="peq-in" placeholder="הוספת פריט, למשל: 3 כדורים, חבל לכל חניך" enterkeyhint="done"></div>
      <div class="btnrow" style="margin-top:12px"><button class="btn sm" id="peq-copy">${ic('copy', 'sm')}העתקת הרשימה</button><button class="btn sm" id="peq-copy2">${ic('users', 'sm')}העתקה לפי מי מביא</button></div>`;
    el.onchange = e => { const p = e.target.closest('[data-pack]'); if (!p) return; const s = new Set(w.packed || []); p.checked ? s.add(p.dataset.pack) : s.delete(p.dataset.pack); w.packed = [...s]; changed(); drawEq(el); };
    el.oninput = e => { const wi = e.target.closest('[data-who]'); if (wi) { who[wi.dataset.who] = wi.value; changed(); } };
    el.onclick = e => {
      const r = e.target.closest('[data-rmeq]'); if (r) { w.equipment = w.equipment.filter(x => norm(x.name.replace(/\(.*?\)/g, '')) !== r.dataset.rmeq && norm(x.name) !== r.dataset.rmeq); changed(); drawEq(el); return; }
      if (e.target.closest('#peq-copy')) copyText([`ציוד — ${w.title}`, ...list.map(x => `• ${x.name}${x.qty ? ' ×' + x.qty : ''}`)].join('\n'), 'הרשימה הועתקה');
      if (e.target.closest('#peq-copy2')) {
        const g = {}; for (const x of list) (g[who[x.key] || 'לא שובץ'] = g[who[x.key] || 'לא שובץ'] || []).push(x);
        copyText(Object.entries(g).map(([k, v]) => `*${k}*\n` + v.map(x => `• ${x.name}${x.qty ? ' ×' + x.qty : ''}`).join('\n')).join('\n\n'), 'הועתק לפי מי מביא');
      }
    };
    $('#peq-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (!v) return; for (const n of v.split(/[,،]/).map(x => x.trim()).filter(Boolean)) w.equipment.push({ id: uid('e'), name: n }); changed(); drawEq(el); $('#peq-in').focus(); } });
  }

  /* ---------- checklist ---------- */
  function drawCheck(el) {
    const L = w.checklist || (w.checklist = []);
    el.innerHTML = `<div class="card" style="padding:4px 14px">${L.map((c, i) => `<div class="eqrow"><label class="check ${c.done ? 'done' : ''}"><input type="checkbox" data-ci="${i}" ${c.done ? 'checked' : ''}><span>${esc(c.text)}</span></label><button class="iconbtn" data-delc="${i}" aria-label="מחיקה" style="width:36px;height:36px">${ic('x', 'sm')}</button></div>`).join('') || '<p class="faint">אין פריטים</p>'}</div>
      <div class="chipsinput" style="margin-top:12px"><input id="cl-in" placeholder="משימה נוספת…" enterkeyhint="done"></div>
      <div class="hint" style="margin-top:6px">${L.filter(c => c.done).length} מתוך ${L.length} בוצעו</div>`;
    el.onchange = e => { const c = e.target.closest('[data-ci]'); if (c) { L[+c.dataset.ci].done = c.checked; changed(); drawCheck(el); } };
    el.onclick = e => { const d = e.target.closest('[data-delc]'); if (d) { L.splice(+d.dataset.delc, 1); changed(); drawCheck(el); } };
    $('#cl-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (!v) return; L.push({ id: uid('c'), text: v, done: false }); changed(); drawCheck(el); $('#cl-in').focus(); } });
  }

  /* ---------- menu & budget ---------- */
  function drawMenu(el) {
    const M = w.menu || (w.menu = []);
    const total = M.reduce((s, r) => s + (+r.qty || 0) * (+r.price || 0), 0);
    const byMeal = {}; for (const r of M) byMeal[r.meal] = (byMeal[r.meal] || 0) + (+r.qty || 0) * (+r.price || 0);
    const diets = w.diets || (w.diets = {});
    const dietTotal = Object.values(diets).reduce((s, v) => s + (+v || 0), 0);
    el.innerHTML = `
      <div class="sec-head"><h2>רגישויות ותזונה</h2><span class="faint num">${dietTotal ? dietTotal + ' משתתפים' : ''}</span></div>
      <div class="grid3">${DIETS.map(d => `<div class="field"><label>${d}</label><input class="input" type="number" inputmode="numeric" min="0" data-diet="${d}" value="${diets[d] || ''}" placeholder="0"></div>`).join('')}</div>
      ${w.participants && dietTotal && dietTotal !== +w.participants ? `<div class="ck warn" style="margin-bottom:12px">${ic('alert')}<div><b>הסכום לא תואם</b><small>סך הרגישויות (${dietTotal}) שונה ממספר המשתתפים (${w.participants}).</small></div></div>` : ''}
      <div class="sec-head" style="margin-top:8px"><h2>תפריט וקניות</h2>${!M.length ? `<button class="link" id="mn-sample">${ic('history', 'sm')}מהסמינר הקודם</button>` : ''}</div>
      <div class="tbl-wrap"><table class="grid stack" style="--cols:3"><thead><tr><th style="width:118px">ארוחה</th><th>פריט</th><th style="width:110px">תזונה</th><th style="width:70px">כמות</th><th style="width:80px">₪ ליח׳</th><th style="width:80px">סה״כ</th><th style="width:40px"></th></tr></thead><tbody>
        ${M.map((r, i) => `<tr data-m="${i}"><td data-l="ארוחה"><select data-mf="meal">${MEALS.map(m => `<option ${r.meal === m ? 'selected' : ''}>${m}</option>`).join('')}</select></td><td class="wide" style="order:-1"><input data-mf="item" value="${esc(r.item)}" aria-label="פריט" placeholder="פריט" style="font-weight:600"></td><td data-l="תזונה"><select data-mf="diet">${DIETS.map(d => `<option ${r.diet === d ? 'selected' : ''}>${d}</option>`).join('')}</select></td><td data-l="כמות"><input type="number" inputmode="decimal" data-mf="qty" value="${r.qty || ''}" aria-label="כמות"></td><td data-l="₪ ליחידה"><input type="number" inputmode="decimal" step="0.01" data-mf="price" value="${r.price || ''}" aria-label="מחיר ליחידה"></td><td data-l="סה״כ ₪" class="num" style="padding:12px 8px" data-sum>${((+r.qty || 0) * (+r.price || 0)).toFixed(0)}</td><td class="act"><button class="iconbtn" data-delm="${i}" aria-label="מחיקה" style="width:36px;height:36px">${ic('x', 'sm')}</button></td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="5">סה״כ</td><td class="num" id="mn-total">${total.toFixed(0)} ₪</td><td></td></tr></tfoot></table></div>
      <div class="btnrow" style="margin-top:10px"><button class="btn sm" id="mn-add">${ic('plus', 'sm')}פריט</button><button class="btn sm" id="mn-copy">${ic('copy', 'sm')}רשימת קניות</button></div>
      <div class="cards" style="margin-top:14px">
        <div class="card" style="padding:14px"><div class="eyebrow">עלות כוללת</div><div style="font:700 26px/1.2 var(--f-ui)" class="num">${total.toFixed(0)} ₪</div><div class="faint" style="font-size:13px">${w.participants ? `${(total / w.participants).toFixed(1)} ₪ למשתתף` : 'הזינו מספר משתתפים לחישוב עלות למשתתף'}</div></div>
        <div class="card" style="padding:14px"><div class="eyebrow">לפי ארוחה</div>${Object.entries(byMeal).map(([m, v]) => `<div style="display:flex;justify-content:space-between;font-size:14px"><span>${esc(m)}</span><span class="num">${v.toFixed(0)} ₪</span></div>`).join('') || '<span class="faint">—</span>'}</div>
      </div>`;
    el.oninput = e => {
      const dd = e.target.closest('[data-diet]'); if (dd) { diets[dd.dataset.diet] = +dd.value || 0; changed(); return; }
      const tr = e.target.closest('[data-m]'); if (!tr) return; const r = M[+tr.dataset.m]; const f = e.target.dataset.mf;
      r[f] = (f === 'qty' || f === 'price') ? (+e.target.value || 0) : e.target.value; changed();
      tr.querySelector('[data-sum]').textContent = ((+r.qty || 0) * (+r.price || 0)).toFixed(0);
      $('#mn-total').textContent = M.reduce((s, x) => s + (+x.qty || 0) * (+x.price || 0), 0).toFixed(0) + ' ₪';
    };
    el.onchange = e => { if (e.target.closest('[data-diet]') || e.target.dataset.mf === 'qty' || e.target.dataset.mf === 'price') drawMenu(el); };
    el.onclick = e => {
      if (e.target.closest('#mn-add')) { M.push({ meal: M.length ? M[M.length - 1].meal : 'ארוחת ערב', item: '', diet: 'רגיל', qty: 1, price: 0 }); changed(); drawMenu(el); const rows = $$('[data-m]', el); rows[rows.length - 1]?.querySelector('[data-mf="item"]').focus(); return; }
      const d = e.target.closest('[data-delm]'); if (d) { M.splice(+d.dataset.delm, 1); changed(); drawMenu(el); return; }
      if (e.target.closest('#mn-sample')) { for (const [meal, item, diet, qty, price] of SAMPLE_MENU) M.push({ meal, item, diet, qty, price }); changed(); drawMenu(el); toast('נטען התפריט מהסמינר הקודם — עדכנו כמויות ומחירים'); return; }
      if (e.target.closest('#mn-copy')) { const g = {}; for (const r of M) (g[r.meal] = g[r.meal] || []).push(r); copyText(`קניות — ${w.title}\n\n` + Object.entries(g).map(([m, rs]) => `*${m}*\n` + rs.map(r => `• ${r.item} ×${r.qty}${r.diet !== 'רגיל' ? ` (${r.diet})` : ''}`).join('\n')).join('\n\n'), 'רשימת הקניות הועתקה'); }
    };
  }

  /* ---------- section editor ---------- */
  function openSection(id) { Nav.go('plansec', { id: w.id, sec: id }); }
  main.addEventListener('click', e => {
    const s = e.target.closest('[data-sec]'); if (s) { openSection(s.dataset.sec); return; }
    const f = e.target.closest('[data-fix]'); if (f) { runFix(f.dataset.fix); return; }
    const g = e.target.closest('[data-go-tab]'); if (g) { go(g.dataset.goTab); return; }
    const d = e.target.closest('[data-doc]'); if (d) { e.preventDefault(); Nav.go('doc', { id: d.dataset.doc }); }
  });

  drawTabsBar(); drawBody();
  return { unmount() { save.flush(); }, onRemote() { const f = Store.get(w.id); if (f && f !== w && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { Object.assign(w, f); drawTabsBar(); drawBody(); } } };
};

/* ================================================================ one section of a plan */
VIEWS.plansec = (main, params) => {
  const w = Store.get(params.id);
  const s = w && w.sections.find(x => x.id === params.sec);
  if (!s) { main.innerHTML = `<div class="empty"><h3>החלק לא נמצא</h3></div>`; topbar({ title: '' }); return; }
  const T = TRIP_KINDS[s.kind] || TRIP_KINDS.custom;
  const save = debounce(() => Store.put(w, { quiet: true }), 350);
  topbar({ title: s.title || T.name, sub: w.title || '', actions: `<span data-savestate>${saveStateHtml()}</span><button class="iconbtn" id="ps-more" aria-label="עוד">${ic('more')}</button>` });
  function draw() {
    const games = T.games;
    const lib = games ? Lib.comps.filter(c => c.type === 'game' && (c.role === T.games || (T.games === 'warmup' && (c.role === 'opening' || c.role === 'warmup')))) : [];
    main.innerHTML = `<div class="ed">
      <div class="tags" style="margin-bottom:8px"><span class="tag khaki">${ic(T.icon, 'sm')} ${esc(T.name)}</span>${s.owner ? `<span class="tag">${esc(s.owner)}</span>` : ''}</div>
      <textarea class="input title-input" id="ps-title" rows="1" placeholder="${esc(T.name)}" style="font-size:34px">${esc(s.title)}</textarea>
      <div class="grid2"><div class="field"><label for="ps-owner">אחראי/ת</label>${(w.counselors || []).length ? `<select class="select" id="ps-owner"><option value="">—</option>${w.counselors.map(c => `<option ${s.owner === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : `<input class="input" id="ps-owner" value="${esc(s.owner)}" placeholder="שם">`}</div>
      <div class="field"><label for="ps-min">משך (דק׳)</label><input class="input" id="ps-min" type="number" inputmode="numeric" value="${s.minutes || ''}"></div></div>
      ${T.hint ? `<p class="hint" style="margin-top:-4px">${esc(T.hint)}</p>` : ''}
      ${s.kind === 'pov' ? povGuide() : ''}
      ${games ? `
        <div class="sec-head"><h2>המשחקים</h2><span class="faint num">${s.games.length}/${T.target}</span></div>
        <div class="list" id="ps-games">${s.games.map((g, i) => `<div class="card" style="padding:10px 12px" data-g="${i}"><div style="display:flex;gap:6px;align-items:center"><input class="input" data-gf="title" value="${esc(g.title)}" placeholder="שם המשחק" style="font-weight:600;min-height:40px">
          <button class="iconbtn" data-gup="${i}" aria-label="למעלה" ${i ? '' : 'disabled'}>${ic('chevu', 'sm')}</button><button class="iconbtn" data-gdel="${i}" aria-label="הסרה">${ic('trash', 'sm')}</button></div>
          <textarea class="textarea" data-gf="body" rows="2" style="min-height:56px;margin-top:6px" placeholder="הסבר קצר (לא חובה)">${esc(g.body || '')}</textarea>
          <input class="input" data-gf="equip" value="${esc((g.equip || []).join(', '))}" placeholder="ציוד (מופרד בפסיקים)" style="margin-top:6px;min-height:42px;font-size:16px"></div>`).join('') || '<p class="faint">עוד לא נבחרו משחקים.</p>'}</div>
        <div class="addbar"><button class="btn" id="ps-gadd">${ic('plus')}משחק משלי</button><button class="btn" id="ps-gauto">${ic('shuffle')}השלמה אוטומטית</button></div>
        <div class="sec-head" style="margin-top:18px"><h2>מהמאגר של השבט</h2><span class="faint">${lib.length}</span></div>
        <div class="tags" id="ps-lib">${lib.filter(c => !s.games.some(g => norm(g.title) === norm(c.title))).map(c => `<button class="chip" data-libg="${c.id}" title="${esc(plainMd(c.body || '').slice(0, 120))}">${ic('plus', 'sm')}${esc(c.title)}</button>`).join('')}</div>`
      : `<div class="field"><label for="ps-body">התוכן</label><textarea class="textarea" id="ps-body" rows="12" style="min-height:260px" placeholder="הפעלות, טקסט, שאלות לדיון… כמו שהייתם כותבים בתיק">${esc(s.body)}</textarea>
          <span class="hint">אפשר להשתמש ב־- לרשימות וב־**מודגש**.</span></div>
        <div class="addbar" style="grid-template-columns:1fr"><button class="btn" id="ps-lib-btn">${ic('library')}הוספה מהספרייה</button></div>`}
      <div class="field" style="margin-top:16px"><label>ציוד לחלק הזה</label><div class="chipsinput" id="ps-eq">${(s.equip || []).map((e, i) => `<span class="chip">${esc(e)}<button class="x" data-rmeq="${i}" aria-label="הסרה">${ic('x', 'sm')}</button></span>`).join('')}<input id="ps-eqin" placeholder="הוספה ואנטר…" enterkeyhint="done"></div><span class="hint">נכנס אוטומטית לרשימת הציוד של כל התיק.</span></div>
      <div class="actionbar"><button class="btn primary" id="ps-done">${ic('check')}סיום</button></div></div>`;
    bind();
  }
  function povGuide() {
    const g = Lib.doc('pdf-trip-helper');
    return `<details class="notice" style="display:block;margin-bottom:12px"><summary style="cursor:pointer;font-weight:600">${ic('info', 'sm')} איך כותבים נקודת מבט (מתוך ״עזרים לכתיבת תיק טיול״)</summary><ol style="margin:8px 0 0;padding-inline-start:20px">${(g?.povSteps || []).map(x => `<li style="margin-bottom:6px">${esc(x)}</li>`).join('')}</ol></details>`;
  }
  function bind() {
    const T2 = $('#ps-title'); autoGrow(T2);
    T2.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); T2.blur(); } };
    T2.oninput = () => { T2.value = T2.value.replace(/\n/g, ' '); autoGrow(T2); s.title = T2.value; save(); };
    const ow = $('#ps-owner'); ow.oninput = ow.onchange = () => { s.owner = ow.value; save(); };
    $('#ps-min').oninput = e => { s.minutes = +e.target.value || 0; save(); };
    const body = $('#ps-body'); if (body) { body.oninput = () => { s.body = body.value; autoGrow(body); save(); }; autoGrow(body); }
    const gl = $('#ps-games');
    if (gl) {
      gl.oninput = e => { const c = e.target.closest('[data-g]'); if (!c) return; const g = s.games[+c.dataset.g]; const f = e.target.dataset.gf; if (f === 'equip') g.equip = e.target.value.split(/[,،]/).map(x => x.trim()).filter(Boolean); else g[f] = e.target.value; save(); };
      gl.onclick = e => {
        const d = e.target.closest('[data-gdel]'); if (d) { s.games.splice(+d.dataset.gdel, 1); save(); draw(); return; }
        const u = e.target.closest('[data-gup]'); if (u) { const i = +u.dataset.gup; [s.games[i - 1], s.games[i]] = [s.games[i], s.games[i - 1]]; save(); draw(); }
      };
      $('#ps-gadd').onclick = () => { s.games.push({ id: uid('m'), title: '', body: '' }); save(); draw(); const ins = $$('[data-gf="title"]'); ins[ins.length - 1].focus(); };
      $('#ps-gauto').onclick = () => {
        const pool = Lib.comps.filter(c => c.type === 'game' && (c.role === T.games || c.role === 'upgraded' && T.games === 'warmup' || c.role === 'warmup' && T.games === 'upgraded') && !s.games.some(g => norm(g.title) === norm(c.title)));
        const need = Math.max(0, T.target - s.games.length);
        if (!need) { toast('כבר יש מספיק משחקים'); return; }
        for (let i = 0; i < need && pool.length; i++) { const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; s.games.push({ id: uid('m'), title: c.title, body: c.body || '' }); }
        save(); draw(); toast(`נוספו ${need} משחקים מהמאגר — אפשר להחליף`);
      };
      $('#ps-lib').onclick = e => { const b = e.target.closest('[data-libg]'); if (!b) return; const c = Lib.comp(b.dataset.libg); s.games.push({ id: uid('m'), title: c.title, body: c.body || '' }); save(); draw(); };
    }
    const lb = $('#ps-lib-btn'); if (lb) lb.onclick = () => { insertTarget = { id: w.id, sec: s.id, returnAfter: true }; Nav.go('library', { pick: insertTarget, tab: s.kind === 'skills' ? 'skills' : s.kind === 'pov' ? 'all' : 'all', q: s.kind === 'pov' ? '' : (TRIP_KINDS[s.kind]?.name || '').replace(/פעולת /, ''), focus: true }); };
    const ein = $('#ps-eqin');
    ein.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const v = ein.value.trim(); if (!v) return; s.equip = [...(s.equip || []), ...v.split(/[,،]/).map(x => x.trim()).filter(Boolean)]; save(); draw(); $('#ps-eqin').focus(); } };
    $('#ps-eq').onclick = e => { const r = e.target.closest('[data-rmeq]'); if (r) { s.equip.splice(+r.dataset.rmeq, 1); save(); draw(); } else ein.focus(); };
    $('#ps-done').onclick = () => Nav.back();
  }
  $('#ps-more').onclick = () => Sheet.show({
    title: s.title, body: `<div class="menu"><button data-a="copy"><span class="ic">${ic('copy')}</span>העתקת הטקסט</button><button data-a="save"><span class="ic">${ic('heart')}</span>שמירה לשימוש חוזר</button><button data-a="del" class="danger"><span class="ic">${ic('trash')}</span>מחיקת החלק</button></div>`,
    onMount: el => el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; Sheet.close(true);
      if (b.dataset.a === 'copy') copyText(s.title + '\n' + (T.games ? s.games.map(g => '• ' + g.title + (g.body ? ' — ' + g.body : '')).join('\n') : plainMd(s.body)));
      if (b.dataset.a === 'save') saveSnippet({ kind: T.kind, title: s.title, body: T.games ? s.games.map(g => '- ' + g.title + (g.body ? ' — ' + g.body : '')).join('\n') : s.body });
      if (b.dataset.a === 'del') { const i = w.sections.indexOf(s); w.sections.splice(i, 1); Store.put(w); Nav.back(); toast('החלק נמחק', { label: 'ביטול', fn: () => { w.sections.splice(i, 0, s); Store.put(w); render(false); } }); }
    }),
  });
  draw();
  return { unmount() { save.flush(); insertTarget = null; } };
};

