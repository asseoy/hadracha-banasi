/* הדרכה בנשיא — activity editor, checks, schedule */
'use strict';

const totalMinutes = w => (w.segments || []).reduce((s, x) => s + (+x.minutes || 0), 0);
const countQuestions = s => (String(s || '').match(/\?/g) || []).length;

// words that usually mean "we need to bring something"
const PROP_RE = /(נביא|נחלק|נכין|דפים|דף |טושים|בריסטול|חמאן|בלונים|שיפודים|פתקים|חבל|כדור|מדבקות|טופי|שוקולד|כוסות|לורד|עטים|קלפים|גיגית|מקלות|רמקול|מקרן|מחשב)/;

function activityChecks(w) {
  const segs = w.segments || [];
  const out = [];
  const add = (ok, title, detail, level = 'warn', fix = null, scoring = true) => out.push({ ok, title, detail, level: ok ? 'ok' : level, fix, scoring });
  add(!!(w.title || '').trim(), 'לפעולה יש שם', 'תנו שם שיעזור למצוא אותה אחר כך.', 'warn', 'title');
  add(!!(w.goal || '').trim(), 'מוגדרת מטרה', 'מה החניכים ייקחו מהפעולה? משפט אחד מספיק.', 'warn', 'goal');
  add(!!(w.question || '').trim(), 'יש שאלה במרכז הפעולה', 'במסע בצופים כל זמן תוכן עונה על שאלה אחת. לא חובה, אבל עוזר למקד.', 'info', 'question', false);
  add(segs.length >= 3, 'יש לפחות 3 חלקים', 'פעולה טובה בנויה ממשחק, הפעלות, דיון וסיכום.');
  add(segs.some(s => s.kind === 'game'), 'יש זמן משחק', 'משחק פתיחה מוריד אנרגיה ומכניס לפעולה.', 'warn', 'add:game');
  const disc = segs.filter(s => s.kind === 'discussion');
  const q = disc.reduce((n, s) => n + countQuestions(s.body), 0);
  add(disc.length > 0 && q >= 3, 'דיון עם לפחות 3 שאלות', disc.length ? `כרגע ${q} שאלות בדיון.` : 'אין עדיין חלק של דיון.', 'warn', disc.length ? 'seg:' + disc[0].id : 'add:discussion');
  const empty = segs.filter(s => !(s.body || '').trim() && s.kind !== 'mifkad');
  add(!empty.length, 'כל החלקים מפורטים', empty.length ? `${plural(empty.length, 'חלק אחד ריק', 'חלקים ריקים')}: ${empty.slice(0, 3).map(s => s.title || kindOf(s.kind).name).join(', ')}` : '', 'warn', empty.length ? 'seg:' + empty[0].id : null);
  const noMin = segs.filter(s => !(+s.minutes));
  add(!noMin.length, 'לכל חלק יש זמן', noMin.length ? `חסר זמן ב: ${noMin.slice(0, 3).map(s => s.title || kindOf(s.kind).name).join(', ')}` : '', 'warn', noMin.length ? 'seg:' + noMin[0].id : null);
  const tot = totalMinutes(w), tgt = +w.target || 0;
  if (tgt) add(Math.abs(tot - tgt) <= 10, 'הזמן הכולל מתאים למשך', tot > tgt ? `הפעולה ארוכה ב־${tot - tgt} דק׳ מהמשך שתכננתם (${fmtMin(tgt)}).` : `נשארו ${tgt - tot} דק׳ פנויות מתוך ${fmtMin(tgt)}.`, 'warn', 'target');
  const vids = segs.filter(s => s.kind === 'video' && !/https?:\/\//.test(s.body || ''));
  add(!vids.length, 'לכל סרטון יש קישור', vids.length ? 'הוסיפו קישור כדי שלא תצטרכו לחפש ביום הפעולה.' : '', 'warn', vids.length ? 'seg:' + vids[0].id : null);
  const allEq = equipmentOf(w);
  const mentions = segs.some(s => PROP_RE.test(s.body || ''));
  add(allEq.length > 0 || !mentions, 'רשימת ציוד', mentions ? 'בתוכן מוזכרים דברים להביא, אבל רשימת הציוד ריקה.' : '', 'warn', 'equipment');
  add(segs.some(s => s.kind === 'summary' || /סיכום|סיום/.test(s.title || '')), 'יש סגירה והעברת המסר', 'סיימו בסיכום קצר שמחבר את ההפעלות לשאלה.', 'info', 'add:summary', false);
  if (w.cat === 'course') add(segs.filter(s => s.kind === 'mifkad').length >= 2, 'מפקד פתיחה ומפקד סיום', 'בפעולות קורס הפעולה נפתחת ונסגרת במפקד.', 'info', 'add:mifkad', false);
  const sc = out.filter(o => o.scoring);
  const score = sc.length ? Math.round(100 * sc.filter(o => o.ok).length / sc.length) : 0;
  return { items: out, score, open: out.filter(o => !o.ok && o.level === 'warn').length };
}

function equipmentOf(w) {
  // general list + every segment's own items, merged by name (quantities add up)
  const map = new Map();
  const push = (name, from, qty) => {
    const n = String(name || '').trim(); if (!n) return;
    const k = norm(n);
    const cur = map.get(k);
    if (cur) { if (from && !cur.from.includes(from)) cur.from.push(from); if (qty) cur.qty = (cur.qty || 0) + qty; }
    else map.set(k, { name: n, from: from ? [from] : [], qty: qty || 0 });
  };
  for (const e of w.equipment || []) push(e.name, '', +e.qty || 0);
  for (const s of w.segments || []) for (const e of s.equip || []) push(e, s.title || kindOf(s.kind).name);
  return [...map.values()];
}

/* ================================================================ editor view */
VIEWS.edit = (main, params) => {
  const w = Store.get(params.id);
  if (!w || w.deleted) { main.innerHTML = `<div class="empty"><h3>הפעולה לא נמצאה</h3></div>`; topbar({ title: '' }); return; }
  Store.touch(w.id);
  const save = debounce(() => { Store.put(w, { quiet: true }); }, 350);
  const changed = () => { save(); updateFoot(); };

  function head() {
    const ch = activityChecks(w);
    topbar({
      title: w.title || 'פעולה חדשה', sub: (w.isTemplate ? 'תבנית · ' : '') + 'עריכה',
      actions: `<span data-savestate>${saveStateHtml()}</span>
        <button class="iconbtn" id="ed-more" aria-label="עוד">${ic('more')}</button>`,
    });
    $('#ed-more').onclick = moreMenu;
  }

  main.innerHTML = `<div class="ed">
    <textarea class="input title-input" id="ed-title" rows="1" placeholder="שם הפעולה" aria-label="שם הפעולה" enterkeyhint="done">${esc(w.title)}</textarea>
    ${w.origin ? `<div class="hint" style="margin:-4px 0 10px">${ic('dup', 'sm')} מבוסס על: ${w.origin.id ? `<a href="#" data-doc="${w.origin.id}">${esc(w.origin.title)}</a>` : esc(w.origin.title)}</div>` : ''}
    <div class="ed-meta" id="ed-meta"></div>
    <div class="field"><label for="ed-goal">מטרת הפעולה</label><textarea class="textarea" id="ed-goal" rows="2" style="min-height:64px" placeholder="מה החניכים ייקחו מהפעולה?">${esc(w.goal)}</textarea></div>
    <div class="field"><label for="ed-q">השאלה במרכז הפעולה <span class="faint">(לא חובה)</span></label><input class="input" id="ed-q" value="${esc(w.question)}" placeholder="למשל: האם הרושם הראשוני שלנו על אנשים נכון?"></div>
    <div class="sec-head" style="margin-top:18px"><h2>מהלך הפעולה</h2><button class="link" id="ed-collapse">${ic('chevu', 'sm')}כיווץ הכל</button></div>
    <div class="segs" id="segs"></div>
    <div class="addbar"><button class="btn" id="add-seg">${ic('plus')}חלק חדש</button><button class="btn" id="add-lib">${ic('library')}מהספרייה</button></div>
    <section class="section"><div class="sec-head"><h2>ציוד</h2><button class="link" id="eq-copy">${ic('copy', 'sm')}העתקה</button></div><div id="eq"></div></section>
    <section class="section"><div class="field"><label for="ed-notes">הערות למדריך</label><textarea class="textarea" id="ed-notes" rows="2" placeholder="תזכורות, מה לבדוק עם הראש״גד, לקחים מהפעם הקודמת…">${esc(w.notes || '')}</textarea></div></section>
    <div class="edfoot" id="edfoot"></div>
  </div>`;

  /* ---------- meta chips ---------- */
  function drawMeta() {
    const end = w.start ? addMin(w.start, totalMinutes(w)) : '';
    $('#ed-meta').innerHTML = `
      <button class="metabtn" data-meta="date">${ic('cal', 'sm')}<b>${w.date ? fmtDate(w.date) : 'תאריך'}</b></button>
      <button class="metabtn" data-meta="time">${ic('clock', 'sm')}<b>${w.start ? `${w.start}–${end}` : 'שעה'}</b></button>
      <button class="metabtn" data-meta="target">${ic('pause', 'sm')}משך: <b>${fmtMin(w.target || 0)}</b></button>
      <button class="metabtn" data-meta="aud">${ic('users', 'sm')}<b>${esc(w.audience || 'קהל')}</b></button>
      <button class="metabtn" data-meta="cat">${ic('layers', 'sm')}<b>${esc(CATS[w.cat] || 'סוג')}</b></button>
      <button class="metabtn" data-meta="topic">${ic('flag', 'sm')}${w.topic ? `<b>${esc(w.topic)}</b>` : 'נושא חודשי'}</button>`;
  }
  $('#ed-meta').addEventListener('click', e => { const b = e.target.closest('[data-meta]'); if (b) metaSheet(b.dataset.meta); });
  function metaSheet(which) {
    const bodies = {
      date: `<div class="field"><label for="m-date">תאריך הפעולה</label><input class="input" type="date" id="m-date" value="${esc(w.date)}"></div>`,
      time: `<div class="field"><label for="m-start">שעת התחלה</label><input class="input" type="time" id="m-start" value="${esc(w.start)}" step="300"></div><p class="hint">הלו״ז של כל חלק מחושב אוטומטית מהשעה ומהזמנים.</p>`,
      target: `<div class="field"><label>כמה זמן יש לפעולה?</label><div class="btnrow">${[30, 45, 60, 75, 90, 120, 150, 180].map(m => `<button class="chip" data-t="${m}" aria-pressed="${+w.target === m}">${fmtMin(m)}</button>`).join('')}</div></div><div class="field"><label for="m-target">או בדקות</label><input class="input" id="m-target" type="number" inputmode="numeric" value="${w.target || ''}"></div>`,
      aud: `<div class="btnrow">${AUDIENCES.map(a => `<button class="chip" data-a="${a}" aria-pressed="${w.audience === a}">${a}</button>`).join('')}</div>`,
      cat: `<div class="btnrow">${Object.entries(CATS).filter(([k]) => k !== 'tribe').map(([k, v]) => `<button class="chip" data-c="${k}" aria-pressed="${w.cat === k}">${v}</button>`).join('')}</div>`,
      topic: `<div class="field"><label for="m-topic">נושא חודשי</label><input class="input" id="m-topic" value="${esc(w.topic)}" placeholder="למשל: זהות ישראלית"></div><div class="btnrow">${Lib.topics.map(t => `<button class="chip" data-tp="${esc(t)}">${esc(t)}</button>`).join('')}</div>`,
    };
    const titles = { date: 'תאריך', time: 'שעת התחלה', target: 'משך הפעולה', aud: 'למי הפעולה?', cat: 'סוג הפעולה', topic: 'נושא חודשי' };
    Sheet.show({
      title: titles[which], body: bodies[which], foot: `<button class="btn primary" data-close-ok>סיום</button>`,
      onMount: s => {
        const done = () => { drawMeta(); updateFoot(); changed(); Sheet.close(); };
        s.querySelector('[data-close-ok]').onclick = done;
        s.addEventListener('input', e => {
          if (e.target.id === 'm-date') w.date = e.target.value;
          if (e.target.id === 'm-start') w.start = e.target.value;
          if (e.target.id === 'm-target') w.target = +e.target.value || 0;
          if (e.target.id === 'm-topic') w.topic = e.target.value;
          changed(); drawMeta();
        });
        s.addEventListener('click', e => {
          const t = e.target.closest('[data-t]'); if (t) { w.target = +t.dataset.t; done(); }
          const a = e.target.closest('[data-a]'); if (a) { w.audience = a.dataset.a; done(); }
          const c = e.target.closest('[data-c]'); if (c) { w.cat = c.dataset.c; done(); }
          const tp = e.target.closest('[data-tp]'); if (tp) { w.topic = tp.dataset.tp; done(); }
        });
      },
    });
  }

  /* ---------- segments ---------- */
  const collapsed = new Set(LS.get('collapsed:' + w.id, []));
  function segCard(s, i) {
    const K = kindOf(s.kind);
    const times = segTimes();
    const isC = collapsed.has(s.id);
    return `<div class="segc ${isC ? 'collapsed' : ''}" data-seg="${s.id}">
      <div class="segc-head">
        <span class="grip" data-grip aria-label="גרירה לשינוי סדר" title="גררו כדי לשנות סדר">${ic('grip')}</span>
        <button class="k k-${s.kind}" data-kind aria-label="סוג: ${K.name}">${ic(K.icon)}</button>
        <input class="ttl" data-f="title" value="${esc(s.title)}" placeholder="${esc(K.name)}" aria-label="כותרת החלק">
        <span class="segc-time num" data-time>${times[i] ? times[i] + ' · ' : ''}${+s.minutes || 0}′</span>
        <button class="iconbtn" data-collapse aria-label="${isC ? 'פתיחה' : 'כיווץ'}" style="width:36px;height:40px">${ic(isC ? 'chevd' : 'chevu', 'sm')}</button>
        <button class="iconbtn" data-segmore aria-label="אפשרויות לחלק" style="width:36px;height:40px">${ic('more', 'sm')}</button>
      </div>
      <div class="segc-body">
        <textarea class="textarea" data-f="body" rows="4" placeholder="${esc(K.hint || 'מה עושים בחלק הזה?')}">${esc(s.body)}</textarea>
        <div class="segc-tools">
          <span class="stepper" aria-label="דקות"><button data-min="-5" aria-label="פחות 5 דקות">${ic('x', 'sm').replace(ICONS.x, '<path d="M5 12h14"/>')}</button><input data-f="minutes" type="number" inputmode="numeric" value="${+s.minutes || 0}" aria-label="דקות"><button data-min="5" aria-label="עוד 5 דקות">${ic('plus', 'sm')}</button></span>
          <span class="faint" style="font-size:12.5px">דק׳</span>
          ${segIdeasBtn(s)}
        </div>
        <div style="margin-top:10px"><div class="lbl" style="margin-bottom:6px;font-size:12.5px">ציוד לחלק הזה</div>
          <div class="chipsinput" data-eqbox>${(s.equip || []).map((e, j) => `<span class="chip">${esc(e)}<button class="x" data-rmeq="${j}" aria-label="הסרה">${ic('x', 'sm')}</button></span>`).join('')}<input data-eqin placeholder="הוספה ואנטר…" enterkeyhint="done" aria-label="הוספת ציוד"></div></div>
        ${s.from ? `<div class="hint" style="margin-top:8px">מקור: ${esc(s.from)}</div>` : ''}
      </div></div>`;
  }
  function segIdeasBtn(s) {
    const label = { game: 'משחקים מהספרייה', text: 'טקסטים מתאימים', discussion: 'שאלות מהספרייה', activity: 'הפעלות דומות', pov: 'נקודות מבט', skills: 'זמני צופיות', video: 'פעולות עם סרטון' }[s.kind];
    return label ? `<button class="btn sm ghost" data-ideas>${ic('spark', 'sm')}${label}</button>` : '';
  }
  function segTimes() {
    if (!w.start) return [];
    let t = w.start; return w.segments.map(s => { const cur = t; t = addMin(t, +s.minutes || 0); return cur; });
  }
  function drawSegs() {
    const el = $('#segs');
    el.innerHTML = w.segments.length ? w.segments.map(segCard).join('') : `<div class="empty card" style="padding:24px">${ic('layers')}<h3>עוד אין חלקים</h3><p>הוסיפו חלק חדש, או הביאו הפעלות, משחקים וטקסטים מהספרייה.</p></div>`;
    for (const ta of $$('textarea[data-f="body"]', el)) autoGrow(ta);
  }
  function updateTimes() {
    const times = segTimes();
    $$('.segc', $('#segs')).forEach((c, i) => { const s = w.segments[i]; if (!s) return; const t = c.querySelector('[data-time]'); if (t) t.textContent = `${times[i] ? times[i] + ' · ' : ''}${+s.minutes || 0}′`; });
  }
  const segById = id => w.segments.find(s => s.id === id);
  const segsEl = $('#segs');
  segsEl.addEventListener('input', e => {
    const card = e.target.closest('[data-seg]'); if (!card) return;
    const s = segById(card.dataset.seg); const f = e.target.dataset.f;
    if (f === 'title') s.title = e.target.value;
    if (f === 'body') { s.body = e.target.value; autoGrow(e.target); }
    if (f === 'minutes') { s.minutes = clamp(+e.target.value || 0, 0, 600); updateTimes(); }
    changed();
  });
  segsEl.addEventListener('keydown', e => {
    if (e.target.matches('[data-eqin]') && e.key === 'Enter') {
      e.preventDefault();
      const card = e.target.closest('[data-seg]'); const s = segById(card.dataset.seg);
      const v = e.target.value.trim(); if (!v) return;
      s.equip = [...(s.equip || []), ...v.split(/[,،]/).map(x => x.trim()).filter(Boolean)];
      changed(); redrawSeg(s.id, true); drawEq();
    }
  });
  segsEl.addEventListener('focusout', e => {
    if (e.target.matches('[data-eqin]') && e.target.value.trim()) {
      const card = e.target.closest('[data-seg]'); const s = segById(card.dataset.seg);
      s.equip = [...(s.equip || []), ...e.target.value.split(/[,،]/).map(x => x.trim()).filter(Boolean)];
      e.target.value = ''; changed(); redrawSeg(s.id); drawEq();
    }
  });
  segsEl.addEventListener('click', e => {
    const card = e.target.closest('[data-seg]'); if (!card) return;
    const s = segById(card.dataset.seg);
    const mn = e.target.closest('[data-min]');
    if (mn) { s.minutes = clamp((+s.minutes || 0) + +mn.dataset.min, 0, 600); card.querySelector('[data-f="minutes"]').value = s.minutes; updateTimes(); changed(); return; }
    if (e.target.closest('[data-collapse]')) { collapsed.has(s.id) ? collapsed.delete(s.id) : collapsed.add(s.id); LS.set('collapsed:' + w.id, [...collapsed]); redrawSeg(s.id); return; }
    if (e.target.closest('[data-kind]')) { kindMenu(s); return; }
    if (e.target.closest('[data-segmore]')) { segMenu(s); return; }
    if (e.target.closest('[data-ideas]')) { segIdeas(s); return; }
    const rm = e.target.closest('[data-rmeq]'); if (rm) { s.equip.splice(+rm.dataset.rmeq, 1); changed(); redrawSeg(s.id); drawEq(); return; }
    if (e.target.closest('[data-eqbox]')) card.querySelector('[data-eqin]').focus();
  });
  function redrawSeg(id, focusEq) {
    const i = w.segments.findIndex(s => s.id === id);
    const old = $(`[data-seg="${id}"]`); if (!old) return;
    const tmp = document.createElement('div'); tmp.innerHTML = segCard(w.segments[i], i);
    const nu = tmp.firstElementChild; old.replaceWith(nu);
    const ta = nu.querySelector('textarea'); if (ta) autoGrow(ta);
    if (focusEq) nu.querySelector('[data-eqin]').focus();
  }
  function kindMenu(s) {
    Sheet.show({
      title: 'איזה חלק זה?', body: `<div class="menu">${KIND_ORDER.map(k => `<button data-k="${k}"><span class="ic k-${k}">${ic(KINDS[k].icon)}</span><div>${KINDS[k].name}<small>${esc(KINDS[k].hint)}</small></div>${s.kind === k ? `<span style="margin-inline-start:auto;color:var(--green)">${ic('check')}</span>` : ''}</button>`).join('')}</div>`,
      onMount: el => el.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; s.kind = b.dataset.k; changed(); Sheet.close(); redrawSeg(s.id); }),
    });
  }
  function segMenu(s) {
    const i = w.segments.indexOf(s);
    Sheet.show({
      title: s.title || kindOf(s.kind).name, body: `<div class="menu">
        <button data-a="up" ${i === 0 ? 'disabled style="opacity:.4"' : ''}><span class="ic">${ic('chevu')}</span>הזזה למעלה</button>
        <button data-a="down" ${i === w.segments.length - 1 ? 'disabled style="opacity:.4"' : ''}><span class="ic">${ic('chevd')}</span>הזזה למטה</button>
        <button data-a="dup"><span class="ic">${ic('dup')}</span>שכפול החלק</button>
        <button data-a="above"><span class="ic">${ic('plus')}</span>הוספת חלק מעל</button>
        <button data-a="save"><span class="ic">${ic('heart')}</span><div>שמירה לשימוש חוזר<small>יופיע ב״שמורים״ בספרייה</small></div></button>
        <button data-a="copy"><span class="ic">${ic('copy')}</span>העתקת הטקסט</button>
        <button data-a="del" class="danger"><span class="ic">${ic('trash')}</span>מחיקת החלק</button></div>`,
      onMount: el => el.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a; Sheet.close(true);
        if (a === 'up' || a === 'down') { const j = a === 'up' ? i - 1 : i + 1; [w.segments[i], w.segments[j]] = [w.segments[j], w.segments[i]]; changed(); drawSegs(); }
        if (a === 'dup') { w.segments.splice(i + 1, 0, { ...clone(s), id: uid('g') }); changed(); drawSegs(); }
        if (a === 'above') addSegment(i);
        if (a === 'save') saveSnippet(s);
        if (a === 'copy') copyText((s.title ? s.title + '\n' : '') + plainMd(s.body));
        if (a === 'del') {
          const backup = clone(s); w.segments.splice(i, 1); changed(); drawSegs();
          toast('החלק נמחק', { label: 'ביטול', fn: () => { w.segments.splice(i, 0, backup); changed(); drawSegs(); } });
        }
      }),
    });
  }
  function addSegment(at = w.segments.length) {
    Sheet.show({
      title: 'הוספת חלק', body: `<div class="menu">${KIND_ORDER.map(k => `<button data-k="${k}"><span class="ic k-${k}">${ic(KINDS[k].icon)}</span><div>${KINDS[k].name}<small>${esc(KINDS[k].hint)}</small></div></button>`).join('')}
        <button data-k="lib"><span class="ic">${ic('library')}</span><div>מהספרייה<small>משחק, טקסט, שאלות או הפעלה שכבר נכתבו</small></div></button></div>`,
      onMount: el => el.addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b) return; Sheet.close(true);
        if (b.dataset.k === 'lib') { pickFromLibrary(at); return; }
        const s = { id: uid('g'), kind: b.dataset.k, title: KINDS[b.dataset.k].name, minutes: defaultMinutes(b.dataset.k), body: '', equip: [] };
        w.segments.splice(at, 0, s); changed(); drawSegs();
        setTimeout(() => { const c = $(`[data-seg="${s.id}"]`); if (c) { c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.querySelector('textarea').focus({ preventScroll: true }); } }, 60);
      }),
    });
  }
  function pickFromLibrary(at, opts = {}) {
    insertTarget = { id: w.id, at, returnAfter: true };
    Nav.go('library', Object.assign({ pick: insertTarget, focus: true }, opts));
  }
  function segIdeas(s) {
    // suggestions from the library, ranked by the activity's own words
    const q = [w.title, w.topic, s.title].filter(Boolean).join(' ').replace(/פעולת|פעולה|הפעלה|משחק|דיון|טקסט/g, ' ').trim();
    const tab = { game: 'game', text: 'text', discussion: 'questions', activity: 'method', pov: 'trips', skills: 'skills', video: 'act' }[s.kind];
    pickFromLibrary(w.segments.indexOf(s) + 1, { tab, q: q.split(/\s+/).slice(0, 3).join(' ') });
  }

  /* ---------- drag to reorder (pointer events: works with touch and mouse) ---------- */
  let drag = null;
  segsEl.addEventListener('pointerdown', e => {
    const g = e.target.closest('[data-grip]'); if (!g) return;
    const card = g.closest('[data-seg]'); e.preventDefault();
    g.setPointerCapture(e.pointerId);
    drag = { id: card.dataset.seg, card, y0: e.clientY, to: null };
    card.classList.add('dragging');
  });
  segsEl.addEventListener('pointermove', e => {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    drag.card.style.transform = `translateY(${dy}px)`;
    const cards = $$('.segc', segsEl).filter(c => c !== drag.card);
    $$('.drop-before,.drop-after', segsEl).forEach(c => c.classList.remove('drop-before', 'drop-after'));
    let target = null, after = false;
    for (const c of cards) { const r = c.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { target = c; break; } }
    if (!target && cards.length) { target = cards[cards.length - 1]; after = true; }
    if (target) { target.classList.add(after ? 'drop-after' : 'drop-before'); drag.to = { id: target.dataset.seg, after }; }
    // auto-scroll near the edges
    if (e.clientY < 90) window.scrollBy(0, -12); else if (e.clientY > innerHeight - 140) window.scrollBy(0, 12);
  });
  const endDrag = () => {
    if (!drag) return;
    $$('.drop-before,.drop-after', segsEl).forEach(c => c.classList.remove('drop-before', 'drop-after'));
    drag.card.classList.remove('dragging'); drag.card.style.transform = '';
    if (drag.to && drag.to.id !== drag.id) {
      const from = w.segments.findIndex(s => s.id === drag.id);
      const [m] = w.segments.splice(from, 1);
      let to = w.segments.findIndex(s => s.id === drag.to.id) + (drag.to.after ? 1 : 0);
      w.segments.splice(to, 0, m); changed(); drawSegs();
      if (navigator.vibrate) try { navigator.vibrate(8); } catch { }
    }
    drag = null;
  };
  segsEl.addEventListener('pointerup', endDrag);
  segsEl.addEventListener('pointercancel', endDrag);

  /* ---------- equipment ---------- */
  function drawEq() {
    const list = equipmentOf(w);
    const done = new Set(w.packed || []);
    $('#eq').innerHTML = `${list.length ? list.map(e => `<div class="eqrow"><label class="check ${done.has(norm(e.name)) ? 'done' : ''}"><input type="checkbox" data-pack="${esc(norm(e.name))}" ${done.has(norm(e.name)) ? 'checked' : ''}><span>${esc(e.name)}${e.from.length ? `<span class="src"> · ${esc(e.from.join(', '))}</span>` : ''}</span></label>${e.qty ? `<span class="qty">×${e.qty}</span>` : ''}${(w.equipment || []).some(x => norm(x.name) === norm(e.name)) ? `<button class="iconbtn" data-rmgeq="${esc(norm(e.name))}" aria-label="הסרה" style="width:36px;height:36px">${ic('x', 'sm')}</button>` : ''}</div>`).join('') : '<p class="faint" style="font-size:14px;margin:0 0 8px">ציוד שתוסיפו לחלקים יופיע כאן אוטומטית. אפשר גם להוסיף ישירות:</p>'}
      <div class="chipsinput" style="margin-top:8px"><input id="eq-in" placeholder="הוספת פריט (למשל: בריסטול, טושים)…" enterkeyhint="done"></div>
      ${list.length ? `<div class="hint" style="margin-top:6px">${list.filter(e => done.has(norm(e.name))).length} מתוך ${list.length} נארזו</div>` : ''}`;
  }
  $('#eq').addEventListener('change', e => {
    const p = e.target.closest('[data-pack]'); if (!p) return;
    const set = new Set(w.packed || []); p.checked ? set.add(p.dataset.pack) : set.delete(p.dataset.pack);
    w.packed = [...set]; changed(); drawEq();
  });
  $('#eq').addEventListener('click', e => { const r = e.target.closest('[data-rmgeq]'); if (r) { w.equipment = w.equipment.filter(x => norm(x.name) !== r.dataset.rmgeq); changed(); drawEq(); } });
  $('#eq').addEventListener('keydown', e => {
    if (e.target.id === 'eq-in' && e.key === 'Enter') {
      e.preventDefault(); const v = e.target.value.trim(); if (!v) return;
      for (const name of v.split(/[,،]/).map(x => x.trim()).filter(Boolean)) w.equipment.push({ id: uid('e'), name });
      changed(); drawEq(); $('#eq-in').focus();
    }
  });
  $('#eq-copy').onclick = () => copyText([`ציוד — ${w.title || 'פעולה'}`, ...equipmentOf(w).map(e => '• ' + e.name + (e.qty ? ` ×${e.qty}` : ''))].join('\n'), 'רשימת הציוד הועתקה');

  /* ---------- footer: totals, schedule, checks, export ---------- */
  function updateFoot() {
    const tot = totalMinutes(w), tgt = +w.target || 0;
    const ch = activityChecks(w);
    const diff = tgt ? tot - tgt : 0;
    $('#edfoot').innerHTML = `
      <div class="tot"><b class="num">${fmtMin(tot)}</b>${tgt ? `<span class="num" style="opacity:.8"> / ${fmtMin(tgt)}</span>` : ''}
        <small>${w.start ? `${w.start}–${addMin(w.start, tot)} · ` : ''}${diff > 5 ? `ארוך ב־${diff} דק׳` : diff < -5 ? `נשארו ${-diff} דק׳` : tgt ? 'בדיוק בזמן' : `${w.segments.length} חלקים`}</small></div>
      <button class="iconbtn" id="f-sched" aria-label="לו״ז">${ic('clock')}</button>
      <button class="iconbtn" id="f-checks" aria-label="בדיקות">${ic('checkc')}${ch.open ? `<span class="badge">${ch.open}</span>` : ''}</button>
      <button class="btn primary sm" id="f-export">${ic('doc', 'sm')}ייצוא</button>`;
    $('#f-sched').onclick = () => scheduleSheet();
    $('#f-checks').onclick = () => checksSheet();
    $('#f-export').onclick = () => openExport(w);
    drawMeta();
  }
  function scheduleSheet() {
    let t = w.start || '';
    const rows = w.segments.map(s => { const st = t; t = t ? addMin(t, +s.minutes || 0) : ''; return { s, st }; });
    Sheet.show({
      title: 'לו״ז הפעולה', body: `
        ${w.start ? '' : `<div class="notice" style="margin-bottom:12px">${ic('info')}<div>קבעו שעת התחלה כדי לראות שעות מדויקות. <button class="btn sm" id="sc-start" style="margin-top:6px">קביעת שעה</button></div></div>`}
        <div class="sched">${rows.map(({ s, st }) => `<div class="sched-row"><div class="t num">${st || '—'}<small>${+s.minutes || 0} דק׳</small></div><div><b style="font-weight:600">${esc(s.title || kindOf(s.kind).name)}</b><div class="faint" style="font-size:12.5px">${esc(kindOf(s.kind).name)}</div></div><span class="k k-${s.kind}" style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center">${ic(kindOf(s.kind).icon, 'sm')}</span></div>`).join('')}
        <div class="sched-row"><div class="t num">${t || ''}</div><div><b>סיום</b> <span class="faint">· סה״כ ${fmtMin(totalMinutes(w))}</span></div><span></span></div></div>`,
      foot: `<button class="btn" id="sc-copy">${ic('copy')}העתקת הלו״ז</button>`,
      onMount: el => {
        const b = el.querySelector('#sc-start'); if (b) b.onclick = () => { Sheet.close(true); metaSheet('time'); };
        el.querySelector('#sc-copy').onclick = () => copyText([`לו״ז — ${w.title}`, ...rows.map(({ s, st }) => `${st ? st + ' ' : ''}${s.title || kindOf(s.kind).name} (${+s.minutes || 0} דק׳)`)].join('\n'), 'הלו״ז הועתק');
      },
    });
  }
  function checksSheet() {
    const ch = activityChecks(w);
    Sheet.show({
      title: `מוכנות הפעולה · ${ch.score}%`, tall: true, body: `<div class="checks">${ch.items.sort((a, b) => (a.ok - b.ok) || (a.level === 'info') - (b.level === 'info')).map(c => `
        <div class="ck ${c.level}">${ic(c.ok ? 'checkc' : c.level === 'info' ? 'info' : 'alert')}<div style="flex:1"><b>${esc(c.title)}</b>${!c.ok && c.detail ? `<small>${esc(c.detail)}</small>` : ''}${!c.ok && c.fix ? `<button class="btn sm" data-fix="${c.fix}">${c.fix.startsWith('add:') ? 'הוספה' : 'לתיקון'}</button>` : ''}</div></div>`).join('')}</div>
        <p class="hint" style="margin-top:12px">הבדיקות מבוססות על מרכיבי הפעולה של ״המסע בצופים״ ועל טופס אישור הפעולה.</p>`,
      onMount: el => el.addEventListener('click', e => {
        const b = e.target.closest('[data-fix]'); if (!b) return; Sheet.close(true); const f = b.dataset.fix;
        if (f === 'title') $('#ed-title').focus();
        else if (f === 'goal') $('#ed-goal').focus();
        else if (f === 'question') $('#ed-q').focus();
        else if (f === 'target') metaSheet('target');
        else if (f === 'equipment') { $('#eq').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#eq-in').focus({ preventScroll: true }), 300); }
        else if (f.startsWith('add:')) { const k = f.slice(4); const s = { id: uid('g'), kind: k, title: KINDS[k].name, minutes: defaultMinutes(k), body: '', equip: [] }; if (k === 'game' || (k === 'mifkad' && !w.segments.some(x => x.kind === 'mifkad'))) w.segments.unshift(s); else w.segments.push(s); changed(); drawSegs(); focusSeg(s.id); }
        else if (f.startsWith('seg:')) focusSeg(f.slice(4));
      }),
    });
  }
  function focusSeg(id) {
    collapsed.delete(id); redrawSeg(id);
    setTimeout(() => { const c = $(`[data-seg="${id}"]`); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.querySelector('textarea').focus({ preventScroll: true }); } }, 80);
  }

  /* ---------- more menu ---------- */
  function moreMenu() {
    Sheet.show({
      title: w.title || 'פעולה', body: `<div class="menu">
        <button data-a="preview"><span class="ic">${ic('eye')}</span><div>תצוגת מסמך<small>איך הפעולה תיראה מודפסת</small></div></button>
        <button data-a="export"><span class="ic">${ic('doc')}</span><div>ייצוא<small>Word, קובץ להדפסה, טופס אסמכתא, וואטסאפ</small></div></button>
        <button data-a="dup"><span class="ic">${ic('dup')}</span><div>שכפול<small>גרסה חדשה לשכבה אחרת או לשנה הבאה</small></div></button>
        <button data-a="tpl"><span class="ic">${ic('layers')}</span><div>${w.isTemplate ? 'הסרה מהתבניות' : 'שמירה כתבנית'}<small>תופיע בתפריט היצירה</small></div></button>
        <button data-a="ready"><span class="ic">${ic('checkc')}</span><div>${w.status === 'ready' ? 'סימון כטיוטה' : 'סימון כמוכנה'}</div></button>
        <button data-a="del" class="danger"><span class="ic">${ic('trash')}</span>מחיקה</button></div>`,
      onMount: el => el.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a; Sheet.close(true);
        if (a === 'preview') openPreview(w);
        if (a === 'export') openExport(w);
        if (a === 'dup') { const c = newActivity({ ...clone(w), id: uid('a'), title: w.title + ' (עותק)', createdAt: 0, isTemplate: false, origin: { title: w.title }, segments: w.segments.map(s => ({ ...clone(s), id: uid('g') })) }); Nav.go('edit', { id: c.id }, { replace: true }); toast('נוצר עותק'); }
        if (a === 'tpl') { w.isTemplate = !w.isTemplate; Store.put(w); head(); toast(w.isTemplate ? 'נשמר כתבנית' : 'הוסר מהתבניות'); }
        if (a === 'ready') { w.status = w.status === 'ready' ? 'draft' : 'ready'; Store.put(w); toast(w.status === 'ready' ? 'סומנה כמוכנה' : 'סומנה כטיוטה'); }
        if (a === 'del') { Store.remove(w.id); Nav.back(); toast('הפעולה נמחקה', { label: 'ביטול', fn: () => { Store.restore(w.id); } }); }
      }),
    });
  }

  /* ---------- top fields ---------- */
  $('#ed-title').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
  $('#ed-title').addEventListener('input', e => { e.target.value = e.target.value.replace(/\n/g, ' '); autoGrow(e.target); w.title = e.target.value; $('.tb-title') && ($('.tb-title').firstChild.textContent = w.title || 'פעולה חדשה'); changed(); });
  $('#ed-goal').addEventListener('input', e => { w.goal = e.target.value; autoGrow(e.target); changed(); });
  $('#ed-q').addEventListener('input', e => { w.question = e.target.value; changed(); });
  $('#ed-notes').addEventListener('input', e => { w.notes = e.target.value; autoGrow(e.target); changed(); });
  $('#add-seg').onclick = () => addSegment();
  $('#add-lib').onclick = () => pickFromLibrary(w.segments.length);
  $('#ed-collapse').onclick = () => {
    const all = w.segments.every(s => collapsed.has(s.id));
    if (all) collapsed.clear(); else w.segments.forEach(s => collapsed.add(s.id));
    LS.set('collapsed:' + w.id, [...collapsed]); drawSegs();
    $('#ed-collapse').innerHTML = all ? `${ic('chevu', 'sm')}כיווץ הכל` : `${ic('chevd', 'sm')}פתיחת הכל`;
  };
  main.addEventListener('click', e => { const d = e.target.closest('[data-doc]'); if (d) { e.preventDefault(); Nav.go('doc', { id: d.dataset.doc }); } });

  function refreshAll() { head(); drawSegs(); drawEq(); updateFoot(); $('#ed-title').value = w.title; $('#ed-goal').value = w.goal; $('#ed-q').value = w.question || ''; }
  head(); drawSegs(); drawEq(); updateFoot();
  autoGrow($('#ed-goal')); autoGrow($('#ed-title'));
  if (params.focusTitle && !w.title) setTimeout(() => $('#ed-title').focus(), 80);
  // returning from the library with a new part: bring it into view
  const lastId = w.segments.length && Nav.cur.params.lastSeen !== w.segments.length ? null : null;
  return {
    unmount() { save.flush(); insertTarget = null; },
    onRemote() { const fresh = Store.get(w.id); if (fresh && fresh !== w && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') { Object.assign(w, fresh); refreshAll(); } },
  };
};

function autoGrow(ta) {
  if (!ta || CSS.supports('field-sizing', 'content')) return;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight + 2, 900) + 'px';
}
