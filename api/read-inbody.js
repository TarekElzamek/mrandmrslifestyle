/* Mr & Mrs Lifestyle tracker: read a body composition result sheet (InBody, Medi-Ana, Tanita…) from a photo.
 *
 * Uses Google Gemini on its FREE tier (no billing needed). The tracker app sends a photo
 * taken by a signed-in client or coach; we check the person is signed in, ask Gemini to
 * read the numbers and return them so the app can fill in the "Log a scan" form.
 * The client always checks the numbers before saving. Nothing is stored here.
 *
 * Settings (Vercel → Project → Settings → Environment Variables):
 *   GEMINI_API_KEY   free key from Google AI Studio (aistudio.google.com → Get API key)   required
 *   GEMINI_MODEL     optional, default "gemini-flash-lite-latest" (falls back to other free Flash models)
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

// One call to Gemini with "thinking" switched off (reading numbers off a sheet doesn't need it) and a time limit.
async function gemini(model, key, img, ms) {
  const thinking = /gemini-2\.5/.test(model) ? { thinkingBudget: 0 } : /gemini-[3-9]/.test(model) ? { thinkingLevel: 'low' } : null;
  const call = (cfg) => {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    return fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: img } }, { text: PROMPT }] }],
        generationConfig: Object.assign({ temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 600 }, cfg ? { thinkingConfig: cfg } : {})
      })
    }).finally(() => clearTimeout(t));
  };
  try {
    let r = await call(thinking);
    if (r.status === 400 && thinking) r = await call(null); // model doesn't accept that thinking setting
    let j = {}; try { j = await r.json(); } catch (e) {}
    return { status: r.status, ok: r.ok, j };
  } catch (e) {
    // too slow: report it like a busy model so the next one is tried
    return { status: e.name === 'AbortError' ? 504 : 502, ok: false, j: { error: { message: e.name === 'AbortError' ? 'took too long' : String(e.message || e) } } };
  }
}

// Free "flash" models available to this key that can read images, best first.
async function flashModels(key) {
  try {
    const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!r.ok) return [];
    const j = await r.json();
    const ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini.*flash/.test(m.name) && !/thinking|tts|image|live|embedding|audio|preview-0[0-4]/.test(m.name));
    // Lite models first: they have by far the biggest free daily allowance (hundreds a day vs about 20).
    ok.sort((a, b) => (/lite/.test(b.name) - /lite/.test(a.name)) || b.name.localeCompare(a.name));
    return ok.map(m => m.name.replace(/^models\//, ''));
  } catch (e) { return []; }
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
  let text = '', detail = '', used = '';
  const started = Date.now(), left = () => 55000 - (Date.now() - started);
  try {
    const first = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const tried = [first];
    let { status, ok, j } = await gemini(first, key, img, Math.min(20000, left())); used = first;
    const r = () => ({ status, ok });
    // Model retired (404), no free allowance (429), busy (500/503) or too slow (504): try other free Flash models,
    // the main Flash model first.
    if ([404, 429, 500, 502, 503, 504].includes(status)) {
      const all = await flashModels(key);
      const lite = all.filter(m => /^gemini-flash-latest$/.test(m));
      const others = lite.concat(all.filter(m => !lite.includes(m))).filter(m => !tried.includes(m)).slice(0, 5);
      for (const m of others) {
        if (left() < 6000) break;
        detail = (j && j.error && j.error.message || '').slice(0, 300);
        tried.push(m); ({ status, ok, j } = await gemini(m, key, img, Math.min(20000, left() - 2000))); used = m;
        if (ok) break;
      }
    }
    const rr = r();
    if (!rr.ok) {
      detail = (j && j.error && j.error.message || detail || '').slice(0, 300);
      console.error('gemini error', rr.status, tried.join(','), detail);
      return send(res, rr.status === 429 ? 429 : 502, { error: rr.status === 429 ? 'busy' : 'ai_failed', tried, detail });
    }
    text = ((((j.candidates || [])[0] || {}).content || {}).parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  } catch (e) { console.error(e); return send(res, 504, { error: e.name === 'AbortError' ? 'timeout' : 'ai_failed', model: used }); }

  // 4) Clean up the answer: only numbers in sensible ranges
  let data;
  try { data = JSON.parse((text.match(/\{[\s\S]*\}/) || ['{}'])[0]); } catch (e) { data = {}; }
  if (!data.is_body_scan) return send(res, 200, { is_inbody: false, model: used });
  const out = { is_inbody: true, values: {}, model: used, secs: Math.round((Date.now() - started) / 1000) };
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
