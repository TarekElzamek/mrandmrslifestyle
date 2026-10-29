# Builds ar/female-personal-trainer-dubai.html from the English page + tr.py.  Run from repo root.
import re, json, sys, urllib.parse
sys.path.insert(0, '_tools/ar_home')
from tr import BLOCKS, LEFT, RAW, JS

SRC = 'index.html'
OUT = 'ar/index.html'
EN_URL = 'https://www.mrandmrslifestyle.com/'
AR_URL = 'https://www.mrandmrslifestyle.com/ar/'

s = open(SRC, encoding='utf-8').read()
i = s.index('<body')
head, body = s[:i], s[i:]
for a, c in RAW:
    assert body.count(a) == 1, a[:60]
    body = body.replace(a, c)

# ---------- body ----------
prot = []
def keep(m): prot.append(m.group(0)); return '\x00%d\x00' % (len(prot) - 1)
b = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>', keep, body, flags=re.S)
B = 'p|li|h1|h2|h3|h4|summary|figcaption|td|th|label|button|blockquote|cite|small|dt|dd'
order = []
for m in re.finditer(r'<(%s)\b([^>]*)>(.*?)</\1>' % B, b, re.S):
    inner = m.group(3)
    if re.search(r'<(%s)\b' % B, inner): continue
    if re.search('[A-Za-z]', re.sub(r'<[^>]+>|\x00\d+\x00', '', inner)): order.append(inner.strip())
uniq = list(dict.fromkeys(order))
assert len(uniq) == len(BLOCKS), (len(uniq), len(BLOCKS))
TR = {}
for en, ar in zip(uniq, BLOCKS):
    if ar is None: continue
    anchors = re.findall(r'<a\b[^>]*>', en)
    out = ar
    for k, a in enumerate(anchors): out = out.replace('{a%d}' % k, a)
    assert '{a' not in out, (en[:60], out[:80])
    assert out.count('<a ') == en.count('<a '), ('anchor count', en[:80])
    TR[en] = out
def sub_block(m):
    inner = m.group(3)
    if re.search(r'<(%s)\b' % B, inner): return m.group(0)
    k = inner.strip()
    if k in TR: return '<%s%s>%s</%s>' % (m.group(1), m.group(2), inner.replace(k, TR[k]), m.group(1))
    return m.group(0)
# repeat because nested block parents are skipped on the first pass only for their own inner
b = re.sub(r'<(%s)\b([^>]*)>(.*?)</\1>' % B, sub_block, b, flags=re.S)

def sub_text(m):
    t = m.group(1); k = t.strip()
    if k in LEFT: return t.replace(k, LEFT[k])
    return t
b = re.sub(r'(?<=[>\x00])([^<>\x00]+)(?=[<\x00])', sub_text, b)
def sub_attr(m):
    v = m.group(2)
    return '%s="%s"' % (m.group(1), LEFT.get(v, v))
b = re.sub(r'\b(alt|aria-label|placeholder|title)="([^"]*)"', sub_attr, b)

for k, v in enumerate(prot): b = b.replace('\x00%d\x00' % k, v, 1)
for a, c in JS:
    assert b.count(a) == 1, a[:60]
    b = b.replace(a, c)
b = b.replace(' Get Directions<', ' الاتجاهات<').replace('>Get Directions<', '>الاتجاهات<')

# internal links -> Arabic versions where they exist
for p in ['personal-trainer-dubai.html', 'online-coaching.html', 'personal-trainer-cost-calculator.html', 'dubai-food-calories.html', 'female-personal-trainer-dubai.html', 'calculator.html']:
    b = b.replace('href="https://www.mrandmrslifestyle.com/%s' % p, 'href="/ar/%s' % p).replace('href="/%s' % p, 'href="/ar/%s' % p)
b = b.replace('href="https://www.mrandmrslifestyle.com/"', 'href="/ar/"').replace('href="/"', 'href="/ar/"')

b = b.replace('<a href="/ar/" lang="ar">English</a>', '<a href="/" lang="en" hreflang="en">English</a>')
b = b.replace('<a href="/ar/" hreflang="ar" lang="ar">العربية</a>', '<a href="/" hreflang="en" lang="en">English</a>')
# WhatsApp pre-filled messages in Arabic
CH = urllib.parse.quote('مرحباً كلوي، رأيت موقع Mr & Mrs Lifestyle وأرغب بالتدرّب معك.')
TA = urllib.parse.quote('مرحباً طارق، رأيت موقع Mr & Mrs Lifestyle وأرغب بالتدرّب معك.')
b = re.sub(r'wa\.me/971547011995\?text=[^"\']*', 'wa.me/971547011995?text=' + CH, b)
b = re.sub(r'wa\.me/971507871515\?text=[^"\']*', 'wa.me/971507871515?text=' + TA, b)

# leftover English check
chk = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>', '', b, flags=re.S)
left = [t.strip() for t in re.findall(r'>([^<>]+)<', chk) if re.search('[A-Za-z]{3}', t)]

# ---------- head ----------
h = head
h = h.replace('<html lang="en"', '<html lang="ar" dir="rtl"', 1)
TITLE = 'مدرب شخصي في دبي وتدريب أونلاين | Mr & Mrs Lifestyle'
DESC = 'تدريب شخصي فردي مع طارق في القوز، وبيلاتس ريفورمر خاص للسيدات مع كلوي في ميدان، وتدريب أونلاين حول العالم. خطط تمرين وتغذية ومتابعة على واتساب. احجز مكالمة مجانية.'
h = re.sub(r'<title>.*?</title>', '<title>%s</title>' % TITLE, h, flags=re.S)
h = re.sub(r'(<meta name="description" content=")[^"]*', r'\g<1>' + DESC, h)
h = re.sub(r'(<meta property="og:title" content=")[^"]*', r'\g<1>' + TITLE, h)
h = re.sub(r'(<meta property="og:description" content=")[^"]*', r'\g<1>' + DESC, h)
h = re.sub(r'(<meta name="twitter:title" content=")[^"]*', r'\g<1>' + TITLE, h)
h = re.sub(r'(<meta name="twitter:description" content=")[^"]*', r'\g<1>' + DESC, h)
h = re.sub(r'(<meta property="og:url" content=")[^"]*', r'\g<1>' + AR_URL, h)
h = re.sub(r'(<meta property="og:locale" content=")[^"]*', r'\g<1>ar_AE', h)
h = re.sub(r'(<link rel="canonical" href=")[^"]*', r'\g<1>' + AR_URL, h)

# JSON-LD: FAQ from the Arabic page, Arabic breadcrumb, Arabic descriptions
def strip(x): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', x)).replace('&amp;', '&').strip()
faqs = re.findall(r'<div class="faq-q"[^>]*>(.*?)<span class="faq-toggle">.*?</span></div><div class="faq-a">(.*?)</div>', b, re.S)
def fix_ld(m):
    raw = m.group(1)
    try: d = json.loads(raw)
    except Exception: return m.group(0)
    def walk(o):
        if isinstance(o, dict):
            t = o.get('@type')
            if t == 'FAQPage':
                o['mainEntity'] = [{'@type': 'Question', 'name': strip(q), 'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)}} for q, a in faqs]
                return
            if t == 'BreadcrumbList':
                names = ['الرئيسية']
                urls = [AR_URL]
                for k, li in enumerate(o.get('itemListElement', [])):
                    if k < 1: li['name'] = names[k]; li['item'] = urls[k]
                return
            if t == 'Service' and 'description' in o:
                o['description'] = 'بيلاتس ريفورمر خاص للسيدات فقط في ميدان، دبي مع المدربة كلوي أنطونيازي: جلسات فردية أو مع صديقة مع تمارين القوة على جهاز Speediance Gym Monster 3S، وجلسات معدّلة لما قبل الولادة وبعدها، وتدريب أونلاين للسيدات.'
                o['inLanguage'] = 'ar'
            elif 'description' in o and isinstance(o['description'], str) and re.search('[A-Za-z]{4}', o['description']) and t in ('ExerciseGym', 'SportsActivityLocation', 'LocalBusiness', 'HealthClub'):
                o['description'] = 'استوديو بوتيك للسيدات فقط في ميدان، دبي يقدّم جلسات بيلاتس ريفورمر خاصة فردية أو مع صديقة (2 إلى 1) مع كلوي أنطونيازي، مع تمارين القوة. الأطفال مرحّب بهم.'
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(d)
    return '<script type="application/ld+json">%s</script>' % json.dumps(d, ensure_ascii=False)
h = re.sub(r'<script type="application/ld\+json">(.*?)</script>', fix_ld, h, flags=re.S)

# Arabic font + RTL fixes
TAJ = ''.join("@font-face{font-family:'Tajawal';font-style:normal;font-display:swap;font-weight:%d;src:url(/fonts/tajawal-arabic-%d-normal.woff2) format('woff2'),url(/fonts/tajawal-latin-%d-normal.woff2) format('woff2')}" % (w, w, w) for w in (300, 400, 500, 700))
RTL = '''<link rel="preload" href="/fonts/tajawal-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<style id="home-ar">''' + TAJ + '''
html[dir=rtl] body,html[dir=rtl] body *:not(svg):not(path):not(.rv-stars){font-family:'Tajawal','DM Sans',sans-serif!important;letter-spacing:0!important}
html[dir=rtl] .hero-title,html[dir=rtl] .section-title,html[dir=rtl] h2,html[dir=rtl] h3{font-weight:800!important;font-style:normal!important}
html[dir=rtl] .hero-title em,html[dir=rtl] .section-title em,html[dir=rtl] h2 em{font-style:normal!important}
html[dir=rtl] .hero-title{line-height:1.2!important}
html[dir=rtl] p,html[dir=rtl] li{line-height:1.9}
html[dir=rtl] .mm-links a,html[dir=rtl] .hero-eyebrow,html[dir=rtl] .stat-label,html[dir=rtl] .section-label,html[dir=rtl] .btn-primary,html[dir=rtl] .btn-ghost{text-transform:none!important}
html[dir=rtl] ul,html[dir=rtl] ol{padding-right:1.2em;padding-left:0}
html[dir=rtl] .faq-q{text-align:right}
html[dir=rtl] [dir=ltr]{direction:ltr}
</style>
'''
h = h.replace('</head>', RTL + '</head>', 1) if '</head>' in h else h
out = h + b
if '</head>' not in h: out = out.replace('</head>', RTL + '</head>', 1)
# make relative file paths work from /ar/
out = re.sub(r'\b(src|href|srcset|poster)="(?!(?:https?:|/|#|tel:|mailto:|data:|javascript:))([^"]+)"', r'\1="/\2"', out)
out = re.sub(r"url\((['\"]?)(?!(?:https?:|/|data:))([^)'\"]+)\1\)", r"url(\1/\2\1)", out)
open(OUT, 'w', encoding='utf-8').write(out)
print('written', OUT, len(out), 'faqs', len(faqs))
print('leftover english:', len(left))
for x in left: print('  -', x[:120])
