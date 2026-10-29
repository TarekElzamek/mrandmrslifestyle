# Builds the "How to get abs" guide in English and Arabic,
# using blog-how-to-lose-fat-dubai.html (Tarek's fat-loss guide) as the layout template.
# Run from repo root:  python3 _tools/blog_abs/build.py
import os, re, sys, json
from urllib.parse import quote
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, '_tools', 'food'))
import build as fb  # Arabic header/footer/CSS shared with the Arabic calorie pages
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

SITE = 'https://www.mrandmrslifestyle.com'
SLUG = 'blog-how-to-get-abs.html'
TPL = open('blog-how-to-lose-fat-dubai.html', encoding='utf-8').read()
IMG = 'tarek-abs-before-after.jpg'

from content import C

AR_CSS = '''
body{font-family:'Tajawal','DM Sans',sans-serif}
.hero-title,.article-wrap h2,.article-wrap h3,.cta-box h3,.mm-related h2{font-family:'Tajawal',sans-serif!important;font-weight:800!important;letter-spacing:0!important}
.hero-title em,.cta-box h3 em{font-style:normal}
.hero-category{letter-spacing:0!important}
.article-wrap{text-align:right}
.article-wrap ul{padding-right:1.2rem;padding-left:0}
.tip-box{border-left:0!important;border-right:3px solid #C9A84C!important}
.mm-related a span{display:inline-block;transform:scaleX(-1)}
'''

def page(lang):
    c = C[lang]; ar = lang == 'ar'
    s = TPL
    # ---- head ----
    s = re.sub(r'<title>[^<]*</title>', '<title>%s</title>' % c['title'], s, count=1)
    for k in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        s = re.sub(r'(<meta %s content=")[^"]*' % re.escape(k), lambda m: m.group(1) + c['desc'], s)
    for k in ('property="og:title"', 'name="twitter:title"'):
        s = re.sub(r'(<meta %s content=")[^"]*' % re.escape(k), lambda m: m.group(1) + c['title'], s)
    s = s.replace(f'{SITE}/blog-how-to-lose-fat-dubai.html', c['url'])
    s = s.replace(f'{SITE}/blog-fat-loss-dubai.jpg', f'{SITE}/{IMG}')
    s = re.sub(r'(<meta name="keywords" content=")[^"]*', lambda m: m.group(1) + c['keywords'], s)
    s = re.sub(r'(<meta (?:property|name)="(?:og|twitter):image:alt" content=")[^"]*', lambda m: m.group(1) + c['img_alt'], s)
    s = s.replace('<meta property="og:image:width" content="1200">', '<meta property="og:image:width" content="1170">').replace('<meta property="og:image:height" content="960">', '<meta property="og:image:height" content="1171">')
    head_end = s.index('</head>')
    head = s[:head_end]
    head = re.sub(r'<link rel="alternate" hreflang[^>]*>\s*', '', head)
    canon = re.search(r'<link rel="canonical"[^>]*>', head).group(0)
    en_url, ar_url = (c['url'], c['alt']) if not ar else (c['alt'], c['url'])
    head = head.replace(canon, canon + f'\n<link rel="alternate" hreflang="en" href="{en_url}">\n<link rel="alternate" hreflang="ar" href="{ar_url}">\n<link rel="alternate" hreflang="x-default" href="{en_url}">')
    if ar:
        head = head.replace('<meta property="og:locale" content="en_AE">', '<meta property="og:locale" content="ar_AE">')
        head += fb.read('_tools/food/fonts_ar.html').strip() + '\n<style>' + fb.CSS_AR + AR_CSS + '</style>\n'
    # JSON-LD: replace BlogPosting, Breadcrumb and FAQ; keep the LocalBusiness block
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": lang,
              "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in c['faq']]}
    post_ld = {"@context": "https://schema.org", "@type": "BlogPosting", "inLanguage": lang, "headline": c['title'], "image": f'{SITE}/{IMG}',
               "description": c['desc'], "datePublished": "2026-10-29", "dateModified": "2026-10-29", "mainEntityOfPage": c['url'],
               "author": {"@type": "Person", "name": "Tarek Elzamek", "url": f"{SITE}/tarek-elzamek.html"},
               "publisher": {"@id": f"{SITE}/#business"}}
    crumb_ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": c['home'], "item": SITE + ('/ar/' if ar else '/')},
        {"@type": "ListItem", "position": 2, "name": c['blog'], "item": f"{SITE}/blog.html"},
        {"@type": "ListItem", "position": 3, "name": c['crumb'], "item": c['url']}]}
    blocks = re.findall(r'<script type="application/ld\+json">.*?</script>', head, re.S)
    for b in blocks:
        if '"LocalBusiness"' in b: continue
        head = head.replace(b, '')
    lds = ''.join('<script type="application/ld+json">%s</script>\n' % json.dumps(x, ensure_ascii=False) for x in (post_ld, crumb_ld, faq_ld))
    head += lds
    s = head + s[head_end:]
    if ar:
        s = s.replace('<html lang="en">', '<html lang="ar" dir="rtl">', 1)
        i = s.index('<header class="mm-header'); j = s.index('<main id="main">')
        s = s[:i] + fb.AR_HEADER + s[j:]
        i = s.index('<div class="mm-footer"'); j = s.index('<script', i)
        s = s[:i] + fb.AR_FOOTER + s[j:]
        s = s.replace('<script src="/chat-widget.js" defer></script>', '').replace('<script src="chat-widget.js" defer></script>', '')
    # ---- hero ----
    hero = f'''<div class="hero">
  <img src="/{IMG}" alt="{c['img_alt']}" width="1170" height="1171" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%;" fetchpriority="high">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-category">{c['cat']}</div>
    <h1 class="hero-title">{c['h1']}</h1>
    <div class="hero-meta">{c['meta']}</div>
  </div>
</div>'''
    s = re.sub(r'<div class="hero">.*?\n</div>\n', lambda m: hero + '\n', s, count=1, flags=re.S)
    # ---- article ----
    faq_html = '\n'.join(f'<h3>{q}</h3>\n<p>{a}</p>' for q, a in c['faq'])
    rel = ''.join(f'<li><a href="{h}">{t} <span>→</span></a></li>' for h, t in c['related'])
    wa = 'https://wa.me/971507871515?text=' + quote(c['wa'])
    author = ('<div class="author-box"><div class="author-avatar">T</div><div><div class="author-name"><a href="/tarek-elzamek.html" style="color:#fff">Tarek Elzamek</a></div><div class="author-role">Head Coach · Mr &amp; Mrs Lifestyle · Nogs Gym, Al Quoz</div><div class="author-bio">REPs UAE registered coach with more than 10 years of experience, and a finalist for Personal Trainer of the Year at the REPs UAE Industry Awards 2024.</div></div></div>'
              if not ar else
              '<div class="author-box"><div class="author-avatar">T</div><div><div class="author-name"><a href="/tarek-elzamek.html" style="color:#fff">طارق الزامك</a></div><div class="author-role">المدرب الرئيسي · Mr &amp; Mrs Lifestyle · نوقز جيم، القوز</div><div class="author-bio">مدرب مسجّل في REPs الإمارات بخبرة تزيد على 10 سنوات، ووصل إلى نهائيات جائزة أفضل مدرب شخصي في جوائز REPs الإمارات 2024.</div></div></div>')
    art = f'''<div class="article-wrap">
  <a class="back-link" href="{c['back_href']}">{c['back']}</a>
{c['body'].replace('{faq}', faq_html)}
  <div class="mm-related" role="navigation" aria-label="{c['related_h']}">
    <h2>{c['related_h']}</h2>
    <ul>{rel}</ul>
  </div>
  <div class="cta-box">
    <h3>{c['cta_h']}</h3>
    <p>{c['cta_p']}</p>
    <a class="cta-btn" href="{wa}" target="_blank" rel="noopener">{c['cta_btn']}</a>
  </div>
  {author}
</div>
'''
    i = s.index('<div class="article-wrap">'); j = s.index('</main>')
    s = s[:i] + art + '\n' + s[j:]
    out = ('ar/' if ar else '') + SLUG
    open(out, 'w', encoding='utf-8').write(s)
    print('written', out, len(c['title']), len(c['desc']))

for lang in ('en', 'ar'):
    page(lang)
