/* הדרכה בנשיא — core: utilities, icons, constants, markdown-lite, search, storage */
'use strict';

/* ================================================================ utils */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = 'x') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
// flush() runs the call only if one is actually waiting
const debounce = (fn, ms) => { let t = null, args = []; const f = (...a) => { args = a; clearTimeout(t); t = setTimeout(() => { t = null; fn(...args); }, ms); }; f.flush = () => { if (t !== null) { clearTimeout(t); t = null; fn(...args); } }; return f; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const plural = (n, one, many) => n === 1 ? one : `${n} ${many}`;
const idle = cb => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 800 }) : setTimeout(cb, 60));

function fmtMin(m) {
  m = Math.round(m || 0);
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}:${String(r).padStart(2, '0')} שע׳` : `${h} שע׳`;
}
function addMin(hhmm, m) {
  if (!/^\d{1,2}:\d{2}$/.test(hhmm || '')) return '';
  let [h, mm] = hhmm.split(':').map(Number);
  let t = h * 60 + mm + Math.round(m || 0);
  t = ((t % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
const toMin = hhmm => /^\d{1,2}:\d{2}$/.test(hhmm || '') ? hhmm.split(':').reduce((h, m) => h * 60 + +m) : null;
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
}
function fmtDay(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
}
function ago(ts) {
  if (!ts) return '';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'עכשיו';
  if (s < 3600) return `לפני ${Math.round(s / 60)} דק׳`;
  if (s < 86400) return `לפני ${Math.round(s / 3600)} שע׳`;
  const d = Math.round(s / 86400);
  if (d === 1) return 'אתמול';
  if (d < 30) return `לפני ${d} ימים`;
  return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

const LS = {
  get(k, d) { try { const v = localStorage.getItem('tarmil:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tarmil:' + k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem('tarmil:' + k); } catch { } },
};

/* ================================================================ icons */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  library: '<path d="M4 4h4v16H4z"/><path d="M10 4h4v16h-4z"/><path d="m16 5 3.8-1 3 15.4-3.8 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  ai: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  game: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5"/>',
  play: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  back: '<path d="m9 5 7 7-7 7"/>',
  next: '<path d="m15 5-7 7 7 7"/>',
  chevd: '<path d="m6 9 6 6 6-6"/>',
  chevu: '<path d="m6 15 6-6 6 6"/>',
  more: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M14 11v6M11 14h6"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  grip: '<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m10 13 4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M7 21v-3M17 21v-3"/><circle cx="8" cy="14.5" r="1" fill="currentColor"/><circle cx="16" cy="14.5" r="1" fill="currentColor"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  tent: '<path d="M12 3 2 21h20z"/><path d="M12 3v18M8.5 21 12 14l3.5 7"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8a4.5 4.5 0 0 1-.5 10z"/>',
  cloudok: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8a4.5 4.5 0 0 1-.5 10z"/><path d="m9.5 13 2 2 3.5-4"/>',
  device: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  wand: '<path d="m4 20 11-11M14 4v3M18.5 5.5l-2 2M20 10h-3M12 6.5h3"/>',
  doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2 1-3 4-3 8h3"/>',
  shuffle: '<path d="M3 7h3c4 0 6 10 10 10h5M3 17h3c1.6 0 2.8-1.6 3.8-3.5M14.2 9.5C15.2 8 16.2 7 18 7h3M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.6 3.6 4 7 4c2.2 0 3.6 1.3 5 3 1.4-1.7 2.8-3 5-3 3.4 0 5.5 3.6 4.3 6.8C19.5 15.4 12 20 12 20z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
  tie: '<path d="M9 3h6l-1.5 3L16 17l-4 4-4-4 2.5-11z"/>',
  print: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};
const ic = (n, cls = '') => `<svg class="svg ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ================================================================ domain constants */
// The building blocks of a פעולה — named after "המסע בצופים" components the material uses.
const KINDS = {
  mifkad: { name: 'מפקד', icon: 'flag', hint: 'פתיחה וסיום מסודרים — שירה, הכרזות, משימות מסלול' },
  game: { name: 'זמן משחק', icon: 'game', hint: 'משחק פתיחה / אמצע / סיום — מוריד אנרגיה ומחבר' },
  activity: { name: 'הפעלה', icon: 'bolt', hint: 'מתודה: טנק דעות, שמש אסוציאציות, סיטואציות, תחנות…' },
  discussion: { name: 'דיון', icon: 'chat', hint: 'שאלות פתוחות — לפחות 3' },
  text: { name: 'טקסט', icon: 'book', hint: 'קטע קריאה שמעביר את המסר' },
  video: { name: 'סרטון', icon: 'play', hint: 'קישור ומה רוצים שיראו בו' },
  pov: { name: 'נקודת מבט', icon: 'eye', hint: 'זווית אישית/אקטואלית על נושא — זמן עצירה מתוכנן' },
  stop: { name: 'זמן עצירה', icon: 'pause', hint: 'נושא אקטואלי שקורה עכשיו' },
  content: { name: 'זמן תוכן', icon: 'layers', hint: 'חוויית למידה ערכית סביב שאלה אחת' },
  skills: { name: 'זמן צופיות', icon: 'compass', hint: 'מיומנות צופית: קשרים, בנייה, מחנאות' },
  summary: { name: 'סיכום', icon: 'checkc', hint: 'העברת המסר וסגירה' },
  appendix: { name: 'נספח', icon: 'doc', hint: 'חומר להדפסה או להקראה' },
  intro: { name: 'פתיחה', icon: 'spark', hint: 'הקדמה למדריך' },
  opening: { name: 'פתיחה', icon: 'spark', hint: '' },
};
const KIND_ORDER = ['mifkad', 'game', 'activity', 'discussion', 'text', 'video', 'pov', 'stop', 'content', 'skills', 'summary', 'appendix'];
const kindOf = k => KINDS[k] || KINDS.activity;

const CATS = {
  regular: 'פעולה רגילה', course: 'פעולת קורס', memorial: 'זיכרון וטקסים', peak: 'פעולת שיא', home: 'פעולת בית',
  zoom: 'פעולת זום', holiday: 'חגים ומועדים', tribe: 'תוכן על השבט',
};
const AUDIENCES = ['חניכים', 'חמישית', 'שכב"ג', 'גדוד', 'צוות הדרכה'];

const COMP_TYPES = {
  game: { name: 'משחקים', one: 'משחק', icon: 'game', k: 'game' },
  text: { name: 'טקסטים', one: 'טקסט', icon: 'book', k: 'text' },
  questions: { name: 'שאלות לדיון', one: 'שאלות לדיון', icon: 'chat', k: 'discussion' },
  method: { name: 'הפעלות', one: 'הפעלה', icon: 'bolt', k: 'activity' },
  'trip-part': { name: 'מתיקי טיול', one: 'חלק מתיק טיול', icon: 'tent', k: 'content' },
  skill: { name: 'זמני צופיות', one: 'זמן צופיות', icon: 'compass', k: 'skills' },
  idea: { name: 'בוקר/לילה טוב', one: 'רעיון', icon: 'moon', k: 'activity' },
  snippet: { name: 'שמרתי', one: 'קטע ששמרתי', icon: 'heart', k: 'activity' },
};
const GAME_ROLES = { opening: 'משחק פתיחה', activity: 'משחק בפעולה', bus: 'משחק אוטובוס', route: 'משחק מסלול', upgraded: 'משחק משודרג', warmup: 'פז״ח', zoom: 'משחק זום' };

// Trip-file sections, in the order the tribe's trip files use them.
const TRIP_KINDS = {
  content: { name: 'זמן תוכן צוותי', icon: 'layers', kind: 'content', hint: 'פעולת תוכן לצוות סביב שאלה אחת' },
  opening: { name: 'פעולת פתיחה', icon: 'spark', kind: 'activity', hint: 'תיאום ציפיות, חימום, פתיחת היום' },
  morning: { name: 'פעולת בוקר טוב', icon: 'sun', kind: 'activity', hint: 'שוקו בשקית, שרשרת קורנפלקס, סבב ציפיות' },
  night: { name: 'פעולת לילה טוב', icon: 'moon', kind: 'activity', hint: 'סמורס, מכתבים, לוכד חלומות' },
  battalion: { name: 'פעולה גדודית', icon: 'users', kind: 'activity', hint: 'תחרות/תחנות לכל הגדוד' },
  peak: { name: 'פעולת שיא', icon: 'bolt', kind: 'activity', hint: 'אולימפיאדה, מירוץ, מכירה פומבית' },
  ceremony: { name: 'טקס', icon: 'tie', kind: 'activity', hint: 'מעבר דרגה / חלוקת עניבות / קידוש' },
  skills: { name: 'זמן צופיות', icon: 'compass', kind: 'skills', hint: 'קשר שלמה, שעון שמש, חצובה' },
  'bus-games': { name: 'משחקי אוטובוס', icon: 'bus', kind: 'game', games: 'bus', target: 4 },
  'route-games': { name: 'משחקי מסלול', icon: 'route', kind: 'game', games: 'route', target: 5 },
  'regular-games': { name: 'זמני משחק רגילים', icon: 'game', kind: 'game', games: 'warmup', target: 7 },
  'upgraded-games': { name: 'זמני משחק משודרגים', icon: 'game', kind: 'game', games: 'upgraded', target: 7 },
  geo: { name: 'סקירה גאוגרפית', icon: 'map', kind: 'text', hint: 'על המסלול והמקום' },
  quiz: { name: 'חידון', icon: 'chat', kind: 'activity', hint: 'חידון על המקום / ארץ ישראל' },
  closing: { name: 'פעולת סיכום טיול', icon: 'checkc', kind: 'summary', hint: 'שוקולד לבן/חום, זיקוקים, מה לקחתי' },
  pov: { name: 'נקודת מבט', icon: 'eye', kind: 'pov', hint: '3 שלבים: נושא קרוב לחניכים → הפעלה שממחישה → דיון' },
  unit: { name: 'יחידת תוכן', icon: 'layers', kind: 'content', hint: 'יחידה בסמינר' },
  evening: { name: 'גיבוש ערב', icon: 'moon', kind: 'activity', hint: 'קידוש, ערב משחקים' },
  custom: { name: 'חלק נוסף', icon: 'plus', kind: 'activity', hint: '' },
};

const TRIP_TYPES = {
  'פתיחת שנה': { days: 2, sections: ['content', 'opening', 'morning', 'night', 'battalion', 'peak', 'ceremony', 'skills', 'bus-games', 'route-games', 'regular-games', 'upgraded-games', 'closing'] },
  'יום שבט': { days: 1, sections: ['content', 'opening', 'battalion', 'ceremony', 'skills', 'bus-games', 'route-games', 'upgraded-games', 'closing'] },
  'טיול פסח': { days: 2, sections: ['content', 'opening', 'morning', 'night', 'skills', 'bus-games', 'route-games', 'regular-games', 'upgraded-games', 'geo', 'quiz', 'closing'] },
  'מחנה': { days: 3, sections: ['content', 'opening', 'morning', 'night', 'peak', 'battalion', 'skills', 'regular-games', 'upgraded-games', 'closing'] },
  'טיול אחר': { days: 1, sections: ['content', 'opening', 'skills', 'bus-games', 'route-games', 'upgraded-games', 'closing'] },
};
const REQUIRED_TRIP = new Set(['content', 'opening', 'closing', 'skills', 'pov', 'morning', 'night']);

const KID_ROLES = [
  'חניך שאני חושש מהיתקלויות איתו בקבוצה',
  'חניך שאני רוצה לחזק ולתת לו יותר מקום בקבוצה',
  'חניך שאני רוצה להעביר אותו תהליך בקבוצה',
  'חניך שיכול להיות לי קושי איתו בטיול',
  'חניך שאני חושב שיפתיע אותי לטובה',
];

const SEMINAR_CHECKLIST = ['בדיקת ציוד', 'בדיקת אוכל', 'קבלת מספר טלפון של שומר לילה', 'שילוט אוהלים/חדרים של חניכים — מודפס ומנוילן',
  'תדריכי צוותי הדרכה + חניכים מודפסים', 'תחנות צופיות מוכנות', 'הדפסת דוח סגירת הרשמה'];
const TRIP_CHECKLIST = ['תיק עזרה ראשונה', 'רשימת רגישויות ואלרגיות של חניכים (למשל ללא גלוטן)', 'קשר עם ההורים לפני הטיול',
  'אישורי הורים חתומים', 'תדריך מסלול לחניכים', 'מים ופליז ספייר', 'הדפסת הנספחים', 'חלוקת אחריות על ציוד בצוות'];
const DIETS = ['רגיל', 'ללא גלוטן', 'צמחוני', 'ללא לקטוז', 'טבעוני'];
const MEALS = ['ארוחת ערב', 'ארוחת בוקר', 'ארוחת צהריים', 'קידוש', 'כיבוד', 'אחר'];

/* ================================================================ markdown-lite */
function inlineMd(s) {
  let t = esc(s);
  t = t.replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>');
  t = t.replace(/(https?:\/\/[^\s<]+)/g, (m) => {
    const url = m.replace(/[),.]+$/, '');
    const tail = m.slice(url.length);
    const yt = /youtu\.?be/.test(url);
    return `<a class="${yt ? 'vlink' : ''}" href="${url}" target="_blank" rel="noopener">${yt ? ic('play', 'sm') + 'צפייה בסרטון' : esc(decodeURIUrl(url))}</a>${tail}`;
  });
  return t;
}
function decodeURIUrl(u) { try { u = decodeURI(u); } catch { } return u.length > 48 ? u.slice(0, 45) + '…' : u; }

function renderMd(src, opts = {}) {
  if (!src) return '';
  const lines = String(src).replace(/\r/g, '').split('\n');
  let html = '', list = null, table = null;
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  const closeTable = () => { if (table) { html += '<div class="tbl"><table>' + table.map(r => '<tr>' + r.map(c => `<td>${inlineMd(c.trim())}</td>`).join('') + '</tr>').join('') + '</table></div>'; table = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*\|.*\|\s*$/.test(line)) { closeList(); (table = table || []).push(line.trim().slice(1, -1).split('|')); continue; }
    closeTable();
    if (!line.trim()) { closeList(); continue; }
    let m;
    if ((m = line.match(/^#{1,6}\s+(.*)$/))) { closeList(); html += `<h4>${inlineMd(m[1])}</h4>`; continue; }
    if ((m = line.match(/^\s*[-•*]\s+(.*)$/)) || (m = line.match(/^\s*-(\S.*)$/))) {
      if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; }
      html += `<li>${inlineMd(m[1])}</li>`; continue;
    }
    if ((m = line.match(/^\s*\d{1,2}[.)]\s*(.*)$/))) {
      if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; }
      html += `<li>${inlineMd(m[1])}</li>`; continue;
    }
    if (line.trim() === '---') { closeList(); html += '<hr>'; continue; }
    closeList();
    html += `<p>${inlineMd(line)}</p>`;
  }
  closeList(); closeTable();
  return html;
}
const plainMd = s => String(s || '').replace(/\*\*/g, '').replace(/^#{1,6}\s+/gm, '').replace(/^\s*\|/gm, '').replace(/\|\s*$/gm, '');

/* ================================================================ Hebrew-aware search */
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/[֑-ׇ]/g, '')            // niqqud & cantillation
    .replace(/[ךםןףץ]/g, c => FINALS[c])
    .replace(/[״"׳'`’‘]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}
const PREFIXES = ['וכש', 'וש', 'וה', 'וב', 'ול', 'ומ', 'שה', 'שב', 'של', 'כש', 'לכ', 'מה', 'בה', 'לה', 'ו', 'ה', 'ב', 'ל', 'מ', 'ש', 'כ'];
function variants(tok) {
  const out = new Set([tok]);
  if (tok.length >= 4) for (const p of PREFIXES) if (tok.startsWith(p) && tok.length - p.length >= 3) out.add(tok.slice(p.length));
  // plural/feminine endings: פעולות→פעול, משחקים→משחק
  for (const v of [...out]) {
    if (v.length >= 5 && /(ים|ות)$/.test(v)) out.add(v.slice(0, -2));
    if (v.length >= 5 && /(ה|ת)$/.test(v)) out.add(v.slice(0, -1));
  }
  return [...out];
}
function lev1(a, b) { // edit distance <= 1
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return e + (la - i) + (lb - j) <= 1;
}

const Search = {
  items: [],      // {ref, kind, t, tags, m, b, titleWords}
  ready: false,
  build(entries) {
    this.items = entries.map(e => ({
      ...e,
      t: ' ' + norm(e.title) + ' ',
      tg: ' ' + norm(e.tags || '') + ' ',
      m: ' ' + norm(e.mid || '') + ' ',
      b: ' ' + norm(e.body || '') + ' ',
      tw: norm(e.title).split(' ').filter(w => w.length >= 3),
    }));
    this.ready = true;
  },
  query(q, filter, limit = 400) {
    const nq = norm(q);
    const toks = nq.split(' ').filter(Boolean);
    if (!toks.length) return [];
    const tv = toks.map(variants);
    const res = [];
    for (const it of this.items) {
      if (filter && !filter(it)) continue;
      let score = 0, matched = 0;
      for (const vs of tv) {
        let best = 0;
        for (const v of vs) {
          const short = v.length <= 2;
          const ws = ' ' + v;
          if (it.t.includes(ws)) best = Math.max(best, 10); else if (!short && it.t.includes(v)) best = Math.max(best, 7);
          if (it.tg.includes(ws)) best = Math.max(best, 6);
          if (it.m.includes(ws)) best = Math.max(best, 4); else if (!short && it.m.includes(v)) best = Math.max(best, 3);
          if (best < 2) {
            if (it.b.includes(ws)) best = Math.max(best, 1.6); else if (!short && v.length >= 3 && it.b.includes(v)) best = Math.max(best, 1);
          }
          if (best < 3 && v.length >= 4 && it.tw.some(w => lev1(w, v))) best = Math.max(best, 4.5);
        }
        if (best > 0) { matched++; score += best; }
      }
      if (!matched) continue;
      if (matched < toks.length) score *= 0.35 * matched / toks.length;
      if (toks.length > 1 && it.t.includes(' ' + nq)) score += 12;
      if (it.boost) score *= it.boost;
      res.push({ it, score, full: matched === toks.length });
    }
    res.sort((a, b) => b.score - a.score);
    return res.slice(0, limit);
  },
};

function snippet(body, q, len = 140) {
  const text = plainMd(body || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const toks = norm(q).split(' ').filter(t => t.length >= 2);
  let pos = -1, hitLen = 0;
  const nt = norm(text);
  for (const t of toks) for (const v of variants(t)) { const i = nt.indexOf(v); if (i >= 0 && (pos < 0 || i < pos)) { pos = i; hitLen = v.length; } }
  // map normalized position approximately onto the original text
  let start = 0;
  if (pos > 0) start = Math.max(0, Math.round(pos * text.length / Math.max(nt.length, 1)) - 40);
  let s = text.slice(start, start + len);
  if (start > 0) s = '…' + s;
  if (start + len < text.length) s += '…';
  let h = esc(s);
  for (const t of toks) {
    if (t.length < 2) continue;
    try {
      const pat = t.split('').map(c => { const f = Object.entries(FINALS).find(([k, v]) => v === c); return f ? `[${c}${f[0]}]` : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('[\\u0591-\\u05C7]*');
      h = h.replace(new RegExp(`(${pat})`, 'gi'), '<mark>$1</mark>');
    } catch { }
  }
  return h;
}

/* ================================================================ store */
const Store = {
  lib: null,                // library.json
  byId: new Map(),          // doc id -> doc
  comps: new Map(),         // component id -> comp
  work: {},                 // my items: id -> item
  prefs: { favs: {}, recent: [], snippets: [], theme: null, seenIntro: false },
  db: null, uid: null, cloud: 'local',   // 'local' | 'syncing' | 'synced' | 'error'
  listeners: new Set(),
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(what) { for (const fn of this.listeners) try { fn(what); } catch (e) { console.error(e); } },

  loadLocal() {
    this.work = LS.get('work', {}) || {};
    this.prefs = Object.assign(this.prefs, LS.get('prefs', {}) || {});
  },
  _saveLocal: null,
  saveLocal() {
    if (!this._saveLocal) this._saveLocal = debounce(() => { LS.set('work', this.work); LS.set('prefs', this.prefs); }, 250);
    this._saveLocal();
  },

  /* ---- work items ---- */
  list(type) { return Object.values(this.work).filter(w => !w.deleted && (!type || w.type === type)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); },
  get(id) { return this.work[id]; },
  put(item, { quiet = false, pristine = false } = {}) {
    item.updatedAt = Date.now();
    if (!item.createdAt) { item.createdAt = item.updatedAt; item.v = 2; }
    // a brand-new item stays "pristine" until the user really changes something;
    // pristine items are discarded when the user walks away from them
    if (pristine) item.pristine = true; else delete item.pristine;
    if (item.pristine) { this.work[item.id] = item; if (!quiet) this.emit('work'); return; }
    this.work[item.id] = item;
    this.saveLocal();
    this.queueCloud(item.id);
    if (!quiet) this.emit('work');
  },
  remove(id) {
    const it = this.work[id];
    if (!it) return;
    it.deleted = true; it.updatedAt = Date.now();
    this.saveLocal(); this.queueCloud(id); this.emit('work');
  },
  restore(id) { const it = this.work[id]; if (it) { delete it.deleted; this.put(it); } },
  // remove for good (local + cloud): used for items the user never touched
  purge(id) {
    if (!this.work[id]) return;
    delete this.work[id];
    this.pending.delete(id);
    this.saveLocal();
    if (this.db && this.uid) this.db.collection('data/users/' + this.uid).doc(id.replace(/[^\w.~:@+-]/g, '_')).delete().catch(() => { });
  },
  // drop drafts that were opened and left without any change; keep the one on screen
  cleanup(keep = new Set()) {
    let n = 0;
    for (const w of Object.values(this.work)) {
      if (keep.has(w.id)) continue;
      if (w.pristine || isUntouched(w)) { this.purge(w.id); n++; }
    }
    if (n) this.emit('work');
    return n;
  },

  /* ---- prefs ---- */
  setPref(k, v) { this.prefs[k] = v; this.prefs.updatedAt = Date.now(); this.saveLocal(); this.queueCloud('__prefs'); },
  isFav(id) { return !!this.prefs.favs[id]; },
  toggleFav(id) { const f = { ...this.prefs.favs }; if (f[id]) delete f[id]; else f[id] = Date.now(); this.setPref('favs', f); this.emit('favs'); return !!f[id]; },
  touch(id) { const r = [id, ...this.prefs.recent.filter(x => x !== id)].slice(0, 30); this.setPref('recent', r); },

  /* ---- cloud sync: each item is one doc in the viewer's private subtree ---- */
  pending: new Set(), writing: false,
  queueCloud(id) {
    if (!this.db || !this.uid) return;
    this.pending.add(id);
    this.cloud = 'syncing'; this.emit('cloud');
    this._flush = this._flush || debounce(() => this.flushCloud(), 1200);
    this._flush();
  },
  async flushCloud() {
    if (this.writing || !this.db) return;
    this.writing = true;
    try {
      while (this.pending.size) {
        const id = this.pending.values().next().value;
        this.pending.delete(id);
        const col = this.db.collection('data/users/' + this.uid);
        if (id === '__prefs') {
          await col.doc('prefs').set({ v: JSON.stringify(this.prefs), updatedAt: this.prefs.updatedAt || Date.now() });
        } else {
          const it = this.work[id];
          if (!it) continue;
          const body = JSON.stringify(it);
          if (body.length > 240000) { toast('הפריט גדול מדי לסנכרון — נשמר במכשיר בלבד'); continue; }
          await col.doc(id.replace(/[^\w.~:@+-]/g, '_')).set({ v: body, updatedAt: it.updatedAt, type: it.type });
        }
      }
      this.cloud = 'synced';
    } catch (e) {
      console.warn('cloud write failed', e);
      this.cloud = 'error';
      if (e && e.code === 'quota_exceeded') toast('נגמר המקום באחסון הענן — נשמר במכשיר');
    } finally {
      this.writing = false;
      this.emit('cloud');
      if (this.pending.size) this.flushCloud();
    }
  },
  async connectCloud() {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.db = db; this.uid = id;
      this.cloud = 'syncing'; this.emit('cloud');
      const snap = await db.collection('data/users/' + id).get();
      let changed = false;
      const remoteIds = new Set();
      for (const d of snap.docs) {
        const data = d.data(); if (!data || !data.v) continue;
        if (d.id === 'prefs') {
          const rp = JSON.parse(data.v);
          if ((rp.updatedAt || 0) > (this.prefs.updatedAt || 0)) { this.prefs = Object.assign(this.prefs, rp); changed = true; }
          else if ((this.prefs.updatedAt || 0) > (rp.updatedAt || 0)) this.pending.add('__prefs');
          continue;
        }
        const it = JSON.parse(data.v);
        remoteIds.add(it.id);
        const local = this.work[it.id];
        if (!local || (it.updatedAt || 0) > (local.updatedAt || 0)) { this.work[it.id] = it; changed = true; }
        else if ((local.updatedAt || 0) > (it.updatedAt || 0)) this.pending.add(local.id);
      }
      // items created on this device before it ever synced
      for (const it of Object.values(this.work)) if (!remoteIds.has(it.id)) this.pending.add(it.id);
      if (changed) { this.saveLocal(); this.emit('work'); this.emit('favs'); }
      if (typeof navIds === 'function') this.cleanup(navIds());
      this.cloud = 'synced'; this.emit('cloud');
      if (this.pending.size) this.flushCloud();
      // live updates from the other device
      db.collection('data/users/' + id).onSnapshot(s => {
        let ch = false;
        for (const c of s.docChanges()) {
          if (c.type === 'removed' || c.doc.metadata.hasPendingWrites) continue;
          const data = c.doc.data(); if (!data || !data.v) continue;
          if (c.doc.id === 'prefs') {
            const rp = JSON.parse(data.v);
            if ((rp.updatedAt || 0) > (this.prefs.updatedAt || 0)) { this.prefs = Object.assign(this.prefs, rp); ch = true; }
            continue;
          }
          const it = JSON.parse(data.v);
          const local = this.work[it.id];
          if (!local || (it.updatedAt || 0) > (local.updatedAt || 0)) { this.work[it.id] = it; ch = true; }
        }
        if (ch) { this.saveLocal(); this.emit('remote'); }
      }, err => { console.warn('sync listener', err); });
    } catch (e) {
      console.warn('cloud unavailable', e);
      this.cloud = 'local'; this.emit('cloud');
    }
  },
};

/* ================================================================ library access */
const Lib = {
  docs: [], comps: [], topics: [],
  async load() {
    // data/library.json; falls back to the site root (uploads that flattened the folders)
    let r = await fetch('data/library.json');
    if (!r.ok) r = await fetch('library.json');
    const L = await r.json();
    Store.lib = L;
    this.docs = L.docs; this.comps = L.components; this.topics = L.topics;
    for (const d of L.docs) Store.byId.set(d.id, d);
    for (const c of L.components) Store.comps.set(c.id, c);
    return L;
  },
  doc: id => Store.byId.get(id),
  comp: id => Store.comps.get(id),
  activities() { return this.docs.filter(d => d.kind === 'activity'); },
  bodyOf(d) {
    if (d.segments) return d.segments.map(s => (s.title ? s.title + '\n' : '') + s.body).join('\n');
    if (d.sections) return d.sections.map(s => (s.title || '') + '\n' + (s.body || (s.rows || []).map(r => r.join(' ')).join('\n'))).join('\n');
    return d.body || d.note || '';
  },
  buildIndex() {
    const entries = [];
    for (const d of this.docs) {
      if (d.kind === 'attachment' || d.private) continue;
      entries.push({
        ref: d.id, kind: 'doc', dk: d.kind, cat: d.cat, title: d.title,
        tags: [(d.tags || []).join(' '), CATS[d.cat] || '', d.kind === 'trip' ? 'תיק טיול' : '', d.kind.startsWith('seminar') ? 'סמינר' : ''].join(' '),
        mid: [d.headline, d.goal, d.concept, (d.segments || []).map(s => s.title).join(' '), (d.sections || []).map(s => s.title).join(' ')].join(' '),
        body: this.bodyOf(d), boost: d.kind === 'activity' ? 1.15 : d.kind === 'trip' ? 1.1 : 1,
      });
    }
    for (const c of this.comps) {
      entries.push({ ref: c.id, kind: 'comp', ct: c.type, role: c.role, title: c.title, tags: (c.tags || []).join(' ') + ' ' + (COMP_TYPES[c.type]?.one || '') + ' ' + (GAME_ROLES[c.role] || ''), mid: '', body: c.body || '', boost: c.type === 'method' ? .8 : 1 });
    }
    for (const s of Store.prefs.snippets || []) entries.push({ ref: s.id, kind: 'snip', title: s.title, tags: 'שמרתי ' + (KINDS[s.kind]?.name || ''), mid: '', body: s.body });
    for (const w of Store.list()) entries.push({ ref: w.id, kind: 'work', title: w.title || 'ללא שם', tags: 'שלי', mid: w.goal || '', body: workText(w), boost: 1.25 });
    Search.build(entries);
  },
  related(d, n = 6) {
    const tags = new Set(d.tags || []);
    const words = new Set(norm(d.title).split(' ').filter(w => w.length > 3 && !['פעולת', 'פעולה', 'קורס'].includes(w)));
    const out = [];
    for (const o of this.docs) {
      if (o.id === d.id || o.kind !== 'activity' && o.kind !== 'trip') continue;
      let s = 0;
      for (const t of o.tags || []) if (tags.has(t)) s += 2;
      for (const w of norm(o.title).split(' ')) if (words.has(w)) s += 3;
      if (o.cat === d.cat) s += .5;
      if ((d.variants || []).includes(o.id)) s -= 100;
      if (s > 2) out.push([s, o]);
    }
    return out.sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]);
  },
  // activities run around this time of year (titles carry dd.mm dates)
  seasonal(n = 8) {
    const t = new Date(); const doy = d => { const [dd, mm] = d.split('.').map(Number); return (mm - 1) * 30.5 + dd; };
    const now = (t.getMonth()) * 30.5 + t.getDate();
    return this.docs.filter(d => d.kind === 'activity' && d.date)
      .map(d => { let diff = doy(d.date) - now; if (diff < -183) diff += 366; if (diff > 183) diff -= 366; return [diff, d]; })
      .filter(([diff]) => diff >= -10 && diff <= 35)
      .sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
  },
};

// an item nobody really worked on: never saved after creation, or still completely empty
function isUntouched(w) {
  if (!w || w.deleted || w.isTemplate) return false;
  if (!w.v && (w.updatedAt || 0) - (w.createdAt || 0) < 1500) return true;   // made by the first version, never edited
  if ((w.title || '').trim()) return false;
  if (w.type === 'activity') return !(w.goal || '').trim() && !(w.equipment || []).length && (w.segments || []).every(s => !(s.body || '').trim());
  return !w.dateFrom && !(w.counselors || []).length && !(w.goal || '').trim() && !(w.schedule || []).length && !(w.menu || []).length
    && (w.sections || []).every(s => !(s.body || '').trim() && !(s.games || []).length);
}

function workText(w) {
  if (w.type === 'activity') return [w.goal, w.question, ...(w.segments || []).map(s => s.title + ' ' + s.body)].join('\n');
  return [w.goal, ...(w.sections || []).map(s => s.title + ' ' + (s.body || '') + ' ' + (s.games || []).map(g => g.title).join(' '))].join('\n');
}

/* ================================================================ toast */
let toastTimer;
function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button">${esc(action.label)}</button>` : '');
  if (action) el.querySelector('button').onclick = () => { el.classList.remove('show'); action.fn(); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5200 : 2600);
}

async function copyText(text, ok = 'הועתק') {
  try { await navigator.clipboard.writeText(text); toast(ok); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(ok); } catch { toast('לא ניתן להעתיק — סמנו את הטקסט ידנית'); }
    ta.remove();
  }
}
