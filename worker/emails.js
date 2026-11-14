// Email templates for the brief form, in the site's identity: night band with the wordmark, a strip of pixels
// running red → coral → blue (the heat gradient, in squares), paper body, mono labels with the red ">".
// Table layout and inline styles only, so they hold up in Gmail, Outlook and Apple Mail.

const C = { night: '#0D0E1C', paper: '#F4F2EE', card: '#FBFAF7', ink: '#2C1412', strong: '#0B0A14', soft: '#6B5B5E', rule: '#E2DED6', red: '#E42114', coral: '#FF5E55', blue: '#2D36FF' };
const SANS = "'Inter Tight','Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,Consolas,'Courier New',monospace";
const SITE = 'https://vimaksh.in';
const ADDRESS = '3rd Floor, Eshaaya 1629, E End Main Rd, 4th T Block East, Jayanagar 9th Block, Bengaluru 560041';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\r?\n/g, '<br>');

// 28 squares fading from red through coral and violet to blue, some dropped out like the site's pixel edges
function pixels() {
  const stops = ['#E42114', '#F0372A', '#FF5E55', '#E0506E', '#9C2B5A', '#6A35B8', '#3A3CE8', '#2D36FF'];
  const gaps = new Set([3, 9, 14, 20, 25]);
  let cells = '';
  for (let i = 0; i < 28; i++) {
    const col = stops[Math.min(stops.length - 1, Math.floor(i / 28 * stops.length))];
    cells += `<td width="12" height="12" style="width:12px;height:12px;font-size:0;line-height:0;background:${gaps.has(i) ? C.night : col}">&nbsp;</td>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`;
}

function shell({ preheader, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Vimaksh</title></head>
<body style="margin:0;padding:0;background:${C.paper};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
  <tr><td style="background:${C.night};padding:28px 32px 22px">
    <div style="font-family:${SANS};font-weight:700;font-size:28px;letter-spacing:-1px;color:#FFFFFF;line-height:1">vimaksh</div>
    <div style="height:18px;line-height:18px;font-size:0">&nbsp;</div>
    ${pixels()}
  </td></tr>
  <tr><td style="background:${C.card};padding:34px 32px 30px;border:1px solid ${C.rule};border-top:0">${body}</td></tr>
  <tr><td style="padding:22px 32px 0;font-family:${MONO};font-size:11px;line-height:1.7;letter-spacing:.4px;color:${C.soft}">
    VIMAKSH · ${esc(ADDRESS)}<br>
    <a href="mailto:hq@vimaksh.in" style="color:${C.soft}">hq@vimaksh.in</a> · <a href="${SITE}" style="color:${C.soft}">vimaksh.in</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

const label = t => `<div style="font-family:${MONO};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${C.soft};margin:0 0 10px"><span style="color:${C.red}">&gt;</span> ${esc(t)}</div>`;
const button = (href, text) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.red}"><a href="${href}" style="display:inline-block;padding:14px 20px;font-family:${MONO};font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#FFFFFF;text-decoration:none">${esc(text)}&nbsp;&nbsp;&gt;</a></td></tr></table>`;

function rows(items) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.rule}">${items.map(([k, v]) => `
    <tr><td width="120" valign="top" style="padding:12px 0;border-bottom:1px solid ${C.rule};font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.soft}">${esc(k)}</td>
    <td valign="top" style="padding:12px 0;border-bottom:1px solid ${C.rule};font-family:${SANS};font-size:15px;color:${C.strong}">${v}</td></tr>`).join('')}</table>`;
}

// ---------- To the team ----------
export function teamEmail(b) {
  const subject = `New brief: ${b.name}${b.company ? ' · ' + b.company : ''}`;
  const tel = b.phone.replace(/[^\d+]/g, '');
  const replySubject = encodeURIComponent('Re: your project brief to Vimaksh');
  const body = `
    ${label('New project brief')}
    <div style="font-family:${SANS};font-weight:600;font-size:30px;letter-spacing:-1px;line-height:1.1;color:${C.strong};margin:0 0 6px">${esc(b.name)}</div>
    <div style="font-family:${SANS};font-size:15px;color:${C.soft};margin:0 0 26px">${b.company ? esc(b.company) + ' · ' : ''}${esc(b.receivedAt)}</div>
    ${rows([
      ['Email', `<a href="mailto:${esc(b.email)}" style="color:${C.strong}">${esc(b.email)}</a>`],
      ['Phone', `<a href="tel:${esc(tel)}" style="color:${C.strong}">${esc(b.phone)}</a>`],
      ['Company', b.company ? esc(b.company) : `<span style="color:${C.soft}">Not given</span>`],
    ])}
    <div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
    ${label('Their brief')}
    <div style="border-left:3px solid ${C.red};background:${C.paper};padding:16px 18px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink}">${nl(b.message)}</div>
    <div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
    ${button(`mailto:${esc(b.email)}?subject=${replySubject}`, `Reply to ${b.name.split(/\s+/)[0]}`)}
    <div style="font-family:${MONO};font-size:11px;color:${C.soft};margin:16px 0 0">Hitting reply also goes straight to ${esc(b.email)}.${b.page ? ' Sent from ' + esc(b.page) + '.' : ''}</div>`;
  const text = `New project brief\n\nName: ${b.name}\nEmail: ${b.email}\nPhone: ${b.phone}\nCompany: ${b.company || '-'}\nReceived: ${b.receivedAt}\n\n${b.message}\n`;
  return { subject, html: shell({ preheader: `${b.name}: ${b.message.slice(0, 90)}`, body }), text };
}

// ---------- To the person who wrote in ----------
export function confirmEmail(b) {
  const first = b.name.split(/\s+/)[0];
  const subject = 'We’ve received your brief · Vimaksh';
  const excerpt = b.message.length > 600 ? b.message.slice(0, 600) + '…' : b.message;
  const body = `
    ${label('Brief received')}
    <div style="font-family:${SANS};font-weight:600;font-size:30px;letter-spacing:-1px;line-height:1.1;color:${C.strong};margin:0 0 18px">Thanks, ${esc(first)}.</div>
    <p style="font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink};margin:0 0 14px">We’ve received your request and will get back to you soon, usually within two working days. Someone from the team reads every brief personally.</p>
    <p style="font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink};margin:0 0 26px">If you think of anything else, just reply to this email. It comes straight to us.</p>
    ${label('What you sent')}
    <div style="border-left:3px solid ${C.red};background:${C.paper};padding:16px 18px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink}">${nl(excerpt)}</div>
    <div style="height:30px;line-height:30px;font-size:0">&nbsp;</div>
    ${button(SITE + '/#work', 'See what we’ve built')}
    <div style="height:30px;line-height:30px;font-size:0">&nbsp;</div>
    <p style="font-family:${SANS};font-size:15px;line-height:1.5;color:${C.ink};margin:0">Talk soon,<br><strong style="color:${C.strong}">Team Vimaksh</strong></p>`;
  const text = `Thanks, ${first}.\n\nWe've received your request and will get back to you soon, usually within two working days. If you think of anything else, just reply to this email.\n\nWhat you sent:\n${excerpt}\n\nTalk soon,\nTeam Vimaksh\nhq@vimaksh.in · vimaksh.in\n`;
  return { subject, html: shell({ preheader: 'We’ve got your brief and will get back to you soon.', body }), text };
}
