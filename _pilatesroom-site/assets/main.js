(function () {
  // mobile menu
  var b = document.querySelector('.burger'), m = document.getElementById('menu'), c = document.querySelector('.menu-close');
  function set(o) { if (!m) return; m.classList.toggle('open', o); document.body.style.overflow = o ? 'hidden' : ''; if (b) b.setAttribute('aria-expanded', o); }
  if (b) b.addEventListener('click', function () { set(true); });
  if (c) c.addEventListener('click', function () { set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });

  // reveal on scroll
  var els = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
  } else els.forEach(function (e) { e.classList.add('in'); });

  // launch-offer countdown / auto-hide
  var end = new Date('2026-10-31T23:59:59+04:00'), offer = document.querySelector('[data-offer]'), cd = document.querySelector('[data-countdown]');
  if (offer) {
    if (Date.now() > end) offer.remove();
    else if (cd) { var d = Math.ceil((end - Date.now()) / 864e5); cd.textContent = d <= 1 ? 'Last day' : d + ' days left'; }
  }

  // track WhatsApp clicks if analytics is enabled
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"]');
    if (a && window.gtag) gtag('event', 'whatsapp_click', { page: location.pathname });
  });
})();
