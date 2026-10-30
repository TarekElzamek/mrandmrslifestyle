/* Mr & Mrs Lifestyle Tracker — clients log workouts, body weight and progress; coaches manage clients and programmes. */
(function () {
  'use strict';
  var SUPA_URL = 'https://iwtkphupsobwiaiqvkok.supabase.co';
  var SUPA_KEY = 'sb_publishable_L1RcJTZ1UTT_XocBLPLSYg_tPpPFWbU';
  var sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
  });

  var EX = (window.MM_EXERCISES || []).map(function (e) { return { name: e[0], cat: e[1], m: e[2], type: e[3], how: e[4] }; });
  var EXMAP = {}; EX.forEach(function (e) { EXMAP[e.name] = e; });
  // Free demo videos come from videos.js; the full coach library loads from Supabase for coaches and clients with a programme.
  var VIDS = JSON.parse(JSON.stringify(window.MM_VIDEOS || {}));
  async function loadVideos() {
    try {
      var r = await sb.from('exercise_videos').select('exercise,youtube_id,label,sort').order('sort');
      if (!r.data || !r.data.length) return;
      r.data.forEach(function (v) { var a = VIDS[v.exercise] = VIDS[v.exercise] || []; if (!a.some(function (x) { return x[0] === v.youtube_id; })) a.push([v.youtube_id, v.label || '']); });
      if (S.me && !document.querySelector('.modal') && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) render();
    } catch (e) {}
  }
  function vidsFor(name) { return VIDS[name] || []; }
  function videoBox(name, key) {
    var vs = vidsFor(name); if (!vs.length) return '';
    var h = '<div class="ex-vid" data-vbox="' + key + '"><div class="ex-vid-frame"></div>';
    if (vs.length > 1) h += '<div class="chips ex-vid-tabs" role="group" aria-label="Choose demo video">' + vs.map(function (v, i) { return '<button type="button" aria-pressed="' + (i ? 'false' : 'true') + '" data-vid="' + esc(v[0]) + '">' + esc(v[1]) + '</button>'; }).join('') + '</div>';
    return h + '</div>';
  }
  function playVideo(box, id) {
    var vs = box.querySelectorAll('[data-vid]'); vs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.vid === id ? 'true' : 'false'); });
    box.querySelector('.ex-vid-frame').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1&playsinline=1&loop=1&playlist=' + encodeURIComponent(id) + '" title="Exercise demo video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
  }
  function wireVideos(root) {
    root.querySelectorAll('[data-vbox]').forEach(function (box) {
      box.querySelectorAll('[data-vid]').forEach(function (b) { b.onclick = function () { playVideo(box, b.dataset.vid); }; });
    });
  }
  function openHow(el) {
    el.hidden = !el.hidden;
    var box = el.querySelector('[data-vbox]');
    if (box && !el.hidden && !box.querySelector('iframe')) { var first = box.querySelector('[data-vid]'); playVideo(box, first ? first.dataset.vid : vidsFor(box.dataset.vbox.split('|')[1])[0][0]); ev('tracker_video_play'); }
    if (box && el.hidden) box.querySelector('.ex-vid-frame').innerHTML = '';
  }
  var ICON_PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none"/></svg>';
  var CATS = []; EX.forEach(function (e) { if (CATS.indexOf(e.cat) < 0) CATS.push(e.cat); });

  var S = { user: null, me: null, target: null, tab: 'today', programs: [], workouts: [], body: [], habits: [], hDay: null, clients: null, draft: null, cal: null, calDay: null, chart: {}, progEx: null, rest: null };

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function iso(d) { d = d ? new Date(d) : new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function today() { return iso(); }
  function parseDay(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDay(s, opts) { return parseDay(s).toLocaleDateString('en-GB', opts || { weekday: 'short', day: 'numeric', month: 'short' }); }
  function daysAgo(s) { var d = Math.round((parseDay(today()) - parseDay(s)) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; }
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function nf(n) { return Math.round(n).toLocaleString('en-US'); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ev(name, p) { try { if (window.gtag) gtag('event', name, p || {}); } catch (e) {} }
  function isCoach() { return S.me && S.me.role === 'coach'; }
  // A workout started from a coach's programme can only be restructured by the coach; your own workouts are yours to edit.
  function canEditWorkout(d) { return isCoach() || !(d && d.programId); }
  function viewingOther() { return S.target && S.me && S.target.id !== S.me.id; }
  function weekKey(d) { var x = parseDay(d); var day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return iso(x); }
  function e1rm(w, r) { return w > 0 && r > 0 ? w * (1 + Math.min(r, 15) / 30) : 0; }
  function typeOf(name) { return (EXMAP[name] && EXMAP[name].type) || 'w'; }

  function toast(msg, pr) {
    document.querySelectorAll('.toast').forEach(function (x) { x.remove(); });
    var t = document.createElement('div'); t.className = 'toast' + (pr ? ' pr' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, pr ? 2600 : 2200);
  }
  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('div'); c.className = 'confetti'; c.setAttribute('aria-hidden', 'true');
    var cols = ['#C9A84C', '#E8D08A', '#ffffff', '#b8943d'];
    for (var i = 0; i < 40; i++) { var b = document.createElement('i'); b.style.left = Math.random() * 100 + '%'; b.style.background = cols[i % 4]; b.style.animationDelay = Math.random() * 0.4 + 's'; c.appendChild(b); }
    document.body.appendChild(c); setTimeout(function () { c.remove(); }, 2300);
  }
  function beep() {
    try { var A = window.AudioContext || window.webkitAudioContext; var a = new A(); [0, 0.25].forEach(function (t) { var o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.2, a.currentTime + t); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.15); }); } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
  }

  var ICON = {
    steps: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 16c-1.5 0-2.5-1.3-2.5-3.5S5.6 7 7.5 7 10 9 9.6 11.5 8.5 16 7 16z"/><path d="M5.5 18.5h3"/><path d="M17 12c1.5 0 2.5-1.3 2.5-3.5S18.4 3 16.5 3 14 5 14.4 7.5 15.5 12 17 12z"/><path d="M15.5 14.5h3"/></svg>',
    water: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    sleep: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    bolt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    smile: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.2 1.8 3.5 1.8 3.5-1.8 3.5-1.8"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>',
    inbox: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    hub: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    workouts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-7.5z"/></svg>',
    exercises: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="14" cy="4.5" r="1.8"/><path d="M9 21l2.5-6 3 2.5V22M6.5 11.5l3-3.5 4 1 2.5 3.5 3 .5M11.5 15L10 9"/></svg>',
    addUser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01"/></svg>',
    checkin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h5v16h-5M10 8l4 4-4 4M14 12H3"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M17 3c-2 0-3 2-3 6s1 5 3 5v7"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8l-2 3h-4zM10 7c-5 3-6 8-6 10a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4c0-2-1-7-6-10"/><path d="M12 11v6M10 12.5c0-1 4-1 4 .5s-4 1-4 2.5 4 1.5 4 .5"/></svg>',
    bell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/></svg>',
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    body: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10a4 4 0 0 1 8 0M12 10l2-2"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 19h16M6 16l4-5 3 3 5-7"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
    clients: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/></svg>',
    gear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>',
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
  };

  // ---------- auth ----------
  function showLanding() { $('landing').hidden = false; $('app').hidden = true; }
  async function signInGoogle() {
    ev('tracker_signin_click');
    var r = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (r.error) toast('Sign-in failed: ' + r.error.message);
  }
  async function signOut() {
    var btn = $('sOut'); if (btn) { btn.disabled = true; btn.textContent = 'Signing out…'; }
    try { stopLive(); } catch (e) {}
    try { if (N.chan) sb.removeChannel(N.chan); N.chan = null; } catch (e) {}
    // Sign out on this device only, and never wait forever for the server
    try { await Promise.race([sb.auth.signOut({ scope: 'local' }), new Promise(function (ok) { setTimeout(ok, 2500); })]); } catch (e) {}
    try { Object.keys(localStorage).forEach(function (k) { if (/^sb-.+-auth-token/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
    lsSet('mm_target', null); ev('tracker_sign_out');
    location.replace(location.pathname);
  }

  // Exercise library pages link here with ?ex=<exercise name>: start (or add to) a workout with it after sign-in.
  function capturePendingEx() {
    var qp = new URLSearchParams(location.search), ex = qp.get('ex');
    if (!ex || !EXMAP[ex]) return;
    lsSet('mm_pending_ex', ex); qp.delete('ex');
    history.replaceState(null, '', location.pathname + (qp.toString() ? '?' + qp : '') + location.hash);
  }
  function applyPendingEx() {
    var ex = lsGet('mm_pending_ex', null); if (!ex) return; lsSet('mm_pending_ex', null);
    if (!EXMAP[ex] || viewingOther()) return;
    if (!S.draft) { startDraft(null); S.draft.exercises.push(newDraftEx(ex, null)); saveDraft(); render(); toast(ex + ' is ready to log. Add more exercises below.'); }
    else if (canEditWorkout(S.draft)) { if (!S.draft.exercises.some(function (e) { return e.name === ex; })) S.draft.exercises.push(newDraftEx(ex, null)); S.overview = false; S.tab = 'today'; saveDraft(); render(); toast(ex + ' added to your workout'); }
    else toast('Finish your current workout first, then add ' + ex);
    ev('tracker_start_from_library', { exercise: ex });
  }
  function pendingBanner() {
    var ex = lsGet('mm_pending_ex', null), land = $('landing'); if (!ex || !land || $('pendBanner')) return;
    var b = document.createElement('div'); b.id = 'pendBanner'; b.className = 'tk-card gold'; b.style.margin = '16px auto 0'; b.style.maxWidth = '640px';
    b.innerHTML = '<b>Sign in free to log ' + esc(ex) + '</b><p class="tk-muted" style="margin-top:4px">Your workout opens with ' + esc(ex) + ' ready, and the tracker remembers your weights for next time.</p>';
    land.insertBefore(b, land.firstChild);
  }

  async function boot() {
    capturePendingEx();
    document.querySelectorAll('[data-google]').forEach(function (b) { b.addEventListener('click', signInGoogle); });
    var res = await sb.auth.getSession();
    var session = res.data && res.data.session;
    sb.auth.onAuthStateChange(function (e, s) { if (e === 'SIGNED_OUT') showLanding(); if (e === 'SIGNED_IN' && !S.user && s) start(s.user); });
    if (session) start(session.user); else { showLanding(); pendingBanner(); }
  }

  async function start(user) {
    S.user = user;
    $('landing').hidden = true; $('app').hidden = false; $('gear').hidden = false;
    $('view').innerHTML = '<div class="tk-empty">Loading your tracker…</div>';
    var me = null;
    for (var i = 0; i < 4 && !me; i++) {
      var r = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      me = r.data; if (!me) await new Promise(function (ok) { setTimeout(ok, 700); });
    }
    if (!me) { $('view').innerHTML = '<div class="tk-empty">We couldn\'t load your profile. Please refresh the page.</div>'; return; }
    S.me = me;
    var saved = lsGet('mm_target', null);
    var qp = new URLSearchParams(location.search), qc = qp.get('client');
    if (qc) { qp.delete('client'); history.replaceState(null, '', location.pathname + (qp.toString() ? '?' + qp : '') + location.hash); if (me.role === 'coach') saved = qc; }
    S.target = me;
    if (isCoach() && saved && saved !== me.id) {
      var t = await sb.from('profiles').select('*').eq('id', saved).maybeSingle();
      if (t.data) S.target = t.data;
    }
    S.tab = isCoach() && !viewingOther() ? 'hub' : 'today';
    ev('tracker_open', { role: me.role });
    if (isCoach()) startNotifs();
    loadVideos();
    await loadTarget();
    applyPendingEx();
  }

  async function loadTarget() {
    var id = S.target.id;
    var q = await Promise.all([
      sb.from('programs').select('*').eq('client_id', id).order('updated_at', { ascending: false }),
      sb.from('workouts').select('*').eq('user_id', id).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
      sb.from('body_logs').select('*').eq('user_id', id).order('date', { ascending: true }).limit(1000),
      sb.from('habit_logs').select('*').eq('user_id', id).order('date', { ascending: true }).limit(400)
    ]);
    S.programs = q[0].data || []; S.workouts = q[1].data || []; S.body = q[2].data || []; S.habits = q[3].data || []; S.hDay = null; if (!viewingOther() && S.me && lsGet('mm_badges_' + S.me.id, null) == null) lsSet('mm_badges_' + S.me.id, Object.keys(badgeDates()));
    S.draft = lsGet('mm_draft_' + id, null); S.overview = false; LIVE.lastRev = (S.draft && S.draft.rev) || 0;
    try { var lv = await sb.from('live_workouts').select('*').eq('user_id', id).maybeSingle(); if (lv && lv.data && (+lv.data.rev || 0) > LIVE.lastRev) { LIVE.lastRev = +lv.data.rev; S.draft = lv.data.data || null; lsSet('mm_draft_' + id, S.draft); } else if (S.draft) pushLive(); } catch (e) {}
    startLive();
    S.progEx = null; S.calDay = null;
    if (S.draft && COACH_TABS.indexOf(S.tab) < 0) S.tab = 'today';
    render();
  }

  // ---------- history-derived data ----------
  function lastPerformance(name) {
    for (var i = 0; i < S.workouts.length; i++) {
      var w = S.workouts[i]; var ex = (w.exercises || []).filter(function (e) { return e.name === name; })[0];
      if (ex && ex.sets && ex.sets.length) return { date: w.date, sets: ex.sets, mode: ex.mode };
    }
    return null;
  }
  function bests(name) {
    var b = { e1: 0, w: 0, r: 0, set: null, date: null, wmax: null, wset: null, wdate: null };
    S.workouts.forEach(function (wk) {
      (wk.exercises || []).forEach(function (e) {
        if (e.name !== name) return;
        (e.sets || []).forEach(function (s) {
          var w = num(s.w) || 0, r = num(s.r) || 0, x = e1rm(w, r);
          if (x > b.e1) { b.e1 = x; b.set = s; b.date = wk.date; }
          if (w > b.w) b.w = w; if (r > b.r) b.r = r;
          if (s.r != null && (b.wmax == null || w > b.wmax || (w === b.wmax && r > (num(b.wset && b.wset.r) || 0)))) { b.wmax = w; b.wset = s; b.wdate = wk.date; }
        });
      });
    });
    return b;
  }
  function setLabel(s, type) {
    var w = num(s.w), r = num(s.r);
    if (type === 't') return (r || 0) + 's';
    if (type === 'c') return (r || 0) + ' min' + (w ? ' · ' + w + ' km' : '');
    if (type === 'b') return (w > 0 ? '+' + w + 'kg × ' : w < 0 ? Math.abs(w) + 'kg assist × ' : '') + (r || 0) + (w ? '' : ' reps');
    return (w || 0) + 'kg × ' + (r || 0);
  }
  function workoutVolume(w) { var v = 0; (w.exercises || []).forEach(function (e) { if ((e.type || typeOf(e.name)) !== 'w') return; (e.sets || []).forEach(function (s) { v += (num(s.w) || 0) * (num(s.r) || 0); }); }); return v; }
  function weekStreak() {
    var weeks = {}; S.workouts.forEach(function (w) { weeks[weekKey(w.date)] = 1; });
    var k = weekKey(today()), n = 0;
    if (!weeks[k]) { var d = parseDay(k); d.setDate(d.getDate() - 7); k = iso(d); }
    while (weeks[k]) { n++; var d2 = parseDay(k); d2.setDate(d2.getDate() - 7); k = iso(d2); }
    return n;
  }
  function thisWeekCount() { var k = weekKey(today()); return S.workouts.filter(function (w) { return weekKey(w.date) === k; }).length; }

  // ---------- rendering shell ----------
  function render() {
    var who = S.me;
    $('who').innerHTML = '<button type="button" class="tk-who-btn" id="whoBtn" aria-label="Your profile"><span><b>' + esc(who.name || who.email) + '</b>' + (isCoach() ? 'Coach' : 'Mr &amp; Mrs Lifestyle') + '</span>' + avatarHtml(who, 38) + '</button>'; $('whoBtn').onclick = openProfile;
    var cb = $('coachbar');
    if (viewingOther()) { cb.hidden = false; cb.innerHTML = 'Coaching: ' + esc(S.target.name || S.target.email) + '<button type="button" id="backClients">Back to clients</button>'; $('backClients').onclick = backToClients; }
    else cb.hidden = true;
    var tabs;
    if (isCoach() && !viewingOther()) tabs = COACH_TABS.indexOf(S.tab) > -1 ? [['hub', 'Hub'], ['clients', 'Clients'], ['workouts', 'Workouts'], ['exercises', 'Exercises'], ['menu', 'Menu']] : [['hub', 'Hub'], ['today', 'Today'], ['plan', 'Plan'], ['body', 'Body'], ['progress', 'Progress'], ['history', 'History']];
    else tabs = [['today', 'Today'], ['plan', 'Plan'], ['body', 'Body'], ['progress', 'Progress'], ['history', 'History']];
    $('nav').innerHTML = tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + ICON[t[0]] + t[1] + '</button>'; }).join('');
    $('nav').querySelectorAll('button').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }; });
    Object.keys(S.chart).forEach(function (k) { try { S.chart[k].destroy(); } catch (e) {} delete S.chart[k]; });
    ({ today: renderToday, plan: renderPlan, body: renderBody, progress: renderProgress, history: renderHistory, clients: renderClients, hub: renderHub, workouts: renderWorkouts, exercises: renderExercises, menu: renderMenu, habits: renderHabits })[S.tab]();
    if (S.tab === 'today' && !isCoach() && !(S.draft && !S.overview)) coachCard().then(function (html) { if (html && S.tab === 'today' && !(S.draft && !S.overview) && !$('view').querySelector('.coach-card')) $('view').insertAdjacentHTML('beforeend', html); });
  }

  async function backToClients() { S.target = S.me; lsSet('mm_target', null); S.tab = 'clients'; await loadTarget(); }

  // ---------- TODAY ----------
  function renderToday() {
    if (S.draft && !S.overview) return renderWorkout();
    var v = $('view'), name = (S.target.name || '').split(' ')[0];
    var prog = S.programs.filter(function (p) { return p.active; })[0];
    var lastW = S.workouts[0], lastB = S.body[S.body.length - 1];
    var h = '';
    if (S.draft) h += '<div class="tk-card gold resume"><div class="li"><div class="grow"><b>Workout in progress: ' + esc(S.draft.title || 'Workout') + '</b><span class="tk-small">' + S.draft.exercises.length + ' exercises · started ' + Math.max(0, Math.round((Date.now() - S.draft.started) / 60000)) + ' min ago. Nothing is lost.</span></div><button type="button" class="tk-btn sm" id="resumeW">Resume</button></div></div>';
    h += '<h1 class="tk-h1">' + (viewingOther() ? esc(S.target.name || 'Client') + '\'s <em>training</em>' : 'Hi ' + esc(name || 'there') + ', ready to <em>train?</em>') + '</h1>';
    h += '<div class="tk-grid3" style="margin-top:14px"><div class="tk-stat"><b>' + thisWeekCount() + '</b><span>This week</span></div><div class="tk-stat"><b>' + weekStreak() + '</b><span>Week streak</span></div><div class="tk-stat"><b>' + S.workouts.length + '</b><span>Workouts</span></div></div>';
    h += todayHabitsCard();
    if (prog && (prog.days || []).length) {
      h += '<div class="tk-card gold"><span class="tk-tag">Your programme</span><h2 class="tk-h2" style="margin:4px 0 6px">' + esc(prog.name) + '</h2>' + (prog.notes ? '<p class="tk-muted">' + esc(prog.notes) + '</p>' : '');
      prog.days.forEach(function (d, i) {
        h += '<div class="li"><div class="grow"><b>' + esc(d.name || 'Day ' + (i + 1)) + '</b><span class="tk-small">' + (d.exercises || []).length + ' exercises · ' + esc((d.exercises || []).slice(0, 3).map(function (e) { return e.name; }).join(', ')) + ((d.exercises || []).length > 3 ? '…' : '') + '</span></div><button type="button" class="tk-btn sm" data-startday="' + i + '">Start</button></div>';
      });
      h += '</div>';
    } else if (!viewingOther()) {
      h += '<div class="tk-card"><b>No programme yet</b><p class="tk-muted" style="margin-top:4px">Training on your own? Start a workout below and add any of 200+ exercises. Training with Tarek or Chloe? Your coach will add your programme here.</p></div>';
    }
    h += '<div class="tk-row" style="margin-top:14px"><button type="button" class="tk-btn ' + (prog && !viewingOther() ? 'ghost ' : '') + 'block" id="startEmpty">' + (isCoach() ? 'Start an empty workout' : 'Start a workout') + '</button></div>';
    if (lastW) h += '<div class="tk-card"><span class="tk-tag">Last workout</span><div class="li"><div class="grow"><b>' + esc(lastW.title || 'Workout') + '</b><span class="tk-small">' + fmtDay(lastW.date) + ' · ' + (lastW.exercises || []).length + ' exercises' + (lastW.duration_min ? ' · ' + lastW.duration_min + ' min' : '') + (kcalOf(lastW) ? ' · ' + kcalLabel(lastW) : '') + '</span></div></div></div>';
    h += '<div class="tk-card"><span class="tk-tag">Body weight</span><div class="li"><div class="grow"><b>' + (lastB && lastB.weight ? lastB.weight + ' kg' : 'Not logged yet') + '</b><span class="tk-small">' + (lastB ? 'Last logged ' + daysAgo(lastB.date) : 'Track your weight weekly for the clearest trend') + '</span></div><button type="button" class="tk-btn sm plain" id="goBody">Log</button></div></div>';
    v.innerHTML = h;
    v.querySelectorAll('[data-startday]').forEach(function (b) { b.onclick = function () { if (S.draft && !confirmBox('You have a workout in progress (' + (S.draft.title || 'Workout') + '). Discard it and start ' + (prog.days[+b.dataset.startday].name || 'this day') + '?')) return; startDraft(prog, +b.dataset.startday); }; });
    if ($('startEmpty')) $('startEmpty').onclick = function () { if (S.draft && !confirmBox('You have a workout in progress. Discard it and start an empty one?')) return; startDraft(null); };
    if ($('resumeW')) $('resumeW').onclick = function () { S.overview = false; render(); window.scrollTo(0, 0); };
    $('goBody').onclick = function () { S.tab = 'body'; render(); };
    wireHabitCard(v); $('goHabits').onclick = function () { go('habits'); };
  }

  function startDraft(prog, dayIdx) {
    var d = { started: Date.now(), date: today(), title: 'Workout', programId: null, exercises: [], notes: '' };
    if (prog) {
      var day = prog.days[dayIdx]; d.title = day.name || prog.name; d.programId = prog.id; d.dayIdx = dayIdx;
      (day.exercises || []).forEach(function (pe) { d.exercises.push(newDraftEx(pe.name, pe)); });
    }
    S.draft = d; S.overview = false; S.tab = 'today'; saveDraft(); ev('tracker_workout_start', { from_programme: !!prog }); render(); window.scrollTo(0, 0);
    notifyCoach('started', d.title, d.exercises.length ? d.exercises.length + (d.exercises.length === 1 ? ' exercise' : ' exercises') : '');
  }
  function newDraftEx(name, target) {
    var info = EXMAP[name] || { cat: 'Custom', type: 'w', how: '' };
    var n = target && parseInt(target.sets, 10) > 0 ? parseInt(target.sets, 10) : 3;
    var sets = []; for (var i = 0; i < n; i++) sets.push({ w: '', r: '', done: false });
    var o = { name: name, cat: info.cat, type: info.type, mode: info.type === 'b' ? modeFromHistory(name) : undefined, target: target ? { sets: target.sets, reps: target.reps, rest: target.rest, notes: target.notes } : null, sets: sets };
    if (info.type === 'b' && target && target.mode) o.mode = target.mode;
    return o;
  }
  // ---------- live shared workout (coach + client see the same open workout) ----------
  var LIVE = { timer: null, chan: null, poll: null, lastRev: 0, uid: null };
  function saveDraft() {
    if (S.draft) S.draft.rev = Date.now();
    LIVE.lastRev = S.draft ? S.draft.rev : Date.now();
    lsSet('mm_draft_' + S.target.id, S.draft);
    pushLive();
  }
  function pushLive() {
    clearTimeout(LIVE.timer);
    var uid = S.target.id, data = S.draft ? JSON.parse(JSON.stringify(S.draft)) : null, rev = LIVE.lastRev;
    LIVE.timer = setTimeout(function () {
      try { sb.from('live_workouts').upsert({ user_id: uid, data: data, rev: rev, updated_by: S.me.id, updated_at: new Date().toISOString() }).then(function () {}, function () {}); } catch (e) {}
    }, data ? 400 : 0);
  }
  function captureFocus() {
    var a = document.activeElement; if (!a || !a.dataset) return null;
    return { x: a.dataset.x, s: a.dataset.s, f: a.dataset.f, id: a.id, pos: a.selectionStart };
  }
  function restoreFocus(fc) {
    if (!fc) return;
    var el = fc.id ? $(fc.id) : document.querySelector('input[data-x="' + fc.x + '"][data-s="' + fc.s + '"][data-f="' + fc.f + '"]');
    if (el) { el.focus(); try { if (fc.pos != null) el.setSelectionRange(fc.pos, fc.pos); } catch (e) {} }
  }
  async function applyLive(row) {
    if (!row || row.user_id !== S.target.id) return;
    var rev = +row.rev || 0;
    if (rev <= LIVE.lastRev) return;
    if (LIVE.timer && row.updated_by !== S.me.id) { /* our own newer edit is about to be sent */ }
    var had = !!S.draft;
    LIVE.lastRev = rev;
    S.draft = row.data || null;
    lsSet('mm_draft_' + S.target.id, S.draft);
    if (had && !S.draft) {
      var w = await sb.from('workouts').select('*').eq('user_id', S.target.id).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(1000);
      if (w.data) S.workouts = w.data;
      stopRest(); S.overview = false;
      toast(row.updated_by === S.me.id ? 'Workout closed' : 'The workout was finished on another device');
    }
    if (S.tab === 'today' || (had && !S.draft)) { var fc = captureFocus(); render(); restoreFocus(fc); }
  }
  function startLive() {
    stopLive(); LIVE.uid = S.target.id;
    try {
      if (sb.channel) LIVE.chan = sb.channel('live-' + LIVE.uid).on('postgres_changes', { event: '*', schema: 'public', table: 'live_workouts', filter: 'user_id=eq.' + LIVE.uid }, function (p) { applyLive(p.new); }).subscribe();
    } catch (e) {}
    LIVE.poll = setInterval(function () { if (document.hidden) return; fetchLive(); }, 8000);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && LIVE.uid) fetchLive(); });
  function stopLive() { try { if (LIVE.chan) sb.removeChannel(LIVE.chan); } catch (e) {} LIVE.chan = null; clearInterval(LIVE.poll); LIVE.poll = null; }
  async function fetchLive() {
    try { var r = await sb.from('live_workouts').select('*').eq('user_id', S.target.id).maybeSingle(); if (r && r.data) await applyLive(r.data); } catch (e) {}
  }

  var MODES = [['bw', 'Bodyweight'], ['add', 'Added weight (+kg)'], ['assist', 'Assisted (machine or band)']];
  function modeOf(ex) {
    if (ex.mode) return ex.mode;
    return ex.sets && ex.sets.some(function (s) { return num(s.w) > 0; }) ? 'add' : 'bw';
  }
  function modeFromHistory(name) {
    var last = lastPerformance(name); if (!last) return 'bw';
    if (last.mode) return last.mode;
    var ws = last.sets.map(function (s) { return num(s.w) || 0; });
    return ws.some(function (w) { return w < 0; }) ? 'assist' : ws.some(function (w) { return w > 0; }) ? 'add' : 'bw';
  }
  function signedW(ex, s) {
    if (ex.type !== 'b') return num(s.w);
    var m = modeOf(ex), w = num(s.w);
    if (m === 'bw' || w == null || w === 0) return null;
    return m === 'assist' ? -Math.abs(w) : Math.abs(w);
  }
  function fieldsFor(type, mode) {
    if (type === 't') return [null, ['r', 'Sec']];
    if (type === 'c') return [['r', 'Min'], ['w', 'Km']];
    if (type === 'b') return mode === 'bw' ? [null, ['r', 'Reps']] : [['w', mode === 'assist' ? 'Assist kg' : '+kg'], ['r', 'Reps']];
    return [['w', 'Kg'], ['r', 'Reps']];
  }

  function renderWorkout() {
    var d = S.draft, v = $('view');
    var mins = Math.max(0, Math.round((Date.now() - d.started) / 60000)), ed = canEditWorkout(d);
    var h = '<button type="button" class="tk-btn sm plain" id="allDays" style="margin-bottom:10px">← All workouts</button>';
    h += '<div class="tk-row"><div class="grow" style="flex:1"><label class="sr" for="wTitle">Workout name</label><input class="tk-input" id="wTitle" value="' + esc(d.title) + '" style="font-weight:700;font-size:1.1rem"></div></div>';
    h += '<div class="tk-row tk-small" style="margin-top:6px"><span>' + fmtDay(d.date) + '</span><span>· ' + mins + ' min</span>' + (viewingOther() ? '<span class="pill gold">Logging for ' + esc(S.target.name || 'client') + '</span>' : '') + '</div>';
    d.exercises.forEach(function (ex, xi) {
      var info = EXMAP[ex.name] || {}, last = lastPerformance(ex.name), mode = ex.type === 'b' ? modeOf(ex) : null, f = fieldsFor(ex.type, mode);
      h += '<section class="ex" aria-label="' + esc(ex.name) + '"><div class="ex-head"><div><h3>' + esc(ex.name) + '</h3><div class="tk-small">' + esc(info.m || ex.cat || '') + (last ? ' · last ' + daysAgo(last.date) : '') + '</div></div><div class="ex-act">' +
        (info.how || vidsFor(ex.name).length ? '<button type="button" class="tk-icon-btn' + (vidsFor(ex.name).length ? ' has-vid' : '') + '" data-how="' + xi + '" aria-label="' + (vidsFor(ex.name).length ? 'Watch demo of ' : 'How to do ') + esc(ex.name) + '">' + (vidsFor(ex.name).length ? ICON_PLAY : ICON.info) + '</button>' : '') +
        (ed && xi > 0 ? '<button type="button" class="tk-icon-btn" data-mvex="' + xi + ':-1" aria-label="Move ' + esc(ex.name) + ' up">' + ICON.up + '</button>' : '') +
        (ed && xi < d.exercises.length - 1 ? '<button type="button" class="tk-icon-btn" data-mvex="' + xi + ':1" aria-label="Move ' + esc(ex.name) + ' down">' + ICON.down + '</button>' : '') +
        (ed ? '<button type="button" class="tk-icon-btn" data-rmex="' + xi + '" aria-label="Remove ' + esc(ex.name) + '">' + ICON.trash + '</button>' : '') + '</div></div>';
      h += '<div class="ex-how" id="how' + xi + '" hidden>' + videoBox(ex.name, xi + '|' + ex.name) + (info.how ? '<p>' + esc(info.how) + '</p>' : '') + '</div>';
      if (ex.type === 'b' && !ed) h += '<div class="ex-mode"><span class="tk-small">Load: <b>' + esc((MODES.filter(function (m) { return m[0] === mode; })[0] || MODES[0])[1]) + '</b> (set by your coach)</span></div>';
      if (ex.type === 'b' && ed) h += '<div class="ex-mode"><label for="mode' + xi + '">Load</label><select class="tk-select" id="mode' + xi + '" data-mode="' + xi + '">' + MODES.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === mode ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') + '</select></div>';
      if (ex.target) h += '<div class="ex-target">Target: ' + esc(ex.target.sets || '') + ' × ' + esc(ex.target.reps || '') + (ex.target.rest ? ' · rest ' + esc(ex.target.rest) + 's' : '') + (ex.target.notes ? ' · ' + esc(ex.target.notes) : '') + '</div>';
      h += '<table class="sets"><thead><tr><th scope="col">Set</th><th scope="col">Last</th>' + (f[0] ? '<th scope="col">' + f[0][1] + '</th>' : '') + '<th scope="col">' + f[1][1] + '</th><th scope="col"><span class="sr">Done</span></th></tr></thead><tbody>';
      ex.sets.forEach(function (s, si) {
        var p = last && last.sets[si];
        h += '<tr class="' + (s.done ? 'done' : '') + '"><td>' + (si + 1) + (s.pr ? '<span class="pr-badge">PR</span>' : '') + '</td><td class="prev">' + (p ? esc(setLabel(p, ex.type)) : '–') + '</td>';
        f.forEach(function (fd) {
          if (!fd) return;
          var ph = p ? (num(p[fd[0]]) != null ? (ex.type === 'b' && fd[0] === 'w' ? Math.abs(num(p.w)) : p[fd[0]]) : '') : '';
          h += '<td><input inputmode="decimal" aria-label="Set ' + (si + 1) + ' ' + fd[1] + '" data-x="' + xi + '" data-s="' + si + '" data-f="' + fd[0] + '" value="' + esc(s[fd[0]]) + '" placeholder="' + esc(ph) + '"></td>';
        });
        h += '<td><button type="button" class="chk" data-done="' + xi + ',' + si + '" aria-pressed="' + (s.done ? 'true' : 'false') + '" aria-label="Mark set ' + (si + 1) + ' done">' + ICON.check + '</button></td></tr>';
      });
      h += '</tbody></table><div class="ex-foot"><button type="button" class="tk-btn sm plain" data-addset="' + xi + '">+ Add set</button>' + (ex.sets.length > 1 ? '<button type="button" class="tk-btn sm plain" data-rmset="' + xi + '">Remove last set</button>' : '') + '</div></section>';
    });
    if (ed) h += '<button type="button" class="tk-btn ghost block" id="addEx" style="margin-top:14px">+ Add exercise</button>';
    h += '<div class="tk-field"><label for="wNotes">Notes (how it felt, energy, anything for your coach)</label><textarea class="tk-textarea" id="wNotes">' + esc(d.notes) + '</textarea></div>';
    var srcProg = d.programId && S.programs.filter(function (x) { return x.id === d.programId; })[0];
    if (srcProg && d.dayIdx != null && srcProg.days[d.dayIdx] && canEditProgram(srcProg)) h += '<button type="button" class="tk-btn ghost block" id="saveToProg" style="margin-top:16px">Save these exercises & order to the programme</button><p class="tk-small" style="margin-top:6px">Updates ' + esc(srcProg.days[d.dayIdx].name || 'this day') + ' in ' + esc(srcProg.name) + ' so next time starts the same way. Weights you logged are not affected.</p>';
    h += '<div class="tk-grid2" style="margin-top:16px"><button type="button" class="tk-btn danger" id="discard">Discard</button><button type="button" class="tk-btn" id="finish">Finish workout</button></div>';
    v.innerHTML = h;
    $('wTitle').oninput = function () { d.title = this.value; saveDraft(); };
    $('wNotes').oninput = function () { d.notes = this.value; saveDraft(); };
    v.querySelectorAll('input[data-x]').forEach(function (inp) {
      inp.oninput = function () { d.exercises[+inp.dataset.x].sets[+inp.dataset.s][inp.dataset.f] = inp.value; saveDraft(); };
    });
    v.querySelectorAll('[data-done]').forEach(function (b) { b.onclick = function () { var p = b.dataset.done.split(','); toggleSet(+p[0], +p[1]); }; });
    v.querySelectorAll('[data-how]').forEach(function (b) { b.onclick = function () { openHow($('how' + b.dataset.how)); }; });
    wireVideos(v);
    v.querySelectorAll('[data-mode]').forEach(function (sel) { sel.onchange = function () { var ex = d.exercises[+sel.dataset.mode]; ex.mode = sel.value; if (sel.value === 'bw') ex.sets.forEach(function (s) { s.w = ''; }); saveDraft(); render(); }; });
    v.querySelectorAll('[data-mvex]').forEach(function (b) { b.onclick = function () {
      var p = b.dataset.mvex.split(':'), i = +p[0], j = i + (+p[1]); if (j < 0 || j >= d.exercises.length) return;
      var t = d.exercises[i]; d.exercises[i] = d.exercises[j]; d.exercises[j] = t; saveDraft(); render();
      setTimeout(function () { var el = document.querySelectorAll('.ex')[j]; if (el) el.scrollIntoView({ block: 'center' }); var fb = document.querySelector('[data-mvex^="' + j + ':' + p[1] + '"]') || document.querySelector('[data-mvex^="' + j + ':"]'); if (fb) fb.focus(); }, 30);
    }; });
    v.querySelectorAll('[data-rmex]').forEach(function (b) { b.onclick = function () { if (confirmBox('Remove ' + d.exercises[+b.dataset.rmex].name + ' from this workout?')) { d.exercises.splice(+b.dataset.rmex, 1); saveDraft(); render(); } }; });
    v.querySelectorAll('[data-addset]').forEach(function (b) { b.onclick = function () { var ex = d.exercises[+b.dataset.addset], l = ex.sets[ex.sets.length - 1] || {}; ex.sets.push({ w: l.w || '', r: '', done: false }); saveDraft(); render(); }; });
    v.querySelectorAll('[data-rmset]').forEach(function (b) { b.onclick = function () { d.exercises[+b.dataset.rmset].sets.pop(); saveDraft(); render(); }; });
    if ($('addEx')) $('addEx').onclick = function () { openPicker(function (name) { d.exercises.push(newDraftEx(name, null)); saveDraft(); render(); setTimeout(function () { var all = document.querySelectorAll('.ex'); if (all.length) all[all.length - 1].scrollIntoView({ block: 'center' }); }, 30); }); };
    $('allDays').onclick = function () { S.overview = true; render(); window.scrollTo(0, 0); };
    if ($('saveToProg')) $('saveToProg').onclick = async function () {
      var btn = this, pr = S.programs.filter(function (x) { return x.id === d.programId; })[0]; if (!pr) return;
      var days = JSON.parse(JSON.stringify(pr.days)), old = days[d.dayIdx].exercises || [];
      days[d.dayIdx].exercises = d.exercises.map(function (ex) {
        var prev = old.filter(function (o) { return o.name === ex.name; })[0] || {};
        var t = ex.target || prev, o = { name: ex.name, sets: ex.sets.length || parseInt(t.sets, 10) || 1, reps: String(t.reps || (ex.type === 't' ? '30-45s' : ex.type === 'c' ? '20 min' : '8-12')), rest: parseInt(t.rest, 10) || null, notes: t.notes || '' };
        if (ex.type === 'b') o.mode = modeOf(ex);
        return o;
      });
      btn.disabled = true;
      var r = await sb.from('programs').update({ days: days, updated_at: new Date().toISOString() }).eq('id', pr.id).select().single();
      btn.disabled = false;
      if (r.error) return toast('Could not save: ' + r.error.message);
      S.programs = S.programs.map(function (x) { return x.id === pr.id ? r.data : x; });
      toast('Programme updated'); ev('tracker_programme_saved_from_workout');
    };
    $('discard').onclick = function () { if (confirmBox('Discard this workout? Nothing will be saved.')) { S.draft = null; saveDraft(); stopRest(); render(); } };
    $('finish').onclick = finishWorkout;
  }

  // simple in-page confirm (no browser dialogs)
  var pendingConfirm = null;
  function confirmBox(msg) {
    if (pendingConfirm === msg) { pendingConfirm = null; return true; }
    pendingConfirm = msg; toast(msg + ' Tap again to confirm.');
    setTimeout(function () { if (pendingConfirm === msg) pendingConfirm = null; }, 4000);
    return false;
  }

  function toggleSet(xi, si) {
    var ex = S.draft.exercises[xi], s = ex.sets[si];
    if (!s.done) {
      var last = lastPerformance(ex.name), p = last && last.sets[si];
      fieldsFor(ex.type, ex.type === 'b' ? modeOf(ex) : null).forEach(function (fd) { if (fd && (s[fd[0]] === '' || s[fd[0]] == null) && p && p[fd[0]] != null && p[fd[0]] !== '') s[fd[0]] = String(ex.type === 'b' && fd[0] === 'w' ? Math.abs(num(p.w)) : p[fd[0]]); });
      if (num(s.r) == null || num(s.r) <= 0) { toast('Enter ' + (ex.type === 't' ? 'the seconds' : ex.type === 'c' ? 'the minutes' : 'your reps') + ' first'); return; }
      s.done = true;
      s.pr = false;
      if (ex.type === 'w' || ex.type === 'b') {
        var b = bests(ex.name), w = signedW(ex, s) || 0, r = num(s.r) || 0;
        var prior = lastPerformance(ex.name);
        var isPr = !!prior && ((ex.type === 'w' && b.e1 > 0 && e1rm(w, r) > b.e1 + 0.01) || (ex.type === 'b' && b.wmax != null && (w > b.wmax || (w === b.wmax && r > (num(b.wset && b.wset.r) || 0)))));
        var already = ex.sets.some(function (o, i) { return i !== si && o.pr; });
        if (isPr && !already) { s.pr = true; toast('New personal record! ' + ex.name + ' ' + setLabel({ w: w, r: r }, ex.type), true); confetti(); ev('tracker_pr', { exercise: ex.name }); }
      }
      var rest = (ex.target && parseInt(ex.target.rest, 10)) || lsGet('mm_rest', 90);
      if (ex.type !== 'c') startRest(rest);
    } else { s.done = false; s.pr = false; }
    saveDraft(); render();
  }

  // rest timer
  function startRest(sec) {
    stopRest(); var total = sec, end = Date.now() + sec * 1000;
    var el = document.createElement('div'); el.className = 'rest'; el.id = 'rest'; el.setAttribute('role', 'timer'); el.setAttribute('aria-label', 'Rest timer');
    el.innerHTML = '<b id="restT"></b><div class="bar"><i id="restBar"></i></div><button type="button" id="rM" aria-label="15 seconds less">−15</button><button type="button" id="rP" aria-label="15 seconds more">+15</button><button type="button" id="rX" aria-label="Skip rest">' + ICON.x + '</button>';
    document.body.appendChild(el);
    function tick() {
      var left = Math.max(0, Math.round((end - Date.now()) / 1000));
      $('restT').textContent = Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
      $('restBar').style.width = (total ? left / total * 100 : 0) + '%';
      if (left <= 0) { beep(); stopRest(); toast('Rest done. Next set!'); }
    }
    $('rM').onclick = function () { end -= 15000; tick(); };
    $('rP').onclick = function () { end += 15000; total += 15; tick(); };
    $('rX').onclick = stopRest;
    tick(); S.rest = setInterval(tick, 500);
  }
  function stopRest() { if (S.rest) clearInterval(S.rest); S.rest = null; var el = $('rest'); if (el) el.remove(); }

  async function finishWorkout() {
    var d = S.draft;
    var exs = d.exercises.map(function (e) {
      var o2 = { name: e.name, cat: e.cat, type: e.type, sets: e.sets.filter(function (s) { return s.done || num(s.r) != null; }).map(function (s) { var o = { w: signedW(e, s), r: num(s.r) }; if (s.pr) o.pr = true; return o; }) };
      if (e.type === 'b') o2.mode = modeOf(e);
      return o2;
    }).filter(function (e) { return e.sets.length; });
    if (!exs.length) { toast('Log at least one set before finishing'); return; }
    $('finish').disabled = true;
    var prs = 0; exs.forEach(function (e) { e.sets.forEach(function (s) { if (s.pr) prs++; }); });
    var row = { user_id: S.target.id, date: d.date, title: d.title || 'Workout', program_id: d.programId, exercises: exs, duration_min: Math.max(1, Math.round((Date.now() - d.started) / 60000)), notes: d.notes || null };
    var est = kcalEstimate(row); if (est != null) { row.kcal = est; row.kcal_source = 'est'; }
    var r = await sb.from('workouts').insert(row).select().single();
    if (r.error) { $('finish').disabled = false; toast('Could not save: ' + r.error.message); return; }
    stopRest(); S.draft = null; saveDraft(); S.workouts.unshift(r.data);
    ev('tracker_workout_saved', { exercises: exs.length, prs: prs, coach_logged: viewingOther() });
    var nSets = 0; exs.forEach(function (e) { nSets += e.sets.length; });
    notifyCoach('finished', row.title, exs.length + (exs.length === 1 ? ' exercise · ' : ' exercises · ') + nSets + (nSets === 1 ? ' set · ' : ' sets · ') + row.duration_min + ' min' + (row.kcal ? ' · ~' + nf(row.kcal) + ' kcal' : '') + (prs ? ' · ' + prs + ' new PR' + (prs > 1 ? 's' : '') : ''));
    summaryModal(r.data, prs);
    render();
  }

  function summaryModal(w, prs) {
    var sets = 0; (w.exercises || []).forEach(function (e) { sets += e.sets.length; });
    var vol = workoutVolume(w);
    var text = w.title + ' done! ' + (w.exercises || []).length + ' exercises, ' + sets + ' sets' + (vol ? ', ' + nf(vol) + ' kg lifted' : '') + (prs ? ', ' + prs + ' new PR' + (prs > 1 ? 's' : '') : '') + ' in ' + w.duration_min + ' min' + (kcalOf(w) ? ', ' + kcalLabel(w) + ' burnt' : '') + '. Tracked with Mr & Mrs Lifestyle.';
    var body = '<div style="text-align:center"><div class="tk-h1">Workout <em>saved</em></div><p class="tk-muted">' + fmtDay(w.date) + '</p></div><div class="tk-grid2" style="margin-top:14px"><div class="tk-stat"><b>' + w.duration_min + '</b><span>Minutes</span></div><div class="tk-stat"><b>' + sets + '</b><span>Sets</span></div><div class="tk-stat"><b>' + (vol ? nf(vol) : '–') + '</b><span>Kg lifted</span></div><div class="tk-stat"><b>' + prs + '</b><span>New PRs</span></div></div>' +
      kcalBox(w) + '<div class="tk-grid2" style="margin-top:16px"><button type="button" class="tk-btn ghost" id="shareW">Share</button><button type="button" class="tk-btn" data-close>Done</button></div>';
    var m = modal('Great work', body);
    wireKcal(m, function () { var bx = m.querySelector('.kc-box'); if (bx) bx.outerHTML = kcalBox(w); wireKcal(m); render(); });
    $('shareW').onclick = function () {
      if (navigator.share) navigator.share({ title: 'My workout', text: text, url: 'https://www.mrandmrslifestyle.com/workout-tracker.html' }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied. Paste it anywhere to share.'); });
    };
    if (prs) confetti();
    return m;
  }

  // ---------- calories burnt ----------
  // Estimate = MET x body weight (kg) x hours. Weights ~5 METs (a typical gym session with rests), cardio ~8 METs.
  function weightOn(date) {
    var ws = S.body.filter(function (b) { return b.weight != null; }); if (!ws.length) return null;
    var before = ws.filter(function (b) { return b.date <= date; });
    return +(before.length ? before[before.length - 1] : ws[0]).weight;
  }
  function kcalEstimate(w) {
    var kg = weightOn(w.date || today()); if (!kg || !w.duration_min) return null;
    var mins = Math.min(w.duration_min, 150), cardio = 0;
    (w.exercises || []).forEach(function (e) { if ((e.type || typeOf(e.name)) === 'c') (e.sets || []).forEach(function (st) { cardio += num(st.r) || 0; }); });
    cardio = Math.min(cardio, mins);
    return Math.round(kg * (5 * (mins - cardio) + 8 * cardio) / 60);
  }
  function kcalOf(w) { return w.kcal != null ? w.kcal : kcalEstimate(w); }
  function kcalLabel(w) { var k = kcalOf(w); return k == null ? '' : (w.kcal_source === 'watch' ? '' : '~') + nf(k) + ' kcal'; }
  async function saveKcal(w, val) {
    var k = parseInt(String(val).replace(/[^\d]/g, ''), 10);
    if (!(k > 0 && k <= 5000)) { toast('Enter the calories from your watch, e.g. 420'); return false; }
    var r = await sb.from('workouts').update({ kcal: k, kcal_source: 'watch' }).eq('id', w.id);
    if (r.error) { toast('Could not save: ' + r.error.message); return false; }
    w.kcal = k; w.kcal_source = 'watch';
    S.workouts.forEach(function (x) { if (x.id === w.id) { x.kcal = k; x.kcal_source = 'watch'; } });
    ev('tracker_kcal_watch'); toast('Saved'); return true;
  }
  function kcalBox(w) {
    var k = kcalOf(w), watch = w.kcal_source === 'watch';
    var h = '<div class="kc-box"><div class="kc-top"><span class="kc-ic" aria-hidden="true">🔥</span><div><b>' + (k == null ? 'Calories burnt' : (watch ? '' : '~') + nf(k) + ' kcal burnt') + '</b><span class="tk-small">' +
      (k == null ? 'Log your body weight in the Body tab and we\'ll estimate it for every workout.' : watch ? 'From your watch.' : 'Estimated from your body weight and workout time. A watch or heart-rate strap is more accurate.') + '</span></div></div>';
    h += '<div class="kc-edit"><label for="kc_' + w.id + '" class="tk-small">' + (watch ? 'Change' : 'Have a watch? Enter its number') + '</label><div class="tk-row"><input class="tk-input" id="kc_' + w.id + '" inputmode="numeric" placeholder="kcal" value="' + (watch ? k : '') + '"><button type="button" class="tk-btn sm ghost" data-kcsave="' + w.id + '">Save</button></div></div></div>';
    return h;
  }
  function wireKcal(root, after) {
    root.querySelectorAll('[data-kcsave]').forEach(function (b) {
      b.onclick = async function () {
        var w = S.workouts.filter(function (x) { return x.id === b.dataset.kcsave; })[0]; if (!w) return;
        b.disabled = true; var ok = await saveKcal(w, $('kc_' + w.id).value); b.disabled = false;
        if (ok && after) after();
      };
    });
  }

  // ---------- modal + exercise picker ----------
  function modal(title, bodyHtml, onClose) {
    var wrap = document.createElement('div'); wrap.className = 'modal'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', title);
    wrap.innerHTML = '<div class="modal-box"><div class="modal-head"><h2>' + esc(title) + '</h2><button type="button" class="tk-icon-btn" data-close aria-label="Close">' + ICON.x + '</button></div><div class="modal-body"></div></div>';
    wrap.querySelector('.modal-body').innerHTML = bodyHtml;
    function close() { wrap.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; if (onClose) onClose(); }
    function key(e) { if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(wrap); document.body.style.overflow = 'hidden';
    var f = wrap.querySelector('input,button'); if (f) f.focus();
    wrap.close = close; return wrap;
  }

  function openPicker(onPick, onClose) {
    var cat = 'All', q = '';
    var body = '<label class="sr" for="pkQ">Search exercises</label><input class="tk-input" id="pkQ" type="search" placeholder="Search ' + EX.length + ' exercises" autocomplete="off">' +
      '<div class="chips" role="group" aria-label="Filter by muscle group"><button type="button" aria-pressed="true" data-c="All">All</button>' + CATS.map(function (c) { return '<button type="button" aria-pressed="false" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div><div id="pkList"></div>';
    var m = modal('Add exercise', body, onClose);
    function list() {
      var ql = q.toLowerCase().trim();
      var items = EX.filter(function (e) { return (cat === 'All' || e.cat === cat) && (!ql || (e.name + ' ' + e.m + ' ' + e.cat).toLowerCase().indexOf(ql) > -1); });
      var html = items.slice(0, 120).map(function (e) {
        var hv = vidsFor(e.name).length;
        return '<div class="pick-row"><div class="pick-line"><button type="button" class="pick-item" data-n="' + esc(e.name) + '"><div><b>' + esc(e.name) + '</b><span>' + esc(e.cat) + ' · ' + esc(e.m) + '</span></div></button>' +
          (hv ? '<button type="button" class="pill gold vid-pill pick-watch" data-watch="' + esc(e.name) + '" aria-expanded="false" aria-label="Watch the ' + esc(e.name) + ' demo">▶ Video</button>' : '') +
          '<button type="button" class="pick-add" data-n="' + esc(e.name) + '" aria-label="Add ' + esc(e.name) + '">+</button></div>' +
          (hv ? '<div class="pick-vid" hidden>' + videoBox(e.name, 'pk|' + e.name) + '<button type="button" class="tk-btn sm block" data-n="' + esc(e.name) + '" style="margin-top:8px">Add ' + esc(e.name) + '</button></div>' : '') + '</div>';
      }).join('');
      if (ql && !EXMAP[q.trim()]) html += '<button type="button" class="pick-item" data-n="' + esc(q.trim()) + '" data-custom="1"><div><b>Add "' + esc(q.trim()) + '"</b><span>Custom exercise</span></div><span class="plus" aria-hidden="true">+</span></button>';
      if (!html) html = '<div class="tk-empty">No exercises found</div>';
      $('pkList').innerHTML = html;
      $('pkList').querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { m.close(); onPick(b.dataset.n); }; });
      wireVideos($('pkList'));
      $('pkList').querySelectorAll('[data-watch]').forEach(function (b) { b.onclick = function () {
        var pv = b.closest('.pick-row').querySelector('.pick-vid');
        $('pkList').querySelectorAll('.pick-vid').forEach(function (o) { if (o !== pv && !o.hidden) { o.hidden = true; o.querySelector('.ex-vid-frame').innerHTML = ''; var wb = o.closest('.pick-row').querySelector('[data-watch]'); if (wb) wb.setAttribute('aria-expanded', 'false'); } });
        openHow(pv); b.setAttribute('aria-expanded', pv.hidden ? 'false' : 'true');
        if (!pv.hidden) pv.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }; });
    }
    $('pkQ').oninput = function () { q = this.value; list(); };
    m.querySelectorAll('.chips button').forEach(function (b) { b.onclick = function () { m.querySelectorAll('.chips button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); cat = b.dataset.c; list(); }; });
    list(); $('pkQ').focus();
  }

  // ---------- COACH NOTIFICATIONS (client started / finished a workout) ----------
  var N = { list: [], chan: null, swReg: null };
  function notifyCoach(kind, workout, detail) {
    if (!S.me || isCoach() || viewingOther()) return;
    try { sb.functions.invoke('notify-coach', { body: { kind: kind, workout: workout || 'Workout', detail: detail || '' } }).catch(function () {}); } catch (e) {}
  }
  function timeAgo(t) {
    var m = Math.round((Date.now() - new Date(t).getTime()) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function drawBell() {
    var b = $('bell'); if (!b) return;
    var n = N.list.filter(function (x) { return !x.read_at; }).length;
    b.hidden = !isCoach();
    b.innerHTML = ICON.bell + (n ? '<span class="tk-badge">' + (n > 9 ? '9+' : n) + '</span>' : '');
    b.setAttribute('aria-label', n ? 'Notifications, ' + n + ' new' : 'Notifications');
  }
  async function startNotifs() {
    var r = await sb.from('coach_notifications').select('*').order('created_at', { ascending: false }).limit(40);
    N.list = r.data || []; drawBell();
    $('bell').onclick = openNotifs;
    if (N.chan) return;
    try {
      N.chan = sb.channel('coach-notifs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coach_notifications' }, function (p) {
        var row = p.new; if (!row || N.list.some(function (x) { return x.id === row.id; })) return;
        N.list.unshift(row); drawBell(); toast(row.title + (row.body ? ' · ' + row.body : ''));
      }).subscribe();
    } catch (e) {}
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/tracker-sw.js').then(function (reg) { N.swReg = reg; }).catch(function () {});
  }
  function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  async function currentSub() {
    if (!pushSupported()) return null;
    var reg = N.swReg || await navigator.serviceWorker.getRegistration('/'); if (!reg) return null;
    return reg.pushManager.getSubscription();
  }
  function keyBytes(b64) { var s = b64.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  async function enablePush() {
    if (Notification.permission === 'denied') { toast('Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.'); return false; }
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notifications were not allowed'); return false; }
    var reg = N.swReg || await navigator.serviceWorker.register('/tracker-sw.js'); N.swReg = reg;
    await navigator.serviceWorker.ready;
    var cfg = await sb.functions.invoke('notify-coach', { body: { kind: 'config' } });
    if (cfg.error || !cfg.data || !cfg.data.publicKey) { toast('Could not set up notifications. Please try again.'); return false; }
    var sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(cfg.data.publicKey) });
    var j = sub.toJSON();
    var r = await sb.from('push_subscriptions').upsert({ user_id: S.me.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
    if (r.error) { toast('Could not save: ' + r.error.message); return false; }
    ev('tracker_push_enabled'); return true;
  }
  async function disablePush() {
    var sub = await currentSub(); if (!sub) return;
    await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe().catch(function () {});
  }
  async function openNotifs() {
    var m = modal('Notifications', '<div id="pushBox"></div><div id="nList"></div>');
    async function drawPush() {
      var box = $('pushBox'); if (!box) return;
      var h = '';
      if (!pushSupported()) {
        h = isIOS() && !isStandalone()
          ? '<div class="tk-card"><b>Get alerts on your iPhone</b><p class="tk-muted" style="margin:6px 0 0">Open this page in Safari, tap <b>Share</b> → <b>Add to Home Screen</b>, then open the tracker from your home screen and come back here to turn notifications on.</p></div>'
          : '<div class="tk-card"><p class="tk-muted" style="margin:0">This browser can\'t show phone notifications. You\'ll still see them here.</p></div>';
      } else {
        var sub = await currentSub();
        if (sub && Notification.permission === 'granted') h = '<div class="tk-card"><div class="tk-row"><div style="flex:1"><b>Phone notifications are on</b><p class="tk-small" style="margin:2px 0 0">On this device. You\'ll get an alert when a client starts or finishes a workout.</p></div></div><div class="tk-grid2" style="margin-top:10px"><button type="button" class="tk-btn plain sm" id="pushOff">Turn off</button><button type="button" class="tk-btn ghost sm" id="pushTest">Send a test</button></div></div>';
        else h = '<div class="tk-card gold"><b>Get an alert on this phone</b><p class="tk-muted" style="margin:6px 0 10px">Be notified when a client starts or finishes a workout, even when the tracker is closed.</p><button type="button" class="tk-btn block" id="pushOn">Turn on notifications</button></div>';
      }
      box.innerHTML = h;
      if ($('pushOn')) $('pushOn').onclick = async function () { this.disabled = true; var ok = await enablePush().catch(function (e) { toast('Could not turn on: ' + (e && e.message || e)); return false; }); if (ok) { toast('Notifications are on'); sb.functions.invoke('notify-coach', { body: { kind: 'test' } }).catch(function () {}); } drawPush(); };
      if ($('pushOff')) $('pushOff').onclick = async function () { await disablePush(); toast('Notifications turned off on this device'); drawPush(); };
      if ($('pushTest')) $('pushTest').onclick = async function () { this.disabled = true; var r = await sb.functions.invoke('notify-coach', { body: { kind: 'test' } }); this.disabled = false; toast(r.error ? 'Could not send the test' : 'Test sent. It should arrive in a few seconds.'); };
    }
    function drawList() {
      var h = '';
      if (!N.list.length) h = '<div class="tk-empty">No notifications yet. When a client starts or finishes a workout it shows here.</div>';
      N.list.forEach(function (x) {
        h += '<button type="button" class="tk-notif' + (x.read_at ? '' : ' new') + '" data-nid="' + x.id + '"><span class="tk-notif-dot" aria-hidden="true"></span><span style="flex:1;text-align:left"><b>' + esc(x.title) + '</b>' + (x.body ? '<span class="tk-small" style="display:block">' + esc(x.body) + '</span>' : '') + '<span class="tk-small" style="display:block;opacity:.8">' + esc(timeAgo(x.created_at)) + '</span></span></button>';
      });
      $('nList').innerHTML = h;
      m.querySelectorAll('[data-nid]').forEach(function (b) { b.onclick = async function () {
        var x = N.list.filter(function (y) { return y.id === b.dataset.nid; })[0]; if (!x || !x.client_id) return;
        var r = await sb.from('profiles').select('*').eq('id', x.client_id).maybeSingle(); if (!r.data) return toast('Client not found');
        m.close(); await openClient(r.data); if (x.kind === 'finished') { S.tab = 'history'; render(); }
      }; });
    }
    drawPush(); drawList();
    var unread = N.list.filter(function (x) { return !x.read_at; });
    if (unread.length) {
      var now = new Date().toISOString();
      sb.from('coach_notifications').update({ read_at: now }).in('id', unread.map(function (x) { return x.id; })).then(function () {});
      unread.forEach(function (x) { x.read_at = now; }); drawBell();
    }
  }

  // ---------- PLAN ----------
  function canEditProgram(p) { return isCoach(); }
  function renderPlan() {
    var v = $('view');
    var h = '<h1 class="tk-h1">' + (viewingOther() ? esc(S.target.name || 'Client') + '\'s <em>programmes</em>' : 'Your <em>programme</em>') + '</h1>';
    h += '<p class="tk-sub">' + (isCoach() ? 'Build a programme with training days, sets, reps and rest. The client sees it straight away and taps Start at the gym.' : 'Follow the plan your coach builds for you, or create your own routine.') + '</p>';
    if (isCoach()) h += '<div class="tk-grid2" style="margin-top:14px"><button type="button" class="tk-btn" id="newProg">+ New programme</button><button type="button" class="tk-btn ghost" id="useTpl">Use a template</button></div>';
    if (!S.programs.length) h += '<div class="tk-empty">No programmes yet.</div>';
    S.programs.forEach(function (p) {
      h += '<div class="tk-card' + (p.active ? ' gold' : '') + '"><div class="tk-row"><div style="flex:1"><span class="tk-tag">' + (p.active ? 'Active' : 'Archived') + '</span><h2 class="tk-h2" style="margin:2px 0 4px">' + esc(p.name) + '</h2></div>' +
        (canEditProgram(p) ? '<button type="button" class="tk-btn sm plain" data-tpl="' + p.id + '">Save as template</button><button type="button" class="tk-btn sm plain" data-edit="' + p.id + '">Edit</button>' : '') + '</div>' + (p.notes ? '<p class="tk-muted">' + esc(p.notes) + '</p>' : '');
      (p.days || []).forEach(function (d, i) {
        h += '<details class="wk"><summary><div style="flex:1"><b>' + esc(d.name || 'Day ' + (i + 1)) + '</b><span class="tk-small"> · ' + (d.exercises || []).length + ' exercises</span></div><button type="button" class="tk-btn sm" data-start="' + p.id + ':' + i + '">Start</button></summary><div class="wk-body">';
        (d.exercises || []).forEach(function (e) { h += '<p><b>' + esc(e.name) + '</b> · ' + esc(e.sets || '') + ' × ' + esc(e.reps || '') + (e.rest ? ' · rest ' + esc(e.rest) + 's' : '') + (e.notes ? ' · ' + esc(e.notes) : '') + '</p>'; });
        h += '</div></details>';
      });
      h += '</div>';
    });
    v.innerHTML = h;
    if ($('newProg')) $('newProg').onclick = function () { openBuilder(null); };
    if ($('useTpl')) $('useTpl').onclick = openTemplates;
    v.querySelectorAll('[data-tpl]').forEach(function (b) { b.onclick = function () { saveAsTemplate(S.programs.filter(function (p) { return p.id === b.dataset.tpl; })[0]); }; });
    v.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { openBuilder(S.programs.filter(function (p) { return p.id === b.dataset.edit; })[0]); }; });
    v.querySelectorAll('[data-start]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); var p = b.dataset.start.split(':'); if (S.draft && !confirmBox('You have a workout in progress. Replace it?')) return; startDraft(S.programs.filter(function (x) { return x.id === p[0]; })[0], +p[1]); }; });
  }

  // ---------- TEMPLATES (coach only) ----------
  function tplCount(t) { return (t.days || []).reduce(function (n, d) { return n + (d.exercises || []).length; }, 0); }
  async function loadTemplates() {
    var r = await sb.from('program_templates').select('*').order('name');
    if (r.error) { toast('Could not load templates: ' + r.error.message); return null; }
    S.templates = r.data || []; return S.templates;
  }
  function saveAsTemplate(p) {
    if (!p || !isCoach()) return;
    var m = modal('Save as template', '<p class="tk-muted">Saves the days, exercises, sets, reps and notes of <b>' + esc(p.name) + '</b> so you can assign it to any client later. Logged weights are not included.</p>' +
      '<div class="tk-field"><label for="tName">Template name</label><input class="tk-input" id="tName" value="' + esc(p.name) + '"></div>' +
      '<div class="tk-grid2" style="margin-top:16px"><button type="button" class="tk-btn plain" data-close>Cancel</button><button type="button" class="tk-btn" id="tSave">Save template</button></div>');
    $('tName').focus(); $('tName').select();
    $('tSave').onclick = async function () {
      var name = $('tName').value.trim(); if (!name) { toast('Give the template a name'); return $('tName').focus(); }
      var btn = this; btn.disabled = true;
      var list = S.templates || await loadTemplates() || [];
      var same = list.filter(function (t) { return t.name.toLowerCase() === name.toLowerCase(); })[0];
      if (same && !confirmBox('A template called "' + same.name + '" already exists. Replace it?')) { btn.disabled = false; return; }
      var row = { name: name, notes: p.notes || null, days: JSON.parse(JSON.stringify(p.days || [])), updated_at: new Date().toISOString() };
      var r = same ? await sb.from('program_templates').update(row).eq('id', same.id).select().single()
        : await sb.from('program_templates').insert(Object.assign(row, { created_by: S.me.id })).select().single();
      btn.disabled = false;
      if (r.error) return toast('Could not save: ' + r.error.message);
      S.templates = list.filter(function (t) { return t.id !== r.data.id; }).concat([r.data]).sort(function (a, b) { return a.name.localeCompare(b.name); });
      ev('tracker_template_saved', {}); m.close(); toast('Template saved');
    };
  }
  async function openTemplates() {
    var m = modal('Programme templates', '<div id="tplList"><p class="tk-muted">Loading…</p></div>');
    var list = await loadTemplates(); if (!list) return m.close();
    var ar = await sb.from('programs').select('client_id,active,template_id').not('template_id', 'is', null);
    var cr = await sb.from('profiles').select('id,name,email').neq('id', S.me.id).eq('archived', false);
    var A = ar.data || [], C = cr.data || [];
    function assignedTo(t) { return A.filter(function (x) { return x.template_id === t.id && x.active; }).map(function (x) { var c = C.filter(function (y) { return y.id === x.client_id; })[0]; return c ? (c.name || c.email) : null; }).filter(Boolean); }
    function draw() {
      var h = '';
      if (!S.templates.length) h = '<div class="tk-empty">No templates yet. Open any programme in the Plan tab and tap <b>Save as template</b>.</div>';
      S.templates.forEach(function (t) {
        var who = assignedTo(t);
        h += '<div class="tk-card"><h2 class="tk-h2" style="margin:0 0 4px">' + esc(t.name) + '</h2><p class="tk-small">' + (t.days || []).length + ' days · ' + tplCount(t) + ' exercises</p>' +
          '<p class="tk-muted" style="margin:6px 0 6px">' + (t.days || []).map(function (d) { return esc(d.name || 'Day'); }).join(' · ') + '</p>' +
          '<p class="tk-small" style="margin:0 0 10px">' + (who.length ? 'Assigned to: <b>' + who.map(esc).join(', ') + '</b>' : 'Not assigned to anyone yet') + '</p>' +
          '<div class="tk-grid2"><button type="button" class="tk-btn danger sm" data-tdel="' + t.id + '">Delete</button><button type="button" class="tk-btn sm" data-tuse="' + t.id + '">Assign to a client</button></div></div>';
      });
      $('tplList').innerHTML = h;
      m.querySelectorAll('[data-tuse]').forEach(function (b) { b.onclick = function () { var t = S.templates.filter(function (x) { return x.id === b.dataset.tuse; })[0]; m.close(); openAssign(t); }; });
      m.querySelectorAll('[data-tdel]').forEach(function (b) { b.onclick = async function () {
        var t = S.templates.filter(function (x) { return x.id === b.dataset.tdel; })[0];
        if (!confirmBox('Delete the template "' + t.name + '"? Programmes already assigned to clients are not affected.')) return;
        var r = await sb.from('program_templates').delete().eq('id', t.id); if (r.error) return toast(r.error.message);
        S.templates = S.templates.filter(function (x) { return x.id !== t.id; }); draw(); toast('Template deleted');
      }; });
    }
    draw();
  }

  // Assign / unassign a template to registered clients. Unassign archives (never deletes) so history stays.
  async function openAssign(t) {
    var m = modal('Assign: ' + t.name, '<div class="tk-field"><label for="aQ" class="sr">Search clients</label><input class="tk-input" id="aQ" type="search" placeholder="Search by name or email"></div><div id="aList"><p class="tk-muted">Loading clients…</p></div>', function () { if (S.tab === 'plan') render(); });
    var q = await Promise.all([
      sb.from('profiles').select('id,name,email').neq('id', S.me.id).eq('archived', false).order('name'),
      sb.from('programs').select('id,client_id,name,active,template_id')
    ]);
    if (q[0].error || q[1].error) { $('aList').innerHTML = '<p class="tk-muted">Could not load clients.</p>'; return; }
    var C = q[0].data || [], P = q[1].data || [];
    function mine(c) { return P.filter(function (x) { return x.client_id === c.id && x.template_id === t.id; }); }
    function isOn(c) { return mine(c).some(function (x) { return x.active; }); }
    function draw() {
      var ql = ($('aQ').value || '').toLowerCase();
      var list = C.filter(function (c) { return !ql || ((c.name || '') + ' ' + (c.email || '')).toLowerCase().indexOf(ql) > -1; });
      list.sort(function (a, b) { return (isOn(b) ? 1 : 0) - (isOn(a) ? 1 : 0) || (a.name || a.email || '').localeCompare(b.name || b.email || ''); });
      var h = list.length ? '' : '<div class="tk-empty">No clients found.</div>';
      list.forEach(function (c) {
        var on = isOn(c);
        h += '<div class="tk-row" style="padding:10px 0;border-bottom:1px solid var(--tk-line,rgba(255,255,255,.08))"><div style="flex:1;min-width:0"><b>' + esc(c.name || 'No name') + '</b><div class="tk-small" style="overflow:hidden;text-overflow:ellipsis">' + esc(c.email || '') + (on ? ' · <span style="color:var(--tk-gold,#C9A84C)">Assigned</span>' : '') + '</div></div>' +
          '<button type="button" class="tk-btn sm' + (on ? ' plain' : '') + '" data-as="' + c.id + '">' + (on ? 'Unassign' : 'Assign') + '</button></div>';
      });
      $('aList').innerHTML = h;
      m.querySelectorAll('[data-as]').forEach(function (b) { b.onclick = function () { toggle(C.filter(function (c) { return c.id === b.dataset.as; })[0], b); }; });
    }
    async function toggle(c, btn) {
      var who = c.name || c.email || 'this client';
      btn.disabled = true;
      try {
        if (isOn(c)) {
          if (!confirmBox('Unassign "' + t.name + '" from ' + who + '? Their programme is archived, not deleted, so their workout history stays.')) return;
          var ids = mine(c).filter(function (x) { return x.active; }).map(function (x) { return x.id; });
          var r = await sb.from('programs').update({ active: false, updated_at: new Date().toISOString() }).in('id', ids);
          if (r.error) return toast('Could not unassign: ' + r.error.message);
          P.forEach(function (x) { if (ids.indexOf(x.id) > -1) x.active = false; });
          ev('tracker_template_unassigned', {}); toast('Unassigned from ' + who);
        } else {
          var other = P.filter(function (x) { return x.client_id === c.id && x.active && x.template_id !== t.id; });
          if (other.length && !confirmBox(who + ' already follows "' + other[0].name + '". Make "' + t.name + '" their active programme instead? The old one is archived, not deleted.')) return;
          var prev = mine(c)[0], r2;
          if (prev) r2 = await sb.from('programs').update({ active: true, updated_at: new Date().toISOString() }).eq('id', prev.id).select('id,client_id,name,active,template_id').single();
          else r2 = await sb.from('programs').insert({ client_id: c.id, created_by: S.me.id, template_id: t.id, name: t.name, notes: t.notes || null, days: JSON.parse(JSON.stringify(t.days || [])), active: true }).select('id,client_id,name,active,template_id').single();
          if (r2.error) return toast('Could not assign: ' + r2.error.message);
          if (other.length) { var oid = other.map(function (x) { return x.id; }); await sb.from('programs').update({ active: false }).in('id', oid); P.forEach(function (x) { if (oid.indexOf(x.id) > -1) x.active = false; }); }
          P = P.filter(function (x) { return x.id !== r2.data.id; }).concat([r2.data]);
          ev('tracker_template_assigned', {}); toast('Assigned to ' + who);
        }
        if (S.target && S.target.id === c.id) { var rp = await sb.from('programs').select('*').eq('client_id', c.id).order('updated_at', { ascending: false }); if (!rp.error) S.programs = rp.data || []; }
      } finally { btn.disabled = false; draw(); }
    }
    $('aQ').oninput = draw;
    draw();
  }

  function openBuilder(prog, seed, tplMode) {
    var P = prog ? JSON.parse(JSON.stringify(prog)) : seed ? { name: seed.name, notes: seed.notes || '', days: JSON.parse(JSON.stringify(seed.days || [])), active: true } : { name: '', notes: '', days: [{ name: 'Day 1', exercises: [] }], active: true };
    if (!P.days.length) P.days.push({ name: 'Day 1', exercises: [] });
    P.days.forEach(function (d) { d.exercises = d.exercises || []; });
    var m = modal(tplMode ? (prog ? 'Edit template' : 'New template') : prog ? 'Edit programme' : seed ? 'New programme from template' : 'New programme', '<div id="bld"></div>');
    function draw() {
      var h = '<div class="tk-field"><label for="bName">Programme name</label><input class="tk-input" id="bName" value="' + esc(P.name) + '" placeholder="e.g. 12-week fat loss, 3 days a week"></div>' +
        '<div class="tk-field"><label for="bNotes">Notes for the client</label><textarea class="tk-textarea" id="bNotes" placeholder="Warm-up, cardio after weights, steps target…">' + esc(P.notes || '') + '</textarea></div>' +
        (tplMode ? '' : '<label class="tk-row tk-muted" style="margin-top:10px;min-height:44px"><input type="checkbox" id="bActive"' + (P.active ? ' checked' : '') + ' style="width:20px;height:20px"> Active programme (shows on the client\'s Today screen)</label>');
      P.days.forEach(function (d, di) {
        h += '<div class="bday"><div class="tk-row"><label class="sr" for="dn' + di + '">Day name</label><input class="tk-input" id="dn' + di + '" data-dn="' + di + '" value="' + esc(d.name) + '" style="flex:1;font-weight:700"><button type="button" class="tk-icon-btn" data-rmday="' + di + '" aria-label="Remove day">' + ICON.trash + '</button></div>';
        if (d.exercises.length) h += '<div class="bex-h"><span>Exercise</span><span>Sets</span><span>Reps</span><span>Rest s</span><span></span></div>';
        d.exercises.forEach(function (e, ei) {
          h += '<div class="bex"><div class="nm"><div class="bex-top"><span>' + esc(e.name) + '</span><span class="bex-mv">' + (ei > 0 ? '<button type="button" class="tk-icon-btn sm" data-mvx="' + di + ':' + ei + ':-1" aria-label="Move ' + esc(e.name) + ' up">' + ICON.up + '</button>' : '') + (ei < d.exercises.length - 1 ? '<button type="button" class="tk-icon-btn sm" data-mvx="' + di + ':' + ei + ':1" aria-label="Move ' + esc(e.name) + ' down">' + ICON.down + '</button>' : '') + '</span></div>' + (typeOf(e.name) === 'b' ? '<select class="tk-select bex-mode" aria-label="Load for ' + esc(e.name) + '" data-bmode="' + di + ':' + ei + '">' + MODES.map(function (m) { return '<option value="' + m[0] + '"' + ((e.mode || 'bw') === m[0] ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') + '</select>' : '') + '<input class="tk-input" style="margin-top:4px;text-align:left;font-size:.8rem;min-height:34px" aria-label="Notes for ' + esc(e.name) + '" placeholder="Notes (optional)" data-f="notes" data-d="' + di + '" data-e="' + ei + '" value="' + esc(e.notes || '') + '"></div>' +
            '<input class="tk-input" inputmode="numeric" aria-label="Sets" data-f="sets" data-d="' + di + '" data-e="' + ei + '" value="' + esc(e.sets) + '">' +
            '<input class="tk-input" aria-label="Reps" data-f="reps" data-d="' + di + '" data-e="' + ei + '" value="' + esc(e.reps) + '">' +
            '<input class="tk-input" inputmode="numeric" aria-label="Rest seconds" data-f="rest" data-d="' + di + '" data-e="' + ei + '" value="' + esc(e.rest) + '">' +
            '<button type="button" class="tk-icon-btn" data-rmx="' + di + ':' + ei + '" aria-label="Remove ' + esc(e.name) + '">' + ICON.x + '</button></div>';
        });
        h += '<button type="button" class="tk-btn sm ghost" data-addx="' + di + '" style="margin-top:10px">+ Add exercise</button></div>';
      });
      h += '<button type="button" class="tk-btn plain block" id="bAddDay" style="margin-top:12px">+ Add training day</button>';
      h += '<div class="tk-grid2" style="margin-top:16px">' + (prog ? '<button type="button" class="tk-btn danger" id="bDel">Delete</button>' : '<button type="button" class="tk-btn plain" data-close>Cancel</button>') + '<button type="button" class="tk-btn" id="bSave">' + (tplMode ? 'Save template' : 'Save programme') + '</button></div>';
      $('bld').innerHTML = h;
      $('bName').oninput = function () { P.name = this.value; };
      $('bNotes').oninput = function () { P.notes = this.value; };
      if ($('bActive')) $('bActive').onchange = function () { P.active = this.checked; };
      m.querySelectorAll('[data-dn]').forEach(function (i) { i.oninput = function () { P.days[+i.dataset.dn].name = i.value; }; });
      m.querySelectorAll('input[data-f]').forEach(function (i) { i.oninput = function () { P.days[+i.dataset.d].exercises[+i.dataset.e][i.dataset.f] = i.value; }; });
      m.querySelectorAll('[data-rmday]').forEach(function (b) { b.onclick = function () { if (P.days.length > 1 || confirmBox('Remove the only day?')) { P.days.splice(+b.dataset.rmday, 1); if (!P.days.length) P.days.push({ name: 'Day 1', exercises: [] }); draw(); } }; });
      m.querySelectorAll('[data-bmode]').forEach(function (sel) { sel.onchange = function () { var q = sel.dataset.bmode.split(':'); P.days[+q[0]].exercises[+q[1]].mode = sel.value; }; });
      m.querySelectorAll('[data-mvx]').forEach(function (b) { b.onclick = function () { var p = b.dataset.mvx.split(':'), ex = P.days[+p[0]].exercises, i = +p[1], j = i + (+p[2]); if (j < 0 || j >= ex.length) return; var t = ex[i]; ex[i] = ex[j]; ex[j] = t; draw(); }; });
      m.querySelectorAll('[data-rmx]').forEach(function (b) { b.onclick = function () { var p = b.dataset.rmx.split(':'); P.days[+p[0]].exercises.splice(+p[1], 1); draw(); }; });
      m.querySelectorAll('[data-addx]').forEach(function (b) {
        b.onclick = function () {
          var di = +b.dataset.addx; m.style.display = 'none';
          openPicker(function (name) { var t = typeOf(name); P.days[di].exercises.push({ name: name, sets: t === 'c' ? 1 : 3, reps: t === 't' ? '30-45s' : t === 'c' ? '20 min' : '8-12', rest: t === 'c' ? '' : 90, notes: '' }); draw(); },
            function () { m.style.display = ''; document.body.style.overflow = 'hidden'; });
        };
      });
      $('bAddDay').onclick = function () { P.days.push({ name: 'Day ' + (P.days.length + 1), exercises: [] }); draw(); };
      $('bSave').onclick = saveProg;
      if ($('bDel')) $('bDel').onclick = async function () {
        if (tplMode) { if (!confirmBox('Delete this template? Programmes already assigned to clients are not affected.')) return; var rt = await sb.from('program_templates').delete().eq('id', prog.id); if (rt.error) return toast(rt.error.message); S.templates = null; m.close(); render(); return toast('Template deleted'); }
        if (!confirmBox('Delete this programme? Logged workouts are kept.')) return;
        var r = await sb.from('programs').delete().eq('id', prog.id);
        if (r.error) return toast(r.error.message);
        S.programs = S.programs.filter(function (x) { return x.id !== prog.id; }); m.close(); render(); toast('Programme deleted');
      };
    }
    async function saveProg() {
      if (!P.name.trim()) { toast('Give the programme a name'); $('bName').focus(); return; }
      var days = P.days.map(function (d) { return { name: d.name || 'Day', exercises: d.exercises.map(function (e) { return { name: e.name, sets: parseInt(e.sets, 10) || 1, reps: String(e.reps || ''), rest: parseInt(e.rest, 10) || null, notes: e.notes || '', mode: e.mode || undefined }; }) }; });
      if (tplMode) {
        var trow = { name: P.name.trim(), notes: P.notes || null, days: days, updated_at: new Date().toISOString() };
        var rt = prog ? await sb.from('program_templates').update(trow).eq('id', prog.id).select().single() : await sb.from('program_templates').insert(Object.assign(trow, { created_by: S.me.id })).select().single();
        if (rt.error) return toast('Could not save: ' + rt.error.message);
        S.templates = null; ev('tracker_template_saved', {}); m.close(); render(); return toast('Template saved');
      }
      var row = { name: P.name.trim(), notes: P.notes || null, days: days, active: !!P.active, updated_at: new Date().toISOString() };
      var r;
      if (prog) r = await sb.from('programs').update(row).eq('id', prog.id).select().single();
      else { row.client_id = S.target.id; row.created_by = S.me.id; r = await sb.from('programs').insert(row).select().single(); }
      if (r.error) return toast('Could not save: ' + r.error.message);
      if (row.active) {
        var others = S.programs.filter(function (x) { return x.active && x.id !== r.data.id && canEditProgram(x); }).map(function (x) { return x.id; });
        if (others.length) { await sb.from('programs').update({ active: false }).in('id', others); S.programs.forEach(function (x) { if (others.indexOf(x.id) > -1) x.active = false; }); }
      }
      S.programs = [r.data].concat(S.programs.filter(function (x) { return x.id !== r.data.id; }));
      ev('tracker_programme_saved', { by_coach: isCoach() });
      m.close(); render(); toast('Programme saved');
    }
    draw();
  }

  // ---------- BODY ----------
  // [field, label, unit, group, good direction (+1 up is good, -1 down is good, 0 neutral), min, max]
  var MEAS = [
    ['weight', 'Weight', 'kg', 'scan', 0, 25, 350],
    ['muscle_mass', 'Skeletal muscle mass', 'kg', 'scan', 1, 5, 120],
    ['fat_mass', 'Body fat mass', 'kg', 'scan', -1, 1, 200],
    ['body_fat', 'Body fat', '%', 'scan', -1, 2, 75],
    ['inbody_score', 'InBody score', '/100', 'scan', 1, 0, 120],
    ['visceral_fat', 'Visceral fat level', '', 'scan', -1, 1, 30],
    ['bmr', 'BMR', 'kcal', 'scan', 0, 500, 5000],
    ['waist', 'Waist', 'cm', 'tape', -1, 30, 250],
    ['chest', 'Chest', 'cm', 'tape', 0, 30, 250],
    ['hips', 'Hips', 'cm', 'tape', -1, 30, 250],
    ['arm', 'Arm', 'cm', 'tape', 1, 10, 80],
    ['thigh', 'Thigh', 'cm', 'tape', 0, 20, 120]
  ];
  function mUnit(m, v) { return m[2] === '/100' ? v + '/100' : m[2] === '' ? String(v) : v + ' ' + m[2]; }
  function mLabel(m) { return m[1] + (m[2] === '/100' ? ' (out of 100)' : m[2] ? ' (' + m[2] + ')' : ''); }
  function series(B, k) { return B.filter(function (b) { return b[k] != null; }); }
  function renderBody() {
    var v = $('view'), B = S.body, withW = series(B, 'weight');
    var first = withW[0], last = withW[withW.length - 1];
    var mm = series(B, 'muscle_mass'), fm = series(B, 'fat_mass'), pf = series(B, 'body_fat'), sc = series(B, 'inbody_score');
    var h = '<h1 class="tk-h1">Body <em>progress</em></h1><p class="tk-sub">Log an InBody scan every 4 weeks, same time of day, ideally before training and before eating. Weigh in once or twice a week in between.</p>';
    function stat(arr, k, label, unit) {
      if (!arr.length) return '';
      var a = arr[0][k], n = arr[arr.length - 1][k], d = r1(n - a);
      return '<div class="tk-stat"><b>' + n + (unit || '') + '</b><span>' + label + (arr.length > 1 ? ' · ' + (d > 0 ? '+' : '') + d : '') + '</span></div>';
    }
    if (withW.length || mm.length || pf.length) {
      h += '<div class="tk-grid2" style="margin-top:14px">' + stat(withW, 'weight', 'Weight kg') + stat(mm, 'muscle_mass', 'Muscle kg') + stat(fm, 'fat_mass', 'Fat mass kg') + stat(pf, 'body_fat', 'Body fat', '%') + stat(sc, 'inbody_score', 'InBody score') + '</div>';
    }
    if (mm.length > 1 || fm.length > 1) h += '<div class="tk-card"><span class="tk-tag">Muscle vs fat (kg)</span><div class="chart-box"><canvas id="cChart" role="img" aria-label="Skeletal muscle mass and body fat mass over time"></canvas></div><p class="tk-small">The goal for most clients: the gold line (muscle) rising or holding while the blue line (fat) drops.</p></div>';
    if (pf.length > 1) h += '<div class="tk-card"><span class="tk-tag">Body fat %</span><div class="chart-box"><canvas id="pChartB" role="img" aria-label="Body fat percentage over time"></canvas></div></div>';
    if (withW.length > 1) h += '<div class="tk-card"><span class="tk-tag">Weight trend</span><div class="chart-box"><canvas id="wChart" role="img" aria-label="Body weight over time"></canvas></div></div>';
    h += '<div class="tk-card"><h2 class="tk-h2" style="margin-top:0">Log a scan or weigh-in</h2><div class="tk-field"><label for="bDate">Date</label><input class="tk-input" type="date" id="bDate" value="' + today() + '" max="' + today() + '"></div>';
    h += '<div class="tk-field"><label for="bPhoto">Photo of your InBody sheet, or a progress photo (optional, private)</label><input class="tk-input" type="file" id="bPhoto" accept="image/*"><p class="tk-small" style="margin-top:6px">Add a photo of the InBody sheet and we\'ll fill in the numbers for you. You can also type or correct them below.</p><div id="bPrev" class="b-prev" hidden></div><div id="bAi" class="ai-status" role="status" hidden></div></div>' +
      '<h3 class="tk-tag" style="display:block;margin-top:16px">InBody scan</h3><p class="tk-small">Fill in only what you have; weight alone is fine for a quick weigh-in.</p><div class="tk-grid2">';
    MEAS.filter(function (m) { return m[3] === 'scan'; }).forEach(function (m) { var ls = series(B, m[0]), pl = ls.length ? ls[ls.length - 1][m[0]] : ''; h += '<div class="tk-field"><label for="m_' + m[0] + '">' + mLabel(m) + '</label><input class="tk-input" inputmode="decimal" id="m_' + m[0] + '" placeholder="' + esc(pl) + '"></div>'; });
    h += '</div><details style="margin-top:14px"><summary class="tk-link" style="cursor:pointer">Tape measurements (optional)</summary><div class="tk-grid2">';
    MEAS.filter(function (m) { return m[3] === 'tape'; }).forEach(function (m) { h += '<div class="tk-field"><label for="m_' + m[0] + '">' + mLabel(m) + '</label><input class="tk-input" inputmode="decimal" id="m_' + m[0] + '"></div>'; });
    h += '</div></details>';
    h += '<div class="tk-field"><label for="bNote">Notes</label><input class="tk-input" id="bNote" placeholder="e.g. scan after 4 weeks, started new plan"></div><button type="button" class="tk-btn block" id="bSaveLog" style="margin-top:14px">Save</button><p class="tk-small" style="margin-top:8px">Only you and your coach can see your measurements and photos.</p></div>';
    var cols = MEAS.filter(function (m) { return series(B, m[0]).length; });
    if (B.length && cols.length) {
      h += '<div class="tk-card"><span class="tk-tag">Start vs now</span>';
      cols.forEach(function (m) {
        var a = series(B, m[0]), s = a[0][m[0]], n = a[a.length - 1][m[0]], d = r1(n - s);
        var cls = d === 0 || m[4] === 0 ? (d === 0 ? '' : ' gold') : (d * m[4] > 0 ? ' ok' : ' warn');
        h += '<div class="li"><div class="grow"><b>' + m[1] + '</b><span class="tk-small">' + esc(mUnit(m, s)) + ' → ' + esc(mUnit(m, n)) + (a.length > 1 ? ' · since ' + fmtDay(a[0].date, { day: 'numeric', month: 'short' }) : '') + '</span></div>' + (a.length > 1 ? '<span class="pill' + cls + '">' + (d > 0 ? '+' : '') + d + (m[2] && m[2] !== '/100' ? ' ' + m[2] : '') + '</span>' : '') + '</div>';
      });
      h += '</div>';
    }
    var ph = B.filter(function (b) { return b.photo_path; });
    if (ph.length) h += '<div class="tk-card"><span class="tk-tag">Photos</span><div class="photos" id="photos"></div></div>';
    if (B.length) {
      h += '<div class="tk-card"><span class="tk-tag">History</span>';
      B.slice().reverse().slice(0, 60).forEach(function (b) {
        var bits = MEAS.filter(function (m) { return b[m[0]] != null; }).map(function (m) { return m[1] + ' ' + mUnit(m, b[m[0]]); });
        h += '<div class="li"><div class="grow"><b>' + fmtDay(b.date) + '</b><span class="tk-small">' + esc(bits.join(' · ') || (b.photo_path ? 'Photo' : '')) + (b.notes ? ' · ' + esc(b.notes) : '') + '</span></div><button type="button" class="tk-icon-btn" data-delb="' + b.id + '" aria-label="Delete entry from ' + fmtDay(b.date) + '">' + ICON.trash + '</button></div>';
      });
      h += '</div>';
    }
    v.innerHTML = h;
    var lab = function (arr) { return arr.map(function (b) { return fmtDay(b.date, { day: 'numeric', month: 'short' }); }); };
    if (window.Chart) {
      if (withW.length > 1) S.chart.w = lineChart('wChart', lab(withW), [{ label: 'Weight (kg)', data: withW.map(function (b) { return +b.weight; }) }]);
      if (pf.length > 1) S.chart.pf = lineChart('pChartB', lab(pf), [{ label: 'Body fat (%)', data: pf.map(function (b) { return +b.body_fat; }) }]);
      if (mm.length > 1 || fm.length > 1) {
        var comp = B.filter(function (b) { return b.muscle_mass != null || b.fat_mass != null; });
        S.chart.c = lineChart('cChart', lab(comp), [{ label: 'Muscle (kg)', data: comp.map(function (b) { return b.muscle_mass == null ? null : +b.muscle_mass; }) }, { label: 'Fat (kg)', data: comp.map(function (b) { return b.fat_mass == null ? null : +b.fat_mass; }) }]);
      }
    }
    if (ph.length) loadPhotos(ph);
    $('bSaveLog').onclick = saveBody;
    if ($('bPhoto')) $('bPhoto').onchange = function () {
      var f = this.files[0], pv = $('bPrev'); if (!f) { pv.hidden = true; return; }
      var u = URL.createObjectURL(f);
      pv.innerHTML = '<button type="button" class="ph-btn" aria-label="Open your photo full screen to zoom"><img src="' + u + '" alt="Your photo"></button><span class="tk-small">Tap the photo to zoom while you check the numbers.</span>';
      pv.hidden = false; pv.querySelector('button').onclick = function () { openViewer([{ url: u, cap: 'Your photo' }], 0); };
      readInbody(f);
    };
    v.querySelectorAll('[data-delb]').forEach(function (b) {
      b.onclick = async function () {
        if (!confirmBox('Delete this entry?')) return;
        var row = S.body.filter(function (x) { return x.id === b.dataset.delb; })[0];
        var r = await sb.from('body_logs').delete().eq('id', b.dataset.delb); if (r.error) return toast(r.error.message);
        if (row && row.photo_path) await sb.storage.from('progress-photos').remove([row.photo_path]);
        S.body = S.body.filter(function (x) { return x.id !== b.dataset.delb; }); render();
      };
    });
  }
  async function loadPhotos(rows) {
    var r = await sb.storage.from('progress-photos').createSignedUrls(rows.map(function (b) { return b.photo_path; }), 3600);
    if (r.error || !$('photos')) return;
    var items = [];
    $('photos').innerHTML = rows.map(function (b, i) {
      var u = r.data[i] && r.data[i].signedUrl; if (!u) return '';
      var cap = fmtDay(b.date, { day: 'numeric', month: 'short', year: '2-digit' }) + (b.weight ? ' · ' + b.weight + 'kg' : '');
      items.push({ url: u, cap: cap });
      return '<button type="button" class="ph-btn" data-ph="' + (items.length - 1) + '" aria-label="Open photo from ' + esc(cap) + '"><figure><img src="' + esc(u) + '" alt="Progress photo, ' + fmtDay(b.date) + '" loading="lazy"><figcaption>' + esc(cap) + '</figcaption></figure></button>';
    }).join('');
    $('photos').querySelectorAll('[data-ph]').forEach(function (b) { b.onclick = function () { openViewer(items, +b.dataset.ph); }; });
  }
  function openViewer(items, idx) {
    var w = document.createElement('div'); w.className = 'pv'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Photo viewer');
    w.innerHTML = '<div class="pv-top"><span class="pv-cap"></span><a class="pv-orig" target="_blank" rel="noopener">Open original</a><button type="button" class="pv-x" aria-label="Close">' + ICON.x + '</button></div>' +
      '<div class="pv-stage"><img alt=""></div>' +
      (items.length > 1 ? '<button type="button" class="pv-nav pv-prev" aria-label="Previous photo">‹</button><button type="button" class="pv-nav pv-next" aria-label="Next photo">›</button>' : '') +
      '<p class="pv-hint">Tap the photo to zoom in</p>';
    var stage = w.querySelector('.pv-stage'), img = stage.querySelector('img');
    function show(i) { idx = (i + items.length) % items.length; stage.classList.remove('zoom'); img.src = items[idx].url; img.alt = 'Photo, ' + items[idx].cap; w.querySelector('.pv-cap').textContent = items[idx].cap + (items.length > 1 ? '  ·  ' + (idx + 1) + ' of ' + items.length : ''); w.querySelector('.pv-orig').href = items[idx].url; }
    function close() { w.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; }
    function key(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1); }
    img.onclick = function (e) {
      var zoomed = stage.classList.toggle('zoom');
      if (zoomed) { var rc = img.getBoundingClientRect(), fx = (e.clientX - rc.left) / rc.width, fy = (e.clientY - rc.top) / rc.height; requestAnimationFrame(function () { stage.scrollLeft = fx * stage.scrollWidth - stage.clientWidth / 2; stage.scrollTop = fy * stage.scrollHeight - stage.clientHeight / 2; }); }
    };
    w.querySelector('.pv-x').onclick = close;
    w.addEventListener('click', function (e) { if (e.target === w || e.target === stage) close(); });
    if (items.length > 1) { w.querySelector('.pv-prev').onclick = function () { show(idx - 1); }; w.querySelector('.pv-next').onclick = function () { show(idx + 1); }; }
    var sx = null; stage.addEventListener('touchstart', function (e) { sx = e.touches.length === 1 && !stage.classList.contains('zoom') ? e.touches[0].clientX : null; }, { passive: true });
    stage.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50 && items.length > 1) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
    document.addEventListener('keydown', key); document.body.appendChild(w); document.body.style.overflow = 'hidden';
    show(idx); w.querySelector('.pv-x').focus();
  }
  // ---------- InBody sheet: read the numbers with AI (server: /api/read-inbody) ----------
  function photoData(file, max, q) {
    return new Promise(function (ok, bad) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', q)); };
      img.onerror = function () { bad(new Error('Could not read photo')); }; img.src = url;
    });
  }
  async function readInbody(file) {
    var st = $('bAi'); if (!st || !file) return;
    st.className = 'ai-status'; st.hidden = false; st.innerHTML = '<span class="ai-spin" aria-hidden="true"></span> Reading the InBody sheet… this can take up to 30 seconds. You can keep typing meanwhile.';
    try {
      var data = await photoData(file, 2000, 0.85);
      var ses = await sb.auth.getSession(), tok = ses.data && ses.data.session && ses.data.session.access_token;
      var r = await fetch('/api/read-inbody', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ image: data }) });
      var j = await r.json().catch(function () { return {}; });
      if (!$('bAi')) return;
      if (r.status === 503) { st.hidden = true; return; }
      if (r.status === 429) { st.innerHTML = 'Automatic reading is busy right now. Please type the numbers below while looking at your photo.'; return; }
      if (!r.ok) throw new Error(j.error || 'failed');
      if (!j.is_inbody) { st.innerHTML = 'No InBody numbers found in this photo. That\'s fine for a progress photo; for a scan, type the numbers below.'; return; }
      var n = 0;
      Object.keys(j.values || {}).forEach(function (k) { var el = $('m_' + k); if (el) { el.value = j.values[k]; el.classList.add('ai-filled'); n++; } });
      if (j.date && $('bDate')) $('bDate').value = j.date;
      st.className = 'ai-status ok';
      st.innerHTML = n ? '✓ ' + n + ' number' + (n === 1 ? '' : 's') + ' filled in from the InBody sheet' + (j.date ? ' (scan date ' + fmtDay(j.date, { day: 'numeric', month: 'short', year: 'numeric' }) + ')' : '') + '. Please check them against the sheet, then tap Save.' : 'We couldn\'t read the numbers clearly. Please type them below, or try a sharper, straight-on photo.';
      ev('tracker_inbody_read', { fields: n });
    } catch (e) {
      if ($('bAi')) { st.className = 'ai-status'; st.innerHTML = 'Couldn\'t read the sheet automatically. Please type the numbers below.'; }
    }
  }
  function compress(file) {
    return new Promise(function (ok, bad) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { var k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(function (b) { b ? ok(b) : bad(new Error('Could not read photo')); }, 'image/jpeg', 0.82); };
      img.onerror = function () { bad(new Error('Could not read photo')); }; img.src = url;
    });
  }
  async function saveBody() {
    var row = { user_id: S.target.id, date: $('bDate').value || today(), notes: $('bNote').value.trim() || null }, any = false;
    var bad = null;
    MEAS.forEach(function (m) { var x = num($('m_' + m[0]).value); if (x != null) { if (x < m[5] || x > m[6]) bad = bad || m; row[m[0]] = m[0] === 'inbody_score' || m[0] === 'visceral_fat' || m[0] === 'bmr' ? Math.round(x) : x; any = true; } });
    var file = $('bPhoto') && $('bPhoto').files[0];
    if (!any && !file) { toast('Enter at least one measurement'); return; }
    if (bad) { toast('Check ' + bad[1] + ': it looks out of range'); $('m_' + bad[0]).focus(); return; }
    $('bSaveLog').disabled = true;
    if (file) {
      try {
        var blob = await compress(file), path = S.target.id + '/' + row.date + '-' + Date.now() + '.jpg';
        var up = await sb.storage.from('progress-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error; row.photo_path = path;
      } catch (e) { $('bSaveLog').disabled = false; toast('Photo upload failed: ' + e.message); return; }
    }
    var r = await sb.from('body_logs').insert(row).select().single();
    if (r.error) { $('bSaveLog').disabled = false; toast('Could not save: ' + r.error.message); return; }
    S.body.push(r.data); S.body.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    ev('tracker_body_saved', { photo: !!file }); toast('Saved'); render();
  }

  function lineChart(id, labels, sets, yTitle) {
    var el = $(id); if (!el || !window.Chart) return null;
    var cols = ['#C9A84C', '#8fb7e8'];
    return new Chart(el, {
      type: 'line',
      data: { labels: labels, datasets: sets.map(function (s, i) { return { label: s.label, data: s.data, borderColor: cols[i], backgroundColor: cols[i], pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, tension: 0.25, spanGaps: true }; }) },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: sets.length > 1, labels: { color: '#cfc8bb', boxWidth: 12 } }, tooltip: { backgroundColor: '#111', borderColor: '#C9A84C', borderWidth: 1 } },
        scales: { x: { ticks: { color: '#9a9488', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { color: 'rgba(255,255,255,.05)' } }, y: { title: { display: !!yTitle, text: yTitle, color: '#9a9488' }, ticks: { color: '#9a9488' }, grid: { color: 'rgba(255,255,255,.06)' } } } }
    });
  }

  // ---------- HABITS (steps, water, sleep, energy, mood) ----------
  var HG_DEF = { steps: 8000, water: 8, sleep: 7 };
  var MOODS = [['😫', 'Awful'], ['🙁', 'Low'], ['😐', 'Okay'], ['🙂', 'Good'], ['😄', 'Great']];
  var ENERGY = ['Very low', 'Low', 'Okay', 'High', 'Very high'];
  function hGoals() { var g = (S.target && S.target.habit_goals) || {}; return { steps: +g.steps || HG_DEF.steps, water: +g.water || HG_DEF.water, sleep: +g.sleep || HG_DEF.sleep }; }
  function hRow(d) { return (S.habits || []).filter(function (x) { return x.date === d; })[0] || null; }
  function hLogged(x) { return !!x && (x.steps != null || !!x.water || x.sleep != null || !!x.energy || !!x.mood); }
  function hHits(x, g) { if (!x) return 0; var n = 0; if ((x.steps || 0) >= g.steps) n++; if ((x.water || 0) >= g.water) n++; if ((+x.sleep || 0) >= g.sleep) n++; return n; }
  function hStreak() {
    var d = parseDay(today()); if (!hLogged(hRow(today()))) d.setDate(d.getDate() - 1);
    var n = 0; while (hLogged(hRow(iso(d)))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function hLastDays(n) { var out = [], d = parseDay(today()); for (var i = 0; i < n; i++) { out.unshift(iso(d)); d.setDate(d.getDate() - 1); } return out; }
  function hAvg(days, k) { var v = days.map(hRow).filter(function (x) { return x && x[k] != null && x[k] !== 0; }).map(function (x) { return +x[k]; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; }
  var HSAVE = {};
  function hSet(d, k, val) {
    var row = hRow(d);
    if (!row) { row = { user_id: S.target.id, date: d }; S.habits.push(row); S.habits.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); }
    row[k] = val;
    clearTimeout(HSAVE[d]);
    var uid = S.target.id;
    HSAVE[d] = setTimeout(async function () {
      var p = { user_id: uid, date: d, updated_at: new Date().toISOString() };
      ['steps', 'water', 'sleep', 'energy', 'mood', 'note'].forEach(function (f) { p[f] = row[f] == null || row[f] === '' ? null : row[f]; });
      var r = await sb.from('habit_logs').upsert(p, { onConflict: 'user_id,date' });
      if (r.error) toast('Could not save: ' + r.error.message);
      else { ev('tracker_habit_saved', { field: k }); var st = document.querySelector('[data-hsaved="' + d + '"]'); if (st) { st.textContent = 'Saved'; setTimeout(function () { if (st) st.textContent = ''; }, 1500); } }
    }, 600);
  }
  function hBar(val, goal) { var p = Math.max(0, Math.min(100, Math.round((val || 0) / goal * 100))); return '<div class="hb-bar' + (p >= 100 ? ' done' : '') + '"><i style="width:' + p + '%"></i></div>'; }
  // The logging card for one day. full = show the note field too.
  function habitCard(d, full) {
    var x = hRow(d) || {}, g = hGoals(), isToday = d === today();
    var h = '<div class="hb" data-hday="' + d + '">';
    h += '<div class="hb-item"><div class="hb-top"><label for="hSteps">' + ICON.steps + 'Steps</label><span class="tk-small">Goal ' + nf(g.steps) + '</span></div><input class="tk-input" id="hSteps" inputmode="numeric" placeholder="e.g. 8500" value="' + (x.steps != null ? x.steps : '') + '" aria-describedby="hStepsHelp">' + hBar(x.steps, g.steps) + '<span class="sr" id="hStepsHelp">Copy the number from your phone\'s health app</span></div>';
    h += '<div class="hb-item"><div class="hb-top"><span id="hWaterL">' + ICON.water + 'Water</span><span class="tk-small">Goal ' + g.water + ' glasses</span></div><div class="hb-step" role="group" aria-labelledby="hWaterL"><button type="button" class="tk-icon-btn" id="hWaterMinus" aria-label="One glass less">−</button><b id="hWaterN" aria-live="polite">' + (x.water || 0) + ' <small>of ' + g.water + '</small></b><button type="button" class="tk-icon-btn" id="hWaterPlus" aria-label="One more glass">+</button></div>' + hBar(x.water, g.water) + '<span class="tk-small">1 glass = 250 ml</span></div>';
    h += '<div class="hb-item"><div class="hb-top"><label for="hSleep">' + ICON.sleep + 'Sleep ' + (isToday ? 'last night' : '') + '</label><span class="tk-small">Goal ' + g.sleep + ' h</span></div><input class="tk-input" id="hSleep" inputmode="decimal" placeholder="Hours, e.g. 7.5" value="' + (x.sleep != null ? x.sleep : '') + '">' + hBar(x.sleep, g.sleep) + '</div>';
    h += '<div class="hb-item"><span class="hb-lab" id="hEnL">' + ICON.bolt + 'Energy</span><div class="hb-scale" role="group" aria-labelledby="hEnL">' + ENERGY.map(function (t, i) { return '<button type="button" data-hen="' + (i + 1) + '" aria-pressed="' + (x.energy === i + 1) + '" aria-label="Energy ' + (i + 1) + ' of 5, ' + t + '">' + (i + 1) + '</button>'; }).join('') + '</div></div>';
    h += '<div class="hb-item hb-wide"><span class="hb-lab" id="hMoL">' + ICON.smile + 'Mood</span><div class="hb-scale mood" role="group" aria-labelledby="hMoL">' + MOODS.map(function (m, i) { return '<button type="button" data-hmo="' + (i + 1) + '" aria-pressed="' + (x.mood === i + 1) + '" aria-label="Mood: ' + m[1] + '"><span aria-hidden="true">' + m[0] + '</span></button>'; }).join('') + '</div></div>';
    if (full) h += '<div class="tk-field"><label for="hNote">Note (optional)</label><input class="tk-input" id="hNote" maxlength="500" placeholder="e.g. late dinner, poor sleep, felt great in training" value="' + esc(x.note || '') + '"></div>';
    h += '<div class="hb-foot"><span class="tk-small" id="hHits">' + hitsText(x, g) + '</span><span class="tk-small hb-saved" data-hsaved="' + d + '" role="status"></span></div></div>';
    return h;
  }
  function hitsText(x, g) { var n = hHits(x, g); return n === 3 ? 'All 3 goals hit. Great day!' : n + ' of 3 goals hit'; }
  function wireHabitCard(root) {
    var box = root.querySelector('[data-hday]'); if (!box) return;
    var d = box.dataset.hday, g = hGoals();
    function repaint() {
      var x = hRow(d) || {}, bars = box.querySelectorAll('.hb-bar');
      [[x.steps, g.steps], [x.water, g.water], [x.sleep, g.sleep]].forEach(function (p, i) { if (bars[i]) bars[i].outerHTML = hBar(p[0], p[1]); });
      $('hWaterN').innerHTML = (x.water || 0) + ' <small>of ' + g.water + '</small>';
      $('hHits').textContent = hitsText(x, g);
      var st = $('hStreakN'); if (st) st.textContent = hStreak();
      clearTimeout(HSAVE.badge); HSAVE.badge = setTimeout(checkBadges, 1200);
    }
    $('hSteps').oninput = function () { var v = parseInt(this.value.replace(/[^\d]/g, ''), 10); if (this.value && (isNaN(v) || v > 100000)) return; hSet(d, 'steps', isNaN(v) ? null : v); repaint(); };
    $('hSleep').oninput = function () { var v = num(this.value); if (this.value && (v == null || v < 0 || v > 24)) return; hSet(d, 'sleep', v == null ? null : r1(v)); repaint(); };
    $('hWaterPlus').onclick = function () { var x = hRow(d) || {}; hSet(d, 'water', Math.min(30, (x.water || 0) + 1)); repaint(); };
    $('hWaterMinus').onclick = function () { var x = hRow(d) || {}; hSet(d, 'water', Math.max(0, (x.water || 0) - 1)); repaint(); };
    box.querySelectorAll('[data-hen]').forEach(function (b) { b.onclick = function () { var x = hRow(d) || {}, v = +b.dataset.hen; v = x.energy === v ? null : v; hSet(d, 'energy', v); box.querySelectorAll('[data-hen]').forEach(function (o) { o.setAttribute('aria-pressed', String(+o.dataset.hen === v)); }); repaint(); }; });
    box.querySelectorAll('[data-hmo]').forEach(function (b) { b.onclick = function () { var x = hRow(d) || {}, v = +b.dataset.hmo; v = x.mood === v ? null : v; hSet(d, 'mood', v); box.querySelectorAll('[data-hmo]').forEach(function (o) { o.setAttribute('aria-pressed', String(+o.dataset.hmo === v)); }); repaint(); }; });
    if ($('hNote')) $('hNote').oninput = function () { hSet(d, 'note', this.value.trim() || null); };
  }
  function todayHabitsCard() {
    var who = viewingOther() ? esc((S.target.name || 'Client').split(' ')[0]) + '\'s' : 'Today\'s';
    return '<div class="tk-card hb-card"><div class="hb-head"><div><span class="tk-tag">' + who + ' habits</span><b class="hb-streak"><span id="hStreakN">' + hStreak() + '</span>-day streak</b></div><button type="button" class="tk-btn sm plain" id="goHabits">Trends</button></div>' + habitCard(today(), false) + '</div>';
  }
  function barChart(id, labels, data, goal, label, color) {
    var el = $(id); if (!el || !window.Chart) return null;
    var sets = [{ type: 'bar', label: label, data: data, backgroundColor: data.map(function (v) { return v != null && goal && v >= goal ? '#C9A84C' : color || 'rgba(201,168,76,.45)'; }), borderRadius: 4, maxBarThickness: 18 }];
    if (goal) sets.push({ type: 'line', label: 'Goal', data: labels.map(function () { return goal; }), borderColor: 'rgba(242,237,227,.5)', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 });
    return new Chart(el, {
      type: 'bar',
      data: { labels: labels, datasets: sets },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111', borderColor: '#C9A84C', borderWidth: 1 } },
        scales: { x: { ticks: { color: '#9a9488', maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: '#9a9488' }, grid: { color: 'rgba(255,255,255,.06)' } } } }
    });
  }
  function renderHabits() {
    var v = $('view'), g = hGoals();
    if (!S.hDay || S.hDay > today()) S.hDay = today();
    var week = hLastDays(7), month = hLastDays(30);
    var h = '<button type="button" class="tk-link hb-back" id="hBack">← Today</button><h1 class="tk-h1">Daily <em>habits</em></h1><p class="tk-sub">Small daily habits drive your results as much as your training. Log them in under a minute: steps from your phone\'s health app, glasses of water, hours of sleep, and how you feel.</p>';
    var a7 = { steps: hAvg(week, 'steps'), water: hAvg(week, 'water'), sleep: hAvg(week, 'sleep') };
    h += '<div class="tk-grid2" style="margin-top:14px"><div class="tk-stat"><b>' + hStreak() + '</b><span>Day streak</span></div><div class="tk-stat"><b>' + (a7.steps != null ? nf(Math.round(a7.steps)) : '–') + '</b><span>Avg steps · 7 days</span></div><div class="tk-stat"><b>' + (a7.sleep != null ? r1(a7.sleep) + ' h' : '–') + '</b><span>Avg sleep · 7 days</span></div><div class="tk-stat"><b>' + (a7.water != null ? r1(a7.water) : '–') + '</b><span>Avg glasses · 7 days</span></div></div>';
    h += '<div class="tk-card"><h2 class="tk-h2" style="margin-top:0">Log a day</h2><div class="chips hb-days" role="group" aria-label="Choose a day">' + week.slice().reverse().map(function (d) { var lg = hLogged(hRow(d)); return '<button type="button" data-hd="' + d + '" aria-pressed="' + (d === S.hDay) + '">' + (d === today() ? 'Today' : fmtDay(d, { weekday: 'short', day: 'numeric' })) + (lg ? ' <span class="hb-dot" aria-label="logged">•</span>' : '') + '</button>'; }).join('') + '</div>' + habitCard(S.hDay, true) + '</div>';
    var withData = month.filter(function (d) { return hLogged(hRow(d)); });
    var lab = month.map(function (d) { return fmtDay(d, { day: 'numeric', month: 'short' }); });
    if (withData.length > 1) {
      h += '<div class="tk-card"><span class="tk-tag">Steps · last 30 days</span><div class="chart-box"><canvas id="hcSteps" role="img" aria-label="Daily steps for the last 30 days with your goal line"></canvas></div><p class="tk-small">Gold bars hit your goal of ' + nf(g.steps) + ' steps.</p></div>';
      h += '<div class="tk-card"><span class="tk-tag">Sleep · last 30 days</span><div class="chart-box"><canvas id="hcSleep" role="img" aria-label="Hours of sleep for the last 30 days with your goal line"></canvas></div></div>';
      h += '<div class="tk-card"><span class="tk-tag">Water · last 30 days</span><div class="chart-box"><canvas id="hcWater" role="img" aria-label="Glasses of water for the last 30 days with your goal line"></canvas></div></div>';
      var fl = hLastDays(14);
      h += '<div class="tk-card"><span class="tk-tag">Mood &amp; energy · last 14 days</span><div class="hb-moodrow">' + fl.map(function (d) { var x = hRow(d) || {}; return '<div class="hb-mday"><span class="hb-memo" aria-label="' + (x.mood ? 'Mood ' + MOODS[x.mood - 1][1] : 'No mood logged') + '">' + (x.mood ? MOODS[x.mood - 1][0] : '·') + '</span><span class="hb-en' + (x.energy ? '' : ' none') + '" style="--e:' + ((x.energy || 0) * 20) + '%" aria-label="' + (x.energy ? 'Energy ' + x.energy + ' of 5' : 'No energy logged') + '"></span><small>' + fmtDay(d, { day: 'numeric' }) + '</small></div>'; }).join('') + '</div><p class="tk-small">Emoji = mood, bar = energy. Look for patterns with your sleep and training days.</p></div>';
    } else h += '<div class="tk-empty">Log a couple of days and your 30-day charts will appear here.</div>';
    h += reminderCard() + badgeWall();
    var notes = (S.habits || []).filter(function (x) { return x.note; }).slice(-10).reverse();
    if (notes.length) h += '<div class="tk-card"><span class="tk-tag">Recent notes</span>' + notes.map(function (x) { return '<div class="li"><div class="grow"><b>' + fmtDay(x.date) + '</b><span class="tk-small">' + esc(x.note) + '</span></div></div>'; }).join('') + '</div>';
    h += '<div class="tk-card"><h2 class="tk-h2" style="margin-top:0">' + (viewingOther() ? esc((S.target.name || 'Client').split(' ')[0]) + '\'s daily goals' : 'Your daily goals') + '</h2><p class="tk-small">' + (viewingOther() ? 'Set targets that suit this client.' : 'Your coach may adjust these for you.') + '</p><div class="tk-grid3"><div class="tk-field"><label for="hgSteps">Steps</label><input class="tk-input" id="hgSteps" inputmode="numeric" value="' + g.steps + '"></div><div class="tk-field"><label for="hgWater">Glasses</label><input class="tk-input" id="hgWater" inputmode="numeric" value="' + g.water + '"></div><div class="tk-field"><label for="hgSleep">Sleep h</label><input class="tk-input" id="hgSleep" inputmode="decimal" value="' + g.sleep + '"></div></div><button type="button" class="tk-btn ghost block" id="hgSave" style="margin-top:12px">Save goals</button></div>';
    v.innerHTML = h;
    wireHabitCard(v); wireReminder();
    $('hBack').onclick = function () { go('today'); };
    v.querySelectorAll('[data-hd]').forEach(function (b) { b.onclick = function () { S.hDay = b.dataset.hd; render(); }; });
    if (withData.length > 1 && window.Chart) {
      S.chart.hs = barChart('hcSteps', lab, month.map(function (d) { var x = hRow(d); return x && x.steps != null ? x.steps : null; }), g.steps, 'Steps');
      S.chart.hz = barChart('hcSleep', lab, month.map(function (d) { var x = hRow(d); return x && x.sleep != null ? +x.sleep : null; }), g.sleep, 'Sleep (h)', 'rgba(143,183,232,.55)');
      S.chart.hw = barChart('hcWater', lab, month.map(function (d) { var x = hRow(d); return x && x.water ? x.water : null; }), g.water, 'Glasses', 'rgba(143,183,232,.55)');
    }
    $('hgSave').onclick = async function () {
      var ng = { steps: parseInt($('hgSteps').value, 10), water: parseInt($('hgWater').value, 10), sleep: num($('hgSleep').value) };
      if (!(ng.steps >= 1000 && ng.steps <= 50000)) return toast('Steps goal should be between 1,000 and 50,000');
      if (!(ng.water >= 1 && ng.water <= 20)) return toast('Water goal should be between 1 and 20 glasses');
      if (!(ng.sleep >= 4 && ng.sleep <= 12)) return toast('Sleep goal should be between 4 and 12 hours');
      ng.sleep = r1(ng.sleep); this.disabled = true;
      var r = await sb.from('profiles').update({ habit_goals: ng }).eq('id', S.target.id);
      if (r.error) { this.disabled = false; return toast('Could not save: ' + r.error.message); }
      S.target.habit_goals = ng; if (S.target.id === S.me.id) S.me.habit_goals = ng;
      toast('Goals saved'); render();
    };
  }

  // ---------- HABIT BADGES ----------
  // [id, emoji, name, how to earn]
  var BADGES = [
    ['streak3', '🔥', '3-day streak', 'Log your habits 3 days in a row'],
    ['streak7', '🔥', '7-day streak', 'Log your habits 7 days in a row'],
    ['streak30', '🏆', '30-day streak', 'Log your habits 30 days in a row'],
    ['streak100', '👑', '100-day streak', 'Log your habits 100 days in a row'],
    ['perfect1', '⭐', 'Perfect day', 'Hit all 3 goals in one day'],
    ['perfect7', '🌟', 'Perfect week', 'Hit all 3 goals 7 days in a row'],
    ['steps10k', '👟', '10K day', 'Walk 10,000 steps in a day'],
    ['steps10k10', '🚶', '10K club', 'Walk 10,000+ steps on 10 days'],
    ['sleep7', '😴', 'Well rested', 'Hit your sleep goal 7 nights in a row'],
    ['water7', '💧', 'Hydrated', 'Hit your water goal 7 days in a row'],
    ['logs50', '📈', '50 days logged', 'Log your habits on 50 different days']
  ];
  // Returns { id: date earned } from the habit history, in date order.
  function badgeDates() {
    var g = hGoals(), rows = (S.habits || []).filter(hLogged), out = {};
    var run = { log: 0, perf: 0, sleep: 0, water: 0 }, cnt = { log: 0, k10: 0 }, prev = null;
    function hit(id, d) { if (!out[id]) out[id] = d; }
    rows.forEach(function (x) {
      var cont = prev && Math.round((parseDay(x.date) - parseDay(prev)) / 864e5) === 1;
      if (!cont) run = { log: 0, perf: 0, sleep: 0, water: 0 };
      run.log++; cnt.log++;
      run.perf = hHits(x, g) === 3 ? run.perf + 1 : 0;
      run.sleep = (+x.sleep || 0) >= g.sleep ? run.sleep + 1 : 0;
      run.water = (x.water || 0) >= g.water ? run.water + 1 : 0;
      if ((x.steps || 0) >= 10000) { cnt.k10++; hit('steps10k', x.date); }
      if (run.log >= 3) hit('streak3', x.date); if (run.log >= 7) hit('streak7', x.date); if (run.log >= 30) hit('streak30', x.date); if (run.log >= 100) hit('streak100', x.date);
      if (run.perf >= 1) hit('perfect1', x.date); if (run.perf >= 7) hit('perfect7', x.date);
      if (cnt.k10 >= 10) hit('steps10k10', x.date);
      if (run.sleep >= 7) hit('sleep7', x.date); if (run.water >= 7) hit('water7', x.date);
      if (cnt.log >= 50) hit('logs50', x.date);
      prev = x.date;
    });
    return out;
  }
  function badgeWall() {
    var got = badgeDates(), n = Object.keys(got).length;
    var h = '<div class="tk-card"><div class="hb-head"><span class="tk-tag">Badges</span><span class="tk-small">' + n + ' of ' + BADGES.length + ' earned</span></div><ul class="bd-grid">';
    BADGES.forEach(function (b) {
      var d = got[b[0]];
      h += '<li class="bd' + (d ? ' on' : '') + '"><span class="bd-ic" aria-hidden="true">' + b[1] + '</span><b>' + b[2] + '</b><small>' + (d ? 'Earned ' + fmtDay(d, { day: 'numeric', month: 'short' }) : esc(b[3])) + '</small>' + (d ? '' : '<span class="sr">Not earned yet</span>') + '</li>';
    });
    return h + '</ul></div>';
  }
  // Celebrate badges earned since last time (own account only, never when a coach is viewing a client).
  function checkBadges() {
    if (viewingOther() || !S.me) return;
    var key = 'mm_badges_' + S.me.id, seen = lsGet(key, null), got = badgeDates();
    if (!seen) { lsSet(key, Object.keys(got)); return; }
    var fresh = BADGES.filter(function (b) { return got[b[0]] && seen.indexOf(b[0]) < 0; });
    if (!fresh.length) return;
    lsSet(key, seen.concat(fresh.map(function (b) { return b[0]; })));
    ev('tracker_badge', { badge: fresh[0][0] });
    if (document.querySelector('.modal')) return;
    var b = fresh[fresh.length - 1];
    var m = modal('New badge!', '<div class="bd-pop"><div class="bd-burst" aria-hidden="true">' + new Array(14).join('<i></i>') + '</div><span class="bd-big" aria-hidden="true">' + b[1] + '</span><h3>' + b[2] + '</h3><p class="tk-muted">' + esc(b[3]) + '. Keep it going!</p>' + (fresh.length > 1 ? '<p class="tk-small">Plus ' + (fresh.length - 1) + ' more. See them all in Habits.</p>' : '') + '<button type="button" class="tk-btn block" id="bdOk">Nice!</button></div>');
    $('bdOk').onclick = function () { m.close(); };
  }

  // ---------- HABIT REMINDER (daily push) ----------
  function reminderCard() {
    if (viewingOther()) return '';
    var r = S.me.habit_reminder || {}, on = !!r.on, hr = +r.hour || 20;
    var opts = [17, 18, 19, 20, 21, 22].map(function (x) { return '<option value="' + x + '"' + (x === hr ? ' selected' : '') + '>' + (x - 12) + ':00 pm</option>'; }).join('');
    var h = '<div class="tk-card' + (on ? '' : ' gold') + '" id="remCard"><h2 class="tk-h2" style="margin-top:0">Daily reminder</h2>';
    if (!pushSupported()) {
      h += isIOS() && !isStandalone()
        ? '<p class="tk-muted">To get a reminder on your iPhone: open this page in Safari, tap <b>Share</b> → <b>Add to Home Screen</b>, then open the tracker from your home screen and turn the reminder on here.</p>'
        : '<p class="tk-muted">This browser can\'t show reminders. Try Chrome or Safari on your phone.</p>';
      return h + '</div>';
    }
    h += '<p class="tk-muted" style="margin-top:4px">' + (on ? 'On. If you haven\'t hit your goals by then, we\'ll send you a nudge on this phone.' : 'Get one gentle nudge a day if you haven\'t logged or hit your goals yet.') + '</p>';
    h += '<div class="tk-field"><label for="remHour">Remind me at</label><select class="tk-select" id="remHour">' + opts + '</select></div>';
    h += '<button type="button" class="tk-btn ' + (on ? 'plain' : '') + ' block" id="remBtn" style="margin-top:12px">' + (on ? 'Turn off reminder' : 'Turn on reminder') + '</button></div>';
    return h;
  }
  function wireReminder() {
    if (!$('remBtn')) return;
    async function save(r) {
      var x = await sb.from('profiles').update({ habit_reminder: r }).eq('id', S.me.id);
      if (x.error) { toast('Could not save: ' + x.error.message); return false; }
      S.me.habit_reminder = r; if (S.target.id === S.me.id) S.target.habit_reminder = r; return true;
    }
    $('remHour').onchange = async function () { var r = S.me.habit_reminder || {}; if (await save({ on: !!r.on, hour: +this.value })) toast('Reminder time saved'); };
    $('remBtn').onclick = async function () {
      var r = S.me.habit_reminder || {}, hr = +$('remHour').value; this.disabled = true;
      if (r.on) { if (await save({ on: false, hour: hr })) toast('Reminder turned off'); render(); return; }
      var ok = await enablePush().catch(function (e) { toast('Could not turn on: ' + (e && e.message || e)); return false; });
      if (ok && await save({ on: true, hour: hr })) { ev('tracker_reminder_on', { hour: hr }); toast('Reminder on. See you at ' + (hr - 12) + ' pm!'); }
      render();
    };
  }

  // Coach hub: clients whose habits slipped this week (vs the week before), so the coach can check in.
  function habitNudges(P, H) {
    var t0 = parseDay(today()), out = [];
    function dAgo(s) { return Math.round((t0 - parseDay(s)) / 864e5); }
    function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
    P.forEach(function (p) {
      var rows = H.filter(function (x) { return x.user_id === p.id; }); if (!rows.length) return;
      var wk = rows.filter(function (x) { return dAgo(x.date) < 7; }), pw = rows.filter(function (x) { return dAgo(x.date) >= 7; });
      var pick = function (a, k) { return a.filter(function (x) { return x[k] != null && +x[k] > 0; }).map(function (x) { return +x[k]; }); };
      var s1 = avg(pick(wk, 'steps')), s0 = avg(pick(pw, 'steps')), z1 = avg(pick(wk, 'sleep')), z0 = avg(pick(pw, 'sleep'));
      var last = rows.map(function (x) { return x.date; }).sort().pop(), gap = dAgo(last), why = [], score = 0;
      if (gap >= 3) { why.push('No habits logged for ' + gap + ' days'); score += gap; }
      if (s1 != null && s0 != null && s1 < s0 * 0.8) { why.push('Steps down ' + Math.round((1 - s1 / s0) * 100) + '% (' + nf(s1) + ' a day vs ' + nf(s0) + ')'); score += 3; }
      if (z1 != null && (z1 < 6 || (z0 != null && z1 < z0 - 1))) { why.push('Sleeping ' + r1(z1) + ' h a night' + (z0 != null ? ' (was ' + r1(z0) + ' h)' : '')); score += 2; }
      var lowMood = pick(wk, 'mood').filter(function (m) { return m <= 2; }).length;
      if (lowMood >= 3) { why.push('Low mood on ' + lowMood + ' days this week'); score += 2; }
      if (why.length) out.push({ id: p.id, name: p.name || p.email, why: why, score: score });
    });
    return out.sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
  }
  // ---------- PROGRESS ----------
  function renderProgress() {
    var v = $('view'), W = S.workouts;
    var month = today().slice(0, 7), vol = 0; W.forEach(function (w) { vol += workoutVolume(w); });
    var h = '<h1 class="tk-h1">Strength <em>progress</em></h1>';
    h += '<div class="tk-grid2" style="margin-top:14px"><div class="tk-stat"><b>' + W.length + '</b><span>Workouts</span></div><div class="tk-stat"><b>' + W.filter(function (w) { return w.date.slice(0, 7) === month; }).length + '</b><span>This month</span></div><div class="tk-stat"><b>' + weekStreak() + '</b><span>Week streak</span></div><div class="tk-stat"><b>' + (vol >= 1e6 ? r1(vol / 1e6) + 'M' : vol >= 1e4 ? Math.round(vol / 1e3) + 'k' : nf(vol)) + '</b><span>Kg lifted</span></div></div>';
    var wk = weekKey(today()), kW = 0, kM = 0, anyK = false;
    W.forEach(function (w) { var k = kcalOf(w); if (k == null) return; anyK = true; if (weekKey(w.date) === wk) kW += k; if (w.date.slice(0, 7) === month) kM += k; });
    h += anyK ? '<div class="tk-grid2" style="margin-top:12px"><div class="tk-stat"><b>' + nf(kW) + '</b><span>🔥 Kcal burnt this week</span></div><div class="tk-stat"><b>' + nf(kM) + '</b><span>🔥 Kcal burnt this month</span></div></div>' : (W.length ? '<p class="tk-small" style="margin-top:10px">🔥 Log your body weight in the Body tab to see calories burnt in your workouts.</p>' : '');
    var freq = {}; W.forEach(function (w) { (w.exercises || []).forEach(function (e) { var t = e.type || typeOf(e.name); if (t === 'w' || t === 'b') freq[e.name] = (freq[e.name] || 0) + 1; }); });
    var names = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; });
    if (!names.length) { h += '<div class="tk-empty">Log a few workouts and your strength charts and personal records will appear here.</div>'; v.innerHTML = h; return; }
    if (!S.progEx || names.indexOf(S.progEx) < 0) S.progEx = names[0];
    h += '<div class="tk-card"><div class="tk-field" style="margin-top:0"><label for="pEx">Exercise</label><select class="tk-select" id="pEx">' + names.map(function (n) { return '<option' + (n === S.progEx ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>';
    var pts = [];
    W.slice().reverse().forEach(function (w) {
      var best = 0, top = 0, reps = 0, sm = null;
      (w.exercises || []).forEach(function (e) { if (e.name !== S.progEx) return; (e.sets || []).forEach(function (s) { var a = num(s.w) || 0, r = num(s.r) || 0; best = Math.max(best, e1rm(a, r)); top = Math.max(top, a); reps = Math.max(reps, r); sm = sm == null ? a : Math.max(sm, a); }); });
      if (best || top || reps) pts.push({ d: w.date, e1: r1(best), top: top, reps: reps, sm: sm || 0 });
    });
    var t = typeOf(S.progEx), assistMode = t === 'b' && pts.some(function (p) { return p.sm < 0; }) && !pts.some(function (p) { return p.top > 0; }), useReps = t === 'b' && !assistMode && !pts.some(function (p) { return p.top > 0; });
    var b = bests(S.progEx);
    if (assistMode) h += '<div class="tk-grid2" style="margin-top:10px"><div class="tk-stat"><b>' + Math.abs(b.wmax || 0) + '</b><span>Least assistance (kg)</span></div><div class="tk-stat"><b>' + b.r + '</b><span>Best reps</span></div></div>';
    else h += '<div class="tk-grid2" style="margin-top:10px"><div class="tk-stat"><b>' + (useReps ? b.r : b.w) + '</b><span>' + (useReps ? 'Best reps' : 'Heaviest (kg)') + '</span></div><div class="tk-stat"><b>' + (useReps ? pts.length : r1(b.e1) || '–') + '</b><span>' + (useReps ? 'Sessions' : 'Est. 1-rep max') + '</span></div></div>';
    h += '<div class="chart-box"><canvas id="pChart" role="img" aria-label="' + esc(S.progEx) + ' progress over time"></canvas></div><p class="tk-small">' + (assistMode ? 'Assistance used on the best set each session. Lower means stronger: the goal is zero.' : useReps ? 'Most reps in a set per session.' : 'Est. 1-rep max uses your best set each session (weight × reps), so you can compare sessions with different rep ranges.') + '</p></div>';
    h += '<div class="tk-card"><span class="tk-tag">Personal records</span>';
    names.slice(0, 25).forEach(function (n) {
      var bb = bests(n), tt = typeOf(n);
      if (!bb.set && !bb.r) return;
      if (tt === 'b' && bb.wset) { bb.set = bb.wset; bb.date = bb.wdate; }
      h += '<div class="li"><div class="grow"><b>' + esc(n) + '</b><span class="tk-small">' + (bb.set ? esc(setLabel(bb.set, tt)) + (tt === 'w' ? ' · est. 1RM ' + r1(bb.e1) + 'kg' : '') : bb.r + ' reps') + (bb.date ? ' · ' + fmtDay(bb.date, { day: 'numeric', month: 'short' }) : '') + '</span></div></div>';
    });
    h += '</div>';
    v.innerHTML = h;
    $('pEx').onchange = function () { S.progEx = this.value; render(); };
    if (pts.length && window.Chart) {
      var labels = pts.map(function (p) { return fmtDay(p.d, { day: 'numeric', month: 'short' }); });
      S.chart.p = assistMode ? lineChart('pChart', labels, [{ label: 'Assistance (kg)', data: pts.map(function (p) { return Math.abs(p.sm); }) }, { label: 'Reps', data: pts.map(function (p) { return p.reps; }) }]) : useReps ? lineChart('pChart', labels, [{ label: 'Reps', data: pts.map(function (p) { return p.reps; }) }]) : lineChart('pChart', labels, [{ label: 'Est. 1RM (kg)', data: pts.map(function (p) { return p.e1; }) }, { label: 'Top weight (kg)', data: pts.map(function (p) { return p.top; }) }]);
    }
  }

  // ---------- HISTORY ----------
  function renderHistory() {
    var v = $('view'); if (!S.cal) S.cal = today().slice(0, 7);
    var y = +S.cal.slice(0, 4), mo = +S.cal.slice(5, 7) - 1, first = new Date(y, mo, 1), daysIn = new Date(y, mo + 1, 0).getDate(), pad = (first.getDay() + 6) % 7;
    var byDay = {}; S.workouts.forEach(function (w) { (byDay[w.date] = byDay[w.date] || []).push(w); });
    var monthCount = S.workouts.filter(function (w) { return w.date.slice(0, 7) === S.cal; }).length;
    var h = '<h1 class="tk-h1">Training <em>history</em></h1>';
    h += '<div class="tk-card"><div class="tk-row"><button type="button" class="tk-icon-btn" id="cPrev" aria-label="Previous month">‹</button><div style="flex:1;text-align:center"><b>' + first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + '</b><div class="tk-small">' + monthCount + ' workout' + (monthCount === 1 ? '' : 's') + ' · ' + weekStreak() + ' week streak</div></div><button type="button" class="tk-icon-btn" id="cNext" aria-label="Next month">›</button></div><div class="cal">';
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(function (d) { h += '<div class="dow" aria-hidden="true">' + d + '</div>'; });
    for (var i = 0; i < pad; i++) h += '<button type="button" class="pad" tabindex="-1" aria-hidden="true"></button>';
    for (var dd = 1; dd <= daysIn; dd++) {
      var ds = S.cal + '-' + ('0' + dd).slice(-2), has = byDay[ds];
      h += '<button type="button" class="' + (has ? 'has' : '') + (ds === today() ? ' today' : '') + '" data-day="' + ds + '"' + (S.calDay === ds ? ' aria-pressed="true"' : '') + ' aria-label="' + fmtDay(ds) + (has ? ', ' + has.length + ' workout' : '') + '">' + dd + (has ? '<i></i>' : '') + '</button>';
    }
    h += '</div>' + (S.calDay ? '<button type="button" class="tk-link" id="cAll">Show all workouts</button>' : '') + '</div>';
    var list = S.calDay ? (byDay[S.calDay] || []) : S.workouts.slice(0, 50);
    h += '<div class="tk-card"><span class="tk-tag">' + (S.calDay ? fmtDay(S.calDay) : 'Recent workouts') + '</span>';
    if (!list.length) h += '<div class="tk-empty">' + (S.calDay ? 'No workout on this day.' : 'No workouts yet. Your first one starts on the Today tab.') + '</div>';
    list.forEach(function (w) {
      var sets = 0; (w.exercises || []).forEach(function (e) { sets += (e.sets || []).length; });
      var prs = 0; (w.exercises || []).forEach(function (e) { (e.sets || []).forEach(function (s) { if (s.pr) prs++; }); });
      h += '<details class="wk"><summary><div style="flex:1;min-width:0"><b>' + esc(w.title || 'Workout') + '</b><span class="tk-small" style="display:block">' + fmtDay(w.date) + ' · ' + (w.exercises || []).length + ' exercises · ' + sets + ' sets' + (w.duration_min ? ' · ' + w.duration_min + ' min' : '') + (kcalOf(w) ? ' · ' + kcalLabel(w) : '') + '</span></div>' + (prs ? '<span class="pill gold">' + prs + ' PR</span>' : '') + '</summary><div class="wk-body">';
      (w.exercises || []).forEach(function (e) { var t = e.type || typeOf(e.name); h += '<p><b>' + esc(e.name) + '</b>: ' + (e.sets || []).map(function (s) { return esc(setLabel(s, t)) + (s.pr ? ' ★' : ''); }).join(', ') + '</p>'; });
      if (w.notes) h += '<p><b>Notes:</b> ' + esc(w.notes) + '</p>';
      h += kcalBox(w);
      h += '<button type="button" class="tk-btn sm danger" data-delw="' + w.id + '" style="margin-top:8px">Delete workout</button></div></details>';
    });
    h += '</div>';
    v.innerHTML = h;
    wireKcal(v, render);
    $('cPrev').onclick = function () { var d = new Date(y, mo - 1, 1); S.cal = iso(d).slice(0, 7); S.calDay = null; render(); };
    $('cNext').onclick = function () { var d = new Date(y, mo + 1, 1); S.cal = iso(d).slice(0, 7); S.calDay = null; render(); };
    if ($('cAll')) $('cAll').onclick = function () { S.calDay = null; render(); };
    v.querySelectorAll('[data-day]').forEach(function (b) { b.onclick = function () { S.calDay = S.calDay === b.dataset.day ? null : b.dataset.day; render(); }; });
    v.querySelectorAll('[data-delw]').forEach(function (b) {
      b.onclick = async function () {
        if (!confirmBox('Delete this workout permanently?')) return;
        var r = await sb.from('workouts').delete().eq('id', b.dataset.delw); if (r.error) return toast(r.error.message);
        S.workouts = S.workouts.filter(function (w) { return w.id !== b.dataset.delw; }); toast('Workout deleted'); render();
      };
    });
  }

  // ---------- COACH: CLIENTS ----------
  async function renderClients() {
    var v = $('view');
    v.innerHTML = '<h1 class="tk-h1">Your <em>clients</em></h1><p class="tk-sub">Everyone who signed in to the tracker. Tap a client to see their workouts, weight and programme, or to log today\'s session for them.</p><div class="tk-empty">Loading clients…</div>';
    var since = new Date(); since.setDate(since.getDate() - 120);
    var q = await Promise.all([
      sb.from('profiles').select('*').neq('id', S.me.id).order('created_at', { ascending: false }),
      sb.from('workouts').select('user_id,date').gte('date', iso(since)).order('date', { ascending: false }).limit(5000),
      sb.from('body_logs').select('user_id,date,weight').not('weight', 'is', null).order('date', { ascending: true }).limit(5000),
      sb.from('programs').select('client_id,active')
    ]);
    if (S.tab !== 'clients') return;
    var ALL = q[0].data || [], P = ALL.filter(function (p) { return !p.archived; }), GONE = ALL.filter(function (p) { return p.archived; }), W = q[1].data || [], B = q[2].data || [], PR = q[3].data || [], edit = false;
    var m30 = new Date(); m30.setDate(m30.getDate() - 30); var c30 = iso(m30);
    var rows = P.map(function (p) {
      var w = W.filter(function (x) { return x.user_id === p.id; }), b = B.filter(function (x) { return x.user_id === p.id; });
      return { p: p, last: w[0] ? w[0].date : null, n30: w.filter(function (x) { return x.date >= c30; }).length, w0: b[0], w1: b[b.length - 1], prog: PR.some(function (x) { return x.client_id === p.id && x.active; }) };
    });
    var h = '<h1 class="tk-h1">Your <em>clients</em></h1><p class="tk-sub">Everyone who signed in to the tracker. Tap a client to see their workouts, weight and programme, or to log today\'s session for them.</p>';
    h += '<div class="tk-grid3" style="margin-top:14px"><div class="tk-stat"><b>' + P.length + '</b><span>Clients</span></div><div class="tk-stat"><b>' + rows.filter(function (r) { return r.last && r.last >= iso(new Date(Date.now() - 7 * 864e5)); }).length + '</b><span>Trained 7 days</span></div><div class="tk-stat"><b>' + rows.filter(function (r) { return !r.prog; }).length + '</b><span>Need a plan</span></div></div>';
    h += '<button type="button" class="tk-btn block" id="cAdd" style="margin-top:12px">+ Add client</button>';
    h += '<div class="tk-field"><label for="cQ" class="sr">Search clients</label><input class="tk-input" id="cQ" type="search" placeholder="Search by name or email"></div><div class="tk-row" style="justify-content:flex-end;margin:4px 0 8px"><button type="button" class="tk-btn sm ghost" id="cEdit">Edit list</button></div><div class="tk-card" id="cList"></div><div id="cGone"></div>';
    v.innerHTML = h;
    function draw(ql) {
      var html = rows.filter(function (r) { return !ql || ((r.p.name || '') + ' ' + r.p.email).toLowerCase().indexOf(ql) > -1; }).map(function (r) {
        var age = r.last ? Math.round((parseDay(today()) - parseDay(r.last)) / 864e5) : null;
        var pill = r.last == null ? '<span class="pill">No workouts</span>' : '<span class="pill ' + (age <= 7 ? 'ok' : age <= 14 ? 'gold' : 'warn') + '">' + daysAgo(r.last) + '</span>';
        var wt = r.w1 ? r.w1.weight + 'kg' + (r.w0 && r.w0 !== r.w1 ? ' (' + (r1(r.w1.weight - r.w0.weight) > 0 ? '+' : '') + r1(r.w1.weight - r.w0.weight) + ')' : '') : 'no weight yet';
        if (edit) return '<div class="pick-item" style="cursor:default">' + avatarHtml(r.p, 36) + '<div style="min-width:0;margin-left:10px"><b>' + esc(r.p.name || r.p.email) + '</b><span>' + esc(r.p.email) + '</span></div><button type="button" class="tk-btn sm ghost" data-remove="' + r.p.id + '" style="margin-left:auto">Remove</button></div>';
        return '<button type="button" class="pick-item" data-client="' + r.p.id + '">' + avatarHtml(r.p, 36) + '<div style="min-width:0;margin-left:10px"><b>' + esc(r.p.name || r.p.email) + (r.p.role === 'coach' ? ' <span class="pill gold">Coach</span>' : '') + '</b><span>' + esc(r.p.email) + ' · ' + r.n30 + ' workouts in 30 days · ' + wt + (r.prog ? '' : ' · no programme') + '</span></div><span style="margin-left:auto">' + pill + '</span></button>';
      }).join('');
      $('cList').innerHTML = html || '<div class="tk-empty">' + (P.length ? 'No match.' : 'No clients yet. Send them the tracker link and ask them to sign in with Google: mrandmrslifestyle.com/workout-tracker.html') + '</div>';
      $('cList').querySelectorAll('[data-client]').forEach(function (b) { b.onclick = function () { openClient(P.filter(function (p) { return p.id === b.dataset.client; })[0]); }; });
      $('cList').querySelectorAll('[data-remove]').forEach(function (b) { b.onclick = async function () {
        var c = P.filter(function (p) { return p.id === b.dataset.remove; })[0]; if (!c) return;
        if (!confirmBox('Remove ' + (c.name || c.email) + '? Their history is kept and you can restore them.')) return;
        b.disabled = true;
        var r = await sb.from('profiles').update({ archived: true }).eq('id', c.id);
        if (r.error) { b.disabled = false; return toast(r.error.message); }
        if (lsGet('mm_target', null) === c.id) lsSet('mm_target', null);
        toast((c.name || c.email) + ' removed'); renderClients();
      }; });
      var g = $('cGone'); if (!g) return;
      g.innerHTML = GONE.length ? '<details style="margin-top:16px"><summary class="tk-small" style="cursor:pointer">Removed clients (' + GONE.length + ')</summary><div class="tk-card" style="margin-top:8px">' + GONE.map(function (p) { return '<div class="pick-item" style="cursor:default">' + avatarHtml(p, 32) + '<div style="min-width:0;margin-left:10px"><b>' + esc(p.name || p.email) + '</b><span>' + esc(p.email) + '</span></div><button type="button" class="tk-btn sm" data-restore="' + p.id + '" style="margin-left:auto">Restore</button></div>'; }).join('') + '</div></details>' : '';
      g.querySelectorAll('[data-restore]').forEach(function (b) { b.onclick = async function () {
        b.disabled = true; var r = await sb.from('profiles').update({ archived: false }).eq('id', b.dataset.restore);
        if (r.error) { b.disabled = false; return toast(r.error.message); }
        toast('Client restored'); renderClients();
      }; });
    }
    $('cEdit').onclick = function () { edit = !edit; this.textContent = edit ? 'Done' : 'Edit list'; draw(($('cQ').value || '').toLowerCase().trim()); };
    $('cAdd').onclick = openAddClient;
    $('cQ').oninput = function () { draw(this.value.toLowerCase().trim()); };
    draw('');
  }
  async function openClient(p) { S.target = p; lsSet('mm_target', p.id); S.tab = 'today'; ev('tracker_coach_open_client'); $('view').innerHTML = '<div class="tk-empty">Loading…</div>'; await loadTarget(); window.scrollTo(0, 0); }

  // ---------- COACH HUB (home, workouts library, exercise library, menu, profile, invites) ----------
  var SITE = 'https://www.mrandmrslifestyle.com/workout-tracker.html';
  var COACH_TABS = ['hub', 'clients', 'workouts', 'exercises', 'menu'];
  var SELF_TABS = ['today', 'plan', 'body', 'progress', 'history'];
  function soon(what) { toast(what + ' is coming soon'); }
  function firstName(p) { return ((p && (p.name || p.email)) || '').split(/[ @]/)[0]; }
  function avatarHtml(p, size) {
    size = size || 40;
    if (p && p.avatar_url) return '<img class="tk-ava" src="' + esc(p.avatar_url) + '" alt="" width="' + size + '" height="' + size + '" style="width:' + size + 'px;height:' + size + 'px">';
    return '<span class="tk-ava tk-ava-i" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.4) + 'px" aria-hidden="true">' + esc((firstName(p)[0] || '?').toUpperCase()) + '</span>';
  }
  function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

  // ---------- website leads (saved by track.js from every website form) ----------
  var LEAD_ST = [['new', 'New'], ['contacted', 'Contacted'], ['won', 'Client'], ['lost', 'Not now']];
  async function leadsBanner() {
    try {
      var r = await sb.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new');
      var n = r && r.count; var el = $('leadsBanner'); if (!el || !n) return;
      el.innerHTML = '<button type="button" class="tk-card gold" id="lbOpen" style="display:block;width:100%;text-align:start;cursor:pointer"><div class="li"><div class="grow"><b>' + n + ' new website lead' + (n === 1 ? '' : 's') + '</b><span class="tk-small">Tap to see who enquired and follow up.</span></div>' + ICON.inbox + '</div></button>';
      $('lbOpen').onclick = openLeads;
    } catch (e) {}
  }
  async function openLeads() {
    var filter = 'new', rows = [];
    var m = modal('Website leads', '<div class="chips" role="group" aria-label="Filter leads" id="ldF">' + [['new', 'New']].concat(LEAD_ST.slice(1)).concat([['all', 'All']]).map(function (x, i) { return '<button type="button" aria-pressed="' + (i ? 'false' : 'true') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div id="ldList"><p class="tk-muted">Loading leads…</p></div><button type="button" class="tk-btn sm ghost" id="ldCsv" style="margin-top:14px">Download all as CSV</button>');
    var r = await sb.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
    if (r.error) { $('ldList').innerHTML = '<p class="tk-muted">Could not load leads: ' + esc(r.error.message) + '</p>'; return; }
    rows = r.data || [];
    function when(t) { var d = new Date(t); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
    function draw() {
      var list = rows.filter(function (x) { return filter === 'all' || x.status === filter; });
      if (!list.length) { $('ldList').innerHTML = '<div class="tk-empty">' + (filter === 'new' ? 'No new leads. New website enquiries and sign-ups appear here.' : 'Nothing here yet.') + '</div>'; return; }
      $('ldList').innerHTML = list.map(function (x) {
        var d = x.data || {}, ph = (x.phone || '').replace(/[^\d]/g, '');
        var extra = [d.goal, d.package, d.calories ? d.calories + ' kcal target' : '', d.message].filter(Boolean).map(function (t) { return esc(String(t).slice(0, 200)); }).join(' · ');
        return '<div class="tk-card" style="margin-top:10px"><div class="tk-row" style="justify-content:space-between;align-items:flex-start;gap:10px"><div style="min-width:0"><b>' + esc(x.name || 'No name') + '</b><div class="tk-small">' + when(x.created_at) + (x.language === 'ar' ? ' · Arabic' : '') + '</div></div>' +
          '<select class="tk-input" data-st="' + x.id + '" aria-label="Lead status" style="width:auto;padding:6px 8px">' + LEAD_ST.map(function (s) { return '<option value="' + s[0] + '"' + (x.status === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>' +
          '<p class="tk-small" style="margin:8px 0 0">' + esc(x.source || x.subject || x.form || '') + (x.page ? ' · <span style="opacity:.7">' + esc(x.page) + '</span>' : '') + '</p>' +
          (extra ? '<p class="tk-small" style="margin:6px 0 0">' + extra + '</p>' : '') +
          '<div class="tk-grid2" style="margin-top:10px">' + (x.email ? '<a class="tk-btn sm" href="mailto:' + esc(x.email) + '">Email</a>' : '') + (ph ? '<a class="tk-btn sm" href="https://wa.me/' + ph + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</div>' +
          (x.email ? '<p class="tk-small" style="margin:6px 0 0;opacity:.7">' + esc(x.email) + (x.phone ? ' · ' + esc(x.phone) : '') + '</p>' : '') + '</div>';
      }).join('');
      $('ldList').querySelectorAll('[data-st]').forEach(function (sel) { sel.onchange = async function () {
        var id = sel.dataset.st, v = sel.value;
        var u = await sb.from('leads').update({ status: v }).eq('id', id);
        if (u.error) return toast(u.error.message);
        rows.forEach(function (x) { if (x.id === id) x.status = v; }); toast('Saved'); draw(); leadsBanner();
      }; });
    }
    $('ldF').querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { $('ldF').querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); filter = b.dataset.f; draw(); }; });
    $('ldCsv').onclick = function () {
      var cols = ['created_at', 'status', 'name', 'email', 'phone', 'source', 'subject', 'page', 'language'];
      var q = function (v) { v = v == null ? '' : String(v); return '"' + v.replace(/"/g, '""') + '"'; };
      var csv = cols.join(',') + ',details\n' + rows.map(function (x) { return cols.map(function (c) { return q(x[c]); }).join(',') + ',' + q(JSON.stringify(x.data || {})); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'website-leads.csv'; a.click();
    };
    draw();
  }

  async function renderHub() {
    var v = $('view');
    var head = '<h1 class="tk-h1">' + greet() + ', <em>' + esc(firstName(S.me)) + '</em></h1>';
    var tiles = '<div class="hub-tiles">' +
      '<button type="button" class="hub-tile" id="hAdd"><span>Add client</span>' + ICON.addUser + '</button>' +
      '<button type="button" class="hub-tile" id="hStart"><span>Start a workout</span>' + ICON.today + '</button>' +
      '<button type="button" class="hub-tile soon" id="hBook"><span>Book an activity<small>Coming soon</small></span>' + ICON.cal + '</button>' +
      '<button type="button" class="hub-tile soon" id="hChat"><span>Start chat<small>Coming soon</small></span>' + ICON.chat + '</button></div>';
    v.innerHTML = head + tiles + '<div id="leadsBanner"></div><div class="tk-empty">Loading your day…</div>';
    wireTiles();
    leadsBanner();
    var since = new Date(); since.setDate(since.getDate() - 7);
    var q = await Promise.all([
      sb.from('profiles').select('id,name,email,avatar_url').neq('id', S.me.id).eq('archived', false),
      sb.from('workouts').select('user_id,date,title,duration_min,created_at').gte('date', iso(since)).order('created_at', { ascending: false }).limit(500),
      sb.from('programs').select('client_id,active'),
      sb.from('live_workouts').select('user_id,data,updated_at').neq('user_id', S.me.id),
      sb.from('client_invites').select('*').is('accepted_at', null).order('created_at', { ascending: false }),
      sb.from('habit_logs').select('user_id,date,steps,sleep,mood').neq('user_id', S.me.id).gte('date', iso(new Date(Date.now() - 14 * 864e5))).limit(5000)
    ]);
    if (S.tab !== 'hub') return;
    var P = q[0].data || [], W = q[1].data || [], PR = q[2].data || [], L = q[3].data || [], I = q[4].data || [], HL = q[5].data || [];
    function nm(id) { var p = P.filter(function (x) { return x.id === id; })[0]; return p ? (p.name || p.email) : 'A client'; }
    var trained = {}; W.forEach(function (w) { trained[w.user_id] = 1; });
    var noPlan = P.filter(function (p) { return !PR.some(function (x) { return x.client_id === p.id && x.active; }); }).length;
    var h = head + tiles + '<div id="leadsBanner"></div>';
    h += '<div class="tk-grid3" style="margin-top:14px"><button type="button" class="tk-stat hub-stat" data-go="clients"><b>' + P.length + '</b><span>Clients</span></button><button type="button" class="tk-stat hub-stat" data-go="clients"><b>' + Object.keys(trained).length + '</b><span>Trained 7 days</span></button><button type="button" class="tk-stat hub-stat" data-go="clients"><b>' + noPlan + '</b><span>Need a plan</span></button></div>';
    var now = L.filter(function (x) { return x.data && x.data.exercises && (Date.now() - new Date(x.updated_at).getTime()) < 3 * 3600e3; });
    h += '<h2 class="tk-h2 hub-h">Training now</h2><div class="tk-card">';
    if (!now.length) h += '<p class="tk-muted" style="margin:0">No one is training right now.</p>';
    now.forEach(function (x) {
      var mins = x.data.started ? Math.max(0, Math.round((Date.now() - x.data.started) / 60000)) : null;
      h += '<button type="button" class="pick-item" data-client="' + x.user_id + '"><div style="min-width:0"><b>' + esc(nm(x.user_id)) + '</b><span>' + esc(x.data.title || 'Workout') + ' · ' + (x.data.exercises || []).length + ' exercises' + (mins != null ? ' · ' + mins + ' min' : '') + '</span></div><span class="pill ok" style="margin-left:auto">Live</span></button>';
    });
    h += '</div>';
    var td = W.filter(function (w) { return w.date === today(); });
    h += '<h2 class="tk-h2 hub-h">Today\'s workouts</h2><div class="tk-card">';
    if (!td.length) h += '<p class="tk-muted" style="margin:0">No finished workouts yet today.</p>';
    td.forEach(function (w) { h += '<button type="button" class="pick-item" data-client="' + w.user_id + '" data-hist="1"><div style="min-width:0"><b>' + esc(nm(w.user_id)) + '</b><span>' + esc(w.title || 'Workout') + (w.duration_min ? ' · ' + w.duration_min + ' min' : '') + ' · ' + esc(timeAgo(w.created_at)) + '</span></div><span class="pill gold" style="margin-left:auto">Done</span></button>'; });
    h += '</div>';
    if (HL.length) {
      var nd = habitNudges(P, HL);
      h += '<h2 class="tk-h2 hub-h">Needs a nudge</h2><div class="tk-card">';
      if (!nd.length) h += '<p class="tk-muted" style="margin:0">Everyone logging habits is on track this week. 👏</p>';
      else h += '<p class="tk-small" style="margin:0 0 6px">Habits slipped this week compared with last week. A quick message now goes a long way.</p>';
      nd.forEach(function (x) { h += '<button type="button" class="pick-item" data-client="' + x.id + '" data-habits="1"><div style="min-width:0"><b>' + esc(x.name) + '</b><span>' + esc(x.why.join(' · ')) + '</span></div><span aria-hidden="true">›</span></button>'; });
      h += '</div>';
    }
    if (I.length) {
      h += '<h2 class="tk-h2 hub-h">Invited, not joined yet</h2><div class="tk-card">';
      I.forEach(function (x) { h += '<div class="tk-row" style="padding:8px 0;border-bottom:1px solid var(--line)"><div style="flex:1;min-width:0"><b>' + esc(x.name || x.email) + '</b><div class="tk-small">' + esc(x.email) + ' · invited ' + esc(timeAgo(x.created_at)) + '</div></div><button type="button" class="tk-btn sm ghost" data-resend="' + x.id + '">Resend</button><button type="button" class="tk-icon-btn" data-uninv="' + x.id + '" aria-label="Cancel invite for ' + esc(x.name || x.email) + '">' + ICON.x + '</button></div>'; });
      h += '</div>';
    }
    v.innerHTML = h;
    wireTiles();
    leadsBanner();
    v.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
    v.querySelectorAll('[data-client]').forEach(function (b) { b.onclick = async function () { var p = await sb.from('profiles').select('*').eq('id', b.dataset.client).maybeSingle(); if (!p.data) return toast('Client not found'); await openClient(p.data); if (b.dataset.habits) { S.tab = 'habits'; render(); return; } if (b.dataset.hist) { S.tab = 'history'; render(); } }; });
    v.querySelectorAll('[data-resend]').forEach(function (b) { b.onclick = function () { var x = I.filter(function (y) { return y.id === b.dataset.resend; })[0]; shareInvite(x); }; });
    v.querySelectorAll('[data-uninv]').forEach(function (b) { b.onclick = async function () { if (!confirmBox('Cancel this invite?')) return; var r = await sb.from('client_invites').delete().eq('id', b.dataset.uninv); if (r.error) return toast(r.error.message); toast('Invite cancelled'); renderHub(); }; });
  }
  function wireTiles() {
    if ($('hAdd')) $('hAdd').onclick = openAddClient;
    if ($('hStart')) $('hStart').onclick = openStartWorkout;
    if ($('hBook')) $('hBook').onclick = function () { soon('Booking'); };
    if ($('hChat')) $('hChat').onclick = function () { soon('Chat'); };
  }
  function go(tab) { S.tab = tab; render(); window.scrollTo(0, 0); }

  async function openStartWorkout() {
    var m = modal('Start a workout', '<button type="button" class="tk-btn block" id="swMe">For myself</button><p class="tk-small" style="margin:14px 0 6px">Or log a session with a client:</p><div class="tk-field"><label for="swQ" class="sr">Search clients</label><input class="tk-input" id="swQ" type="search" placeholder="Search by name or email"></div><div id="swList"><p class="tk-muted">Loading…</p></div>');
    $('swMe').onclick = async function () { m.close(); if (viewingOther()) { S.target = S.me; lsSet('mm_target', null); await loadTarget(); } go('today'); };
    var r = await sb.from('profiles').select('*').neq('id', S.me.id).order('name');
    var C = r.data || [];
    function draw() {
      var ql = ($('swQ').value || '').toLowerCase();
      $('swList').innerHTML = C.filter(function (c) { return !ql || ((c.name || '') + ' ' + c.email).toLowerCase().indexOf(ql) > -1; }).map(function (c) { return '<button type="button" class="pick-item" data-c="' + c.id + '">' + avatarHtml(c, 34) + '<div style="min-width:0;margin-left:10px"><b>' + esc(c.name || c.email) + '</b><span>' + esc(c.email) + '</span></div></button>'; }).join('') || '<div class="tk-empty">No clients found.</div>';
      $('swList').querySelectorAll('[data-c]').forEach(function (b) { b.onclick = async function () { m.close(); await openClient(C.filter(function (c) { return c.id === b.dataset.c; })[0]); }; });
    }
    $('swQ').oninput = draw; draw();
  }

  async function openAddClient() {
    var list = S.templates || await loadTemplates() || [];
    var m = modal('Add a client', '<p class="tk-muted">They sign in with Google using this email. Their name and programme are ready the moment they join.</p>' +
      '<div class="tk-field"><label for="iName">Client name</label><input class="tk-input" id="iName" autocomplete="off" placeholder="e.g. Sara Ahmed"></div>' +
      '<div class="tk-field"><label for="iEmail">Google email</label><input class="tk-input" id="iEmail" type="email" autocomplete="off" placeholder="name@gmail.com"></div>' +
      '<div class="tk-field"><label for="iTpl">Programme (optional)</label><select class="tk-select" id="iTpl"><option value="">No programme yet</option>' + list.map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="tk-grid2" style="margin-top:16px"><button type="button" class="tk-btn plain" data-close>Cancel</button><button type="button" class="tk-btn" id="iSave">Create invite</button></div>');
    $('iSave').onclick = async function () {
      var name = $('iName').value.trim(), email = $('iEmail').value.trim().toLowerCase(), tpl = $('iTpl').value || null;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Enter a valid email'); return $('iEmail').focus(); }
      var btn = this; btn.disabled = true;
      var ex = await sb.from('profiles').select('*').eq('email', email).maybeSingle();
      if (ex.data) {
        btn.disabled = false;
        if (tpl) {
          var t = list.filter(function (x) { return x.id === tpl; })[0];
          if (!confirmBox((ex.data.name || email) + ' is already a client. Assign "' + t.name + '" to them now?')) return;
          var other = await sb.from('programs').select('id').eq('client_id', ex.data.id).eq('active', true);
          var r1 = await sb.from('programs').insert({ client_id: ex.data.id, created_by: S.me.id, template_id: t.id, name: t.name, notes: t.notes || null, days: JSON.parse(JSON.stringify(t.days || [])), active: true }).select('id').single();
          if (r1.error) return toast(r1.error.message);
          var ids = (other.data || []).map(function (x) { return x.id; }); if (ids.length) await sb.from('programs').update({ active: false }).in('id', ids);
          toast('Programme assigned to ' + (ex.data.name || email));
        } else toast((ex.data.name || email) + ' is already a client');
        m.close(); return openClient(ex.data);
      }
      var old = await sb.from('client_invites').select('id').eq('email', email).is('accepted_at', null).maybeSingle();
      var row = { email: email, name: name || null, template_id: tpl, created_by: S.me.id };
      var r = old.data ? await sb.from('client_invites').update(row).eq('id', old.data.id).select().single() : await sb.from('client_invites').insert(row).select().single();
      btn.disabled = false;
      if (r.error) return toast('Could not create the invite: ' + r.error.message);
      ev('tracker_client_invited', { with_programme: !!tpl });
      m.close(); shareInvite(r.data); if (S.tab === 'hub') renderHub();
    };
  }
  function inviteText(x) {
    return 'Hi ' + (x.name ? x.name.split(' ')[0] : 'there') + ', I\'ve set up your training in the Mr & Mrs Lifestyle app' + (x.template_id ? ', and your programme is ready' : '') + '.\n\n1. Open ' + SITE + '\n2. Tap "Continue with Google" and sign in with ' + x.email + '\n3. Add it to your home screen so it works like an app\n\nSee you in there! ' + firstName(S.me);
  }
  function shareInvite(x) {
    var txt = inviteText(x);
    var m = modal('Send the invite', '<p class="tk-muted">Send this to ' + esc(x.name || x.email) + '. They must sign in with <b>' + esc(x.email) + '</b>.</p><div class="tk-card" style="white-space:pre-wrap;font-size:.9rem">' + esc(txt) + '</div>' +
      '<div class="tk-grid2" style="margin-top:14px"><button type="button" class="tk-btn plain" id="ivCopy">Copy message</button><a class="tk-btn" id="ivWa" href="https://wa.me/?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener">Send on WhatsApp</a></div>');
    $('ivCopy').onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Copied'); }, function () { toast('Could not copy. Select the text and copy it.'); }); };
    $('ivWa').onclick = function () { ev('tracker_invite_whatsapp'); setTimeout(function () { m.close(); }, 300); };
  }

  async function renderWorkouts() {
    var v = $('view');
    v.innerHTML = '<h1 class="tk-h1">Workout <em>templates</em></h1><p class="tk-sub">Your saved programmes. Assign one to any client in two taps.</p><div class="tk-grid2" style="margin-top:12px"><button type="button" class="tk-btn" id="wNew">+ New template</button><button type="button" class="tk-btn plain" id="wFrom">Save a client\'s programme</button></div><div id="wList"><div class="tk-empty">Loading…</div></div>';
    $('wNew').onclick = function () { openBuilder(null, null, true); };
    $('wFrom').onclick = function () { toast('Open the client, go to their Plan tab and tap "Save as template"'); go('clients'); };
    var list = await loadTemplates(); if (S.tab !== 'workouts' || !list) return;
    var ar = await sb.from('programs').select('client_id,active,template_id').not('template_id', 'is', null);
    var cr = await sb.from('profiles').select('id,name,email').neq('id', S.me.id).eq('archived', false);
    var A = ar.data || [], C = cr.data || [];
    var h = list.length ? '' : '<div class="tk-empty">No templates yet. Tap <b>+ New template</b>, or save a client\'s programme from their Plan tab.</div>';
    list.forEach(function (t) {
      var who = A.filter(function (x) { return x.template_id === t.id && x.active; }).map(function (x) { var c = C.filter(function (y) { return y.id === x.client_id; })[0]; return c ? (c.name || c.email) : null; }).filter(Boolean);
      h += '<div class="tk-card"><h2 class="tk-h2" style="margin:0 0 4px">' + esc(t.name) + '</h2><p class="tk-small">' + (t.days || []).length + ' days · ' + tplCount(t) + ' exercises</p>' +
        '<p class="tk-muted" style="margin:6px 0 6px">' + (t.days || []).map(function (d) { return esc(d.name || 'Day'); }).join(' · ') + '</p>' +
        '<p class="tk-small" style="margin:0 0 10px">' + (who.length ? 'Assigned to: <b>' + who.map(esc).join(', ') + '</b>' : 'Not assigned to anyone yet') + '</p>' +
        '<div class="tk-grid3"><button type="button" class="tk-btn plain sm" data-wedit="' + t.id + '">Edit</button><button type="button" class="tk-btn danger sm" data-wdel="' + t.id + '">Delete</button><button type="button" class="tk-btn sm" data-wuse="' + t.id + '">Assign</button></div></div>';
    });
    $('wList').innerHTML = h;
    function T(id) { return list.filter(function (x) { return x.id === id; })[0]; }
    v.querySelectorAll('[data-wuse]').forEach(function (b) { b.onclick = function () { openAssign(T(b.dataset.wuse)); }; });
    v.querySelectorAll('[data-wedit]').forEach(function (b) { b.onclick = function () { openBuilder(T(b.dataset.wedit), null, true); }; });
    v.querySelectorAll('[data-wdel]').forEach(function (b) { b.onclick = async function () {
      var t = T(b.dataset.wdel); if (!confirmBox('Delete the template "' + t.name + '"? Programmes already assigned to clients are not affected.')) return;
      var r = await sb.from('program_templates').delete().eq('id', t.id); if (r.error) return toast(r.error.message);
      S.templates = null; toast('Template deleted'); renderWorkouts();
    }; });
  }

  function renderExercises() {
    var v = $('view'); S.exCat = S.exCat || 'All'; S.exQ = S.exQ || '';
    var withVid = EX.filter(function (e) { return vidsFor(e.name).length; }).length;
    v.innerHTML = '<h1 class="tk-h1">Exercise <em>library</em></h1><p class="tk-sub">' + EX.length + ' exercises, ' + withVid + ' with your own demo videos. Tap one to watch it.</p>' +
      '<div class="tk-field"><label class="sr" for="xQ">Search exercises</label><input class="tk-input" id="xQ" type="search" placeholder="Search exercises" value="' + esc(S.exQ) + '"></div>' +
      '<div class="chips" role="group" aria-label="Filter by muscle group">' + ['All', 'With video'].concat(CATS).map(function (c) { return '<button type="button" aria-pressed="' + (S.exCat === c) + '" data-xc="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div><div class="tk-card" id="xList"></div>';
    function draw() {
      var ql = S.exQ.toLowerCase().trim();
      var items = EX.filter(function (e) { return (S.exCat === 'All' || (S.exCat === 'With video' ? vidsFor(e.name).length : e.cat === S.exCat)) && (!ql || (e.name + ' ' + e.m + ' ' + e.cat).toLowerCase().indexOf(ql) > -1); });
      $('xList').innerHTML = items.slice(0, 200).map(function (e) { return '<button type="button" class="pick-item" data-xn="' + esc(e.name) + '"><div><b>' + esc(e.name) + (vidsFor(e.name).length ? ' <span class="pill gold vid-pill">▶ Video</span>' : '') + '</b><span>' + esc(e.cat) + ' · ' + esc(e.m) + '</span></div></button>'; }).join('') || '<div class="tk-empty">No match.</div>';
      $('xList').querySelectorAll('[data-xn]').forEach(function (b) { b.onclick = function () { openExercise(b.dataset.xn); }; });
    }
    $('xQ').oninput = function () { S.exQ = this.value; draw(); };
    v.querySelectorAll('[data-xc]').forEach(function (b) { b.onclick = function () { S.exCat = b.dataset.xc; v.querySelectorAll('[data-xc]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); draw(); }; });
    draw();
  }
  function openExercise(name) {
    var e = EX.filter(function (x) { return x.name === name; })[0] || { name: name };
    var m = modal(name, '<p class="tk-small">' + esc([e.cat, e.m].filter(Boolean).join(' · ')) + '</p>' + videoBox(name, 'lib|' + name) + (e.how ? '<p class="tk-muted" style="margin-top:10px">' + esc(e.how) + '</p>' : '') + (vidsFor(name).length ? '' : '<p class="tk-small" style="margin-top:10px">No demo video for this exercise yet.</p>'));
    var box = m.querySelector('[data-vbox]'); if (box) { wireVideos(m); playVideo(box, vidsFor(name)[0][0]); ev('tracker_video_play'); }
  }

  function renderMenu() {
    var v = $('view');
    function item(id, icon, label, sub, isSoon) { return '<button type="button" class="menu-item' + (isSoon ? ' soon' : '') + '" data-m="' + id + '">' + icon + '<span><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + (isSoon ? '<span class="pill">Soon</span>' : '<span aria-hidden="true" class="menu-arrow">›</span>') + '</button>'; }
    var h = '<div class="menu-me">' + avatarHtml(S.me, 56) + '<div style="flex:1;min-width:0"><b>' + esc(S.me.name || S.me.email) + '</b><div class="tk-small">Coach · ' + esc(S.me.email) + '</div></div><button type="button" class="tk-btn sm ghost" id="mProf">Edit profile</button></div>';
    h += '<h2 class="tk-h2 hub-h">Coaching</h2><div class="menu">' +
      item('hub', ICON.hub, 'Hub', 'Your day at a glance') + item('clients', ICON.clients, 'Clients', 'Everyone you coach') + item('addclient', ICON.addUser, 'Add a client', 'Invite by email or WhatsApp') +
      item('workouts', ICON.plan, 'Workouts', 'Templates you assign') + item('exercises', ICON.today, 'Exercises', 'Library with your videos') + item('notifs', ICON.bell, 'Notifications', 'Workouts started and finished') + item('leads', ICON.inbox, 'Website leads', 'Enquiries, guide downloads and calculator sign-ups') + '</div>';
    h += '<h2 class="tk-h2 hub-h">My training</h2><div class="menu">' + item('today', ICON.today, 'Today', '') + item('plan', ICON.plan, 'My programme', '') + item('body', ICON.body, 'Body', 'Weight and measurements') + item('habits', ICON.check, 'Habits', 'Steps, water, sleep, mood') + item('progress', ICON.progress, 'Progress', '') + item('history', ICON.history, 'History', '') + '</div>';
    h += '<h2 class="tk-h2 hub-h">Coming soon</h2><div class="menu">' + item('s', ICON.chat, 'Chat', 'Message your clients', 1) + item('s', ICON.checkin, 'Check-ins', 'Weekly progress forms and photos', 1) + item('s', ICON.food, 'Nutrition', 'Meal plans and macros', 1) + item('s', ICON.cal, 'Calendar', 'Sessions and bookings', 1) + item('s', ICON.info, 'Resources', 'Guides and files for clients', 1) + item('s', ICON.money, 'Financials', 'Payments and renewals', 1) + '</div>';
    h += '<div class="menu" style="margin-top:18px">' + item('settings', ICON.gear, 'Settings', 'Rest timer, sign out') + '<a class="menu-item" href="https://wa.me/971507871515" target="_blank" rel="noopener">' + ICON.info + '<span><b>Support</b><small>Something not working? Tell us</small></span><span aria-hidden="true" class="menu-arrow">›</span></a></div>';
    v.innerHTML = h;
    $('mProf').onclick = openProfile;
    v.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () {
      var k = b.dataset.m;
      if (k === 's') return soon(b.querySelector('b').textContent);
      if (k === 'addclient') return openAddClient();
      if (k === 'notifs') return openNotifs();
      if (k === 'leads') return openLeads();
      if (k === 'settings') return openSettings();
      go(k);
    }; });
  }

  function openProfile() {
    var me = S.me;
    var m = modal('Your profile', '<div class="tk-row" style="gap:14px">' + '<span id="pAva">' + avatarHtml(me, 72) + '</span><div><label class="tk-btn sm ghost" for="pFile" style="cursor:pointer">Change photo</label><input type="file" id="pFile" accept="image/*" class="sr"><p class="tk-small" style="margin:6px 0 0">Your clients see this photo.</p></div></div>' +
      '<div class="tk-field"><label for="pName">Name</label><input class="tk-input" id="pName" value="' + esc(me.name || '') + '"></div>' +
      (isCoach() ? '<div class="tk-field"><label for="pBio">About you (shown to clients)</label><textarea class="tk-textarea" id="pBio" placeholder="e.g. Certified PT and nutrition coach. 10+ years helping clients build strength.">' + esc(me.bio || '') + '</textarea></div>' +
      '<div class="tk-field"><label for="pPhone">WhatsApp number</label><input class="tk-input" id="pPhone" inputmode="tel" placeholder="+971 50 000 0000" value="' + esc(me.phone || '') + '"></div>' +
      '<div class="tk-field"><label for="pIg">Instagram</label><input class="tk-input" id="pIg" placeholder="@yourhandle" value="' + esc(me.instagram || '') + '"></div>' : '') +
      '<button type="button" class="tk-btn block" id="pSave" style="margin-top:14px">Save</button>');
    var newUrl = null;
    $('pFile').onchange = async function () {
      var f = this.files && this.files[0]; if (!f) return;
      if (f.size > 8e6) return toast('Please choose a photo under 8 MB');
      toast('Uploading…');
      try {
        var blob = await shrinkImage(f, 512);
        var path = me.id + '/avatar-' + Date.now() + '.jpg';
        var up = await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (up.error) return toast('Upload failed: ' + up.error.message);
        newUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
        $('pAva').innerHTML = avatarHtml({ avatar_url: newUrl }, 72); toast('Photo ready. Tap Save.');
      } catch (e) { toast('Could not read that photo'); }
    };
    $('pSave').onclick = async function () {
      var row = { name: $('pName').value.trim() || null };
      if (isCoach()) { row.bio = $('pBio').value.trim() || null; row.phone = $('pPhone').value.trim() || null; row.instagram = $('pIg').value.trim().replace(/^@/, '') || null; }
      if (newUrl) row.avatar_url = newUrl;
      var r = await sb.from('profiles').update(row).eq('id', me.id).select().single();
      if (r.error) return toast(r.error.message);
      S.me = r.data; if (!viewingOther()) S.target = r.data; m.close(); render(); toast('Profile saved');
    };
  }
  function shrinkImage(file, max) {
    return new Promise(function (ok, bad) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s);
        var side = Math.min(w, h), c = document.createElement('canvas'); c.width = c.height = Math.min(side, max);
        var sx = (img.width - Math.min(img.width, img.height)) / 2, sy = (img.height - Math.min(img.width, img.height)) / 2, sz = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, sx, sy, sz, sz, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); c.toBlob(function (b) { b ? ok(b) : bad(); }, 'image/jpeg', 0.86);
      };
      img.onerror = bad; img.src = url;
    });
  }

  // client side: "Your coach" card
  var COACHES = null;
  async function coachCard() {
    if (isCoach()) return '';
    if (!COACHES) { var r = await sb.from('profiles').select('id,name,avatar_url,bio,phone,instagram').eq('role', 'coach'); COACHES = r.data || []; }
    var c = COACHES.filter(function (x) { return x.name || x.bio; })[0]; if (!c) return '';
    var wa = (c.phone || '').replace(/[^\d]/g, '');
    return '<div class="tk-card coach-card"><span class="tk-tag">Your coach</span><div class="tk-row" style="gap:12px;margin-top:8px">' + avatarHtml(c, 56) + '<div style="flex:1;min-width:0"><b>' + esc(c.name || 'Coach') + '</b>' + (c.bio ? '<p class="tk-small" style="margin:4px 0 0">' + esc(c.bio) + '</p>' : '') + '</div></div>' +
      ((wa || c.instagram) ? '<div class="tk-grid2" style="margin-top:12px">' + (wa ? '<a class="tk-btn sm" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + (c.instagram ? '<a class="tk-btn sm plain" href="https://www.instagram.com/' + encodeURIComponent(c.instagram) + '/" target="_blank" rel="noopener">Instagram</a>' : '') + '</div>' : '') + '</div>';
  }

  // ---------- settings ----------
  function openSettings() {
    var me = S.me;
    var body = '<div class="tk-field"><label for="sName">Your name</label><input class="tk-input" id="sName" value="' + esc(me.name || '') + '"></div>' +
      '<div class="tk-field"><label for="sGoal">Your goal</label><input class="tk-input" id="sGoal" value="' + esc(me.goal || '') + '" placeholder="e.g. lose 8 kg before summer"></div>' +
      '<div class="tk-field"><label for="sRest">Default rest between sets (seconds)</label><input class="tk-input" id="sRest" inputmode="numeric" value="' + lsGet('mm_rest', 90) + '"></div>' +
      '<button type="button" class="tk-btn block" id="sSave" style="margin-top:14px">Save</button>' +
      '<button type="button" class="tk-btn plain block" id="sProf" style="margin-top:10px">Profile photo' + (isCoach() ? ' and coach info' : '') + '</button>' +
      '<div class="tk-card"><b>Add the tracker to your home screen</b><p class="tk-muted" style="margin-top:4px">iPhone: open this page in Safari, tap Share, then "Add to Home Screen".<br>Android: open the Chrome menu (⋮), then "Install app" or "Add to Home screen".</p></div>' +
      '<p class="tk-small" style="margin-top:12px">Signed in as ' + esc(me.email) + '</p><button type="button" class="tk-btn danger block" id="sOut" style="margin-top:8px">Sign out</button>';
    var m = modal('Settings', body);
    $('sSave').onclick = async function () {
      var rest = parseInt($('sRest').value, 10); if (rest > 0 && rest < 900) lsSet('mm_rest', rest);
      var r = await sb.from('profiles').update({ name: $('sName').value.trim() || null, goal: $('sGoal').value.trim() || null }).eq('id', me.id).select().single();
      if (r.error) return toast(r.error.message);
      S.me = r.data; if (!viewingOther()) S.target = r.data; m.close(); render(); toast('Saved');
    };
    $('sOut').onclick = signOut;
    $('sProf').onclick = function () { m.close(); openProfile(); };
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('gear').innerHTML = ICON.gear; $('gear').onclick = function () { if (S.me) openSettings(); };
    boot();
  });
  setInterval(function () { if (S.draft && S.tab === 'today' && !document.querySelector('.modal') && document.activeElement && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { var el = document.querySelector('.tk-row.tk-small span:nth-child(2)'); if (el) el.textContent = '· ' + Math.max(0, Math.round((Date.now() - S.draft.started) / 60000)) + ' min'; } }, 30000);
})();
