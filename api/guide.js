/* Free guide (Dubai Transformation Blueprint): the PDF is only given to people who prove their email is real.
 *
 *   POST /api/guide   { name, email, goal, company }  → checks the email (format, real mail server, not a throwaway
 *                     address) and emails a personal download link. "company" is a hidden trap field: bots fill it.
 *   GET  /api/guide?t=<token>  → the link from that email: valid for 7 days, saves the verified lead, sends the PDF.
 *
 * Uses RESEND_API_KEY (already set for the Stripe emails) and TPR_SECRET (to sign the links).
 */
const crypto = require('crypto');
const dns = require('dns').promises;

const SITE = 'https://www.mrandmrslifestyle.com';
const SUPA_URL = 'https://iwtkphupsobwiaiqvkok.supabase.co';
const SUPA_KEY = 'sb_publishable_L1RcJTZ1UTT_XocBLPLSYg_tPpPFWbU'; // public key: anyone may add a lead, only coaches read them
const FORMSPREE_GUIDE = 'xvzdnogv';
const LINK_DAYS = 7;

// throwaway inbox services people use to grab freebies
const DISPOSABLE = new Set(('mailinator.com guerrillamail.com guerrillamail.net guerrillamailblock.com sharklasers.com grr.la 10minutemail.com 10minutemail.net ' +
  'tempmail.com temp-mail.org temp-mail.io tempmail.net tempmailo.com tempail.com tempr.email yopmail.com yopmail.net yopmail.fr trashmail.com ' +
  'trashmail.de getnada.com nada.email maildrop.cc dispostable.com fakeinbox.com mailnesia.com throwawaymail.com emailondeck.com mohmal.com ' +
  'burnermail.io mintemail.com spamgourmet.com moakt.com mailcatch.com mytemp.email tmpmail.org tmpmail.net emailfake.com fakemail.net ' +
  'inboxkitten.com mailpoof.com spambox.us discard.email mail.tm internxt.com 1secmail.com 1secmail.org 1secmail.net').split(' '));
// common typos of real providers: suggest the fix instead of sending to nowhere
const TYPOS = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com',
  'gnail.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com' };

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const key = () => 'guide-link:' + (process.env.TPR_SECRET || '');
function sign(payload) { const body = b64u(JSON.stringify(payload)); return body + '.' + b64u(crypto.createHmac('sha256', key()).update(body).digest()); }
function verify(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const want = b64u(crypto.createHmac('sha256', key()).update(body).digest());
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); return p.x > Date.now() ? p : null; } catch (e) { return null; }
}

function send(res, code, obj) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}

// Is this an address that can actually receive email?
async function checkEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9._%+'-]+@([a-z0-9-]+\.)+[a-z]{2,}$/.test(email) || /\.\.|^\.|\.@/.test(email)) return { error: 'Please enter a valid email address.' };
  const domain = email.split('@')[1];
  if (TYPOS[domain]) return { error: `Did you mean ${email.split('@')[0]}@${TYPOS[domain]}? Please check your email address.` };
  if (DISPOSABLE.has(domain)) return { error: 'Please use your personal email address (temporary inboxes are not accepted).' };
  let mx = [];
  try { mx = await dns.resolveMx(domain); } catch (e) { mx = []; }
  if (!mx.length || mx.every((m) => !m.exchange || m.exchange === '.')) return { error: `We couldn't find a mailbox at "${domain}". Please check your email address.` };
  return { email };
}

function emailHtml(first, link) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;"><tr><td align="center" style="padding:0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#111111;">
<tr><td align="center" style="padding:30px 20px 10px;"><img src="${SITE}/logo.png" width="120" alt="Mr &amp; Mrs Lifestyle" style="display:block;width:120px;height:auto;border:0;"></td></tr>
<tr><td style="padding:16px 22px 6px;font-family:Arial,Helvetica,sans-serif;color:#f2ede3;font-size:16px;line-height:1.65;">
<div style="color:#C9A84C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;margin-bottom:10px;">Your free guide</div>
<p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#ffffff;">The Dubai Transformation Blueprint</p>
<p style="margin:0 0 16px;">Hi ${esc(first)},</p>
<p style="margin:0 0 22px;">Thanks for confirming your email. Tap the button below to download your free blueprint: the nutrition strategy, training framework and mindset shifts our clients use to transform.</p>
</td></tr>
<tr><td style="padding:0 22px 8px;"><a href="${link}" style="display:block;background:#C9A84C;color:#0a0a0a;text-decoration:none;text-align:center;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;letter-spacing:1px;text-transform:uppercase;padding:17px 20px;border-radius:6px;">Download my blueprint</a></td></tr>
<tr><td style="padding:12px 22px 26px;font-family:Arial,Helvetica,sans-serif;color:#9a9488;font-size:13px;line-height:1.6;">
<p style="margin:0 0 14px;">The link is personal and works for ${LINK_DAYS} days.</p>
<p style="margin:0 0 6px;color:#f2ede3;">Want help putting it into action? <a href="${SITE}/apply.html" style="color:#C9A84C;">Apply for a free coaching call</a>.</p>
<p style="margin:16px 0 0;color:#f2ede3;">Tarek &amp; Chloe<br><span style="color:#9a9488;">Mr &amp; Mrs Lifestyle · Dubai</span></p>
</td></tr>
<tr><td style="padding:16px 22px;border-top:1px solid #222;font-family:Arial,Helvetica,sans-serif;color:#77716a;font-size:12px;line-height:1.5;">You're getting this because this email was entered on mrandmrslifestyle.com to receive the free guide. If that wasn't you, ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = async (req, res) => {
  const url = new URL(req.url, SITE);
  try {
    // ---- the link from the email ----
    if (req.method === 'GET') {
      const p = verify(url.searchParams.get('t'));
      if (!p) { res.statusCode = 302; res.setHeader('Location', '/free-guide.html?link=expired'); return res.end(); }
      if (url.searchParams.get('f') !== 'pdf') {
        // first visit: save the verified lead, then download from the thank-you page
        const lead = { form: 'guide', subject: 'Free Blueprint download (email verified)', name: p.n, email: p.e, source: 'Free Blueprint Download Page · email verified', page: SITE + '/free-guide.html', data: { goal: p.g || null, verified: true } };
        await Promise.all([
          fetch(SUPA_URL + '/rest/v1/leads', { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(lead) }).catch(() => {}),
          fetch('https://formspree.io/f/' + FORMSPREE_GUIDE, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ _subject: '📋 Verified Blueprint download: ' + p.n, _replyto: p.e, name: p.n, email: p.e, goal: p.g || '', source: 'Free Blueprint (email verified)' }) }).catch(() => {})
        ]);
        res.statusCode = 302; res.setHeader('Location', '/free-guide.html?verified=1#t=' + encodeURIComponent(url.searchParams.get('t'))); return res.end();
      }
      const pdf = require('./_lib/guide-pdf');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Dubai-Transformation-Blueprint.pdf"');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Robots-Tag', 'noindex');
      return res.end(pdf);
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const b = await readBody(req);
    if (b.company) return send(res, 200, { ok: true }); // trap field filled: a bot. Pretend it worked, send nothing.
    const name = String(b.name || '').trim().slice(0, 60);
    if (!name) return send(res, 400, { error: 'Please enter your first name.' });
    const c = await checkEmail(b.email);
    if (c.error) return send(res, 400, { error: c.error });
    if (!process.env.RESEND_API_KEY || !process.env.TPR_SECRET) return send(res, 503, { error: 'Sorry, something went wrong. Please try again later.' });

    const token = sign({ e: c.email, n: name, g: String(b.goal || '').slice(0, 80), x: Date.now() + LINK_DAYS * 864e5 });
    const link = SITE + '/api/guide?t=' + token;
    // the same address can only trigger one email per hour, so the form can't be used to flood someone's inbox
    const idem = 'guide-' + crypto.createHash('sha256').update(c.email + '|' + Math.floor(Date.now() / 3600e3)).digest('hex').slice(0, 40);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': idem },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Mr & Mrs Lifestyle <info@mrandmrslifestyle.com>',
        to: [c.email], reply_to: 'info@mrandmrslifestyle.com',
        subject: 'Your free Dubai Transformation Blueprint',
        html: emailHtml(name, link),
        text: `Hi ${name},\n\nThanks for confirming your email. Download your free Dubai Transformation Blueprint here (valid for ${LINK_DAYS} days):\n${link}\n\nTarek & Chloe\nMr & Mrs Lifestyle`
      })
    });
    if (!r.ok && r.status !== 409) { console.error('guide email', r.status, (await r.text()).slice(0, 300)); return send(res, 502, { error: 'We could not send the email. Please check your address and try again.' }); }
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('guide', e);
    return send(res, 500, { error: 'Sorry, something went wrong. Please try again.' });
  }
};
