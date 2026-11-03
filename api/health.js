/* Watch data for the tracker: Apple Watch (through an iPhone Shortcut) and Whoop (official API).
 *
 *   POST /api/health                         { code, date, steps, active_kcal, avg_hr }   the client's iPhone Shortcut
 *   GET  /api/health?action=whoop_callback   Whoop sends the client back here after she signs in (also /api/whoop/callback)
 *   POST /api/health?action=sync             Authorization: Bearer <tracker sign-in>, body { user_id? }   refresh Whoop now
 *   POST /api/health?action=cron             x-cron-secret: <cron_secret>   every 3 hours from Supabase
 *
 * Data is written only through the health_server database function (same TPR_SECRET as the rewards card).
 * The Whoop app keys and each client's Whoop tokens are kept in the database, never in this repo.
 */
const SUPA_URL = 'https://iwtkphupsobwiaiqvkok.supabase.co';
const SUPA_KEY = 'sb_publishable_L1RcJTZ1UTT_XocBLPLSYg_tPpPFWbU'; // public key, same as in the app
const SITE = 'https://www.mrandmrslifestyle.com';
const WHOOP = 'https://api.prod.whoop.com';
const WHOOP_REDIRECT = SITE + '/api/whoop/callback';

async function rpc(fn, args, jwt) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + (jwt || SUPA_KEY), 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {})
  });
  const text = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ': ' + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}
const server = (action, args) => rpc('health_server', { p_secret: process.env.TPR_SECRET || '', p_action: action, p_args: args || {} });

function send(res, code, obj, type) {
  res.statusCode = code;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', type || 'application/json');
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
function redirect(res, url) { res.statusCode = 302; res.setHeader('Location', url); res.setHeader('Cache-Control', 'no-store'); res.end(); }
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw || '{}'); } catch (e) { return Object.fromEntries(new URLSearchParams(raw)); }
}

// Shortcuts can send numbers as "8,421", "512.6 kcal" or "78 count/min": keep the number only.
function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}
function dubaiToday() { return new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10); }
// "2026-11-03", "3 Nov 2026", "11/3/26"… anything Date can read; otherwise today in Dubai
function dayOf(v) {
  if (!v) return dubaiToday();
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d) ? dubaiToday() : new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 10);
}

// ---------- Whoop ----------
// local calendar day of a Whoop timestamp, using the offset Whoop recorded ("+04:00")
function localDay(ts, offset) {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(offset || '');
  const mins = m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : 240;
  return new Date(new Date(ts).getTime() + mins * 60e3).toISOString().slice(0, 10);
}
async function whoopToken(params) {
  const r = await fetch(WHOOP + '/oauth/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw Object.assign(new Error(j.error_description || j.error || 'whoop token ' + r.status), { status: r.status });
  return j;
}
async function whoopGet(path, access, params) {
  const u = new URL(WHOOP + '/developer/v2' + path);
  Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { Authorization: 'Bearer ' + access } });
  if (r.status === 401) throw Object.assign(new Error('whoop_unauthorized'), { status: 401 });
  if (!r.ok) throw new Error('whoop ' + path + ' ' + r.status);
  return r.json();
}
async function whoopAll(path, access, start) {
  let out = [], next = null, guard = 0;
  do {
    const j = await whoopGet(path, access, Object.assign({ start, limit: 25 }, next ? { nextToken: next } : {}));
    out = out.concat(j.records || []); next = j.next_token || null;
  } while (next && ++guard < 4);
  return out;
}
// Turn Whoop cycles, recoveries and sleeps into one row per day.
function whoopDays(cycles, recoveries, sleeps) {
  const days = {}, cycleDay = {};
  const row = (d) => (days[d] = days[d] || { date: d });
  cycles.forEach((c) => {
    const d = localDay(c.start, c.timezone_offset); cycleDay[c.id] = d;
    const s = c.score_state === 'SCORED' && c.score;
    if (!s) return;
    const x = row(d);
    if (s.kilojoule != null) x.total_kcal = Math.round(s.kilojoule / 4.184);
    if (s.average_heart_rate != null) x.avg_hr = Math.round(s.average_heart_rate);
    if (s.strain != null) x.strain = Math.round(s.strain * 10) / 10;
  });
  recoveries.forEach((r) => {
    const d = cycleDay[r.cycle_id], s = r.score_state === 'SCORED' && r.score;
    if (!d || !s) return;
    const x = row(d);
    if (s.recovery_score != null) x.recovery = Math.round(s.recovery_score);
    if (s.resting_heart_rate != null) x.resting_hr = Math.round(s.resting_heart_rate);
    if (s.hrv_rmssd_milli != null) x.hrv = Math.round(s.hrv_rmssd_milli * 10) / 10;
  });
  sleeps.filter((s) => !s.nap).forEach((sl) => {
    const s = sl.score_state === 'SCORED' && sl.score;
    if (!s) return;
    const x = row(localDay(sl.end, sl.timezone_offset)); // the night is counted on the morning she wakes up
    const st = s.stage_summary || {};
    const asleep = (st.total_light_sleep_time_milli || 0) + (st.total_slow_wave_sleep_time_milli || 0) + (st.total_rem_sleep_time_milli || 0);
    if (asleep > 0) x.sleep_hours = Math.round(asleep / 36e5 * 100) / 100;
    if (s.sleep_performance_percentage != null) x.sleep_perf = Math.round(s.sleep_performance_percentage);
  });
  return Object.values(days);
}
async function syncWhoopUser(u, keys) {
  let access = u.access;
  try {
    if (u.expired || !access) {
      const t = await whoopToken({ grant_type: 'refresh_token', refresh_token: u.refresh, client_id: keys.client_id, client_secret: keys.client_secret, scope: 'offline' });
      access = t.access_token;
      await server('whoop_save', { user_id: u.user_id, access: t.access_token, refresh: t.refresh_token, expires_in: t.expires_in });
    }
    const start = new Date(Date.now() - 10 * 864e5).toISOString();
    const [cycles, recoveries, sleeps] = await Promise.all([
      whoopAll('/cycle', access, start), whoopAll('/recovery', access, start), whoopAll('/activity/sleep', access, start)
    ]);
    const days = whoopDays(cycles, recoveries, sleeps);
    await server('whoop_days', { user_id: u.user_id, days });
    return { user_id: u.user_id, days: days.length };
  } catch (e) {
    // a refused refresh means the client removed access in Whoop: show "reconnect" on her page
    const gone = e.status === 400 || e.status === 401;
    await server('whoop_error', { user_id: u.user_id, error: gone ? 'Whoop access ended. Tap Connect Whoop again.' : 'Whoop sync failed, will retry.', disconnect: gone }).catch(() => {});
    return { user_id: u.user_id, error: e.message };
  }
}
async function syncWhoop(filter) {
  const keys = await server('whoop_keys');
  if (!keys || !keys.client_id || !keys.client_secret) return { error: 'whoop_not_set_up' };
  const users = await server('whoop_users', filter || {});
  const out = [];
  for (const u of users || []) out.push(await syncWhoopUser(u, keys)); // few clients: one at a time keeps within Whoop's rate limits
  return { synced: out };
}
// who is asking (tracker sign-in), and are they a coach
async function caller(req) {
  const jwt = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const r = await fetch(SUPA_URL + '/auth/v1/user', { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + jwt } });
  if (!r.ok) return null;
  const u = await r.json();
  if (!u || !u.id) return null;
  return { id: u.id, jwt };
}

module.exports = async (req, res) => {
  const url = new URL(req.url, SITE);
  const action = url.searchParams.get('action') || '';
  if (!process.env.TPR_SECRET) return send(res, 503, { error: 'not_configured' });
  try {
    // Whoop sends the client back here after she signs in
    if (action === 'whoop_callback') {
      const back = (msg) => redirect(res, SITE + '/workout-tracker.html?whoop=' + msg);
      if (url.searchParams.get('error')) return back('cancelled');
      const code = url.searchParams.get('code'), state = url.searchParams.get('state');
      if (!code || !state) return back('error');
      const st = await server('whoop_state', { state });
      if (!st || !st.user_id) return back('expired');
      const keys = await server('whoop_keys');
      const t = await whoopToken({ grant_type: 'authorization_code', code, redirect_uri: WHOOP_REDIRECT, client_id: keys.client_id, client_secret: keys.client_secret });
      let who = null; try { who = await whoopGet('/user/profile/basic', t.access_token); } catch (e) {}
      await server('whoop_save', { user_id: st.user_id, access: t.access_token, refresh: t.refresh_token, expires_in: t.expires_in, whoop_user_id: who && who.user_id });
      await syncWhoop({ user_id: st.user_id }).catch(() => {});
      return back('connected');
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
    const b = await readBody(req);

    if (action === 'cron') {
      const ok = await server('cron_ok', { secret: String(req.headers['x-cron-secret'] || '') });
      if (!ok || !ok.ok) return send(res, 403, { error: 'forbidden' });
      return send(res, 200, await syncWhoop({ stale_minutes: 150 }));
    }

    if (action === 'sync') {
      // the tracker page asks for fresh Whoop data when it opens (at most once an hour per client)
      const me = await caller(req);
      if (!me) return send(res, 401, { error: 'sign_in' });
      let target = me.id;
      if (b.user_id && b.user_id !== me.id) {
        const coach = await rpc('is_coach', {}, me.jwt).catch(() => false);
        if (coach !== true) return send(res, 403, { error: 'forbidden' });
        target = b.user_id;
      }
      return send(res, 200, await syncWhoop({ user_id: target, stale_minutes: 60 }));
    }

    // default: the iPhone Shortcut sending today's Apple Health totals
    const code = String(b.code || b.token || url.searchParams.get('code') || '').trim();
    if (!code) return send(res, 400, { error: 'missing_code' });
    const steps = num(b.steps), kcal = num(b.active_kcal != null ? b.active_kcal : b.calories), hr = num(b.avg_hr != null ? b.avg_hr : b.heart_rate);
    const r = await server('apple', {
      token: code, date: dayOf(b.date),
      steps: steps != null && steps >= 0 && steps <= 100000 ? Math.round(steps) : null,
      active_kcal: kcal != null && kcal >= 0 && kcal <= 20000 ? Math.round(kcal) : null,
      avg_hr: hr != null && hr >= 20 && hr <= 250 ? Math.round(hr) : null
    });
    if (r && r.error) return send(res, 400, { error: r.error, message: r.error === 'bad_code' ? 'This sync code is not valid. Copy it again from your tracker.' : 'Could not save.' });
    return send(res, 200, { ok: true, message: 'Synced to your Mr & Mrs Lifestyle tracker' });
  } catch (e) {
    console.error('health', e);
    if (action === 'whoop_callback') return redirect(res, SITE + '/workout-tracker.html?whoop=error');
    return send(res, 500, { error: 'server_error' });
  }
};
