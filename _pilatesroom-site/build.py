"""Builds The Pilates Room by Chloe static site.  Run:  python3 build.py
Edit CONFIG / PRICES / text below, rebuild, deploy (Vercel: cleanUrls)."""
import json, os, html, datetime
ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = 'https://thepilatesroombychloe.com'

CONFIG = dict(
    whatsapp='971547011995', phone='+971 54 701 1995', email='info@thepilatesroombychloe.com',
    instagram='thepilatesroombychloe',
    address1='Meydan Avenue A, Shop 3', address2='Nad Al Sheba 1, Dubai',
    maps='https://www.google.com/maps/place/API+Meydan+Avenue+-+A/@25.1547408,55.2953666,17z',
    lat=25.1547408, lng=55.2953666,
    hours='Monday to Sunday', hours2='6:00 am to 8:00 pm',
    ga_id='',            # e.g. 'G-XXXXXXX' — leave empty until you create a Google Analytics property
    formspree='',        # optional: a Formspree form ID to also receive booking requests by email
    offer_ends='2026-10-31T23:59:59+04:00',
)

# Prices (AED). 'offer' = launch price shown until CONFIG.offer_ends
PRICES = {
 'private': dict(name='Private Reformer', short='1:1', sub='Fifty minutes, one client, one coach.', per_person=False, opts=[
     dict(id='1', label='Single session', price=429),
     dict(id='5', label='5 sessions', price=2145),
     dict(id='10', label='10 sessions', price=4075, badge='Most popular · save 5%', offer=3700),
     dict(id='20', label='20 sessions', price=7290, badge='Best value · save 15%', offer=6600)]),
 'buddy': dict(name='Buddy Reformer', short='2:1', sub='Fifty minutes, shared with one person you choose. One person books and pays; split the cost privately between you.', per_person=True, opts=[
     dict(id='1', label='Single session', price=498),
     dict(id='5', label='5 sessions', price=2490),
     dict(id='10', label='10 sessions', price=4730, badge='Most popular · save 5%', offer=4300),
     dict(id='20', label='20 sessions', price=8470, badge='Best value · save 15%', offer=7700)]),
}
# Optional Stripe payment links per option, e.g. STRIPE['private-10'] = 'https://buy.stripe.com/...'
STRIPE = {}

def esc(s): return html.escape(str(s), quote=True)
def aed(n): return f'AED {n:,}'
WA = f"https://wa.me/{CONFIG['whatsapp']}"

# ---------------------------------------------------------------- artwork (line drawings in brand colours)
def svg_reformer(stroke='#795033'):
    return f'''<svg class="art" viewBox="0 0 400 170" fill="none" stroke="{stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<path d="M20 112h360"/><path d="M28 112v34M372 112v34M120 112v20M280 112v20"/><path d="M20 146h22M358 146h22"/>
<rect x="150" y="88" width="120" height="16" rx="3"/><path d="M168 88v-14h14v14M238 88v-14h14v14"/>
<path d="M270 96h36"/><path d="M306 96c6-2 8-6 8-12"/>
<path d="M58 112V58M58 58h-22M58 58h22"/><path d="M44 58c0-10 28-10 28 0"/>
<path d="M84 104l10-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8" opacity=".8"/>
<path d="M340 112V70M326 70h28"/><circle cx="340" cy="62" r="6"/>
</svg>'''

def svg_ring(stroke='#795033'):
    return f'''<svg class="art" viewBox="0 0 400 220" fill="none" stroke="{stroke}" stroke-width="2" stroke-linecap="round" aria-hidden="true">
<ellipse cx="150" cy="120" rx="78" ry="82"/><ellipse cx="150" cy="120" rx="68" ry="72" opacity=".5"/>
<rect x="132" y="30" width="36" height="16" rx="6"/><rect x="132" y="194" width="36" height="16" rx="6"/>
<circle cx="292" cy="150" r="58"/><path d="M240 140c30 12 72 12 104 0" opacity=".6"/><path d="M250 118c26 9 58 9 84 0" opacity=".35"/>
</svg>'''

def svg_two(stroke='#795033'):
    return f'''<svg class="art" viewBox="0 0 400 170" fill="none" stroke="{stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<g><path d="M14 80h180M20 80v26M188 80v26"/><rect x="74" y="62" width="70" height="12" rx="3"/><path d="M40 80V44M30 44h20"/><path d="M144 68h22"/></g>
<g><path d="M206 132h180M212 132v26M380 132v26"/><rect x="266" y="114" width="70" height="12" rx="3"/><path d="M232 132V96M222 96h20"/><path d="M336 120h22"/></g>
</svg>'''

def svg_mat(stroke='#795033'):
    return f'''<svg class="art" viewBox="0 0 400 170" fill="none" stroke="{stroke}" stroke-width="2" stroke-linecap="round" aria-hidden="true">
<path d="M30 140h250"/><path d="M30 140c0-16 12-26 26-26h224"/><circle cx="292" cy="114" r="26"/><circle cx="292" cy="114" r="14" opacity=".6"/><circle cx="292" cy="114" r="4"/>
<circle cx="352" cy="128" r="22"/><path d="M332 122c14 6 26 6 40 0" opacity=".6"/>
</svg>'''

def arch(art='', tone='', tag='', small=False):
    cls = 'arch' + (' small' if small else '') + (f' {tone}' if tone else '')
    t = f'<div class="tag">{tag}</div>' if tag else ''
    return f'<div class="{cls}" role="img" aria-label="The Pilates Room">{t}{art}</div>'

LOGO = '''<svg viewBox="0 0 60 88" fill="none" aria-hidden="true"><rect x="2" y="2" width="56" height="84" rx="28" stroke="#8B6E54" stroke-width="2"/><path d="M20 26h22M27 26v40" stroke="#3A2617" stroke-width="1.8" stroke-linecap="round"/><path d="M34 26c-8 0-10 8-4 12 7 5 12 9 9 16-2 5-6 6-6 6" stroke="#3A2617" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>'''
WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/></svg>'

NAV = [('/', 'Home'), ('/sessions', 'Sessions'), ('/pricing', 'Pricing'), ('/appointments', 'Appointments'), ('/about', 'About Chloe'), ('/contact', 'Contact')]
SEO_PAGES = [('/private-reformer-pilates-dubai', 'Private Reformer Pilates Dubai'), ('/pilates-meydan', 'Pilates in Meydan'),
             ('/ladies-only-pilates-dubai', 'Ladies-only Pilates'), ('/private-pilates-dubai', '1-to-1 Pilates'),
             ('/pre-post-natal-pilates-dubai', 'Pre & Post Natal Pilates')]

def business_ld():
    return {"@context": "https://schema.org", "@type": ["ExerciseGym", "LocalBusiness"], "@id": SITE + "/#studio",
            "name": "The Pilates Room by Chloe", "url": SITE + "/", "image": SITE + "/assets/og.jpg", "logo": SITE + "/assets/logo-mark.jpg",
            "description": "Private, ladies-only Reformer Pilates studio in Meydan, Dubai. Private 1:1 and Buddy 2:1 sessions with Chloe.",
            "telephone": CONFIG['phone'].replace(' ', ''), "email": CONFIG['email'], "priceRange": "AED 249–429 per session",
            "address": {"@type": "PostalAddress", "streetAddress": CONFIG['address1'], "addressLocality": "Nad Al Sheba 1, Dubai", "addressRegion": "Dubai", "addressCountry": "AE"},
            "geo": {"@type": "GeoCoordinates", "latitude": CONFIG['lat'], "longitude": CONFIG['lng']},
            "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], "opens": "06:00", "closes": "20:00"}],
            "sameAs": [f"https://www.instagram.com/{CONFIG['instagram']}/", "https://www.mrandmrslifestyle.com/chloe-antoniazzi.html"],
            "founder": {"@type": "Person", "name": "Chloe"}}

def page(path, title, desc, body, ld=None, active=None):
    canon = SITE + (path if path != '/' else '/')
    lds = [business_ld()] + (ld or [])
    ldtags = '\n'.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in lds)
    nav = ''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if h == active else ""}>{t}</a></li>' for h, t in NAV)
    mnav = ''.join(f'<a href="{h}">{t}</a>' for h, t in NAV)
    ga = (f'<script async src="https://www.googletagmanager.com/gtag/js?id={CONFIG["ga_id"]}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag("js",new Date());gtag("config","{CONFIG["ga_id"]}");</script>' if CONFIG['ga_id'] else '')
    seo = ' · '.join(f'<a href="{h}">{t}</a>' for h, t in SEO_PAGES)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canon}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#F6F1EA">
<meta property="og:type" content="website"><meta property="og:site_name" content="The Pilates Room by Chloe"><meta property="og:url" content="{canon}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:image" content="{SITE}/assets/og.jpg"><meta property="og:locale" content="en_AE">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=Manrope:wght@400;500;600&family=Cormorant+Garamond:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
{ga}
{ldtags}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
  <a class="brand" href="/" aria-label="The Pilates Room by Chloe, home">{LOGO}<span><b>THE PILATES ROOM</b><small>BY CHLOE</small></span></a>
  <nav aria-label="Main"><ul class="nav">{nav}<li><a class="btn" href="/appointments">Book</a></li></ul></nav>
  <button class="burger" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
</div></header>
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu"><button class="menu-close" aria-label="Close menu">&times;</button>{mnav}<a class="btn" href="/appointments">Book your session</a></div>
<main id="main">
{body}
</main>
<footer><div class="wrap">
  <div class="foot">
    <div><a class="brand" href="/">{LOGO}<span><b>THE PILATES ROOM</b><small>BY CHLOE</small></span></a>
      <p class="tagline">Your time. Your space. Your session.</p><p>Private, ladies-only Reformer Pilates in Meydan, Dubai.</p></div>
    <div><h4>Studio</h4><ul><li><a href="/sessions">Sessions</a></li><li><a href="/pricing">Pricing</a></li><li><a href="/appointments">Book a session</a></li><li><a href="/about">About Chloe</a></li><li><a href="/contact">Contact</a></li></ul></div>
    <div><h4>Visit</h4><ul><li>{CONFIG['address1']}</li><li>{CONFIG['address2']}</li><li>{CONFIG['hours']}</li><li>{CONFIG['hours2']}</li><li><a href="{CONFIG['maps']}" target="_blank" rel="noopener">Get directions</a></li></ul></div>
    <div><h4>Contact</h4><ul><li><a href="{WA}" target="_blank" rel="noopener">WhatsApp</a></li><li><a href="tel:+{CONFIG['whatsapp']}">{CONFIG['phone']}</a></li><li><a href="mailto:{CONFIG['email']}">{CONFIG['email']}</a></li><li><a href="https://www.instagram.com/{CONFIG['instagram']}/" target="_blank" rel="noopener">@{CONFIG['instagram']}</a></li></ul></div>
  </div>
  <div class="seo-links">Explore: {seo}</div>
  <div class="foot-bottom"><span>&copy; {datetime.date.today().year} The Pilates Room Fitness Club L.L.C · Dubai, UAE</span><span><a href="/privacy">Privacy</a> · <a href="/terms">Terms &amp; cancellation</a></span></div>
</div></footer>
<a class="wa-float" href="{WA}?text={esc('Hi Chloe! I have a question about The Pilates Room.')}" target="_blank" rel="noopener" aria-label="Message us on WhatsApp">{WA_ICON}</a>
<script src="/assets/main.js" defer></script>
</body>
</html>
'''

def write(path, s):
    full = os.path.join(ROOT, path); os.makedirs(os.path.dirname(full) or ROOT, exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------- shared blocks
FAQ = [
 ("Do I need previous Pilates experience?", "No. A private session is the easiest place to begin. You will be shown the reformer, the springs and the straps at your own pace, with no group to keep up with."),
 ("How often should I do Reformer Pilates?", "For the best results we generally recommend 2–3 sessions per week. The ideal frequency depends on your goals, experience and current training, and in your first session we'll help you decide what feels right."),
 ("What is a Buddy session?", "The same personalised coaching, shared with one person you choose. Two reformers, one coach, with exercises and modifications tailored to each of you."),
 ("Can I do Reformer Pilates if I'm pregnant?", "Reformer Pilates can be suitable during pregnancy with the right modifications. Chloe is a qualified Pre & Post Natal Exercise Specialist, so sessions are adapted to your stage of pregnancy and how you're feeling. We ask that you have medical clearance from your doctor before starting."),
 ("What should I wear?", "Comfortable, fitted clothing you can move freely in. Grip socks are required; all other equipment is provided."),
 ("Do I need grip socks?", "Yes, grip socks are required for all Reformer sessions. If you don't have a pair, The Pilates Room grip socks are available at the studio (AED 75)."),
 ("How do I book?", "Choose Book, pick your session or package and your preferred time, and send your request. Chloe confirms your time personally on WhatsApp."),
 ("What happens if I need to cancel or reschedule?", "You can reschedule or cancel up to 24 hours before your session. Inside the 24-hour window the session is charged, as the time is held exclusively for you."),
 ("Is The Pilates Room only for women?", "Yes. The Pilates Room is exclusively for women: a ladies-only private space designed for comfort, privacy and personal attention."),
 ("Can I bring my baby?", "Yes. Mums are welcome to bring their baby, and their nanny too. Just let Chloe know when you book."),
 ("When should I arrive?", "Please arrive at your booked time and no earlier, as a private session may be taking place beforehand. There is no waiting area."),
 ("Where can I park?", "Roadside parking is available directly outside The Pilates Room, as well as on the opposite side of the road."),
 ("What happens if my Buddy can't attend?", "If one person can't attend but the other still comes, the booking remains a Buddy session and is charged as booked."),
]
def faq_html(items):
    return '<div class="faq">' + ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in items) + '</div>'
def faq_ld(items):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}
def crumbs_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(items)]}

VISIT = f'''<section class="bg-white"><div class="wrap">
<div class="head rv"><span class="eyebrow">Find us</span><h2>A quiet room in Meydan.</h2></div>
<div class="visit rv">
 <div><h3>Studio</h3><p>{CONFIG['address1']}<br>{CONFIG['address2']}</p><a class="link" href="{CONFIG['maps']}" target="_blank" rel="noopener" style="font-family:var(--f-body);font-size:.72rem;display:inline-block;margin-top:14px">Get directions</a></div>
 <div><h3>Open</h3><p>{CONFIG['hours']}<br>{CONFIG['hours2']}</p></div>
 <div><h3>Enquiries</h3><a href="{WA}" target="_blank" rel="noopener">{CONFIG['phone']}</a><p class="small">WhatsApp or <a href="mailto:{CONFIG['email']}" style="font-family:var(--f-body);font-size:.88rem;color:var(--brown)">{CONFIG['email']}</a></p></div>
 <div><h3>Parking</h3><p>Free roadside parking</p><p class="small">Directly outside and on the opposite side of the road. Coffee, matcha and Spinneys next door.</p></div>
</div>
<iframe class="map rv" title="Map to The Pilates Room" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q={CONFIG['lat']},{CONFIG['lng']}&z=16&output=embed"></iframe>
</div></section>'''

def band(title='A space that feels like home.', text='Your time. Your space. Your session.'):
    return f'''<section class="band bg-sand"><div class="wrap rv"><span class="eyebrow">Ladies only · Meydan</span><h2>{title}</h2><p>{text}</p>
<a class="btn" href="/appointments">Book your session</a></div></section>'''

def offer_live():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=4))) <= datetime.datetime.fromisoformat(CONFIG['offer_ends'])

def session_cards():
    p, b = PRICES['private'], PRICES['buddy']
    return f'''<div class="cards">
 <article class="card rv">{arch(svg_reformer(), tag='1 : 1')}<div class="card-body"><span class="kicker">1:1 · 50 minutes</span><h3>Private Reformer</h3>
  <p>A completely personalised 1:1 Reformer Pilates session, built around your body, goals and experience, whether you're brand new or already experienced.</p>
  <div class="price">From {aed(p['opts'][0]['price'])}<small>Packages of 5, 10 and 20 sessions</small></div>
  <div class="row"><a class="btn" href="/appointments?session=private">Book 1:1</a><a class="btn ghost" href="/pricing#private">Packages</a></div></div></article>
 <article class="card rv">{arch(svg_two(), 'blush', tag='2 : 1')}<div class="card-body"><span class="kicker">2:1 · 50 minutes</span><h3>Buddy Reformer</h3>
  <p>Private Reformer Pilates for two. Share your session with one person you choose: two reformers, one coach, each of you coached individually.</p>
  <div class="price">From {aed(b['opts'][0]['price'])} <span style="color:var(--muted);font-size:.95rem">(AED {b['opts'][0]['price']//2} per person)</span><small>Packages of 5, 10 and 20 sessions</small></div>
  <div class="row"><a class="btn" href="/appointments?session=buddy">Book 2:1</a><a class="btn ghost" href="/pricing#buddy">Packages</a></div></div></article>
</div>'''

# ---------------------------------------------------------------- pages
def build_home():
    body = f'''
<section class="hero"><div class="wrap">
 <div class="rv"><span class="eyebrow">Private · Ladies only · Meydan, Dubai</span>
  <h1>Private Reformer Pilates for women in <em>Meydan, Dubai</em></h1>
  <p class="lead">A space that feels like home. One room, one coach, and full attention on you.</p>
  <div class="ctas"><a class="btn" href="/appointments">Book your session</a><a class="link" href="/pricing">See packages</a></div>
  <div class="hero-meta"><div><b>50 min</b>Every session</div><div><b>1 : 1</b>or Buddy 2 : 1</div><div><b>6am–8pm</b>Every day</div></div>
 </div>
 <div class="rv">{arch(svg_reformer(), tag='The Pilates Room')}</div>
</div></section>

<section class="bg-white"><div class="wrap statement rv">
 <span class="eyebrow">The private space</span>
 <p class="lead">A ladies-only private space for Reformer Pilates in Meydan, Nad Al Sheba. No crowd, no comparison, no keeping up.</p>
 <p>Every session is fifty minutes, entirely private and built around you: your body, your goals, your pace. Mums are welcome to bring their baby, and their nanny too.</p>
</div></section>

<section class="bg-sand"><div class="wrap">
 <div class="head rv"><span class="eyebrow">Sessions</span><h2>Choose your private session.</h2></div>
 {session_cards()}
</div></section>

<section><div class="wrap split">
 <div class="split-art rv">{arch(svg_ring(), 'blush', tag='By Chloe', small=True)}</div>
 <div class="rv"><span class="eyebrow">By Chloe</span><h2>Movement, made personal.</h2>
  <p style="margin-top:22px">A former professional dancer and certified Reformer Pilates instructor, Chloe has helped hundreds of women build strength, improve posture and feel supported through pregnancy and recovery.</p>
  <p>The Pilates Room is the private space she always wished existed: calm, welcoming and completely personal.</p>
  <ul class="ticks"><li>B.A. (Hons) Dance &amp; certified Reformer Pilates instructor</li><li>Pre &amp; Post Natal Exercise Specialist</li><li>Personal trainer, nutrition coach and glute specialist</li></ul>
  <a class="btn ghost" href="/about">Meet Chloe</a></div>
</div></section>

<section class="bg-ink"><div class="wrap">
 <div class="head rv"><span class="eyebrow">Private by design</span><h2>Why women choose The Pilates Room</h2></div>
 <div class="pillars rv" style="background:rgba(246,241,234,.15);border-color:rgba(246,241,234,.15)">
  <div class="pillar" style="background:var(--ink)"><span class="n">01</span><h3>Private</h3><p>One coach, one or two clients, and complete privacy. Never a crowded class.</p></div>
  <div class="pillar" style="background:var(--ink)"><span class="n">02</span><h3>Ladies only</h3><p>A calm, women-only room that feels more like a living room than a gym.</p></div>
  <div class="pillar" style="background:var(--ink)"><span class="n">03</span><h3>Tailored</h3><p>Springs, exercises and progressions chosen for your body, every session.</p></div>
  <div class="pillar" style="background:var(--ink)"><span class="n">04</span><h3>Easy</h3><p>Free parking at the door, coffee and Spinneys next door, open 6am to 8pm daily.</p></div>
 </div>
</div></section>

<section><div class="wrap">
 <div class="head rv"><span class="eyebrow">Questions</span><h2>Before your first session</h2></div>
 <div class="rv">{faq_html(FAQ)}</div>
</div></section>
{VISIT}
{band()}'''
    write('index.html', page('/', 'Private Reformer Pilates Dubai | The Pilates Room by Chloe',
        'Ladies-only private Reformer Pilates in Meydan, Dubai. Private 1:1 and Buddy 2:1 sessions with Chloe, 50 minutes, open daily 6am–8pm. Book online.',
        body, [faq_ld(FAQ)], '/'))

def build_sessions():
    body = f'''
<section class="phero"><div class="wrap rv"><span class="eyebrow">Sessions</span><h1>Your private Pilates session, your way.</h1>
<p>Choose between Private 1:1 or Buddy 2:1 Reformer Pilates. Every 50-minute session is personalised, private and tailored to you.</p></div></section>
<section class="bg-sand" style="padding-top:80px"><div class="wrap">{session_cards()}</div></section>
<section><div class="wrap split">
 <div class="rv"><span class="eyebrow">1:1</span><h2>Private Reformer</h2>
  <p style="margin-top:20px">Your strength, posture, experience and goals shape every session. From spring settings to exercises and progressions, everything is tailored specifically to you, whether you're completely new to Reformer Pilates or already experienced.</p>
  <ul class="ticks"><li>50 minutes · one coach · one client</li><li>Ideal for beginners, pregnancy, postnatal recovery and specific goals</li><li>Single sessions or packages of 5, 10 and 20</li></ul>
  <a class="btn" href="/appointments?session=private">Book Private 1:1</a></div>
 <div class="split-art rv">{arch(svg_reformer(), small=True, tag='1 : 1')}</div>
</div></section>
<section class="bg-white"><div class="wrap split rev">
 <div class="rv"><span class="eyebrow">2:1</span><h2>Buddy Reformer</h2>
  <p style="margin-top:20px">Share your session with one person you choose: a friend, sister or mum. Two reformers, one coach, with each session tailored to both of you individually.</p>
  <ul class="ticks"><li>50 minutes · two clients, side by side</li><li>One person books and pays; split the cost privately</li><li>From AED 249 per person</li></ul>
  <a class="btn" href="/appointments?session=buddy">Book Buddy 2:1</a></div>
 <div class="split-art rv">{arch(svg_two(), 'blush', small=True, tag='2 : 1')}</div>
</div></section>
<section class="bg-sand"><div class="wrap">
 <div class="head rv"><span class="eyebrow">Also within your session</span><h2>More than Reformer Pilates.</h2><p>Where it supports your goals, Chloe integrates her wider coaching expertise into your Reformer sessions.</p></div>
 <div class="pillars rv">
  <div class="pillar"><span class="n">01</span><h3>Pre &amp; Post Natal</h3><p>Trimester-by-trimester modifications and a careful return after birth.</p></div>
  <div class="pillar"><span class="n">02</span><h3>Mat &amp; Ball</h3><p>Mat and Pilates ball work to build control and core strength.</p></div>
  <div class="pillar"><span class="n">03</span><h3>Glute-focused</h3><p>Targeted lower-body work, including dumbbells where it helps.</p></div>
  <div class="pillar"><span class="n">04</span><h3>Posture</h3><p>Alignment and posture correction for desk days and tired backs.</p></div>
 </div>
</div></section>
{band('Book your session', 'Choose your session or package, pick your preferred time and Chloe confirms on WhatsApp.')}'''
    write('sessions.html', page('/sessions', 'Private & Buddy Reformer Pilates | The Pilates Room by Chloe',
        'Private 1:1 and Buddy 2:1 Reformer Pilates in Meydan, Dubai. 50-minute ladies-only sessions tailored to you, including pre and post natal.',
        body, [crumbs_ld([('Home', '/'), ('Sessions', '/sessions')])], '/sessions'))

def price_rows(key):
    d = PRICES[key]; rows = ''
    for o in d['opts']:
        pp = f'<small>AED {o["price"]//2:,} per person</small>' if d['per_person'] else ''
        badge = f'<span class="badge">{o["badge"]}</span>' if o.get('badge') else '<span></span>'
        rows += f'<div class="prow"><span class="name">{o["label"]}</span>{badge}<span class="amt">{aed(o["price"])}{pp}</span><a class="btn ghost" href="/appointments?session={key}&amp;option={o["id"]}">Book</a></div>'
    return rows

def build_pricing():
    offer = ''
    items = ''
    for key in ('private', 'buddy'):
        for o in PRICES[key]['opts']:
            if 'offer' in o:
                pp = f'<small>Just AED {o["offer"]//2:,} per person</small>' if PRICES[key]['per_person'] else '<small>&nbsp;</small>'
                items += f'<div class="offer-item"><span class="t">{PRICES[key]["name"]} · {o["label"]}</span><s>{aed(o["price"])}</s><b>{aed(o["offer"])}</b>{pp}<a class="btn light" href="/appointments?session={key}&amp;option={o["id"]}">Claim offer</a></div>'
    if offer_live():
        offer = f'''<div class="offer rv" data-offer><span class="eyebrow">Launch offer · ends 31 October 2026</span><h2>Exclusive opening rates</h2>
<p>Our launch prices on 10 and 20-session packages end on 31 October. After that, all packages return to standard prices.</p>
<span class="countdown" data-countdown></span><div class="offer-grid">{items}</div></div>'''
    p, b = PRICES['private'], PRICES['buddy']
    body = f'''
<section class="phero"><div class="wrap rv"><span class="eyebrow">Pricing</span><h1>Private Pilates, made simple.</h1>
<p>Choose between Private 1:1 and Buddy 2:1 Reformer Pilates. Book a single session or a package of 5, 10 or 20 sessions. Every session is 50 minutes.</p></div></section>
<section style="padding-top:20px"><div class="wrap">
{offer}
<div class="ptable rv" id="private"><div class="ptable-head"><div><span class="eyebrow">Private Reformer · 1:1</span><h3>{p['sub']}</h3></div></div>{price_rows('private')}</div>
<div class="ptable rv" id="buddy"><div class="ptable-head"><div><span class="eyebrow">Buddy Reformer · 2:1</span><h3>Fifty minutes, for two.</h3></div><p>{b['sub']}</p></div>{price_rows('buddy')}</div>
<div class="extras">
 <div class="extra rv" id="online"><span class="eyebrow">Online training</span><h3>The Chloe Method</h3>
  <p>Continue your progress between Reformer sessions with easy-to-follow workouts for the gym or home, exercise demonstrations and regular programme updates.</p>
  <div class="price">AED 299 <span style="font-size:.95rem;color:var(--muted)">/ month · cancel anytime</span></div>
  <ul class="ticks" style="margin-bottom:26px"><li>Progressive gym &amp; home programmes</li><li>Upper, lower body &amp; glute-focused training</li><li>Exercise demonstrations &amp; regular check-ins</li></ul>
  <a class="btn" href="{WA}?text={esc('Hi Chloe! I would like to join The Chloe Method online training.')}" target="_blank" rel="noopener">Join on WhatsApp</a></div>
 <div class="extra rv" id="socks"><span class="eyebrow">Grip socks</span><h3>The Pilates Room Grip Socks</h3>
  <p>Required for every Reformer session. Comfort, grip and signature Pilates Room details, in Soft White and Luxury Cream.</p>
  <div style="margin:22px 0 26px"><div class="sock-row"><span>Signature Grip Sock · Luxury Cream</span><b>AED 75</b></div><div class="sock-row"><span>Signature Grip Sock · Soft White</span><b>AED 75</b></div><div class="sock-row"><span>Bundle of 2 pairs</span><b>AED 120</b></div></div>
  <a class="btn ghost" href="{WA}?text={esc('Hi Chloe! I would like to order grip socks.')}" target="_blank" rel="noopener">Order on WhatsApp</a></div>
</div>
</div></section>
<section class="bg-sand"><div class="wrap"><div class="head rv"><span class="eyebrow">Good to know</span><h2>Booking &amp; payment</h2></div>
 <div class="steps rv">
  <div class="step"><h3>Choose</h3><p>Pick Private or Buddy, and a single session or package.</p></div>
  <div class="step"><h3>Request a time</h3><p>Choose your preferred day and time. Open 6am to 8pm, every day.</p></div>
  <div class="step"><h3>Confirm</h3><p>Chloe confirms on WhatsApp and sends a secure payment link.</p></div>
  <div class="step"><h3>Reschedule</h3><p>Free up to 24 hours before. Inside 24 hours the session is charged.</p></div>
 </div></div></section>
{band('Ready when you are.', 'Choose your session, pick a time and send your request in under a minute.')}'''
    offers = [{"@type": "Offer", "name": f'{PRICES[k]["name"]} – {o["label"]}', "price": o.get('offer') if offer_live() and o.get('offer') else o['price'], "priceCurrency": "AED", "url": SITE + "/pricing"} for k in PRICES for o in PRICES[k]['opts']]
    ld = [{"@context": "https://schema.org", "@type": "Service", "name": "Private Reformer Pilates", "provider": {"@id": SITE + "/#studio"}, "areaServed": "Dubai", "offers": offers},
          crumbs_ld([('Home', '/'), ('Pricing', '/pricing')])]
    write('pricing.html', page('/pricing', 'Pricing & Packages | The Pilates Room by Chloe',
        'Private Reformer Pilates from AED 429 and Buddy sessions from AED 249 per person, with 5, 10 and 20-session packages. Ladies-only studio in Meydan, Dubai.',
        body, ld, '/pricing'))

def build_appointments():
    def opt_inputs(name, items):
        return ''.join(f'<div class="opt"><input type="radio" name="{name}" id="{name}-{v}" value="{v}"{" checked" if c else ""}><label for="{name}-{v}">{lab}</label></div>' for v, lab, c in items)
    sess = opt_inputs('session', [('private', '<b>Private Reformer</b><small>1:1 · just you and Chloe</small><span class="p">From AED 429</span>', True),
                                   ('buddy', '<b>Buddy Reformer</b><small>2:1 · bring one person</small><span class="p">From AED 498 for two</span>', False)])
    data = {'prices': PRICES, 'offer_ends': CONFIG['offer_ends'], 'wa': CONFIG['whatsapp'], 'formspree': CONFIG['formspree'], 'stripe': STRIPE, 'ga': bool(CONFIG['ga_id'])}
    body = f'''
<section class="phero" style="padding-bottom:50px"><div class="wrap rv"><span class="eyebrow">Appointments</span><h1>Choose your time</h1>
<p>Pick your session and preferred time, and send your request. Chloe confirms personally on WhatsApp.</p></div></section>
<section style="padding-top:0"><div class="wrap">
<form class="book" id="bookForm" novalidate>
 <div>
  <div class="bstep"><h2><span>01</span>Your session</h2><p>Every session is 50 minutes and completely private.</p><div class="opts">{sess}</div></div>
  <div class="bstep"><h2><span>02</span>Single session or package</h2><p>Packages are used across your sessions, so you only book once.</p><div class="opts" id="optList"></div></div>
  <div class="bstep"><h2><span>03</span>Preferred day &amp; time</h2><p>Open every day, 6am to 8pm. If your time is taken, Chloe will suggest the closest one.</p>
   <div class="days" id="days" role="radiogroup" aria-label="Day"></div><div class="times" id="times" role="radiogroup" aria-label="Time"></div>
   <label class="check"><input type="checkbox" id="flex"> I'm flexible, any time on this day works</label></div>
  <div class="bstep"><h2><span>04</span>Your details</h2><p>We only use these to confirm your booking.</p>
   <div class="fields">
    <div><label for="fname">Full name</label><input id="fname" autocomplete="name" required></div>
    <div><label for="fphone">Mobile / WhatsApp</label><input id="fphone" type="tel" autocomplete="tel" placeholder="+971" required></div>
    <div class="full"><label for="femail">Email (optional)</label><input id="femail" type="email" autocomplete="email"></div>
    <div class="full" id="buddyField" hidden><label for="fbuddy">Your buddy's name</label><input id="fbuddy"></div>
    <div class="full"><label for="fnotes">Anything Chloe should know? (optional)</label><textarea id="fnotes" rows="3" placeholder="First time on a reformer, pregnant, injuries, bringing my baby…"></textarea></div>
   </div>
   <label class="check"><input type="checkbox" id="fterms" required> I agree to the <a href="/terms" target="_blank">24-hour cancellation policy</a>.</label>
  </div>
 </div>
 <aside class="summary" aria-live="polite">
  <h2>Your booking</h2>
  <div class="sum-row"><span>Session</span><b id="sSession">–</b></div>
  <div class="sum-row"><span>Option</span><b id="sOption">–</b></div>
  <div class="sum-row"><span>Preferred</span><b id="sWhen">Choose a day</b></div>
  <div class="sum-total"><span>Total</span><b id="sTotal">–</b></div>
  <button class="btn light full" type="submit">Send booking request</button>
  <p class="err" id="err" role="alert"></p>
  <p class="note">Your request opens in WhatsApp, ready to send. Payment is taken only once Chloe confirms your time, by secure card payment link. Free rescheduling up to 24 hours before.</p>
 </aside>
</form>
<div class="done" id="done"><span class="eyebrow">Request ready</span><h2>Thank you!</h2><p id="doneText">WhatsApp has opened with your booking request. Press send, and Chloe will confirm your time shortly.</p>
<a class="btn wa" id="waAgain" href="#" target="_blank" rel="noopener">Open WhatsApp again</a><a class="btn ghost" id="payBtn" href="#" target="_blank" rel="noopener" hidden>Pay now</a></div>
</div></section>
<section class="bg-sand"><div class="wrap"><div class="steps rv">
 <div class="step"><h3>Open daily</h3><p>{CONFIG['hours']}, {CONFIG['hours2']}.</p></div>
 <div class="step"><h3>Where</h3><p>{CONFIG['address1']}, {CONFIG['address2']}.</p></div>
 <div class="step"><h3>Arrive on time</h3><p>Please arrive at your booked time; there is no waiting area.</p></div>
 <div class="step"><h3>Questions?</h3><p><a href="{WA}" target="_blank" rel="noopener" style="color:var(--brown)">WhatsApp {CONFIG['phone']}</a></p></div>
</div></div></section>
<script>window.TPR={json.dumps(data)};</script>
<script src="/assets/book.js" defer></script>'''
    write('appointments.html', page('/appointments', 'Book a Session | The Pilates Room by Chloe',
        'Book your private or Buddy Reformer Pilates session in Meydan, Dubai. Choose your package and preferred time; Chloe confirms on WhatsApp.',
        body, [crumbs_ld([('Home', '/'), ('Appointments', '/appointments')])], '/appointments'))

def build_about():
    quals = ['B.A. (Hons) Dance', 'Certified Personal Trainer', 'Certified Nutrition Coach', 'Certified Reformer Pilates Instructor', 'Certified Mat Pilates Instructor',
             'Pilates Ball Instructor', 'Pre and Post Natal Exercise Specialist', 'Glute Specialist', 'Life Coach']
    body = f'''
<section class="phero"><div class="wrap rv"><span class="eyebrow">About Chloe, founder of The Pilates Room</span><p class="quote">“Pilates should feel personal.”</p>
<p>A private approach to movement, where every session is shaped around you, your body and your goals.</p></div></section>
<section class="bg-white"><div class="wrap split">
 <div class="split-art rv">{arch(svg_ring(), 'blush', small=True, tag='Chloe')}</div>
 <div class="rv"><span class="eyebrow">Meet Chloe</span><h2>Movement has always been part of my life.</h2>
  <p style="margin-top:22px">Hi, I'm Chloe. Before moving into coaching, I trained professionally as a dancer and taught dance, which shaped the way I see movement today: not just how your body looks, but how it feels, how it moves and the confidence it gives you.</p>
  <p>Over the years I've coached hundreds of women through different stages of life, from building strength and confidence to improving posture, pregnancy, postnatal recovery and simply finding time to focus on themselves.</p>
  <p>The Pilates Room is the private space I always wished existed: calm, welcoming, completely personal and designed to make you feel at home.</p></div>
</div></section>
<section><div class="wrap"><div class="head rv"><span class="eyebrow">Qualifications</span><h2>Trained in movement, from every angle.</h2></div>
<ul class="quals rv">{''.join(f'<li>{q}</li>' for q in quals)}</ul></div></section>
<section class="bg-ink"><div class="wrap split">
 <div class="rv"><span class="eyebrow">My approach</span><h2>Precision over repetition.</h2>
  <p style="margin-top:22px">I believe the smallest details make the biggest difference. My approach is precise, personal and purposeful. I pay attention to how you move, not simply whether you can complete an exercise: your alignment, your technique and the way your body responds and progresses.</p>
  <p>No two bodies move in exactly the same way, which is why every session is adapted around you.</p></div>
 <div class="split-art rv">{arch(svg_reformer('#E9DED2'), 'deep', small=True)}</div>
</div></section>
<section class="bg-sand"><div class="wrap"><div class="head rv"><span class="eyebrow">The experience</span><h2>What to expect</h2></div>
<div class="steps rv">
 <div class="step"><h3>Before</h3><p>Choose your session and preferred time online; Chloe confirms on WhatsApp.</p></div>
 <div class="step"><h3>Arrival</h3><p>Calm, private and unhurried. A warm welcome by name.</p></div>
 <div class="step"><h3>The session</h3><p>Fifty minutes built around you: your body, your goals, your pace.</p></div>
 <div class="step"><h3>After</h3><p>Leave stronger, more balanced and refreshed, every session building on the last.</p></div>
</div></div></section>
{band()}'''
    ld = [{"@context": "https://schema.org", "@type": "Person", "name": "Chloe", "jobTitle": "Founder & Reformer Pilates Instructor", "worksFor": {"@id": SITE + "/#studio"},
           "hasCredential": quals, "url": SITE + "/about"}, crumbs_ld([('Home', '/'), ('About Chloe', '/about')])]
    write('about.html', page('/about', 'About Chloe | The Pilates Room, Meydan Dubai',
        'Meet Chloe: former professional dancer, certified Reformer Pilates instructor and Pre & Post Natal Exercise Specialist, founder of The Pilates Room in Meydan.',
        body, ld, '/about'))

def build_contact():
    body = f'''
<section class="phero"><div class="wrap rv"><span class="eyebrow">Contact</span><h1>Get in touch</h1>
<p>Questions about a session, a package or your first visit? We're happy to hear from you. The quickest way to reach us is WhatsApp.</p>
<div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:32px"><a class="btn wa" href="{WA}?text={esc('Hi Chloe! I have a question about The Pilates Room.')}" target="_blank" rel="noopener">WhatsApp us</a><a class="btn ghost" href="/appointments">Book your session</a></div></div></section>
{VISIT}
{band()}'''
    write('contact.html', page('/contact', 'Contact | The Pilates Room by Chloe, Meydan Dubai',
        'Contact The Pilates Room by Chloe: Meydan Avenue A, Shop 3, Nad Al Sheba 1, Dubai. Open daily 6am–8pm. WhatsApp +971 54 701 1995.',
        body, [crumbs_ld([('Home', '/'), ('Contact', '/contact')])], '/contact'))

LANDINGS = [
 ('private-reformer-pilates-dubai', 'Private Reformer Pilates Dubai | The Pilates Room by Chloe', 'Private Reformer Pilates in Dubai',
  'Private Reformer Pilates in Dubai: 1:1 and Buddy 2:1 sessions in a ladies-only studio in Meydan. 50 minutes, tailored to you. From AED 429.',
  'Private Reformer Pilates', 'Every session at The Pilates Room is private: just you (or you and one friend) and Chloe, on a reformer set up for your body.',
  [('Fully private', 'No class, no crowd. One coach and one or two clients, in a calm studio in Meydan.'),
   ('Built around you', 'Springs, exercises and progressions chosen for your goals, posture and experience.'),
   ('For every level', 'Ideal if you are new to the reformer, returning after pregnancy or training for specific goals.')]),
 ('pilates-meydan', 'Reformer Pilates in Meydan | The Pilates Room by Chloe', 'Reformer Pilates in Meydan',
  'Reformer Pilates in Meydan, Dubai: a private, ladies-only studio at Meydan Avenue A, Nad Al Sheba 1. Free parking, open daily 6am–8pm.',
  'Pilates in Meydan', 'The Pilates Room sits on Meydan Avenue in Nad Al Sheba 1, minutes from Meydan, Al Meydan Road, Nad Al Sheba and Dubai Hills.',
  [('Easy to reach', 'Free roadside parking directly outside, with coffee, matcha and Spinneys next door.'),
   ('Open early and late', 'Every day from 6am to 8pm, so you can train before work or after school runs.'),
   ('Private sessions', 'Private 1:1 or Buddy 2:1 Reformer Pilates, never a group class.')]),
 ('ladies-only-pilates-dubai', 'Ladies-Only Pilates Dubai | The Pilates Room by Chloe', 'Ladies-Only Pilates in Dubai',
  'Ladies-only Reformer Pilates in Dubai: a private, women-only studio in Meydan where mums can bring their baby. Private 1:1 and Buddy sessions.',
  'Ladies only', 'The Pilates Room is exclusively for women: a private space designed for comfort, privacy and personal attention.',
  [('Women only', 'A calm, private room where you can move without anyone watching.'),
   ('Mums welcome', 'Bring your baby, and your nanny too. Just let Chloe know when you book.'),
   ('Coached by Chloe', 'A female Reformer Pilates instructor and Pre & Post Natal Exercise Specialist.')]),
 ('private-pilates-dubai', 'Private 1-to-1 Pilates Dubai | The Pilates Room by Chloe', 'Private 1-to-1 Pilates in Dubai',
  'Private 1-to-1 Pilates in Dubai with Chloe: 50-minute Reformer sessions tailored to you, in a ladies-only studio in Meydan. From AED 429.',
  '1-to-1 Pilates', 'A 1-to-1 session gives you the full attention of your coach for 50 minutes: the fastest, safest way to progress on the reformer.',
  [('Faster progress', 'Every rep is watched and corrected, so technique and results come quicker.'),
   ('Safer', 'Exercises adapted around injuries, pregnancy, posture and how you feel on the day.'),
   ('Flexible packages', 'Single sessions or packages of 5, 10 and 20 sessions.')]),
 ('pre-post-natal-pilates-dubai', 'Pre & Post Natal Pilates Dubai | Private Reformer Sessions', 'Pre & Post Natal Pilates in Dubai',
  'Pre and post natal Reformer Pilates in Dubai with Chloe, a qualified Pre & Post Natal Exercise Specialist. Private, ladies-only sessions in Meydan.',
  'Pre & Post Natal', 'Chloe is qualified in pre and post natal coaching and integrates this expertise into private Reformer sessions to support you through pregnancy and recovery.',
  [('During pregnancy', 'Sessions adapted trimester by trimester to keep you strong, mobile and comfortable.'),
   ('After birth', 'A gradual, careful return to movement: core and pelvic floor reconnection, posture and strength.'),
   ('Always private', 'Delivered in Private 1:1 or Buddy 2:1 sessions. Please check with your doctor before starting.')]),
]
def build_landings():
    for slug, title, h1, desc, eyebrow, intro, points in LANDINGS:
        pts = ''.join(f'<div class="pillar"><span class="n">0{i+1}</span><h3>{esc(a)}</h3><p>{esc(b)}</p></div>' for i, (a, b) in enumerate(points))
        others = ' · '.join(f'<a href="{h}" style="color:var(--brown)">{t}</a>' for h, t in SEO_PAGES if h != '/' + slug)
        faqs = FAQ[:4] + [FAQ[7], FAQ[11]]
        body = f'''
<section class="phero"><div class="wrap rv"><p class="crumb"><a href="/">Home</a> › {esc(h1)}</p><span class="eyebrow">{esc(eyebrow)}</span><h1>{esc(h1)}</h1><p>{esc(intro)}</p>
<div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:32px"><a class="btn" href="/appointments">Book your session</a><a class="btn ghost" href="/pricing">See pricing</a></div></div></section>
<section class="bg-sand"><div class="wrap"><div class="pillars rv" style="grid-template-columns:repeat(3,1fr)">{pts}</div></div></section>
<section><div class="wrap"><div class="head rv"><span class="eyebrow">Sessions</span><h2>Private 1:1 or Buddy 2:1</h2></div>{session_cards()}</div></section>
<section class="bg-white"><div class="wrap"><div class="head rv"><span class="eyebrow">Questions</span><h2>Good to know</h2></div><div class="rv">{faq_html(faqs)}</div>
<p class="center rv" style="margin-top:40px;font-size:.9rem">Find us at {CONFIG['address1']}, {CONFIG['address2']}. Open {CONFIG['hours']}, {CONFIG['hours2']}. Also: {others}</p></div></section>
{band()}'''
        write(f'{slug}.html', page('/' + slug, title, desc, body, [faq_ld(faqs), crumbs_ld([('Home', '/'), (h1, '/' + slug)])]))

def build_legal():
    terms = f'''<section class="phero" style="padding-bottom:30px"><div class="wrap"><span class="eyebrow">Terms</span><h1>Terms &amp; cancellation</h1></div></section>
<section style="padding-top:20px"><div class="wrap legal">
<h2>Bookings</h2><p>Booking requests are confirmed by The Pilates Room on WhatsApp. A session is reserved for you once it is confirmed and paid.</p>
<h2>Cancellation &amp; rescheduling</h2><p>You can cancel or reschedule free of charge up to 24 hours before your session. Inside 24 hours, the session is charged in full, as the time is held exclusively for you.</p>
<h2>Buddy sessions</h2><p>If one person cannot attend but the other still comes, the booking remains a Buddy session and is charged as booked.</p>
<h2>Arrival</h2><p>Please arrive at your booked time and no earlier, as a private session may be taking place beforehand. Late arrivals finish at the scheduled time.</p>
<h2>Health</h2><p>Please tell us about any injury, medical condition or pregnancy before your session. If you are pregnant or postnatal, we ask that you have clearance from your doctor before starting.</p>
<h2>Grip socks</h2><p>Grip socks are required for all Reformer sessions and are available to buy at the studio.</p>
<h2>Online training</h2><p>The Chloe Method online training is billed monthly at AED 299 and renews automatically until cancelled. Cancel anytime before your next billing date.</p>
<h2>Company</h2><p>The Pilates Room Fitness Club L.L.C (S.O.), Dubai, United Arab Emirates. Trade licence 1640151. Contact: {CONFIG['email']}.</p>
</div></section>'''
    privacy = f'''<section class="phero" style="padding-bottom:30px"><div class="wrap"><span class="eyebrow">Privacy</span><h1>Privacy policy</h1></div></section>
<section style="padding-top:20px"><div class="wrap legal">
<p>The Pilates Room Fitness Club L.L.C respects your privacy. This policy explains what we collect and why.</p>
<h2>What we collect</h2><ul><li>Details you send us when you request a booking or contact us: your name, phone number, email and any notes you choose to share.</li><li>Basic, anonymous website analytics (pages visited, device type) if analytics are enabled.</li></ul>
<h2>How we use it</h2><p>Only to arrange and confirm your sessions, answer your questions and, if you ask us to, send you offers. We never sell your data.</p>
<h2>Health information</h2><p>Anything you tell us about pregnancy, injuries or health is used only to adapt your sessions safely, and is kept confidential.</p>
<h2>Third parties</h2><p>Booking requests are sent via WhatsApp. Payments are processed securely by our payment provider; we never see or store your card details.</p>
<h2>Your rights</h2><p>You can ask us to see, correct or delete your information at any time: {CONFIG['email']}.</p>
</div></section>'''
    write('terms.html', page('/terms', 'Terms & Cancellation Policy | The Pilates Room by Chloe', 'Booking, 24-hour cancellation and rescheduling policy for The Pilates Room by Chloe, Meydan, Dubai.', terms))
    write('privacy.html', page('/privacy', 'Privacy Policy | The Pilates Room by Chloe', 'How The Pilates Room by Chloe collects and uses your information when you book or contact us.', privacy))
    nf = f'''<section class="phero" style="padding:140px 0"><div class="wrap"><span class="eyebrow">404</span><h1>This page has moved.</h1><p>Let's get you back to your session.</p>
<div style="display:flex;gap:14px;justify-content:center;margin-top:30px;flex-wrap:wrap"><a class="btn" href="/">Home</a><a class="btn ghost" href="/appointments">Book</a></div></div></section>'''
    write('404.html', page('/404', 'Page not found | The Pilates Room by Chloe', 'Page not found.', nf).replace('index, follow', 'noindex'))

def build_meta():
    today = datetime.date.today().isoformat()
    urls = ['/', '/sessions', '/pricing', '/appointments', '/about', '/contact'] + [h for h, _ in SEO_PAGES] + ['/terms', '/privacy']
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
        f'  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod><priority>{"1.0" if u == "/" else "0.8" if u in ("/pricing", "/appointments", "/sessions") else "0.6"}</priority></url>\n' for u in urls) + '</urlset>\n'
    write('sitemap.xml', sm)
    write('robots.txt', f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    write('llms.txt', f'''# The Pilates Room by Chloe
> Private, ladies-only Reformer Pilates studio in Meydan, Dubai ({CONFIG['address1']}, {CONFIG['address2']}). Open {CONFIG['hours']}, {CONFIG['hours2']}.

- Sessions: Private Reformer 1:1 (from AED 429) and Buddy Reformer 2:1 (from AED 498 for two, AED 249 per person); 50 minutes; packages of 5, 10 and 20.
- Coach: Chloe, former professional dancer, certified Reformer Pilates instructor, Pre & Post Natal Exercise Specialist.
- Ladies only; mums can bring their baby. Free roadside parking.
- Book: {SITE}/appointments · WhatsApp {CONFIG['phone']} · {CONFIG['email']}
- Pages: {SITE}/sessions, {SITE}/pricing, {SITE}/about, {SITE}/contact
''')
    write('vercel.json', json.dumps({"cleanUrls": True, "trailingSlash": False,
        "redirects": [{"source": "/book", "destination": "/appointments", "permanent": True},
                      {"source": "/index", "destination": "/", "permanent": True}],
        "headers": [{"source": "/assets/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800"}]}]}, indent=2))

if __name__ == '__main__':
    build_home(); build_sessions(); build_pricing(); build_appointments(); build_about(); build_contact(); build_landings(); build_legal(); build_meta()
    print('built', len([f for f in os.listdir(ROOT) if f.endswith('.html')]), 'pages')
