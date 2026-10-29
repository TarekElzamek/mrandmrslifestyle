# Builds the "What is reformer Pilates?" beginner guide in English and Arabic,
# using blog-private-reformer-pilates-dubai.html as the layout template.
# Run from repo root:  python3 _tools/blog_reformer/build.py
import os, re, sys, json
from urllib.parse import quote
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, '_tools', 'food'))
import build as fb  # Arabic header/footer/CSS shared with the Arabic calorie pages

SITE = 'https://www.mrandmrslifestyle.com'
SLUG = 'blog-what-is-reformer-pilates.html'
TPL = open('blog-private-reformer-pilates-dubai.html', encoding='utf-8').read()
IMG = 'services-ladies-pilates.jpg'

C = {
'en': dict(
 url=f'{SITE}/{SLUG}', alt=f'{SITE}/ar/{SLUG}',
 title="What Is Reformer Pilates? A Beginner's Guide (Dubai 2026)",
 desc="What is reformer Pilates? How the reformer machine works, how it compares with mat Pilates and Lagree, its benefits, what to wear and your first session.",
 cat='Pilates · Beginners · Dubai', h1="What Is Reformer Pilates? <em>A Beginner's Guide</em>",
 meta='By <a href="/chloe-antoniazzi.html" style="color:inherit">Chloe Antoniazzi</a> &nbsp;·&nbsp; 6 min read &nbsp;·&nbsp; October 2026',
 img_alt='Chloe Antoniazzi on a Pilates reformer with the sitting box, wearing grip socks, at The Pilates Room in Meydan, Dubai',
 back='← Back to Blog', back_href='/blog.html',
 body='''<p>Reformer Pilates is everywhere in Dubai right now, and one of the most common questions we get is simply: what is it? If you've seen the long machine with springs and straps and wondered whether it's for you, this guide explains it in plain words.</p>
<div class="tip-box"><strong>The short answer</strong><p>Reformer Pilates is Pilates done on a machine called a reformer: a sliding carriage, adjustable springs, a footbar and straps. The springs can support you while you learn, or add resistance as you get stronger, so the same machine works for complete beginners and for strong, experienced clients.</p></div>

<h2>The reformer machine, part by part</h2>
<ul>
<li><strong>The carriage:</strong> the padded bed you lie, sit, kneel or stand on. It slides along the frame on wheels.</li>
<li><strong>The springs:</strong> they connect the carriage to the frame. More or heavier springs make an exercise harder, or give you more support, depending on the movement.</li>
<li><strong>The footbar:</strong> a bar at the end you push against with your feet or hands.</li>
<li><strong>The straps:</strong> loops you hold or put your feet in to pull the carriage.</li>
<li><strong>The headrest and shoulder blocks:</strong> they keep you in position so you don't slide off.</li>
<li><strong>The sitting box:</strong> a padded box placed on the carriage for seated, kneeling and lying-on-your-front exercises, like in the photo above.</li>
</ul>

<h2>Reformer vs mat Pilates</h2>
<div class="table-wrap" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin:8px 0 24px;font-size:15px">
<tr><th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#C9A84C"></th><th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#C9A84C">Mat Pilates</th><th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#C9A84C">Reformer Pilates</th></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>Equipment</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">A mat, sometimes small props</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">The reformer machine</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>Resistance</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Your body weight</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Adjustable springs</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>Support for beginners</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Less: you hold every position yourself</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">More: springs can assist the movement</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>Variety</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Good</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Hundreds of exercises lying, kneeling, sitting and standing</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>Where you can do it</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Anywhere, including at home</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">In a studio with reformers</td></tr>
</table></div>
<p>Both are good. Mat Pilates is great at home; the reformer makes it easier to learn good form and to keep progressing, because the resistance changes with a simple spring adjustment.</p>

<h2>Reformer, Lagree, hot Pilates and "sculpt" classes</h2>
<ul>
<li><strong>Lagree</strong> uses a different machine (the Megaformer) and a slower, longer-under-tension style. It's usually taught in high-intensity group classes.</li>
<li><strong>Hot Pilates</strong> is usually mat-based, in a heated room.</li>
<li><strong>Sculpt or fusion classes</strong> mix Pilates with weights or cardio.</li>
<li><strong>Classic reformer Pilates</strong> focuses on control, alignment and core strength, and it's the easiest of these to adapt to your level.</li>
</ul>

<h2>The benefits of reformer Pilates</h2>
<ul>
<li><strong>A stronger core and better posture.</strong> Almost every exercise asks your deep abdominal and back muscles to work.</li>
<li><strong>Strength without heavy weights.</strong> The springs work your glutes, legs, back and arms through a full range of movement.</li>
<li><strong>Low impact.</strong> No jumping or pounding, which makes it gentle on the joints.</li>
<li><strong>Flexibility and mobility.</strong> Many exercises lengthen the muscles while they work.</li>
<li><strong>Better body awareness.</strong> You learn to move with control, which carries over to everyday life and other training.</li>
<li><strong>Adaptable before and after pregnancy,</strong> with your doctor's approval and an instructor trained in pre and postnatal exercise.</li>
</ul>

<h2>Is reformer Pilates good for weight loss?</h2>
<p>Reformer Pilates builds strength and tone, and it's a great way to stay active. Fat loss itself comes from your overall eating and activity across the week, so we pair sessions with simple nutrition guidance. At The Pilates Room you can choose reformer Pilates, strength training on our Speediance machine, or a mix of both, depending on your goal. Not sure how many calories you need? Try our <a href="/calculator.html">free calorie calculator</a>.</p>

<h2>What to wear</h2>
<ul>
<li><strong>Fitted clothes,</strong> so nothing catches in the springs and your instructor can see your alignment.</li>
<li><strong>Grip socks.</strong> Non-slip Pilates socks help you stay steady on the carriage and footbar.</li>
<li><strong>Hair tied back</strong> and no long jewellery.</li>
</ul>

<h2>What happens in your first session</h2>
<p>Your first session starts with a short chat about your goals, your routine and anything your body needs. Then your instructor shows you how the reformer works, how to get on and off safely, and how to breathe with the movement. You'll start with foundation exercises like footwork, bridging and arm work in straps, with the springs set for your level. By the end of 50 minutes most people feel their core and glutes working, and know exactly what to expect next time.</p>

<h2>How often should you do reformer Pilates?</h2>
<p>Two to three sessions a week is a good target if you want to see changes in strength and posture. Once a week still helps, especially alongside walking or other training. Consistency matters more than intensity.</p>

<h2>Private or group?</h2>
<p>Many Dubai studios teach the reformer in groups. Private sessions mean every exercise and spring setting is chosen for you, which makes the first weeks much easier. We explain the difference in <a href="/blog-private-reformer-pilates-dubai.html">why we only do private reformer Pilates</a>.</p>

<h2>Frequently Asked Questions</h2>
{faq}''',
 faq=[('Is reformer Pilates hard for beginners?', 'No. The springs can be set to support you, and your instructor chooses exercises for your level. Most beginners find the reformer easier to learn than mat Pilates.'),
      ('Do I need to be flexible to start?', 'No. Flexibility improves as you practise; you start with the range of movement you have today.'),
      ('How long until I see results?', 'With two to three sessions a week, many people feel stronger and stand taller within a few weeks. Visible changes usually take longer and depend on your nutrition and consistency.'),
      ('Do I need grip socks for reformer Pilates?', 'Grip socks are recommended. Their non-slip soles keep your feet steady on the carriage and footbar.'),
      ('Is reformer Pilates the same as Lagree?', 'No. Lagree uses a different machine and a slower, high-intensity style, usually in group classes. Reformer Pilates focuses on control, alignment and core strength.'),
      ('Can I do reformer Pilates while pregnant?', 'Only with your doctor\'s approval and an instructor trained in pre and postnatal exercise, who will adapt the exercises for each stage.')],
 related_h='Keep reading',
 related=[('/female-personal-trainer-dubai.html', 'Private reformer Pilates in Meydan: sessions &amp; packages'), ('/blog-private-reformer-pilates-dubai.html', 'Private Reformer Pilates in Dubai: Why 1-to-1 Beats Group Classes'),
          ('/blog-glutes-training-women.html', 'Glute Training for Women: What Actually Works'), ('/chloe-antoniazzi.html', 'Meet Chloe Antoniazzi')],
 cta_h='Try Reformer Pilates <em>With Chloe</em>', cta_p='Ladies only · Private 1-to-1 or with a friend · 50 minutes · Babies welcome · Free parking',
 cta_btn='Message Chloe on WhatsApp', wa='Hi Chloe, I read your guide to reformer Pilates and I\'d like to try a session at The Pilates Room.',
 crumb='What Is Reformer Pilates?', home='Home', blog='Blog',
),
'ar': dict(
 url=f'{SITE}/ar/{SLUG}', alt=f'{SITE}/{SLUG}',
 title='ما هو البيلاتس على الجهاز (الريفورمر)؟ دليل المبتدئين في دبي',
 desc='ما هو البيلاتس على الجهاز (الريفورمر)؟ كيف يعمل جهاز البيلاتس، والفرق بينه وبين بيلاتس الأرضية واللاغري، وفوائده، وماذا ترتدين، وكيف تكون جلستك الأولى.',
 cat='بيلاتس · للمبتدئين · دبي', h1='ما هو البيلاتس على الجهاز؟ <em>دليل المبتدئين</em>',
 meta='بقلم <a href="/chloe-antoniazzi.html" style="color:inherit">كلوي أنطونيازي</a> &nbsp;·&nbsp; 6 دقائق قراءة &nbsp;·&nbsp; أكتوبر 2026',
 img_alt='كلوي أنطونيازي على جهاز البيلاتس (الريفورمر) مع صندوق الجلوس وجوارب مانعة للانزلاق في ذا بيلاتس روم بميدان، دبي',
 back='→ العودة إلى المدونة', back_href='/blog.html',
 body='''<p>البيلاتس على الجهاز منتشر جدًا في دبي هذه الأيام، ومن أكثر الأسئلة التي تصلنا: ما هو بالضبط؟ إذا رأيتِ الجهاز الطويل بالنوابض والأحزمة وتساءلتِ إن كان مناسبًا لك، فهذا الدليل يشرحه بكلمات بسيطة.</p>
<div class="tip-box"><strong>الإجابة المختصرة</strong><p>البيلاتس على الجهاز هو بيلاتس يُمارَس على جهاز اسمه الريفورمر: سرير منزلق، ونوابض قابلة للتعديل، وقضيب للقدمين، وأحزمة. النوابض إما تساعدك أثناء التعلّم أو تضيف مقاومة كلما أصبحتِ أقوى، لذلك يناسب نفس الجهاز المبتدئات تمامًا وصاحبات الخبرة أيضًا.</p></div>

<h2>جهاز البيلاتس جزءًا جزءًا</h2>
<ul>
<li><strong>السرير المنزلق (الكاريدج):</strong> السطح المبطّن الذي تستلقين أو تجلسين أو تركعين أو تقفين عليه، وينزلق على عجلات.</li>
<li><strong>النوابض:</strong> تربط السرير بإطار الجهاز. نوابض أكثر أو أثقل تجعل التمرين أصعب أو تعطيك دعمًا أكبر، حسب الحركة.</li>
<li><strong>قضيب القدمين:</strong> القضيب الذي تدفعين عليه بقدميك أو يديك.</li>
<li><strong>الأحزمة:</strong> حلقات تمسكينها بيديك أو تضعين فيها قدميك لسحب السرير.</li>
<li><strong>مسند الرأس ومساند الكتفين:</strong> تثبّتك في مكانك حتى لا تنزلقي.</li>
<li><strong>صندوق الجلوس:</strong> صندوق مبطّن يوضع على السرير لتمارين الجلوس والركوع والاستلقاء على البطن، كما في الصورة أعلاه.</li>
</ul>

<h2>البيلاتس على الجهاز أم بيلاتس الأرضية (المات)؟</h2>
<div class="table-wrap" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin:8px 0 24px;font-size:15px">
<tr><th style="text-align:right;padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#C9A84C"></th><th style="text-align:right;padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#C9A84C">بيلاتس الأرضية</th><th style="text-align:right;padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#C9A84C">البيلاتس على الجهاز</th></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>المعدات</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">مات وأحيانًا أدوات صغيرة</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">جهاز الريفورمر</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>المقاومة</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">وزن جسمك</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">نوابض قابلة للتعديل</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>الدعم للمبتدئات</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">أقل: تثبتين كل وضعية بنفسك</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">أكثر: النوابض تساعد في الحركة</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>التنوّع</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">جيد</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">مئات التمارين استلقاءً وركوعًا وجلوسًا ووقوفًا</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"><strong>أين تمارسينه</strong></td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">في أي مكان، حتى في البيت</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">في استوديو فيه أجهزة ريفورمر</td></tr>
</table></div>
<p>الاثنان مفيدان. بيلاتس الأرضية ممتاز في البيت، أما الجهاز فيسهّل تعلّم الوضعية الصحيحة والاستمرار في التقدّم، لأن المقاومة تتغير بتعديل بسيط للنوابض.</p>

<h2>الريفورمر واللاغري والبيلاتس الساخن وحصص "السكلبت"</h2>
<ul>
<li><strong>اللاغري (Lagree)</strong> يستخدم جهازًا مختلفًا اسمه الميغافورمر، بأسلوب أبطأ وتوتر عضلي أطول، وغالبًا في حصص جماعية عالية الشدة.</li>
<li><strong>البيلاتس الساخن</strong> غالبًا على الأرضية في غرفة دافئة.</li>
<li><strong>حصص السكلبت أو الفيوجن</strong> تمزج البيلاتس بالأوزان أو الكارديو.</li>
<li><strong>البيلاتس الكلاسيكي على الجهاز</strong> يركّز على التحكم والمحاذاة وقوة عضلات البطن والظهر، وهو الأسهل تكييفًا حسب مستواك.</li>
</ul>

<h2>فوائد البيلاتس على الجهاز</h2>
<ul>
<li><strong>عضلات بطن أقوى ووضعية أفضل.</strong> تقريبًا كل تمرين يُشغّل عضلات البطن والظهر العميقة.</li>
<li><strong>قوة بدون أوزان ثقيلة.</strong> النوابض تُشغّل الأرداف والساقين والظهر والذراعين بمدى حركة كامل.</li>
<li><strong>تأثير منخفض على المفاصل.</strong> بدون قفز أو ضغط عنيف.</li>
<li><strong>مرونة وحركة أفضل.</strong> كثير من التمارين تطيل العضلات وهي تعمل.</li>
<li><strong>وعي أكبر بجسمك.</strong> تتعلمين الحركة بتحكّم، وهذا ينعكس على حياتك اليومية وتمارينك الأخرى.</li>
<li><strong>مناسب قبل الولادة وبعدها</strong> بموافقة طبيبتك ومع مدربة متخصصة في تمارين الحمل وما بعد الولادة.</li>
</ul>

<h2>هل البيلاتس على الجهاز مفيد لخسارة الوزن؟</h2>
<p>البيلاتس على الجهاز يبني القوة ويشدّ الجسم، وهو طريقة رائعة للبقاء نشيطة. أما خسارة الدهون نفسها فتعتمد على أكلك ونشاطك خلال الأسبوع، لذلك نرافق الجلسات بإرشادات تغذية بسيطة. في ذا بيلاتس روم يمكنك اختيار البيلاتس على الجهاز، أو تمارين القوة على جهاز Speediance، أو الاثنين معًا حسب هدفك. لا تعرفين كم سعرة تحتاجين؟ جرّبي <a href="/ar/calculator.html">حاسبة السعرات المجانية</a>.</p>

<h2>ماذا ترتدين</h2>
<ul>
<li><strong>ملابس رياضية مريحة وضيقة قليلًا،</strong> حتى لا يعلق شيء في النوابض وترى المدربة وضعيتك.</li>
<li><strong>جوارب مانعة للانزلاق (جوارب البيلاتس)</strong> لتبقي ثابتة على السرير وقضيب القدمين.</li>
<li><strong>شعر مربوط</strong> وبدون إكسسوارات طويلة.</li>
</ul>

<h2>ماذا يحدث في جلستك الأولى</h2>
<p>تبدأ جلستك الأولى بحديث قصير عن أهدافك وروتينك وما يحتاجه جسمك. ثم تشرح لك المدربة كيف يعمل جهاز البيلاتس، وكيف تصعدين وتنزلين بأمان، وكيف تتنفسين مع الحركة. تبدئين بتمارين أساسية مثل تمارين القدمين على القضيب، ورفع الحوض، وتمارين الذراعين بالأحزمة، مع ضبط النوابض حسب مستواك. وبنهاية الخمسين دقيقة تشعر معظم السيدات بعمل عضلات البطن والأرداف، ويعرفن تمامًا ماذا ينتظرهن في الجلسة القادمة.</p>

<h2>كم مرة في الأسبوع؟</h2>
<p>جلستان إلى ثلاث جلسات أسبوعيًا هدف جيد إذا أردتِ رؤية تغيير في القوة والوضعية. وجلسة واحدة أسبوعيًا مفيدة أيضًا، خاصة مع المشي أو تمارين أخرى. الاستمرار أهم من الشدة.</p>

<h2>جلسات خاصة أم جماعية؟</h2>
<p>كثير من الاستوديوهات في دبي تقدّم البيلاتس على الجهاز في حصص جماعية. أما الجلسة الخاصة فتعني أن كل تمرين وكل ضبط للنوابض يُختار لك أنتِ، وهذا يجعل الأسابيع الأولى أسهل بكثير. تعرّفي على <a href="/ar/female-personal-trainer-dubai.html">جلسات البيلاتس الخاصة للسيدات مع كلوي</a>.</p>

<h2>أسئلة شائعة</h2>
{faq}''',
 faq=[('هل البيلاتس على الجهاز صعب للمبتدئات؟', 'لا. يمكن ضبط النوابض لتساعدك، والمدربة تختار التمارين حسب مستواك. معظم المبتدئات يجدن الجهاز أسهل في التعلّم من بيلاتس الأرضية.'),
      ('هل أحتاج أن أكون مرنة لأبدأ؟', 'لا. المرونة تتحسن مع الممارسة، وتبدئين بمدى الحركة الذي لديك اليوم.'),
      ('متى أرى النتائج؟', 'مع جلستين إلى ثلاث جلسات أسبوعيًا، تشعر كثير من السيدات بقوة أكبر ووقفة أفضل خلال أسابيع قليلة. التغييرات الظاهرة تأخذ وقتًا أطول وتعتمد على التغذية والاستمرار.'),
      ('هل أحتاج جوارب خاصة للبيلاتس على الجهاز؟', 'يُنصح بالجوارب المانعة للانزلاق، لأن نعلها يثبّت قدميك على السرير وقضيب القدمين.'),
      ('هل البيلاتس على الجهاز هو نفسه اللاغري؟', 'لا. اللاغري يستخدم جهازًا مختلفًا وأسلوبًا أبطأ وعالي الشدة، وغالبًا في حصص جماعية. أما البيلاتس على الجهاز فيركّز على التحكم والمحاذاة وقوة عضلات البطن والظهر.'),
      ('هل يمكنني ممارسة البيلاتس على الجهاز أثناء الحمل؟', 'فقط بموافقة طبيبتك ومع مدربة متخصصة في تمارين الحمل وما بعد الولادة، تكيّف التمارين حسب كل مرحلة.')],
 related_h='اقرئي أيضًا',
 related=[('/ar/female-personal-trainer-dubai.html', 'بيلاتس خاص للسيدات في ميدان: الجلسات والباقات'), ('/ar/calculator.html', 'حاسبة السعرات الحرارية والماكروز'),
          ('/ar/dubai-food-calories.html', 'سعرات أكلات دبي'), ('/chloe-antoniazzi.html', 'تعرّفي على كلوي (بالإنجليزية)')],
 cta_h='جرّبي البيلاتس على الجهاز <em>مع كلوي</em>', cta_p='للسيدات فقط · جلسة خاصة فردية أو مع صديقة · 50 دقيقة · الأطفال مرحّب بهم · مواقف مجانية',
 cta_btn='راسلي كلوي على واتساب', wa='مرحبًا كلوي، قرأت دليل البيلاتس على الجهاز وأرغب في تجربة جلسة في ذا بيلاتس روم.',
 crumb='ما هو البيلاتس على الجهاز؟', home='الرئيسية', blog='المدونة',
),
}

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
    s = s.replace(f'{SITE}/blog-private-reformer-pilates-dubai.html', c['url'])
    s = s.replace(f'{SITE}/blog-private-reformer-pilates.jpg', f'{SITE}/{IMG}')
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
               "author": {"@type": "Person", "name": "Chloe Antoniazzi", "url": f"{SITE}/chloe-antoniazzi.html"},
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
  <img src="/{IMG}" alt="{c['img_alt']}" width="1200" height="960" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;" fetchpriority="high">
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
    wa = 'https://wa.me/971547011995?text=' + quote(c['wa'])
    author = ('<div class="author-box"><div class="author-avatar">C</div><div><div class="author-name"><a href="/chloe-antoniazzi.html" style="color:#fff">Chloe Antoniazzi</a></div><div class="author-role">Founder · The Pilates Room by Chloe, Meydan</div><div class="author-bio">Chloe is part of the Mr &amp; Mrs Lifestyle coaching team, which holds a Diploma in Pilates on Reformer Teaching (EREPS Level 4) and an Award in Pre &amp; Postnatal Exercise Instructing.</div></div></div>'
              if not ar else
              '<div class="author-box"><div class="author-avatar">C</div><div><div class="author-name"><a href="/chloe-antoniazzi.html" style="color:#fff">كلوي أنطونيازي</a></div><div class="author-role">مؤسسة ذا بيلاتس روم، ميدان</div><div class="author-bio">كلوي جزء من فريق Mr &amp; Mrs Lifestyle الحاصل على دبلوم تدريس بيلاتس الريفورمر (EREPS المستوى 4) وشهادة في تمارين الحمل وما بعد الولادة.</div></div></div>')
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
