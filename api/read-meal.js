/* Mr & Mrs Lifestyle tracker: estimate the calories in a meal from a photo.
 *
 * Uses Google Gemini on its FREE tier (same key as read-inbody). A signed-in client takes a photo of their meal;
 * we ask Gemini to list each food with an estimated weight and its calories and macros, and return that list so
 * the app can show it for the client to check and edit before adding it to their food log. Nothing is stored here.
 *
 * Settings (Vercel → Project → Settings → Environment Variables):
 *   GEMINI_API_KEY   free key from Google AI Studio   required
 *   GEMINI_MODEL     optional, default "gemini-flash-lite-latest"
 */
const SUPA_URL = 'https://iwtkphupsobwiaiqvkok.supabase.co';
const SUPA_KEY = 'sb_publishable_L1RcJTZ1UTT_XocBLPLSYg_tPpPFWbU'; // public key, same as in the app
const API = 'https://generativelanguage.googleapis.com/v1beta';

const PROMPT = `Look at this photo of a meal or drink. It was taken in Dubai, so expect Arabic, Emirati, Indian, Asian and international dishes and typical UAE restaurant or home portions.
List every separate food or drink you can see, with your best estimate of the weight in grams (or ml for drinks) shown in the photo, and its calories and macros for that amount. Count visible sauces, oil, dressings and bread. If something is partly hidden, make a sensible estimate.
Reply with ONLY this JSON object:
{"is_food": true or false,
 "items": [{"name": short English name, "grams": number, "kcal": number, "protein": grams, "carbs": grams, "fat": grams}],
 "note": one short sentence about anything uncertain (for example hidden oil or sauce), or ""}
Eggs: for any egg dish (fried, boiled, poached, scrambled, omelette, frittata) also count the eggs. Add "count": the number of eggs, and "egg_type": "whole" if yolks are used or "white" if it looks like egg whites only. Name it by how it was cooked: a flat egg folded or rolled with no separate runny yolk is an omelette, an egg with a visible separate yolk is fried, small soft curds are scrambled. Keep grams and kcal for the whole egg dish including any oil or butter.
Protein shakes: for a whey or protein shake (often in a shaker bottle), add "scoops": your best guess of the scoops of powder (usually 1), and "mixed_with": "milk" only if you can clearly see it is milky, otherwise "water".
Numbers only, no units. If the photo does not show food or drink, return {"is_food": false, "items": []}.`;

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
        generationConfig: Object.assign({ temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 1200 }, cfg ? { thinkingConfig: cfg } : {})
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

  // 4) Clean up the answer: sensible items only
  let data;
  try { data = JSON.parse((text.match(/\{[\s\S]*\}/) || ['{}'])[0]); } catch (e) { data = {}; }
  if (!data.is_food) return send(res, 200, { is_food: false, model: used });
  const n = (v, max) => { v = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v; return typeof v === 'number' && isFinite(v) && v >= 0 && v <= max ? v : null; };
  const items = (Array.isArray(data.items) ? data.items : []).slice(0, 12).map(it => {
    const o = { name: String(it && it.name || '').slice(0, 60).trim(), grams: n(it.grams, 3000), kcal: n(it.kcal, 4000), protein: n(it.protein, 300), carbs: n(it.carbs, 600), fat: n(it.fat, 300) };
    if (o.grams != null) o.grams = Math.round(o.grams);
    const sc = n(it.scoops, 4); if (sc != null && sc >= 0.5) { o.scoops = Math.max(1, Math.round(sc)); o.mixed_with = it.mixed_with === 'milk' ? 'milk' : 'water'; }
    const c = n(it.count, 12); if (c != null && c >= 1) { o.count = Math.round(c); o.egg_type = it.egg_type === 'white' ? 'white' : 'whole'; }
    if (o.kcal != null) o.kcal = Math.round(o.kcal);
    ['protein', 'carbs', 'fat'].forEach(k => { if (o[k] != null) o[k] = Math.round(o[k] * 10) / 10; });
    return o;
  }).filter(o => o.name && o.kcal != null);
  return send(res, 200, { is_food: true, items, note: String(data.note || '').slice(0, 200), model: used, secs: Math.round((Date.now() - started) / 1000) });
};
