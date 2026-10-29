"""Generates the Dubai Food Calories hub + one page per food, in English and Arabic.
Run from the repo root:  python3 _tools/food/build.py
Outputs: dubai-food-calories.html, calories/<slug>.html, ar/dubai-food-calories.html, ar/calories/<slug>.html
"""
import json, os, html, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from foods import FOODS, CATS

SITE = 'https://www.mrandmrslifestyle.com'
HUB = 'dubai-food-calories.html'
CAT_AR = dict(CATS)
BY_SLUG = {f['slug']: f for f in FOODS}

def esc(s): return html.escape(str(s), quote=True)
def num(n): return f'{n:,}'
def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def write(p, s):
    full = os.path.join(ROOT, p); os.makedirs(os.path.dirname(full) or '.', exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)

# ---------- shared header/footer taken from existing pages ----------
calc = read('calculator.html')
EN_HEADER = calc[calc.index('<header class="mm-header'):calc.index('<main id="main">')]
EN_HEADER = (EN_HEADER.replace(' class="mm-active" aria-current="page"', '')
             .replace('mm-menu-small mm-active', 'mm-menu-small'))
EN_FOOTER = calc[calc.index('<div class="mm-footer"'):calc.index('<script>', calc.index('<div class="mm-footer"'))]

ar = read('ar/calories/chicken-shawarma.html')  # ar/index.html is now the full Arabic home page; reuse the current calorie-page header
AR_HEADER = ar[ar.index('<header class="mm-header ar-head">'):ar.index('<main id="main">')]
AR_HEADER = AR_HEADER.replace(' class="mm-active" aria-current="page"', '').replace(' class="mm-active"', '').replace('href="/calculator.html"', 'href="/ar/calculator.html"')
AR_FOOTER = ar[ar.index('<div class="mm-footer" role="contentinfo" dir="rtl">'):ar.index('<script>', ar.index('<div class="mm-footer" role="contentinfo" dir="rtl">'))]

def mark_active(h):
    """Highlight the Free Tools menu + this tool in the header."""
    h = h.replace('class="mm-drop-btn"', 'class="mm-drop-btn mm-active"')
    h = h.replace('<a href="/dubai-food-calories.html">', '<a href="/dubai-food-calories.html" class="mm-active">')
    return h

# ---------- strings ----------
T = {
 'en': dict(
   g='g', kcal='kcal', protein='Protein', carbs='Carbs', fat='Fat', swap='Lighter swap:', more='Full breakdown →',
   pct='{p}% of your {t} kcal day', all='All', tag_hub='Free Tool · Dubai Food Calories', tag_page='Dubai Food Calories',
   hub_title='Dubai Food Calories: Shawarma, Karak &amp; More | Mr &amp; Mrs',
   hub_desc='Calories and protein in shawarma, karak, machboos and {n} Dubai foods, with a lighter swap for each. Free tool by Dubai coaches Tarek &amp; Chloe.',
   hub_h1='How Many Calories in Your <em>Favourite</em> Dubai Food?',
   hub_sub='Shawarma, karak, machboos, luqaimat… Search {n} foods you actually eat here, see calories and protein, and get a lighter swap from your coaches.',
   search='Search a food, e.g. shawarma or كرك', target='My daily calories',
   none='We don\'t have that one yet. <a href="https://wa.me/971507871515?text=Please%20add%20this%20food%20to%20your%20calorie%20list%3A%20" style="color:var(--gold)">Tell us on WhatsApp</a> and we\'ll add it.',
   note='Values are estimates for a typical Dubai restaurant portion, based on published nutrition data and standard recipes. Portions and recipes vary between restaurants.',
   calc_link='Not sure of your daily calories? <a href="/calculator.html" style="color:var(--gold)">Use our free calculator</a>.',
   lead_tag='Free PDF guide', lead_h='Love {what}? Get the free <em>Dubai Eating-Out Guide</em>', lead_fav_default='eating out',
   lead_p='What to order at 29 Dubai favourites, from shawarma and karak to biryani and kunafa, and still lose fat. Plus our 7 rules for eating out. Free, instant download.',
   ph_name='First name', ph_email='Your email', lead_btn='Get the Free Guide',
   nospam='No spam. Unsubscribe anytime.', thanks='Your guide is ready:', dl_btn='Download the guide (PDF)', guide_pdf='/guides/dubai-eating-out-guide.pdf',
   teaser='<b>Free PDF:</b> what to order at 29 Dubai favourites and still lose fat', teaser_btn='Get the free guide ↓',
   cta_h_hub='Lose fat without giving up the food you love', cta_h_page='Lose fat without giving up {name}',
   cta_p='Our clients still eat shawarma and drink karak. We just build it into the plan.',
   cta1=('See Online Coaching', '/online-coaching.html'), cta2=('Train In Person', '/personal-trainer-dubai.html'),
   page_title='{name} Calories: {kcal} kcal + a Lighter Swap',
   page_desc='{name}: about {kcal} kcal for {portion}, but portion sizes vary a lot. See full macros and a lighter swap.',
   page_h1='How Many Calories in {a}<em>{name}</em>?',
   page_sub='About <strong style="color:#fff">{kcal} kcal</strong> for {portion_l}. Here\'s how it fits into your day, and how to make it lighter without giving it up.',
   home='Home', per='kcal · {portion}', day_note='Uses your target from the calorie calculator if you\'ve used it.', find='Find your number',
   fits='How it fits your day', fits_rows=[(1500, 'A 1,500 kcal day (typical fat loss, women)'), (2000, 'A 2,000 kcal day'), (2500, 'A 2,500 kcal day (typical fat loss, men)')],
   walk='Brisk walking to burn it off', walk_unit='minutes', walk_note='Approximate, for a 75 kg adult at about 5 kcal per minute.',
   inside='What\'s inside', total='Total', compare='{name} options compared',
   swap_h='The lighter swap', coach_h='Coach\'s take', faq_h='Questions we get asked', rel_h='Compare similar foods', back='See all {n} Dubai foods →',
   take_protein='High in protein for the calories. A solid choice when you\'re trying to lose fat, as long as the portion fits your day.',
   take_fat='Most of the calories here come from fat (oil, ghee, sauce or cheese). Ask for sauces on the side and you\'ll cut a big chunk without noticing.',
   take_carb='Mostly carbs, with little protein. Pair it with a protein source like eggs, chicken or laban so it keeps you full for longer.',
   take_low='Light on calories, so it fits easily into most days. Just watch what you eat alongside it.',
   take_bal='A fairly balanced mix of protein, carbs and fat. Portion size is what makes the difference here.',
   faq=[('How many calories are in {name}?', 'About {kcal} kcal for {portion_l}, with {p}g protein, {c}g carbs and {f}g fat. Values vary between restaurants.'),
        ('Can I eat {name} and still lose weight?', 'Yes. Fat loss depends on your total calories across the day, not one food. {name} is about {pct}% of a 2,000 kcal day. {swap}'),
        ('How long does it take to burn off {name}?', 'About {walk} minutes of brisk walking for a 75 kg adult. It\'s easier to adjust the portion than to try to burn it off, which is why we build favourite foods into our clients\' plans.')],
   wa_text='Hi Tarek & Chloe! I was looking at your Dubai food calories page and I\'d like help with my nutrition.',
   pt_tag='1-to-1 Personal Training · Al Quoz, Dubai',
   pt_h='Love {name}? Keep it, and still get in shape.',
   pt_p='Train 1-to-1 with Tarek at Nogs Gym, Al Quoz. He builds your training and nutrition around the food you actually eat in Dubai, and reviews your progress every 4 weeks. Men and women welcome.',
   pt_facts=['From AED 275 per session', 'Free first consultation', 'Nutrition plan included'],
   pt_btn='WhatsApp Tarek', pt_btn2=('Work out your cost', '/personal-trainer-cost-calculator.html'),
   pt_wa='Hi Tarek! I found you through your {name} calories page. I\'m interested in 1-to-1 personal training at Nogs Gym.',
 ),
 'ar': dict(
   g=' غ', kcal='سعرة', protein='بروتين', carbs='كربوهيدرات', fat='دهون', swap='بديل أخف:', more='التفاصيل الكاملة ←',
   pct='{p}% من يومك ({t} سعرة)', all='الكل', tag_hub='أداة مجانية · سعرات أكلات دبي', tag_page='سعرات أكلات دبي',
   hub_title='سعرات أكلات دبي: الشاورما والكرك وأكثر | Mr &amp; Mrs',
   hub_desc='كم سعرة في الشاورما وشاي الكرك والمجبوس و{n} أكلة أخرى في دبي؟ ابحث عن السعرات والبروتين وبدائل أخف من المدربين طارق وكلوي.',
   hub_h1='كم سعرة في <em>أكلتك المفضلة</em> في دبي؟',
   hub_sub='شاورما، كرك، مجبوس، لقيمات… ابحث بين {n} أكلة تأكلها فعلًا هنا، واعرف السعرات والبروتين، واحصل على بديل أخف من مدربيك.',
   search='ابحث عن أكلة، مثلًا شاورما أو karak', target='سعراتي اليومية',
   none='هذه الأكلة غير موجودة بعد. <a href="https://wa.me/971507871515?text=%D8%A3%D8%B1%D8%AC%D9%88%20%D8%A5%D8%B6%D8%A7%D9%81%D8%A9%20%D9%87%D8%B0%D9%87%20%D8%A7%D9%84%D8%A3%D9%83%D9%84%D8%A9%3A%20" style="color:var(--gold)">أخبرنا على واتساب</a> وسنضيفها.',
   note='القيم تقديرية لحصة مطعم عادية في دبي، بناءً على بيانات غذائية منشورة ووصفات معتادة. الحصص والوصفات تختلف بين المطاعم.',
   calc_link='لا تعرف سعراتك اليومية؟ <a href="/ar/calculator.html" style="color:var(--gold)">استخدم الحاسبة المجانية</a>.',
   lead_tag='دليل PDF مجاني', lead_h='تحب {what}؟ احصل مجانًا على <em>دليل الأكل خارج البيت في دبي</em>', lead_fav_default='الأكل خارج البيت',
   lead_p='ماذا تطلب من 29 أكلة مفضلة في دبي، من الشاورما والكرك إلى البرياني والكنافة، وتخسر الدهون في نفس الوقت. مع 7 قواعد للأكل خارج البيت. مجاني وتحميل فوري.',
   ph_name='الاسم الأول', ph_email='بريدك الإلكتروني', lead_btn='احصل على الدليل المجاني',
   nospam='بدون رسائل مزعجة. يمكنك إلغاء الاشتراك في أي وقت.', thanks='دليلك جاهز:', dl_btn='حمّل الدليل (PDF)', guide_pdf='/guides/dubai-eating-out-guide-ar.pdf',
   teaser='<b>دليل PDF مجاني:</b> ماذا تطلب من 29 أكلة مفضلة في دبي وتخسر الدهون', teaser_btn='احصل على الدليل ↓',
   cta_h_hub='اخسر الدهون بدون أن تتخلى عن أكلك المفضل', cta_h_page='اخسر الدهون بدون أن تتخلى عن {name}',
   cta_p='عملاؤنا ما زالوا يأكلون الشاورما ويشربون الكرك. نحن فقط ندخلها في الخطة.',
   cta1=('التدريب أونلاين', '/ar/online-coaching.html'), cta2=('التدريب الشخصي في دبي', '/ar/personal-trainer-dubai.html'),
   page_title='سعرات {name}: {kcal} سعرة + بديل أخف',
   page_desc='{name}: حوالي {kcal} سعرة لـ {portion}، لكن حجم الحصة يختلف كثيرًا. اعرف القيم الغذائية وبديلًا أخف.',
   page_h1='كم سعرة في <em>{name}</em>؟',
   page_sub='حوالي <strong style="color:#fff">{kcal} سعرة</strong> لـ {portion_l}. إليك كيف تناسب يومك، وكيف تجعلها أخف بدون أن تتخلى عنها.',
   home='الرئيسية', per='سعرة · {portion}', day_note='نستخدم هدفك من حاسبة السعرات إذا استخدمتها.', find='اعرف رقمك',
   fits='كيف تناسب يومك', fits_rows=[(1500, 'يوم 1,500 سعرة (خسارة دهون للسيدات عادةً)'), (2000, 'يوم 2,000 سعرة'), (2500, 'يوم 2,500 سعرة (خسارة دهون للرجال عادةً)')],
   walk='المشي السريع لحرقها', walk_unit='دقيقة', walk_note='تقريبي، لشخص وزنه 75 كغ بمعدل 5 سعرات في الدقيقة تقريبًا.',
   inside='ماذا يوجد بداخلها', total='المجموع', compare='مقارنة خيارات {name}',
   swap_h='البديل الأخف', coach_h='رأي المدرب', faq_h='أسئلة شائعة', rel_h='قارن مع أكلات مشابهة', back='شاهد كل الـ {n} أكلة ←',
   take_protein='غنية بالبروتين مقارنةً بسعراتها. خيار جيد أثناء خسارة الدهون، بشرط أن تناسب الحصة يومك.',
   take_fat='معظم السعرات هنا من الدهون (زيت أو سمن أو صلصة أو جبن). اطلب الصلصات على الجانب وستوفر جزءًا كبيرًا بدون أن تلاحظ.',
   take_carb='معظمها كربوهيدرات وبروتين قليل. كُلها مع مصدر بروتين مثل البيض أو الدجاج أو اللبن لتشبع لفترة أطول.',
   take_low='سعراتها قليلة، فتناسب معظم الأيام بسهولة. فقط انتبه لما تأكله معها.',
   take_bal='مزيج متوازن نسبيًا من البروتين والكربوهيدرات والدهون. حجم الحصة هو ما يصنع الفرق هنا.',
   faq=[('كم سعرة في {name}؟', 'حوالي {kcal} سعرة لـ {portion_l}، مع {p} غ بروتين و{c} غ كربوهيدرات و{f} غ دهون. القيم تختلف بين المطاعم.'),
        ('هل يمكنني أكل {name} وخسارة الوزن؟', 'نعم. خسارة الدهون تعتمد على مجموع سعراتك خلال اليوم، وليس على أكلة واحدة. {name} تعادل حوالي {pct}% من يوم 2,000 سعرة. {swap}'),
        ('كم أحتاج لحرق {name}؟', 'حوالي {walk} دقيقة من المشي السريع لشخص وزنه 75 كغ. تعديل الحصة أسهل من محاولة حرقها، ولهذا ندخل الأكلات المفضلة في خطط عملائنا.')],
   wa_text='مرحبًا طارق وكلوي! كنت أتصفح صفحة سعرات أكلات دبي وأحتاج مساعدة في نظامي الغذائي.',
   pt_tag='تدريب شخصي 1 لـ 1 · القوز، دبي',
   pt_h='تحب {name}؟ احتفظ بها وابنِ جسمك في نفس الوقت.',
   pt_p='تدرّب 1 لـ 1 مع طارق في نادي Nogs في القوز. يبني لك خطة التمرين والتغذية حول الأكل الذي تأكله فعلًا في دبي، ويراجع تقدمك كل 4 أسابيع. للرجال والسيدات.',
   pt_facts=['من 275 درهم للجلسة', 'استشارة أولى مجانية', 'خطة تغذية مشمولة'],
   pt_btn='راسل طارق على واتساب', pt_btn2=('احسب تكلفة التدريب', '/ar/personal-trainer-cost-calculator.html'),
   pt_wa='مرحبًا طارق! وجدتك من صفحة سعرات {name}. أنا مهتم بالتدريب الشخصي 1 لـ 1 في نادي Nogs.',
 ),
}

def L(f, lang, key):
    """Localised field of a food."""
    if lang == 'ar':
        return {'name': f['ar'], 'portion': f['portion_ar'], 'swap': f['swap_ar'], 'cat': CAT_AR[f['cat']]}[key]
    return {'name': f['en'], 'portion': f['portion'], 'swap': f['swap'], 'cat': f['cat']}[key]

def url(f, lang): return f"{'/ar' if lang == 'ar' else ''}/calories/{f['slug']}.html"
def hub_url(lang): return f"{'/ar' if lang == 'ar' else ''}/{HUB}"

def coach_take(f, t):
    k = max(f['kcal'], 1)
    ps, fs, cs = f['p'] * 4 / k, f['f'] * 9 / k, f['c'] * 4 / k
    if k <= 160: return t['take_low']
    if ps >= .25: return t['take_protein']
    if fs >= .48: return t['take_fat']
    if cs >= .6 and ps < .15: return t['take_carb']
    return t['take_bal']

# ---------- CSS ----------
CSS = '''
:root{--gold:#C9A84C;--gold-light:#E8D08A;--black:#0A0A0A;--card:#161616;--white:#fff;--muted:rgba(255,255,255,.62);--font-d:'DM Serif Display',Georgia,serif;--font-b:'DM Sans',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font-b);background:var(--black);color:var(--white);overflow-x:hidden}
a{color:inherit}
.fc-hero{padding:8rem 1.5rem 3rem;text-align:center;position:relative}
.fc-hero:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(201,168,76,.10),transparent 70%);pointer-events:none}
.fc-tag{display:inline-flex;align-items:center;gap:.6rem;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:1.1rem}
.fc-tag:before,.fc-tag:after{content:'';width:28px;height:1px;background:var(--gold)}
.fc-hero h1{font-family:var(--font-d);font-weight:400;font-size:clamp(2.1rem,5vw,3.6rem);line-height:1.1;max-width:860px;margin:0 auto 1.1rem}
.fc-hero h1 em{color:var(--gold)}
.fc-sub{color:var(--muted);max-width:620px;margin:0 auto;line-height:1.7;font-size:1rem}
.fc-wrap{max-width:1140px;margin:0 auto;padding:0 1.5rem}
.fc-tools{display:grid;grid-template-columns:1fr 270px;gap:1rem;margin:0 0 1rem}
.fc-search{display:flex;align-items:center;gap:.6rem;background:#111;border:1px solid rgba(201,168,76,.3);border-radius:8px;padding:0 1rem}
.fc-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:#fff;font-size:1rem;padding:1rem 0;font-family:inherit}
.fc-target{display:flex;align-items:center;justify-content:space-between;gap:.6rem;background:#111;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:.4rem 1rem;font-size:.8rem;color:var(--muted)}
.fc-target input{width:84px;background:none;border:0;border-bottom:1px solid rgba(201,168,76,.5);color:var(--gold);font-weight:700;font-size:1rem;padding:.3rem 0;text-align:center;outline:0;font-family:inherit}
.fc-chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.75rem}
.fc-chip{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.8);border-radius:999px;padding:.5rem 1rem;font-size:.78rem;font-weight:600;letter-spacing:.03em;cursor:pointer;font-family:inherit}
.fc-chip.on{background:var(--gold);color:#0a0a0a;border-color:var(--gold)}
.fc-count{font-size:.78rem;color:var(--muted);margin:-.75rem 0 1rem}
.fc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.fc-card{background:var(--card);border:1px solid rgba(201,168,76,.16);border-radius:12px;padding:1.4rem;display:flex;flex-direction:column;transition:border-color .2s,transform .2s;position:relative}
.fc-card:hover{border-color:rgba(201,168,76,.5);transform:translateY(-2px)}
.fc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem}
.fc-cat{font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:600}
.fc-name{font-family:var(--font-d);font-weight:400;font-size:1.35rem;line-height:1.2;margin:.3rem 0 .15rem}
.fc-name a{text-decoration:none}
.fc-name a:after{content:'';position:absolute;inset:0}
.fc-alt{font-size:.85rem;color:rgba(255,255,255,.5)}
.fc-kcal{text-align:right;flex-shrink:0}
.fc-kcal b{display:block;font-family:var(--font-d);font-weight:400;font-size:2rem;color:var(--gold);line-height:1}
.fc-kcal span{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.fc-portion{font-size:.78rem;color:var(--muted);margin:.7rem 0 .8rem}
.fc-macros{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;margin-bottom:.9rem}
.fc-m{background:rgba(255,255,255,.04);border-radius:6px;padding:.5rem;text-align:center}
.fc-m b{display:block;font-size:.95rem}
.fc-m span{font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.fc-pct{font-size:.78rem;color:rgba(255,255,255,.78);margin-bottom:.4rem}
.fc-bar{height:4px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden;margin-bottom:.9rem}
.fc-bar i{display:block;height:100%;background:var(--gold);border-radius:4px}
.fc-swap{font-size:.82rem;line-height:1.5;color:rgba(255,255,255,.82);background:rgba(201,168,76,.07);border-left:2px solid var(--gold);padding:.6rem .75rem;border-radius:0 6px 6px 0;margin-top:auto}
.fc-swap strong{color:var(--gold)}
.fc-more{display:inline-block;margin-top:.9rem;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--gold)}
.fc-none{display:none;text-align:center;color:var(--muted);padding:2rem}
.fc-note{font-size:.75rem;color:rgba(255,255,255,.5);text-align:center;margin:1.5rem 0 0;line-height:1.6}
.fc-lead{max-width:860px;margin:4rem auto 0;border:1px solid rgba(201,168,76,.35);background:linear-gradient(135deg,rgba(201,168,76,.10),rgba(201,168,76,.03));border-radius:14px;padding:2.2rem;display:grid;grid-template-columns:1.1fr 1fr;gap:2rem;align-items:center}
.fc-lead h2{font-family:var(--font-d);font-weight:400;font-size:1.75rem;line-height:1.2;margin-bottom:.6rem}
.fc-lead h2 em{color:var(--gold)}
.fc-lead p{color:var(--muted);font-size:.9rem;line-height:1.6}
.fc-lead form{display:flex;flex-direction:column;gap:.6rem}
.fc-lead input{padding:.85rem 1rem;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:#111;color:#fff;font-size:.92rem;font-family:inherit}
.fc-lead button,.fc-btn{padding:.9rem 1.2rem;border:0;border-radius:6px;background:var(--gold);color:#0a0a0a;font-weight:700;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block;text-align:center}
.fc-small{font-size:.72rem;color:rgba(255,255,255,.5)}
.fc-done{display:none;color:var(--gold);font-weight:600}
#free-guide{scroll-margin-top:90px}
.fc-teaser{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1.5rem;padding:1rem 1.3rem;border:1px dashed rgba(201,168,76,.55);border-radius:10px;color:#fff;text-decoration:none;font-size:.92rem;line-height:1.5}
.fc-teaser b{color:var(--gold);white-space:nowrap;font-size:.85rem}
.fc-teaser span b{color:var(--gold)}
.fc-guide-cover{float:right;margin:0 0 .8rem 1rem;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.5);width:96px;height:auto}
[dir=rtl] .fc-guide-cover{float:left;margin:0 1rem .8rem 0}
@media(max-width:640px){.fc-teaser{flex-direction:column;align-items:flex-start;gap:.4rem}.fc-guide-cover{width:80px}}
.fc-cta{text-align:center;margin:4rem auto 5rem;max-width:640px}
.fc-cta h2{font-family:var(--font-d);font-weight:400;font-size:1.8rem;margin-bottom:.6rem}
.fc-cta p{color:var(--muted);margin-bottom:1.4rem;line-height:1.6}
.fc-ghost{background:none;border:1px solid var(--gold);color:var(--gold);margin-left:.5rem}
.fc-pt{margin-top:1.5rem;border:1px solid rgba(201,168,76,.45);background:linear-gradient(135deg,rgba(201,168,76,.13),rgba(201,168,76,.03));border-radius:14px;padding:1.75rem;display:grid;grid-template-columns:1.4fr 1fr;gap:1.5rem;align-items:center}
.fc-pt h2{font-family:var(--font-d);font-weight:400;font-size:1.6rem;line-height:1.2;margin:.5rem 0 .6rem}
.fc-pt p{color:rgba(255,255,255,.82);font-size:.92rem;line-height:1.6}
.fc-pt ul{list-style:none;display:flex;flex-wrap:wrap;gap:.4rem .9rem;margin-top:.9rem;font-size:.8rem;color:var(--gold);font-weight:600}
.fc-pt li:before{content:'✓ ';}
.fc-pt-act{display:flex;flex-direction:column;gap:.6rem}
.fc-pt-act .fc-ghost{margin:0}
@media(max-width:760px){.fc-pt{grid-template-columns:1fr;padding:1.35rem}}
.sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.fp-crumb{font-size:.75rem;color:var(--muted);margin-bottom:1rem}
.fp-crumb a{color:var(--gold);text-decoration:none}
.fp-main{display:grid;grid-template-columns:1.2fr 1fr;gap:1.5rem;align-items:start}
.fp-box{background:var(--card);border:1px solid rgba(201,168,76,.18);border-radius:14px;padding:1.75rem}
.fp-big{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap}
.fp-big b{font-family:var(--font-d);font-weight:400;font-size:4rem;color:var(--gold);line-height:1}
.fp-big span{color:var(--muted);font-size:.9rem}
.fp-mac{margin-top:1.4rem;display:flex;flex-direction:column;gap:.85rem}
.fp-row{display:grid;grid-template-columns:96px 1fr 52px;align-items:center;gap:.75rem;font-size:.85rem}
.fp-row .fc-bar{margin:0;height:8px}
.fp-row b{text-align:right}
.fp-h{font-family:var(--font-d);font-weight:400;font-size:1.35rem;margin-bottom:1rem}
.fp-table{width:100%;border-collapse:collapse;font-size:.88rem}
.fp-table td{padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,.07)}
.fp-table td:last-child{text-align:right;color:var(--gold);font-weight:600;white-space:nowrap;padding-left:1rem}
.fp-table tr.tot td{border-bottom:0;font-weight:700;color:#fff}
.fp-walk{display:flex;align-items:baseline;gap:.5rem;margin:1.4rem 0 .3rem}
.fp-walk b{font-family:var(--font-d);font-weight:400;font-size:2.4rem;color:var(--gold);line-height:1}
.fp-p{color:rgba(255,255,255,.82);line-height:1.65;font-size:.95rem}
.fp-sec{margin-top:1.5rem}
.fp-faq details{border-bottom:1px solid rgba(255,255,255,.08);padding:1rem 0}
.fp-faq summary{cursor:pointer;font-weight:600;list-style:none;display:flex;justify-content:space-between;gap:1rem}
.fp-faq summary::-webkit-details-marker{display:none}
.fp-faq summary:after{content:'+';color:var(--gold);font-size:1.2rem;line-height:1}
.fp-faq details[open] summary:after{content:'–'}
.fp-faq p{color:var(--muted);font-size:.9rem;line-height:1.65;margin-top:.6rem}
.fp-rel{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem}
.fp-rel a{background:var(--card);border:1px solid rgba(201,168,76,.16);border-radius:10px;padding:1rem;text-decoration:none;display:flex;justify-content:space-between;align-items:center;gap:.75rem;font-size:.9rem}
.fp-rel a:hover{border-color:rgba(201,168,76,.5)}
.fp-rel a b{color:var(--gold);font-family:var(--font-d);font-weight:400;font-size:1.15rem;white-space:nowrap}
.fp-back{display:inline-block;margin-top:1rem;color:var(--gold);font-weight:700;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;text-decoration:none}
@media(max-width:960px){.fc-grid{grid-template-columns:1fr 1fr}.fp-main{grid-template-columns:1fr}.fc-lead{grid-template-columns:1fr}}
@media(max-width:640px){.fc-hero{padding:6.5rem 1rem 2rem}.fc-wrap{padding:0 1rem}.fc-tools{grid-template-columns:1fr}.fc-grid{grid-template-columns:1fr}.fp-rel{grid-template-columns:1fr}.fc-lead{padding:1.5rem}.fp-big b{font-size:3.2rem}.fc-ghost{margin:.6rem 0 0}.fp-box{padding:1.35rem}}
'''
CSS_AR = '''
body{font-family:'Tajawal','DM Sans',sans-serif}
.fc-hero h1,.fc-name,.fc-lead h2,.fc-pt h2,.fc-cta h2,.fp-h,.fc-kcal b,.fp-big b,.fp-walk b,.fp-rel a b{font-family:'Tajawal',sans-serif!important;font-weight:800}
.fc-hero h1{line-height:1.35}
.fc-hero h1 em,.fc-lead h2 em{font-style:normal}
.fc-tag,.fc-cat,.fc-m span,.fc-kcal span,.fc-more,.fc-chip,.fc-lead button,.fc-btn,.fp-back{letter-spacing:0!important;text-transform:none!important}
.fc-kcal{text-align:left}
.fc-swap{border-left:0;border-right:2px solid var(--gold);border-radius:6px 0 0 6px}
.fp-row b{text-align:left}
.fp-table td:last-child{text-align:left;padding-left:0;padding-right:1rem}
.fc-ghost{margin-left:0;margin-right:.5rem}
.fc-name a:after{left:0;right:0}
.eyebrow,.mm-header .mm-links a,.mm-cta,.mm-drop-btn{letter-spacing:0!important}
.ar-head .mm-links a,.ar-head .mm-cta,.ar-menu a{font-family:'Tajawal',sans-serif!important;font-size:0.95rem;text-transform:none!important}
.lang-switch{border:1px solid rgba(201,168,76,0.4);border-radius:3px;padding:0.35rem 0.7rem!important}
@media(max-width:640px){.fc-ghost{margin:.6rem 0 0}}
'''

SEARCH_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'

def head(lang, title, desc, path, alt_path, ld):
    t_en = f'{SITE}{alt_path if lang == "ar" else path}'
    t_ar = f'{SITE}{path if lang == "ar" else alt_path}'
    canon = f'{SITE}{path}'
    fonts = read(f'_tools/food/fonts_{lang}.html').strip()  # self-hosted fonts, same as the rest of the site
    lds = '\n'.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    return f'''<!DOCTYPE html>
<html lang="{lang}"{' dir="rtl"' if lang == 'ar' else ''}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1QXTWXK4LB"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-1QXTWXK4LB');</script>
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{canon}">
<link rel="alternate" hreflang="en" href="{t_en}">
<link rel="alternate" hreflang="ar" href="{t_ar}">
<link rel="alternate" hreflang="x-default" href="{t_en}">
<link rel="icon" type="image/png" href="/logo.png">
<meta property="og:type" content="website"><meta property="og:url" content="{canon}"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}/og-home.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:site_name" content="Mr &amp; Mrs Lifestyle"><meta property="og:locale" content="{'ar_AE' if lang == 'ar' else 'en_AE'}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{SITE}/og-home.jpg">
{fonts}
<style>{CSS}</style>
<link rel="stylesheet" href="/site.css">
{'<style>' + CSS_AR + '</style>' if lang == 'ar' else ''}
{lds}
</head>
<body>
{mark_active(EN_HEADER) if lang == 'en' else AR_HEADER}<main id="main">
'''

def lead_box(lang, what, src):
    t = T[lang]
    return f'''<section class="fc-lead" id="free-guide">
  <div>
    <div class="fc-tag" style="margin-bottom:.8rem">{t['lead_tag']}</div>
    <img class="fc-guide-cover" src="/guides/dubai-eating-out-guide{'-ar' if lang == 'ar' else ''}-cover.jpg" width="120" height="170" alt="" loading="lazy">
    <h2>{t['lead_h'].format(what=esc(what))}</h2>
    <p>{t['lead_p']}</p>
  </div>
  <form onsubmit="return fcLead(event)" data-src="{esc(src)}">
    <label class="sr" for="fcName">{t['ph_name']}</label><input id="fcName" type="text" required placeholder="{t['ph_name']}" autocomplete="given-name">
    <label class="sr" for="fcEmail">{t['ph_email']}</label><input id="fcEmail" type="email" required placeholder="{t['ph_email']}" autocomplete="email">
    <button type="submit">{t['lead_btn']}</button>
    <div class="fc-small">{t['nospam']}</div>
    <div class="fc-done" id="fcDone" role="status">{t['thanks']}<a class="fc-btn" href="{t['guide_pdf']}" target="_blank" rel="noopener" style="margin-top:.6rem;display:block">{t['dl_btn']}</a></div>
  </form>
</section>'''

LEAD_JS = '''<script>
function fcLead(e){e.preventDefault();var f=e.target,b=f.querySelector('button');
 var n=document.getElementById('fcName').value.trim(),m=document.getElementById('fcEmail').value.trim();
 b.disabled=true;b.style.display='none';
 fetch('https://formspree.io/f/xvzdnogv',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
  body:JSON.stringify({_subject:'\\ud83d\\udccb New Eating-Out Guide Download \\u2014 '+n,name:n,email:m,_replyto:m,goal:'Dubai Eating-Out Guide',daily_target:(function(){try{return localStorage.getItem('mmTarget')||''}catch(x){return ''}})(),language:document.documentElement.lang,landing_page:location.pathname,source:f.getAttribute('data-src')})}).catch(function(){});
 if(window.gtag)gtag('event','generate_lead',{lead_type:'eating_out_guide',source:f.getAttribute('data-src')});
 document.getElementById('fcDone').style.display='block';return false;}
</script>'''

def teaser(lang):
    t = T[lang]
    return f'<a class="fc-teaser" href="#free-guide"><span>{t["teaser"]}</span><b>{t["teaser_btn"]}</b></a>'

def cta(lang, h):
    t = T[lang]
    return f'''<div class="fc-cta">
    <h2>{h}</h2>
    <p>{t['cta_p']}</p>
    <a class="fc-btn" href="{t['cta1'][1]}">{t['cta1'][0]}</a><a class="fc-btn fc-ghost" href="{t['cta2'][1]}">{t['cta2'][0]}</a>
  </div>'''

def tail(lang):
    footer = EN_FOOTER if lang == 'en' else AR_FOOTER
    return f'''</main>
{footer}{LEAD_JS}
<script src="/shared.js" defer></script>
{'<script src="/chat-widget.js" defer></script>' if lang == 'en' else ''}
<script src="/track.js" defer></script>
</body>
</html>
'''

def crumbs_ld(lang, items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(items)]}

# ---------- HUB ----------
def build_hub(lang):
    t = T[lang]; n = len(FOODS)
    cards = []
    for f in FOODS:
        name, alt = (f['en'], f['ar']) if lang == 'en' else (f['ar'], f['en'])
        extra = ''
        if f['cat'] == 'Pasta & Pizza': extra = 'pizza بيتزا' if 'pizza' in f['slug'] else 'pasta باستا معكرونة'
        elif f['cat'] == 'Chocolates': extra = 'chocolate شوكولاتة'
        q = ' '.join([f['en'], f['ar'], f['slug'].replace('-', ' '), extra, f.get('kw', '')]).lower()
        cards.append(f'''<article class="fc-card" data-cat="{esc(f['cat'])}" data-q="{esc(q)}" data-kcal="{f['kcal']}">
  <div class="fc-top"><div><div class="fc-cat">{esc(L(f, lang, 'cat'))}</div><h2 class="fc-name"><a href="{url(f, lang)}">{esc(name)}</a></h2><div class="fc-alt" lang="{'ar' if lang == 'en' else 'en'}">{esc(alt)}</div></div>
  <div class="fc-kcal"><b>{num(f['kcal'])}</b><span>{t['kcal']}</span></div></div>
  <div class="fc-portion">{esc(L(f, lang, 'portion'))}</div>
  <div class="fc-macros"><div class="fc-m"><b>{f['p']}{t['g']}</b><span>{t['protein']}</span></div><div class="fc-m"><b>{f['c']}{t['g']}</b><span>{t['carbs']}</span></div><div class="fc-m"><b>{f['f']}{t['g']}</b><span>{t['fat']}</span></div></div>
  <div class="fc-pct"></div><div class="fc-bar"><i></i></div>
  <div class="fc-swap"><strong>{t['swap']}</strong> {esc(L(f, lang, 'swap'))}</div>
  <span class="fc-more">{t['more']}</span>
</article>''')
    chips = f'<button type="button" class="fc-chip on" data-c="All">{t["all"]}</button>' + ''.join(
        f'<button type="button" class="fc-chip" data-c="{esc(c)}">{esc(c if lang == "en" else a)}</button>' for c, a in CATS)
    path, alt = hub_url(lang), hub_url('ar' if lang == 'en' else 'en')
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": T[lang]['hub_title'].replace('&amp;', '&'), "url": SITE + path, "inLanguage": lang,
           "mainEntity": {"@type": "ItemList", "numberOfItems": n, "itemListElement": [
               {"@type": "ListItem", "position": i + 1, "name": L(f, lang, 'name'), "url": SITE + url(f, lang)} for i, f in enumerate(FOODS)]}},
          crumbs_ld(lang, [(t['home'], '/ar/' if lang == 'ar' else '/'), (t['tag_page'], path)])]
    s = head(lang, t['hub_title'], t['hub_desc'].format(n=n), path, alt, ld)
    pct_tpl = json.dumps(t['pct'], ensure_ascii=False)
    s += f'''
<div class="fc-hero">
  <div class="fc-tag">{t['tag_hub']}</div>
  <h1>{t['hub_h1']}</h1>
  <p class="fc-sub">{t['hub_sub'].format(n=n)}</p>
</div>
<div class="fc-wrap">
  {teaser(lang)}
  <p style="margin-top:1rem;font-size:.95rem"><a href="{'/ar' if lang == 'ar' else ''}/calories/mcdonalds-uae.html" style="color:var(--gold);font-weight:600">{'جديد: سعرات ماكدونالدز الإمارات مرتبة من القائمة الرسمية ←' if lang == 'ar' else "New: McDonald's UAE calories, every item ranked from the official menu →"}</a></p>
  <div class="fc-tools" style="margin-top:1.5rem">
    <label class="fc-search">{SEARCH_ICON}<input id="fcQ" type="search" placeholder="{esc(t['search'])}" aria-label="{esc(t['search'])}" autocomplete="off"></label>
    <label class="fc-target">{t['target']} <input id="fcT" type="number" value="2000" min="1000" max="5000" step="50" inputmode="numeric"></label>
  </div>
  <div class="fc-chips" role="group">{chips}</div>
  <div class="fc-grid" id="fcGrid">
{chr(10).join(cards)}
  </div>
  <div class="fc-none" id="fcNone">{t['none']}</div>
  <p class="fc-note">{t['note']}<br>{t['calc_link']}</p>
  {lead_box(lang, t['lead_fav_default'], 'Food Calorie Finder' + (' (Arabic)' if lang == 'ar' else ''))}
  {cta(lang, t['cta_h_hub'])}
</div>
<script>
(function(){{
 var q=document.getElementById('fcQ'),t=document.getElementById('fcT'),cat='All',cards=[].slice.call(document.querySelectorAll('.fc-card')),P={pct_tpl},timer;
 try{{var s=parseFloat(localStorage.getItem('mmTarget'));if(s>0)t.value=Math.round(s);}}catch(e){{}}
 var params=new URLSearchParams(location.search);if(params.get('q'))q.value=params.get('q');
 function norm(v){{return v.toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');}}
 function upd(){{var T=parseFloat(t.value)||2000,v=norm(q.value.trim()),shown=0;
  try{{if(T>=1000)localStorage.setItem('mmTarget',T);}}catch(e){{}}
  cards.forEach(function(c){{var ok=(cat==='All'||c.dataset.cat===cat)&&(!v||norm(c.dataset.q).indexOf(v)>-1);c.style.display=ok?'':'none';if(ok)shown++;
   var pct=Math.round(c.dataset.kcal/T*100);c.querySelector('.fc-pct').textContent=P.replace('{{p}}',pct).replace('{{t}}',T.toLocaleString('en-US'));c.querySelector('.fc-bar i').style.width=Math.min(pct,100)+'%';}});
  document.getElementById('fcNone').style.display=shown?'none':'block';
  clearTimeout(timer);if(v&&window.gtag)timer=setTimeout(function(){{gtag('event','food_search',{{search_term:q.value.trim(),results:shown}});}},1200);}}
 q.addEventListener('input',upd);t.addEventListener('input',upd);
 document.querySelectorAll('.fc-chip').forEach(function(b){{b.addEventListener('click',function(){{document.querySelectorAll('.fc-chip').forEach(function(x){{x.classList.remove('on')}});b.classList.add('on');cat=b.dataset.c;upd();}});}});
 upd();
}})();
</script>
'''
    s += tail(lang)
    write(path.lstrip('/'), s)

# Hand-tuned titles/descriptions (Search Console work) that the templates must not overwrite.
META_OVERRIDES = {
    ('boiled-egg', 'en'): dict(title='Egg Calories: 1 Egg = 78 kcal, 2 Eggs = 155 (Boiled &amp; Fried)',
        desc='How many calories in an egg? 1 large boiled egg is about 78 kcal with 6 g protein, 2 eggs about 155 kcal. Fried, omelette and egg white compared.'),
    ('boiled-egg', 'ar'): dict(title='كم سعرة في البيضة؟ بيضة مسلوقة 78 سعرة وبيضتان 155',
        desc='كم سعرة حرارية في البيضة المسلوقة؟ البيضة الكبيرة حوالي 78 سعرة مع 6 غ بروتين، والبيضتان حوالي 155 سعرة. مقارنة مع البيض المقلي والأومليت.'),
    ('white-rice', 'en'): dict(title='Rice Calories: 1 Cup Cooked = 205 kcal (White, Basmati, Brown)',
        desc='How many calories in rice? 1 cup of cooked white rice is about 205 kcal, 100 g about 130 kcal. Basmati, brown and fried rice compared, plus portion tips.'),
    ('white-rice', 'ar'): dict(title='سعرات الرز: كوب رز مطبوخ 205 سعرة (أبيض وبسمتي وبني)',
        desc='كم سعرة في الرز؟ كوب الرز الأبيض المطبوخ حوالي 205 سعرات، و100 غ حوالي 130 سعرة. مقارنة مع البسمتي والبني والرز المقلي.'),
    ('chicken-breast', 'en'): dict(title='Chicken Breast Calories: 100 g = 165 kcal, 31 g Protein',
        desc='How many calories in chicken breast? 100 g cooked skinless is about 165 kcal with 31 g protein. Grilled, with skin and fried compared.'),
    ('chicken-breast', 'ar'): dict(title='سعرات صدر الدجاج: 100 غرام = 165 سعرة و31 غ بروتين',
        desc='كم سعرة في صدر الدجاج؟ 100 غ مطبوخ بدون جلد حوالي 165 سعرة مع 31 غ بروتين. مقارنة بين المشوي ومع الجلد والمقلي.'),
    ('banana', 'en'): dict(title='Banana Calories: 1 Medium Banana = 105 kcal',
        desc='How many calories in a banana? A medium banana is about 105 kcal, small 90 and large 120. Carbs, protein and when to eat it for fat loss.'),
    ('banana', 'ar'): dict(title='كم سعرة في الموز؟ موزة متوسطة = 105 سعرات',
        desc='كم سعرة حرارية في الموز؟ الموزة المتوسطة حوالي 105 سعرات، والصغيرة 90 والكبيرة 120. الكربوهيدرات ومتى تأكلها أثناء خسارة الدهون.'),
    ('chicken-shawarma', 'en'): dict(
        title='Chicken Shawarma Wrap Calories: 550 kcal (With Garlic Sauce)',
        desc='About 550 kcal with garlic sauce &amp; fries inside. Skip the fries and get the sauce on the side and it drops to 400 kcal. Every option compared + full macros.'),
    ('chicken-shawarma', 'ar'): dict(
        desc='شاورما دجاج: حوالي 550 سعرة لـ ساندويش عادي (مع الثوم والبطاطا داخله)، لكنها تتراوح من 400 إلى 950 سعرة حسب طريقة الطلب. قارن كل الخيارات واحصل على بديل أخف.'),
}

def pt_box(f, lang, name):
    """1-to-1 PT box shown under the calorie numbers: turns calorie readers into gym enquiries."""
    t = T[lang]
    from urllib.parse import quote
    wa = 'https://wa.me/971507871515?text=' + quote(t['pt_wa'].format(name=name))
    facts = ''.join(f'<li>{x}</li>' for x in t['pt_facts'])
    return f'''<section class="fc-pt" aria-label="{esc(t['pt_tag'])}">
    <div>
      <div class="fc-tag">{t['pt_tag']}</div>
      <h2>{t['pt_h'].format(name=esc(name))}</h2>
      <p>{t['pt_p']}</p>
      <ul>{facts}</ul>
    </div>
    <div class="fc-pt-act">
      <a class="fc-btn" href="{esc(wa)}" target="_blank" rel="noopener" onclick="if(window.gtag)gtag('event','pt_whatsapp_click',{{source:'food_{f['slug']}_{lang}'}})">{t['pt_btn']}</a>
      <a class="fc-btn fc-ghost" href="{t['pt_btn2'][1]}">{t['pt_btn2'][0]}</a>
    </div>
  </section>'''

# ---------- FOOD PAGE ----------
def build_page(f, lang):
    t = T[lang]; n = len(FOODS)
    name, portion, swap = L(f, lang, 'name'), L(f, lang, 'portion'), L(f, lang, 'swap')
    portion_l = portion[0].lower() + portion[1:] if lang == 'en' else portion
    pct2000 = round(f['kcal'] / 2000 * 100); walk = max(1, round(f['kcal'] / 5))
    fmt = dict(name=name, kcal=num(f['kcal']), p=f['p'], c=f['c'], f=f['f'], portion=portion, portion_l=portion_l, pct=pct2000, walk=walk, swap=swap)
    faqs = [(q.format(**fmt), a.format(**fmt)) for q, a in t['faq']]
    for item in f.get('faqs', []):
        faqs.append((item[0], item[1]) if lang == 'en' else (item[2], item[3]))
    path, alt = url(f, lang), url(f, 'ar' if lang == 'en' else 'en')
    hub = hub_url(lang)
    ld = [{"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": lang,
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]},
          crumbs_ld(lang, [(t['home'], '/ar/' if lang == 'ar' else '/'), (t['tag_page'], hub), (name, path)])]
    title = t['page_title'].format(name=esc(name), kcal=num(f['kcal']))
    desc = t['page_desc'].format(name=esc(name), kcal=num(f['kcal']), p=f['p'], portion=esc(portion_l))
    ov = META_OVERRIDES.get((f['slug'], lang), {})
    title, desc = ov.get('title', title), ov.get('desc', desc)
    s = head(lang, title, desc, path, alt, ld)
    mx = max(f['p'] * 4, f['c'] * 4, f['f'] * 9, 1)
    def row(lbl, g, kc): return f'<div class="fp-row"><span>{lbl}</span><div class="fc-bar"><i style="width:{kc / mx * 100:.0f}%"></i></div><b>{g}{t['g']}</b></div>'
    fits = ''.join(f'<tr><td>{lbl}</td><td>{round(f["kcal"] / kc * 100)}%</td></tr>' for kc, lbl in t['fits_rows'])
    extra = ''
    if f.get('inside'):
        rows = ''.join(f'<tr><td>{esc(a if lang == "en" else b)}</td><td>~{num(k)} {t["kcal"]}</td></tr>' for a, b, k in f['inside'])
        extra += f'<div class="fp-box"><h2 class="fp-h">{t["inside"]}</h2><table class="fp-table">{rows}<tr class="tot"><td>{t["total"]}</td><td>~{num(f["kcal"])} {t["kcal"]}</td></tr></table></div>'
    if f.get('compare'):
        rows = ''.join(f'<tr><td>{esc(a if lang == "en" else b)}</td><td>~{num(k)} {t["kcal"]}</td></tr>' for a, b, k in f['compare'])
        extra += f'<div class="fp-box"><h2 class="fp-h">{t["compare"].format(name=esc(name))}</h2><table class="fp-table">{rows}</table></div>'
    same = [x for x in FOODS if x['cat'] == f['cat'] and x is not f]
    i = FOODS.index(f)
    same = sorted(same, key=lambda x: (FOODS.index(x) - i) % len(FOODS))[:3]
    rel = ''.join(f'<a href="{url(x, lang)}"><span>{esc(L(x, lang, "name"))}</span><b>{num(x["kcal"])}</b></a>' for x in same)
    a_art = 'a ' if lang == 'en' and f['slug'] in ('chicken-shawarma',) else ''
    pct_tpl = json.dumps(t['pct'], ensure_ascii=False)
    s += f'''
<div class="fc-hero" style="padding-bottom:2rem">
  <div class="fc-tag">{t['tag_page']}</div>
  <h1>{t['page_h1'].format(a=a_art, name=esc(name))}</h1>
  <p class="fc-sub">{t['page_sub'].format(kcal=num(f['kcal']), portion_l=esc(portion_l))}</p>
</div>
<div class="fc-wrap">
  <nav class="fp-crumb" aria-label="breadcrumb"><a href="{'/ar/' if lang == 'ar' else '/'}">{t['home']}</a> › <a href="{hub}">{t['tag_page']}</a> › {esc(name)}</nav>
  <div class="fp-main">
    <div class="fp-box">
      <div class="fc-cat">{esc(L(f, lang, 'cat'))} · <span lang="{'ar' if lang == 'en' else 'en'}">{esc(f['ar'] if lang == 'en' else f['en'])}</span></div>
      <div class="fp-big" style="margin-top:.6rem"><b>{num(f['kcal'])}</b><span>{t['per'].format(portion=esc(portion))}</span></div>
      <div class="fp-mac">{row(t['protein'], f['p'], f['p'] * 4)}{row(t['carbs'], f['c'], f['c'] * 4)}{row(t['fat'], f['f'], f['f'] * 9)}</div>
      <div class="fc-pct" style="margin-top:1.4rem" id="fpPct">{t['pct'].format(p=pct2000, t='2,000')}</div><div class="fc-bar"><i id="fpBar" style="width:{min(pct2000, 100)}%"></i></div>
      <div class="fc-small">{t['day_note']} <a href="{'/ar' if lang == 'ar' else ''}/calculator.html" style="color:var(--gold)">{t['find']}</a></div>
    </div>
    <div class="fp-box">
      <h2 class="fp-h">{t['fits']}</h2>
      <table class="fp-table">{fits}</table>
      <div class="fp-walk"><b>{walk}</b><span>{t['walk_unit']}</span></div>
      <div class="fp-p" style="font-weight:600">{t['walk']}</div>
      <div class="fc-small" style="margin-top:.3rem">{t['walk_note']}</div>
    </div>
  </div>
  {teaser(lang)}
  {pt_box(f, lang, name)}
  <div class="fp-main fp-sec">
    <div class="fp-box">
      <h2 class="fp-h">{t['swap_h']}</h2>
      <p class="fp-p">{esc(swap)}</p>
    </div>
    <div class="fp-box">
      <h2 class="fp-h">{t['coach_h']}</h2>
      <p class="fp-p">{coach_take(f, t)}</p>
    </div>
  </div>
  {'<div class="fp-main fp-sec">' + extra + '</div>' if extra else ''}
  <div class="fp-box fp-sec fp-faq">
    <h2 class="fp-h">{t['faq_h']}</h2>
    {''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faqs)}
  </div>
  {lead_box(lang, name, 'Food Calories – ' + f['en'] + (' (Arabic)' if lang == 'ar' else ''))}
  <div class="fp-sec" style="margin-top:3rem">
    <h2 class="fp-h">{t['rel_h']}</h2>
    <div class="fp-rel">{rel}</div>
    <a class="fp-back" href="{hub}">{t['back'].format(n=n)}</a>
  </div>
  <p class="fc-note">{t['note']}</p>
  {cta(lang, t['cta_h_page'].format(name=esc(name)))}
</div>
<script>
(function(){{try{{var T=parseFloat(localStorage.getItem('mmTarget'));if(T>0){{var p=Math.round({f['kcal']}/T*100);document.getElementById('fpPct').textContent={pct_tpl}.replace('{{p}}',p).replace('{{t}}',Math.round(T).toLocaleString('en-US'));document.getElementById('fpBar').style.width=Math.min(p,100)+'%';}}}}catch(e){{}}}})();
</script>
'''
    s += tail(lang)
    write(path.lstrip('/'), s)

def build():
    assert 'dubai-food-calories.html' in EN_HEADER, 'Run the menu update first so the EN header links the tool'
    for lang in ('en', 'ar'):
        build_hub(lang)
        for f in FOODS:
            build_page(f, lang)
    update_sitemap()
    print(f'Built 2 hubs + {len(FOODS) * 2} food pages; sitemap updated')

def update_sitemap():
    import datetime, re
    today = datetime.date.today().isoformat()
    sm = read('sitemap.xml')
    sm = re.sub(r'\n  <!-- FOOD-CALORIES:START -->.*?<!-- FOOD-CALORIES:END -->', '', sm, flags=re.S)
    urls = [(hub_url('en'), '0.8'), (hub_url('ar'), '0.7')] + [(url(f, l), '0.6') for l in ('en', 'ar') for f in FOODS]
    block = '\n  <!-- FOOD-CALORIES:START -->\n' + ''.join(
        f'  <url>\n    <loc>{SITE}{u}</loc>\n    <lastmod>{today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>{pr}</priority>\n  </url>\n' for u, pr in urls) + '  <!-- FOOD-CALORIES:END -->'
    sm = sm.replace('\n</urlset>', block + '\n</urlset>')
    write('sitemap.xml', sm)

if __name__ == '__main__':
    build()
