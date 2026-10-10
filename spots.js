/* Online coaching availability — change SPOTS here (one place) when a client signs up. */
(function () {
  var SPOTS = 3;
  var month = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });
  document.querySelectorAll('[data-spots]').forEach(function (el) { el.textContent = SPOTS; });
  document.querySelectorAll('[data-spots-word]').forEach(function (el) { el.textContent = SPOTS === 1 ? 'Spot' : 'Spots'; });
  document.querySelectorAll('[data-month]').forEach(function (el) { el.textContent = month; });
})();
