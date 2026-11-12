/* Every website form posts here (track.js routes them). Only real people get through:
 *   - the email must be valid and able to receive mail (format, typo check, no throwaway inboxes, real mail server)
 *   - obvious bots are dropped silently (too fast, Gmail dot pattern, random-letter names, same email used under a
 *     different name in the last 24 hours)
 * Real leads are saved to the leads list (Supabase) and forwarded to Formspree for the email alert.
 *   POST /api/lead { form: '<formspree id>', data: {...form fields}, page, lang, ms, trap }
 *   → 200 { ok: true }  ·  422 { error: 'message for the visitor', field: 'email' }
 */
const { checkEmail, botReason } = require('./_lib/leadcheck');

const SUPA_URL = 'https://iwtkphupsobwiaiqvkok.supabase.co';
const SUPA_KEY = 'sb_publishable_L1RcJTZ1UTT_XocBLPLSYg_tPpPFWbU'; // public key: anyone may add a lead, only coaches read them
const FORMS = { xvzdnogv: 'guide', mdayvono: 'enquiry' };
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };

function send(res, code, obj) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}
const cut = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));

// same email submitted under a different name recently = a bot rotating fake identities
async function nameClash(email, name) {
  try {
    const since = new Date(Date.now() - 864e5).toISOString();
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/lead_name_clash`, { method: 'POST', headers: H, body: JSON.stringify({ p_email: email, p_name: name || '', p_since: since }) });
    return r.ok ? (await r.json()) === true : false;
  } catch (e) { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const b = await readBody(req);
  const formId = String(b.form || '').replace(/[^\w-]/g, '').slice(0, 40);
  const d = b.data && typeof b.data === 'object' ? b.data : {};
  if (!FORMS[formId]) return send(res, 400, { error: 'Unknown form' });
  const lang = cut(b.lang, 10) || 'en';
  const name = cut(d.name || d.firstName || d.first_name || d.full_name, 200);
  const rawEmail = d.email || d._replyto;

  const c = await checkEmail(rawEmail, lang);
  if (c.error) return send(res, 422, { error: c.error, field: 'email' });
  const email = c.email;

  const why = botReason({ email, name, ms: typeof b.ms === 'number' ? b.ms : null, trap: b.trap }) || ((await nameClash(email, name)) ? 'same email, different name' : '');
  if (why) { console.log('lead dropped:', why, email); return send(res, 200, { ok: true }); } // bots see success, nothing is saved

  d.email = email; if (d._replyto) d._replyto = email;
  const row = { form: FORMS[formId], subject: cut(d._subject, 300), name, email, phone: cut(d.phone || d.whatsapp || d.mobile, 60), source: cut(d.source, 300), page: cut(b.page, 500), language: lang, data: Object.assign({}, d, { email_checked: true }) };
  const [saved, alert] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/leads`, { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify(row) }).then((r) => r.ok).catch(() => false),
    fetch('https://formspree.io/f/' + formId, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) }).then((r) => r.ok).catch(() => false)
  ]);
  if (!saved && !alert) return send(res, 502, { error: 'Sorry, something went wrong. Please try again or message us on WhatsApp.' });
  return send(res, 200, { ok: true });
};
