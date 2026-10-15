// Live Google rating + review count for the website.
// Needs one environment variable in Vercel: GOOGLE_PLACES_API_KEY
// Optional: GOOGLE_PLACE_ID (found automatically if not set).
// Result is cached at Vercel's edge for 6 hours, so Google is called only a few times a day.
module.exports = async (req, res) => {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  res.setHeader('Content-Type', 'application/json');
  if (!key) { res.statusCode = 503; return res.end(JSON.stringify({ error: 'not configured' })); }
  const fields = 'id,displayName,rating,userRatingCount,googleMapsUri';
  try {
    let place;
    const pid = process.env.GOOGLE_PLACE_ID;
    if (pid) {
      const r = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(pid), {
        headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fields }
      });
      place = await r.json();
    } else {
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fields.split(',').map(f => 'places.' + f).join(',') },
        body: JSON.stringify({ textQuery: 'Mr and Mrs Lifestyle Dubai', maxResultCount: 5 })
      });
      const j = await r.json();
      place = (j.places || []).find(p => /mr\s*(and|&)\s*mrs\s*lifestyle/i.test((p.displayName && p.displayName.text) || ''));
    }
    if (!place || typeof place.userRatingCount !== 'number') {
      res.statusCode = 502; return res.end(JSON.stringify({ error: 'place not found' }));
    }
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.end(JSON.stringify({ rating: place.rating, count: place.userRatingCount, url: place.googleMapsUri || null, placeId: place.id }));
  } catch (e) {
    res.statusCode = 502; res.end(JSON.stringify({ error: 'fetch failed' }));
  }
};
