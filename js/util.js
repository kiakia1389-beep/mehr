/* util.js — تاریخ شمسی، قالب‌بندی، ابزارهای عمومی */
'use strict';

/* ---------- الگوریتم تبدیل جلالی/میلادی (بر پایه jalaali-js) ---------- */
function _div(a, b) { return ~~(a / b); }
function _mod(a, b) { return a - ~~(a / b) * b; }
const _BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function _jalCal(jy) {
  const bl = _BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14, jp = _BREAKS[0], jm, jump = 0, leap, n, i;
  for (i = 1; i < bl; i += 1) {
    jm = _BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + _div(jump, 33) * 8 + _div(_mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + _div(n, 33) * 8 + _div(_mod(n, 33) + 3, 4);
  if (_mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = _div(gy, 4) - _div((_div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + _div(jump + 4, 33) * 33;
  leap = _mod(_mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function _g2d(gy, gm, gd) {
  let d = _div((gy + _div(gm - 8, 6) + 100100) * 1461, 4) + _div(153 * _mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - _div(_div(gy + 100100 + _div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function _d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + _div(_div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = _div(_mod(j, 1461), 4) * 5 + 308;
  const gd = _div(_mod(i, 153), 5) + 1;
  const gm = _mod(_div(i, 153), 12) + 1;
  const gy = _div(j, 1461) - 100100 + _div(8 - gm, 6);
  return { gy, gm, gd };
}
function _j2d(jy, jm, jd) {
  const r = _jalCal(jy);
  return _g2d(r.gy, 3, r.march) + (jm - 1) * 31 - _div(jm, 7) * (jm - 7) + jd - 1;
}
function _d2j(jdn) {
  const gy = _d2g(jdn).gy;
  let jy = gy - 621;
  const r = _jalCal(jy);
  const jdn1f = _g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + _div(k, 31), jd: _mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + _div(k, 30), jd: _mod(k, 30) + 1 };
}

function toJalali(gy, gm, gd) { return _d2j(_g2d(gy, gm, gd)); }
function toGregorian(jy, jm, jd) { return _d2g(_j2d(jy, jm, jd)); }
function isLeapJ(jy) { return _jalCal(jy).leap === 0; }
function daysInMonthJ(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJ(jy) ? 30 : 29;
}

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

const pad2 = n => String(n).padStart(2, '0');

/** تاریخ امروز به‌صورت رشته استاندارد YYYY/MM/DD (ارقام لاتین، قابل مرتب‌سازی) */
function todayJ() {
  const d = new Date();
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return j.jy + '/' + pad2(j.jm) + '/' + pad2(j.jd);
}
function parseJ(s) {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const jy = +m[1], jm = +m[2], jd = +m[3];
  if (jm < 1 || jm > 12 || jd < 1 || jd > daysInMonthJ(jy, jm)) return null;
  return { jy, jm, jd };
}
function fmtJ(jy, jm, jd) { return jy + '/' + pad2(jm) + '/' + pad2(jd); }
function ymOf(dateStr) { return String(dateStr || '').slice(0, 7); }               // 1405/08
function ymNext(ym, n) {
  const p = ym.split('/');
  let y = +p[0], m = +p[1] - 1 + (n === undefined ? 1 : n);
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  return y + '/' + pad2(m + 1);
}
function ymCompare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function ymRange(from, to) {
  const out = []; let c = from, guard = 0;
  while (ymCompare(c, to) <= 0 && guard++ < 1200) { out.push(c); c = ymNext(c, 1); }
  return out;
}
function ymLabel(ym) {
  const p = ym.split('/');
  return MONTHS[+p[1] - 1] + ' ' + faDigits(p[0]);
}
/** افزودن n ماه به یک تاریخ شمسی (روز در صورت نیاز به آخر ماه کاهش می‌یابد) */
function addMonthsJ(dateStr, n) {
  const p = parseJ(dateStr);
  if (!p) return dateStr;
  let m = p.jm - 1 + n, y = p.jy + Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  const d = Math.min(p.jd, daysInMonthJ(y, m + 1));
  return fmtJ(y, m + 1, d);
}
/** تعداد روز بین دو تاریخ شمسی (b - a) */
function diffDaysJ(a, b) {
  const pa = parseJ(a), pb = parseJ(b);
  if (!pa || !pb) return 0;
  return _j2d(pb.jy, pb.jm, pb.jd) - _j2d(pa.jy, pa.jm, pa.jd);
}
function weekdayJ(dateStr) {
  const p = parseJ(dateStr); if (!p) return '';
  const g = toGregorian(p.jy, p.jm, p.jd);
  return WEEKDAYS[new Date(g.gy, g.gm - 1, g.gd).getDay()];
}
function fmtDateLong(dateStr) {
  const p = parseJ(dateStr); if (!p) return '';
  return faDigits(p.jd) + ' ' + MONTHS[p.jm - 1] + ' ' + faDigits(p.jy);
}

/* ---------- ارقام و پول ---------- */
const FA = '۰۱۲۳۴۵۶۷۸۹';
function faDigits(v) { return String(v).replace(/\d/g, d => FA[+d]); }
function enDigits(v) {
  return String(v == null ? '' : v)
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
}
/** تبدیل ورودی کاربر (با ارقام فارسی/جداکننده) به عدد صحیح */
function parseAmount(v) {
  const s = enDigits(v).replace(/[,٬،\s]/g, '').replace(/[^\d-]/g, '');
  if (s === '' || s === '-') return 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}
function fmtNum(n) {
  n = Math.round(+n || 0);
  const neg = n < 0; const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + s;
}
function fmtMoney(n) { return faDigits(fmtNum(n)); }
function fmtMoneyUnit(n) { return fmtMoney(n) + ' ' + ((typeof S !== 'undefined' && S.settings && S.settings.currency) || 'تومان'); }
function fmtShort(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return faDigits((n / 1e9).toFixed(1).replace(/\.0$/, '')) + ' میلیارد';
  if (a >= 1e6) return faDigits((n / 1e6).toFixed(1).replace(/\.0$/, '')) + ' م';
  if (a >= 1e3) return faDigits((n / 1e3).toFixed(0)) + ' هزار';
  return faDigits(n);
}
function normText(s) {   // برای جست‌وجو: یکسان‌سازی ی/ک و ارقام
  return enDigits(String(s || '')).replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase();
}

/* ---------- عمومی ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function sum(arr, f) { let t = 0; for (const x of arr) t += f ? f(x) : x; return t; }
function randInt(n) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}

if (typeof module !== 'undefined') { module.exports = { toJalali, toGregorian, todayJ, parseJ }; }
