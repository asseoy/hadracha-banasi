/* הדרכה בנשיא — document model, preview, Word / HTML / text export */
'use strict';

/* A small document model every output format renders from:
   {title, sub, blocks:[{t:'h2'|'h3'|'p'|'md'|'kv'|'table'|'list'|'break', ...}]} */

function mdToBlocks(md) { return md ? [{ t: 'md', md }] : []; }

function activityModel(w, { official = false } = {}) {
  const tot = totalMinutes(w);
  const end = w.start ? addMin(w.start, tot) : '';
  const eq = equipmentOf(w);
  const blocks = [];
  let t = w.start || '';
  const sched = (w.segments || []).map(s => { const st = t; t = t ? addMin(t, +s.minutes || 0) : ''; return [st || '', s.title || kindOf(s.kind).name, `${+s.minutes || 0} דק׳`]; });
  if (official) {
    blocks.push({ t: 'table', head: true, rows: [['אסמכתא לאישור הפעולה', '', ''], ['גורמים מאשרים', 'מרכז הדרכה צעיר', 'מרכז הדרכה בוגר'], ['חותמת', '', '']] });
    blocks.push({ t: 'table', head: true, rows: [['תאריך הפעולה', 'נושא חודשי', 'נושא הפעולה', 'מטרת הפעולה'], [w.date ? fmtDate(w.date) : '', w.topic || '', w.title || '', w.goal || '']] });
    blocks.push({ t: 'table', head: true, rows: [['זמנים בפעולה', 'ציוד נדרש להעברת הפעולה', 'נספחים'], [`${w.start ? `${w.start}–${end}` : ''}\n${fmtMin(tot)}`, eq.map(e => e.name + (e.qty ? ` ×${e.qty}` : '')).join('\n'), (w.segments || []).filter(s => s.kind === 'appendix').map(s => s.title).join('\n')]] });
    blocks.push({ t: 'h2', x: 'לו״ז הפעולה' });
    blocks.push({ t: 'table', head: true, rows: [['שעה', 'מופע', 'הערות'], ...sched.map(([a, b, c]) => [a, b, c])] });
    blocks.push({ t: 'h2', x: 'תיאור מהלך הפעולה' });
  } else {
    const kv = [];
    if (w.goal) kv.push(['מטרת הפעולה', w.goal]);
    if (w.question) kv.push(['השאלה במרכז', w.question]);
    if (w.topic) kv.push(['נושא חודשי', w.topic]);
    if (kv.length) blocks.push({ t: 'kv', rows: kv });
    if (sched.length) { blocks.push({ t: 'h2', x: 'לו״ז' }); blocks.push({ t: 'table', head: true, rows: [['שעה', 'חלק', 'משך'], ...sched] }); }
  }
  (w.segments || []).forEach((s, i) => {
    blocks.push({ t: 'h3', x: `${i + 1}. ${s.title || kindOf(s.kind).name}`, sub: `${kindOf(s.kind).name}${s.minutes ? ` · ${s.minutes} דק׳` : ''}${sched[i] && sched[i][0] ? ` · ${sched[i][0]}` : ''}` });
    blocks.push(...mdToBlocks(s.body));
    if ((s.equip || []).length) blocks.push({ t: 'p', x: 'ציוד: ' + s.equip.join(', '), muted: true });
  });
  if (!official && eq.length) { blocks.push({ t: 'h2', x: 'רשימת ציוד' }); blocks.push({ t: 'list', items: eq.map(e => e.name + (e.qty ? ` ×${e.qty}` : '')) }); }
  if (w.notes) { blocks.push({ t: 'h2', x: 'הערות' }); blocks.push(...mdToBlocks(w.notes)); }
  const sub = [w.date ? fmtDate(w.date) : '', w.start ? `${w.start}–${end}` : '', fmtMin(tot), w.audience, CATS[w.cat]].filter(Boolean).join(' · ');
  return { title: w.title || 'פעולה', sub, blocks };
}

const PLAN_ORDER = ['content', 'unit', 'opening', 'morning', 'night', 'evening', 'battalion', 'peak', 'ceremony', 'skills', 'bus-games', 'route-games', 'regular-games', 'upgraded-games', 'geo', 'quiz', 'closing', 'pov', 'custom'];
function planModel(w) {
  const blocks = [];
  const isSem = w.type === 'seminar';
  const kv = [];
  if (w.dateFrom) kv.push(['תאריכים', fmtDate(w.dateFrom) + (w.dateTo && w.dateTo !== w.dateFrom ? ' – ' + fmtDate(w.dateTo) : '')]);
  if (w.place) kv.push([isSem ? 'מקום' : 'מסלול', w.place]);
  if (w.battalion || w.team) kv.push(['גדוד / צוות', [w.battalion, w.team].filter(Boolean).join(' · ')]);
  if ((w.counselors || []).length) kv.push(['מדריכים', w.counselors.join(', ')]);
  if (w.participants) kv.push(['משתתפים', String(w.participants)]);
  if (w.goal) kv.push([isSem ? 'מטרות' : 'מטרת הטיול', w.goal]);
  if (isSem && (w.successShort || w.successLong)) kv.push(['איפה נראה הצלחה', [w.successShort && 'טווח קצר: ' + w.successShort, w.successLong && 'טווח ארוך: ' + w.successLong].filter(Boolean).join('\n')]);
  if (kv.length) blocks.push({ t: 'kv', rows: kv });
  // schedule
  const S = w.schedule || [];
  if (S.length) {
    blocks.push({ t: 'h2', x: 'לו״ז' });
    const days = planDays(w);
    for (let d = 0; d < days; d++) {
      const items = S.filter(x => (x.day || 0) === d).sort((a, b) => (toMin(a.time) ?? 9999) - (toMin(b.time) ?? 9999));
      if (!items.length) continue;
      blocks.push({ t: 'h3', x: w.dateFrom ? fmtDay(addDays(w.dateFrom, d)) : `יום ${d + 1}` });
      blocks.push({ t: 'table', head: true, rows: [['שעה', 'עד', 'מה קורה'], ...items.map(x => [x.time || '', x.time && x.minutes ? addMin(x.time, x.minutes) : '', x.title || ''])] });
    }
  }
  // content sections in the order the trip files use
  const secs = [...w.sections].sort((a, b) => PLAN_ORDER.indexOf(a.kind) - PLAN_ORDER.indexOf(b.kind));
  let lastGroup = null;
  for (const s of secs) {
    const T = TRIP_KINDS[s.kind] || TRIP_KINDS.custom;
    if (s.kind === 'pov' && lastGroup !== 'pov') { blocks.push({ t: 'h2', x: 'נקודות מבט אישיות' }); lastGroup = 'pov'; }
    else if (s.kind !== 'pov') lastGroup = null;
    blocks.push({ t: s.kind === 'pov' ? 'h3' : 'h2', x: s.title || T.name, sub: [s.owner, s.minutes ? s.minutes + ' דק׳' : ''].filter(Boolean).join(' · ') });
    if (T.games) blocks.push({ t: 'list', items: (s.games || []).map(g => g.title + (g.body ? ' — ' + plainMd(g.body).replace(/\s+/g, ' ').slice(0, 220) : '')) });
    else blocks.push(...mdToBlocks(s.body));
    if ((s.equip || []).length) blocks.push({ t: 'p', x: 'ציוד: ' + s.equip.join(', '), muted: true });
  }
  // reflections
  if (!isSem && (w.reflections || []).length) {
    blocks.push({ t: 'h2', x: 'שיקופי מצב' });
    for (const r of w.reflections) {
      blocks.push({ t: 'h3', x: r.who || 'שיקוף מצב' });
      blocks.push({ t: 'kv', rows: [['מטרת הטיול', r.goal], ['תיאור הקבוצה', r.desc], ['חוזקות', r.strengths], ['חולשות', r.weaknesses], ['ציפיות מעצמי', r.expSelf], ['ציפיות מהחניכים', r.expKids], ['ציפיות מהצוות', r.expTeam], ['חששות מהטיול', r.fearTrip], ['חששות מהחניכים', r.fearKids], ['חששות אחרים', r.fearOther], ['הכנה מראש', r.prep]].filter(x => x[1]) });
      blocks.push({ t: 'table', head: true, rows: [['שיקוף חניכים', 'שם החניך', 'דרך התמודדות וביצוע'], ...KID_ROLES.map((role, k) => [role, r.kids[k]?.name || '', r.kids[k]?.how || ''])] });
    }
  }
  if (isSem && (w.menu || []).length) {
    const total = w.menu.reduce((s, r) => s + (+r.qty || 0) * (+r.price || 0), 0);
    blocks.push({ t: 'h2', x: 'תפריט ותקציב' });
    const dt = Object.entries(w.diets || {}).filter(([, v]) => +v).map(([k, v]) => `${k}: ${v}`).join(' · ');
    if (dt) blocks.push({ t: 'p', x: 'רגישויות: ' + dt });
    blocks.push({ t: 'table', head: true, rows: [['ארוחה', 'פריט', 'תזונה', 'כמות', 'סה״כ ₪'], ...w.menu.map(r => [r.meal, r.item, r.diet, String(r.qty || ''), ((+r.qty || 0) * (+r.price || 0)).toFixed(0)]), ['', 'סה״כ', '', '', total.toFixed(0)]] });
    if (w.participants) blocks.push({ t: 'p', x: `עלות למשתתף: ${(total / w.participants).toFixed(1)} ₪`, muted: true });
  }
  const eq = equipmentOfPlan(w);
  if (eq.length) {
    blocks.push({ t: 'h2', x: 'ציוד' });
    blocks.push({ t: 'table', head: true, rows: [['פריט', 'כמות', 'מי מביא', '✓'], ...eq.map(e => [e.name, e.qty ? String(e.qty) : '', (w.eqWho || {})[e.key] || '', (w.packed || []).includes(e.key) ? '✓' : ''])] });
  }
  if ((w.checklist || []).length) { blocks.push({ t: 'h2', x: 'צ׳ק ליסט לפני יציאה' }); blocks.push({ t: 'list', items: w.checklist.map(c => (c.done ? '✓ ' : '☐ ') + c.text) }); }
  if (w.notes) { blocks.push({ t: 'h2', x: 'הערות' }); blocks.push(...mdToBlocks(w.notes)); }
  const sub = [isSem ? 'סמינר' : `תיק טיול · ${w.subtype}`, w.battalion, w.team].filter(Boolean).join(' · ');
  return { title: w.title || (isSem ? 'סמינר' : 'תיק טיול'), sub, blocks };
}
function modelOf(w, opts) { return w.type === 'activity' ? activityModel(w, opts) : planModel(w); }

/* ---------------------------------------------------------------- HTML */
function modelHTML(m) {
  let h = `<h1>${esc(m.title)}</h1>${m.sub ? `<div class="sub">${esc(m.sub)}</div>` : ''}`;
  for (const b of m.blocks) {
    if (b.t === 'h2') h += `<h2>${esc(b.x)}${b.sub ? ` <span style="font:400 13px Arial;color:#666">· ${esc(b.sub)}</span>` : ''}</h2>`;
    else if (b.t === 'h3') h += `<h3>${esc(b.x)}${b.sub ? ` <span style="font-weight:400;color:#666;font-size:12.5px">· ${esc(b.sub)}</span>` : ''}</h3>`;
    else if (b.t === 'p') h += `<p ${b.muted ? 'style="color:#555;font-size:12.5px"' : ''}>${esc(b.x)}</p>`;
    else if (b.t === 'md') h += renderMd(b.md).replace(/<div class="tbl">|<\/div>/g, '').replace(/<a class="vlink"[^>]*href="([^"]+)"[^>]*>.*?<\/a>/g, '<a href="$1">$1</a>');
    else if (b.t === 'kv') h += `<table>${b.rows.map(([k, v]) => `<tr><th style="width:26%">${esc(k)}</th><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
    else if (b.t === 'table') h += `<table>${b.rows.map((r, i) => `<tr>${r.map(c => i === 0 && b.head ? `<th>${esc(c)}</th>` : `<td>${esc(c).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`).join('')}</table>`;
    else if (b.t === 'list') h += `<ul>${b.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }
  return h;
}
function standaloneHTML(m) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;600;700&display=swap">
<style>
@page{size:A4;margin:16mm 15mm}
body{margin:0;background:#e9e9e6;font:400 14px/1.6 "IBM Plex Sans Hebrew",Arial,sans-serif;color:#141414}
.paper{background:#fff;max-width:794px;margin:24px auto;padding:44px 48px;box-shadow:0 2px 12px rgba(0,0,0,.15)}
h1{font:700 28px/1.2 "IBM Plex Sans Hebrew",Arial,sans-serif;letter-spacing:-.02em;margin:0 0 4px}.sub{color:#555;margin-bottom:20px}
h2{font:700 18px/1.3 "IBM Plex Sans Hebrew",Arial,sans-serif;margin:24px 0 8px;padding-bottom:4px;border-bottom:2px solid #D2231C;break-after:avoid}
h3{font-size:15px;margin:16px 0 4px;break-after:avoid}
table{border-collapse:collapse;width:100%;margin:8px 0 12px;font-size:13px;break-inside:auto}tr{break-inside:avoid}
th,td{border:1px solid #bbb;padding:6px 8px;text-align:right;vertical-align:top}th{background:#f1f1ee}
p{margin:0 0 8px;orphans:3;widows:3}ul,ol{margin:0 0 8px;padding-right:20px}a{color:#9E1F19}
.printbar{max-width:794px;margin:16px auto 0;display:flex;gap:10px;justify-content:flex-start;font-family:Arial}
.printbar button{font:600 15px Arial;padding:10px 18px;border-radius:10px;border:0;background:#D2231C;color:#fff;cursor:pointer}
@media print{body{background:#fff}.paper{box-shadow:none;margin:0;padding:0;max-width:none}.printbar{display:none}}
</style></head><body><div class="printbar"><button onclick="window.print()">הדפסה / שמירה כ־PDF</button></div><div class="paper">${modelHTML(m)}<p style="color:#999;font-size:11px;margin-top:28px">הדרכה בנשיא · ${new Date().toLocaleDateString('he-IL')}</p></div></body></html>`;
}

/* ---------------------------------------------------------------- text (WhatsApp) */
function modelText(m) {
  const L = [`*${m.title}*`]; if (m.sub) L.push(m.sub); L.push('');
  for (const b of m.blocks) {
    if (b.t === 'h2') L.push('', `*${b.x}*`);
    else if (b.t === 'h3') L.push('', `*${b.x}*${b.sub ? ' (' + b.sub + ')' : ''}`);
    else if (b.t === 'p') L.push(b.x);
    else if (b.t === 'md') L.push(plainMd(b.md).replace(/^\s*[-•]\s+/gm, '• '));
    else if (b.t === 'kv') for (const [k, v] of b.rows) L.push(`${k}: ${v}`);
    else if (b.t === 'table') for (const r of b.rows.slice(b.head ? 1 : 0)) L.push(r.filter(Boolean).join(' · '));
    else if (b.t === 'list') for (const x of b.items) L.push('• ' + x);
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------------------------------------------------------------- Word (.docx) */
let docxLoading = null;
function loadDocx() {
  if (window.docx) return Promise.resolve(window.docx);
  if (!docxLoading) docxLoading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js';
    s.onload = () => window.docx ? res(window.docx) : rej(new Error('docx missing'));
    s.onerror = () => { docxLoading = null; rej(new Error('load failed')); };
    document.head.appendChild(s);
  });
  return docxLoading;
}
async function modelDocx(m) {
  const D = await loadDocx();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = D;
  const FONT = 'Arial';
  const run = (text, o = {}) => new TextRun({ text, rightToLeft: true, font: FONT, size: o.size || 22, bold: !!o.bold, color: o.color, ...o.extra });
  const runsMd = (s, o = {}) => {
    const parts = String(s).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map(p => p.startsWith('**') ? run(p.slice(2, -2), { ...o, bold: true }) : run(p, o));
  };
  const para = (children, o = {}) => new Paragraph({ bidirectional: true, children, spacing: { after: o.after ?? 100, before: o.before ?? 0, line: 300 }, keepNext: o.keepNext, bullet: o.bullet, numbering: o.numbering, border: o.border });
  const cell = (text, head, width) => new TableCell({
    children: String(text || '').split('\n').map(l => para(runsMd(l, { size: 20, bold: head }), { after: 40 })),
    shading: head ? { type: ShadingType.CLEAR, color: 'auto', fill: 'EFEFEA' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  });
  const table = (rows, head) => new Table({ visuallyRightToLeft: true, width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.map((r, i) => new TableRow({ tableHeader: head && i === 0, children: r.map(c => cell(c, head && i === 0)) })) });
  const kids = [];
  kids.push(para([run(m.title, { size: 40, bold: true })], { after: 60 }));
  if (m.sub) kids.push(para([run(m.sub, { size: 22, color: '666666' })], { after: 240 }));
  const numbering = [];
  for (const b of m.blocks) {
    if (b.t === 'h2') kids.push(para([run(b.x, { size: 30, bold: true, color: '121212' }), ...(b.sub ? [run('  · ' + b.sub, { size: 20, color: '777777' })] : [])], { before: 280, after: 120, keepNext: true, border: { bottom: { color: 'D2231C', size: 12, style: BorderStyle.SINGLE, space: 2 } } }));
    else if (b.t === 'h3') kids.push(para([run(b.x, { size: 25, bold: true }), ...(b.sub ? [run('  · ' + b.sub, { size: 19, color: '777777' })] : [])], { before: 200, after: 80, keepNext: true }));
    else if (b.t === 'p') kids.push(para([run(b.x, { color: b.muted ? '666666' : undefined, size: b.muted ? 19 : 22 })]));
    else if (b.t === 'kv') kids.push(table(b.rows.map(([k, v]) => [k, v]), false), para([], { after: 120 }));
    else if (b.t === 'table') kids.push(table(b.rows, b.head), para([], { after: 120 }));
    else if (b.t === 'list') for (const x of b.items) kids.push(para(runsMd(x), { bullet: { level: 0 }, after: 40 }));
    else if (b.t === 'md') {
      const lines = String(b.md).split('\n');
      let tbl = null;
      const flush = () => { if (tbl) { kids.push(table(tbl, true), para([], { after: 100 })); tbl = null; } };
      for (const raw of lines) {
        const l = raw.trimEnd();
        if (/^\s*\|.*\|\s*$/.test(l)) { (tbl = tbl || []).push(l.trim().slice(1, -1).split('|').map(c => c.trim())); continue; }
        flush();
        if (!l.trim()) continue;
        let mm;
        if ((mm = l.match(/^#{1,6}\s+(.*)$/))) kids.push(para(runsMd(mm[1], { bold: true }), { before: 120, keepNext: true }));
        else if ((mm = l.match(/^(\s*)[-•*]\s+(.*)$/)) || (mm = l.match(/^(\s*)-(\S.*)$/))) kids.push(para(runsMd(mm[2]), { bullet: { level: Math.min(Math.floor(mm[1].length / 2), 2) }, after: 40 }));
        else if ((mm = l.match(/^\s*(\d{1,2})[.)]\s*(.*)$/))) kids.push(para([run(mm[1] + '. ', { bold: true }), ...runsMd(mm[2])], { after: 50 }));
        else kids.push(para(runsMd(l)));
      }
      flush();
    }
  }
  kids.push(para([run(`הדרכה בנשיא · ${new Date().toLocaleDateString('he-IL')}`, { size: 16, color: '999999' })], { before: 400 }));
  const doc = new Document({
    creator: 'הדרכה בנשיא', title: m.title,
    styles: { default: { document: { run: { font: FONT, size: 22, rightToLeft: true } } } },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: kids }],
  });
  return Packer.toBlob(doc);
}

/* ---------------------------------------------------------------- saving files */
async function saveFile(filename, data) {
  let dl = null;
  try { dl = window.claude?.use ? await window.claude.use('downloads') : null; } catch { }
  if (dl) {
    try { await dl.save({ filename, data }); toast('הקובץ נשמר'); return true; }
    catch (e) { if (e && e.code === 'declined') return false; toast('לא ניתן לשמור את הקובץ כאן'); return false; }
  }
  // outside the claude.ai viewer (e.g. a local copy) a normal download works
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast('הקובץ הורד'); return true;
  } catch { toast('הורדת קבצים לא זמינה כאן'); return false; }
}
const safeName = s => (String(s || 'מסמך').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'מסמך');

/* ---------------------------------------------------------------- UI */
function openPreview(w, opts) {
  const m = modelOf(w, opts);
  Sheet.show({
    title: 'תצוגת מסמך', tall: true, wide: true, body: `<div class="paper-wrap"><div class="paper">${modelHTML(m)}</div></div>`,
    foot: `<button class="btn primary" id="pv-exp">${ic('download')}ייצוא</button><button class="btn" id="pv-copy">${ic('copy')}העתקה כטקסט</button>`,
    onMount: s => { s.querySelector('#pv-exp').onclick = () => { Sheet.close(true); openExport(w); }; s.querySelector('#pv-copy').onclick = () => copyText(modelText(m), 'הועתק — מוכן לוואטסאפ'); },
  });
}
function openExport(w) {
  const isAct = w.type === 'activity';
  Sheet.show({
    title: 'ייצוא', body: `<div class="menu">
      <button data-x="docx"><span class="ic" style="background:var(--blue-soft);color:var(--blue)">${ic('doc')}</span><div>מסמך Word<small>נפתח גם בגוגל דוקס · מימין לשמאל, עם טבלאות</small></div></button>
      ${isAct ? `<button data-x="official"><span class="ic" style="background:var(--red-soft);color:var(--red-ink)">${ic('checkc')}</span><div>טופס ״אסמכתא לאישור הפעולה״<small>בפורמט של השבט: לו״ז, ציוד, חותמות</small></div></button>` : ''}
      <button data-x="html"><span class="ic">${ic('print')}</span><div>קובץ להדפסה / PDF<small>פותחים בדפדפן ולוחצים ״הדפסה״ ← שמירה כ־PDF</small></div></button>
      <button data-x="text"><span class="ic" style="background:var(--green-soft);color:var(--green)">${ic('send')}</span><div>טקסט לוואטסאפ<small>מועתק ללוח, עם כותרות מודגשות</small></div></button>
      <button data-x="preview"><span class="ic">${ic('eye')}</span><div>תצוגת מסמך</div></button></div>
      <p class="hint" id="x-status" style="margin:8px 6px 0"></p>`,
    onMount: s => s.addEventListener('click', async e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x;
      if (x === 'preview') { Sheet.close(true); openPreview(w); return; }
      if (x === 'text') { copyText(modelText(modelOf(w)), 'הועתק — מוכן לוואטסאפ'); Sheet.close(); return; }
      const st = s.querySelector('#x-status');
      if (x === 'html') { const m = modelOf(w); Sheet.close(); await saveFile(safeName(m.title) + '.html', standaloneHTML(m)); return; }
      st.innerHTML = `<span class="thinking"><i></i><i></i><i></i></span> מכין את המסמך…`;
      try {
        const m = modelOf(w, { official: x === 'official' });
        const blob = await modelDocx(m);
        Sheet.close();
        await saveFile(safeName((x === 'official' ? 'אסמכתא - ' : '') + m.title) + '.docx', blob);
      } catch (err) {
        console.error(err);
        st.textContent = 'לא הצלחנו להכין קובץ Word (צריך חיבור לאינטרנט). אפשר לבחור ״קובץ להדפסה״ במקום.';
      }
    }),
  });
}
