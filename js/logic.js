/* logic.js — قوانین مالی صندوق: اعضا، سهم‌ها، وام‌ها، تراکنش‌ها، نوبت و آمار */
'use strict';

/* ======================= تنظیمات ======================= */
const DEFAULT_TEMPLATES = {
  share: { title: 'یادآوری پرداخت سهم ماهانه', text: 'سلام {name} عزیز 🌿\nیادآوری سهم ماهانه {fund} برای {month}: مبلغ {amount}.\nبا تشکر از همراهی شما.' },
  installment: { title: 'یادآوری اقساط وام', text: 'سلام {name} عزیز\nقسط وام شما به مبلغ {amount} سررسید {date} است. لطفاً در زمان مقرر پرداخت فرمایید.\n{fund}' },
  loanPaid: { title: 'اطلاع‌رسانی پرداخت وام', text: 'سلام {name} عزیز\nوام {amount} از {fund} در تاریخ {date} به شما پرداخت شد. مبارک باشد 🌸' },
  newPeriod: { title: 'اعلام شروع دوره جدید', text: 'اعضای محترم {fund}\nدوره جدید از {date} آغاز می‌شود. سهم ماهانه: {amount}.' },
  newShare: { title: 'اعلام مبلغ جدید سهم', text: 'اعضای محترم {fund}\nمبلغ سهم ماهانه از {month} برابر {amount} تعیین شد.' },
  newLoan: { title: 'اعلام مبلغ جدید وام', text: 'اعضای محترم {fund}\nمبلغ وام دوره جدید {amount} تعیین شد.' },
  meeting: { title: 'اطلاع‌رسانی جلسات', text: 'اعضای محترم {fund}\nجلسه صندوق در تاریخ {date} برگزار می‌شود. حضور شما موجب خوشحالی است.' },
  lottery: { title: 'اعلام نتیجه قرعه‌کشی', text: 'اعضای محترم {fund}\nنتیجه قرعه‌کشی وام در تاریخ {date}: {name}\nبه همه تبریک می‌گوییم.' },
  greeting: { title: 'تبریک مناسبت‌ها', text: 'اعضای عزیز {fund}\nمناسبت {date} را به همه شما تبریک می‌گوییم 🌹' },
  debt: { title: 'اعلام بدهی اعضا', text: 'سلام {name} عزیز\nمانده بدهی شما به {fund} تا تاریخ {date}: {amount}.\nلطفاً نسبت به تسویه اقدام فرمایید.' }
};

const DEFAULT_SETTINGS = {
  fundName: 'صندوق خانوادگی مهر',
  currency: 'تومان',
  shareAmount: 500000,
  shareHistory: [],               // [{from:'1404/07', amount}] — تغییر مبلغ سهم روی گذشته اثر نمی‌گذارد
  loanAmount: 25000000,
  instCount: 25,
  instAmount: 1000000,
  loanCapacity: 1,                // تعداد وام قابل پرداخت در هر نوبت
  guarantorCount: 2,
  startMonth: '1404/07',          // شروع دوره مالی (ماه اول سهم‌ها)
  fiscalYear: 1405,
  dueDay: 10,                     // از این روز ماه به بعد، سهم همان ماه «سررسیدشده» حساب می‌شود
  backupReminderDays: 14,
  lastBackup: null,
  passHash: null,
  passSalt: null,
  autoLock: true,
  logo: null,
  templates: {},
  nextTxNo: 1,
  nextLoanNo: 1,
  nextMemberCode: 1
};

function mergeSettings(v) {
  const s = Object.assign({}, DEFAULT_SETTINGS, v || {});
  s.templates = Object.assign({}, DEFAULT_TEMPLATES, (v && v.templates) || {});
  if (!Array.isArray(s.shareHistory) || !s.shareHistory.length) s.shareHistory = [{ from: s.startMonth, amount: s.shareAmount }];
  return s;
}

/** مبلغ هر سهم در یک ماه مشخص (با توجه به تاریخچه‌ی تغییرات) */
function unitFor(ym) {
  const h = S.settings.shareHistory.slice().sort((a, b) => ymCompare(a.from, b.from));
  let amt = h[0].amount;
  for (const e of h) if (ymCompare(e.from, ym) <= 0) amt = e.amount;
  return amt;
}
async function setShareAmount(newAmount, fromYm) {
  if (!(newAmount > 0)) throw new Error('مبلغ سهم باید بیشتر از صفر باشد');
  const h = S.settings.shareHistory.filter(e => e.from !== fromYm);
  h.push({ from: fromYm, amount: newAmount });
  S.settings.shareHistory = h.sort((a, b) => ymCompare(a.from, b.from));
  S.settings.shareAmount = newAmount;
  await DB.saveSettings();
  await audit('تغییر مبلغ سهم', 'settings', 'shareAmount', null, { from: fromYm, amount: newAmount });
}

/* ======================= ثبت تاریخچه ======================= */
async function audit(action, entity, entityId, before, after, reason) {
  const rec = { id: uid(), ts: Date.now(), date: todayJ(), action, entity, entityId, before: before || null, after: after || null, reason: reason || '' };
  await DB.save('audit', rec);
  return rec;
}

/* ======================= اعضا ======================= */
const fullName = m => m ? ((m.first || '') + ' ' + (m.last || '')).trim() : '—';
const memberById = id => S.members.find(m => m.id === id);
const activeMembers = () => S.members.filter(m => m.active);

async function saveMember(data) {
  const first = (data.first || '').trim(), last = (data.last || '').trim();
  if (!first && !last) throw new Error('نام عضو را وارد کنید');
  if (!parseJ(data.joinDate)) throw new Error('تاریخ عضویت معتبر نیست');
  const shares = parseInt(enDigits(data.shares), 10);
  if (!(shares >= 1)) throw new Error('تعداد سهم باید حداقل ۱ باشد');
  const unit = data.unitAmount ? parseAmount(data.unitAmount) : null;
  const dup = S.members.find(m => m.id !== data.id && normText(fullName(m)) === normText(first + ' ' + last));
  if (dup) throw new Error('عضو دیگری با همین نام وجود دارد');
  let m = data.id ? memberById(data.id) : null;
  const before = m ? JSON.parse(JSON.stringify(m)) : null;
  if (!m) {
    m = { id: uid(), code: S.settings.nextMemberCode++, active: true, createdAt: Date.now() };
    await DB.saveSettings();
  }
  Object.assign(m, { first, last, phone: (data.phone || '').trim(), joinDate: data.joinDate, shares, unitAmount: unit, note: (data.note || '').trim() });
  await DB.save('members', m);
  await audit(before ? 'ویرایش عضو' : 'افزودن عضو', 'member', m.id, before, m);
  return m;
}
async function setMemberActive(id, active) {
  const m = memberById(id);
  if (!m) throw new Error('عضو پیدا نشد');
  if (!active) {
    const loans = loansOfMember(id).filter(l => l.status === 'active');
    if (loans.length) throw new Error('این عضو وام فعال دارد و تا تسویه کامل نمی‌توان او را غیرفعال کرد');
    m.inactiveFrom = ymOf(todayJ());
  } else { delete m.inactiveFrom; }
  const before = { active: m.active };
  m.active = active;
  await DB.save('members', m);
  await audit(active ? 'فعال‌سازی عضو' : 'غیرفعال‌سازی عضو', 'member', id, before, { active });
}

/* ======================= سهم‌های ماهانه ======================= */
function lastDueMonth() {
  const t = todayJ(), cur = ymOf(t), day = +t.slice(8, 10);
  return day >= (S.settings.dueDay || 1) ? cur : ymNext(cur, -1);
}
function memberStartMonth(m) {
  const j = ymOf(m.joinDate) || S.settings.startMonth;
  return ymCompare(j, S.settings.startMonth) > 0 ? j : S.settings.startMonth;
}
function memberDueFor(m, ym) {
  if (ymCompare(ym, memberStartMonth(m)) < 0) return 0;
  if (m.inactiveFrom && ymCompare(ym, m.inactiveFrom) >= 0) return 0;
  return (m.unitAmount || unitFor(ym)) * m.shares;
}
function sharePaid(memberId, ym, excludeId) {
  return sum(S.tx.filter(t => !t.voided && t.category === 'share' && t.memberId === memberId && t.forMonth === ym && t.id !== excludeId), t => t.amount);
}
function shareMonthInfo(m, ym) {
  const due = memberDueFor(m, ym), paid = sharePaid(m.id, ym);
  let status = 'none';
  if (due > 0) status = paid >= due ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
  return { ym, due, paid, rest: Math.max(0, due - paid), status };
}
function memberDueMonths(m) {
  const end = lastDueMonth(), start = memberStartMonth(m);
  return ymCompare(start, end) > 0 ? [] : ymRange(start, end);
}
function memberShareTotals(m) {
  let due = 0, unpaid = 0, unpaidMonths = 0;
  for (const ym of memberDueMonths(m)) {
    const i = shareMonthInfo(m, ym);
    due += i.due; unpaid += i.rest; if (i.rest > 0) unpaidMonths++;
  }
  const paid = sum(S.tx.filter(t => !t.voided && t.category === 'share' && t.memberId === m.id), t => t.amount);
  return { due, paid, unpaid, unpaidMonths };
}
/** وضعیت سهم ماه جاری برای همه‌ی اعضای فعال */
function currentMonthShareStatus(ym) {
  ym = ym || ymOf(todayJ());
  const rows = activeMembers().map(m => Object.assign({ member: m }, shareMonthInfo(m, ym))).filter(r => r.due > 0);
  return {
    ym, rows,
    paid: rows.filter(r => r.status === 'paid'),
    partial: rows.filter(r => r.status === 'partial'),
    unpaid: rows.filter(r => r.status === 'unpaid'),
    receivedSum: sum(rows, r => Math.min(r.paid, r.due)),
    dueSum: sum(rows, r => r.due)
  };
}

/* ======================= وام‌ها ======================= */
const loanById = id => S.loans.find(l => l.id === id);
const loansOfMember = id => S.loans.filter(l => l.memberId === id && l.status !== 'cancelled');

function loanInstallments(loan) {
  const out = [], today = todayJ();
  for (let i = 1; i <= loan.count; i++) {
    let amount = loan.instAmount;
    if (i === loan.count) { const last = loan.amount - loan.instAmount * (loan.count - 1); if (last > 0) amount = last; }
    const paid = sum(S.tx.filter(t => !t.voided && t.category === 'installment' && t.loanId === loan.id && t.instNo === i), t => t.amount);
    const due = addMonthsJ(loan.startDate, i - 1);
    const done = paid >= amount;
    out.push({ no: i, due, amount, paid, rest: Math.max(0, amount - paid), status: done ? 'paid' : paid > 0 ? 'partial' : 'unpaid', overdue: !done && due < today });
  }
  return out;
}
function loanPaidSum(loan) {
  return sum(S.tx.filter(t => !t.voided && t.category === 'installment' && t.loanId === loan.id), t => t.amount);
}
function loanSummary(loan) {
  const insts = loanInstallments(loan), paid = loanPaidSum(loan);
  const remaining = Math.max(0, loan.amount - paid);
  const status = loan.status === 'cancelled' ? 'cancelled' : remaining <= 0 ? 'settled' : 'active';
  return {
    insts, paid, remaining, status,
    paidCount: insts.filter(i => i.status === 'paid').length,
    remainCount: insts.filter(i => i.status !== 'paid').length,
    overdue: insts.filter(i => i.overdue),
    overdueSum: sum(insts.filter(i => i.overdue), i => i.rest),
    next: insts.find(i => i.status !== 'paid') || null
  };
}
/** همگام‌سازی وضعیت ذخیره‌شده‌ی وام با محاسبات */
async function refreshLoanStatus(loan) {
  const st = loanSummary(loan).status;
  if (loan.status !== st) { loan.status = st; await DB.save('loans', loan); }
}

/** بررسی شرایط دریافت وام */
function loanEligibility(memberId) {
  const reasons = [], m = memberById(memberId);
  if (!m) return { ok: false, reasons: ['عضو پیدا نشد'] };
  if (!m.active) reasons.push('عضو غیرفعال است');
  const active = loansOfMember(memberId).filter(l => loanSummary(l).status === 'active');
  if (active.length) reasons.push('وام قبلی هنوز تسویه نشده است (شماره ' + faDigits(active[0].no) + ')');
  const pend = S.requests.find(r => r.memberId === memberId && (r.status === 'pending' || r.status === 'approved'));
  if (pend) reasons.push('درخواست وام فعال در نوبت دارد');
  return { ok: reasons.length === 0, reasons };
}
/** اعضایی که شرایط عمومی وام را دارند (بدون درخواست) */
function eligibleMembers() {
  return activeMembers().filter(m => {
    const active = loansOfMember(m.id).some(l => loanSummary(l).status === 'active');
    return !active;
  });
}
function validateGuarantors(borrowerId, g1, g2) {
  const need = S.settings.guarantorCount;
  const list = [g1, g2].filter(Boolean);
  if (list.length < need) throw new Error('معرفی ' + faDigits(need) + ' ضامن الزامی است');
  if (new Set(list).size !== list.length) throw new Error('ضامن‌ها باید دو نفر متفاوت باشند');
  if (list.includes(borrowerId)) throw new Error('دریافت‌کننده نمی‌تواند ضامن خودش باشد');
  for (const g of list) { const gm = memberById(g); if (!gm) throw new Error('ضامن پیدا نشد'); }
}

function balance() {
  const live = S.tx.filter(t => !t.voided);
  return sum(live.filter(t => t.type === 'in'), t => t.amount) - sum(live.filter(t => t.type === 'out'), t => t.amount);
}
const totals = () => {
  const live = S.tx.filter(t => !t.voided);
  const inSum = sum(live.filter(t => t.type === 'in'), t => t.amount);
  const outSum = sum(live.filter(t => t.type === 'out'), t => t.amount);
  return { inSum, outSum, balance: inSum - outSum };
};

async function createLoan(d) {
  if (!d.confirmed) throw new Error('تأیید مدیر لازم است');
  const m = memberById(d.memberId);
  if (!m) throw new Error('دریافت‌کننده را انتخاب کنید');
  const el = loanEligibility(d.memberId);
  const blocking = el.reasons.filter(r => !r.startsWith('درخواست وام فعال'));
  if (blocking.length) throw new Error('ثبت وام مجاز نیست: ' + blocking.join('، '));
  validateGuarantors(d.memberId, d.g1, d.g2);
  const amount = parseAmount(d.amount), count = parseInt(enDigits(d.count), 10), inst = parseAmount(d.instAmount);
  if (!(amount > 0)) throw new Error('مبلغ وام باید بیشتر از صفر باشد');
  if (!(count >= 1)) throw new Error('تعداد اقساط معتبر نیست');
  if (!(inst > 0)) throw new Error('مبلغ قسط معتبر نیست');
  if (inst * count < amount) throw new Error('مجموع اقساط (' + fmtMoney(inst * count) + ') کمتر از مبلغ وام است');
  if (!parseJ(d.payDate)) throw new Error('تاریخ پرداخت وام معتبر نیست');
  if (!parseJ(d.startDate)) throw new Error('تاریخ شروع بازپرداخت معتبر نیست');
  if (d.startDate < d.payDate) throw new Error('شروع بازپرداخت نمی‌تواند قبل از تاریخ پرداخت وام باشد');
  if (amount > balance() && !d.allowOverBalance) throw new Error('موجودی صندوق (' + fmtMoneyUnit(balance()) + ') برای پرداخت این وام کافی نیست');
  const loan = {
    id: uid(), no: S.settings.nextLoanNo++, memberId: d.memberId, amount, payDate: d.payDate, count,
    instAmount: inst, startDate: d.startDate, g1: d.g1, g2: d.g2, note: (d.note || '').trim(),
    status: 'active', requestId: d.requestId || null, createdAt: Date.now()
  };
  await DB.saveSettings();
  await DB.save('loans', loan);
  await addTx({
    type: 'out', category: 'loan', memberId: d.memberId, amount, date: d.payDate, loanId: loan.id,
    desc: 'پرداخت وام شماره ' + loan.no + ' به ' + fullName(m), note: '', confirmed: true, _internal: true
  });
  if (d.requestId) {
    const r = S.requests.find(x => x.id === d.requestId);
    if (r) { r.status = 'done'; r.loanId = loan.id; await DB.save('requests', r); }
  }
  await audit('ثبت وام', 'loan', loan.id, null, loan);
  return loan;
}
async function updateLoanInfo(id, d) {
  const loan = loanById(id);
  if (!loan) throw new Error('وام پیدا نشد');
  const before = JSON.parse(JSON.stringify(loan));
  validateGuarantors(loan.memberId, d.g1, d.g2);
  loan.g1 = d.g1; loan.g2 = d.g2; loan.note = (d.note || '').trim();
  await DB.save('loans', loan);
  await audit('ویرایش وام', 'loan', id, before, loan);
}
async function cancelLoan(id, reason) {
  const loan = loanById(id);
  if (!loan) throw new Error('وام پیدا نشد');
  if (loanPaidSum(loan) > 0) throw new Error('برای وامی که قسط پرداخت‌شده دارد ابطال ممکن نیست');
  if (!reason) throw new Error('دلیل ابطال را بنویسید');
  const before = { status: loan.status };
  for (const t of S.tx.filter(t => t.loanId === loan.id && !t.voided)) await voidTx(t.id, 'ابطال وام: ' + reason, true);
  loan.status = 'cancelled'; loan.cancelReason = reason;
  await DB.save('loans', loan);
  await audit('ابطال وام', 'loan', id, before, { status: 'cancelled' }, reason);
}

/* ======================= تراکنش‌ها ======================= */
const IN_CATS = { share: 'سهم ماهانه', installment: 'قسط وام', misc_in: 'پرداخت متفرقه', other_in: 'سایر درآمدها' };
const OUT_CATS = { loan: 'پرداخت وام', expense: 'هزینه‌های صندوق', withdraw: 'برداشت مجاز', other_out: 'سایر هزینه‌ها' };
const catLabel = c => IN_CATS[c] || OUT_CATS[c] || c;

function validateTx(t, excludeId) {
  if (!t.confirmed) throw new Error('هیچ تراکنشی بدون تأیید مدیر ثبت نهایی نمی‌شود');
  if (t.type !== 'in' && t.type !== 'out') throw new Error('نوع تراکنش نامعتبر است');
  const cats = t.type === 'in' ? IN_CATS : OUT_CATS;
  if (!cats[t.category]) throw new Error('دسته‌بندی با نوع تراکنش سازگار نیست');
  if (!(t.amount > 0) || !Number.isFinite(t.amount)) throw new Error('مبلغ باید عددی بزرگ‌تر از صفر باشد');
  if (!parseJ(t.date)) throw new Error('تاریخ شمسی معتبر نیست');
  if (t.category === 'loan' && !t._internal) throw new Error('پرداخت وام فقط از بخش «مدیریت وام‌ها» ثبت می‌شود');
  if (['share', 'installment'].includes(t.category) && !memberById(t.memberId)) throw new Error('عضو را انتخاب کنید');
  if (t.category === 'share') {
    const m = memberById(t.memberId);
    if (!/^\d{4}\/\d{2}$/.test(t.forMonth || '')) throw new Error('ماه سهم مشخص نیست');
    const due = memberDueFor(m, t.forMonth);
    if (due <= 0) throw new Error('برای این ماه سهمی برای عضو تعریف نشده است');
    const rest = due - sharePaid(m.id, t.forMonth, excludeId);
    if (t.amount > rest) throw new Error('مبلغ بیشتر از مانده سهم ' + ymLabel(t.forMonth) + ' است (مانده: ' + fmtMoney(rest) + ')');
  }
  if (t.category === 'installment') {
    const loan = loanById(t.loanId);
    if (!loan || loan.status === 'cancelled') throw new Error('وام معتبر انتخاب نشده است');
    if (loan.memberId !== t.memberId) throw new Error('عضو با دریافت‌کننده‌ی وام یکی نیست');
    const inst = loanInstallments(loan).find(i => i.no === t.instNo);
    if (!inst) throw new Error('شماره قسط نامعتبر است');
    const paidOther = sum(S.tx.filter(x => !x.voided && x.id !== excludeId && x.category === 'installment' && x.loanId === loan.id && x.instNo === t.instNo), x => x.amount);
    if (t.amount > inst.amount - paidOther) throw new Error('مبلغ بیشتر از مانده‌ی قسط ' + faDigits(t.instNo) + ' است (مانده: ' + fmtMoney(inst.amount - paidOther) + ')');
  }
  if (t.type === 'out' && t.category !== 'loan') {
    const bal = balance() + (excludeId ? (S.tx.find(x => x.id === excludeId && !x.voided) || { type: 'in', amount: 0 }).type === 'out' ? S.tx.find(x => x.id === excludeId).amount : 0 : 0);
    if (t.amount > bal) throw new Error('موجودی صندوق (' + fmtMoney(bal) + ') برای این پرداخت کافی نیست');
  }
}
function txFingerprint(t) {
  return [t.type, t.category, t.memberId || '', t.amount, t.date, t.forMonth || '', t.loanId || '', t.instNo || '', (t.desc || '').trim()].join('|');
}

async function addTx(t) {
  validateTx(t, null);
  const fp = txFingerprint(t);
  if (!t.allowDuplicate && S.tx.some(x => !x.voided && txFingerprint(x) === fp)) {
    throw new Error('این تراکنش قبلاً با همین مشخصات ثبت شده است');
  }
  const rec = {
    id: uid(), no: S.settings.nextTxNo++, type: t.type, category: t.category, memberId: t.memberId || null,
    amount: t.amount, date: t.date, desc: (t.desc || '').trim() || catLabel(t.category), note: (t.note || '').trim(),
    forMonth: t.forMonth || null, loanId: t.loanId || null, instNo: t.instNo || null, voided: false, createdAt: Date.now()
  };
  await DB.saveSettings();
  await DB.save('tx', rec);
  await audit('ثبت تراکنش', 'tx', rec.id, null, rec);
  if (rec.loanId) { const l = loanById(rec.loanId); if (l) await refreshLoanStatus(l); }
  return rec;
}
async function editTx(id, c, reason) {
  const t = S.tx.find(x => x.id === id);
  if (!t || t.voided) throw new Error('تراکنش پیدا نشد یا ابطال شده است');
  if (!reason) throw new Error('دلیل اصلاح را بنویسید');
  const next = Object.assign({}, t, { amount: c.amount !== undefined ? c.amount : t.amount, date: c.date || t.date, desc: c.desc !== undefined ? c.desc : t.desc, note: c.note !== undefined ? c.note : t.note, confirmed: c.confirmed, _internal: t.category === 'loan' });
  validateTx(next, id);
  if (t.category === 'loan' && next.amount !== t.amount) throw new Error('مبلغ وام از طریق تراکنش قابل تغییر نیست');
  const before = JSON.parse(JSON.stringify(t));
  t.amount = next.amount; t.date = next.date; t.desc = next.desc; t.note = next.note;
  await DB.save('tx', t);
  await audit('اصلاح تراکنش', 'tx', id, before, t, reason);
  if (t.loanId) { const l = loanById(t.loanId); if (l) await refreshLoanStatus(l); }
}
/** حذف تراکنش = ابطال با ثبت سابقه؛ رکورد هرگز پاک نمی‌شود */
async function voidTx(id, reason, _internal) {
  const t = S.tx.find(x => x.id === id);
  if (!t || t.voided) throw new Error('تراکنش پیدا نشد یا قبلاً ابطال شده است');
  if (!reason) throw new Error('دلیل ابطال را بنویسید');
  if (t.category === 'loan' && !_internal) throw new Error('تراکنش پرداخت وام فقط با ابطال خود وام امکان‌پذیر است');
  const before = JSON.parse(JSON.stringify(t));
  t.voided = true; t.voidReason = reason; t.voidDate = todayJ();
  await DB.save('tx', t);
  await audit('ابطال تراکنش', 'tx', id, before, { voided: true }, reason);
  if (t.loanId) { const l = loanById(t.loanId); if (l) await refreshLoanStatus(l); }
}

/* ======================= نوبت وام و قرعه‌کشی ======================= */
const REQ_STATUS = { pending: 'در انتظار', approved: 'تأییدشده (نوبت)', rejected: 'ردشده', done: 'وام پرداخت شد', cancelled: 'لغو شد' };

async function addRequest(d) {
  const m = memberById(d.memberId);
  if (!m) throw new Error('عضو را انتخاب کنید');
  const el = loanEligibility(d.memberId);
  if (!el.ok) throw new Error('امکان درخواست وام نیست: ' + el.reasons.join('، '));
  validateGuarantors(d.memberId, d.g1, d.g2);
  const maxP = Math.max(0, ...S.requests.filter(r => r.status === 'pending').map(r => r.priority || 0));
  const r = {
    id: uid(), memberId: d.memberId, date: d.date || todayJ(), priority: d.priority ? parseInt(enDigits(d.priority), 10) : maxP + 1,
    turn: null, g1: d.g1, g2: d.g2, note: (d.note || '').trim(), status: 'pending', createdAt: Date.now()
  };
  await DB.save('requests', r);
  await audit('ثبت درخواست وام', 'request', r.id, null, r);
  return r;
}
async function setRequestStatus(id, status, turn) {
  const r = S.requests.find(x => x.id === id);
  if (!r) throw new Error('درخواست پیدا نشد');
  const before = { status: r.status, turn: r.turn };
  r.status = status;
  if (turn !== undefined) r.turn = turn;
  await DB.save('requests', r);
  await audit('تغییر وضعیت درخواست', 'request', id, before, { status, turn: r.turn });
}
async function setRequestPriority(id, priority) {
  const r = S.requests.find(x => x.id === id);
  if (!r) throw new Error('درخواست پیدا نشد');
  r.priority = priority; await DB.save('requests', r);
}
function pendingRequests() {
  return S.requests.filter(r => r.status === 'pending').sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.createdAt - b.createdAt);
}
/** قرعه‌کشی بین متقاضیان؛ نتیجه ذخیره می‌شود و برندگان به‌ترتیب نوبت می‌گیرند */
async function drawLottery(winnersCount, note) {
  const cands = pendingRequests();
  if (!cands.length) throw new Error('متقاضی در انتظاری وجود ندارد');
  const n = Math.max(1, Math.min(winnersCount, cands.length));
  const pool = cands.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = randInt(i + 1); const x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
  const winners = pool.slice(0, n);
  let turn = Math.max(0, ...S.requests.filter(r => r.status === 'approved').map(r => r.turn || 0));
  for (const w of winners) { turn++; w.status = 'approved'; w.turn = turn; await DB.save('requests', w); }
  const rec = {
    id: uid(), date: todayJ(), ts: Date.now(), note: note || '',
    candidates: cands.map(r => r.memberId), order: pool.map(r => r.memberId), winners: winners.map(r => r.memberId)
  };
  await DB.save('lotteries', rec);
  await audit('قرعه‌کشی وام', 'lottery', rec.id, null, rec);
  return rec;
}

/* ======================= وضعیت و پرونده‌ی اعضا ======================= */
function memberFinance(m) {
  const sh = memberShareTotals(m);
  const loans = loansOfMember(m.id);
  let loanTotal = 0, instPaid = 0, remaining = 0, remainCount = 0, overdueCount = 0, overdueSum = 0;
  for (const l of loans) {
    const s = loanSummary(l);
    loanTotal += l.amount; instPaid += s.paid; remaining += s.remaining; remainCount += s.status === 'active' ? s.remainCount : 0;
    overdueCount += s.overdue.length; overdueSum += s.overdueSum;
  }
  const mine = S.tx.filter(t => !t.voided && t.memberId === m.id && t.type === 'in');
  const lastPay = mine.reduce((a, t) => (t.date > a ? t.date : a), '');
  const debtor = sh.unpaid > 0 || overdueCount > 0;
  return {
    sharePaid: sh.paid, shareDue: sh.due, shareUnpaid: sh.unpaid, unpaidMonths: sh.unpaidMonths,
    loanTotal, instPaid, loanRemaining: remaining, remainCount, overdueCount, overdueSum,
    totalDebt: remaining + sh.unpaid, lastPay, debtor,
    status: !m.active ? 'inactive' : debtor ? 'debtor' : 'good',
    statusLabel: !m.active ? 'غیرفعال' : debtor ? 'بدهکار' : 'خوش‌حساب'
  };
}

/* ======================= آمار داشبورد و نمودارها ======================= */
function dashboardStats() {
  const live = S.tx.filter(t => !t.voided);
  const fin = activeMembers().map(m => ({ m, f: memberFinance(m) }));
  const cur = currentMonthShareStatus();
  const last = live.slice().sort((a, b) => (b.date + pad2(0)).localeCompare(a.date) || b.no - a.no);
  const inTx = live.filter(t => t.type === 'in').sort((a, b) => b.date.localeCompare(a.date) || b.no - a.no);
  const loansAll = S.loans.filter(l => l.status !== 'cancelled');
  const sums = loansAll.map(loanSummary);
  return {
    memberCount: activeMembers().length, memberAll: S.members.length,
    shareDeposits: sum(live.filter(t => t.category === 'share'), t => t.amount),
    balance: balance(),
    loansPaid: sum(live.filter(t => t.category === 'loan'), t => t.amount),
    installReceived: sum(live.filter(t => t.category === 'installment'), t => t.amount),
    loanRemaining: sum(sums, s => s.remaining),
    activeLoans: sums.filter(s => s.status === 'active').length,
    debtors: fin.filter(x => x.f.debtor).length,
    good: fin.filter(x => !x.f.debtor).length,
    recent: last.slice(0, 8),
    lastPayDate: inTx.length ? inTx[0].date : '',
    cur
  };
}
function monthlySeries() {
  const live = S.tx.filter(t => !t.voided);
  let first = S.settings.startMonth, lastM = ymOf(todayJ());
  for (const t of live) { const y = ymOf(t.date); if (ymCompare(y, first) < 0) first = y; if (ymCompare(y, lastM) > 0) lastM = y; }
  const months = ymRange(first, lastM);
  let run = 0;
  return months.map(ym => {
    const tx = live.filter(t => ymOf(t.date) === ym);
    const inn = sum(tx.filter(t => t.type === 'in'), t => t.amount), out = sum(tx.filter(t => t.type === 'out'), t => t.amount);
    run += inn - out;
    return {
      ym, shares: sum(tx.filter(t => t.category === 'share'), t => t.amount),
      installments: sum(tx.filter(t => t.category === 'installment'), t => t.amount),
      inn, out, balance: run
    };
  });
}

if (typeof module !== 'undefined') module.exports = {};
