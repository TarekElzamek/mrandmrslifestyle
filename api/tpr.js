/* The Pilates Room rewards card: Chloe's check-in page talks to this.
 * POST { pin, action, args } → runs the action in the database (PIN checked there, with a lockout after
 * repeated wrong PINs), then tells the client's phone to refresh the card when something changed.
 */
const tpr = require('./_lib/tpr');

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}
const ACTIONS = ['check', 'list', 'get', 'add', 'session', 'undo', 'set_sessions', 'free_add', 'free_gift', 'free_use', 'reward_given', 'edit', 'archive'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const b = await readJson(req);
  if (!process.env.TPR_SECRET) return send(res, b.action === 'ping' ? 200 : 503, b.action === 'ping' ? { on: false } : { error: 'not_configured' });
  if (b.action === 'ping') {
    // used by the Setup tab: is the server switched on, and does its secret match the database?
    try { await tpr.server('member_by_serial', { serial: '-' }); return send(res, 200, { on: true }); }
    catch (e) { return send(res, 200, { on: false, error: 'secret_mismatch' }); }
  }
  if (ACTIONS.indexOf(b.action) < 0) return send(res, 400, { error: 'bad_action' });
  try {
    const r = await tpr.staff(String(b.pin || ''), b.action, b.args || {}) || {};
    if (r.error) return send(res, r.error === 'wrong_pin' || r.error === 'locked' ? 401 : 400, r);
    if (r.member && r.member.share_code) r.member.card_url = tpr.SITE + '/pilates-room/card/' + r.member.share_code;
    if (r.members) r.members.forEach((m) => { m.card_url = tpr.SITE + '/pilates-room/card/' + m.share_code; });
    if (r.changed && r.member) {
      try { r.push = await tpr.pushUpdate(r.member.serial); } catch (e) { r.push = { sent: 0, error: e.code || 'push_failed' }; }
    }
    return send(res, 200, r);
  } catch (e) {
    console.error('tpr', e);
    return send(res, 500, { error: 'server_error' });
  }
};
