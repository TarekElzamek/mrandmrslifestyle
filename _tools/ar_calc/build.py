# Builds ar/calculator.html (Arabic calorie & macro calculator). Same formulas as /calculator.html.
# Run from repo root:  python3 _tools/ar_calc/build.py
import os, sys, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, '_tools', 'food'))
import build as fb  # food builder: shared head/header/footer/CSS
from foods import FOODS

PATH, ALT = '/ar/calculator.html', '/calculator.html'
N = len(FOODS)
TITLE = 'حاسبة السعرات الحرارية والماكروز المجانية | Mr &amp; Mrs Lifestyle'
DESC = 'حاسبة سعرات حرارية مجانية بالعربي: احسب سعراتك لخسارة الوزن أو زيادة العضل، مع البروتين والكربوهيدرات والدهون ومؤشر كتلة الجسم، من مدربي دبي طارق وكلوي.'

FAQ = [
 ('كيف أحسب سعراتي الحرارية اليومية؟', 'نحسب أولًا معدل الأيض الأساسي (BMR) بمعادلة ميفلين سان جيور من وزنك وطولك وعمرك وجنسك، ثم نضربه في مستوى نشاطك لنعرف السعرات التي تحافظ على وزنك (TDEE). بعدها نطرح أو نضيف سعرات حسب هدفك.'),
 ('كم سعرة أحتاج لخسارة الوزن؟', 'لخسارة الدهون بشكل ثابت نطرح عادةً 400 سعرة يوميًا من سعرات الحفاظ على الوزن، أو 750 سعرة لخسارة أسرع. معظم السيدات يخسرن الدهون على 1,400 إلى 1,800 سعرة، ومعظم الرجال على 1,900 إلى 2,500 سعرة، حسب الوزن والنشاط.'),
 ('كم غرام بروتين أحتاج يوميًا؟', 'أثناء خسارة الدهون ننصح بحوالي 2.2 غ بروتين لكل كيلوغرام من وزنك، وحوالي 1.8 إلى 2 غ لكل كيلوغرام للحفاظ على الوزن أو بناء العضل. البروتين يشبعك ويحافظ على عضلاتك.'),
 ('هل نتيجة الحاسبة دقيقة؟', 'هي نقطة بداية جيدة جدًا وليست رقمًا نهائيًا. تابع وزنك لمدة أسبوعين إلى ثلاثة، وإذا لم يتحرك كما تتوقع عدّل سعراتك بـ 100 إلى 150 سعرة.'),
]

TIPS = [
 ('ابدأ بالبروتين', 'قبل أن تقلق من مجموع السعرات، احرص على الوصول لهدف البروتين كل يوم. يشبعك ويحافظ على عضلاتك ويسهّل عليك الالتزام بسعراتك.'),
 ('توقّع أن تعدّل', 'هذه الأرقام تقديرية. بعد أسبوعين أو ثلاثة تابع متوسط وزنك، وإذا لم يتغير كما تتوقع عدّل بـ 100 إلى 150 سعرة.'),
 ('استراتيجية دبي', 'تأكل خارج البيت 4 أو 5 مرات في الأسبوع؟ اطلب البروتين أولًا، والصلصات على الجانب، وتوقف عند الشبع بنسبة 80%.'),
 ('اشرب ماء أكثر', 'في حر دبي يختلط العطش بالجوع كثيرًا. اشرب 3 إلى 4 لترات ماء يوميًا، وستلاحظ أن الرغبة في الأكل تقل.'),
 ('اوزن نفسك بالطريقة الصحيحة', 'اوزن نفسك صباحًا بعد الحمام وقبل الأكل، 3 إلى 4 مرات في الأسبوع، وتابع المتوسط وليس رقم يوم واحد.'),
 ('الاستمرار أهم من الكمال', 'الالتزام بـ 90% من أهدافك كل يوم أفضل من 100% لثلاثة أيام ثم التوقف. أنجح عملائنا مستمرون وليسوا مثاليين.'),
]

CSS = '''
.cx-card{background:#141414;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1.8rem;margin-top:1.5rem}
.cx-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.cx-f label{display:block;font-size:.85rem;color:rgba(255,255,255,.75);margin-bottom:.4rem;font-weight:500}
.cx-f input,.cx-f select{width:100%;padding:.85rem 1rem;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#0d0d0d;color:#fff;font-size:1rem;font-family:inherit}
.cx-seg{display:flex;gap:.5rem}.cx-seg button{flex:1;padding:.8rem;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#0d0d0d;color:#fff;font-family:inherit;font-size:.95rem;cursor:pointer}
.cx-seg button.on,.cx-goal.on{border-color:var(--gold);background:rgba(201,168,76,.15);color:var(--gold)}
.cx-goals{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem}
.cx-goal{padding:.85rem .5rem;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#0d0d0d;color:#fff;font-family:inherit;font-size:.92rem;cursor:pointer}
.cx-go{width:100%;margin-top:1.4rem;padding:1.05rem;border:0;border-radius:8px;background:var(--gold);color:#0a0a0a;font-weight:700;font-size:1.05rem;font-family:inherit;cursor:pointer}
.cx-err{display:none;color:#ff8a80;margin-top:.8rem;font-size:.9rem}
#cxRes{display:none}
.cx-big{text-align:center;padding:1rem 0 1.4rem;border-bottom:1px solid rgba(255,255,255,.08)}
.cx-big b{display:block;font-size:3.6rem;color:var(--gold);font-family:var(--font-d);line-height:1.1}
.cx-big span{color:rgba(255,255,255,.7)}
.cx-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin:1.3rem 0}
.cx-stat{background:#0d0d0d;border-radius:10px;padding:.9rem;text-align:center}.cx-stat b{display:block;font-size:1.35rem}.cx-stat span{font-size:.78rem;color:rgba(255,255,255,.6)}
.cx-bmi{position:relative;height:8px;border-radius:4px;background:linear-gradient(90deg,#3498db 0 14%,#2ecc71 14% 40%,#f39c12 40% 60%,#e74c3c 60%);margin:.7rem 0 .4rem;direction:ltr}
.cx-bmi i{position:absolute;top:-5px;width:4px;height:18px;background:#fff;border-radius:2px}
.cx-mac{margin-top:1.2rem}.cx-mac div{display:grid;grid-template-columns:110px 1fr 60px;gap:.8rem;align-items:center;margin:.55rem 0}
.cx-mac .bar{height:8px;background:#0d0d0d;border-radius:4px;overflow:hidden}.cx-mac .bar i{display:block;height:100%;background:var(--gold);width:0;transition:width .6s}
.cx-tips{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem}
.cx-tip{background:#141414;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1.3rem}.cx-tip h3{color:var(--gold);font-size:1.05rem;margin-bottom:.4rem}.cx-tip p{color:rgba(255,255,255,.75);font-size:.92rem;line-height:1.7}
.cx-faq details{border-bottom:1px solid rgba(255,255,255,.1);padding:1rem 0}.cx-faq summary{cursor:pointer;font-weight:600}.cx-faq p{color:rgba(255,255,255,.75);margin-top:.6rem;line-height:1.8}
.cx-h2{font-size:1.6rem;margin:3rem 0 .4rem}
@media(max-width:640px){.cx-grid,.cx-tips{grid-template-columns:1fr}.cx-goals{grid-template-columns:1fr 1fr}.cx-stats{grid-template-columns:1fr 1fr 1fr}.cx-card{padding:1.3rem}.cx-big b{font-size:3rem}}
'''

JS = r'''<script>
(function(){
var sex='', goal='';
function seg(id,cb){document.querySelectorAll('#'+id+' button').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('#'+id+' button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');cb(b.dataset.v);});});}
seg('cxSex',function(v){sex=v});
document.querySelectorAll('.cx-goal').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('.cx-goal').forEach(function(x){x.classList.remove('on')});b.classList.add('on');goal=b.dataset.g;});});
var LBL={'lose-fast':'خسارة دهون سريعة','lose':'خسارة دهون','maintain':'الحفاظ على الوزن','gain':'بناء عضل','gain-fast':'تضخيم سريع','recomp':'إعادة تشكيل الجسم'};
var ADJ={'lose-fast':-750,'lose':-400,'maintain':0,'gain':300,'gain-fast':600,'recomp':-100};
function fmt(n){return Math.round(n).toLocaleString('en-US')}
document.getElementById('cxGo').addEventListener('click',function(){
 var age=parseFloat(document.getElementById('cxAge').value),w=parseFloat(document.getElementById('cxW').value),h=parseFloat(document.getElementById('cxH').value),act=parseFloat(document.getElementById('cxAct').value);
 var err=document.getElementById('cxErr');
 if(!age||!w||!h||!act||!sex||!goal){err.style.display='block';return;} err.style.display='none';
 var bmr=10*w+6.25*h-5*age+(sex==='m'?5:-161), tdee=Math.round(bmr*act), adj=ADJ[goal], t=Math.round(tdee+adj);
 var bmi=(w/Math.pow(h/100,2)).toFixed(1);
 var p=Math.round(w*((goal==='lose'||goal==='lose-fast')?2.2:(goal==='gain'||goal==='gain-fast')?2.0:1.8));
 var fp=(goal==='lose'||goal==='lose-fast')?0.28:(goal==='gain'||goal==='gain-fast')?0.25:0.3;
 var fc=Math.round(t*fp), f=Math.round(fc/9), c=Math.round((t-p*4-fc)/4), mx=Math.max(p,c,f);
 var bc,bt; if(bmi<18.5){bc='#3498db';bt='نقص في الوزن'}else if(bmi<25){bc='#2ecc71';bt='وزن صحي ✓'}else if(bmi<30){bc='#f39c12';bt='زيادة في الوزن'}else{bc='#e74c3c';bt='سمنة'}
 document.getElementById('cxKcal').textContent=fmt(t);
 document.getElementById('cxSub').textContent=LBL[goal]+' · '+(adj<0?'أقل من سعرات الحفاظ بـ '+Math.abs(adj)+' سعرة':adj>0?'أكثر من سعرات الحفاظ بـ '+adj+' سعرة':'سعرات الحفاظ على وزنك');
 document.getElementById('cxBmr').textContent=fmt(bmr);document.getElementById('cxTdee').textContent=fmt(tdee);
 document.getElementById('cxAdj').textContent=Math.abs(adj);document.getElementById('cxAdjL').textContent=adj<0?'العجز اليومي':adj>0?'الفائض اليومي':'التوازن';
 document.getElementById('cxBmi').textContent=bmi;document.getElementById('cxBmi').style.color=bc;document.getElementById('cxBmiT').textContent=bt;document.getElementById('cxBmiT').style.color=bc;
 document.getElementById('cxBmiM').style.left=Math.min(Math.max((bmi-15)/25*100,2),98)+'%';
 [['P',p],['C',c],['F',f]].forEach(function(x){document.getElementById('cx'+x[0]).textContent=x[1]+' غ';setTimeout(function(){document.getElementById('cx'+x[0]+'b').style.width=(x[1]/mx*100)+'%'},80)});
 window.mmCalc={kcal:t,p:p,c:c,f:f,goal:LBL[goal]};try{localStorage.setItem('mmTarget',t)}catch(e){}
 var wa='مرحبًا طارق وكلوي! استخدمت حاسبة السعرات. هدفي: '+LBL[goal]+' وسعراتي '+fmt(t)+'. أريد حجز استشارة مجانية.';
 document.getElementById('cxWa').href='https://wa.me/971507871515?text='+encodeURIComponent(wa);
 document.getElementById('cxFoods').textContent='شاهد كيف تناسب الشاورما والكرك و'+__N__+' أكلة سعراتك ('+fmt(t)+' سعرة) ←';
 var r=document.getElementById('cxRes');r.style.display='block';setTimeout(function(){r.scrollIntoView({behavior:'smooth',block:'start'})},60);
 if(window.gtag)gtag('event','calculator_used',{lang:'ar',goal:goal});
});
window.cxLead=function(e){e.preventDefault();var n=document.getElementById('cxN').value.trim(),m=document.getElementById('cxE').value.trim(),r=window.mmCalc||{};
 e.target.querySelector('button').style.display='none';
 fetch('https://formspree.io/f/mdayvono',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
  body:JSON.stringify({_subject:'🔥 New Calculator Lead (Arabic) — '+n,name:n,email:m,_replyto:m,goal:r.goal||'',calories:r.kcal||'',protein_g:r.p||'',carbs_g:r.c||'',fat_g:r.f||'',language:'ar',source:'Calorie Calculator (Arabic)'})}).catch(function(){});
 if(window.gtag)gtag('event','generate_lead',{lead_type:'calculator_ar'});
 document.getElementById('cxDone').style.display='block';return false;};
})();
</script>'''

def build():
    ld = [{"@context": "https://schema.org", "@type": "WebApplication", "name": "حاسبة السعرات الحرارية والماكروز", "inLanguage": "ar",
           "url": fb.SITE + PATH, "applicationCategory": "HealthApplication", "operatingSystem": "Any",
           "offers": {"@type": "Offer", "price": "0", "priceCurrency": "AED"}, "publisher": {"@id": fb.SITE + "/#business"}},
          {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": "ar",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]},
          fb.crumbs_ld('ar', [('الرئيسية', '/ar/'), ('حاسبة السعرات', PATH)])]
    s = fb.head('ar', TITLE, DESC, PATH, ALT, ld).replace('</head>', f'<style>{CSS}</style>\n</head>', 1)
    goals = [('lose-fast', 'خسارة دهون سريعة'), ('lose', 'خسارة دهون'), ('maintain', 'الحفاظ على الوزن'),
             ('gain', 'بناء عضل'), ('gain-fast', 'تضخيم سريع'), ('recomp', 'إعادة تشكيل الجسم')]
    acts = [('1.2', 'خامل: عمل مكتبي وتمرين قليل أو بدون'), ('1.375', 'نشاط خفيف: تمرين خفيف 1 إلى 3 أيام أسبوعيًا'),
            ('1.55', 'نشاط متوسط: تمرين 3 إلى 5 أيام أسبوعيًا'), ('1.725', 'نشاط عالٍ: تمرين قوي 6 إلى 7 أيام أسبوعيًا'),
            ('1.9', 'نشاط عالٍ جدًا: رياضي أو عمل بدني')]
    s += f'''
<div class="fc-hero" style="padding-bottom:1.5rem">
  <div class="fc-tag">أداة مجانية · بدون تسجيل</div>
  <h1>حاسبة السعرات الحرارية <em>والماكروز</em></h1>
  <p class="fc-sub">أدخل بياناتك واحصل على عدد سعراتك اليومية، والبروتين والكربوهيدرات والدهون، ومؤشر كتلة الجسم، في 30 ثانية.</p>
</div>
<div class="fc-wrap" style="max-width:820px">
  <nav class="fp-crumb" aria-label="breadcrumb"><a href="/ar/">الرئيسية</a> › حاسبة السعرات</nav>
  <section class="cx-card">
    <div class="cx-grid">
      <div class="cx-f"><label>الجنس</label><div class="cx-seg" id="cxSex"><button type="button" data-v="m">ذكر</button><button type="button" data-v="f">أنثى</button></div></div>
      <div class="cx-f"><label for="cxAge">العمر</label><input id="cxAge" type="number" inputmode="numeric" min="15" max="90" placeholder="مثلًا 30"></div>
      <div class="cx-f"><label for="cxW">الوزن (كغ)</label><input id="cxW" type="number" inputmode="decimal" min="35" max="250" placeholder="مثلًا 75"></div>
      <div class="cx-f"><label for="cxH">الطول (سم)</label><input id="cxH" type="number" inputmode="numeric" min="120" max="230" placeholder="مثلًا 170"></div>
    </div>
    <div class="cx-f" style="margin-top:1rem"><label for="cxAct">مستوى النشاط</label><select id="cxAct"><option value="">اختر مستوى نشاطك</option>{''.join(f'<option value="{v}">{t}</option>' for v, t in acts)}</select></div>
    <div class="cx-f" style="margin-top:1rem"><label>هدفك</label><div class="cx-goals">{''.join(f'<button type="button" class="cx-goal" data-g="{g}">{t}</button>' for g, t in goals)}</div></div>
    <button type="button" class="cx-go" id="cxGo">احسب سعراتي</button>
    <div class="cx-err" id="cxErr">يرجى تعبئة كل الخانات واختيار الجنس والهدف.</div>
  </section>

  <section class="cx-card" id="cxRes" aria-live="polite">
    <div class="cx-big"><span>سعراتك اليومية</span><b id="cxKcal">—</b><span id="cxSub"></span></div>
    <div class="cx-stats">
      <div class="cx-stat"><b id="cxBmr">—</b><span>معدل الأيض الأساسي (BMR)</span></div>
      <div class="cx-stat"><b id="cxTdee">—</b><span>سعرات الحفاظ على الوزن (TDEE)</span></div>
      <div class="cx-stat"><b id="cxAdj">—</b><span id="cxAdjL">العجز اليومي</span></div>
    </div>
    <div><strong>مؤشر كتلة الجسم (BMI): <span id="cxBmi">—</span></strong> <span id="cxBmiT" style="font-size:.9rem"></span>
      <div class="cx-bmi"><i id="cxBmiM"></i></div></div>
    <div class="cx-mac">
      <h2 class="fp-h" style="margin-top:1.4rem">الماكروز اليومية</h2>
      <div><span>بروتين</span><span class="bar"><i id="cxPb"></i></span><b id="cxP">—</b></div>
      <div><span>كربوهيدرات</span><span class="bar"><i id="cxCb"></i></span><b id="cxC">—</b></div>
      <div><span>دهون</span><span class="bar"><i id="cxFb"></i></span><b id="cxF">—</b></div>
    </div>
    <p style="margin-top:1.3rem"><a id="cxFoods" href="/ar/dubai-food-calories.html" style="color:var(--gold);font-weight:600">شاهد كيف تناسب أكلات دبي سعراتك ←</a></p>
    <div class="fc-lead" style="margin-top:1.6rem;grid-template-columns:1fr">
      <div>
        <div class="fc-tag" style="margin-bottom:.6rem">دليل PDF مجاني</div>
        <h2>تريد أن تلتزم بسعراتك وأنت تأكل خارج البيت؟</h2>
        <p>احصل مجانًا على دليل الأكل خارج البيت في دبي: ماذا تطلب من 29 أكلة مفضلة وتخسر الدهون في نفس الوقت.</p>
      </div>
      <form onsubmit="return cxLead(event)">
        <input id="cxN" type="text" required placeholder="الاسم الأول" autocomplete="given-name" aria-label="الاسم الأول">
        <input id="cxE" type="email" required placeholder="بريدك الإلكتروني" autocomplete="email" aria-label="بريدك الإلكتروني">
        <button type="submit">احصل على الدليل المجاني</button>
        <div class="fc-small">بدون رسائل مزعجة. يمكنك إلغاء الاشتراك في أي وقت.</div>
        <div class="fc-done" id="cxDone" role="status">دليلك جاهز:<a class="fc-btn" href="/guides/dubai-eating-out-guide-ar.pdf" target="_blank" rel="noopener" style="margin-top:.6rem;display:block">حمّل الدليل (PDF)</a></div>
      </form>
    </div>
    <div class="fc-pt" style="margin-top:1.4rem">
      <div><div class="fc-tag">استشارة مجانية</div><h2>تريد خطة كاملة مبنية على هذه الأرقام؟</h2>
      <p>طارق وكلوي يبنيان لك خطة تغذية وتمرين حول أكلك الفعلي في دبي، ويتابعان معك كل أسبوع.</p></div>
      <div class="fc-pt-act"><a class="fc-btn" id="cxWa" href="https://wa.me/971507871515" target="_blank" rel="noopener">راسلنا على واتساب</a>
      <a class="fc-btn fc-ghost" href="/ar/online-coaching.html">التدريب أونلاين</a></div>
    </div>
  </section>

  <h2 class="cx-h2">كيف تستخدم <em style="color:var(--gold);font-style:normal">هذه الأرقام</em></h2>
  <div class="cx-tips">{''.join(f'<div class="cx-tip"><h3>{a}</h3><p>{b}</p></div>' for a, b in TIPS)}</div>

  <h2 class="cx-h2">أسئلة شائعة</h2>
  <div class="cx-faq">{''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)}</div>
  <p class="fc-note" style="margin-top:2rem">النتائج تقديرية لأغراض التثقيف ولا تغني عن استشارة الطبيب، خاصة أثناء الحمل أو مع وجود حالة صحية.</p>
  {fb.cta('ar', 'اخسر الدهون بدون أن تتخلى عن أكلك المفضل')}
</div>
{JS.replace('__N__', str(N))}
'''
    s += fb.tail('ar')
    fb.write(PATH.lstrip('/'), s)
    print('written', PATH)

if __name__ == '__main__':
    build()
