/* Mr & Mrs Lifestyle tracker: read an InBody result sheet from a photo.
 *
 * The tracker app sends a photo (JPEG, base64) taken by a signed-in client or coach.
 * We check the person is signed in to the tracker, ask Claude (vision) to read the
 * InBody numbers, and return them so the app can fill in the "Log a scan" form.
 * The client always checks the numbers before saving. Nothing is stored here.
 *
 * Settings (Vercel → Project → Settings → Environment Variables):
 *   ANTHROPIC_API_KEY   Anthropic API key (sk-ant-...)   required
 *   ANTHROPIC_MODEL     optional, default "claude-sonnet-5-5"
 */
const SUPA_URL = 'https://iwtkphupsobwiaiqvkok.supabase.co';
const SUPA_KEY = 'sb_publishable_L1RcJTZ1UTT_XocBLPLSYg_tPpPFWbU'; // public key, same as in the app

// [field, min, max, integer?]  (same ranges as the app)
const FIELDS = [
  ['weight', 25, 350], ['muscle_mass', 5, 120], ['fat_mass', 1, 200], ['body_fat', 2, 75],
  ['inbody_score', 0, 120, true], ['visceral_fat', 1, 30, true], ['bmr', 500, 5000, true]
];

const PROMPT = `This photo should show an InBody body composition result sheet (any InBody model, any language).
Read the CURRENT result values (not the normal ranges, not the history table, not previous results) and reply with ONLY a JSON object, no other text:
{"is_inbody": true or false,
 "date": "YYYY-MM-DD" (the test date/time printed on the sheet) or null,
 "weight": kg or null,
 "muscle_mass": Skeletal Muscle Mass (SMM) in kg or null,
 "fat_mass": Body Fat Mass in kg or null,
 "body_fat": Percent Body Fat (PBF) in % or null,
 "inbody_score": InBody Score (points, out of 100) or null,
 "visceral_fat": Visceral Fat Level (whole number) or null,
 "bmr": Basal Metabolic Rate in kcal or null}
Use numbers only (no units). If a value is not clearly readable, use null rather than guessing. If the sheet is in lb, convert to kg. If the photo is not an InBody sheet (for example a progress photo), return {"is_inbody": false}.`;

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'not_configured' });

  // 1) Only signed-in tracker users can use this
  const auth = req.headers.authorization || '';
  if (!/^Bearer\s+\S+/.test(auth)) return send(res, 401, { error: 'sign_in_required' });
  try {
    const u = await fetch(SUPA_URL + '/auth/v1/user', { headers: { apikey: SUPA_KEY, Authorization: auth } });
    if (!u.ok) return send(res, 401, { error: 'sign_in_required' });
  } catch (e) { return send(res, 502, { error: 'auth_check_failed' }); }

  // 2) The photo
  const body = await readBody(req);
  const img = String(body.image || '').replace(/^data:image\/\w+;base64,/, '');
  if (!img || img.length < 1000) return send(res, 400, { error: 'no_image' });
  if (img.length > 4000000) return send(res, 413, { error: 'image_too_large' });

  // 3) Ask Claude to read the sheet
  let text = '';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } },
          { type: 'text', text: PROMPT }
        ] }]
      })
    });
    const j = await r.json();
    if (!r.ok) { console.error('anthropic error', r.status, j && j.error); return send(res, 502, { error: 'ai_failed' }); }
    text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  } catch (e) { console.error(e); return send(res, 502, { error: 'ai_failed' }); }

  // 4) Clean up the answer: only numbers in sensible ranges
  let data;
  try { data = JSON.parse((text.match(/\{[\s\S]*\}/) || ['{}'])[0]); } catch (e) { data = {}; }
  if (!data.is_inbody) return send(res, 200, { is_inbody: false });
  const out = { is_inbody: true, values: {} };
  FIELDS.forEach(([k, min, max, int]) => {
    let v = data[k];
    if (typeof v === 'string') v = parseFloat(v.replace(',', '.'));
    if (typeof v !== 'number' || !isFinite(v) || v < min || v > max) return;
    out.values[k] = int ? Math.round(v) : Math.round(v * 10) / 10;
  });
  if (typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    const d = new Date(data.date + 'T00:00:00Z'), now = new Date();
    if (!isNaN(d) && d <= now && d.getUTCFullYear() >= 2015) out.date = data.date;
  }
  return send(res, 200, out);
};
