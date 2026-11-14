// Vimaksh site worker: serves the static site and handles the project brief form.
// POST /api/brief  →  1) the brief to hq@vimaksh.in (reply goes straight to the sender)
//                      2) a "we've got it" confirmation to the sender
// Mail goes out through Resend from services@mail.vimaksh.in. The API key is a secret:
//   local:  .dev.vars           RESEND_API_KEY=re_...
//   live:   npx wrangler secret put RESEND_API_KEY
import { teamEmail, confirmEmail } from './emails.js';

const FROM = 'Vimaksh <services@mail.vimaksh.in>';
const TEAM = 'hq@vimaksh.in';
const LIMITS = { name: 120, email: 200, phone: 40, company: 160, message: 5000 };

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function send(env, mail) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, ...mail }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

async function brief(request, env) {
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'Mail is not configured yet.' }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ ok: false, error: 'Bad request.' }, 400); }

  // Bots: a hidden field people never fill, and a form sent faster than a person could type it.
  if (input.website || (Number(input.elapsed) > 0 && Number(input.elapsed) < 2500)) return json({ ok: true });

  const b = {};
  for (const k of Object.keys(LIMITS)) b[k] = String(input[k] ?? '').trim().slice(0, LIMITS[k]);
  const missing = ['name', 'email', 'phone', 'message'].filter(k => !b[k]);
  if (missing.length) return json({ ok: false, error: `Please fill in: ${missing.join(', ')}.` }, 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email)) return json({ ok: false, error: 'Please check your email address.' }, 422);
  if (b.phone.replace(/\D/g, '').length < 7) return json({ ok: false, error: 'Please check your phone number.' }, 422);

  b.receivedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
  b.page = String(input.page || '').slice(0, 200);

  try {
    const team = teamEmail(b);
    await send(env, { to: [TEAM], reply_to: b.email, subject: team.subject, html: team.html, text: team.text });
  } catch (e) {
    console.error('team mail failed', e.message);
    return json({ ok: false, error: 'We could not send your brief just now.' }, 502);
  }
  try {
    const c = confirmEmail(b);
    await send(env, { to: [b.email], reply_to: TEAM, subject: c.subject, html: c.html, text: c.text });
  } catch (e) {
    console.error('confirmation mail failed', e.message);   // the brief reached us; don't fail the form over this
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/brief') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return brief(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
