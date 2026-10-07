"""Build the structured content library for the app from the extracted Drive material.

Inputs:  work/docs.json (from extract.py), raw/hadracha-pdfs.json
Output:  app/data/library.json
"""
import json, re, os, sys, hashlib, collections
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
docs = json.load(open(os.path.join(ROOT, 'work', 'docs.json'), encoding='utf-8'))
pdfs = json.load(open(os.path.join(ROOT, 'raw', 'hadracha-pdfs.json'), encoding='utf-8'))

# ---------------------------------------------------------------- helpers

def strip_md(s):
    return s.replace('**', '').strip()


def nid(*parts):
    return hashlib.md5('|'.join(parts).encode('utf-8')).hexdigest()[:10]


def block_md(b):
    t = b['t']
    if t == 'h':
        return '## ' + strip_md(b['x'])
    if t == 'p':
        return b['x']
    if t == 'li':
        ind = '  ' * min(b.get('l', 0), 2)
        return ind + ('1. ' if b.get('o') else '- ') + b['x']
    if t == 'table':
        rows = b['rows']
        return '\n'.join('| ' + ' | '.join(c.replace('\n', ' / ').replace('|', '/') for c in r) + ' |' for r in rows)
    if t == 'hr':
        return '---'
    return ''


def blocks_md(blocks):
    out = []
    prev = None
    for b in blocks:
        if b['t'] == 'img':
            continue
        s = block_md(b)
        if not s:
            continue
        # keep list items tight, paragraphs separated
        if prev == 'li' and b['t'] == 'li':
            out.append(s)
        else:
            if out:
                out.append('')
            out.append(s)
        prev = b['t']
    return '\n'.join(out).strip()


MIN_RE = re.compile(r'(\d{1,3})\s*(?:-\s*\d{1,3}\s*)?(?:דק(?:ות|ה|\'|׳)?|ד\'|ד׳|min)(?![א-ת])')
URL_RE = re.compile(r'https?://\S+')
DATE_RE = re.compile(r'(?<!\d)(\d{1,2})\s*[./]\s*(\d{1,2})(?:\s*[./]\s*(\d{2,4}))?(?!\d)')

HEADER_KEYS = r'(?:הפעלה|הפעלת|הפעלות|מתודה|משחק|משחקי|דיון|טקסט|סרטון|סיכום|מפקד|מפקדי|זמן|נקודת מבט|נקודות מבט|נק[\'׳]?\s*מבט|חלק|תחנה|שאלות|ציוד|רשימת ציוד|מטרת|מטרה|מטרות|קונספט|מסגרת|מהלך|נספח|נספחים|פעולת|פעולה|פתיחה|סיום|לו"ז|יחידה|שיקופי|שיקוף|סקירה|חידון|תפריט|צק ליסט)'
HEADER_RE = re.compile(r'^\s*(?:\d+[.)]\s*)?' + HEADER_KEYS)


def is_header(b):
    if b['t'] == 'h':
        return True
    if b['t'] != 'p':
        return False
    x = b['x'].strip()
    plain = strip_md(x)
    if not plain or len(plain) > 90:
        return False
    fully_bold = x.startswith('**') and x.endswith('**') and x.count('**') == 2
    if fully_bold and len(plain) <= 70:
        return True
    if HEADER_RE.match(plain) and (len(plain) <= 60 or ':' in plain[:40] or '-' in plain[:30]):
        # a long sentence that merely starts with "משחק" is content, not a header
        if len(plain) > 60 and not re.match(r'^[^:]{0,40}[:\-–|]', plain):
            return False
        return True
    return False


def classify(header):
    h = strip_md(header)
    if re.search(r'רשימת ציוד|^ציוד|ציוד\s*:?$', h):
        return 'equipment'
    if re.match(r'^(מטרת|מטרה|מטרות)', h):
        return 'goal'
    if re.match(r'^(קונספט|מסגרת|נושא הפעולה)', h):
        return 'concept'
    if 'מפקד' in h:
        return 'mifkad'
    if re.search(r'זמן צופיות|זמני צופיות', h):
        return 'skills'
    if 'זמן עצירה' in h:
        return 'stop'
    if re.search(r'נקודת מבט|נקודות מבט|נק[\'׳]?\s*מבט', h):
        return 'pov'
    if 'זמן תוכן' in h:
        return 'content'
    if 'נספח' in h:
        return 'appendix'
    if re.search(r'דיון|שאלות', h):
        return 'discussion'
    if 'סרטון' in h:
        return 'video'
    if 'טקסט' in h:
        return 'text'
    if re.search(r'משחק|זמן משחק|פז"ח|פזח', h):
        return 'game'
    if re.search(r'סיכום|סיום', h):
        return 'summary'
    if 'פתיחה' in h:
        return 'opening'
    return 'activity'


def minutes_in(s):
    m = MIN_RE.search(s)
    if m:
        v = int(m.group(1))
        if 1 <= v <= 240:
            return v
    return None


def clean_header_title(h):
    t = re.sub(r'\s+', ' ', strip_md(h))
    t = re.sub(r'\(?\s*\d{1,3}\s*(?:-\s*\d{1,3}\s*)?(?:דק(?:ות|ה|\'|׳)?|ד\'|ד׳)\s*\)?', '', t)
    t = re.sub(r'[|]\s*$', '', t)
    t = t.strip(' :-–|.')
    return t


def clean_title(t):
    t = re.sub(r'\.docx|docx\.|\.doc\b|\.pdf', '', t)
    t = re.sub(r'^(Copy of|עותק של)\s*', '', t)
    t = re.sub(r'[‎‏⁨⁩]', '', t)
    t = re.sub(r'\s*[-–]?\s*\d{1,2}\s*[./]\s*\d{1,2}(?:\s*[./]\s*\d{2,4})?\s*', ' ', t)
    t = re.sub(r'(.)\1{3,}', r'\1', t)   # השישי השלוש עשרהההההה
    t = re.sub(r'\s+', ' ', t).strip(' -–')
    return t


def date_of(t):
    m = DATE_RE.search(t)
    if not m:
        return None
    d, mo = int(m.group(1)), int(m.group(2))
    if 1 <= d <= 31 and 1 <= mo <= 12:
        return f'{d}.{mo}'
    return None


EMOJI_RE = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍]+')


def display_title(t):
    t = clean_title(t)
    t2 = EMOJI_RE.sub('', t).strip()
    return t2 or t


# ---------------------------------------------------------------- segmentation

def segment(blocks):
    """Split a document's blocks into a goal/concept/equipment + ordered segments."""
    goal, concept, equipment = [], [], []
    segs = []
    cur = {'kind': 'intro', 'title': '', 'blocks': []}
    mode = None          # 'goal' | 'concept' | 'equipment' collecting
    for b in blocks:
        if b['t'] == 'img':
            continue
        if is_header(b):
            raw = b['x']
            kind = classify(raw)
            plain = strip_md(raw)
            # inline value after colon: "מטרת הפעולה: שהחניכים..."
            inline = ''
            m = re.match(r'^([^:]{2,40}):\s*(.+)$', plain)
            if m and kind in ('goal', 'concept'):
                inline = m.group(2).strip()
            if kind in ('goal', 'concept'):
                mode = kind
                (goal if kind == 'goal' else concept).append(inline) if inline else None
                continue
            if kind == 'equipment':
                mode = 'equipment'
                if m and m.group(2).strip():
                    equipment.extend([e.strip() for e in re.split(r'[,،]', m.group(2)) if e.strip()])
                continue
            mode = None
            if cur['blocks'] or cur['title']:
                segs.append(cur)
            cur = {'kind': kind, 'title': clean_header_title(raw), 'header': plain, 'blocks': []}
            mins = minutes_in(plain)
            if mins:
                cur['minutes'] = mins
            # "משחק פתיחה: הידודים" -> title keeps the name
            continue
        x = b.get('x', '')
        # "מסגרת הפעולה : ..." / "מטרת הפעולה - ..." written as a long inline paragraph
        mm2 = re.match(r'^(מטרת הפעולה|מטרה|מסגרת הפעולה|מסגרת|קונספט הפעולה|קונספט)\s*[:\-–]\s*(.+)$', strip_md(x), re.S) if b['t'] == 'p' else None
        if mm2:
            k2 = 'goal' if mm2.group(1).startswith('מטר') else 'concept'
            (goal if k2 == 'goal' else concept).append(mm2.group(2).strip())
            mode = k2
            continue
        if mode == 'goal':
            if b['t'] in ('p', 'li') and len(goal) < 4 and len(strip_md(x)) < 600:
                goal.append(strip_md(x))
                continue
            mode = None
        if mode == 'concept':
            if b['t'] in ('p', 'li') and len(concept) < 4 and len(strip_md(x)) < 800:
                concept.append(strip_md(x))
                continue
            mode = None
        if mode == 'equipment':
            if b['t'] == 'li' or (b['t'] == 'p' and len(strip_md(x)) < 60):
                equipment.append(strip_md(x).lstrip('-•* ').strip())
                continue
            if b['t'] == 'table':
                for r in b['rows']:
                    cell = ' '.join(c for c in r if c.strip())
                    if cell:
                        equipment.append(strip_md(cell))
                continue
            mode = None
        # duration given on the line after the header: "(10 דקות)"
        if not cur.get('minutes') and not cur['blocks'] and b['t'] == 'p' and len(x) < 25:
            mm = minutes_in(x)
            if mm:
                cur['minutes'] = mm
                continue
        cur['blocks'].append(b)
    if cur['blocks'] or cur['title']:
        segs.append(cur)
    # drop empty intro
    segs = [s for s in segs if s['blocks'] or s['kind'] != 'intro']
    return goal, concept, equipment, segs


def refine_kind(seg):
    """A generic 'activity' segment whose body is mostly questions is a discussion, etc."""
    if seg['kind'] != 'activity' and seg['kind'] != 'intro':
        return seg['kind']
    bl = seg['blocks']
    if not bl:
        return seg['kind']
    q = sum(1 for b in bl if b['t'] in ('p', 'li') and b['x'].rstrip(' ?!.').strip() and b['x'].strip().endswith('?'))
    longp = sum(1 for b in bl if b['t'] == 'p' and len(b['x']) > 450)
    urls = sum(1 for b in bl if URL_RE.search(b.get('x', '')))
    title = seg.get('title', '')
    if q >= 3 and q >= len(bl) * 0.5:
        return 'discussion'
    if longp and len(bl) <= 3:
        return 'text'
    if urls and len(bl) <= 3 and 'סרטון' in title:
        return 'video'
    return seg['kind']


def seg_record(seg, i):
    body = blocks_md(seg['blocks'])
    kind = refine_kind(seg)
    title = seg.get('title') or ''
    if not title:
        title = {'intro': 'פתיחה', 'discussion': 'דיון', 'text': 'טקסט'}.get(kind, '')
    rec = {'kind': kind, 'title': title, 'body': body}
    if seg.get('minutes'):
        rec['minutes'] = seg['minutes']
    return rec


# ---------------------------------------------------------------- taxonomy

TOPICS = [
    ('גיבוש וקבוצה', r'גיבוש|כוחה של|שכבה מגובשת|רושם ראשוני|הכר את|היכרות|הכרויות|זוג מנצח|שיתוף פעולה|אחדות|המקום של כל אחד|זוגות|ילד א'),
    ('חברה ושוויון', r'שוויון|שיוויון|שקופים|מוגבלות|מוגבליות|סטריאוטיפ|קבלת האחר|מיעוטים|אוטיזם|גזענות|הדשא של השכן|בנים בנות'),
    ('בריונות וחרם', r'בריונות|ביריונות|חרם|אלימות'),
    ('זהות ישראלית ואקטואליה', r'זהות ישראלית|פוליטיקה|דמוקרטיה|מה מאחד|אזרחות|חטופים|השביעי לעשירי|שביעי לעשירי|הסתה|חופש הביטוי|העולם של היום'),
    ('צבא ושירות', r'פעולת צבא|גיוס חובה|שירות משמעותי|לפני הגיוס|גיוס'),
    ('זיכרון ושואה', r'שואה|יום הזיכרון|רבין|חללי צה|שכול|זמן עצירה - ימנו|ענר שפירא'),
    ('מסכים ורשתות', r'מסכים|אינסטגרם|רשתות חברתיות|טיקטוק|אפליקציות|התמכרות למסכים'),
    ('גוף ודימוי עצמי', r'מודל היופי|דימוי גוף|פחדים|חמשוש זה אופי'),
    ('סיכון ובטיחות', r'אלכוהול|לקחת סיכונים|זהירות בדרכים|הטרדות מיניות|הטרדה מינית'),
    ('הדרכה ומנהיגות', r'פעולת קורס|מנהיגות|דוגמה אישית|דוגמא אישית|מודלים הדרכתיים|קתימבנ|קתימבה|כובעי המדריך|כתיבת פעולה|מרכיבי הפעולה|ליווים|ניהול זמן|חוסן|השארת חותם|מרחב בטוח|לבחור נכון|פעולת פעילות|החלונות השבורים|הגישה להדרכה|חשיבות ההדרכה|מרחק הדרכתי|מדריך לחבר|קשר עם הורים|סיטואציות בהדרכה|הכר את המדריך'),
    ('צופים ושבט', r'למה אני בצופים|מה זה צופים|צופים בשבילי|מסורות|מפעלים|המסע בצופים|הכר את השבט|הכנה לטיול|הכנה למחנה|מחנאות|הכנה לאתגר|יום שבט|תוכן על השבט'),
    ('ערכים ומשמעות', r'גיבורים|אפקט הפרפר|נתינה|כרטיס אדי|התנדבות|מעורבות חברתית|אמונות טפלות|איכות הסביבה|הכרת תודה|העולם של היום'),
    ('חגים ומועדים', r'חנוכה|ראש השנה|ל"ג בעומר|לג בעומר|פסח|פורים|ט"ו בשבט|קריסמס|ולנטיין|חורף'),
    ('כיף ואתגר', r'מאסטר שף|מונדיאל|סליים|פיינטבול|קוסקוס|מאק אנד|חפש את המטמון|מירוץ למיליון|מירוץ למליון|משחקי הדיונון|הישרדות|יום שיא|כדורגל|ספא|ביצה|מכירה פומבית|כדורי שוקולד|סרטים|חושים|צחוק|תפוז|שיאים|בנייה|פורימון'),
]

COURSE_RE = re.compile(r'קורס|חמשוש|חמישית|חמישיות|שכב"?ג|ליווים|מבוא לכתיבת|מרכיבי הפעולה|חשיבות ההדרכה|מרחק הדרכתי|הבדל בין מדריך|התמודדות עם סיטואציות|כובעי המדריך|קשר עם הורים|פעולת פעילות|קתימבנ|מודלים הדרכתיים|ההבדל בין חמשוש')


def topics_for(text, title=None):
    """Title/goal matches count most; body mentions need repetition to count."""
    if title is None:
        title, body = text[:120], text[120:]
    else:
        body = text
    tags = []
    for name, rx in TOPICS:
        score = 3 * len(re.findall(rx, title)) + 0.6 * min(len(re.findall(rx, body)), 5)
        if score >= 2.4:
            tags.append(name)
    return tags[:4]


def category(title, path, body):
    t = title
    if 'זיכרון' in path:
        return 'memorial'
    if 'פעולות בית' in path:
        return 'home'
    if 'זום' in path:
        return 'zoom'
    if 'תוכן על השבט' in path:
        return 'tribe'
    if re.search(r'שיא|יום שיא|מירוץ למ(י)?ליון', t):
        return 'peak'
    if re.search(r'יום השואה|רבין|יום הזיכרון', t):
        return 'memorial'
    if COURSE_RE.search(t) or re.search(r'פעולת קורס|פעולות קורס', body[:600]):
        return 'course'
    if re.search(r'חנוכה|ראש השנה|לג בעומר|ל"ג בעומר|קריסמס|ולנטיין|חורף|פורים|פסח', t):
        return 'holiday'
    return 'regular'


CAT_NAMES = {
    'regular': 'פעולה רגילה', 'course': 'פעולת קורס', 'memorial': 'זיכרון וטקסים', 'peak': 'פעולת שיא',
    'home': 'פעולת בית', 'zoom': 'פעולת זום', 'holiday': 'חגים ומועדים', 'tribe': 'תוכן על השבט',
}

# ---------------------------------------------------------------- trips

TRIP_SECTIONS = [
    ('reflection', r'שיקופי מצב|שיקוף'),
    ('content', r'זמן תוכן|זמני תוכן'),
    ('pov', r'נקודת מבט|נקודות מבט|נק[\'׳]?\s*מבט'),
    ('morning', r'בוקר טוב'),
    ('night', r'לילה טוב'),
    ('peak', r'פעולת שיא|יום שיא|שיא גדודי'),
    ('battalion', r'גדודי|גדודית|שבטי'),
    ('ceremony', r'מעבר דרגה|חלוקת עניבות|(?<![א-ת])טקס(?!ט)|^קידוש'),
    ('opening', r'פעולת פתיחה|פתיחה'),
    ('closing', r'פעולת סיכום|סיכום'),
    ('skills', r'צופיות'),
    ('bus-games', r'אוטובוס'),
    ('route-games', r'מסלול'),
    ('upgraded-games', r'משודרג'),
    ('equipment-games', r'משחקים עם ציוד|עם ציוד'),
    ('regular-games', r'משחקים רגילים|זמני משחק|משחקים'),
    ('geo', r'סקירה גאוגרפית|סקירה גיאוגרפית|גאוגרפ'),
    ('quiz', r'חידון'),
    ('equipment', r'^ציוד|רשימת ציוד'),
    ('appendix', r'^נספח'),
]

TRIP_NAMES = {
    'reflection': 'שיקופי מצב', 'content': 'זמן תוכן צוותי', 'pov': 'נקודת מבט', 'morning': 'פעולת בוקר טוב',
    'night': 'פעולת לילה טוב', 'battalion': 'פעולה גדודית', 'peak': 'פעולת שיא', 'ceremony': 'טקס',
    'opening': 'פעולת פתיחה', 'closing': 'פעולת סיכום', 'skills': 'זמן צופיות', 'bus-games': 'משחקי אוטובוס',
    'route-games': 'משחקי מסלול', 'upgraded-games': 'משחקים משודרגים', 'equipment-games': 'משחקים עם ציוד',
    'regular-games': 'משחקים רגילים', 'geo': 'סקירה גאוגרפית', 'quiz': 'חידון', 'equipment': 'ציוד',
    'appendix': 'נספחים', 'other': 'אחר',
}


def trip_kind(h):
    plain = strip_md(h)
    for k, rx in TRIP_SECTIONS:
        if re.search(rx, plain):
            return k
    return None


def trip_sections(blocks):
    secs = []
    cur = {'kind': 'other', 'title': 'פתיחה', 'blocks': []}
    for b in blocks:
        if b['t'] == 'img':
            continue
        plain = strip_md(b.get('x', ''))
        cand = False
        if b['t'] == 'h' or (b['t'] == 'p' and len(plain) <= 70 and (
                (b['x'].startswith('**') and b['x'].endswith('**')) or plain.endswith(':') or re.match(r'^(נקודת מבט|נק[\'׳]?\s*מבט|זמן תוכן|זמן צופיות|פעולת|משחקי|משחקים|\d+ משחקים|\d+ זמני|שיקופי|סקירה|חידון|ציוד)', plain))):
            k = trip_kind(plain)
            # inner "הפעלה ראשונה" etc. are not trip sections
            if k and not re.match(r'^(הפעלה|הפעלת|דיון|שאלות|טקסט|משחק (ראשון|שני|שלישי|רביעי|חמישי|שישי)|משחק פתיחה|משחק:)', plain):
                cand = True
        if cand:
            if cur['blocks']:
                secs.append(cur)
            cur = {'kind': k, 'title': clean_header_title(plain) or TRIP_NAMES[k], 'blocks': []}
            continue
        cur['blocks'].append(b)
    if cur['blocks']:
        secs.append(cur)
    out = []
    for s in secs:
        # privacy: kids' names in "שיקופי חניכים" tables are removed from the library copy
        for b in s['blocks']:
            if b['t'] == 'table' and b['rows'] and any('שם החניך' in strip_md(c) for c in b['rows'][0]):
                col = [i for i, c in enumerate(b['rows'][0]) if 'שם החניך' in strip_md(c)][0]
                for r in b['rows'][1:]:
                    if col < len(r):
                        r[col] = '—'
        rec = {'kind': s['kind'], 'title': s['title'], 'body': blocks_md(s['blocks'])}
        if s['kind'] == 'equipment':
            rec['items'] = [strip_md(b['x']).lstrip('-• ').strip() for b in s['blocks'] if b['t'] in ('li', 'p') and len(b['x']) < 80]
        if s['kind'] == 'reflection':
            tables = [b for b in s['blocks'] if b['t'] == 'table']
            if tables:
                rec['table'] = [[strip_md(c) for c in r] for r in tables[0]['rows']]
        out.append(rec)
    return out


# ---------------------------------------------------------------- texts repository split

def split_texts(blocks):
    """The text repository is title-line + long passage pairs."""
    items = []
    cur_title, cur_body = None, []
    paras = [strip_md(b['x']) for b in blocks if b['t'] in ('p', 'li', 'h') and b.get('x')]
    for p in paras:
        if p.startswith('מאגר טקסטים'):
            continue
        is_title = len(p) <= 70 and not re.search(r'[.?!"״]$', p) and not p.startswith('(')
        if is_title:
            if cur_title and sum(len(x) for x in cur_body) > 150:
                items.append((cur_title, '\n\n'.join(cur_body)))
                cur_body = []
                cur_title = p
            elif cur_title and cur_body:
                # short line inside a passage -> keep as part of passage
                cur_body.append(p)
            else:
                cur_title = p
        else:
            # titles sometimes trail the previous passage: "...עד בלי❤ ‏גרסה חדשה של סוד החיים"
            cur_body.append(p)
    if cur_title and cur_body:
        items.append((cur_title, '\n\n'.join(cur_body)))
    # the very first passage has no leading title in the source; its title follows it
    return items


# ---------------------------------------------------------------- main build

library_docs = []
components = []
SEEN_COMPONENT = set()


def add_component(c):
    if (c.get('body', '') + c['title']).count('_') > 20:
        return      # blank submission forms
    if c['type'] == 'game':
        t = c['title'].strip(' :-–/')
        if re.fullmatch(r'(שכבתי|אחוותי|התחלתי|גדודי|משחק|משחקים|פתיחה|סיום|אמצע|ים|)', t) or len(t) < 2:
            first = re.split(r'[\n.:\-–]', strip_md(c.get('body', '')).lstrip('- '), 1)[0].strip()
            t = first[:40] if first else 'משחק'
        c['title'] = t
    key =(c['type'], re.sub(r'\W+', '', c['title'])[:40], re.sub(r'\W+', '', c.get('body', ''))[:80])
    if key in SEEN_COMPONENT:
        return
    SEEN_COMPONENT.add(key)
    c['id'] = 'c' + nid(c['type'], c['title'], c.get('body', '')[:200], c.get('from', ''))
    components.append(c)


def text_of(blocks):
    return '\n'.join(strip_md(b.get('x', '')) if b['t'] != 'table' else ' '.join(' '.join(r) for r in b['rows']) for b in blocks)


SOURCE_URL = 'https://docs.google.com/document/d/{}/edit'
SHEET_URL = 'https://docs.google.com/spreadsheets/d/{}/edit'

skip_titles = {'פורמט להגשת ליווים'}

for d in docs:
    path = (d['paths'] or ['?'])[0]
    raw_title = d['title']
    title = display_title(raw_title)
    full_text = text_of(d['blocks'])
    if len(full_text.strip()) < 40 and d.get('kind') != 'sheet':
        # image-only print sheets (monopoly cards, money, etc.) -> attachment entries
        library_docs.append({
            'id': 'd' + d['id'][:12], 'kind': 'attachment', 'title': title, 'path': path,
            'source': SOURCE_URL.format(d['id']), 'note': 'קובץ להדפסה (תמונות בלבד) — נשאר בדרייב',
        })
        continue
    src = SHEET_URL.format(d['id']) if d.get('kind') == 'sheet' else SOURCE_URL.format(d['id'])
    base = {'id': 'd' + d['id'][:12], 'title': title, 'rawTitle': raw_title, 'path': path, 'source': src}
    dt = date_of(raw_title)
    if dt:
        base['date'] = dt

    # --- trip files
    if path == 'טיולים' and not raw_title.startswith('יום שבט') or (path == 'טיולים' and 'תיק' in raw_title):
        secs = trip_sections(d['blocks'])
        rec = dict(base, kind='trip', sections=secs)
        rec['tags'] = topics_for(full_text[:3000], raw_title)
        rec['words'] = len(full_text.split())
        library_docs.append(rec)
        # reusable parts out of trip files
        for s in secs:
            if s['kind'] in ('morning', 'night', 'opening', 'closing', 'battalion', 'peak', 'ceremony', 'skills', 'quiz', 'geo', 'content', 'pov') and len(s['body']) > 60:
                add_component({'type': 'trip-part', 'part': s['kind'], 'title': (TRIP_NAMES[s['kind']] + ' — ' + s['title']) if s['title'] != TRIP_NAMES[s['kind']] else TRIP_NAMES[s['kind']] + ' · ' + title,
                               'body': s['body'], 'from': rec['id']})
        continue
    if path == 'טיולים':
        # appendix / personal-POV collections attached to trip files
        goal, concept, equipment, segs = segment(d['blocks'])
        rec = dict(base, kind='trip-appendix', segments=[seg_record(s, i) for i, s in enumerate(segs)], equipment=equipment)
        rec['tags'] = topics_for(full_text[:3000], raw_title)
        rec['words'] = len(full_text.split())
        library_docs.append(rec)
        continue

    # --- seminar material
    if path.startswith('סמינרים'):
        if d.get('kind') == 'sheet':
            rec = dict(base, kind='seminar-sheet', sections=[{'kind': 'sheet', 'title': strip_md(b['x']) if b['t'] == 'h' else '', 'body': block_md(b)} for b in d['blocks']])
            # merge heading + table pairs
            secs, pending = [], None
            for b in d['blocks']:
                if b['t'] == 'h':
                    pending = strip_md(b['x'])
                elif b['t'] == 'table':
                    secs.append({'title': pending or 'טבלה', 'rows': [[c for c in r] for r in b['rows']]})
                    pending = None
            rec['sections'] = secs
            if 'קבוצות' in raw_title:
                continue      # a roster of real kids' names — not copied into the app
            library_docs.append(rec)
            continue
        goal, concept, equipment, segs = segment(d['blocks'])
        rec = dict(base, kind='seminar', goal=' '.join(goal), segments=[seg_record(s, i) for i, s in enumerate(segs)], equipment=equipment)
        rec['tags'] = topics_for(full_text[:4000], raw_title)
        rec['words'] = len(full_text.split())
        library_docs.append(rec)
        continue

    # --- texts repository -> one component per reading
    if 'טקסטים' in path and len(full_text) > 20000:
        for tt, body in split_texts(d['blocks']):
            add_component({'type': 'text', 'title': tt.strip(' :-'), 'body': body, 'from': base['id'],
                           'tags': topics_for(body[:1500], tt)})
        library_docs.append(dict(base, kind='collection', note='מאגר טקסטים — כל טקסט מופיע בנפרד בספרייה', words=len(full_text.split())))
        continue

    # --- everything else is an activity-like document
    goal, concept, equipment, segs = segment(d['blocks'])
    # the document's own bold headline ("פעולת כרטיס אדי") is not a segment
    headline = ''
    if segs and segs[0]['kind'] in ('activity', 'intro', 'opening') and segs[0].get('header') and \
            re.search(r'פעול|^' + re.escape(title[:6]), segs[0]['header']) and not re.match(r'^(הפעלה|מתודה|משחק)', segs[0]['header']):
        headline = clean_header_title(segs[0]['header'])
        segs[0]['kind'] = 'intro'
        segs[0]['title'] = ''
        if not segs[0]['blocks']:
            segs = segs[1:]
    seg_recs = [seg_record(s, i) for i, s in enumerate(segs)]
    cat = category(raw_title, path, full_text)
    rec = dict(base, kind='activity', cat=cat, goal=' '.join(g for g in goal if g)[:700],
               concept=' '.join(c for c in concept if c)[:700], segments=seg_recs, equipment=[e for e in equipment if e][:40])
    if headline and headline != title:
        rec['headline'] = headline
    mins = [s.get('minutes') for s in seg_recs if s.get('minutes')]
    if mins and len(mins) >= 2:
        rec['minutes'] = sum(mins)
    rec['tags'] = topics_for(full_text[:4000], raw_title + ' ' + rec['goal'] + ' ' + rec.get('headline', ''))
    if cat == 'course' and 'הדרכה ומנהיגות' not in rec['tags']:
        rec['tags'].insert(0, 'הדרכה ומנהיגות')
    rec['audience'] = 'חמישית' if (cat == 'course' or re.search(r'חמשוש|חמישית|חמישיות', full_text[:4000])) else 'חניכים'
    rec['videos'] = sorted(set(u.rstrip(').,') for u in URL_RE.findall(full_text) if 'youtu' in u))[:8]
    rec['words'] = len(full_text.split())
    library_docs.append(rec)

    # components out of the activity
    for s in seg_recs:
        b = s['body']
        if not b or len(b) < 40:
            continue
        kind = s['kind']
        st = s['title'] or ''
        if kind == 'game' or (kind == 'opening' and 'משחק' in st):
            name = re.sub(r'^(משחק|משחקי|זמן משחק)\s*(פתיחה|אמצע|סיום|שכבתי|ראשון|שני|שלישי|רביעי)?\s*[:\-–]?\s*', '', st).strip() or st
            add_component({'type': 'game', 'title': name or 'משחק', 'body': b, 'from': rec['id'], 'role': 'opening' if 'פתיחה' in st else 'activity'})
        elif kind == 'text' and len(b) > 250:
            add_component({'type': 'text', 'title': (st if st and st not in ('טקסט',) else 'טקסט') + ' · ' + title, 'body': b, 'from': rec['id'], 'tags': rec['tags']})
        elif kind == 'discussion':
            qs = [l.lstrip('-•0123456789.) ').strip() for l in b.split('\n') if l.strip().endswith('?')]
            if len(qs) >= 3:
                add_component({'type': 'questions', 'title': 'שאלות לדיון · ' + title, 'body': '\n'.join('- ' + q for q in qs), 'from': rec['id'], 'tags': rec['tags'], 'count': len(qs)})
        elif kind in ('activity', 'opening', 'summary', 'pov', 'content', 'skills', 'stop') and len(b) > 120:
            add_component({'type': 'method', 'title': (st or 'הפעלה') + ' · ' + title, 'body': b, 'from': rec['id'], 'tags': rec['tags'], 'minutes': s.get('minutes')})
        # embedded long texts inside activity segments
        if kind != 'text':
            for para in b.split('\n\n'):
                if len(para) > 700 and not para.startswith('|') and para.count('?') < 4:
                    add_component({'type': 'text', 'title': (st or 'טקסט') + ' · ' + title, 'body': para, 'from': rec['id'], 'tags': rec['tags']})
        for q_block in re.findall(r'((?:^[-\d].*\?\s*$\n?){4,})', b, re.M):
            pass

# ---------------------------------------------------------------- variants (copies of the same activity)
def sig(r):
    txt = ' '.join(s.get('body', '') for s in r.get('segments', []))
    words = re.findall(r'[א-ת]{3,}', txt)
    return set(words)

acts = [r for r in library_docs if r['kind'] == 'activity']
for i, a in enumerate(acts):
    sa = sig(a)
    if len(sa) < 30:
        continue
    for b in acts[i + 1:]:
        sb = sig(b)
        if len(sb) < 30:
            continue
        j = len(sa & sb) / len(sa | sb)
        if j > 0.82:
            a.setdefault('variants', []).append(b['id'])
            b.setdefault('variants', []).append(a['id'])

# ---------------------------------------------------------------- curated material from PDFs and wall boards
helper = next(v for k, v in pdfs.items() if k.startswith('עזרים'))
helper = re.sub(r'Page \d+ of \d+', '', helper)


def parse_numbered(section_text):
    items = []
    for m in re.finditer(r'(?:^|\n)\s*\.?(\d{1,2})\s+(.+?)(?=\n\s*\.?\d{1,2}\s+|\Z)', section_text, re.S):
        items.append(re.sub(r'\s*\n\s*', ' ', m.group(2)).strip())
    return items


def between(txt, a, b):
    i = txt.find(a)
    j = txt.find(b, i + len(a)) if b else len(txt)
    return txt[i + len(a): j if j > 0 else len(txt)]


def fix_parens(s):
    # PDF text extraction flips parentheses in RTL
    return s.replace(')', '\u0000').replace('(', ')').replace('\u0000', '(')


def name_desc(item):
    item = fix_parens(item)
    m = re.match(r'^(.{2,40}?)\s*[-–]\s+(.+)$', item)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return item.strip(), ''


skills_txt = between(helper, 'זמני צופיות:', 'משחקי אוטובוס:')
bus_txt = between(helper, 'משחקי אוטובוס:', 'משחקי מסלול:')
route_txt = between(helper, 'משחקי מסלול:', 'משחקים משודרגים:')
upg_txt = between(helper, 'משחקים משודרגים:', 'שלבים לנקודות מבט:')
pov_txt = between(helper, 'שלבים לנקודות מבט:', 'פעולות בוקר טוב:')
morning_txt = between(helper, 'פעולות בוקר טוב:', 'פעולות לילה טוב:')
night_txt = between(helper, 'פעולות לילה טוב:', None)


def bullets(t):
    out = []
    for part in re.split(r'\n\s*-\s+', '\n' + t):
        part = re.sub(r'\s*\n\s*', ' ', part).strip(' -')
        if part:
            out.append(fix_parens(part))
    return out


HELPER_ID = 'pdf-trip-helper'
for s in bullets(skills_txt):
    add_component({'type': 'skill', 'title': s, 'body': '', 'from': HELPER_ID})
for it in parse_numbered(bus_txt):
    n, ds = name_desc(it)
    add_component({'type': 'game', 'role': 'bus', 'title': n, 'body': ds, 'from': HELPER_ID})
for it in bullets(route_txt):
    n, ds = name_desc(it)
    add_component({'type': 'game', 'role': 'route', 'title': n, 'body': ds, 'from': HELPER_ID})
for it in parse_numbered(upg_txt):
    n, ds = name_desc(it)
    add_component({'type': 'game', 'role': 'upgraded', 'title': n, 'body': ds, 'from': HELPER_ID})
for s in bullets(morning_txt):
    add_component({'type': 'idea', 'role': 'morning', 'title': s, 'body': '', 'from': HELPER_ID})
for s in bullets(night_txt):
    add_component({'type': 'idea', 'role': 'night', 'title': s, 'body': '', 'from': HELPER_ID})

pov_steps = [re.sub(r'\s*\n\s*', ' ', fix_parens(x)).strip() for x in re.split(r'שלב (?:ראשון|שני|שלישי)-', pov_txt)[1:]]
library_docs.append({'id': HELPER_ID, 'kind': 'guide', 'title': 'עזרים לכתיבת תיק טיול', 'path': 'טיולים',
                     'source': 'https://drive.google.com/file/d/1dusae-9DEAAemKSpJijK0B6nxPFoViy6/view',
                     'body': re.sub(r'\n{3,}', '\n\n', fix_parens(helper)).strip(), 'povSteps': pov_steps})

# warm-up games list (פזחים)
pz = next((v for k, v in pdfs.items() if 'פזחים' in k), '')
for m in re.finditer(r'\.(\d{1,2})\s*([^\n.]+)', re.sub(r'Page \d+ of \d+|Displaying.*', '', pz)):
    nm = m.group(2).strip()
    nm = re.sub(r'^סק\.?', '', nm).strip()
    if nm and len(nm) < 40 and 'זונה' not in nm:
        add_component({'type': 'game', 'role': 'warmup', 'title': fix_parens(nm), 'body': '', 'from': 'pdf-pazachim'})

# wall boards (photos from the tribe)
for nm in ['גב לגב', 'פים פם פום', 'גנגם ספיד', 'סבתא סוזן', 'משחק הוויקיפדיה', 'טלפון שבור פרצופים', 'רגליים עיניים',
           'הרוח נושבת לכיוון', 'משחק המדבקות', 'אנקל בנקל', 'פתקיות', 'משחקי קלפים', 'אבן נייר ומספריים אנושי', 'פינוקיו',
           "ג'מוס על הסוס", 'קיסם וטבעת', '8200', '2 כלבים ועצם', 'טלפון שבור', 'בלונים ושיפודים', '3 מקלות', 'הקטרים באים']:
    add_component({'type': 'game', 'role': 'upgraded', 'title': nm, 'body': '', 'from': 'board-upgraded'})
for nm in ['מנורת לבה', 'קשר שלמה', 'לוכד חלומות', 'כתר מעלים וענפים', 'שבשבת רוח', 'הכנת צבעים מהטבע', 'קוסקוס בבקבוק',
           'אגרוף קוף', 'כפית מגזר', 'כוס מנייר']:
    add_component({'type': 'skill', 'title': nm, 'body': '', 'from': 'board-skills'})

# food ideas
food = next((v for k, v in pdfs.items() if 'לאוכל' in k), '')
library_docs.append({'id': 'pdf-food', 'kind': 'resource', 'title': 'רעיונות לאוכל לישבצים', 'path': 'מאגרי הדרכה',
                     'source': 'https://drive.google.com/file/d/1MBStQia2G9VdM0p_lIOYnD8T6tBbjgaf/view',
                     'body': fix_parens(re.sub(r'Page \d+ of \d+|Page \d+', '', food)).strip()})
# tribe history
emp = next((v for k, v in pdfs.items() if 'EMPIRE' in k), '')
library_docs.append({'id': 'pdf-empire', 'kind': 'resource', 'cat': 'tribe', 'title': 'שכבות השבט לאורך השנים', 'path': 'מאגרי הדרכה/תוכן על השבט',
                     'source': 'https://drive.google.com/file/d/1XLijCHL8Sm1C8BXlKok_b-RvvF0RaTKc/view',
                     'body': re.sub(r'Page \d+ of \d+|Displaying.*', '', emp).strip()})
# activity that only existed as a PDF
pw = next((v for k, v in pdfs.items() if 'התמכרות לכוח' in k), '')
if pw:
    lines = [l.strip() for l in re.sub(r'Page \d+ of \d+|Displaying.*', '', pw).split('\n') if l.strip()]
    blocks = [{'t': 'p', 'x': fix_parens(l)} for l in lines[1:]]
    goal, concept, equipment, segs = segment(blocks)
    library_docs.append({'id': 'pdf-power', 'kind': 'activity', 'cat': 'regular', 'title': 'פעולת התמכרות לכוח', 'date': '21.1',
                         'path': 'פעולות/פעולות רגילות', 'source': 'https://drive.google.com/file/d/1-VkdNWeSiE7zsad9OP8T9NioZNlls06B/view',
                         'goal': ' '.join(goal), 'concept': ' '.join(concept), 'segments': [seg_record(s, i) for i, s in enumerate(segs)],
                         'equipment': equipment, 'tags': ['חברה ושוויון', 'ערכים ומשמעות'], 'audience': 'חניכים', 'partial': True,
                         'words': len(pw.split())})

# items that exist in Drive but are locked for this account
LOCKED = [
    ('סמינרים', 'סמינר הכנה לאתגר (תיקייה)'), ('טיולים', 'תיק טיול- פסח'), ('פעולות/פעולות זיכרון', 'פעולה יום הזיכרון'),
    ('מאגרי הדרכה/פעולות בית', 'פעולת בית חבילה עוברת'), ('מאגרי הדרכה/פעולות בית', 'פעולת בית פוקר חטיפים 25.11'),
    ('מאגרי הדרכה/פעולות בית', 'פעולת בית 3.2 -ספא'), ('מאגרי הדרכה/פעולות בית', 'פעולת בית בנושא חברות והתנהלות קבוצתית (Word)'),
    ('מאגרי הדרכה/פעולות בית', 'פעולת בית בנושא חברות והתנהלות קבוצתית — עותק (Word)'), ('מאגרי הדרכה/פעולות בית', 'פעולות בית לחורף (Word ישן)'),
    ('מאגרי הדרכה/פעולות בית', 'פעולת בית - הרמז'), ('מאגרי הדרכה/פעולות בית', 'פעולת בית-ש.פ'),
]

out = {
    'version': 1,
    'catNames': CAT_NAMES,
    'tripNames': TRIP_NAMES,
    'topics': [t for t, _ in TOPICS],
    'docs': library_docs,
    'components': components,
    'locked': [{'path': p, 'title': t} for p, t in LOCKED],
}
os.makedirs(os.path.join(ROOT, 'app', 'data'), exist_ok=True)
with open(os.path.join(ROOT, 'app', 'data', 'library.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

kinds = collections.Counter(d['kind'] for d in library_docs)
ctypes = collections.Counter(c['type'] for c in components)
cats = collections.Counter(d.get('cat') for d in library_docs if d['kind'] == 'activity')
print('docs', len(library_docs), dict(kinds))
print('cats', dict(cats))
print('components', len(components), dict(ctypes))
print('size KB', os.path.getsize(os.path.join(ROOT, 'app', 'data', 'library.json')) // 1024)


