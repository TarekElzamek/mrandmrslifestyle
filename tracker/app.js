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
  var VIDS = window.MM_VIDEOS || {};
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

  var S = { user: null, me: null, target: null, tab: 'today', programs: [], workouts: [], body: [], clients: null, draft: null, cal: null, calDay: null, chart: {}, progEx: null, rest: null };

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
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
  };

  // ---------- auth ----------
  function showLanding() { $('landing').hidden = false; $('app').hidden = true; }
  async function signInGoogle() {
    ev('tracker_signin_click');
    var r = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (r.error) toast('Sign-in failed: ' + r.error.message);
  }
  async function signOut() { await sb.auth.signOut(); location.reload(); }

  async function boot() {
    document.querySelectorAll('[data-google]').forEach(function (b) { b.addEventListener('click', signInGoogle); });
    var res = await sb.auth.getSession();
    var session = res.data && res.data.session;
    sb.auth.onAuthStateChange(function (e, s) { if (e === 'SIGNED_OUT') showLanding(); if (e === 'SIGNED_IN' && !S.user && s) start(s.user); });
    if (session) start(session.user); else showLanding();
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
    S.target = me;
    if (isCoach() && saved && saved !== me.id) {
      var t = await sb.from('profiles').select('*').eq('id', saved).maybeSingle();
      if (t.data) S.target = t.data;
    }
    S.tab = isCoach() && !viewingOther() ? 'clients' : 'today';
    ev('tracker_open', { role: me.role });
    await loadTarget();
  }

  async function loadTarget() {
    var id = S.target.id;
    var q = await Promise.all([
      sb.from('programs').select('*').eq('client_id', id).order('updated_at', { ascending: false }),
      sb.from('workouts').select('*').eq('user_id', id).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
      sb.from('body_logs').select('*').eq('user_id', id).order('date', { ascending: true }).limit(1000)
    ]);
    S.programs = q[0].data || []; S.workouts = q[1].data || []; S.body = q[2].data || [];
    S.draft = lsGet('mm_draft_' + id, null);
    S.progEx = null; S.calDay = null;
    if (S.draft && S.tab !== 'clients') S.tab = 'today';
    render();
  }

  // ---------- history-derived data ----------
  function lastPerformance(name) {
    for (var i = 0; i < S.workouts.length; i++) {
      var w = S.workouts[i]; var ex = (w.exercises || []).filter(function (e) { return e.name === name; })[0];
      if (ex && ex.sets && ex.sets.length) return { date: w.date, sets: ex.sets };
    }
    return null;
  }
  function bests(name) {
    var b = { e1: 0, w: 0, r: 0, set: null, date: null };
    S.workouts.forEach(function (wk) {
      (wk.exercises || []).forEach(function (e) {
        if (e.name !== name) return;
        (e.sets || []).forEach(function (s) {
          var w = num(s.w) || 0, r = num(s.r) || 0, x = e1rm(w, r);
          if (x > b.e1) { b.e1 = x; b.set = s; b.date = wk.date; }
          if (w > b.w) b.w = w; if (r > b.r) b.r = r;
        });
      });
    });
    return b;
  }
  function setLabel(s, type) {
    var w = num(s.w), r = num(s.r);
    if (type === 't') return (r || 0) + 's';
    if (type === 'c') return (r || 0) + ' min' + (w ? ' · ' + w + ' km' : '');
    if (type === 'b') return (w ? '+' + w + 'kg × ' : '') + (r || 0);
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
    $('who').innerHTML = '<b>' + esc(who.name || who.email) + '</b>' + (isCoach() ? 'Coach' : 'Mr &amp; Mrs Lifestyle');
    var cb = $('coachbar');
    if (viewingOther()) { cb.hidden = false; cb.innerHTML = 'Coaching: ' + esc(S.target.name || S.target.email) + '<button type="button" id="backClients">Back to clients</button>'; $('backClients').onclick = backToClients; }
    else cb.hidden = true;
    var tabs = [['today', 'Today'], ['plan', 'Plan'], ['body', 'Body'], ['progress', 'Progress'], ['history', 'History']];
    if (isCoach()) tabs.push(['clients', 'Clients']);
    $('nav').innerHTML = tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + ICON[t[0]] + t[1] + '</button>'; }).join('');
    $('nav').querySelectorAll('button').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }; });
    Object.keys(S.chart).forEach(function (k) { try { S.chart[k].destroy(); } catch (e) {} delete S.chart[k]; });
    ({ today: renderToday, plan: renderPlan, body: renderBody, progress: renderProgress, history: renderHistory, clients: renderClients })[S.tab]();
  }

  async function backToClients() { S.target = S.me; lsSet('mm_target', null); S.tab = 'clients'; await loadTarget(); }

  // ---------- TODAY ----------
  function renderToday() {
    if (S.draft) return renderWorkout();
    var v = $('view'), name = (S.target.name || '').split(' ')[0];
    var prog = S.programs.filter(function (p) { return p.active; })[0];
    var lastW = S.workouts[0], lastB = S.body[S.body.length - 1];
    var h = '<h1 class="tk-h1">' + (viewingOther() ? esc(S.target.name || 'Client') + '\'s <em>training</em>' : 'Hi ' + esc(name || 'there') + ', ready to <em>train?</em>') + '</h1>';
    h += '<div class="tk-grid3" style="margin-top:14px"><div class="tk-stat"><b>' + thisWeekCount() + '</b><span>This week</span></div><div class="tk-stat"><b>' + weekStreak() + '</b><span>Week streak</span></div><div class="tk-stat"><b>' + S.workouts.length + '</b><span>Workouts</span></div></div>';
    if (prog && (prog.days || []).length) {
      h += '<div class="tk-card gold"><span class="tk-tag">Your programme</span><h2 class="tk-h2" style="margin:4px 0 6px">' + esc(prog.name) + '</h2>' + (prog.notes ? '<p class="tk-muted">' + esc(prog.notes) + '</p>' : '');
      prog.days.forEach(function (d, i) {
        h += '<div class="li"><div class="grow"><b>' + esc(d.name || 'Day ' + (i + 1)) + '</b><span class="tk-small">' + (d.exercises || []).length + ' exercises · ' + esc((d.exercises || []).slice(0, 3).map(function (e) { return e.name; }).join(', ')) + ((d.exercises || []).length > 3 ? '…' : '') + '</span></div><button type="button" class="tk-btn sm" data-startday="' + i + '">Start</button></div>';
      });
      h += '</div>';
    } else if (!viewingOther()) {
      h += '<div class="tk-card"><b>No programme yet</b><p class="tk-muted" style="margin-top:4px">Training with Tarek or Chloe? Your coach will add your programme here. You can also build your own in the Plan tab.</p></div>';
    }
    h += '<div class="tk-row" style="margin-top:14px"><button type="button" class="tk-btn ghost block" id="startEmpty">Start an empty workout</button></div>';
    if (lastW) h += '<div class="tk-card"><span class="tk-tag">Last workout</span><div class="li"><div class="grow"><b>' + esc(lastW.title || 'Workout') + '</b><span class="tk-small">' + fmtDay(lastW.date) + ' · ' + (lastW.exercises || []).length + ' exercises' + (lastW.duration_min ? ' · ' + lastW.duration_min + ' min' : '') + '</span></div></div></div>';
    h += '<div class="tk-card"><span class="tk-tag">Body weight</span><div class="li"><div class="grow"><b>' + (lastB && lastB.weight ? lastB.weight + ' kg' : 'Not logged yet') + '</b><span class="tk-small">' + (lastB ? 'Last logged ' + daysAgo(lastB.date) : 'Track your weight weekly for the clearest trend') + '</span></div><button type="button" class="tk-btn sm plain" id="goBody">Log</button></div></div>';
    v.innerHTML = h;
    v.querySelectorAll('[data-startday]').forEach(function (b) { b.onclick = function () { startDraft(prog, +b.dataset.startday); }; });
    $('startEmpty').onclick = function () { startDraft(null); };
    $('goBody').onclick = function () { S.tab = 'body'; render(); };
  }

  function startDraft(prog, dayIdx) {
    var d = { started: Date.now(), date: today(), title: 'Workout', programId: null, exercises: [], notes: '' };
    if (prog) {
      var day = prog.days[dayIdx]; d.title = day.name || prog.name; d.programId = prog.id;
      (day.exercises || []).forEach(function (pe) { d.exercises.push(newDraftEx(pe.name, pe)); });
    }
    S.draft = d; saveDraft(); ev('tracker_workout_start', { from_programme: !!prog }); render(); window.scrollTo(0, 0);
  }
  function newDraftEx(name, target) {
    var info = EXMAP[name] || { cat: 'Custom', type: 'w', how: '' };
    var n = target && parseInt(target.sets, 10) > 0 ? parseInt(target.sets, 10) : 3;
    var sets = []; for (var i = 0; i < n; i++) sets.push({ w: '', r: '', done: false });
    return { name: name, cat: info.cat, type: info.type, target: target ? { sets: target.sets, reps: target.reps, rest: target.rest, notes: target.notes } : null, sets: sets };
  }
  function saveDraft() { lsSet('mm_draft_' + S.target.id, S.draft); }

  function fieldsFor(type) {
    if (type === 't') return [null, ['r', 'Sec']];
    if (type === 'c') return [['r', 'Min'], ['w', 'Km']];
    if (type === 'b') return [['w', '+kg'], ['r', 'Reps']];
    return [['w', 'Kg'], ['r', 'Reps']];
  }

  function renderWorkout() {
    var d = S.draft, v = $('view');
    var mins = Math.max(0, Math.round((Date.now() - d.started) / 60000));
    var h = '<div class="tk-row"><div class="grow" style="flex:1"><label class="sr" for="wTitle">Workout name</label><input class="tk-input" id="wTitle" value="' + esc(d.title) + '" style="font-weight:700;font-size:1.1rem"></div></div>';
    h += '<div class="tk-row tk-small" style="margin-top:6px"><span>' + fmtDay(d.date) + '</span><span>· ' + mins + ' min</span>' + (viewingOther() ? '<span class="pill gold">Logging for ' + esc(S.target.name || 'client') + '</span>' : '') + '</div>';
    d.exercises.forEach(function (ex, xi) {
      var info = EXMAP[ex.name] || {}, last = lastPerformance(ex.name), f = fieldsFor(ex.type);
      h += '<section class="ex" aria-label="' + esc(ex.name) + '"><div class="ex-head"><div><h3>' + esc(ex.name) + '</h3><div class="tk-small">' + esc(info.m || ex.cat || '') + (last ? ' · last ' + daysAgo(last.date) : '') + '</div></div><div class="ex-act">' +
        (info.how || vidsFor(ex.name).length ? '<button type="button" class="tk-icon-btn' + (vidsFor(ex.name).length ? ' has-vid' : '') + '" data-how="' + xi + '" aria-label="' + (vidsFor(ex.name).length ? 'Watch demo of ' : 'How to do ') + esc(ex.name) + '">' + (vidsFor(ex.name).length ? ICON_PLAY : ICON.info) + '</button>' : '') +
        '<button type="button" class="tk-icon-btn" data-rmex="' + xi + '" aria-label="Remove ' + esc(ex.name) + '">' + ICON.trash + '</button></div></div>';
      h += '<div class="ex-how" id="how' + xi + '" hidden>' + videoBox(ex.name, xi + '|' + ex.name) + (info.how ? '<p>' + esc(info.how) + '</p>' : '') + '</div>';
      if (ex.target) h += '<div class="ex-target">Target: ' + esc(ex.target.sets || '') + ' × ' + esc(ex.target.reps || '') + (ex.target.rest ? ' · rest ' + esc(ex.target.rest) + 's' : '') + (ex.target.notes ? ' · ' + esc(ex.target.notes) : '') + '</div>';
      h += '<table class="sets"><thead><tr><th scope="col">Set</th><th scope="col">Last</th>' + (f[0] ? '<th scope="col">' + f[0][1] + '</th>' : '') + '<th scope="col">' + f[1][1] + '</th><th scope="col"><span class="sr">Done</span></th></tr></thead><tbody>';
      ex.sets.forEach(function (s, si) {
        var p = last && last.sets[si];
        h += '<tr class="' + (s.done ? 'done' : '') + '"><td>' + (si + 1) + (s.pr ? '<span class="pr-badge">PR</span>' : '') + '</td><td class="prev">' + (p ? esc(setLabel(p, ex.type)) : '–') + '</td>';
        f.forEach(function (fd) {
          if (!fd) return;
          var ph = p ? (num(p[fd[0]]) != null ? p[fd[0]] : '') : '';
          h += '<td><input inputmode="decimal" aria-label="Set ' + (si + 1) + ' ' + fd[1] + '" data-x="' + xi + '" data-s="' + si + '" data-f="' + fd[0] + '" value="' + esc(s[fd[0]]) + '" placeholder="' + esc(ph) + '"></td>';
        });
        h += '<td><button type="button" class="chk" data-done="' + xi + ',' + si + '" aria-pressed="' + (s.done ? 'true' : 'false') + '" aria-label="Mark set ' + (si + 1) + ' done">' + ICON.check + '</button></td></tr>';
      });
      h += '</tbody></table><div class="ex-foot"><button type="button" class="tk-btn sm plain" data-addset="' + xi + '">+ Add set</button>' + (ex.sets.length > 1 ? '<button type="button" class="tk-btn sm plain" data-rmset="' + xi + '">Remove last set</button>' : '') + '</div></section>';
    });
    h += '<button type="button" class="tk-btn ghost block" id="addEx" style="margin-top:14px">+ Add exercise</button>';
    h += '<div class="tk-field"><label for="wNotes">Notes (how it felt, energy, anything for your coach)</label><textarea class="tk-textarea" id="wNotes">' + esc(d.notes) + '</textarea></div>';
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
    v.querySelectorAll('[data-rmex]').forEach(function (b) { b.onclick = function () { if (confirmBox('Remove ' + d.exercises[+b.dataset.rmex].name + ' from this workout?')) { d.exercises.splice(+b.dataset.rmex, 1); saveDraft(); render(); } }; });
    v.querySelectorAll('[data-addset]').forEach(function (b) { b.onclick = function () { var ex = d.exercises[+b.dataset.addset], l = ex.sets[ex.sets.length - 1] || {}; ex.sets.push({ w: l.w || '', r: '', done: false }); saveDraft(); render(); }; });
    v.querySelectorAll('[data-rmset]').forEach(function (b) { b.onclick = function () { d.exercises[+b.dataset.rmset].sets.pop(); saveDraft(); render(); }; });
    $('addEx').onclick = function () { openPicker(function (name) { d.exercises.push(newDraftEx(name, null)); saveDraft(); render(); setTimeout(function () { var all = document.querySelectorAll('.ex'); if (all.length) all[all.length - 1].scrollIntoView({ block: 'center' }); }, 30); }); };
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
      fieldsFor(ex.type).forEach(function (fd) { if (fd && (s[fd[0]] === '' || s[fd[0]] == null) && p && p[fd[0]] != null && p[fd[0]] !== '') s[fd[0]] = String(p[fd[0]]); });
      if (num(s.r) == null || num(s.r) <= 0) { toast('Enter ' + (ex.type === 't' ? 'the seconds' : ex.type === 'c' ? 'the minutes' : 'your reps') + ' first'); return; }
      s.done = true;
      s.pr = false;
      if (ex.type === 'w' || ex.type === 'b') {
        var b = bests(ex.name), w = num(s.w) || 0, r = num(s.r) || 0;
        var prior = lastPerformance(ex.name);
        var isPr = !!prior && ((ex.type === 'w' && b.e1 > 0 && e1rm(w, r) > b.e1 + 0.01) || (ex.type === 'b' && (w > b.w || (w === b.w && r > b.r))));
        var already = ex.sets.some(function (o, i) { return i !== si && o.pr; });
        if (isPr && !already) { s.pr = true; toast('New personal record! ' + ex.name + ' ' + setLabel(s, ex.type), true); confetti(); ev('tracker_pr', { exercise: ex.name }); }
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
      return { name: e.name, cat: e.cat, type: e.type, sets: e.sets.filter(function (s) { return s.done || num(s.r) != null; }).map(function (s) { var o = { w: num(s.w), r: num(s.r) }; if (s.pr) o.pr = true; return o; }) };
    }).filter(function (e) { return e.sets.length; });
    if (!exs.length) { toast('Log at least one set before finishing'); return; }
    $('finish').disabled = true;
    var prs = 0; exs.forEach(function (e) { e.sets.forEach(function (s) { if (s.pr) prs++; }); });
    var row = { user_id: S.target.id, date: d.date, title: d.title || 'Workout', program_id: d.programId, exercises: exs, duration_min: Math.max(1, Math.round((Date.now() - d.started) / 60000)), notes: d.notes || null };
    var r = await sb.from('workouts').insert(row).select().single();
    if (r.error) { $('finish').disabled = false; toast('Could not save: ' + r.error.message); return; }
    stopRest(); S.draft = null; saveDraft(); S.workouts.unshift(r.data);
    ev('tracker_workout_saved', { exercises: exs.length, prs: prs, coach_logged: viewingOther() });
    summaryModal(r.data, prs);
    render();
  }

  function summaryModal(w, prs) {
    var sets = 0; (w.exercises || []).forEach(function (e) { sets += e.sets.length; });
    var vol = workoutVolume(w);
    var text = w.title + ' done! ' + (w.exercises || []).length + ' exercises, ' + sets + ' sets' + (vol ? ', ' + nf(vol) + ' kg lifted' : '') + (prs ? ', ' + prs + ' new PR' + (prs > 1 ? 's' : '') : '') + ' in ' + w.duration_min + ' min. Tracked with Mr & Mrs Lifestyle.';
    var body = '<div style="text-align:center"><div class="tk-h1">Workout <em>saved</em></div><p class="tk-muted">' + fmtDay(w.date) + '</p></div><div class="tk-grid2" style="margin-top:14px"><div class="tk-stat"><b>' + w.duration_min + '</b><span>Minutes</span></div><div class="tk-stat"><b>' + sets + '</b><span>Sets</span></div><div class="tk-stat"><b>' + (vol ? nf(vol) : '–') + '</b><span>Kg lifted</span></div><div class="tk-stat"><b>' + prs + '</b><span>New PRs</span></div></div>' +
      '<div class="tk-grid2" style="margin-top:16px"><button type="button" class="tk-btn ghost" id="shareW">Share</button><button type="button" class="tk-btn" data-close>Done</button></div>';
    var m = modal('Great work', body);
    $('shareW').onclick = function () {
      if (navigator.share) navigator.share({ title: 'My workout', text: text, url: 'https://www.mrandmrslifestyle.com/workout-tracker.html' }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied. Paste it anywhere to share.'); });
    };
    if (prs) confetti();
    return m;
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
      var html = items.slice(0, 120).map(function (e) { return '<button type="button" class="pick-item" data-n="' + esc(e.name) + '"><div><b>' + esc(e.name) + (vidsFor(e.name).length ? ' <span class="pill gold vid-pill">▶ Video</span>' : '') + '</b><span>' + esc(e.cat) + ' · ' + esc(e.m) + '</span></div><span class="plus" aria-hidden="true">+</span></button>'; }).join('');
      if (ql && !EXMAP[q.trim()]) html += '<button type="button" class="pick-item" data-n="' + esc(q.trim()) + '" data-custom="1"><div><b>Add "' + esc(q.trim()) + '"</b><span>Custom exercise</span></div><span class="plus" aria-hidden="true">+</span></button>';
      if (!html) html = '<div class="tk-empty">No exercises found</div>';
      $('pkList').innerHTML = html;
      $('pkList').querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { m.close(); onPick(b.dataset.n); }; });
    }
    $('pkQ').oninput = function () { q = this.value; list(); };
    m.querySelectorAll('.chips button').forEach(function (b) { b.onclick = function () { m.querySelectorAll('.chips button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); cat = b.dataset.c; list(); }; });
    list(); $('pkQ').focus();
  }

  // ---------- PLAN ----------
  function canEditProgram(p) { return isCoach() || (p.client_id === S.me.id && p.created_by === S.me.id); }
  function renderPlan() {
    var v = $('view');
    var h = '<h1 class="tk-h1">' + (viewingOther() ? esc(S.target.name || 'Client') + '\'s <em>programmes</em>' : 'Your <em>programme</em>') + '</h1>';
    h += '<p class="tk-sub">' + (isCoach() ? 'Build a programme with training days, sets, reps and rest. The client sees it straight away and taps Start at the gym.' : 'Follow the plan your coach builds for you, or create your own routine.') + '</p>';
    h += '<button type="button" class="tk-btn block" id="newProg" style="margin-top:14px">+ New programme</button>';
    if (!S.programs.length) h += '<div class="tk-empty">No programmes yet.</div>';
    S.programs.forEach(function (p) {
      h += '<div class="tk-card' + (p.active ? ' gold' : '') + '"><div class="tk-row"><div style="flex:1"><span class="tk-tag">' + (p.active ? 'Active' : 'Archived') + '</span><h2 class="tk-h2" style="margin:2px 0 4px">' + esc(p.name) + '</h2></div>' +
        (canEditProgram(p) ? '<button type="button" class="tk-btn sm plain" data-edit="' + p.id + '">Edit</button>' : '') + '</div>' + (p.notes ? '<p class="tk-muted">' + esc(p.notes) + '</p>' : '');
      (p.days || []).forEach(function (d, i) {
        h += '<details class="wk"><summary><div style="flex:1"><b>' + esc(d.name || 'Day ' + (i + 1)) + '</b><span class="tk-small"> · ' + (d.exercises || []).length + ' exercises</span></div><button type="button" class="tk-btn sm" data-start="' + p.id + ':' + i + '">Start</button></summary><div class="wk-body">';
        (d.exercises || []).forEach(function (e) { h += '<p><b>' + esc(e.name) + '</b> · ' + esc(e.sets || '') + ' × ' + esc(e.reps || '') + (e.rest ? ' · rest ' + esc(e.rest) + 's' : '') + (e.notes ? ' · ' + esc(e.notes) : '') + '</p>'; });
        h += '</div></details>';
      });
      h += '</div>';
    });
    v.innerHTML = h;
    $('newProg').onclick = function () { openBuilder(null); };
    v.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { openBuilder(S.programs.filter(function (p) { return p.id === b.dataset.edit; })[0]); }; });
    v.querySelectorAll('[data-start]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); var p = b.dataset.start.split(':'); if (S.draft && !confirmBox('You have a workout in progress. Replace it?')) return; startDraft(S.programs.filter(function (x) { return x.id === p[0]; })[0], +p[1]); }; });
  }

  function openBuilder(prog) {
    var P = prog ? JSON.parse(JSON.stringify(prog)) : { name: '', notes: '', days: [{ name: 'Day 1', exercises: [] }], active: true };
    var m = modal(prog ? 'Edit programme' : 'New programme', '<div id="bld"></div>');
    function draw() {
      var h = '<div class="tk-field"><label for="bName">Programme name</label><input class="tk-input" id="bName" value="' + esc(P.name) + '" placeholder="e.g. 12-week fat loss, 3 days a week"></div>' +
        '<div class="tk-field"><label for="bNotes">Notes for the client</label><textarea class="tk-textarea" id="bNotes" placeholder="Warm-up, cardio after weights, steps target…">' + esc(P.notes || '') + '</textarea></div>' +
        '<label class="tk-row tk-muted" style="margin-top:10px;min-height:44px"><input type="checkbox" id="bActive"' + (P.active ? ' checked' : '') + ' style="width:20px;height:20px"> Active programme (shows on the client\'s Today screen)</label>';
      P.days.forEach(function (d, di) {
        h += '<div class="bday"><div class="tk-row"><label class="sr" for="dn' + di + '">Day name</label><input class="tk-input" id="dn' + di + '" data-dn="' + di + '" value="' + esc(d.name) + '" style="flex:1;font-weight:700"><button type="button" class="tk-icon-btn" data-rmday="' + di + '" aria-label="Remove day">' + ICON.trash + '</button></div>';
        if (d.exercises.length) h += '<div class="bex-h"><span>Exercise</span><span>Sets</span><span>Reps</span><span>Rest s</span><span></span></div>';
        d.exercises.forEach(function (e, ei) {
          h += '<div class="bex"><div class="nm">' + esc(e.name) + '<input class="tk-input" style="margin-top:4px;text-align:left;font-size:.8rem;min-height:34px" aria-label="Notes for ' + esc(e.name) + '" placeholder="Notes (optional)" data-f="notes" data-d="' + di + '" data-e="' + ei + '" value="' + esc(e.notes || '') + '"></div>' +
            '<input class="tk-input" inputmode="numeric" aria-label="Sets" data-f="sets" data-d="' + di + '" data-e="' + ei + '" value="' + esc(e.sets) + '">' +
            '<input class="tk-input" aria-label="Reps" data-f="reps" data-d="' + di + '" data-e="' + ei + '" value="' + esc(e.reps) + '">' +
            '<input class="tk-input" inputmode="numeric" aria-label="Rest seconds" data-f="rest" data-d="' + di + '" data-e="' + ei + '" value="' + esc(e.rest) + '">' +
            '<button type="button" class="tk-icon-btn" data-rmx="' + di + ':' + ei + '" aria-label="Remove ' + esc(e.name) + '">' + ICON.x + '</button></div>';
        });
        h += '<button type="button" class="tk-btn sm ghost" data-addx="' + di + '" style="margin-top:10px">+ Add exercise</button></div>';
      });
      h += '<button type="button" class="tk-btn plain block" id="bAddDay" style="margin-top:12px">+ Add training day</button>';
      h += '<div class="tk-grid2" style="margin-top:16px">' + (prog ? '<button type="button" class="tk-btn danger" id="bDel">Delete</button>' : '<button type="button" class="tk-btn plain" data-close>Cancel</button>') + '<button type="button" class="tk-btn" id="bSave">Save programme</button></div>';
      $('bld').innerHTML = h;
      $('bName').oninput = function () { P.name = this.value; };
      $('bNotes').oninput = function () { P.notes = this.value; };
      $('bActive').onchange = function () { P.active = this.checked; };
      m.querySelectorAll('[data-dn]').forEach(function (i) { i.oninput = function () { P.days[+i.dataset.dn].name = i.value; }; });
      m.querySelectorAll('input[data-f]').forEach(function (i) { i.oninput = function () { P.days[+i.dataset.d].exercises[+i.dataset.e][i.dataset.f] = i.value; }; });
      m.querySelectorAll('[data-rmday]').forEach(function (b) { b.onclick = function () { if (P.days.length > 1 || confirmBox('Remove the only day?')) { P.days.splice(+b.dataset.rmday, 1); if (!P.days.length) P.days.push({ name: 'Day 1', exercises: [] }); draw(); } }; });
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
        if (!confirmBox('Delete this programme? Logged workouts are kept.')) return;
        var r = await sb.from('programs').delete().eq('id', prog.id);
        if (r.error) return toast(r.error.message);
        S.programs = S.programs.filter(function (x) { return x.id !== prog.id; }); m.close(); render(); toast('Programme deleted');
      };
    }
    async function saveProg() {
      if (!P.name.trim()) { toast('Give the programme a name'); $('bName').focus(); return; }
      var days = P.days.map(function (d) { return { name: d.name || 'Day', exercises: d.exercises.map(function (e) { return { name: e.name, sets: parseInt(e.sets, 10) || 1, reps: String(e.reps || ''), rest: parseInt(e.rest, 10) || null, notes: e.notes || '' }; }) }; });
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
    h += '<h3 class="tk-tag" style="display:block;margin-top:16px">InBody scan</h3><p class="tk-small">Copy the numbers from the InBody result sheet. Fill in only what you have; weight alone is fine for a quick weigh-in.</p><div class="tk-grid2">';
    MEAS.filter(function (m) { return m[3] === 'scan'; }).forEach(function (m) { var ls = series(B, m[0]), pl = ls.length ? ls[ls.length - 1][m[0]] : ''; h += '<div class="tk-field"><label for="m_' + m[0] + '">' + mLabel(m) + '</label><input class="tk-input" inputmode="decimal" id="m_' + m[0] + '" placeholder="' + esc(pl) + '"></div>'; });
    h += '</div><details style="margin-top:14px"><summary class="tk-link" style="cursor:pointer">Tape measurements (optional)</summary><div class="tk-grid2">';
    MEAS.filter(function (m) { return m[3] === 'tape'; }).forEach(function (m) { h += '<div class="tk-field"><label for="m_' + m[0] + '">' + mLabel(m) + '</label><input class="tk-input" inputmode="decimal" id="m_' + m[0] + '"></div>'; });
    h += '</div></details>';
    h += '<div class="tk-field"><label for="bPhoto">Photo: progress photo or the InBody result sheet (optional, private)</label><input class="tk-input" type="file" id="bPhoto" accept="image/*"></div>';
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
    $('photos').innerHTML = rows.map(function (b, i) { var u = r.data[i] && r.data[i].signedUrl; return u ? '<figure><img src="' + esc(u) + '" alt="Progress photo, ' + fmtDay(b.date) + '" loading="lazy"><figcaption>' + fmtDay(b.date, { day: 'numeric', month: 'short', year: '2-digit' }) + (b.weight ? ' · ' + b.weight + 'kg' : '') + '</figcaption></figure>' : ''; }).reverse().join('');
  }
  function compress(file) {
    return new Promise(function (ok, bad) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { var k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(function (b) { b ? ok(b) : bad(new Error('Could not read photo')); }, 'image/jpeg', 0.82); };
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

  // ---------- PROGRESS ----------
  function renderProgress() {
    var v = $('view'), W = S.workouts;
    var month = today().slice(0, 7), vol = 0; W.forEach(function (w) { vol += workoutVolume(w); });
    var h = '<h1 class="tk-h1">Strength <em>progress</em></h1>';
    h += '<div class="tk-grid2" style="margin-top:14px"><div class="tk-stat"><b>' + W.length + '</b><span>Workouts</span></div><div class="tk-stat"><b>' + W.filter(function (w) { return w.date.slice(0, 7) === month; }).length + '</b><span>This month</span></div><div class="tk-stat"><b>' + weekStreak() + '</b><span>Week streak</span></div><div class="tk-stat"><b>' + (vol >= 1e6 ? r1(vol / 1e6) + 'M' : vol >= 1e4 ? Math.round(vol / 1e3) + 'k' : nf(vol)) + '</b><span>Kg lifted</span></div></div>';
    var freq = {}; W.forEach(function (w) { (w.exercises || []).forEach(function (e) { var t = e.type || typeOf(e.name); if (t === 'w' || t === 'b') freq[e.name] = (freq[e.name] || 0) + 1; }); });
    var names = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; });
    if (!names.length) { h += '<div class="tk-empty">Log a few workouts and your strength charts and personal records will appear here.</div>'; v.innerHTML = h; return; }
    if (!S.progEx || names.indexOf(S.progEx) < 0) S.progEx = names[0];
    h += '<div class="tk-card"><div class="tk-field" style="margin-top:0"><label for="pEx">Exercise</label><select class="tk-select" id="pEx">' + names.map(function (n) { return '<option' + (n === S.progEx ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>';
    var pts = [];
    W.slice().reverse().forEach(function (w) {
      var best = 0, top = 0, reps = 0;
      (w.exercises || []).forEach(function (e) { if (e.name !== S.progEx) return; (e.sets || []).forEach(function (s) { var a = num(s.w) || 0, r = num(s.r) || 0; best = Math.max(best, e1rm(a, r)); top = Math.max(top, a); reps = Math.max(reps, r); }); });
      if (best || top || reps) pts.push({ d: w.date, e1: r1(best), top: top, reps: reps });
    });
    var t = typeOf(S.progEx), useReps = t === 'b' && !pts.some(function (p) { return p.top > 0; });
    var b = bests(S.progEx);
    h += '<div class="tk-grid2" style="margin-top:10px"><div class="tk-stat"><b>' + (useReps ? b.r : b.w) + '</b><span>' + (useReps ? 'Best reps' : 'Heaviest (kg)') + '</span></div><div class="tk-stat"><b>' + (useReps ? pts.length : r1(b.e1) || '–') + '</b><span>' + (useReps ? 'Sessions' : 'Est. 1-rep max') + '</span></div></div>';
    h += '<div class="chart-box"><canvas id="pChart" role="img" aria-label="' + esc(S.progEx) + ' progress over time"></canvas></div><p class="tk-small">' + (useReps ? 'Most reps in a set per session.' : 'Est. 1-rep max uses your best set each session (weight × reps), so you can compare sessions with different rep ranges.') + '</p></div>';
    h += '<div class="tk-card"><span class="tk-tag">Personal records</span>';
    names.slice(0, 25).forEach(function (n) {
      var bb = bests(n), tt = typeOf(n);
      if (!bb.set && !bb.r) return;
      h += '<div class="li"><div class="grow"><b>' + esc(n) + '</b><span class="tk-small">' + (bb.set ? esc(setLabel(bb.set, tt)) + (tt === 'w' ? ' · est. 1RM ' + r1(bb.e1) + 'kg' : '') : bb.r + ' reps') + (bb.date ? ' · ' + fmtDay(bb.date, { day: 'numeric', month: 'short' }) : '') + '</span></div></div>';
    });
    h += '</div>';
    v.innerHTML = h;
    $('pEx').onchange = function () { S.progEx = this.value; render(); };
    if (pts.length && window.Chart) {
      var labels = pts.map(function (p) { return fmtDay(p.d, { day: 'numeric', month: 'short' }); });
      S.chart.p = useReps ? lineChart('pChart', labels, [{ label: 'Reps', data: pts.map(function (p) { return p.reps; }) }]) : lineChart('pChart', labels, [{ label: 'Est. 1RM (kg)', data: pts.map(function (p) { return p.e1; }) }, { label: 'Top weight (kg)', data: pts.map(function (p) { return p.top; }) }]);
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
      h += '<details class="wk"><summary><div style="flex:1;min-width:0"><b>' + esc(w.title || 'Workout') + '</b><span class="tk-small" style="display:block">' + fmtDay(w.date) + ' · ' + (w.exercises || []).length + ' exercises · ' + sets + ' sets' + (w.duration_min ? ' · ' + w.duration_min + ' min' : '') + '</span></div>' + (prs ? '<span class="pill gold">' + prs + ' PR</span>' : '') + '</summary><div class="wk-body">';
      (w.exercises || []).forEach(function (e) { var t = e.type || typeOf(e.name); h += '<p><b>' + esc(e.name) + '</b>: ' + (e.sets || []).map(function (s) { return esc(setLabel(s, t)) + (s.pr ? ' ★' : ''); }).join(', ') + '</p>'; });
      if (w.notes) h += '<p><b>Notes:</b> ' + esc(w.notes) + '</p>';
      h += '<button type="button" class="tk-btn sm danger" data-delw="' + w.id + '" style="margin-top:8px">Delete workout</button></div></details>';
    });
    h += '</div>';
    v.innerHTML = h;
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
    var P = q[0].data || [], W = q[1].data || [], B = q[2].data || [], PR = q[3].data || [];
    var m30 = new Date(); m30.setDate(m30.getDate() - 30); var c30 = iso(m30);
    var rows = P.map(function (p) {
      var w = W.filter(function (x) { return x.user_id === p.id; }), b = B.filter(function (x) { return x.user_id === p.id; });
      return { p: p, last: w[0] ? w[0].date : null, n30: w.filter(function (x) { return x.date >= c30; }).length, w0: b[0], w1: b[b.length - 1], prog: PR.some(function (x) { return x.client_id === p.id && x.active; }) };
    });
    var h = '<h1 class="tk-h1">Your <em>clients</em></h1><p class="tk-sub">Everyone who signed in to the tracker. Tap a client to see their workouts, weight and programme, or to log today\'s session for them.</p>';
    h += '<div class="tk-grid3" style="margin-top:14px"><div class="tk-stat"><b>' + P.length + '</b><span>Clients</span></div><div class="tk-stat"><b>' + rows.filter(function (r) { return r.last && r.last >= iso(new Date(Date.now() - 7 * 864e5)); }).length + '</b><span>Trained 7 days</span></div><div class="tk-stat"><b>' + rows.filter(function (r) { return !r.prog; }).length + '</b><span>Need a plan</span></div></div>';
    h += '<div class="tk-field"><label for="cQ" class="sr">Search clients</label><input class="tk-input" id="cQ" type="search" placeholder="Search by name or email"></div><div class="tk-card" id="cList"></div>';
    v.innerHTML = h;
    function draw(ql) {
      var html = rows.filter(function (r) { return !ql || ((r.p.name || '') + ' ' + r.p.email).toLowerCase().indexOf(ql) > -1; }).map(function (r) {
        var age = r.last ? Math.round((parseDay(today()) - parseDay(r.last)) / 864e5) : null;
        var pill = r.last == null ? '<span class="pill">No workouts</span>' : '<span class="pill ' + (age <= 7 ? 'ok' : age <= 14 ? 'gold' : 'warn') + '">' + daysAgo(r.last) + '</span>';
        var wt = r.w1 ? r.w1.weight + 'kg' + (r.w0 && r.w0 !== r.w1 ? ' (' + (r1(r.w1.weight - r.w0.weight) > 0 ? '+' : '') + r1(r.w1.weight - r.w0.weight) + ')' : '') : 'no weight yet';
        return '<button type="button" class="pick-item" data-client="' + r.p.id + '"><div style="min-width:0"><b>' + esc(r.p.name || r.p.email) + (r.p.role === 'coach' ? ' <span class="pill gold">Coach</span>' : '') + '</b><span>' + esc(r.p.email) + ' · ' + r.n30 + ' workouts in 30 days · ' + wt + (r.prog ? '' : ' · no programme') + '</span></div><span style="margin-left:auto">' + pill + '</span></button>';
      }).join('');
      $('cList').innerHTML = html || '<div class="tk-empty">' + (P.length ? 'No match.' : 'No clients yet. Send them the tracker link and ask them to sign in with Google: mrandmrslifestyle.com/workout-tracker.html') + '</div>';
      $('cList').querySelectorAll('[data-client]').forEach(function (b) { b.onclick = function () { openClient(P.filter(function (p) { return p.id === b.dataset.client; })[0]); }; });
    }
    $('cQ').oninput = function () { draw(this.value.toLowerCase().trim()); };
    draw('');
  }
  async function openClient(p) { S.target = p; lsSet('mm_target', p.id); S.tab = 'today'; ev('tracker_coach_open_client'); $('view').innerHTML = '<div class="tk-empty">Loading…</div>'; await loadTarget(); window.scrollTo(0, 0); }

  // ---------- settings ----------
  function openSettings() {
    var me = S.me;
    var body = '<div class="tk-field"><label for="sName">Your name</label><input class="tk-input" id="sName" value="' + esc(me.name || '') + '"></div>' +
      '<div class="tk-field"><label for="sGoal">Your goal</label><input class="tk-input" id="sGoal" value="' + esc(me.goal || '') + '" placeholder="e.g. lose 8 kg before summer"></div>' +
      '<div class="tk-field"><label for="sRest">Default rest between sets (seconds)</label><input class="tk-input" id="sRest" inputmode="numeric" value="' + lsGet('mm_rest', 90) + '"></div>' +
      '<button type="button" class="tk-btn block" id="sSave" style="margin-top:14px">Save</button>' +
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
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('gear').innerHTML = ICON.gear; $('gear').onclick = function () { if (S.me) openSettings(); };
    boot();
  });
  setInterval(function () { if (S.draft && S.tab === 'today' && !document.querySelector('.modal') && document.activeElement && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { var el = document.querySelector('.tk-row.tk-small span:nth-child(2)'); if (el) el.textContent = '· ' + Math.max(0, Math.round((Date.now() - S.draft.started) / 60000)) + ' min'; } }, 30000);
})();
