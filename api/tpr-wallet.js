/* The Pilates Room rewards card: Apple Wallet web service + the client's "add your card" page.
 *
 *   GET  /pilates-room/card/<code>                       page with the Add to Apple Wallet button (shared by Chloe)
 *   GET  /api/tpr-wallet?card=<code>&f=pkpass            the signed card file
 *   Apple Wallet web service (webServiceURL = /api/tpr-wallet):
 *   POST   /v1/devices/<device>/registrations/<passType>/<serial>   phone added the card
 *   DELETE /v1/devices/<device>/registrations/<passType>/<serial>   phone removed it
 *   GET    /v1/devices/<device>/registrations/<passType>?passesUpdatedSince=<tag>
 *   GET    /v1/passes/<passType>/<serial>                           latest version of the card
 *   POST   /v1/log
 */
const tpr = require('./_lib/tpr');
const IMAGES = require('./_lib/tpr-images');

function send(res, code, body, type) {
  res.statusCode = code;
  res.setHeader('Cache-Control', 'no-store');
  if (body == null) return res.end();
  res.setHeader('Content-Type', type || 'application/json');
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tokenFrom = (req) => String(req.headers.authorization || '').replace(/^ApplePass\s+/i, '').trim();

function cardPage(m, code) {
  const st = tpr.cardState(m), first = String(m.name || '').split(' ')[0];
  const file = '/api/tpr-wallet?card=' + encodeURIComponent(code) + '&f=pkpass';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Your card · The Pilates Room by Chloe</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0}body{background:#F6F1EA;color:#3A2617;font-family:Montserrat,Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px}
.c{width:100%;max-width:420px;text-align:center}.wm{width:240px;max-width:80%}.tag{font-size:10px;letter-spacing:2px;color:#795033;text-transform:uppercase;margin-top:10px}
.card{background:#3A2617;color:#F6F1EA;border-radius:16px;padding:22px 20px;margin:26px 0 22px;text-align:left;box-shadow:0 14px 34px rgba(58,38,23,.25)}
.k{font-size:10px;letter-spacing:1.5px;color:#CDB9A6;text-transform:uppercase;font-weight:600}.v{font-family:Cinzel,serif;font-size:28px;margin:4px 0 12px}.n{font-size:15px}.g{display:grid;grid-template-columns:1fr 1fr;gap:14px 12px}.card{position:relative;padding-top:0;overflow:hidden}.bar{display:block;width:calc(100% + 40px);margin:0 -20px 14px;height:auto}.ov{position:absolute;left:20px;right:20px;top:18px}.ov .v{margin:0 0 4px}
h1{font-family:Cinzel,serif;font-weight:500;font-size:22px;letter-spacing:.5px}p{font-size:14px;line-height:1.6;color:#6F5A48;margin-top:8px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;background:#000;color:#fff;text-decoration:none;border-radius:12px;padding:15px 18px;font-weight:600;font-size:16px;margin-top:20px}
.btn svg{width:22px;height:22px}.and{display:none;background:#fff;border:1px solid #E9DED2;border-radius:12px;padding:14px;font-size:13px;color:#6F5A48;margin-top:18px;line-height:1.5}
.small{font-size:12px;color:#6F5A48;margin-top:18px}</style></head><body><div class="c">
<img class="wm" src="/pilates-room/tpr-wordmark.png" alt="The Pilates Room by Chloe"><div class="tag">The Chloe Method</div>
<div class="card"><img class="bar" alt="" src="data:image/png;base64,${IMAGES['strip@2x.png']}"><div class="ov"><div class="v">${esc(st.milestone)}</div><div class="k">${esc(st.chapter.label)}</div></div><div class="g"><div><div class="k">Member</div><div class="n">${esc(m.name)}</div></div><div style="text-align:right"><div class="k">Referral rewards</div><div class="n">${esc(st.rewards > 0 ? st.rewards + ' complimentary session' + (st.rewards === 1 ? '' : 's') : 'Refer a friend')}</div></div></div></div>
<h1>Hi ${esc(first)}, your card is ready</h1>
<p>Add your card to Apple Wallet once. Chloe records your sessions, and your card moves to the next chapter of The Chloe Method every 10 completed sessions. There is nothing for you to scan.</p>
<a class="btn" id="add" href="${file}"><svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v1H3v-1Zm0 3h18v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-8Zm12 4.5a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2h-3Z"/></svg>Add to Apple Wallet</a>
<div class="and" id="and">Google Wallet is coming soon. Your sessions are already being counted, so nothing is lost: we'll send you your Android card as soon as it's ready.</div>
<p class="small">Questions? WhatsApp <a href="https://wa.me/971547011995" style="color:#795033">+971 54 701 1995</a></p>
</div><script>if(/Android/i.test(navigator.userAgent)){document.getElementById('add').style.display='none';document.getElementById('and').style.display='block';}</script></body></html>`;
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, 'https://x');
    const q = Object.fromEntries(url.searchParams);
    const path = '/' + String(q.p || url.pathname.replace(/^\/api\/tpr-wallet\/?/, '')).replace(/^\/+/, '');
    const seg = path.split('/').filter(Boolean);

    // client's page and card file
    if (q.card) {
      const m = await tpr.server('member_by_share', { code: q.card });
      if (!m) return send(res, 404, '<p style="font-family:sans-serif;padding:24px">This card link is not valid. Please ask Chloe for a new one.</p>', 'text/html; charset=utf-8');
      if (q.f === 'pkpass') {
        const buf = await tpr.buildPass(m);
        res.setHeader('Content-Disposition', 'attachment; filename="ThePilatesRoom.pkpass"');
        res.setHeader('Last-Modified', new Date(m.updated_at).toUTCString());
        return send(res, 200, buf, 'application/vnd.apple.pkpass');
      }
      return send(res, 200, cardPage(m, q.card), 'text/html; charset=utf-8');
    }

    // Apple Wallet web service
    if (seg[0] !== 'v1') return send(res, 404, { error: 'not_found' });
    if (seg[1] === 'log') { const b = await readJson(req); console.log('wallet log', JSON.stringify(b).slice(0, 1000)); return send(res, 200, null); }

    if (seg[1] === 'devices' && seg[3] === 'registrations') {
      const device = seg[2], serial = seg[5];
      if (req.method === 'GET' && !serial) {
        const r = await tpr.server('serials_for_device', { device, since: q.passesUpdatedSince || '' });
        if (!r || !r.serials || !r.serials.length) return send(res, 204, null);
        return send(res, 200, { serialNumbers: r.serials, lastUpdated: String(r.last) });
      }
      if (!serial) return send(res, 404, null);
      if (req.method === 'POST') {
        const b = await readJson(req);
        const r = await tpr.server('register', { device, serial, token: tokenFrom(req), push: b.pushToken || '' });
        return send(res, (r && r.status) || 500, null);
      }
      if (req.method === 'DELETE') {
        const r = await tpr.server('unregister', { device, serial, token: tokenFrom(req) });
        return send(res, (r && r.status) || 500, null);
      }
      return send(res, 405, null);
    }

    if (seg[1] === 'passes' && seg[3] && req.method === 'GET') {
      const m = await tpr.server('member_by_token', { serial: seg[3], token: tokenFrom(req) });
      if (!m) return send(res, 401, null);
      const lm = new Date(m.updated_at);
      const ims = req.headers['if-modified-since'] ? new Date(req.headers['if-modified-since']) : null;
      if (ims && Math.floor(lm.getTime() / 1000) <= Math.floor(ims.getTime() / 1000)) return send(res, 304, null);
      const buf = await tpr.buildPass(m);
      res.setHeader('Last-Modified', lm.toUTCString());
      return send(res, 200, buf, 'application/vnd.apple.pkpass');
    }
    return send(res, 404, null);
  } catch (e) {
    console.error('tpr-wallet', e);
    if (e.code === 'wallet_not_set_up') return send(res, 503, '<p style="font-family:sans-serif;padding:24px">The rewards card is being set up. Please try again soon.</p>', 'text/html; charset=utf-8');
    return send(res, 500, { error: 'server_error' });
  }
};
