/* Mr & Mrs Lifestyle — analytics & conversion tracking (one file, every page).
 *
 * TO ACTIVATE AD TRACKING: paste the IDs below and redeploy.
 *   metaPixel  : Meta Events Manager → Data sources → your Pixel ID (digits only)
 *   googleAds  : Google Ads → Goals → Conversions → tag "AW-XXXXXXXXX"
 *   adsLabels  : the conversion label for each action (the part after the "/")
 */
(function () {
  var CFG = {
    ga: 'G-2E0EXHN28J',
    metaPixel: '',
    googleAds: '',
    adsLabels: { lead: '', whatsapp: '', checkout: '', purchase: '' }
  };

  /* ---------- Google Analytics (loads only if the page didn't already) ---------- */
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
    var g = document.createElement('script');
    g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.ga;
    document.head.appendChild(g);
    window.gtag('js', new Date());
    window.gtag('config', CFG.ga);
  }
  if (CFG.googleAds) window.gtag('config', CFG.googleAds);

  /* ---------- Meta Pixel (only when an ID is set) ---------- */
  if (CFG.metaPixel && !window.fbq) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CFG.metaPixel);
    window.fbq('track', 'PageView');
  }

  /* ---------- Where did this visitor come from? (first + latest visit) ---------- */
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  var q = new URLSearchParams(location.search);
  var ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
  var internal = ref && ref.indexOf('mrandmrslifestyle') !== -1;
  var touch = {
    source: q.get('utm_source') || (internal ? '' : ref) || 'direct',
    medium: q.get('utm_medium') || (q.get('gclid') ? 'cpc' : q.get('fbclid') ? 'paid_social' : (ref && !internal ? 'referral' : '')),
    campaign: q.get('utm_campaign') || '',
    landing: location.pathname,
    date: new Date().toISOString().slice(0, 10)
  };
  if (!internal) { if (!store('mm_first')) store('mm_first', touch); store('mm_last', touch); }
  function attribution() {
    var f = store('mm_first') || {}, l = store('mm_last') || {};
    return {
      first_source: [f.source, f.medium, f.campaign].filter(Boolean).join(' / ') || 'unknown',
      latest_source: [l.source, l.medium, l.campaign].filter(Boolean).join(' / ') || 'unknown',
      landing_page: f.landing || '', submitted_from: location.pathname
    };
  }
  window.mmAttribution = attribution;

  /* ---------- Send one event to every connected platform ---------- */
  function ev(name, params, metaEvent, adsKey) {
    params = params || {};
    try { window.gtag('event', name, params); } catch (e) {}
    if (window.fbq && metaEvent) try { window.fbq('track', metaEvent, params); } catch (e) {}
    if (CFG.googleAds && adsKey && CFG.adsLabels[adsKey]) try { window.gtag('event', 'conversion', { send_to: CFG.googleAds + '/' + CFG.adsLabels[adsKey] }); } catch (e) {}
  }
  window.mmTrack = ev;

  /* ---------- Clicks ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (a) {
      var h = a.getAttribute('href') || '', label = (a.textContent || '').trim().slice(0, 60);
      if (h.indexOf('wa.me/') !== -1) ev('whatsapp_click', { coach: h.indexOf('971547011995') !== -1 ? 'Chloe' : 'Tarek', link_text: label }, 'Contact', 'whatsapp');
      else if (h.indexOf('tel:') === 0) ev('phone_click', { link_text: label }, 'Contact');
      else if (h.indexOf('mailto:') === 0) ev('email_click', { link_text: label }, 'Contact');
      else if (h.indexOf('maps.app.goo.gl') !== -1 || h.indexOf('google.com/maps') !== -1) ev('directions_click', { link_text: label }, 'FindLocation');
      else if (h.indexOf('thepilatesroombychloe.com') !== -1) ev('booking_site_click', { link_text: label }, 'Schedule');
      else if (h.indexOf('instagram.com') !== -1 || h.indexOf('youtube.com') !== -1) ev('social_click', { network: h.indexOf('instagram') !== -1 ? 'Instagram' : 'YouTube' });
      else if (/apply\.html/.test(h)) ev('apply_click', { link_text: label });
      return;
    }
    var b = e.target.closest && e.target.closest('button[onclick*="openIntakeModal"]');
    if (b) { var m = (b.getAttribute('onclick') || '').match(/openIntakeModal\([^,]+,\s*'([^']+)'/); ev('select_package', { item_name: m ? m[1] : '' }, 'AddToCart'); }
  }, true);

  /* ---------- Forms: add the visitor's source to every enquiry + record the lead ---------- */
  var _fetch = window.fetch;
  if (_fetch) window.fetch = function (url, opts) {
    var isForm = typeof url === 'string' && url.indexOf('formspree.io') !== -1 && opts && typeof opts.body === 'string';
    var data = null;
    if (isForm) {
      try {
        data = JSON.parse(opts.body);
        var at = attribution(); for (var k in at) if (!(k in data)) data[k] = at[k];
        var heard = document.getElementById('mm-heard');
        if (heard && heard.value && !data.heard_about) data.heard_about = heard.value;
        opts = Object.assign({}, opts, { body: JSON.stringify(data) });
      } catch (e) { data = null; }
    }
    var p = _fetch.call(this, url, opts);
    if (isForm && data) p.then(function (r) {
      if (!r.ok) return;
      var src = data.source || '';
      if (/Buy Now/i.test(src)) ev('begin_checkout', { item_name: data.package || '', currency: 'AED' }, 'InitiateCheckout', 'checkout');
      else ev('generate_lead', { form: src || location.pathname, heard_about: data.heard_about || '' }, 'Lead', 'lead');
    }).catch(function () {});
    return p;
  };

  /* ---------- Stripe success page ---------- */
  if (/thank-you/.test(location.pathname)) ev('purchase', { currency: 'AED' }, 'Purchase', 'purchase');
})();
