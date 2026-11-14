// Email and phone checks for the brief form. The same rules run in the browser (as you type) and in the
// worker (worker/index.js imports this file), so nothing slips through by skipping the page.

const EMAIL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/i;

// Returns an error message, or '' when the address looks deliverable.
export function checkEmail(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return 'Please enter your email.';
  if (v.length > 254 || !EMAIL.test(v)) return 'Please enter a valid email, like name@company.com.';
  const [local, domain] = v.toLowerCase().split('@');
  if (local.length > 64) return 'Please enter a valid email, like name@company.com.';
  const typos = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gamil.com': 'gmail.com', 'yahooo.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com' };
  if (typos[domain]) return `Did you mean ${local}@${typos[domain]}?`;
  return '';
}

// Indian mobiles: 10 digits starting 6–9, with or without +91 / 91 / 0. Other countries: start with +country code,
// 8–15 digits in all (the E.164 limit). Spaces, dashes, dots and brackets are fine.
export function checkPhone(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return 'Please enter your phone number.';
  if (!/^\+?[\d\s().-]+$/.test(v)) return 'Use digits only, with an optional + country code.';
  const d = v.replace(/\D/g, '');
  const intl = v.startsWith('+');
  let national = null;
  if (intl && d.startsWith('91')) national = d.slice(2);
  else if (!intl && d.length === 12 && d.startsWith('91')) national = d.slice(2);
  else if (!intl && d.length === 11 && d.startsWith('0')) national = d.slice(1);
  else if (!intl) national = d;
  if (national !== null) {
    if (national.length !== 10) return intl || d.length > 10 ? 'Indian numbers have 10 digits after +91.' : 'Please enter a 10-digit mobile number, or add your country code (+…).';
    if (!/^[6-9]/.test(national)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
    if (/^(\d)\1{9}$/.test(national)) return 'Please enter a real phone number.';
    return '';
  }
  if (d.length < 8 || d.length > 15) return 'International numbers have 8 to 15 digits, including the country code.';
  return '';
}

// A tidy version to store and show: +91 98765 43210 for India, otherwise +<digits> as typed.
export function formatPhone(raw) {
  const v = String(raw ?? '').trim(), d = v.replace(/\D/g, '');
  const n = v.startsWith('+') ? (d.startsWith('91') ? d.slice(2) : null) : d.length === 12 ? d.slice(2) : d.length === 11 ? d.slice(1) : d;
  if (n && n.length === 10 && /^[6-9]/.test(n)) return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  return '+' + d;
}
