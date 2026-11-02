/* The Pilates Room rewards card: shared helpers for the Apple Wallet card.
 *
 * Data lives in Supabase (tables tpr_*), reached only through the tpr_server / tpr_staff database functions.
 * Settings (Vercel → Project → Settings → Environment Variables):
 *   TPR_SECRET   the value shown on the check-in page's Setup tab (must match the database)   required
 * The Apple pass certificate and key are stored in the database by the Setup tab, never in this repo.
 */
const crypto = require('crypto');
const zlib = require('zlib');
const http2 = require('http2');
const forge = require('./forge');
const IMAGES = require('./tpr-images');

const SUPA_URL = 'https://iwtkphupsobwiaiqvkok.supabase.co';
const SUPA_KEY = 'sb_publishable_L1RcJTZ1UTT_XocBLPLSYg_tPpPFWbU'; // public key, same as in the app
const SITE = 'https://www.mrandmrslifestyle.com';
const WALLET_URL = SITE + '/api/tpr-wallet';
const WWDR_URL = 'https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer';

async function rpc(fn, args) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const text = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ': ' + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}
const secret = () => process.env.TPR_SECRET || '';
const server = (action, args) => rpc('tpr_server', { p_secret: secret(), p_action: action, p_args: args || {} });
const staff = (pin, action, args) => rpc('tpr_staff', { p_secret: secret(), p_pin: pin, p_action: action, p_args: args || {} });

// ---------- certificates (cached per warm function instance) ----------
let KEYS = null, WWDR = null;
async function keys() {
  if (KEYS && Date.now() - KEYS.at < 10 * 60 * 1000) return KEYS;
  const k = await server('wallet_keys');
  if (!k || !k.key || !k.cert || !k.pass_type_id || !k.team_id) throw Object.assign(new Error('wallet_not_set_up'), { code: 'wallet_not_set_up' });
  KEYS = { key: k.key, cert: k.cert, passTypeId: k.pass_type_id, teamId: k.team_id, at: Date.now() };
  return KEYS;
}
async function wwdr() {
  if (WWDR) return WWDR;
  const r = await fetch(WWDR_URL);
  if (!r.ok) throw new Error('could not fetch Apple WWDR certificate');
  const der = Buffer.from(await r.arrayBuffer());
  WWDR = forge.pki.certificateFromAsn1(forge.asn1.fromDer(der.toString('binary')));
  return WWDR;
}

// ---------- what the card says ----------
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// The Inner Circle: a new club every 10 sessions, a milestone gift at each one.
function clubName(n) { return n < 10 ? 'New Member' : `${Math.floor(n / 10) * 10} Session Club`; }
function cardState(m) {
  const s = m.sessions || 0;
  const ready = Math.floor(s / 10) > (m.rewards_given || 0);
  const toGo = 10 - (s % 10);
  return {
    ready, club: clubName(s),
    clubLabel: ready ? 'MILESTONE REACHED · GIFT WAITING' : `INNER CIRCLE · ${toGo} TO ${clubName(s + toGo).toUpperCase()}`,
    toGo
  };
}
function passJson(m, k) {
  const st = cardState(m);
  const free = Math.max(0, (m.free_earned || 0) - (m.free_used || 0));
  const since = new Date(m.created_at);
  return {
    formatVersion: 1,
    passTypeIdentifier: k.passTypeId,
    teamIdentifier: k.teamId,
    serialNumber: m.serial,
    authenticationToken: m.auth_token,
    webServiceURL: WALLET_URL,
    organizationName: 'The Pilates Room by Chloe',
    description: 'The Pilates Room · The Inner Circle',
    logoText: 'THE PILATES ROOM',
    foregroundColor: 'rgb(246, 241, 234)',
    backgroundColor: 'rgb(58, 38, 23)',
    labelColor: 'rgb(205, 185, 166)',
    sharingProhibited: true,
    storeCard: {
      headerFields: [{ key: 'sessions', label: 'SESSIONS', value: m.sessions || 0 }],
      primaryFields: [{ key: 'milestone', label: st.clubLabel, value: st.club, changeMessage: 'Welcome to the %@! A handwritten card and a surprise gift are waiting for you at the studio.' }],
      // Apple puts these in one row under the photo, so keep three short fields; "member since" is on the back
      secondaryFields: [{ key: 'member', label: 'MEMBER', value: m.name }],
      auxiliaryFields: [
        { key: 'referrals', label: 'REFERRALS', value: m.referrals || 0, textAlignment: 'PKTextAlignmentCenter', changeMessage: 'Thank you for your referral! Successful referrals: %@' },
        { key: 'free', label: 'FREE SESSIONS', value: free, textAlignment: 'PKTextAlignmentRight', changeMessage: 'Free sessions available on your card: %@' }
      ],
      backFields: [
        { key: 'circle', label: 'The Inner Circle', value: 'Every 10 sessions you join a new club: the 10 Session Club, the 20 Session Club, the 30 Session Club and onwards. At every milestone you receive a handwritten card celebrating your progress and a surprise gift.' },
        { key: 'since', label: 'Member since', value: `${MONTHS_LONG[since.getUTCMonth()]} ${since.getUTCFullYear()}` },
        { key: 'refs', label: 'Successful referrals', value: String(m.referrals || 0) },
        { key: 'next', label: 'Your next club', value: st.ready ? `You have reached the ${st.club}. Your gift is waiting at the studio.` : `${st.toGo} more session${st.toGo === 1 ? '' : 's'} to the ${clubName((m.sessions || 0) + st.toGo)}.` },
        { key: 'referral', label: 'Refer a friend', value: 'When a friend you refer buys her first package and names you, you earn a free session. Your successful referrals stay on your card.' },
        { key: 'free_left', label: 'Free sessions', value: `${free} available · ${m.free_used || 0} used. Includes referral rewards and any free sessions given as milestone gifts.` },
        { key: 'how', label: 'How it works', value: 'Every session you complete at The Pilates Room is added to this card by Chloe. It updates by itself, so there is nothing for you to do.' },
        { key: 'contact', label: 'Book or ask', value: 'WhatsApp +971 54 701 1995\ninfo@thepilatesroombychloe.com\nMeydan Avenue, Block A, Shop 3, Dubai' },
        { key: 'number', label: 'Card number', value: m.serial },
        { key: 'terms', label: 'Terms', value: 'Rewards are personal and not exchangeable for cash. One session counts per visit. The Pilates Room may update the rewards programme at any time.' }
      ]
    },
    barcodes: [{ format: 'PKBarcodeFormatQR', message: m.serial, messageEncoding: 'iso-8859-1', altText: m.serial }],
    barcode: { format: 'PKBarcodeFormatQR', message: m.serial, messageEncoding: 'iso-8859-1', altText: m.serial }
  };
}

// ---------- .pkpass = signed zip ----------
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function zip(files) {
  const parts = [], central = []; let off = 0;
  for (const [name, data] of files) {
    const nm = Buffer.from(name), comp = zlib.deflateRawSync(data), crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0, 6); h.writeUInt16LE(8, 8);
    h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nm.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, nm, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0, 12); c.writeUInt16LE(0x21, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, nm);
    off += 30 + nm.length + comp.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
function sign(manifest, k, wwdrCert) {
  const cert = forge.pki.certificateFromPem(k.cert), key = forge.pki.privateKeyFromPem(k.key);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest.toString('binary'));
  p7.addCertificate(cert); p7.addCertificate(wwdrCert);
  p7.addSigner({ key, certificate: cert, digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime, value: new Date() }] });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
}
async function buildPass(m, opts) {
  const k = (opts && opts.keys) || await keys();
  const w = (opts && opts.wwdr) || await wwdr();
  const files = [['pass.json', Buffer.from(JSON.stringify(passJson(m, k)))]];
  for (const [n, b64] of Object.entries(IMAGES)) files.push([n, Buffer.from(b64, 'base64')]);
  const manifest = {};
  for (const [n, d] of files) manifest[n] = crypto.createHash('sha1').update(d).digest('hex');
  const mbuf = Buffer.from(JSON.stringify(manifest));
  files.push(['manifest.json', mbuf], ['signature', sign(mbuf, k, w)]);
  return zip(files);
}

// ---------- tell phones a card changed (Apple push, empty payload) ----------
async function pushUpdate(serial) {
  let tokens = [];
  try { tokens = await server('push_tokens', { serial }) || []; } catch (e) { return { sent: 0, error: String(e.message) }; }
  if (!tokens.length) return { sent: 0 };
  const k = await keys();
  return new Promise((resolve) => {
    let done = 0, sent = 0;
    const client = http2.connect('https://api.push.apple.com', { key: k.key, cert: k.cert });
    const finish = () => { if (++done === tokens.length) { client.close(); resolve({ sent }); } };
    client.on('error', () => { try { client.close(); } catch (e) {} resolve({ sent, error: 'apns_connect' }); });
    for (const t of tokens) {
      const req = client.request({ ':method': 'POST', ':path': '/3/device/' + t, 'apns-topic': k.passTypeId });
      req.on('response', (h) => { const st = h[':status']; if (st === 200) sent++; if (st === 410 || st === 400) server('drop_token', { push: t }).catch(() => {}); });
      req.on('error', finish); req.on('end', finish); req.on('close', () => {});
      req.resume(); req.end('{}');
    }
    setTimeout(() => { try { client.close(); } catch (e) {} resolve({ sent, timeout: true }); }, 8000);
  });
}

module.exports = { rpc, server, staff, keys, wwdr, buildPass, passJson, cardState, pushUpdate, SITE, WALLET_URL, forge };
