# The Pilates Room by Chloe — website

Static, fast site (no monthly platform fees). Booking requests go to WhatsApp (+971 54 701 1995).

## Edit
All text, prices and settings live in `build.py` (CONFIG, PRICES, STRIPE). After editing run:

    python3 build.py

## Launch on Vercel (free)
1. vercel.com → Add New → Project → import this repository → Deploy (no settings needed; `vercel.json` handles clean URLs).
2. Project → Settings → Domains → add `thepilatesroombychloe.com` and `www.thepilatesroombychloe.com`, then set the DNS records Vercel shows at the domain registrar (Name.com).
3. Google Search Console → submit `https://thepilatesroombychloe.com/sitemap.xml`.

## Optional
- `CONFIG['ga_id']` — Google Analytics ID.
- `CONFIG['formspree']` — Formspree form ID to also receive booking requests by email.
- `STRIPE['private-10'] = 'https://buy.stripe.com/...'` — payment links shown after a booking request.
- Replace the arch artworks with studio photos when ready.
