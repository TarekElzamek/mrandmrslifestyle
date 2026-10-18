/* Mr & Mrs Lifestyle: purchase confirmation emails.
 *
 * Stripe calls this endpoint after every successful checkout. It:
 *   1. checks the message really came from Stripe (signature check),
 *   2. works out which package was bought,
 *   3. for fixed-length programmes, sets the subscription to end automatically,
 *   4. emails the client a confirmation with their package details and the
 *      Subscription & Cancellation Policy, and
 *   5. emails the owner a short "new client" note.
 *
 * Settings (Vercel → Project → Settings → Environment Variables):
 *   STRIPE_SECRET_KEY      Stripe secret key (sk_live_...)
 *   STRIPE_WEBHOOK_SECRET  Signing secret of the webhook endpoint (whsec_...)
 *   RESEND_API_KEY         Resend API key (re_...)
 *   EMAIL_FROM             optional, default "Mr & Mrs Lifestyle <info@mrandmrslifestyle.com>"
 *   OWNER_EMAIL            optional, default "info@mrandmrslifestyle.com"
 */
const crypto = require('crypto');

const NOTICE_DAYS = 14;
const SITE = 'https://www.mrandmrslifestyle.com';
const WA_TAREK = 'https://wa.me/971507871515';
const WA_CHLOE = 'https://wa.me/971547011995';

/* ---------- Package facts (keep in line with packages.html) ---------- */
const PACKAGES = [
  { key: 'economy', match: /economy/i, name: 'Economy Pack', price: 'AED 299 per month', months: 0,
    coach: 'self', included: ['A ready-made 4-week beginner training programme', 'Your daily calorie and macro targets', 'Weekly self check-in sheets (no coach check-ins)', 'Email support, replies within 24 hours'] },
  { key: 'elite', match: /elite/i, name: 'Elite Coaching Experience', price: 'AED 899 per month for 3 months', months: 3, length: '12-week programme',
    coach: 'one', included: ['A training plan, nutrition and meal timing built for you by your coach', 'A weekly 1-to-1 check-in call', 'Your plan updated every 2 weeks', 'WhatsApp access to your coach, 24/7'] },
  { key: 'vip', match: /vip/i, name: 'VIP Online Coaching', price: 'AED 1,999 per month for 3 months', months: 3, length: '12-week programme',
    coach: 'one', included: ['Everything in Elite', 'A weekly check-in plus a video coaching session every 2 weeks', 'Nutrition rebuilt each phase, supplement protocol and lifestyle coaching', 'Priority WhatsApp, replies within 2 hours'] },
  { key: 'couples', match: /couple/i, name: 'Couples Transformation', price: 'AED 1,499 per month for both, for 3 months', months: 3, length: '12-week programme',
    coach: 'both', included: ['A separate training and nutrition plan for each partner', 'A shared check-in call every 2 weeks', 'WhatsApp access to your coaches, 24/7'] },
  { key: 'booty', match: /booty|glute/i, name: 'Booty Builder Programme', price: 'AED 649 per month for 3 months', months: 3, length: '12-week programme',
    coach: 'self', included: ['A 12-week glute-focused programme', 'Exercise selection for your body and your equipment (gym or home)', 'Weekly video demos', 'Email support (self-guided, no coach check-ins)'] },
  { key: 'muscle', match: /muscle/i, name: 'Ultimate Muscle Gain', price: 'AED 480 per month for 3 months', months: 3, length: '12-week programme',
    coach: 'self', included: ['A 12-week muscle-building programme', 'Calorie and protein targets for your goal', 'Email support (self-guided, no coach check-ins)'] },
  { key: 'fatburn', match: /fat ?burn|fat loss/i, name: 'Ultimate Fat Burn', price: 'AED 480 per month for 3 months', months: 3, length: '12-week programme',
    coach: 'self', included: ['A 12-week fat-loss programme, gym or home version', 'Calorie deficit and macro targets for your goal', 'Email support (self-guided, no coach check-ins)'] },
  { key: 'nutrition', match: /nutrition|meal/i, name: 'Tailor-Made Nutrition Plan', price: 'AED 750 per month for 3 months', months: 3, length: '12-week meal plan',
    coach: 'self', included: ['Your full meal plan, built around your food preferences, schedule, lifestyle and goal', 'Email support (self-guided, no coach check-ins)'] },
];

/* ---------- helpers ---------- */
function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyStripe(raw, header, secret) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')).map(([k, ...v]) => [k, v.join('=')]));
  const sigs = header.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  const t = parts.t;
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${raw.toString('utf8')}`).digest('hex');
  return sigs.some(s => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

async function stripe(path, method = 'GET', form) {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method,
    headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Stripe ' + path + ': ' + (j.error && j.error.message));
  return j;
}

async function sendEmail(msg, idempotencyKey) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(msg),
  });
  if (!r.ok) throw new Error('Resend: ' + r.status + ' ' + (await r.text()));
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });
const addMonths = (d, n) => { const x = new Date(d); const day = x.getUTCDate(); x.setUTCMonth(x.getUTCMonth() + n); if (x.getUTCDate() < day) x.setUTCDate(0); return x; };
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

/* ---------- email template ---------- */
const GOLD = '#C9A84C';
const label = t => `<div style="color:${GOLD};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;margin-bottom:8px;">${t}</div>`;
const row = (k, v) => `<tr><td style="padding:6px 12px 6px 0;color:#999;width:45%;vertical-align:top;">${k}</td><td style="padding:6px 0;color:#fff;">${v}</td></tr>`;

function buildClientEmail(o) {
  const p = o.pkg;
  const first = esc((o.name || '').split(' ')[0] || 'there');
  const coachLine = p.coach === 'one'
    ? 'Your coach is Chloe if you&rsquo;re a woman and Tarek if you&rsquo;re a man.'
    : p.coach === 'both' ? 'You&rsquo;re coached by both Tarek and Chloe.' : '';
  const steps = p.coach === 'self'
    ? [`<b style="color:#fff">We&rsquo;ll be in touch</b> by email or WhatsApp to get you started with your ${p.months ? esc(p.length) : 'programme'}.`,
       `<b style="color:#fff">Questions?</b> Just reply to this email.`]
    : [`<b style="color:#fff">We&rsquo;ll message you on WhatsApp</b> to confirm your details and start your onboarding. ${coachLine}`,
       `<b style="color:#fff">Your plan within 48 hours</b> of us receiving your details.`,
       `<b style="color:#fff">Check-ins begin</b>: ${p.key === 'couples' ? 'a shared check-in call every 2 weeks' : 'weekly'}.`];
  const stepsHtml = steps.map((s, i) => `<tr><td valign="top" style="padding:4px 12px 8px 0;color:${GOLD};font-weight:bold;">${i + 1}</td><td style="padding:4px 0 8px;">${s}</td></tr>`).join('');

  const orderRows = [
    row('Package', esc(p.name)),
    row('Price', esc(p.price)),
    row('Start date', fmt(o.start)),
  ];
  if (p.months) {
    orderRows.push(row('Payments', `${p.months} monthly payments, on the ${ordinal(Number(o.start.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Asia/Dubai' })))} of each month`));
    orderRows.push(row('Programme ends', `${fmt(o.end)} (ends automatically, nothing to cancel)`));
  } else if (o.next) {
    orderRows.push(row('Next payment', `${fmt(o.next)} (renews automatically)`));
    orderRows.push(row('Last day to cancel before next payment', fmt(o.deadline)));
  }
  orderRows.push(row('Payment reference', esc(o.ref)));

  const policy = [
    p.months
      ? `<b style="color:#fff">Monthly payments.</b> Your ${esc(p.length)} is billed monthly for ${p.months} months and ends automatically.`
      : `<b style="color:#fff">Monthly subscription.</b> You&rsquo;re charged automatically on the same date each month until you cancel.`,
    `<b style="color:#fff">No refunds.</b> Payments are non-refundable, including part-used months, unless UAE law requires a refund or we made a billing mistake (always refunded in full).`,
    p.months ? null : `<b style="color:#fff">${NOTICE_DAYS} days&rsquo; notice to cancel.</b> Tell us at least ${NOTICE_DAYS} days before your next payment date. Your coaching continues until the end of the month you&rsquo;ve paid for. Later notice means one more payment is taken and that month is your last.`,
    `<b style="color:#fff">How to cancel:</b> email info@mrandmrslifestyle.com or WhatsApp us. We confirm in writing within 2 working days.`,
    `<b style="color:#fff">Price changes</b> come with at least 30 days&rsquo; notice. If a payment fails, coaching is paused until it&rsquo;s paid.`,
  ].filter(Boolean).map(t => `<li style="margin-bottom:6px;">${t}</li>`).join('');

  const wa = p.coach === 'self' ? '' : `<p style="margin:14px 0 0;font-size:14px;"><a href="${WA_TAREK}" style="color:${GOLD};">WhatsApp Tarek</a> &nbsp;·&nbsp; <a href="${WA_CHLOE}" style="color:${GOLD};">WhatsApp Chloe</a></p>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#e9e6df;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e6df;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0a0a0a;border-radius:6px;overflow:hidden;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-family:Georgia,serif;font-size:22px;color:${GOLD};letter-spacing:1px;">MR &amp; MRS LIFESTYLE</div></td></tr>
<tr><td style="padding:16px 32px 8px;">
  <h1 style="font-family:Georgia,serif;color:#fff;font-size:28px;line-height:1.2;margin:0 0 12px;">Welcome, ${first}. You&rsquo;re in.</h1>
  <p style="color:#d8d0c0;font-size:15px;line-height:1.6;margin:0;">Thank you for joining the <b style="color:#fff">${esc(p.name)}</b>. Your payment went through. Here&rsquo;s everything you need.</p>
</td></tr>
<tr><td style="padding:20px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border-radius:6px;">
  <tr><td style="padding:18px 20px 6px;">${label('Your order')}</td></tr>
  <tr><td style="padding:0 20px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#d8d0c0;line-height:1.5;">${orderRows.join('')}</table></td></tr>
</table></td></tr>
<tr><td style="padding:24px 32px 0;">${label('What&rsquo;s included')}
  <ul style="color:#d8d0c0;font-size:14px;line-height:1.7;margin:0;padding-left:20px;">${p.included.map(i => `<li>${esc(i)}</li>`).join('')}</ul></td></tr>
<tr><td style="padding:24px 32px 0;">${label('What happens next')}
  <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;color:#d8d0c0;line-height:1.6;">${stepsHtml}</table>${wa}</td></tr>
<tr><td style="padding:28px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #3a3320;border-radius:6px;"><tr><td style="padding:18px 20px;">
  ${label('Your subscription &amp; cancellation policy')}
  <ul style="color:#d8d0c0;font-size:13px;line-height:1.6;margin:0;padding-left:18px;">${policy}</ul>
  <p style="margin:12px 0 0;font-size:13px;"><a href="${SITE}/terms.html#subscription-policy" style="color:${GOLD};">Read the full policy</a></p>
</td></tr></table></td></tr>
<tr><td style="padding:28px 32px 32px;">
  <p style="color:#d8d0c0;font-size:14px;line-height:1.6;margin:0 0 6px;">We&rsquo;re excited to work with you.</p>
  <p style="color:#fff;font-family:Georgia,serif;font-size:16px;margin:0;">Tarek &amp; Chloe<br><span style="color:#999;font-family:Arial,sans-serif;font-size:12px;">Mr &amp; Mrs Lifestyle · Dubai</span></p>
</td></tr>
<tr><td style="padding:16px 32px;background:#111;color:#777;font-size:11px;line-height:1.6;text-align:center;">This email confirms your purchase. Your card receipt comes separately from Stripe.<br>Mr &amp; Mrs Lifestyle · info@mrandmrslifestyle.com · mrandmrslifestyle.com</td></tr>
</table></td></tr></table></body></html>`;
}

function buildOwnerEmail(o) {
  const p = o.pkg;
  return `<p><b>New client:</b> ${esc(o.name)} bought <b>${esc(p ? p.name : o.itemName)}</b>.</p>
<ul><li>Email: ${esc(o.email)}</li><li>Phone: ${esc(o.phone || 'not given at checkout')}</li><li>Amount: ${esc(o.amount)}</li><li>Start: ${fmt(o.start)}</li>
${o.next && !(p && p.months) ? `<li>Next payment: ${fmt(o.next)} (cancel deadline ${fmt(o.deadline)})</li>` : ''}${p && p.months ? `<li>Ends automatically: ${fmt(o.end)}</li>` : ''}
<li>Reference: ${esc(o.ref)}</li></ul>
${p ? '<p>The confirmation email has been sent to the client.</p>' : '<p><b>Note:</b> the product name did not match a package, so no confirmation email was sent to the client. Please contact them directly.</p>'}`;
}

/* ---------- handler ---------- */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !RESEND_API_KEY) { res.status(503).send('Not configured'); return; }

  const raw = await readRaw(req);
  if (!verifyStripe(raw, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET)) { res.status(400).send('Bad signature'); return; }

  const event = JSON.parse(raw.toString('utf8'));
  if (event.type !== 'checkout.session.completed') { res.status(200).json({ ignored: event.type }); return; }

  try {
    const s = event.data.object;
    if (s.payment_status && s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') { res.status(200).json({ skipped: 'unpaid' }); return; }

    const items = await stripe(`checkout/sessions/${s.id}/line_items?limit=5`);
    const itemName = (items.data[0] && items.data[0].description) || '';
    const pkg = PACKAGES.find(p => p.match.test(itemName));

    const start = new Date(s.created * 1000);
    let next = null, end = null;
    if (s.subscription) {
      const sub = await stripe(`subscriptions/${s.subscription}`);
      const periodEnd = sub.current_period_end || (sub.items && sub.items.data[0] && sub.items.data[0].current_period_end);
      if (periodEnd) next = new Date(periodEnd * 1000);
      if (pkg && pkg.months) {
        end = addMonths(start, pkg.months);
        if (!sub.cancel_at) await stripe(`subscriptions/${s.subscription}`, 'POST', { cancel_at: String(Math.floor(end.getTime() / 1000)) });
      }
    } else if (pkg && pkg.months) {
      end = addMonths(start, pkg.months);
    } else if (pkg) {
      next = addMonths(start, 1);
    }
    const deadline = next ? new Date(next.getTime() - NOTICE_DAYS * 86400000) : null;

    const cd = s.customer_details || {};
    const o = {
      pkg, itemName, start, next, end, deadline,
      name: cd.name || '', email: cd.email || s.customer_email, phone: cd.phone,
      amount: (s.amount_total / 100).toLocaleString('en-US') + ' ' + String(s.currency || '').toUpperCase(),
      ref: 'MML-' + String(s.id).slice(-6).toUpperCase(),
    };
    const from = process.env.EMAIL_FROM || 'Mr & Mrs Lifestyle <info@mrandmrslifestyle.com>';
    const owner = process.env.OWNER_EMAIL || 'info@mrandmrslifestyle.com';

    if (pkg && o.email) {
      await sendEmail({ from, to: [o.email], reply_to: owner, subject: `You're in! Your ${pkg.name} is confirmed`, html: buildClientEmail(o) }, event.id + '-client');
    }
    await sendEmail({ from, to: [owner], subject: `New client: ${o.name || o.email} bought ${pkg ? pkg.name : itemName}`, html: buildOwnerEmail(o) }, event.id + '-owner');

    res.status(200).json({ ok: true, package: pkg ? pkg.key : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message }); // Stripe retries automatically
  }
};

module.exports.buildClientEmail = buildClientEmail;
module.exports.PACKAGES = PACKAGES;
module.exports.verifyStripe = verifyStripe;
