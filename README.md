# mrandmrslifestyle
## Brand fonts (standard for every page)
- **Headings & gold accent words:** DM Serif Display (regular + italic, one weight only — never set it bold)
- **Body text, menus, buttons, forms:** DM Sans (300–700)
- Both load from one Google Fonts link on every page; shared rules live in `site.css`.
- **Arabic pages (/ar/):** Tajawal (DM fonts have no Arabic letters)

## Workout tracker (`/workout-tracker.html`)
- App code lives in `tracker/` (`app.js`, `app.css`, `exercises.js`, manifest + icons). Database: Supabase project "workout tracker" (Seoul).
- Sign-in: Google (Supabase Auth). Each user gets a row in `profiles` automatically.
- Security: row-level security on every table. Clients see only their own data; `profiles.role = 'coach'` sees and manages all clients. Full setup in `tracker/schema.sql`.
- Make someone a coach (Supabase SQL editor): `update public.profiles set role = 'coach' where email = 'their@gmail.com';`
- Progress photos are in the private `progress-photos` storage bucket, one folder per user.
- Free Supabase projects pause after 7 days with no activity; resume from the Supabase dashboard if the tracker stops loading.
