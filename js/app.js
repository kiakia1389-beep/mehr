/* app.js — راه‌اندازی، قفل برنامه، منو */
'use strict';

const MENU = [
  ['dashboard', 'داشبورد', 'home'], ['members', 'مدیریت اعضا', 'members'], ['shares', 'سهم‌های ماهانه', 'shares'],
  ['loans', 'مدیریت وام‌ها', 'loans'], ['queue', 'نوبت وام و ضمانت‌ها', 'queue'], ['tx', 'دریافت و پرداخت', 'tx'],
  ['status', 'وضعیت اعضا', 'status'], ['reports', 'گزارش‌ها', 'reports'], ['docs', 'اسناد و مدارک', 'docs'],
  ['messages', 'پیام‌رسانی', 'msg'], ['settings', 'تنظیمات', 'settings'], ['backup', 'پشتیبان‌گیری', 'backup']
];
const BOTTOM = [['dashboard', 'داشبورد', 'home'], ['members', 'اعضا', 'members'], ['shares', 'سهم‌ها', 'shares'], ['loans', 'وام‌ها', 'loans'], ['tx', 'مالی', 'tx']];

function applyBrand() {
  $('#brandName').textContent = S.settings.fundName;
  $('#brandLogo').innerHTML = S.settings.logo ? '<img src="' + S.settings.logo + '" alt="">' : LOGO_SVG;
  document.title = S.settings.fundName;
}
function buildChrome() {
  $('#drawerList').innerHTML = MENU.map(m => '<a data-act="goto" data-to="' + m[0] + '">' + ic(m[2], 22) + '<span>' + m[1] + '</span></a>').join('');
  $('#bottomNav').innerHTML = BOTTOM.map(m => '<a data-nav="' + m[0] + '" data-act="goto" data-to="' + m[0] + '">' + ic(m[2], 24) + '<span>' + m[1] + '</span></a>').join('') + '<a data-act="drawer">' + ic('menu', 24) + '<span>منو</span></a>';
}
ACT.drawer = () => $('#drawer').classList.toggle('open');
ACT['drawer-close'] = () => $('#drawer').classList.remove('open');

/* ---------- قفل ---------- */
let _locked = false;
function lockApp() {
  if (!hasPass()) { toast('ابتدا رمز تعیین کنید', 'err'); return; }
  _locked = true;
  const L = $('#lock');
  L.className = 'lock show';
  L.innerHTML = '<div class="lock-box">' + logoHtml('logo xl') + '<h2>' + esc(S.settings.fundName) + '</h2><p>برای ورود، رمز را وارد کنید</p><form id="lockForm"><input id="lockPw" class="inp ltr center" type="password" autocomplete="off" autofocus placeholder="رمز ورود"><div class="err" id="lockErr"></div><button class="btn primary block" type="submit">ورود</button></form></div>';
  setTimeout(() => { const i = $('#lockPw'); if (i) i.focus(); }, 50);
}
let _fails = 0, _until = 0;
document.addEventListener('submit', async e => {
  if (e.target.id !== 'lockForm') return;
  e.preventDefault();
  const err = $('#lockErr');
  if (Date.now() < _until) { err.textContent = 'لطفاً ' + faDigits(Math.ceil((_until - Date.now()) / 1000)) + ' ثانیه صبر کنید'; return; }
  if (await checkPassword($('#lockPw').value)) { _fails = 0; _locked = false; $('#lock').className = 'lock'; $('#lock').innerHTML = ''; }
  else { _fails++; if (_fails >= 3) { _until = Date.now() + Math.min(60000, 5000 * _fails); } err.textContent = 'رمز اشتباه است'; $('#lockPw').value = ''; }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && S.settings && S.settings.autoLock && hasPass() && !_locked) lockApp(); });

/* ---------- شروع ---------- */
async function boot() {
  buildChrome();
  try {
    await DB.open();
    await DB.loadAll();
  } catch (e) {
    $('#view').innerHTML = '<div class="card err"><h3>خطا در ذخیره‌سازی</h3><p>' + esc(e.message) + '</p><p>اگر از حالت ناشناس مرورگر استفاده می‌کنید، آن را خارج کنید و دوباره باز کنید.</p></div>';
    return;
  }
  if (navigator.storage && navigator.storage.persist) { try { await navigator.storage.persist(); } catch (x) { /* ignore */ } }
  applyBrand();
  if (!location.hash) location.hash = '#/dashboard';
  render();
  if (hasPass()) lockApp();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
  $('#splash') && $('#splash').remove();
}
window.addEventListener('error', e => { console.error(e.error || e.message); });
window.addEventListener('unhandledrejection', e => { console.error(e.reason); toast((e.reason && e.reason.message) || 'خطا', 'err'); });
document.addEventListener('DOMContentLoaded', boot);
