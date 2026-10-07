"""Convert the raw Drive/Docs export into clean per-document markdown + a structured JSON.

Input:  raw/hadracha-docs.json  (Google Docs HTML exports, keyed by doc id)
        raw/hadracha-meta2.json (folder inventory: shortcut id -> path/label/url)
Output: work/md/<n>_<title>.md   (human-readable, for review)
        work/docs.json           (structured blocks per document)
        work/img/<docid>_<k>.<ext>
"""
import base64, json, os, re, sys
from bs4 import BeautifulSoup, NavigableString

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw')
WORK = os.path.join(ROOT, 'work')
os.makedirs(os.path.join(WORK, 'md'), exist_ok=True)
os.makedirs(os.path.join(WORK, 'img'), exist_ok=True)

meta = json.load(open(os.path.join(RAW, 'hadracha-meta2.json'), encoding='utf-8'))['meta']
docs = json.load(open(os.path.join(RAW, 'hadracha-docs.json'), encoding='utf-8'))

# target doc id -> list of (path, label)
where = {}
names = {}


def clean_label(s):
    s = re.sub(r'^(Shortcut to )?(Google Docs|Google Sheets|Google Slides|PDF|Microsoft Word|Microsoft PowerPoint|Image|Video)', '', s)
    s = re.sub(r'[A-Z]?[a-z0-9._]{3,}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s?\d.*$', '', s)
    s = re.sub(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+, \d{4}.*$', '', s)
    s = re.sub(r'[⁨⁩‎‏‪-‮]', '', s)
    return s.strip(' —-')


for sid, v in meta.items():
    m = re.search(r'/d/([^/]+)', v.get('url') or '')
    if m:
        where.setdefault(m.group(1), []).append(v['path'])
        names.setdefault(m.group(1), clean_label(v['label']))


def css_classes(soup):
    """Return sets of class names that are bold / underlined / highlighted."""
    bold, under, hl = set(), set(), set()
    for st in soup.find_all('style'):
        for sel, body in re.findall(r'\.([a-zA-Z0-9_-]+)\{([^}]*)\}', st.text):
            if re.search(r'font-weight:\s*(700|bold)', body):
                bold.add(sel)
            if 'underline' in body:
                under.add(sel)
            m = re.search(r'background-color:\s*(#[0-9a-f]{6})', body)
            if m and m.group(1) not in ('#ffffff',):
                hl.add(sel)
    return bold, under, hl


def inline(el, bold):
    out = []
    for node in el.descendants:
        if isinstance(node, NavigableString):
            if node.parent.name in ('style', 'script'):
                continue
            t = str(node)
            if not t:
                continue
            p = node.parent
            is_b = False
            while p is not None and p is not el.parent:
                if p.name in ('b', 'strong') or (set(p.get('class') or []) & bold):
                    is_b = True
                    break
                if p is el:
                    break
                p = p.parent
            out.append((t, is_b))
        elif node.name == 'br':
            out.append(('\n', False))
    # merge runs
    s = ''
    cur_b = False
    for t, b in out:
        if b and t.strip():
            s += f'**{t.strip()}**' + (' ' if t.endswith(' ') else '')
            if t.startswith(' ') and not s.endswith(' '):
                pass
        else:
            s += t
    s = s.replace('\xa0', ' ')
    s = re.sub(r'\*\*\s*\*\*', '', s)
    s = re.sub(r'[ \t]+', ' ', s)
    return s.strip()


def convert(doc_id, html, imgdir):
    soup = BeautifulSoup(html, 'html.parser')
    title = names.get(doc_id) or ((soup.title.string or '').strip() if soup.title else '')
    bold, under, hl = css_classes(soup)
    body = soup.body or soup
    blocks = []
    img_n = 0

    def handle_imgs(el):
        nonlocal img_n
        refs = []
        for im in el.find_all('img'):
            src = im.get('src') or ''
            m = re.match(r'data:image/(\w+);base64,(.*)', src, re.S)
            if m:
                ext = m.group(1).replace('jpeg', 'jpg')
                data = base64.b64decode(m.group(2))
                fn = f'{doc_id}_{img_n}.{ext}'
                with open(os.path.join(imgdir, fn), 'wb') as f:
                    f.write(data)
                refs.append({'file': fn, 'bytes': len(data)})
                img_n += 1
        return refs

    def walk(container):
        for el in container.children:
            if isinstance(el, NavigableString):
                if el.strip():
                    blocks.append({'t': 'p', 'x': el.strip()})
                continue
            name = el.name
            if name in ('style', 'script', 'meta', 'title', 'head'):
                continue
            if name in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
                x = inline(el, bold)
                if x:
                    blocks.append({'t': 'h', 'l': int(name[1]), 'x': x})
                for r in handle_imgs(el):
                    blocks.append({'t': 'img', **r})
            elif name == 'p':
                x = inline(el, bold)
                imgs = handle_imgs(el)
                if x:
                    blocks.append({'t': 'p', 'x': x})
                for r in imgs:
                    blocks.append({'t': 'img', **r})
            elif name in ('ul', 'ol'):
                cls = ' '.join(el.get('class') or [])
                lvl = 0
                m = re.search(r'-(\d+)\b', cls)
                if m:
                    lvl = int(m.group(1))
                for li in el.find_all('li', recursive=False):
                    x = inline(li, bold)
                    if x:
                        blocks.append({'t': 'li', 'o': name == 'ol', 'l': lvl, 'x': x})
                    for r in handle_imgs(li):
                        blocks.append({'t': 'img', **r})
            elif name == 'table':
                rows = []
                for tr in el.find_all('tr'):
                    cells = []
                    for td in tr.find_all(['td', 'th'], recursive=False):
                        parts = []
                        for p in td.find_all(['p', 'li', 'h1', 'h2', 'h3', 'h4']):
                            x = inline(p, bold)
                            if x:
                                parts.append(('• ' if p.name == 'li' else '') + x)
                        for r in handle_imgs(td):
                            parts.append(f"[img:{r['file']}]")
                        cells.append('\n'.join(parts))
                    if any(c.strip() for c in cells):
                        rows.append(cells)
                if rows:
                    blocks.append({'t': 'table', 'rows': rows})
            elif name in ('div', 'span', 'body', 'section'):
                walk(el)
            elif name == 'hr':
                blocks.append({'t': 'hr'})
            elif name == 'img':
                for r in handle_imgs(el.parent):
                    blocks.append({'t': 'img', **r})
            else:
                x = inline(el, bold)
                if x:
                    blocks.append({'t': 'p', 'x': x})
    walk(body)
    return title, blocks


def to_md(title, blocks):
    lines = [f'# {title}', '']
    for b in blocks:
        t = b['t']
        if t == 'h':
            lines += ['#' * min(6, b['l'] + 1) + ' ' + b['x'], '']
        elif t == 'p':
            lines += [b['x'], '']
        elif t == 'li':
            lines.append('  ' * b['l'] + ('1. ' if b['o'] else '- ') + b['x'])
        elif t == 'table':
            lines.append('')
            for r in b['rows']:
                lines.append('| ' + ' | '.join(c.replace('\n', ' / ') for c in r) + ' |')
            lines.append('')
        elif t == 'img':
            lines += [f"[תמונה {b['file']} {b['bytes']//1024}KB]", '']
        elif t == 'hr':
            lines += ['---', '']
    return '\n'.join(lines)


out = []
imgdir = os.path.join(WORK, 'img')
for n, (doc_id, html) in enumerate(docs['docs'].items()):
    title, blocks = convert(doc_id, html, imgdir)
    paths = where.get(doc_id, [])
    rec = {'id': doc_id, 'title': title, 'paths': paths, 'blocks': blocks}
    out.append(rec)
    safe = re.sub(r'[\\/:*?"<>|]', '_', title)[:60]
    with open(os.path.join(WORK, 'md', f'{n:03d}_{safe}.md'), 'w', encoding='utf-8') as f:
        f.write(f'<!-- id={doc_id} paths={paths} -->\n' + to_md(title, blocks))

for sid, txt in docs.get('pres', {}).items():
    out.append({'id': sid, 'title': names.get(sid, 'presentation'), 'paths': where.get(sid, []), 'kind': 'pres',
                'blocks': [{'t': 'p', 'x': l} for l in txt.splitlines() if l.strip()]})

# sheets -> xlsx -> rows
import io, openpyxl
for sid, durl in docs.get('sheets', {}).items():
    data = base64.b64decode(durl.split(',', 1)[1])
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    blocks = []
    for ws in wb.worksheets:
        rows = []
        for r in ws.iter_rows(values_only=True):
            cells = ['' if c is None else str(c) for c in r]
            if any(c.strip() for c in cells):
                while cells and not cells[-1].strip():
                    cells.pop()
                rows.append(cells)
        if rows:
            blocks.append({'t': 'h', 'l': 2, 'x': ws.title})
            blocks.append({'t': 'table', 'rows': rows})
    title = names.get(sid) or wb.properties.title or sid
    rec = {'id': sid, 'title': title, 'paths': where.get(sid, []), 'kind': 'sheet', 'blocks': blocks}
    out.append(rec)
    with open(os.path.join(WORK, 'md', f'S_{sid[:8]}.md'), 'w', encoding='utf-8') as f:
        f.write(f'<!-- id={sid} paths={rec["paths"]} -->\n' + to_md(title, blocks))

json.dump(out, open(os.path.join(WORK, 'docs.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('docs', len(out))

