/* Shared lead checks: is the email real, and does the submission look like a bot?
 * Used by /api/lead (every website form) so only real people reach the leads list and the email alerts. */
const dns = require('dns').promises;

// throwaway inbox services people use to grab freebies
const DISPOSABLE = new Set(('mailinator.com guerrillamail.com guerrillamail.net guerrillamailblock.com sharklasers.com grr.la 10minutemail.com 10minutemail.net ' +
  'tempmail.com temp-mail.org temp-mail.io tempmail.net tempmailo.com tempail.com tempr.email yopmail.com yopmail.net yopmail.fr trashmail.com ' +
  'trashmail.de getnada.com nada.email maildrop.cc dispostable.com fakeinbox.com mailnesia.com throwawaymail.com emailondeck.com mohmal.com ' +
  'burnermail.io mintemail.com spamgourmet.com moakt.com mailcatch.com mytemp.email tmpmail.org tmpmail.net emailfake.com fakemail.net ' +
  'inboxkitten.com mailpoof.com spambox.us discard.email mail.tm internxt.com 1secmail.com 1secmail.org 1secmail.net').split(' '));
// common typos of real providers: suggest the fix instead of losing the lead
const TYPOS = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmaill.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com' };
const AR = (lang) => String(lang || '').slice(0, 2) === 'ar';

// Is this an address that can actually receive email? Returns { email } or { error } (message shown to the visitor).
async function checkEmail(raw, lang) {
  const email = String(raw || '').trim().toLowerCase();
  const msg = (en, ar) => ({ error: AR(lang) ? ar : en });
  if (email.length > 254 || !/^[a-z0-9._%+'-]+@([a-z0-9-]+\.)+[a-z]{2,}$/.test(email) || /\.\.|^\.|\.@/.test(email)) return msg('Please enter a valid email address.', 'يرجى إدخال بريد إلكتروني صحيح.');
  const [local, domain] = email.split('@');
  if (TYPOS[domain]) return msg(`Did you mean ${local}@${TYPOS[domain]}? Please check your email address.`, `هل تقصد ${local}@${TYPOS[domain]}؟ يرجى التحقق من بريدك الإلكتروني.`);
  if (DISPOSABLE.has(domain)) return msg('Please use your personal email address (temporary inboxes are not accepted).', 'يرجى استخدام بريدك الإلكتروني الشخصي (لا نقبل البريد المؤقت).');
  let mx = [];
  try { mx = await Promise.race([dns.resolveMx(domain), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 4000))]); } catch (e) { if (e.message === 'timeout') return { email }; }
  if (!mx.length || mx.every((m) => !m.exchange || m.exchange === '.')) return msg(`We couldn't find a mailbox at "${domain}". Please check your email address.`, `لم نجد صندوق بريد على "${domain}". يرجى التحقق من بريدك الإلكتروني.`);
  return { email };
}

// Bot signals. Returns a reason string when the submission is almost certainly automated, otherwise ''.
function botReason({ email, name, ms, trap }) {
  if (trap) return 'trap field filled';
  if (typeof ms === 'number' && ms >= 0 && ms < 2500) return 'submitted too fast';
  const [local, domain] = String(email || '').split('@');
  // bots rotate Gmail addresses with dots (g.e.x.o.ciq.i.b.8.4@gmail.com): real people almost never use 3+ dots
  if (/^(gmail|googlemail)\.com$/.test(domain || '') && (local.split('+')[0].match(/\./g) || []).length >= 3) return 'gmail dot pattern';
  // random-letter names: 5+ consonants in a row (Frkwauxn Pfksx, Irgew Csqmvye)
  const n = String(name || '').toLowerCase();
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(n.replace(/sch|tch|ght|str|ngst/g, ''))) return 'random name';
  if (/[a-z]/.test(n) && n.replace(/[^a-z]/g, '').length >= 6 && !/[aeiouy]/.test(n)) return 'random name';
  return '';
}

module.exports = { checkEmail, botReason };
