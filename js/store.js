/* store.js — امنیت (رمز و قفل)، پشتیبان‌گیری و بازیابی */
'use strict';

/* ======================= رمز ورود ======================= */
function _fallbackHash(str) {           // فقط برای محیط‌هایی که crypto.subtle ندارند (غیر HTTPS)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let r = 0; r < 2000; r++) {
    for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  }
  return 'f' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}
async function hashPass(pass, salt) {
  if (self.crypto && crypto.subtle) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120000 }, key, 256);
    return 'p' + Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return _fallbackHash(salt + '|' + pass);
}
const hasPass = () => !!S.settings.passHash;
async function setPassword(pass) {
  if (!pass || pass.length < 4) throw new Error('رمز باید حداقل ۴ کاراکتر باشد');
  S.settings.passSalt = uid() + uid();
  S.settings.passHash = await hashPass(enDigits(pass), S.settings.passSalt);
  await DB.saveSettings();
  await audit('تعیین/تغییر رمز ورود', 'settings', 'password');
}
async function removePassword() {
  S.settings.passHash = null; S.settings.passSalt = null;
  await DB.saveSettings();
  await audit('حذف رمز ورود', 'settings', 'password');
}
async function checkPassword(pass) {
  if (!S.settings.passHash) return true;
  return (await hashPass(enDigits(pass), S.settings.passSalt)) === S.settings.passHash;
}

/* ======================= پشتیبان‌گیری ======================= */
const BACKUP_APP = 'mehr-family-fund';
const BACKUP_VERSION = 1;

function blobToDataUrl(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
async function dataUrlToBlob(u) { const r = await fetch(u); return r.blob(); }

async function buildBackup(includeDocs) {
  const docs = [];
  if (includeDocs !== false) {
    for (const meta of S.docs) {
      const blob = await DB.getDocBlob(meta.id);
      docs.push({ meta, data: blob ? await blobToDataUrl(blob) : null });
    }
  }
  return {
    app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: Date.now(), exportedDate: todayJ(),
    counts: { members: S.members.length, tx: S.tx.length, loans: S.loans.length },
    settings: S.settings, members: S.members, tx: S.tx, loans: S.loans, requests: S.requests,
    lotteries: S.lotteries, audit: S.audit, docs
  };
}
function backupFileName() { return 'mehr-fund-backup-' + todayJ().replace(/\//g, '-') + '.json'; }

/** اعتبارسنجی فایل پشتیبان قبل از هر تغییری در اطلاعات فعلی */
function validateBackup(b) {
  if (!b || b.app !== BACKUP_APP) throw new Error('این فایل، پشتیبان «صندوق خانوادگی مهر» نیست');
  if (b.version > BACKUP_VERSION) throw new Error('این پشتیبان با نسخه‌ی جدیدتری از برنامه ساخته شده است');
  for (const k of ['members', 'tx', 'loans', 'requests', 'lotteries', 'audit', 'docs']) if (!Array.isArray(b[k])) throw new Error('ساختار فایل پشتیبان ناقص است (' + k + ')');
  if (!b.settings || typeof b.settings !== 'object') throw new Error('تنظیمات در فایل پشتیبان یافت نشد');
  const ids = new Set();
  for (const t of b.tx) {
    if (!t.id || !(t.amount > 0) || !parseJ(t.date)) throw new Error('یکی از تراکنش‌های پشتیبان نامعتبر است');
    if (ids.has(t.id)) throw new Error('شناسه‌ی تراکنش تکراری در پشتیبان');
    ids.add(t.id);
  }
  for (const m of b.members) if (!m.id) throw new Error('یکی از اعضا در پشتیبان نامعتبر است');
  return true;
}
async function restoreBackup(b) {
  validateBackup(b);
  // نسخه‌ی ایمنی از وضعیت فعلی پیش از جایگزینی
  const snap = await buildBackup(false);
  await DB.setKV('preRestoreSnapshot', snap);
  await DB.wipeAll();
  for (const m of b.members) await DB.save('members', m);
  for (const t of b.tx) await DB.save('tx', t);
  for (const l of b.loans) await DB.save('loans', l);
  for (const r of b.requests) await DB.save('requests', r);
  for (const l of b.lotteries) await DB.save('lotteries', l);
  for (const a of b.audit) await DB.save('audit', a);
  for (const d of b.docs) { if (d.data) await DB.saveDocBlob(d.meta, await dataUrlToBlob(d.data)); }
  S.settings = mergeSettings(b.settings);
  await DB.saveSettings();
  S.tx.sort((a, b) => a.no - b.no);
  await audit('بازیابی اطلاعات از پشتیبان', 'system', 'restore', null, { from: b.exportedDate, counts: b.counts });
}
async function restorePreSnapshot() {
  const snap = await DB.getKV('preRestoreSnapshot');
  if (!snap) throw new Error('نسخه‌ی ایمنی موجود نیست');
  await DB.wipeAll();
  for (const k of ['members', 'tx', 'loans', 'requests', 'lotteries', 'audit']) for (const x of snap[k]) await DB.save(k, x);
  S.settings = mergeSettings(snap.settings);
  await DB.saveSettings();
  S.tx.sort((a, b) => a.no - b.no);
}
async function markBackupDone() {
  S.settings.lastBackup = todayJ();
  await DB.saveSettings();
}
function backupDue() {
  const d = S.settings.lastBackup;
  if (!d) return S.tx.length > 0 || S.members.length > 0 ? 'هنوز هیچ نسخه‌ی پشتیبانی نگرفته‌اید' : '';
  const days = diffDaysJ(d, todayJ());
  return days >= S.settings.backupReminderDays ? 'آخرین پشتیبان‌گیری ' + faDigits(days) + ' روز پیش بوده است' : '';
}
