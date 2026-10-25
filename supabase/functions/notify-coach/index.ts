// notify-coach: tells coaches (in-app + phone push) when a client starts or finishes a workout.
// Called by the tracker with the signed-in user's token. Uses only Web Crypto for Web Push (RFC 8291 / VAPID RFC 8292).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
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

export async function encryptPayload(payload: Uint8Array, p256dh: string, auth: string): Promise<Uint8Array> {
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

export async function vapidHeader(endpoint: string, pub: string, priv: string, subject: string): Promise<string> {
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

function json(o: unknown, status = 200) { return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } }); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    let secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    try { const ks = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); if (ks.default) secret = ks.default; } catch (_) { /* legacy only */ }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secret, { auth: { persistSession: false } });
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: 'not signed in' }, 401);
    const { data: me } = await admin.from('profiles').select('id,name,email,role').eq('id', u.user.id).single();
    if (!me) return json({ error: 'no profile' }, 403);

    const b = await req.json().catch(() => ({}));
    const kind = String(b.kind || '');
    const vapid = await getVapid(admin);
    if (kind === 'config') return json({ publicKey: vapid.public_key });
    const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);
    const who = me.name || (me.email || 'A client').split('@')[0];
    let title: string, text: string, coachIds: string[];

    if (kind === 'test') {
      if (me.role !== 'coach') return json({ error: 'coach only' }, 403);
      title = 'Notifications are on'; text = 'You will be notified when clients start and finish workouts.'; coachIds = [me.id];
    } else if (kind === 'started' || kind === 'finished') {
      if (me.role === 'coach') return json({ skipped: 'coach' });
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recent } = await admin.from('coach_notifications').select('id').eq('client_id', me.id).eq('kind', kind).gte('created_at', since).limit(1);
      if (kind === 'started' && recent && recent.length) return json({ skipped: 'duplicate' });
      title = kind === 'started' ? who + ' started a workout' : who + ' finished a workout';
      text = clip(b.workout || 'Workout', 80) + (b.detail ? ' · ' + clip(b.detail, 120) : '');
      await admin.from('coach_notifications').insert({ client_id: me.id, kind, title, body: text });
      const { data: coaches } = await admin.from('profiles').select('id').eq('role', 'coach');
      coachIds = (coaches || []).map((c: { id: string }) => c.id);
    } else return json({ error: 'bad kind' }, 400);

    const { data: subs } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id', coachIds);
    let sent = 0; const dead: string[] = [];
    const payload = { title, body: text, tag: kind === 'test' ? 'mm-test' : 'mm-' + me.id + '-' + kind, url: kind === 'test' ? '/workout-tracker.html' : '/workout-tracker.html?client=' + me.id };
    await Promise.all((subs || []).map(async (s: Sub) => {
      try { const st = await sendPush(s, payload, vapid); if (st >= 200 && st < 300) sent++; else if (st === 404 || st === 410) dead.push(s.id); else console.log('push status', st); }
      catch (e) { console.log('push error', String(e)); }
    }));
    if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
    return json({ ok: true, sent, devices: (subs || []).length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
