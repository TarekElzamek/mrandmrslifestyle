"""Generates the Exercise Library: a hub page + one page per exercise that has a Mr & Mrs Lifestyle demo video.
Run from the repo root:  python3 _tools/exercises/build.py
Outputs: exercise-library.html, exercises/<slug>.html, and an EXERCISES block in sitemap.xml.
Content lives in content_a/b/c.py; videos come from tracker/videos.js; muscle groups from tracker/exercises.js.
"""
import json, os, re, sys, html, subprocess, importlib.util, datetime
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import content_a, content_b, content_c  # noqa: F401  (b and c register into content_a.X)
X = content_a.X

# Shared header/footer/CSS/fonts from the food-calories generator so every page matches the site
spec = importlib.util.spec_from_file_location('foodbuild', os.path.join(ROOT, '_tools', 'food', 'build.py'))
food = importlib.util.module_from_spec(spec); spec.loader.exec_module(food)

SITE = 'https://www.mrandmrslifestyle.com'
HUB = '/exercise-library.html'
UPLOAD_DATE = '2026-10-25'
WA_TAREK = '971507871515'

def esc(s): return html.escape(str(s), quote=True)
def write(p, s):
    full = os.path.join(ROOT, p); os.makedirs(os.path.dirname(full) or '.', exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)

def load_js(rel, var):
    out = subprocess.check_output(['node', '-e', f'global.window={{}};require({json.dumps(os.path.join(ROOT, rel))});console.log(JSON.stringify(window.{var}))'])
    return json.loads(out)

VIDS = load_js('tracker/videos.js', 'MM_VIDEOS')
EXS = {e[0]: e for e in load_js('tracker/exercises.js', 'MM_EXERCISES')}

def slugify(s):
    s = s.lower().replace('&', 'and').replace('°', '-degree')
    s = re.sub(r'\(.*?\)', '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

GROUP_OVERRIDE = {'Romanian Deadlift': 'Legs'}
GROUPS = ['Glutes', 'Legs', 'Back', 'Chest', 'Shoulders', 'Biceps', 'Triceps', 'Core']
GROUP_LABEL = {'Glutes': 'Glutes', 'Legs': 'Legs & Hamstrings', 'Back': 'Back', 'Chest': 'Chest', 'Shoulders': 'Shoulders', 'Biceps': 'Biceps', 'Triceps': 'Triceps', 'Core': 'Abs & Core'}

ITEMS = []
for name, d in X.items():
    d = dict(d); d['name'] = name; d['title'] = d.get('display', name)
    d['slug'] = d.get('slug') or slugify(d['title'])
    d['group'] = GROUP_OVERRIDE.get(name, EXS[name][1])
    d['vids'] = VIDS[name]
    coaches = [v[1].split(' ·')[0] for v in d['vids']]
    d['coaches'] = [c for i, c in enumerate(coaches) if c in ('Tarek', 'Chloe') and c not in coaches[:i]]
    ITEMS.append(d)
ITEMS.sort(key=lambda d: (GROUPS.index(d['group']), d['title']))
BY_NAME = {d['name']: d for d in ITEMS}
assert len({d['slug'] for d in ITEMS}) == len(ITEMS), 'duplicate slugs'

def url(d): return f'/exercises/{d["slug"]}.html'
def thumb(vid): return f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg'
def who(d):
    c = d['coaches']
    return ' & '.join(c) if c else 'our coaches'

REPS = {
 'compound': [('Build muscle', '3–4', '6–12', '90–120 s'), ('Get stronger', '3–5', '3–6', '2–3 min'), ('Fat loss &amp; toning', '3', '10–15', '60–90 s')],
 'iso':      [('Build muscle', '3–4', '10–15', '60–90 s'), ('Beginners', '2–3', '12–15', '60 s'), ('Fat loss &amp; toning', '2–3', '15–20', '45–60 s')],
 'bw':       [('Beginners', '3', 'As many good reps as you can, stopping 1–2 short of failure', '60–90 s'), ('Build muscle', '3–4', '8–15 (slow down or add weight)', '90 s'), ('Conditioning', '3', '30–45 seconds of work', '30–60 s')],
 'core':     [('Beginners', '2–3', '10–12', '45–60 s'), ('Stronger abs', '3', '12–20 (add weight when easy)', '60 s'), ('Fat loss &amp; toning', '3', '15–20 in a circuit', '30–45 s')],
}

CSS = '''
.ex-tools{grid-template-columns:1fr auto!important}
.ex-main{display:grid;grid-template-columns:1.45fr 1fr;gap:1.5rem;align-items:start}
.ex-vid{position:relative;border-radius:14px;overflow:hidden;background:#000;border:1px solid rgba(201,168,76,.25);aspect-ratio:16/9}
.ex-vid button.ex-play{position:absolute;inset:0;width:100%;height:100%;border:0;padding:0;cursor:pointer;background:#000}
.ex-vid img{width:100%;height:100%;object-fit:cover;display:block;opacity:.88}
.ex-vid .ex-pbtn{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:74px;height:74px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.ex-vid .ex-cap{position:absolute;left:12px;bottom:12px;background:rgba(0,0,0,.72);color:#fff;font-size:.78rem;font-weight:600;padding:.35rem .6rem;border-radius:6px}
.ex-vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.ex-tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}
.ex-tabs button{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.85);border-radius:999px;padding:.45rem .9rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit}
.ex-tabs button[aria-pressed="true"]{background:var(--gold);color:#0a0a0a;border-color:var(--gold)}
.ex-glance dl{display:grid;grid-template-columns:auto 1fr;gap:.7rem 1rem;font-size:.9rem;margin:0 0 1.3rem}
.ex-glance dt{color:var(--muted);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;font-weight:700;padding-top:.15rem}
.ex-glance dd{margin:0;line-height:1.5}
.ex-glance .fc-btn{width:100%}
.ex-ol{list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:.9rem}
.ex-ol li{counter-increment:s;display:grid;grid-template-columns:34px 1fr;gap:.8rem;line-height:1.6;color:rgba(255,255,255,.88);font-size:.95rem}
.ex-ol li:before{content:counter(s);width:30px;height:30px;border-radius:50%;background:rgba(201,168,76,.14);border:1px solid rgba(201,168,76,.5);color:var(--gold);font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.85rem}
.ex-ul{list-style:none;display:flex;flex-direction:column;gap:.8rem}
.ex-ul li{position:relative;padding-left:1.6rem;line-height:1.6;color:rgba(255,255,255,.86);font-size:.93rem}
.ex-ul.bad li:before{content:'✕';position:absolute;left:0;color:#e07a6b;font-weight:700}
.ex-ul.good li:before{content:'✓';position:absolute;left:0;color:var(--gold);font-weight:700}
.ex-reps{width:100%;border-collapse:collapse;font-size:.9rem}
.ex-reps th{text-align:left;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:0 .5rem .6rem 0}
.ex-reps td{padding:.7rem .5rem .7rem 0;border-top:1px solid rgba(255,255,255,.07);vertical-align:top}
.ex-reps td:first-child{font-weight:700;color:#fff}
.ex-reps td b{color:var(--gold)}
.ex-track{margin-top:1.5rem;display:grid;grid-template-columns:1.3fr 1fr;gap:1.5rem;align-items:center;border:1px solid rgba(201,168,76,.3);border-radius:14px;padding:1.75rem;background:#111}
.ex-track h2{font-family:var(--font-d);font-weight:400;font-size:1.6rem;line-height:1.2;margin:.5rem 0 .6rem}
.ex-track p{color:rgba(255,255,255,.8);font-size:.92rem;line-height:1.6}
.ex-track ul{list-style:none;display:grid;gap:.45rem;font-size:.85rem;color:rgba(255,255,255,.85)}
.ex-track li:before{content:'✓  ';color:var(--gold);font-weight:700}
.ex-rel{display:grid;grid-template-columns:repeat(4,1fr);gap:.9rem}
.ex-card{position:relative;background:var(--card);border:1px solid rgba(201,168,76,.16);border-radius:12px;overflow:hidden;text-decoration:none;display:flex;flex-direction:column;transition:border-color .2s,transform .2s}
.ex-card:hover{border-color:rgba(201,168,76,.55);transform:translateY(-2px)}
.ex-card .im{position:relative;aspect-ratio:16/9;background:#000;overflow:hidden}
.ex-card img{width:100%;height:100%;object-fit:cover;display:block;opacity:.85}
.ex-card .pl{position:absolute;right:8px;bottom:8px;width:30px;height:30px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center}
.ex-card .tx{padding:.85rem .95rem 1rem}
.ex-card b{display:block;font-family:var(--font-d);font-weight:400;font-size:1.12rem;line-height:1.2;color:#fff}
.ex-card span{display:block;font-size:.76rem;color:var(--muted);margin-top:.3rem}
.ex-group{margin-top:2.5rem}
.ex-group h2{font-family:var(--font-d);font-weight:400;font-size:1.7rem;margin-bottom:1rem;display:flex;align-items:baseline;gap:.6rem}
.ex-group h2 small{font-family:var(--font-b);font-size:.75rem;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
.ex-intro{max-width:780px;margin:3rem auto 0;color:rgba(255,255,255,.8);line-height:1.75;font-size:.95rem}
.ex-intro h2{font-family:var(--font-d);font-weight:400;font-size:1.6rem;margin:0 0 .8rem;color:#fff}
.ex-intro p+p{margin-top:.9rem}
@media(max-width:960px){.ex-main{grid-template-columns:1fr}.ex-rel{grid-template-columns:repeat(2,1fr)}.ex-track{grid-template-columns:1fr}}
@media(max-width:640px){.ex-tools{grid-template-columns:1fr!important}.ex-tools .fc-btn{justify-content:center}.ex-rel{grid-template-columns:1fr 1fr;gap:.6rem}.ex-card b{font-size:1rem}.ex-track{padding:1.35rem}.ex-vid .ex-pbtn{width:60px;height:60px}}
'''

PLAY_SVG = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="#0a0a0a"/></svg>'
PLAY_SM = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="#0a0a0a"/></svg>'

VIDEO_JS = '''<script>
(function(){var box=document.getElementById('exVid');if(!box)return;
function play(id,cap){box.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1&playsinline=1&loop=1&playlist='+id+'" title="'+cap.replace(/"/g,'&quot;')+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';if(window.gtag)gtag('event','exercise_video_play',{exercise:box.getAttribute('data-ex')});}
box.addEventListener('click',function(e){var b=e.target.closest('.ex-play');if(b)play(b.getAttribute('data-id'),b.getAttribute('data-cap'));});
document.querySelectorAll('[data-vtab]').forEach(function(t){t.addEventListener('click',function(){document.querySelectorAll('[data-vtab]').forEach(function(x){x.setAttribute('aria-pressed',x===t?'true':'false')});play(t.getAttribute('data-vtab'),t.getAttribute('data-cap'));});});
document.querySelectorAll('[data-trk]').forEach(function(a){a.addEventListener('click',function(){if(window.gtag)gtag('event','exercise_to_tracker',{exercise:a.getAttribute('data-trk')});});});
})();
</script>'''

def head(title, desc, path, ld, img):
    canon = SITE + path
    fonts = open(os.path.join(ROOT, '_tools/food/fonts_en.html'), encoding='utf-8').read().strip()
    lds = '\n'.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    header = food.EN_HEADER.replace('class="mm-drop-btn"', 'class="mm-drop-btn mm-active"').replace('<a href="/exercise-library.html">', '<a href="/exercise-library.html" class="mm-active">')
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1QXTWXK4LB"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-1QXTWXK4LB');</script>
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="index, follow, max-image-preview:large, max-video-preview:-1">
<link rel="canonical" href="{canon}">
<link rel="icon" type="image/png" href="/logo.png">
<link rel="preconnect" href="https://i.ytimg.com">
<meta property="og:type" content="website"><meta property="og:url" content="{canon}"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:image" content="{img}"><meta property="og:site_name" content="Mr &amp; Mrs Lifestyle"><meta property="og:locale" content="en_AE">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{img}">
{fonts}
<style>{food.CSS}{CSS}</style>
<link rel="stylesheet" href="/site.css">
{lds}
</head>
<body>
{header}<main id="main">
'''

def tail():
    return f'''</main>
{food.EN_FOOTER}<script src="/shared.js" defer></script>
<script src="/chat-widget.js" defer></script>
<script src="/track.js" defer></script>
</body>
</html>
'''

def cta(h):
    return f'''<div class="fc-cta">
    <h2>{h}</h2>
    <p>Good form is step one. A coach makes sure every session moves you forward: the right exercises, the right weights and a plan for your food.</p>
    <a class="fc-btn" href="/online-coaching.html">See Online Coaching</a><a class="fc-btn fc-ghost" href="/personal-trainer-dubai.html">Train In Person</a>
  </div>'''

def tracker_link(d): return '/workout-tracker.html?ex=' + quote(d['name']) + '&utm_source=exercise_library&utm_medium=referral&utm_campaign=' + d['slug']

def card(d):
    return (f'<a class="ex-card" href="{url(d)}"><div class="im"><img src="{thumb(d["vids"][0][0])}" alt="{esc(d["title"])} demo by {esc(who(d))}" loading="lazy" width="480" height="270">'
            f'<span class="pl" aria-hidden="true">{PLAY_SM}</span></div><div class="tx"><b>{esc(d["title"])}</b><span>{esc(", ".join(d["primary"]))}</span></div></a>')

def pt_box(d, h=None):
    msg = f"Hi Tarek! I found you through the {d['title']} page on your exercise library. I'd like a coach to check my form and help me train. Can you tell me about 1-to-1 personal training at Nogs Gym?"
    wa = f'https://wa.me/{WA_TAREK}?text=' + quote(msg)
    return f'''<section class="fc-pt" aria-label="Personal training">
    <div>
      <div class="fc-tag">1-to-1 Personal Training · Al Quoz, Dubai</div>
      <h2>{h or 'Want a coach to check your ' + esc(d['title']) + ' form?'}</h2>
      <p>Train 1-to-1 with Tarek at Nogs Gym, Al Quoz. He'll fix your technique on every lift, build your programme and log it all in this tracker for you. Men and women welcome. Prefer to train on your own schedule? Tarek coaches men and Chloe coaches women online.</p>
      <ul><li>From AED 275 per session</li><li>Free first consultation</li><li>Programme in your free tracker</li></ul>
    </div>
    <div class="fc-pt-act">
      <a class="fc-btn" href="{esc(wa)}" target="_blank" rel="noopener" onclick="if(window.gtag)gtag('event','pt_whatsapp_click',{{source:'exercise_{d['slug']}'}})">WhatsApp Tarek</a>
      <a class="fc-btn fc-ghost" href="/online-coaching.html">See online coaching</a>
    </div>
  </section>'''

def build_page(d):
    path = url(d)
    vid0, lab0 = d['vids'][0]
    title_h = d['title']
    page_title = f'{esc(title_h)}: How to Do It, Muscles Worked + Video'
    if len(title_h) > 30: page_title = f'{esc(title_h)}: Form, Muscles + Video'
    desc = (f'How to do {esc(title_h)} with good form: step-by-step guide, muscles worked, '
            f'common mistakes and sets &amp; reps, with a demo video by Dubai coach {esc(who(d))}. Log it free in our workout tracker.')
    faqs = list(d['faq']) + [(f'Can I track my {title_h.lower()} progress for free?',
                              f'Yes. Our free workout tracker has {title_h} with this demo video built in. Log your sets, reps and weight, see your personal records and follow your progress on a chart.')]
    vid_ld = {"@context": "https://schema.org", "@type": "VideoObject", "name": f'How to do {title_h} – {who(d)} | Mr & Mrs Lifestyle',
              "description": d['intro'], "thumbnailUrl": [thumb(v[0]) for v in d['vids'][:1]], "uploadDate": UPLOAD_DATE,
              "embedUrl": f'https://www.youtube.com/embed/{vid0}', "contentUrl": f'https://www.youtube.com/watch?v={vid0}',
              "publisher": {"@type": "Organization", "name": "Mr & Mrs Lifestyle", "logo": {"@type": "ImageObject", "url": SITE + '/logo.png'}}}
    ld = [vid_ld,
          {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]},
          food.crumbs_ld('en', [('Home', '/'), ('Exercise Library', HUB), (title_h, path)])]
    s = head(page_title, desc, path, ld, thumb(vid0))
    tabs = ''
    if len(d['vids']) > 1:
        tabs = '<div class="ex-tabs" role="group" aria-label="Choose demo video">' + ''.join(
            f'<button type="button" data-vtab="{esc(v)}" data-cap="{esc(title_h + " – " + l)}" aria-pressed="{"true" if i == 0 else "false"}">{esc(l)}</button>' for i, (v, l) in enumerate(d['vids'])) + '</div>'
    steps = ''.join(f'<li>{esc(x)}</li>' for x in d['steps'])
    mistakes = ''.join(f'<li>{esc(x)}</li>' for x in d['mistakes'])
    tips = ''.join(f'<li>{esc(x)}</li>' for x in d['tips'])
    reps = ''.join(f'<tr><td>{g}</td><td><b>{st}</b> sets</td><td><b>{r}</b> reps</td><td>{rest}</td></tr>' if d['rx'] in ('compound', 'iso') else
                   f'<tr><td>{g}</td><td><b>{st}</b> sets</td><td>{r}</td><td>{rest}</td></tr>' for g, st, r, rest in REPS[d['rx']])
    rel = ''.join(card(BY_NAME[a]) for a in d['alts'] if a in BY_NAME)
    sec = ', '.join(d['secondary']) if d['secondary'] else '–'
    trk = tracker_link(d)
    s += f'''
<div class="fc-hero" style="padding-bottom:2rem">
  <div class="fc-tag">Exercise Library · {esc(GROUP_LABEL[d['group']])}</div>
  <h1>How to Do <em>{esc(title_h)}</em></h1>
  <p class="fc-sub">{esc(d['intro'])}</p>
</div>
<div class="fc-wrap">
  <nav class="fp-crumb" aria-label="breadcrumb"><a href="/">Home</a> › <a href="{HUB}">Exercise Library</a> › {esc(title_h)}</nav>
  <div class="ex-main">
    <div>
      <div class="ex-vid" id="exVid" data-ex="{esc(d['name'])}">
        <button type="button" class="ex-play" data-id="{esc(vid0)}" data-cap="{esc(title_h + ' – ' + lab0)}" aria-label="Play {esc(title_h)} demo video">
          <img src="{thumb(vid0)}" alt="{esc(title_h)} demonstrated by {esc(who(d))} at the gym" width="480" height="360" fetchpriority="high">
          <span class="ex-pbtn" aria-hidden="true">{PLAY_SVG}</span>
          <span class="ex-cap">▶ Demo · {esc(lab0)}</span>
        </button>
      </div>
      {tabs}
    </div>
    <div class="fp-box ex-glance">
      <h2 class="fp-h">At a glance</h2>
      <dl>
        <dt>Main muscles</dt><dd>{esc(', '.join(d['primary']))}</dd>
        <dt>Also works</dt><dd>{esc(sec)}</dd>
        <dt>Equipment</dt><dd>{esc(d['equip'])}</dd>
        <dt>Level</dt><dd>{esc(d['level'])}</dd>
        <dt>Demo by</dt><dd>{esc(who(d))}, Mr &amp; Mrs Lifestyle coaches</dd>
      </dl>
      <a class="fc-btn" href="{trk}" data-trk="{esc(d['name'])}">Log {esc(title_h)} free</a>
      <div class="fc-small" style="margin-top:.6rem;text-align:center">Free workout tracker · sets, reps, PRs &amp; progress charts</div>
    </div>
  </div>
  <div class="fp-main fp-sec">
    <div class="fp-box">
      <h2 class="fp-h">How to do {esc(title_h)}</h2>
      <ol class="ex-ol">{steps}</ol>
    </div>
    <div class="fp-box">
      <h2 class="fp-h">Common mistakes</h2>
      <ul class="ex-ul bad">{mistakes}</ul>
      <h2 class="fp-h" style="margin-top:1.6rem">Coach's tips</h2>
      <ul class="ex-ul good">{tips}</ul>
    </div>
  </div>
  <div class="fp-box fp-sec">
    <h2 class="fp-h">Sets and reps for your goal</h2>
    <table class="ex-reps"><thead><tr><th scope="col">Goal</th><th scope="col">Sets</th><th scope="col">Reps</th><th scope="col">Rest</th></tr></thead><tbody>{reps}</tbody></table>
    <p class="fc-small" style="margin-top:.9rem">Pick a weight where the last 1–2 reps of each set are hard but your form stays the same. When you hit the top of the rep range on every set, add a little weight next time.</p>
  </div>
  {pt_box(d)}
  <section class="ex-track" aria-label="Free workout tracker">
    <div>
      <div class="fc-tag">Free Workout Tracker</div>
      <h2>Track your {esc(title_h)} progress, free</h2>
      <p>Our tracker remembers what you lifted last time, flags new personal records and charts your strength week by week. This demo video is built in, so you can check your form between sets.</p>
    </div>
    <div>
      <ul><li>200+ exercises, {sum(len(x['vids']) for x in ITEMS)} coach demo videos</li><li>Rest timer, PRs and progress charts</li><li>Works on iPhone and Android, no download</li></ul>
      <a class="fc-btn" href="{trk}" data-trk="{esc(d['name'])}" style="margin-top:1rem;width:100%">Start logging free</a>
    </div>
  </section>
  <div class="fp-box fp-sec fp-faq">
    <h2 class="fp-h">Questions we get asked</h2>
    {''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faqs)}
  </div>
  <div class="fp-sec" style="margin-top:3rem">
    <h2 class="fp-h">Similar exercises</h2>
    <div class="ex-rel">{rel}</div>
    <a class="fp-back" href="{HUB}">See all {len(ITEMS)} exercises with video →</a>
  </div>
  <p class="fc-note">Demonstrated by Mr &amp; Mrs Lifestyle coaches in Dubai. If you have an injury or pain, check with a doctor or physio before starting a new exercise.</p>
  {cta('Want results faster? Train with a coach.')}
</div>
{VIDEO_JS}
'''
    s += tail()
    write(path.lstrip('/'), s)

def build_hub():
    n = len(ITEMS); nv = sum(len(d['vids']) for d in ITEMS)
    title = f'Exercise Library: {n} Gym Exercises with Video Demos | Mr &amp; Mrs'
    desc = f'How to do {n} gym exercises with good form: glutes, legs, back, chest, shoulders, arms and abs. Free demo videos by Dubai coaches Tarek &amp; Chloe, plus a free workout tracker.'
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Mr & Mrs Lifestyle Exercise Library", "url": SITE + HUB, "description": html.unescape(desc),
           "mainEntity": {"@type": "ItemList", "numberOfItems": n, "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + url(d), "name": d['title']} for i, d in enumerate(ITEMS)]}},
          food.crumbs_ld('en', [('Home', '/'), ('Exercise Library', HUB)])]
    s = head(title, desc, HUB, ld, thumb(BY_NAME['Barbell Hip Thrust']['vids'][0][0]))
    chips = '<button class="fc-chip on" type="button" data-g="all">All</button>' + ''.join(f'<button class="fc-chip" type="button" data-g="{g}">{esc(GROUP_LABEL[g])}</button>' for g in GROUPS)
    groups = ''
    for g in GROUPS:
        items = [d for d in ITEMS if d['group'] == g]
        if not items: continue
        cards = ''.join(card(d).replace('<a class="ex-card"', f'<a class="ex-card" data-q="{esc((d["title"] + " " + d["name"] + " " + " ".join(d["primary"] + d["secondary"])).lower())}"', 1) for d in items)
        groups += f'<section class="ex-group" data-group="{g}"><h2>{esc(GROUP_LABEL[g])} <small>{len(items)} exercises</small></h2><div class="ex-rel">{cards}</div></section>'
    s += f'''
<div class="fc-hero">
  <div class="fc-tag">Free Tool · Exercise Library</div>
  <h1>How to Do Every Exercise, <em>Shown by Real Coaches</em></h1>
  <p class="fc-sub">{n} gym exercises with {nv} demo videos filmed by Tarek &amp; Chloe at the gym in Dubai. Learn the form, the muscles worked and the sets and reps for your goal, then log it free in our workout tracker.</p>
</div>
<div class="fc-wrap">
  <div class="fc-tools ex-tools">
    <label class="fc-search"><span class="sr">Search exercises</span>{food.SEARCH_ICON}<input id="exQ" type="search" placeholder="Search an exercise or muscle, e.g. hip thrust or glutes" autocomplete="off"></label>
    <a class="fc-btn" href="/workout-tracker.html?utm_source=exercise_library&amp;utm_medium=referral&amp;utm_campaign=hub" style="display:flex;align-items:center">Open free tracker</a>
  </div>
  <div class="fc-chips" role="group" aria-label="Filter by muscle">{chips}</div>
  <div id="exNone" class="fc-none">No exercise matches that. <a href="https://wa.me/{WA_TAREK}?text=Please%20add%20this%20exercise%20to%20your%20library%3A%20" style="color:var(--gold)">Ask us on WhatsApp</a> and we'll film it.</div>
  {groups}
  <section class="ex-track" aria-label="Free workout tracker" style="margin-top:3rem">
    <div>
      <div class="fc-tag">Free Workout Tracker</div>
      <h2>Every video here is built into our free tracker</h2>
      <p>Log your sets and reps, see what you lifted last time, set personal records and watch your progress on a chart. Free for everyone, no app to download.</p>
    </div>
    <div><ul><li>200+ exercises with how-to tips</li><li>Rest timer, PRs and progress charts</li><li>Body weight and InBody tracking</li></ul>
    <a class="fc-btn" href="/workout-tracker.html?utm_source=exercise_library&amp;utm_medium=referral&amp;utm_campaign=hub" style="margin-top:1rem;width:100%">Start tracking free</a></div>
  </section>
  <div class="ex-intro">
    <h2>About this exercise library</h2>
    <p>Every exercise here is demonstrated by Tarek or Chloe, the husband-and-wife coaching team behind Mr &amp; Mrs Lifestyle. Tarek coaches 1-to-1 personal training at Nogs Gym in Al Quoz, Dubai, and both coach clients online around the world.</p>
    <p>Each page explains how to do the exercise step by step, the muscles it works, the mistakes we see most often in the gym, and how many sets and reps to do for building muscle, getting stronger or losing fat.</p>
  </div>
  {pt_box({'title': 'exercise', 'slug': 'hub'}, 'Want a coach to check your form?')}
  {cta('Want a programme built for you?')}
</div>
<script>
(function(){{var q=document.getElementById('exQ'),g='all',none=document.getElementById('exNone');
function run(){{var t=q.value.trim().toLowerCase(),any=0;document.querySelectorAll('.ex-group').forEach(function(s){{var on=g==='all'||s.getAttribute('data-group')===g,vis=0;s.querySelectorAll('.ex-card').forEach(function(c){{var ok=on&&(!t||c.getAttribute('data-q').indexOf(t)>-1);c.style.display=ok?'':'none';if(ok)vis++;}});s.style.display=vis?'':'none';any+=vis;}});none.style.display=any?'none':'block';}}
q.addEventListener('input',run);document.querySelectorAll('.fc-chip').forEach(function(c){{c.addEventListener('click',function(){{document.querySelectorAll('.fc-chip').forEach(function(x){{x.classList.toggle('on',x===c)}});g=c.getAttribute('data-g');run();}});}});
var h=location.hash.slice(1);if(h){{var c=document.querySelector('.fc-chip[data-g="'+h+'"]');if(c)c.click();}}}})();
</script>
'''
    s += tail()
    write(HUB.lstrip('/'), s)

def update_sitemap():
    today = datetime.date.today().isoformat()
    p = os.path.join(ROOT, 'sitemap.xml'); sm = open(p, encoding='utf-8').read()
    sm = re.sub(r'\n  <!-- EXERCISES:START -->.*?<!-- EXERCISES:END -->', '', sm, flags=re.S)
    urls = [(HUB, '0.8')] + [(url(d), '0.6') for d in ITEMS]
    def entry(u, pr):
        vid = ''
        d = next((x for x in ITEMS if url(x) == u), None)
        if d:
            v = d['vids'][0][0]
            vid = (f'    <video:video>\n      <video:thumbnail_loc>{thumb(v)}</video:thumbnail_loc>\n      <video:title>{esc("How to do " + d["title"])}</video:title>\n'
                   f'      <video:description>{esc(d["intro"])}</video:description>\n      <video:player_loc>https://www.youtube.com/embed/{v}</video:player_loc>\n    </video:video>\n')
        return f'  <url>\n    <loc>{SITE}{u}</loc>\n    <lastmod>{today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>{pr}</priority>\n{vid}  </url>\n'
    block = '\n  <!-- EXERCISES:START -->\n' + ''.join(entry(u, pr) for u, pr in urls) + '  <!-- EXERCISES:END -->'
    sm = sm.replace('\n</urlset>', block + '\n</urlset>')
    if 'xmlns:video=' not in sm:
        sm = sm.replace('<urlset ', '<urlset xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" ', 1)
    open(p, 'w', encoding='utf-8').write(sm)

if __name__ == '__main__':
    build_hub()
    for d in ITEMS: build_page(d)
    update_sitemap()
    print(f'Built hub + {len(ITEMS)} exercise pages; sitemap updated')
