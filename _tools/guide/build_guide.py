# Builds the free "Dubai Eating-Out Guide" PDFs (EN + AR) from the food calories dataset.
# Run from repo root:  python3 _tools/guide/build_guide.py   (needs node + playwright)
import os, sys, html, subprocess, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, '_tools', 'food'))
from foods import FOODS
BY = {f['slug']: f for f in FOODS}
esc = lambda s: html.escape(str(s))

SECTIONS = [
    ('Breakfast & coffee', 'الفطور والقهوة', ['cheese-manakish', 'egg-paratha', 'karak-chai', 'spanish-latte', 'iced-spanish-latte', 'caramel-frappe']),
    ('Street food', 'أكل الشارع', ['chicken-shawarma', 'beef-shawarma', 'shawarma-plate', 'falafel-wrap', 'chicken-paratha-roll']),
    ('Emirati & restaurant meals', 'أكلات إماراتية ومطاعم', ['chicken-machboos', 'mutton-biryani', 'butter-chicken-naan', 'mixed-grill', 'shish-tawook-plate', 'grilled-hammour']),
    ('Burgers, pizza & pasta', 'برجر وبيتزا وباستا', ['cheeseburger-meal', 'double-smash-burger', 'club-sandwich', 'meat-lovers-pizza', 'pasta-carbonara', 'chicken-alfredo']),
    ('Desserts & treats', 'الحلويات', ['kunafa', 'luqaimat', 'umm-ali', 'baklava', 'avocado-shake', 'kinder-bueno']),
]

T = {
 'en': dict(
  dir='ltr', title='The Dubai Eating-Out Guide',
  sub='How to order your favourite Dubai food and still lose fat',
  by='By coaches Tarek &amp; Chloe · Mr &amp; Mrs Lifestyle',
  intro='You don\'t need to give up shawarma, karak or brunch to get in shape. Our clients still eat all of it. The difference is <b>how they order</b>. This guide shows you the small changes that save hundreds of calories without losing the taste.',
  rules_h='7 rules for eating out in Dubai',
  rules=[('Sauces on the side.', 'Garlic sauce, mayo and dressings are mostly oil. Two spoons can add 150 kcal or more.'),
         ('Swap the fries, keep the main.', 'Fries add 250 to 350 kcal. Ask for salad or grilled vegetables instead.'),
         ('Build the plate around protein.', 'Grilled chicken, fish, tawook or eggs keep you full for longer than bread and rice.'),
         ('Watch your coffee.', 'A Spanish latte or frappe can be 300 to 400 kcal, as much as a meal. Ask for half the sugar or condensed milk.'),
         ('Share the rice and the dessert.', 'Half the rice saves about 200 kcal. Half a kunafa still tastes like kunafa.'),
         ('Bread is a side, not the base.', 'Half an Arabic bread with mezze is plenty. Fill the rest of the plate with salad.'),
         ('Plan the day, don\'t skip meals.', 'Know your daily calorie number, enjoy your favourite meal, and keep the rest of the day lighter.')],
  table_h='Order this, not that', table_sub='Typical Dubai restaurant portions, with the lighter way to order each one.',
  c_food='Food', c_kcal='Usually', c_swap='Order it like this', kcal='kcal',
  calc='Not sure how many calories you need a day? Use our free calculator: <b>mrandmrslifestyle.com/calculator.html</b>',
  cta_h='Want a plan built around the food you love?',
  cta_p='We build your training and nutrition around what you actually eat in Dubai, and check in with you every week.',
  offers=[('1-to-1 personal training', 'With Tarek at Nogs Gym, Al Quoz. Men and women. From AED 275 per session.'),
          ('Ladies-only private Pilates', 'With Chloe at The Pilates Room, Meydan. Reformer Pilates and strength training.'),
          ('Online coaching', 'Your plan in our app with regular check-ins, wherever you are. From AED 299 per month.')],
  cta_btn='Book a free consultation: WhatsApp +971 50 787 1515',
  note='Calorie values are estimates for a typical Dubai restaurant portion, based on published nutrition data and standard recipes. Portions vary between restaurants.',
  font="'DM Sans', sans-serif", head_font="'DM Serif Display', serif",
 ),
 'ar': dict(
  dir='rtl', title='دليل الأكل خارج البيت في دبي',
  sub='كيف تطلب أكلاتك المفضلة في دبي وتخسر الدهون في نفس الوقت',
  by='من المدربين طارق وكلوي · Mr &amp; Mrs Lifestyle',
  intro='لا تحتاج أن تتخلى عن الشاورما أو الكرك أو البرانش لتصل إلى جسم أفضل. عملاؤنا ما زالوا يأكلون كل هذا. الفرق هو <b>طريقة الطلب</b>. هذا الدليل يوضح لك تغييرات بسيطة توفر مئات السعرات بدون أن تخسر الطعم.',
  rules_h='7 قواعد للأكل خارج البيت في دبي',
  rules=[('الصلصات على الجانب.', 'الثومية والمايونيز والصوصات معظمها زيت. ملعقتان قد تضيفان 150 سعرة أو أكثر.'),
         ('استبدل البطاطا واحتفظ بالوجبة.', 'البطاطا تضيف 250 إلى 350 سعرة. اطلب سلطة أو خضار مشوية بدلها.'),
         ('ابنِ صحنك حول البروتين.', 'الدجاج المشوي والسمك والطاووق والبيض تشبعك لفترة أطول من الخبز والرز.'),
         ('انتبه لقهوتك.', 'السبانش لاتيه أو الفرابيه قد تصل إلى 300 أو 400 سعرة، مثل وجبة كاملة. اطلب نصف السكر أو نصف الحليب المكثف.'),
         ('شارك الرز والحلى.', 'نصف الرز يوفر حوالي 200 سعرة. ونصف الكنافة ما زال طعمه كنافة.'),
         ('الخبز إضافة وليس الأساس.', 'نصف رغيف خبز عربي مع المقبلات يكفي. املأ باقي الصحن بالسلطة.'),
         ('خطط ليومك ولا تترك الوجبات.', 'اعرف عدد سعراتك اليومية، واستمتع بوجبتك المفضلة، واجعل باقي اليوم أخف.')],
  table_h='اطلب هذا بدل ذاك', table_sub='حصص مطاعم دبي المعتادة، مع الطريقة الأخف لطلب كل أكلة.',
  c_food='الأكلة', c_kcal='عادةً', c_swap='اطلبها هكذا', kcal='سعرة',
  calc='لا تعرف كم سعرة تحتاج يوميًا؟ استخدم الحاسبة المجانية: <b dir="ltr">mrandmrslifestyle.com/calculator.html</b>',
  cta_h='تريد خطة مبنية حول الأكل الذي تحبه؟',
  cta_p='نبني لك خطة التمرين والتغذية حول ما تأكله فعلًا في دبي، ونتابع معك كل أسبوع.',
  offers=[('تدريب شخصي 1 لـ 1', 'مع طارق في نادي Nogs في القوز. للرجال والسيدات. من 275 درهم للجلسة.'),
          ('بيلاتس خاص للسيدات فقط', 'مع كلوي في ذا بيلاتس روم في ميدان. بيلاتس ريفورمر وتمارين قوة.'),
          ('التدريب أونلاين', 'خطتك في تطبيقنا مع متابعة منتظمة، أينما كنت. من 299 درهم شهريًا.')],
  cta_btn='احجز استشارة مجانية: واتساب <span dir="ltr">+971 50 787 1515</span>',
  note='السعرات تقديرية لحصة مطعم عادية في دبي، بناءً على بيانات غذائية منشورة ووصفات معتادة. الحصص تختلف بين المطاعم.',
  font="'Tajawal', sans-serif", head_font="'Tajawal', sans-serif",
 ),
}

def fonts():
    fd = os.path.join(ROOT, 'fonts')
    faces = [('DM Serif Display', 400, 'dm-serif-display-latin-400-normal'), ('DM Sans', 400, 'dm-sans-latin-400-normal'),
             ('DM Sans', 500, 'dm-sans-latin-500-normal'), ('DM Sans', 700, 'dm-sans-latin-700-normal')]
    for w in (400, 500, 700, 800):
        faces += [('Tajawal', w, f'tajawal-arabic-{w}-normal'), ('Tajawal', w, f'tajawal-latin-{w}-normal')]
    return ''.join(f"@font-face{{font-family:'{n}';font-weight:{w};src:url('file://{fd}/{fn}.woff2') format('woff2')}}" for n, w, fn in faces)

def page_html(lang):
    t = T[lang]; ar = lang == 'ar'
    rules = ''.join(f'<li><span class="n">{i + 1}</span><div><b>{a}</b> {b}</div></li>' for i, (a, b) in enumerate(t['rules']))
    secs = []
    for en, arn, slugs in SECTIONS:
        rows = ''
        for s in slugs:
            f = BY[s]
            rows += f'<tr><td class="f">{esc(f["ar"] if ar else f["en"])}</td><td class="k">{f["kcal"]:,} {t["kcal"]}</td><td>{esc(f["swap_ar"] if ar else f["swap"])}</td></tr>'
        secs.append(f'<div class="sec"><h3>{arn if ar else en}</h3><table><tr><th>{t["c_food"]}</th><th>{t["c_kcal"]}</th><th>{t["c_swap"]}</th></tr>{rows}</table></div>')
    foot = f'<div class="foot"><span>{t["title"]}</span><span dir="ltr">mrandmrslifestyle.com</span></div>'
    tables = ''
    for i, grp in enumerate([(0, 1), (2, 3), (4,)]):
        head = f'<h2>{t["table_h"]}</h2><p class="s">{t["table_sub"]}</p>' if i == 0 else ''
        tail = f'<div class="box">{t["note"]}</div>' if i == 2 else ''
        tables += f'<section class="pg">{head}{"".join(secs[j] for j in grp)}{tail}{foot}</section>'
    offers = ''.join(f'<div class="of"><b>{a}</b><span>{b}</span></div>' for a, b in t['offers'])
    logo = 'file://' + os.path.join(ROOT, 'logo.png')
    return f'''<!doctype html><html lang="{lang}" dir="{t['dir']}"><head><meta charset="utf-8"><style>
{fonts()}
@page{{size:A4;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:{t['font']};color:#1d1d1d;font-size:11.5pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.pg{{width:210mm;height:297mm;padding:18mm 17mm;position:relative;page-break-after:always;overflow:hidden}}
.pg:last-child{{page-break-after:auto}}
.cover{{background:#0d0d0d;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:24mm 20mm}}
.cover img{{width:46mm;margin-bottom:22mm}}
.tag{{font-size:9pt;letter-spacing:{'0' if ar else '3px'};text-transform:uppercase;color:#C9A84C;font-weight:700;margin-bottom:5mm}}
.cover h1{{font-family:{t['head_font']};font-weight:{800 if ar else 400};font-size:{'34pt' if ar else '40pt'};line-height:1.15;margin-bottom:6mm}}
.cover .sub{{font-size:15pt;color:#d8d8d8;margin-bottom:14mm;max-width:150mm}}
.cover .intro{{font-size:12pt;color:#bdbdbd;max-width:150mm;border-{'right' if ar else 'left'}:2px solid #C9A84C;padding-{'right' if ar else 'left'}:6mm}}
.cover .intro b{{color:#fff}}
.cover .by{{position:absolute;bottom:18mm;font-size:10pt;color:#C9A84C}}
h2{{font-family:{t['head_font']};font-weight:{800 if ar else 400};font-size:24pt;line-height:1.2;margin-bottom:3mm}}
h2 + p.s{{color:#666;margin-bottom:7mm}}
ul.rules{{list-style:none}}
ul.rules li{{display:flex;gap:5mm;padding:4.2mm 0;border-bottom:1px solid #e8e2d4;font-size:12pt}}
ul.rules .n{{flex:0 0 9mm;height:9mm;border-radius:50%;background:#C9A84C;color:#111;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:11pt}}
.box{{margin-top:9mm;background:#f7f3ea;border-radius:3mm;padding:6mm 7mm;font-size:11pt}}
.sec{{margin-bottom:6mm}}
.sec h3{{font-size:12.5pt;color:#9a7a2c;margin-bottom:2mm;font-weight:700}}
table{{width:100%;border-collapse:collapse;font-size:10pt}}
th{{text-align:{'right' if ar else 'left'};background:#111;color:#C9A84C;padding:2mm 3mm;font-weight:600;font-size:9pt}}
td{{padding:2.2mm 3mm;border-bottom:1px solid #ebe5d8;vertical-align:top}}
td.f{{font-weight:700;width:32%}} td.k{{white-space:nowrap;width:15%;color:#555}}
.cta{{background:#0d0d0d;color:#fff}}
.cta h2{{color:#fff;font-size:28pt;margin-bottom:5mm}}
.cta p{{color:#cfcfcf;font-size:13pt;margin-bottom:10mm;max-width:160mm}}
.of{{border:1px solid #333;border-radius:3mm;padding:6mm 7mm;margin-bottom:5mm}}
.of b{{display:block;font-size:14pt;color:#C9A84C;margin-bottom:1.5mm}} .of span{{color:#d6d6d6}}
.btn{{display:inline-block;margin-top:6mm;background:#C9A84C;color:#111;font-weight:700;padding:5mm 8mm;border-radius:2mm;font-size:12.5pt;text-decoration:none}}
.note{{position:absolute;bottom:14mm;left:20mm;right:20mm;font-size:8.5pt;color:#888}}
.foot{{position:absolute;bottom:9mm;left:17mm;right:17mm;font-size:8.5pt;color:#999;display:flex;justify-content:space-between}}
</style></head><body>
<section class="pg cover">
  <img src="{logo}" alt="">
  <div class="tag">{'دليل مجاني' if ar else 'Free guide'}</div>
  <h1>{t['title']}</h1>
  <p class="sub">{t['sub']}</p>
  <p class="intro">{t['intro']}</p>
  <div class="by">{t['by']}</div>
</section>
<section class="pg">
  <h2>{t['rules_h']}</h2><p class="s">&nbsp;</p>
  <ul class="rules">{rules}</ul>
  <div class="box">{t['calc']}</div>
  <div class="foot"><span>{t['title']}</span><span dir="ltr">mrandmrslifestyle.com</span></div>
</section>
{tables}
<section class="pg cta">
  <div class="tag">Mr &amp; Mrs Lifestyle</div>
  <h2>{t['cta_h']}</h2>
  <p>{t['cta_p']}</p>
  {offers}
  <a class="btn" href="https://wa.me/971507871515">{t['cta_btn']}</a>
  <div class="note" style="color:#C9A84C;font-size:10pt" dir="ltr">mrandmrslifestyle.com · Instagram @mrandmrslifestyle</div>
</section>
</body></html>'''

def build():
    tmp = os.path.join(ROOT, '_tools', 'guide', '_tmp')
    os.makedirs(tmp, exist_ok=True)
    jobs = []
    for lang, out in (('en', 'guides/dubai-eating-out-guide.pdf'), ('ar', 'guides/dubai-eating-out-guide-ar.pdf')):
        p = os.path.join(tmp, f'guide-{lang}.html')
        open(p, 'w', encoding='utf-8').write(page_html(lang))
        jobs.append([p, os.path.join(ROOT, out)])
    js = os.path.join(tmp, 'pdf.js')
    open(js, 'w').write('''const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
for (const [src,out] of %s){const p=await b.newPage();await p.goto('file://'+src);await p.waitForTimeout(800);
await p.pdf({path:out,format:'A4',printBackground:true,preferCSSPageSize:true});
await p.setViewportSize({width:794,height:1123});await p.screenshot({path:out.replace('.pdf','-preview.png'),fullPage:true});}
await b.close();})();''' % json.dumps(jobs))
    subprocess.run(['node', js], check=True, cwd='/home/claude/pwt')
    print('built', [j[1] for j in jobs])

if __name__ == '__main__':
    build()
