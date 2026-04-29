/**
 * Mr & Mrs Lifestyle — shared.js
 * Edit CONFIG below with your real values before deploying.
 */

const CONFIG = {
  whatsapp:    '971507871515',
  whatsappMsg: "Hi Tarek & Chloe! I just visited your website and I'm interested in coaching. Can we chat?",
  instagram:   'mrandmrslifestyle',
  email:       'info@mrandmrslifestyle.com',
  gaId:        'G-2E0EXHN28J',
  formspreeApply: 'mdayvono',
  formspreeGuide: 'xvzdnogv',
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

// ── FORMSPREE SUBMISSION HELPER ───────────────────────────────────────
async function submitToFormspree(formId, data) {
  if (!formId || formId.startsWith('YOUR_')) {
    console.warn('Formspree ID not set — go to formspree.io, create a form, and paste the ID in shared.js');
    return true;
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
