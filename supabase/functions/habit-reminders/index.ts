// deno-lint-ignore-file no-explicit-any
// habit-reminders: once an hour (pg_cron), sends a daily push nudge to tracker users whose reminder time is now
// (Dubai time) and who haven't logged or hit their habit goals today. Protected by a shared secret kept in
// public.private_config (RLS on, no policies), passed by the cron job in the x-cron-secret header.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const te = new TextEncoder();

function b64u(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function ub64u(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}

async function encryptPayload(payload: Uint8Array, p256dh: string, auth: string): Promise<Uint8Array> {
  const uaPub = ub64u(p256dh), authSecret = ub64u(auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(te.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(payload, new Uint8Array([2]))));
  const header = new Uint8Array(86);
  header.set(salt, 0); new DataView(header.buffer).setUint32(16, 4096); header[20] = 65; header.set(asPub, 21);
  return concat(header, ct);
}

async function vapidHeader(endpoint: string, pub: string, priv: string, subject: string): Promise<string> {
  const p = ub64u(pub);
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), d: priv, ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const aud = new URL(endpoint).origin;
  const unsigned = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' +
    b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned));
  return 'vapid t=' + unsigned + '.' + b64u(sig) + ', k=' + pub;
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
type Vapid = { public_key: string; private_key: string };
// VAPID keys are generated once by this function and kept in a private table (RLS on, no policies: secret key only).
// deno-lint-ignore no-explicit-any
async function getVapid(admin: any): Promise<Vapid> {
  const got = await admin.from('push_config').select('public_key,private_key').eq('id', 1).maybeSingle();
  if (got.data) return got.data;
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const row = { id: 1, public_key: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), private_key: jwk.d as string };
  await admin.from('push_config').upsert(row, { onConflict: 'id', ignoreDuplicates: true });
  const again = await admin.from('push_config').select('public_key,private_key').eq('id', 1).single();
  return again.data;
}

async function sendPush(sub: Sub, data: unknown, v: Vapid): Promise<number> {
  const pub = v.public_key, priv = v.private_key;
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:info@mrandmrslifestyle.com';
  const body = await encryptPayload(te.encode(JSON.stringify(data)), sub.p256dh, sub.auth);
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { 'Authorization': await vapidHeader(sub.endpoint, pub, priv, subject), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', 'TTL': '86400', 'Urgency': 'high' },
    body,
  });
  await r.body?.cancel();
  return r.status;
}


const DEF = { steps: 8000, water: 8, sleep: 7 };
function json(o: unknown, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }); }

Deno.serve(async (req) => {
  try {
    let secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    try { const ks = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); if (ks.default) secret = ks.default; } catch (_) { /* legacy only */ }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secret, { auth: { persistSession: false } });
    const { data: cfg } = await admin.from('private_config').select('value').eq('key', 'cron_secret').maybeSingle();
    if (!cfg?.value || req.headers.get('x-cron-secret') !== cfg.value) return json({ error: 'forbidden' }, 403);

    // Dubai is UTC+4 all year (no daylight saving).
    const dubai = new Date(Date.now() + 4 * 3600e3);
    const hour = dubai.getUTCHours(), day = dubai.toISOString().slice(0, 10);
    const b = await req.json().catch(() => ({}));
    const onlyHour = typeof b.hour === 'number' ? b.hour : hour;

    const { data: people } = await admin.from('profiles').select('id,name,email,habit_goals,habit_reminder,archived').not('habit_reminder', 'is', null);
    const due = (people || []).filter((p: any) => p.habit_reminder?.on && Number(p.habit_reminder.hour) === onlyHour && !p.archived);
    if (!due.length) return json({ ok: true, hour: onlyHour, due: 0 });
    const ids = due.map((p: any) => p.id);
    const [{ data: logs }, { data: subs }] = await Promise.all([
      admin.from('habit_logs').select('user_id,steps,water,sleep').eq('date', day).in('user_id', ids),
      admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', ids),
    ]);
    const vapid = await getVapid(admin);
    let sent = 0, skipped = 0; const dead: string[] = [];
    for (const p of due) {
      const g = { steps: +p.habit_goals?.steps || DEF.steps, water: +p.habit_goals?.water || DEF.water, sleep: +p.habit_goals?.sleep || DEF.sleep };
      const x: any = (logs || []).find((l: any) => l.user_id === p.id);
      const first = String(p.name || p.email || '').split(/[ @]/)[0];
      let title = '', body = '';
      if (!x || (x.steps == null && !x.water && x.sleep == null)) {
        title = (first ? first + ', ' : '') + 'time for a quick check-in';
        body = 'Log today\'s steps, water and sleep. It takes 30 seconds and keeps your streak going 🔥';
      } else {
        const left: string[] = [];
        if ((x.water || 0) < g.water) left.push((g.water - (x.water || 0)) + ' more glass' + (g.water - (x.water || 0) === 1 ? '' : 'es') + ' of water 💧');
        if (x.steps == null) left.push('add your steps 👟');
        else if (x.steps < g.steps) left.push(Math.round(g.steps - x.steps).toLocaleString('en-US') + ' steps to go 👟');
        if (!left.length) { skipped++; continue; }
        title = 'Almost there' + (first ? ', ' + first : '') + '!';
        body = 'Today: ' + left.join(' and ') + '. Update your tracker when you\'re done.';
      }
      const mine = (subs || []).filter((s: any) => s.user_id === p.id);
      for (const s of mine) {
        try { const st = await sendPush(s, { title, body, tag: 'mm-habits-' + day, url: '/workout-tracker.html' }, vapid); if (st >= 200 && st < 300) sent++; else if (st === 404 || st === 410) dead.push(s.id); }
        catch (e) { console.log('push error', String(e)); }
      }
    }
    if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
    return json({ ok: true, hour: onlyHour, due: due.length, sent, skipped });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
