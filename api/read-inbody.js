/* Mr & Mrs Lifestyle tracker: read a body composition result sheet (InBody, Medi-Ana, Tanita…) from a photo.
 *
 * Uses Google Gemini on its FREE tier (no billing needed). The tracker app sends a photo
 * taken by a signed-in client or coach; we check the person is signed in, ask Gemini to
 * read the numbers and return them so the app can fill in the "Log a scan" form.
 * The client always checks the numbers before saving. Nothing is stored here.
 *
 * Settings (Vercel → Project → Settings → Environment Variables):
 *   GEMINI_API_KEY   free key from Google AI Studio (aistudio.google.com → Get API key)   required
 *   GEMINI_MODEL     optional, default "gemini-2.5-flash" (falls back to any available Flash model)
 */
const SUPA_URL = 'https://iwtkphupsobwiaiqvkok.supabase.co';
const SUPA_KEY = 'sb_publishable_L1RcJTZ1UTT_XocBLPLSYg_tPpPFWbU'; // public key, same as in the app
const API = 'https://generativelanguage.googleapis.com/v1beta';

// [field, min, max, integer?]  (same ranges as the app)
const FIELDS = [
  ['weight', 25, 350], ['muscle_mass', 5, 120], ['fat_mass', 1, 200], ['body_fat', 2, 75],
  ['inbody_score', 0, 120, true], ['visceral_fat', 1, 30, true], ['bmr', 500, 5000, true]
];

const PROMPT = `This photo should show a body composition analyser result sheet (InBody, Medi-Ana, Tanita or similar, any language).
Read the person's CURRENT measured values. Do NOT use normal/standard ranges, "desirable" or "target" weight, weight/fat/muscle "control" values, previous results, or the history table.
Reply with ONLY this JSON object:
{"is_body_scan": true or false,
 "date": "YYYY-MM-DD" (the current test date printed on the sheet) or null,
 "weight": current body weight in kg or null,
 "muscle_mass": Skeletal Muscle Mass (SMM) in kg or null,
 "fat_mass": Body Fat Mass in kg or null,
 "body_fat": Percent Body Fat (PBF, %) or null,
 "inbody_score": the overall score out of 100 (InBody Score / Fitness Score) or null,
 "visceral_fat": Visceral Fat Level/Grade (number) or null,
 "bmr": Basal Metabolic Rate in kcal or null}
Numbers only, no units. If a value is not clearly readable, use null rather than guessing. If the sheet is in lb, convert to kg. If the photo is not a body composition sheet, return {"is_body_scan": false}.`;

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

async function gemini(model, key, img) {
  return fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: img } }, { text: PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' }
    })
  });
}

// If the default model has been retired, pick any current free "flash" model that can read images.
async function fallbackModel(key) {
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  if (!r.ok) return null;
  const j = await r.json();
  const ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /flash/.test(m.name) && !/thinking|tts|image-generation|live|embedding/.test(m.name));
  ok.sort((a, b) => (/lite/.test(a.name) - /lite/.test(b.name)) || b.name.localeCompare(a.name));
  return ok[0] ? ok[0].name.replace(/^models\//, '') : null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return send(res, 503, { error: 'not_configured' });

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

  // 3) Ask Gemini to read the sheet
  let text = '';
  try {
    let r = await gemini(process.env.GEMINI_MODEL || 'gemini-2.5-flash', key, img);
    if (r.status === 404) { const m = await fallbackModel(key); if (m) r = await gemini(m, key, img); }
    const j = await r.json();
    if (r.status === 429) return send(res, 429, { error: 'busy' }); // free daily limit reached
    if (!r.ok) { console.error('gemini error', r.status, j && j.error && j.error.message); return send(res, 502, { error: 'ai_failed' }); }
    text = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
  } catch (e) { console.error(e); return send(res, 502, { error: 'ai_failed' }); }

  // 4) Clean up the answer: only numbers in sensible ranges
  let data;
  try { data = JSON.parse((text.match(/\{[\s\S]*\}/) || ['{}'])[0]); } catch (e) { data = {}; }
  if (!data.is_body_scan) return send(res, 200, { is_inbody: false });
  const out = { is_inbody: true, values: {} };
  FIELDS.forEach(([k, min, max, int]) => {
    let v = data[k];
    if (typeof v === 'string') v = parseFloat(v.replace(',', '.'));
    if (typeof v !== 'number' || !isFinite(v) || v < min || v > max) return;
    out.values[k] = int ? Math.round(v) : Math.round(v * 10) / 10;
  });
  // sanity checks: muscle and fat can't exceed body weight
  const w = out.values.weight;
  if (w) ['muscle_mass', 'fat_mass'].forEach(k => { if (out.values[k] && out.values[k] >= w) delete out.values[k]; });
  if (typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    const d = new Date(data.date + 'T00:00:00Z'), now = new Date();
    if (!isNaN(d) && d <= now && d.getUTCFullYear() >= 2015) out.date = data.date;
  }
  return send(res, 200, out);
};
