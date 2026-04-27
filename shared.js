/**
 * Mr & Mrs Lifestyle — shared.js
 * Edit CONFIG below with your real values before deploying.
 */

const CONFIG = {
  whatsapp:    '971507871515',
  whatsappMsg: "Hi Tarek & Chloe! I just visited your website and I'm interested in coaching. Can we chat?",
  instagram:   'mrandmrslifestyle',
  email:       'info@mrandmrslifestyle.com',
  gaId:        '',                    // ← Paste your Google Analytics 4 ID here (G-XXXXXXXXXX)
  formspreeApply: 'mdayvono',         // ← Your Coaching Application form ID
  formspreeGuide: 'YOUR_GUIDE_ID',   // ← Replace after creating Formspree form "Blueprint Download"
};

// ── GOOGLE ANALYTICS ─────────────────────────────────────────────────
if (CONFIG.gaId) {
  const s = document.createElement('script');
  s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.gaId}`;
  s.async = true;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', CONFIG.gaId);
}

// ── WHATSAPP FLOATING BUTTON ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.createElement('a');
  btn.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappMsg)}`;
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.setAttribute('aria-label', 'Chat on WhatsApp');
  btn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.121 1.528 5.849L0 24l6.335-1.508A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.214-3.727.977.993-3.634-.234-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>`;
  Object.assign(btn.style, {
    position:'fixed', bottom:'24px', right:'24px', zIndex:'9999',
    width:'56px', height:'56px', borderRadius:'50%', background:'#25D366',
    display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow:'0 4px 20px rgba(37,211,102,0.45)', transition:'transform 0.2s, box-shadow 0.2s',
    textDecoration:'none',
  });
  btn.onmouseenter = () => { btn.style.transform='scale(1.1)'; btn.style.boxShadow='0 6px 28px rgba(37,211,102,0.6)'; };
  btn.onmouseleave = () => { btn.style.transform='scale(1)'; btn.style.boxShadow='0 4px 20px rgba(37,211,102,0.45)'; };
  document.body.appendChild(btn);
});

// ── FORMSPREE SUBMISSION HELPER ───────────────────────────────────────
// Called from apply.html and free-guide.html
async function submitToFormspree(formId, data) {
  if (!formId || formId.startsWith('YOUR_')) {
    console.warn('Formspree ID not set — go to formspree.io, create a form, and paste the ID in shared.js');
    return true; // Still show success screen
  }
  try {
    const res = await fetch(`https://formspree.io/f/${formId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch(e) {
    console.error('Formspree error:', e);
    return false;
  }
}
