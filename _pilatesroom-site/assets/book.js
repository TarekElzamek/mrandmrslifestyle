(function () {
  var D = window.TPR, P = D.prices, form = document.getElementById('bookForm');
  if (!form) return;
  var offerLive = Date.now() <= new Date(D.offer_ends).getTime();
  var state = { session: 'private', option: '1', day: null, time: null };
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return 'AED ' + n.toLocaleString('en-US'); };
  var params = new URLSearchParams(location.search);
  if (params.get('session') && P[params.get('session')]) state.session = params.get('session');
  if (params.get('option')) state.option = params.get('option');

  function priceOf(o) { return offerLive && o.offer ? o.offer : o.price; }
  function current() { var d = P[state.session]; return d.opts.filter(function (o) { return o.id === state.option; })[0] || d.opts[0]; }

  function renderOptions() {
    var d = P[state.session], html = '';
    if (!d.opts.some(function (o) { return o.id === state.option; })) state.option = '1';
    d.opts.forEach(function (o) {
      var p = priceOf(o), was = p !== o.price ? '<s>' + fmt(o.price) + '</s>' : '';
      var pp = d.per_person ? '<small>' + fmt(Math.round(p / 2)) + ' per person</small>' : '';
      var badge = offerLive && o.offer ? 'Launch offer · ends 31 Oct' : (o.badge || (o.id === '1' ? 'Try it first' : ''));
      html += '<div class="opt"><input type="radio" name="option" id="opt-' + o.id + '" value="' + o.id + '"' + (o.id === state.option ? ' checked' : '') + '>' +
        '<label for="opt-' + o.id + '"><b>' + o.label + '</b><small>' + badge + '</small><span class="p">' + was + fmt(p) + '</span>' + pp + '</label></div>';
    });
    $('optList').innerHTML = html;
    $('buddyField').hidden = state.session !== 'buddy';
  }

  // next 21 days
  var days = [], now = new Date();
  for (var i = 0; i < 21; i++) { var x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); days.push(x); }
  var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dayLabel(d) { return DN[d.getDay()] + ' ' + d.getDate() + ' ' + MN[d.getMonth()]; }
  $('days').innerHTML = days.map(function (d, i) {
    var top = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DN[d.getDay()];
    return '<div class="opt"><input type="radio" name="day" id="day-' + i + '" value="' + i + '"><label for="day-' + i + '"><small>' + top + '</small><b>' + d.getDate() + '</b><small>' + MN[d.getMonth()] + '</small></label></div>';
  }).join('');

  var SLOTS = []; for (var h = 6; h <= 19; h++) SLOTS.push(h);
  function hLabel(h) { var ap = h < 12 ? 'am' : 'pm', hh = h % 12 || 12; return hh + ':00 ' + ap; }
  function renderTimes() {
    var idx = state.day, html = '';
    SLOTS.forEach(function (h) {
      var past = idx === 0 && h <= new Date().getHours() + 1;
      html += '<div class="opt"><input type="radio" name="time" id="t-' + h + '" value="' + h + '"' + (past ? ' disabled' : '') + (state.time === h && !past ? ' checked' : '') + '><label for="t-' + h + '"><b>' + hLabel(h) + '</b></label></div>';
    });
    $('times').innerHTML = idx === null ? '<p style="grid-column:1/-1;font-size:.9rem">Choose a day to see times.</p>' : html;
  }

  function summary() {
    var d = P[state.session], o = current(), p = priceOf(o);
    $('sSession').textContent = d.name + ' (' + d.short + ')';
    $('sOption').textContent = o.label;
    var flex = $('flex').checked;
    $('sWhen').textContent = state.day === null ? 'Choose a day' : dayLabel(days[state.day]) + (flex ? ', any time' : state.time !== null ? ', ' + hLabel(state.time) : '');
    $('sTotal').textContent = fmt(p);
  }

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'session') { state.session = t.value; renderOptions(); }
    if (t.name === 'option') state.option = t.value;
    if (t.name === 'day') { state.day = +t.value; renderTimes(); }
    if (t.name === 'time') state.time = +t.value;
    if (t.id === 'flex') $('times').style.opacity = t.checked ? .4 : 1;
    summary();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('err'), name = $('fname').value.trim(), phone = $('fphone').value.trim(), flex = $('flex').checked;
    var msg = !name ? 'Please enter your name.' : phone.replace(/\D/g, '').length < 8 ? 'Please enter your mobile number.' :
      state.day === null ? 'Please choose a day.' : (!flex && state.time === null) ? 'Please choose a time, or tick "I\'m flexible".' :
      !$('fterms').checked ? 'Please accept the cancellation policy.' : '';
    if (msg) { err.textContent = msg; err.style.display = 'block'; return; }
    err.style.display = 'none';
    var d = P[state.session], o = current(), p = priceOf(o);
    var when = dayLabel(days[state.day]) + (flex ? ' (flexible, any time)' : ', ' + hLabel(state.time));
    var lines = ['Hi Chloe! I would like to book:', '', '• ' + d.name + ' (' + d.short + ')', '• ' + o.label + ': ' + fmt(p) + (offerLive && o.offer ? ' (launch offer)' : ''),
      '• Preferred: ' + when, '', 'Name: ' + name, 'Mobile: ' + phone];
    var email = $('femail').value.trim(), buddy = $('fbuddy').value.trim(), notes = $('fnotes').value.trim();
    if (email) lines.push('Email: ' + email);
    if (state.session === 'buddy' && buddy) lines.push('Buddy: ' + buddy);
    if (notes) lines.push('Notes: ' + notes);
    var text = lines.join('\n'), url = 'https://wa.me/' + D.wa + '?text=' + encodeURIComponent(text);

    if (D.formspree) {
      fetch('https://formspree.io/f/' + D.formspree, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: 'New booking request: ' + name, name: name, phone: phone, email: email, session: d.name, option: o.label, price: fmt(p), preferred: when, buddy: buddy, notes: notes }) }).catch(function () {});
    }
    if (window.gtag) gtag('event', 'generate_lead', { form: 'booking', session: state.session, option: o.label, value: p, currency: 'AED' });

    window.open(url, '_blank');
    $('waAgain').href = url;
    var pay = D.stripe && D.stripe[state.session + '-' + o.id];
    if (pay) { $('payBtn').href = pay; $('payBtn').hidden = false; }
    form.style.display = 'none'; $('done').style.display = 'block';
    $('done').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // init
  document.querySelector('input[name="session"][value="' + state.session + '"]').checked = true;
  renderOptions(); renderTimes(); summary();
})();
