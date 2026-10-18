/* Online coaching availability — change SPOTS here (one place) when a client signs up. */
(function () {
  var SPOTS = 2;
  var month = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });
  document.querySelectorAll('[data-spots]').forEach(function (el) { el.textContent = SPOTS; });
  document.querySelectorAll('[data-spots-word]').forEach(function (el) { el.textContent = SPOTS === 1 ? 'Spot' : 'Spots'; });
  var monthName = new Date().toLocaleString('en-GB', { month: 'long', timeZone: 'Asia/Dubai' });
  document.querySelectorAll('[data-month-name]').forEach(function (el) { el.textContent = monthName; });
  document.querySelectorAll('[data-spots-word-lc]').forEach(function (el) { el.textContent = SPOTS === 1 ? 'spot' : 'spots'; });
  document.querySelectorAll('[data-month]').forEach(function (el) { el.textContent = month; });
})();
