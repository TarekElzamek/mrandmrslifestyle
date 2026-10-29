# Text for the "How to get abs" guide (English and Arabic). Built by build.py.
SITE = 'https://www.mrandmrslifestyle.com'
SLUG = 'blog-how-to-get-abs.html'

TH = 'style="text-align:%s;padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#C9A84C"'
TD = 'style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)"'

def table(rows, align):
    th = TH % align
    h = '<div class="table-wrap" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin:8px 0 24px;font-size:15px">'
    h += '<tr>' + ''.join(f'<th {th}>{x}</th>' for x in rows[0]) + '</tr>'
    for r in rows[1:]:
        h += '<tr>' + ''.join(f'<td {TD}>{("<strong>%s</strong>" % x) if i == 0 else x}</td>' for i, x in enumerate(r)) + '</tr>'
    return h + '</table></div>'

def fig(alt, cap):
    return (f'<figure style="margin:24px 0"><img src="/tarek-abs-before-after.jpg" width="1170" height="1171" loading="lazy" alt="{alt}" '
            f'style="width:100%;max-width:560px;height:auto;border-radius:10px;display:block;margin:0 auto">'
            f'<figcaption style="font-size:13px;opacity:.7;text-align:center;margin-top:8px">{cap}</figcaption></figure>')

EN_ABS = table([
    ['Exercise', 'How', 'Sets × reps'],
    ['Hanging knee or leg raise', 'Hang from a bar, curl your knees (or straight legs) up by rolling your hips, lower slowly', '3 × 8–15'],
    ['Cable crunch', 'Kneel at a cable machine, crunch your ribs down towards your hips, not just bending at the hips', '3 × 10–15'],
    ['Ab wheel rollout', 'From your knees, roll out as far as you can while keeping your lower back flat, then pull back', '3 × 6–12'],
    ['Plank and side plank', 'Squeeze your glutes and brace your stomach as if someone will poke it', '3 × 30–60 s'],
    ['Pallof press', 'Stand side-on to a cable or band, press it straight out and resist it pulling you round', '3 × 10 each side'],
], 'left')

AR_ABS = table([
    ['التمرين', 'الطريقة', 'المجموعات × التكرارات'],
    ['رفع الركبتين أو الساقين معلّقًا', 'تعلّق في البار، وارفع ركبتيك (أو ساقيك مستقيمتين) بلفّ الحوض للأعلى، ثم انزل ببطء', '3 × 8–15'],
    ['الكرنش على الكيبل', 'اجثُ أمام جهاز الكيبل، وقرّب أضلاعك نحو حوضك، لا مجرد انحناء من الورك', '3 × 10–15'],
    ['عجلة البطن', 'من وضع الركبتين، تقدّم بالعجلة لأبعد ما تستطيع مع إبقاء أسفل ظهرك مستقيمًا، ثم ارجع', '3 × 6–12'],
    ['البلانك والبلانك الجانبي', 'شدّ عضلات المؤخرة وثبّت بطنك كأن أحدًا سيضغط عليه', '3 × 30–60 ثانية'],
    ['بالوف برس', 'قف بجانب الكيبل أو الحبل المطاطي، وادفعه للأمام وقاوم سحبه لك', '3 × 10 لكل جهة'],
], 'right')

EN_TIME = table([
    ['Starting point (man, 85 kg)', 'Fat to lose', 'Time at 0.5–0.75 kg a week'],
    ['15% body fat', 'about 4.5 kg', '1.5–2 months'],
    ['20% body fat', 'about 9.5 kg', '3–5 months'],
    ['25% body fat', 'about 14 kg', '4.5–6.5 months'],
], 'left')

AR_TIME = table([
    ['نقطة البداية (رجل، 85 كغ)', 'الدهون المطلوب خسارتها', 'المدة بمعدل 0.5–0.75 كغ أسبوعيًا'],
    ['15% دهون', 'حوالي 4.5 كغ', 'شهر ونصف إلى شهرين'],
    ['20% دهون', 'حوالي 9.5 كغ', '3 إلى 5 أشهر'],
    ['25% دهون', 'حوالي 14 كغ', '4.5 إلى 6.5 أشهر'],
], 'right')

C = {
'en': dict(
 url=f'{SITE}/{SLUG}', alt=f'{SITE}/ar/{SLUG}',
 title='How to Get Abs: The Honest Guide From a Dubai Coach',
 desc='How to get abs: why sit-ups alone won\'t show them, the body fat you need, how to lose fat, the best ab exercises and how long it takes. Coach Tarek\'s guide.',
 keywords='how to get abs, how to get a six pack, visible abs, lose belly fat, ab workout, six pack Dubai, personal trainer Dubai',
 cat='Fat Loss · Abs · Training', h1='How to Get Abs: <em>The Honest Guide</em>',
 meta='By <a href="/tarek-elzamek.html" style="color:inherit">Tarek Elzamek</a> &nbsp;·&nbsp; 7 min read &nbsp;·&nbsp; October 2026',
 img_alt='Coach Tarek Elzamek before and after: softer midsection on the beach on the left, lean with visible abs on the right',
 back='← Back to Blog', back_href='/blog.html',
 body=f'''<p>"How do I get abs?" is one of the questions I get asked most, at the gym and in my DMs. The honest answer is simpler than most people expect, and it has very little to do with doing hundreds of sit-ups.</p>
<div class="tip-box"><strong>The short answer</strong><p>Everyone already has abs. You see them when the layer of fat covering them is thin enough. So getting abs is two jobs: <b style="color:#fff">lose body fat</b> with your eating and daily activity, and <b style="color:#fff">build your ab muscles</b> so they show clearly when you get there. Sit-ups only do the second job.</p></div>

<h2>My own before and after</h2>
{fig('Coach Tarek Elzamek before and after: softer midsection on the beach on the left, lean with visible abs on the right', 'Me, before and after. The ab muscles were there in both photos; on the right, training made them bigger and lower body fat made them visible.')}
<p>On the left, I was in decent shape but my stomach was soft and there was no six pack. On the right, the same abs, with more muscle and much less fat on top. Nothing magic happened in between: consistent strength training, direct ab work, and eating for fat loss for long enough. That's exactly what this guide walks you through.</p>
<p>One honest note: the photo on the right is very lean. You don't need to get that lean to see your abs clearly in the mirror day to day.</p>

<h2>How lean do you need to be?</h2>
<p>It depends on your genetics and where your body stores fat, but as a rough guide:</p>
<ul>
<li><strong>Men:</strong> a clear outline of the abs usually appears at around 10 to 12% body fat, and a sharp six pack lower than that.</li>
<li><strong>Women:</strong> an outline of the abs usually shows at around 16 to 20% body fat. Women naturally carry more essential fat, and going very low can affect your periods, energy and hormones, so we don't chase extreme leanness.</li>
</ul>
<p>Lower belly fat is usually the last to go for men, and hips and thighs for many women. That's normal, not a sign that something is wrong.</p>

<h2>Step 1: Eat in a small calorie deficit</h2>
<p>To lose fat, you need to eat a little less energy than your body uses. A deficit of about 300 to 500 calories a day is enough for most people, and lets you lose about 0.5 to 1% of your body weight a week while keeping your muscle and your energy.</p>
<ul>
<li>Find your starting number with our <a href="/calculator.html">free calorie calculator</a>.</li>
<li>Dubai life makes this harder: brunches, karak, shawarma and delivery apps add up fast. Check what your favourites really cost in our <a href="/dubai-food-calories.html">Dubai food calories guide</a>, from <a href="/calories/karak-chai.html">karak chai</a> to a <a href="/calories/chicken-shawarma.html">chicken shawarma</a>.</li>
<li>You don't need to cut out carbs or the foods you enjoy. You need the total across the week to be right.</li>
</ul>

<h2>Step 2: Eat enough protein</h2>
<p>Protein keeps you full and protects your muscle while you lose fat. Aim for about 1.6 to 2.2 g of protein per kg of body weight a day, spread across your meals. For an 80 kg person, that's roughly 130 to 175 g a day. Easy sources: <a href="/calories/chicken-breast.html">chicken breast</a>, fish, <a href="/calories/boiled-egg.html">eggs</a>, Greek yoghurt, laban, lentils and a <a href="/calories/protein-shake.html">protein shake</a> when you're busy.</p>

<h2>Step 3: Lift weights 3 to 4 times a week</h2>
<p>Strength training is what keeps your muscle while you diet, so the weight you lose is fat, not muscle. Squats, deadlifts, presses, rows and pull-ups also make your core work hard. Follow a structured programme and try to add a little weight or a rep over time. Our <a href="/exercise-library.html">exercise library</a> shows how to do the main lifts with good form.</p>

<h2>Step 4: Train your abs directly, 2 to 3 times a week</h2>
<p>Your abs are a muscle like any other: they grow when you give them resistance and make it harder over time. A few hard sets beat 100 easy crunches a day. Pick 2 or 3 of these and add them to the end of your workouts:</p>
{EN_ABS}
<p>When an exercise gets easy, make it harder: straighter legs, more weight on the cable, a longer rollout, or a slower lowering.</p>

<h2>Step 5: Walk more, sleep more</h2>
<ul>
<li><strong>Steps:</strong> 8,000 to 10,000 steps a day burns a surprising amount of energy without making you hungry the way hard cardio can. In the Dubai summer, walk in a mall, on a treadmill, or in the evening.</li>
<li><strong>Sleep:</strong> 7 to 9 hours. Poor sleep makes you hungrier, especially for sugary food, and makes your training worse.</li>
</ul>

<h2>How long does it take to get abs?</h2>
<p>It depends almost entirely on how much fat you have to lose. Here's a rough example for an 85 kg man getting to about 10% body fat while keeping his muscle:</p>
{EN_TIME}
<p>Women usually follow a similar pattern, just with a higher body fat finish line. Most people are surprised how long the last few kilos take, which is why consistency matters more than a perfect week.</p>

<h2>Ab myths to ignore</h2>
<ul>
<li><strong>"Crunches burn belly fat."</strong> You can't choose where you lose fat. Ab exercises build the muscle; fat loss happens across the whole body.</li>
<li><strong>"You need fat burners or detox teas."</strong> They don't do the job of a calorie deficit, and some aren't safe.</li>
<li><strong>"Sweating more in a waist trainer or sauna belt helps."</strong> You lose water, which comes straight back.</li>
<li><strong>"Lower abs need special exercises."</strong> The six pack is one muscle. Lower belly fat just tends to leave last.</li>
<li><strong>"You need to train abs every day."</strong> Two or three hard sessions a week, with recovery in between, works better.</li>
</ul>

<h2>When a coach helps</h2>
<p>Most people who don't get abs know the theory. What's missing is a plan that fits their week, someone checking the numbers, and someone to keep them going when progress slows. That's what I do for my clients, 1-to-1 at <a href="/personal-trainer-al-quoz.html">Nogs Gym in Al Quoz</a> or through <a href="/online-coaching.html">online coaching</a>. For women who would prefer a female coach, Chloe coaches <a href="/female-personal-trainer-dubai.html">ladies only in Meydan</a>.</p>

<h2>Frequently Asked Questions</h2>
{{faq}}''',
 faq=[('Can you get abs just by doing sit-ups?', 'No. Sit-ups and other ab exercises build the muscle, but you only see your abs when your body fat is low enough. That comes from your eating and daily activity.'),
      ('What body fat percentage do you need to see abs?', 'Roughly 10 to 12% for men and 16 to 20% for women to see a clear outline. It varies with genetics and where your body stores fat.'),
      ('How long does it take to get abs?', 'It depends on how much fat you need to lose. Losing about 0.5 to 0.75 kg a week, a man starting around 20% body fat often needs 3 to 5 months, and someone starting leaner needs less.'),
      ('What are the best exercises for abs?', 'Exercises you can make harder over time: hanging knee or leg raises, cable crunches, ab wheel rollouts, planks and Pallof presses, 2 to 3 times a week alongside a full strength programme.'),
      ('Can women get visible abs?', 'Yes. Women usually see an outline of their abs at a slightly higher body fat than men, around 16 to 20%. Going much lower can affect periods, energy and hormones, so it isn\'t a healthy goal for most women.'),
      ('Do I have to give up carbs or my favourite food to get abs?', 'No. What matters is your total calories and protein across the week. Many of our clients still enjoy rice, bread, karak and the occasional brunch while they lose fat.')],
 related_h='Keep reading',
 related=[('/blog-how-to-lose-fat-dubai.html', 'How to Lose Fat in Dubai: The Complete Guide'), ('/calculator.html', 'Free Calorie &amp; Macro Calculator'),
          ('/dubai-food-calories.html', 'Dubai Food Calories: 160 foods'), ('/transformations.html', 'Client Transformations')],
 cta_h='Want Abs? <em>Let\'s Plan It Together</em>', cta_p='1-to-1 at Nogs Gym, Al Quoz, or online coaching anywhere · Free strategy call',
 cta_btn='Message Tarek on WhatsApp', wa='Hi Tarek, I read your guide on how to get abs and I\'d like help getting there.',
 crumb='How to Get Abs', home='Home', blog='Blog',
),
'ar': dict(
 url=f'{SITE}/ar/{SLUG}', alt=f'{SITE}/{SLUG}',
 title='كيف تحصل على عضلات بطن (سكس باك)؟ الدليل الصادق من مدرب في دبي',
 desc='كيف تحصل على عضلات بطن ظاهرة؟ لماذا لا تكفي تمارين البطن وحدها، ونسبة الدهون المطلوبة، وكيف تخسر الدهون، وأفضل التمارين، وكم يستغرق ذلك. دليل المدرب طارق.',
 keywords='كيف تحصل على سكس باك, عضلات البطن, تمارين البطن, التخلص من دهون البطن, مدرب شخصي دبي',
 cat='خسارة الدهون · عضلات البطن · التمرين', h1='كيف تحصل على عضلات بطن ظاهرة؟ <em>الدليل الصادق</em>',
 meta='بقلم <a href="/tarek-elzamek.html" style="color:inherit">طارق الزامك</a> &nbsp;·&nbsp; 7 دقائق قراءة &nbsp;·&nbsp; أكتوبر 2026',
 img_alt='المدرب طارق الزامك قبل وبعد: بطن غير مشدود على الشاطئ في اليسار، وجسم رشيق بعضلات بطن ظاهرة في اليمين',
 back='→ العودة إلى المدونة', back_href='/blog.html',
 body=f'''<p>"كيف أحصل على سكس باك؟" من أكثر الأسئلة التي تصلني، في الجيم وفي الرسائل. والإجابة الصادقة أبسط مما يتوقعه أغلب الناس، ولا علاقة كبيرة لها بمئات تمارين البطن.</p>
<div class="tip-box"><strong>الإجابة المختصرة</strong><p>كل شخص لديه عضلات بطن. تظهر عندما تصبح طبقة الدهون التي تغطيها رقيقة بما يكفي. لذلك الحصول على عضلات بطن ظاهرة مهمتان: <b style="color:#fff">خسارة دهون الجسم</b> من خلال الأكل والنشاط اليومي، و<b style="color:#fff">بناء عضلات البطن</b> حتى تظهر بوضوح عندما تصل. وتمارين البطن تقوم بالمهمة الثانية فقط.</p></div>

<h2>صورتي قبل وبعد</h2>
{fig('المدرب طارق الزامك قبل وبعد: بطن غير مشدود على الشاطئ في اليسار، وجسم رشيق بعضلات بطن ظاهرة في اليمين', 'أنا قبل وبعد. عضلات البطن موجودة في الصورتين؛ في اليمين، التمرين جعلها أكبر، وانخفاض الدهون جعلها ظاهرة.')}
<p>في الصورة اليسرى كنت في لياقة مقبولة، لكن بطني لم يكن مشدودًا ولا يوجد سكس باك. في اليمنى نفس عضلات البطن، مع عضل أكثر ودهون أقل بكثير فوقها. لم يحدث شيء سحري بينهما: تمرين قوة منتظم، وتمارين بطن مباشرة، وأكل لخسارة الدهون لمدة كافية. وهذا بالضبط ما يشرحه هذا الدليل.</p>
<p>ملاحظة صادقة: الصورة اليمنى رشيقة جدًا. لا تحتاج أن تصل لهذه الدرجة حتى ترى عضلات بطنك بوضوح في المرآة يوميًا.</p>

<h2>كم يجب أن تكون نسبة الدهون؟</h2>
<p>يعتمد ذلك على الجينات وأين يخزّن جسمك الدهون، لكن كدليل تقريبي:</p>
<ul>
<li><strong>الرجال:</strong> يظهر شكل عضلات البطن عادةً عند حوالي 10 إلى 12% دهون، والسكس باك الحاد عند أقل من ذلك.</li>
<li><strong>النساء:</strong> يظهر شكل عضلات البطن عادةً عند حوالي 16 إلى 20% دهون. المرأة تحتاج طبيعيًا إلى نسبة دهون أعلى، والنزول كثيرًا قد يؤثر على الدورة الشهرية والطاقة والهرمونات، لذلك لا نلاحق النحافة المفرطة.</li>
</ul>
<p>دهون أسفل البطن عادةً آخر ما يذهب عند الرجال، والأرداف والفخذان عند كثير من النساء. وهذا طبيعي، وليس علامة على وجود مشكلة.</p>

<h2>الخطوة 1: كُل بعجز بسيط في السعرات</h2>
<p>لخسارة الدهون، تحتاج أن تأكل طاقة أقل قليلًا مما يستهلكه جسمك. عجز يقارب 300 إلى 500 سعرة يوميًا يكفي لمعظم الناس، ويتيح لك خسارة حوالي 0.5 إلى 1% من وزنك أسبوعيًا مع الحفاظ على عضلاتك وطاقتك.</p>
<ul>
<li>اعرف رقمك المبدئي من <a href="/ar/calculator.html">حاسبة السعرات المجانية</a>.</li>
<li>الحياة في دبي تجعل ذلك أصعب: البرانش والكرك والشاورما وتطبيقات التوصيل تتراكم بسرعة. اعرف سعرات أكلاتك المفضلة في <a href="/ar/dubai-food-calories.html">دليل سعرات أكلات دبي</a>، من <a href="/ar/calories/karak-chai.html">شاي الكرك</a> إلى <a href="/ar/calories/chicken-shawarma.html">شاورما الدجاج</a>.</li>
<li>لا تحتاج أن تقطع الكربوهيدرات أو الأكل الذي تحبه. المهم أن يكون المجموع خلال الأسبوع صحيحًا.</li>
</ul>

<h2>الخطوة 2: تناول ما يكفي من البروتين</h2>
<p>البروتين يشبعك ويحمي عضلاتك أثناء خسارة الدهون. استهدف حوالي 1.6 إلى 2.2 غرام بروتين لكل كيلوغرام من وزنك يوميًا، موزّعة على وجباتك. لشخص وزنه 80 كغ، هذا تقريبًا 130 إلى 175 غرامًا يوميًا. مصادر سهلة: <a href="/ar/calories/chicken-breast.html">صدر الدجاج</a>، والسمك، و<a href="/ar/calories/boiled-egg.html">البيض</a>، والزبادي اليوناني، واللبن، والعدس، و<a href="/ar/calories/protein-shake.html">شيك البروتين</a> عندما تكون مشغولًا.</p>

<h2>الخطوة 3: تمرّن بالأوزان 3 إلى 4 مرات أسبوعيًا</h2>
<p>تمرين القوة هو ما يحافظ على عضلاتك أثناء الدايت، حتى يكون الوزن الذي تخسره دهونًا لا عضلات. السكوات والديدلفت والضغط والسحب والعقلة تُشغّل عضلات الجذع بقوة أيضًا. اتبع برنامجًا منظّمًا وحاول زيادة الوزن أو التكرارات قليلًا مع الوقت. <a href="/exercise-library.html">مكتبة التمارين</a> (بالإنجليزية) تشرح الحركات الأساسية بالأداء الصحيح.</p>

<h2>الخطوة 4: درّب عضلات البطن مباشرة، 2 إلى 3 مرات أسبوعيًا</h2>
<p>عضلات البطن مثل أي عضلة أخرى: تنمو عندما تعطيها مقاومة وتزيد صعوبتها مع الوقت. بضع مجموعات قوية أفضل من 100 كرنش سهلة يوميًا. اختر 2 أو 3 من هذه التمارين وأضفها في نهاية تمرينك:</p>
{AR_ABS}
<p>عندما يصبح التمرين سهلًا، زِد صعوبته: ساقان أكثر استقامة، أو وزن أكبر على الكيبل، أو مسافة أطول بالعجلة، أو نزول أبطأ.</p>

<h2>الخطوة 5: امشِ أكثر ونَم أكثر</h2>
<ul>
<li><strong>الخطوات:</strong> 8,000 إلى 10,000 خطوة يوميًا تحرق طاقة مفاجئة دون أن تفتح شهيتك كما يفعل الكارديو العنيف. في صيف دبي، امشِ في المول أو على جهاز المشي أو في المساء.</li>
<li><strong>النوم:</strong> 7 إلى 9 ساعات. قلة النوم تزيد الجوع، خاصة للسكريات، وتضعف أداءك في التمرين.</li>
</ul>

<h2>كم يستغرق الحصول على عضلات بطن ظاهرة؟</h2>
<p>يعتمد بالكامل تقريبًا على كمية الدهون التي تحتاج أن تخسرها. هذا مثال تقريبي لرجل وزنه 85 كغ يصل إلى حوالي 10% دهون مع الحفاظ على عضلاته:</p>
{AR_TIME}
<p>النساء يتبعن نمطًا مشابهًا عادةً، لكن بخط نهاية أعلى في نسبة الدهون. يتفاجأ معظم الناس بطول المدة التي تأخذها آخر الكيلوغرامات، ولهذا الاستمرار أهم من أسبوع مثالي.</p>

<h2>خرافات عن عضلات البطن تجاهلها</h2>
<ul>
<li><strong>"الكرنش يحرق دهون البطن."</strong> لا يمكنك اختيار مكان خسارة الدهون. تمارين البطن تبني العضلة، وخسارة الدهون تحدث في الجسم كله.</li>
<li><strong>"تحتاج حارقات دهون أو شاي ديتوكس."</strong> لا تقوم بعمل عجز السعرات، وبعضها غير آمن.</li>
<li><strong>"التعرّق أكثر بحزام التنحيف أو حزام الساونا يساعد."</strong> تخسر ماءً فقط، ويعود فورًا.</li>
<li><strong>"عضلات البطن السفلية تحتاج تمارين خاصة."</strong> السكس باك عضلة واحدة. دهون أسفل البطن فقط تذهب أخيرًا.</li>
<li><strong>"يجب تمرين البطن كل يوم."</strong> جلستان أو ثلاث جلسات قوية أسبوعيًا مع راحة بينها أفضل.</li>
</ul>

<h2>متى يساعدك المدرب؟</h2>
<p>معظم من لا يحصلون على عضلات البطن يعرفون النظرية. ما ينقصهم هو خطة تناسب أسبوعهم، وشخص يتابع الأرقام، وشخص يحفّزهم عندما يتباطأ التقدّم. وهذا ما أقدّمه لعملائي، تدريب شخصي في <a href="/ar/personal-trainer-dubai.html">نوقز جيم بالقوز</a> أو عبر <a href="/ar/online-coaching.html">التدريب أونلاين</a>. وللسيدات اللواتي يفضّلن مدربة، كلوي تدرّب <a href="/ar/female-personal-trainer-dubai.html">السيدات فقط في ميدان</a>.</p>

<h2>أسئلة شائعة</h2>
{{faq}}''',
 faq=[('هل يمكن الحصول على سكس باك بتمارين البطن فقط؟', 'لا. تمارين البطن تبني العضلة، لكنك لا ترى عضلات بطنك إلا عندما تكون نسبة الدهون منخفضة بما يكفي، وهذا يأتي من الأكل والنشاط اليومي.'),
      ('ما نسبة الدهون المطلوبة لظهور عضلات البطن؟', 'تقريبًا 10 إلى 12% للرجال و16 إلى 20% للنساء لرؤية شكل واضح. وتختلف حسب الجينات وأين يخزّن جسمك الدهون.'),
      ('كم يستغرق الحصول على عضلات بطن ظاهرة؟', 'يعتمد على كمية الدهون التي تحتاج خسارتها. بمعدل 0.5 إلى 0.75 كغ أسبوعيًا، يحتاج رجل يبدأ من حوالي 20% دهون غالبًا 3 إلى 5 أشهر، ومن يبدأ بنسبة أقل يحتاج وقتًا أقل.'),
      ('ما أفضل تمارين البطن؟', 'التمارين التي يمكن زيادة صعوبتها مع الوقت: رفع الركبتين أو الساقين معلّقًا، والكرنش على الكيبل، وعجلة البطن، والبلانك، وبالوف برس، 2 إلى 3 مرات أسبوعيًا مع برنامج قوة كامل.'),
      ('هل يمكن للمرأة أن تحصل على عضلات بطن ظاهرة؟', 'نعم. تظهر عضلات البطن عند المرأة عادةً عند نسبة دهون أعلى قليلًا من الرجل، حوالي 16 إلى 20%. والنزول أكثر بكثير قد يؤثر على الدورة الشهرية والطاقة والهرمونات، لذلك ليس هدفًا صحيًا لمعظم النساء.'),
      ('هل يجب أن أتوقف عن الكربوهيدرات أو أكلي المفضل؟', 'لا. المهم مجموع السعرات والبروتين خلال الأسبوع. كثير من عملائنا ما زالوا يأكلون الأرز والخبز والكرك وبرانش من وقت لآخر أثناء خسارة الدهون.')],
 related_h='اقرأ أيضًا',
 related=[('/ar/calculator.html', 'حاسبة السعرات الحرارية والماكروز'), ('/ar/dubai-food-calories.html', 'سعرات أكلات دبي'),
          ('/ar/personal-trainer-dubai.html', 'مدرب شخصي في دبي مع طارق'), ('/tarek-elzamek.html', 'تعرّف على طارق (بالإنجليزية)')],
 cta_h='تريد عضلات بطن ظاهرة؟ <em>لنخطط لها معًا</em>', cta_p='تدريب شخصي في نوقز جيم بالقوز، أو تدريب أونلاين من أي مكان · مكالمة استشارية مجانية',
 cta_btn='راسل طارق على واتساب', wa='مرحبًا طارق، قرأت دليلك عن عضلات البطن وأحتاج مساعدتك للوصول.',
 crumb='كيف تحصل على عضلات بطن ظاهرة؟', home='الرئيسية', blog='المدونة',
),
}
