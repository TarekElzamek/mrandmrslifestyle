# Builds fast-food chain calorie pages (EN + AR) from official chain nutrition data.
# Run from repo root:  python3 _tools/chains/build.py
import os, sys, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, '_tools', 'food'))
import build as fb

# McDonald's UAE, official product pages (mcdonalds.com/ae/en-ae/product/...), checked 29 Oct 2026.
# (slug, en, ar, group, kcal, protein, carbs, fat, serving)
MCD = [
 ('big-tasty', 'Big Tasty', 'بيج تيستي', 'beef', 793, 44, 60, 43, '351 g'),
 ('grand-chicken', 'Grand Chicken', 'جراند تشيكن', 'chicken', 765, 37, 75, 36, '321 g'),
 ('mccrispy-deluxe', 'McCrispy Deluxe', 'ماك كرسبي ديلوكس', 'chicken', 718, 33, 61, 38, '263 g'),
 ('mccrispy', 'McCrispy', 'ماك كرسبي', 'chicken', 619, 28, 58, 30, '217 g'),
 ('big-mac', 'Big Mac', 'بيج ماك', 'beef', 564, 23, 46, 30, '224 g'),
 ('mcarabia-chicken', 'McArabia Chicken', 'ماك عربية دجاج', 'chicken', 562, 29, 56, 25, '258 g'),
 ('chicken-mac', 'Chicken Mac', 'تشيكن ماك', 'chicken', 558, 26, 55, 26, '226 g'),
 ('quarter-pounder-with-cheese', 'Quarter Pounder with Cheese', 'كوارتر باوندر بالجبن', 'beef', 536, 33, 41, 27, '206 g'),
 ('double-cheese-burger', 'Double Cheeseburger', 'دبل تشيز برجر', 'beef', 450, 21, 34, 24, '169 g'),
 ('big-breakfast', 'Big Breakfast', 'بيج بريكفاست', 'breakfast', 431, 29, 28, 18, '211 g'),
 ('mcchicken', 'McChicken', 'ماك تشيكن', 'chicken', 428, 18, 48, 18, '182 g'),
 ('oreo-mcflurry', 'McFlurry Oreo', 'ماك فلوري أوريو', 'sides', 372, 9, 60, 13, '212 g'),
 ('filet-o-fish', 'Filet-O-Fish', 'فيليه أو فيش', 'chicken', 337, 15, 40, 13, '138 g'),
 ('egg-mcmuffin', 'Egg McMuffin', 'إيج ماك مافن', 'breakfast', 315, 20, 30, 13, '142 g'),
 ('cheeseburger', 'Cheeseburger', 'تشيز برجر', 'beef', 305, 13, 32, 13, '116 g'),
 ('beef-burger', 'Beef Burger', 'بيف برجر', 'beef', 254, 11, 31, 9, '101 g'),
 ('small-fries', 'Fries (small)', 'بطاطا (صغير)', 'sides', 250, 3, 33, 12, '80 g'),
 ('chicken-tenders', 'Chicken Tenders', 'تشيكن تندرز', 'chicken', 245, 19, 17, 11, '110 g'),
 ('hashbrowns', 'Hash Browns', 'هاش براون', 'breakfast', 173, 2, 17, 11, '57 g'),
 ('chicken-mcnuggets-4-pieces', 'Chicken McNuggets (4 pieces)', 'تشيكن ماك ناجتس (4 قطع)', 'chicken', 153, 10, 10, 8, '63 g'),
 ('ice-cream-cone', 'Ice Cream Cone', 'آيس كريم كون', 'sides', 148, 4, 25, 4, '93 g'),
]
BY = {x[0]: x for x in MCD}

T = {
 'en': dict(
  path='/calories/mcdonalds-uae.html', alt='/ar/calories/mcdonalds-uae.html',
  title="McDonald's UAE Calories: Every Item Ranked + Lightest Picks",
  desc="McDonald's UAE calories from the official menu: Big Mac 564 kcal, Big Tasty 793, McChicken 428. Every burger ranked, plus the lightest and highest-protein picks.",
  tag="Fast-food calories · McDonald's UAE", h1="McDonald's UAE Calories: <em>Every Item Ranked</em>",
  sub="Official calories, protein, carbs and fat for the McDonald's UAE menu, sorted from highest to lowest, plus how our coaches would order if you're losing fat.",
  crumb="McDonald's UAE",
  picks_h="Coach's picks: the lightest choices", picks=[('beef-burger', 'Lowest-calorie burger on the menu.'), ('chicken-tenders', 'Best protein for the calories.'),
     ('egg-mcmuffin', 'The best breakfast pick: 20 g protein.'), ('chicken-mcnuggets-4-pieces', 'A light side or snack.')],
  table_h="Every item, highest to lowest", c=['Item', 'kcal', 'Protein', 'Carbs', 'Fat'],
  groups={'beef': 'Beef burgers', 'chicken': 'Chicken & fish', 'breakfast': 'Breakfast', 'sides': 'Sides & desserts'},
  meals_h="3 smarter McDonald's meals",
  meals=[('Cheeseburger + 4 McNuggets + Coke Zero', ['cheeseburger', 'chicken-mcnuggets-4-pieces']),
         ('Egg McMuffin + Americano', ['egg-mcmuffin']),
         ('Big Mac + Coke Zero, no fries', ['big-mac'])],
  meal_note='Zero-sugar drinks and black coffee add almost no calories.',
  tips_h="How to cut calories at McDonald's",
  tips=['Skip the fries or share them: a small portion alone is 250 kcal.', 'Choose a zero-sugar drink: a regular soft drink can add 150 kcal or more.',
        'Pick grilled-style or simpler burgers: the Beef Burger is 254 kcal, the Big Tasty is 793.', 'Ask for no mayo or sauce on chicken burgers to save around 100 kcal.'],
  src="Figures from McDonald's UAE official nutrition information (mcdonalds.com/ae), checked on 29 October 2026, without customisations. Recipes and portions can change. Mr &amp; Mrs Lifestyle is not affiliated with McDonald's.",
  faq=[("How many calories are in a Big Mac in the UAE?", "A Big Mac at McDonald's UAE is 564 kcal, with 23 g protein, 46 g carbs and 30 g fat (224 g serving)."),
       ("What is the lowest-calorie burger at McDonald's UAE?", "The Beef Burger, at 254 kcal. The Cheeseburger is next at 305 kcal."),
       ("What is the highest-protein choice at McDonald's UAE?", "The Big Tasty has the most protein (44 g) but also 793 kcal. For protein per calorie, Chicken Tenders (19 g protein for 245 kcal) and the Egg McMuffin (20 g for 315 kcal) are the best picks."),
       ("Can I eat McDonald's and still lose weight?", "Yes, occasionally. Fat loss depends on your total calories across the day. A Big Mac with a zero-sugar drink and no fries is 564 kcal, which fits into most fat-loss days.")],
  hub_link="McDonald's UAE calories, ranked →",
 ),
 'ar': dict(
  path='/ar/calories/mcdonalds-uae.html', alt='/calories/mcdonalds-uae.html',
  title='سعرات ماكدونالدز الإمارات: كل الوجبات مرتبة + الخيارات الأخف',
  desc='سعرات ماكدونالدز الإمارات من القائمة الرسمية: بيج ماك 564 سعرة، بيج تيستي 793، ماك تشيكن 428. كل البرجر مرتب، مع الخيارات الأخف والأعلى بروتينًا.',
  tag='سعرات الوجبات السريعة · ماكدونالدز الإمارات', h1='سعرات ماكدونالدز <em>الإمارات</em>',
  sub='السعرات والبروتين والكربوهيدرات والدهون الرسمية لقائمة ماكدونالدز الإمارات، مرتبة من الأعلى للأقل، وكيف يطلب مدربونا إذا كنت تخسر الدهون.',
  crumb='ماكدونالدز الإمارات',
  picks_h='اختيارات المدرب: الأخف', picks=[('beef-burger', 'أقل برجر سعرات في القائمة.'), ('chicken-tenders', 'أفضل بروتين مقابل السعرات.'),
     ('egg-mcmuffin', 'أفضل خيار للفطور: 20 غ بروتين.'), ('chicken-mcnuggets-4-pieces', 'طبق جانبي أو سناك خفيف.')],
  table_h='كل الأصناف من الأعلى للأقل', c=['الصنف', 'سعرة', 'بروتين', 'كربوهيدرات', 'دهون'],
  groups={'beef': 'برجر لحم', 'chicken': 'دجاج وسمك', 'breakfast': 'الفطور', 'sides': 'أطباق جانبية وحلويات'},
  meals_h='3 وجبات أذكى من ماكدونالدز',
  meals=[('تشيز برجر + 4 قطع ناجتس + كوكا كولا زيرو', ['cheeseburger', 'chicken-mcnuggets-4-pieces']),
         ('إيج ماك مافن + أمريكانو', ['egg-mcmuffin']),
         ('بيج ماك + كوكا كولا زيرو بدون بطاطا', ['big-mac'])],
  meal_note='المشروبات بدون سكر والقهوة السوداء لا تضيف سعرات تقريبًا.',
  tips_h='كيف تقلل السعرات في ماكدونالدز',
  tips=['استغنِ عن البطاطا أو شاركها: الحصة الصغيرة وحدها 250 سعرة.', 'اختر مشروبًا بدون سكر: المشروب الغازي العادي قد يضيف 150 سعرة أو أكثر.',
        'اختر البرجر الأبسط: بيف برجر 254 سعرة، وبيج تيستي 793.', 'اطلب برجر الدجاج بدون مايونيز أو صوص لتوفر حوالي 100 سعرة.'],
  src='الأرقام من معلومات التغذية الرسمية لماكدونالدز الإمارات (mcdonalds.com/ae)، تم التحقق منها في 29 أكتوبر 2026، بدون أي تعديلات على الطلب. الوصفات والحصص قد تتغير. Mr &amp; Mrs Lifestyle غير تابعة لماكدونالدز.',
  faq=[('كم سعرة في بيج ماك في الإمارات؟', 'بيج ماك في ماكدونالدز الإمارات يحتوي على 564 سعرة، مع 23 غ بروتين و46 غ كربوهيدرات و30 غ دهون (حصة 224 غ).'),
       ('ما هو أقل برجر سعرات في ماكدونالدز الإمارات؟', 'بيف برجر بـ 254 سعرة، ثم التشيز برجر بـ 305 سعرات.'),
       ('ما هو الخيار الأعلى بروتينًا في ماكدونالدز الإمارات؟', 'بيج تيستي فيه أكثر بروتين (44 غ) لكنه 793 سعرة. أما مقابل السعرات فأفضل خيار هو تشيكن تندرز (19 غ بروتين مقابل 245 سعرة) وإيج ماك مافن (20 غ مقابل 315 سعرة).'),
       ('هل يمكنني أكل ماكدونالدز وخسارة الوزن؟', 'نعم، من وقت لآخر. خسارة الدهون تعتمد على مجموع سعراتك خلال اليوم. بيج ماك مع مشروب بدون سكر وبدون بطاطا = 564 سعرة، وهذا يناسب معظم أيام خسارة الدهون.')],
  hub_link='سعرات ماكدونالدز الإمارات مرتبة ←',
 ),
}

CSS = '''
.ch-picks{display:grid;grid-template-columns:repeat(4,1fr);gap:.8rem;margin-top:1rem}
.ch-pick{background:#141414;border:1px solid rgba(201,168,76,.35);border-radius:12px;padding:1.1rem}
.ch-pick b{display:block;font-size:2rem;color:var(--gold);font-family:var(--font-d);line-height:1.1}.ch-pick h3{font-size:1rem;margin:.3rem 0}.ch-pick p{font-size:.82rem;color:rgba(255,255,255,.7);line-height:1.5}
.ch-t{width:100%;border-collapse:collapse;font-size:.92rem;margin-top:.6rem}
.ch-t th{text-align:start;color:var(--gold);font-weight:600;padding:.6rem .5rem;border-bottom:1px solid rgba(255,255,255,.15);font-size:.8rem}
.ch-t td{padding:.65rem .5rem;border-bottom:1px solid rgba(255,255,255,.07)}.ch-t td:first-child{font-weight:600}.ch-t td.k{color:var(--gold);font-weight:700}
.ch-g{font-size:.75rem;color:rgba(255,255,255,.5);font-weight:400}
.ch-meals{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-top:1rem}
.ch-meal{background:#141414;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1.1rem}.ch-meal b{color:var(--gold);font-size:1.5rem;display:block}.ch-meal span{font-size:.8rem;color:rgba(255,255,255,.6)}
.ch-tips{margin-top:.8rem;padding-inline-start:1.2rem;color:rgba(255,255,255,.85);line-height:1.9}
.ch-src{font-size:.75rem;color:rgba(255,255,255,.5);margin-top:1.2rem;line-height:1.6}
@media(max-width:760px){.ch-picks{grid-template-columns:1fr 1fr}.ch-meals{grid-template-columns:1fr}.ch-t{font-size:.82rem}.ch-t th:nth-child(4),.ch-t td:nth-child(4){display:none}}
'''

def page(lang):
    t = T[lang]; ar = lang == 'ar'
    nm = lambda x: x[2] if ar else x[1]
    g = 'غ' if ar else 'g'
    picks = ''.join(f'<div class="ch-pick"><b>{BY[s][4]}</b><span class="ch-g">{"سعرة" if ar else "kcal"} · {BY[s][5]} {g} {"بروتين" if ar else "protein"}</span><h3>{nm(BY[s])}</h3><p>{d}</p></div>' for s, d in t['picks'])
    rows = ''.join(f'<tr><td>{nm(x)} <span class="ch-g">· {t["groups"][x[3]]}</span></td><td class="k">{x[4]}</td><td>{x[5]} {g}</td><td>{x[6]} {g}</td><td>{x[7]} {g}</td></tr>'
                   for x in sorted(MCD, key=lambda x: -x[4]))
    meals = ''
    for name, items in t['meals']:
        k = sum(BY[s][4] for s in items); p = sum(BY[s][5] for s in items)
        meals += f'<div class="ch-meal"><b>{k} {"سعرة" if ar else "kcal"}</b><div style="font-weight:600;margin:.3rem 0">{name}</div><span>{p} {g} {"بروتين" if ar else "protein"}</span></div>'
    ld = [{"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": lang,
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in t['faq']]},
          fb.crumbs_ld(lang, [(fb.T[lang]['home'], '/ar/' if ar else '/'), (fb.T[lang]['tag_page'], fb.hub_url(lang)), (t['crumb'], t['path'])])]
    s = fb.head(lang, t['title'], t['desc'], t['path'], t['alt'], ld).replace('</head>', f'<style>{CSS}</style>\n</head>', 1)
    s += f'''
<div class="fc-hero" style="padding-bottom:1.5rem">
  <div class="fc-tag">{t['tag']}</div>
  <h1>{t['h1']}</h1>
  <p class="fc-sub">{t['sub']}</p>
</div>
<div class="fc-wrap">
  <nav class="fp-crumb" aria-label="breadcrumb"><a href="{'/ar/' if ar else '/'}">{fb.T[lang]['home']}</a> › <a href="{fb.hub_url(lang)}">{fb.T[lang]['tag_page']}</a> › {t['crumb']}</nav>
  <h2 class="fp-h">{t['picks_h']}</h2>
  <div class="ch-picks">{picks}</div>
  {fb.teaser(lang)}
  <div class="fp-box fp-sec"><h2 class="fp-h">{t['table_h']}</h2>
    <div style="overflow-x:auto"><table class="ch-t"><tr>{''.join(f'<th>{c}</th>' for c in t['c'])}</tr>{rows}</table></div>
    <p class="ch-src">{t['src']}</p></div>
  <h2 class="fp-h fp-sec">{t['meals_h']}</h2>
  <div class="ch-meals">{meals}</div>
  <p class="fc-small" style="margin-top:.6rem">{t['meal_note']}</p>
  <div class="fp-box fp-sec"><h2 class="fp-h">{t['tips_h']}</h2><ul class="ch-tips">{''.join(f'<li>{x}</li>' for x in t['tips'])}</ul></div>
  <div class="fp-box fp-sec fp-faq"><h2 class="fp-h">{fb.T[lang]['faq_h']}</h2>
    {''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in t['faq'])}</div>
  {fb.lead_box(lang, "McDonald's" if not ar else 'ماكدونالدز', "Chain calories – McDonald's UAE" + (' (Arabic)' if ar else ''))}
  {fb.cta(lang, fb.T[lang]['cta_h_hub'])}
</div>
'''
    s += fb.tail(lang)
    fb.write(t['path'].lstrip('/'), s)

def build():
    for lang in ('en', 'ar'):
        page(lang)
    sm = fb.read('sitemap.xml')
    for lang in ('en', 'ar'):
        u = fb.SITE + T[lang]['path']
        if u not in sm:
            sm = sm.replace('\n</urlset>', f'\n  <url>\n    <loc>{u}</loc>\n    <lastmod>2026-10-29</lastmod>\n    <priority>0.7</priority>\n  </url>\n</urlset>')
    fb.write('sitemap.xml', sm)
    print('built chain pages')

if __name__ == '__main__':
    build()
