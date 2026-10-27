# Site-wide SEO / indexing audit. Run from repo root: python3 _tools/seo_audit.py
import os, re, json, collections, urllib.parse
from html import unescape

BASE = 'https://www.mrandmrslifestyle.com'
ROOT = '.'
SKIP = ('./_tools', './node_modules', './.git', './tracker', './_pilatesroom-site', './.github')
pages = {}
for d, _, fs in os.walk(ROOT):
    if d.startswith(SKIP): continue
    for f in fs:
        if f.endswith('.html'):
            p = os.path.join(d, f)[2:]
            pages[p] = open(p, encoding='utf-8', errors='replace').read()

vj = json.load(open('vercel.json'))
redirects = {r['source']: r['destination'] for r in vj.get('redirects', [])}
clean = vj.get('cleanUrls', False)

def url_of(p):
    if p == 'index.html': return BASE + '/'
    if p.endswith('/index.html'): return BASE + '/' + p[:-10]
    return BASE + '/' + p

sm = open('sitemap.xml', encoding='utf-8').read()
sm_urls = re.findall(r'<loc>(.*?)</loc>', sm)
issues = collections.defaultdict(list)
def add(kind, p, msg=''): issues[kind].append((p, msg))

def resolve(href, frm):
    href = unescape(href).split('#')[0].split('?')[0]
    if not href: return None
    if href.startswith(BASE): href = href[len(BASE):] or '/'
    if re.match(r'^(https?:|mailto:|tel:|javascript:|data:|//)', href): return None
    if not href.startswith('/'):
        href = '/' + os.path.normpath(os.path.join(os.path.dirname(frm), href)).lstrip('./')
    return href

def exists(path):
    if path in redirects: return 'redirect'
    q = path.lstrip('/')
    if q == '' : return os.path.exists('index.html')
    if q.endswith('/'): return os.path.exists(q + 'index.html')
    if os.path.exists(q): return True
    if os.path.exists(q + '.html') and clean: return True
    if os.path.isdir(q) and os.path.exists(q + '/index.html'): return True
    return False

titles = collections.defaultdict(list); descs = collections.defaultdict(list)
noindex = set()
for p, s in pages.items():
    head = s.split('</head>')[0]
    if re.search(r'<meta[^>]+name="robots"[^>]+noindex', head, re.I): noindex.add(p)
    t = re.search(r'<title>(.*?)</title>', head, re.S)
    if not t: add('missing title', p)
    else:
        tt = unescape(t.group(1).strip()); titles[tt].append(p)
        if len(tt) > 65: add('long title (>65)', p, '%d: %s' % (len(tt), tt[:80]))
        if len(tt) < 20: add('short title', p, tt)
    m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', head)
    if not m: add('missing description', p)
    else:
        dd = unescape(m.group(1)); descs[dd].append(p)
        if len(dd) > 165: add('long description (>165)', p, str(len(dd)))
        if len(dd) < 70: add('short description', p, str(len(dd)))
    c = re.search(r'<link\s+rel="canonical"\s+href="([^"]*)"', head)
    if not c: add('missing canonical', p)
    elif p not in noindex and c.group(1) != url_of(p): add('canonical mismatch', p, c.group(1))
    if '<html lang=' not in s[:300]: add('missing html lang', p)
    if not re.search(r'name="viewport"', head): add('missing viewport', p)
    if not re.search(r'property="og:title"', head): add('missing og:title', p)
    if not re.search(r'property="og:image"', head): add('missing og:image', p)
    h1 = re.findall(r'<h1\b', s)
    if len(h1) == 0: add('no h1', p)
    if len(h1) > 1: add('multiple h1', p, str(len(h1)))
    for j in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try: json.loads(j)
        except Exception as e: add('invalid JSON-LD', p, str(e)[:80])
    for img in re.findall(r'<img\b[^>]*>', s):
        if 'alt=' not in img: add('img without alt', p, img[:80])
    # hreflang reciprocity
    for lang, href in re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"', head):
        tgt = href.replace(BASE, '').lstrip('/') or 'index.html'
        if tgt.endswith('/'): tgt += 'index.html'
        if tgt not in pages: add('hreflang to missing page', p, href)
        elif url_of(p) not in pages[tgt]: add('hreflang not reciprocal', p, href)
    # internal links
    body = re.sub(r'<script.*?</script>', '', s, flags=re.S)
    for href in set(re.findall(r'(?<![-\w])(?:href|src)="([^"]+)"', body)):
        r = resolve(href, p)
        if r is None: continue
        e = exists(r)
        if e is False: add('broken internal link', p, href)
        elif e == 'redirect' and not r.startswith('/exercises/'): add('link via redirect', p, href + ' -> ' + redirects[r])

for t, ps in titles.items():
    if len(ps) > 1: add('duplicate title', ps[0], '%d pages: %s' % (len(ps), ', '.join(ps[:4])))
for d, ps in descs.items():
    if len(ps) > 1: add('duplicate description', ps[0], '%d pages: %s' % (len(ps), ', '.join(ps[:4])))

# sitemap
page_urls = {url_of(p): p for p in pages}
for u in sm_urls:
    if u not in page_urls: add('sitemap URL not a page', u)
    elif page_urls[u] in noindex: add('sitemap URL is noindex', u)
    elif u.replace(BASE, '') in redirects: add('sitemap URL redirects', u)
for u, p in page_urls.items():
    if p in noindex: continue
    if u not in sm_urls and not p.startswith(('404', 'tracker')): add('indexable page missing from sitemap', p)
if len(sm_urls) != len(set(sm_urls)): add('sitemap duplicates', 'sitemap.xml', str(len(sm_urls) - len(set(sm_urls))))
# redirects to missing targets / chains
for a, b in redirects.items():
    bb = b.replace(BASE, '')
    if bb in redirects: add('redirect chain', a, b + ' -> ' + redirects[bb])
    elif not exists(bb.split('#')[0].split('?')[0]) and not bb.startswith('http'): add('redirect to missing page', a, b)

print('pages', len(pages), 'sitemap', len(sm_urls), 'noindex', len(noindex), 'redirects', len(redirects))
for k in sorted(issues):
    v = issues[k]
    print('\n## %s (%d)' % (k, len(v)))
    for p, m in v[:12]: print('  ', p, '|', m)
