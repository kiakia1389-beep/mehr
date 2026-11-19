/* pages1.js — داشبورد، اعضا، پرونده‌ی عضو، سهم‌های ماهانه */
'use strict';

const statusChip = (cls, txt) => '<span class="chip ' + cls + '">' + esc(txt) + '</span>';
const memberOpts = (list, withEmpty, emptyLabel) => (withEmpty ? [['', emptyLabel || '— انتخاب کنید —']] : []).concat(list.map(m => [m.id, fullName(m) + ' (کد ' + faDigits(m.code) + ')']));
const pageHead = (title, right) => '<div class="ph"><h2>' + esc(title) + '</h2><div class="ph-r">' + (right || '') + '</div></div>';
const stat = (label, value, cls, sub) => '<div class="stat ' + (cls || '') + '"><div class="sl">' + esc(label) + '</div><div class="sv">' + value + '</div>' + (sub ? '<div class="ss">' + sub + '</div>' : '') + '</div>';

/* ======================= داشبورد ======================= */
VIEWS.dashboard = function () {
  const s = dashboardStats(), cu = s.cur, ser = monthlySeries().slice(-8);
  const labels = ser.map(x => MONTHS[+x.ym.slice(5) - 1]);
  const bu = backupDue();
  const debtItems = activeMembers().map(m => ({ label: fullName(m), value: memberFinance(m).totalDebt })).filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  const empty = !S.members.length;
  let h = '';
  if (bu) h += '<div class="banner warn">' + ic('backup', 20) + '<span>' + esc(bu) + '. بهتر است همین حالا پشتیبان بگیرید.</span><button class="btn sm" data-act="goto" data-to="backup">پشتیبان‌گیری</button></div>';
  if (empty) {
    h += '<div class="card hero-empty"><h3>به صندوق خانوادگی خوش آمدید</h3><p>برای شروع، ابتدا اعضای صندوق را ثبت کنید. سپس سهم ماهانه و وام‌ها را مدیریت کنید.</p><div class="btnrow"><button class="btn primary" data-act="member-new">' + ic('plus', 18) + ' افزودن اولین عضو</button><button class="btn" data-act="goto" data-to="backup">بازیابی از پشتیبان</button></div></div>';
  }
  h += '<div class="stats">' +
    stat('موجودی صندوق', fmtMoney(s.balance) + '<small>' + esc(S.settings.currency) + '</small>', 'big jade') +
    stat('تعداد اعضا', faDigits(s.memberCount), '', s.memberAll !== s.memberCount ? faDigits(s.memberAll - s.memberCount) + ' غیرفعال' : '') +
    stat('مجموع واریزی سهم‌ها', fmtMoney(s.shareDeposits)) +
    stat('مجموع وام‌های پرداخت‌شده', fmtMoney(s.loansPaid)) +
    stat('اقساط دریافت‌شده', fmtMoney(s.installReceived)) +
    stat('بدهی باقی‌مانده وام‌ها', fmtMoney(s.loanRemaining), 'warn') +
    stat('وام‌های فعال', faDigits(s.activeLoans)) +
    stat('اعضای بدهکار', faDigits(s.debtors), s.debtors ? 'red' : '') +
    stat('اعضای خوش‌حساب', faDigits(s.good), 'good') +
    stat('آخرین پرداخت', s.lastPayDate ? faDigits(s.lastPayDate) : '—') +
    '</div>';
  h += '<div class="card"><div class="ch"><b>سهم ماه جاری — ' + ymLabel(cu.ym) + '</b><a class="lnk" data-act="goto" data-to="shares">جزئیات</a></div>';
  if (!cu.rows.length) h += '<div class="empty small">سهمی برای این ماه تعریف نشده است</div>';
  else {
    const pct = cu.dueSum ? Math.round(cu.receivedSum * 100 / cu.dueSum) : 0;
    h += '<div class="prog"><i style="width:' + pct + '%"></i></div><div class="prog-l"><span>دریافت‌شده: ' + fmtMoney(cu.receivedSum) + '</span><span>' + faDigits(pct) + '٪</span><span>باقی‌مانده: ' + fmtMoney(cu.dueSum - cu.receivedSum) + '</span></div>' +
      '<div class="trio"><div class="t g"><b>' + faDigits(cu.paid.length) + '</b>پرداخت کرده</div><div class="t o"><b>' + faDigits(cu.partial.length) + '</b>ناقص</div><div class="t r"><b>' + faDigits(cu.unpaid.length) + '</b>پرداخت نکرده</div></div>';
  }
  h += '</div>';
  h += '<div class="card"><div class="ch"><b>مجموع واریزی ماهانه</b></div>' + barChart(labels, [{ name: 'سهم‌ها', data: ser.map(x => x.shares), color: CH.jade }]) + '</div>';
  h += '<div class="card"><div class="ch"><b>درآمد و هزینه</b></div>' + barChart(labels, [{ name: 'دریافت', data: ser.map(x => x.inn), color: CH.jade }, { name: 'پرداخت', data: ser.map(x => x.out), color: CH.gold }]) + '</div>';
  h += '<div class="card"><div class="ch"><b>اقساط دریافت‌شده</b></div>' + barChart(labels, [{ name: 'اقساط', data: ser.map(x => x.installments), color: CH.blue }]) + '</div>';
  h += '<div class="card"><div class="ch"><b>رشد موجودی صندوق</b></div>' + lineChart(labels, ser.map(x => x.balance), CH.jade) + '</div>';
  h += '<div class="card"><div class="ch"><b>بدهی اعضا</b></div>' + hbarChart(debtItems, CH.red) + '</div>';
  h += '<div class="card"><div class="ch"><b>آخرین تراکنش‌ها</b><a class="lnk" data-act="goto" data-to="tx">همه</a></div>' + (s.recent.length ? '<div class="list">' + s.recent.map(txItem).join('') + '</div>' : '<div class="empty small">هنوز تراکنشی ثبت نشده است</div>') + '</div>';
  return h;
};
function txItem(t) {
  const m = t.memberId ? memberById(t.memberId) : null;
  return '<div class="li"><div class="li-i ' + (t.type === 'in' ? 'in' : 'out') + '">' + ic(t.type === 'in' ? 'down' : 'up', 18) + '</div><div class="li-m"><b>' + esc(t.desc) + '</b><small>' + faDigits(t.date) + ' · ' + esc(catLabel(t.category)) + (m ? ' · ' + esc(fullName(m)) : '') + '</small></div><div class="li-a ' + (t.type === 'in' ? 'pos' : 'neg') + '">' + (t.type === 'in' ? '+' : '−') + fmtMoney(t.amount) + '</div></div>';
}

/* ======================= اعضا ======================= */
let memberUi = { q: '', sort: 'code', filter: 'all' };
VIEWS.members = function () {
  const q = normText(memberUi.q);
  let list = S.members.map(m => ({ m, f: memberFinance(m) }));
  if (memberUi.filter === 'active') list = list.filter(x => x.m.active);
  if (memberUi.filter === 'inactive') list = list.filter(x => !x.m.active);
  if (memberUi.filter === 'debtor') list = list.filter(x => x.f.debtor && x.m.active);
  if (q) list = list.filter(x => normText(fullName(x.m) + ' ' + x.m.phone + ' ' + x.m.code).includes(q));
  const cmp = {
    code: (a, b) => a.m.code - b.m.code, name: (a, b) => fullName(a.m).localeCompare(fullName(b.m), 'fa'),
    debt: (a, b) => b.f.totalDebt - a.f.totalDebt, paid: (a, b) => b.f.sharePaid - a.f.sharePaid, join: (a, b) => a.m.joinDate.localeCompare(b.m.joinDate)
  };
  list.sort(cmp[memberUi.sort] || cmp.code);
  let h = pageHead('مدیریت اعضا', '<button class="btn primary sm" data-act="member-new">' + ic('plus', 18) + ' عضو جدید</button>');
  h += '<div class="toolbar"><div class="searchbox">' + ic('search', 18) + '<input id="mq" class="inp" placeholder="جست‌وجوی نام، تلفن یا کد" value="' + esc(memberUi.q) + '"></div>' +
    '<select class="inp" id="msort"><option value="code">مرتب‌سازی: کد</option><option value="name">نام</option><option value="debt">بیشترین بدهی</option><option value="paid">بیشترین واریزی</option><option value="join">تاریخ عضویت</option></select>' +
    '<select class="inp" id="mfilter"><option value="all">همه</option><option value="active">فعال</option><option value="inactive">غیرفعال</option><option value="debtor">بدهکار</option></select></div>';
  h += '<div class="muted small">' + faDigits(list.length) + ' عضو</div><div class="list cards">';
  h += list.map(({ m, f }) => '<a class="mcard" data-act="goto" data-to="member/' + m.id + '"><div class="av">' + esc((m.first || m.last || '?').charAt(0)) + '</div><div class="mc-m"><b>' + esc(fullName(m)) + '</b><small>کد ' + faDigits(m.code) + ' · ' + faDigits(m.shares) + ' سهم · ' + (m.phone ? faDigits(m.phone) : 'بدون تلفن') + '</small></div><div class="mc-s">' + statusChip(f.status, f.statusLabel) + (f.totalDebt ? '<small class="neg">' + fmtMoney(f.totalDebt) + '</small>' : '') + '</div></a>').join('') || '<div class="empty">عضوی یافت نشد</div>';
  h += '</div>';
  setTimeout(() => { const s = $('#msort'), f = $('#mfilter'); if (s) s.value = memberUi.sort; if (f) f.value = memberUi.filter; }, 0);
  return h;
};
document.addEventListener('input', e => {
  if (e.target.id === 'mq') {
    memberUi.q = e.target.value;
    const pos = e.target.selectionStart; render();
    const el = $('#mq'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } }
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'msort') { memberUi.sort = e.target.value; render(); }
  if (e.target.id === 'mfilter') { memberUi.filter = e.target.value; render(); }
});

function memberFormFields(m) {
  return [
    { name: 'first', label: 'نام', required: true, half: true, value: m.first },
    { name: 'last', label: 'نام خانوادگی', required: true, half: true, value: m.last },
    { name: 'phone', label: 'شماره تماس', type: 'tel', half: true, value: m.phone },
    { name: 'joinDate', label: 'تاریخ عضویت', type: 'date', value: m.joinDate || todayJ() },
    { name: 'shares', label: 'تعداد سهم', type: 'number', half: true, value: m.shares || 1, hint: 'مبلغ ماهانه = تعداد سهم × مبلغ هر سهم' },
    { name: 'unitAmount', label: 'مبلغ هر سهم (اختیاری)', type: 'money', half: true, value: m.unitAmount || '', hint: 'خالی بماند، مبلغ عمومی صندوق (' + fmtMoney(S.settings.shareAmount) + ') اعمال می‌شود' },
    { name: 'note', label: 'توضیحات', type: 'textarea', value: m.note }
  ];
}
ACT['member-new'] = () => openForm({
  title: 'افزودن عضو جدید', fields: () => memberFormFields({}), submit: 'ثبت عضو',
  onSubmit: async v => { const m = await saveMember(v); toast('عضو ثبت شد'); go('#/member/' + m.id); }
});
ACT['member-edit'] = d => {
  const m = memberById(d.id);
  openForm({ title: 'ویرایش ' + fullName(m), fields: () => memberFormFields(m), values: {}, submit: 'ذخیره', onSubmit: async v => { v.id = m.id; await saveMember(v); toast('ذخیره شد'); render(); } });
};
ACT['member-toggle'] = async d => {
  const m = memberById(d.id), to = !m.active;
  if (!(await confirmDlg(to ? 'عضو دوباره فعال شود؟' : 'عضو «' + fullName(m) + '» غیرفعال شود؟\nسوابق مالی او حفظ می‌شود و از این ماه به بعد سهمی برایش محاسبه نمی‌شود.', { danger: !to }))) return;
  await setMemberActive(m.id, to); toast(to ? 'عضو فعال شد' : 'عضو غیرفعال شد'); render();
};
ACT.goto = d => go('#/' + d.to);

/* ======================= پرونده‌ی مالی عضو ======================= */
VIEWS.member = function (id) {
  const m = memberById(id);
  if (!m) return '<div class="empty">عضو پیدا نشد</div>';
  const f = memberFinance(m), loans = loansOfMember(m.id);
  const history = S.tx.filter(t => !t.voided && t.memberId === m.id).sort((a, b) => b.date.localeCompare(a.date) || b.no - a.no);
  const months = memberDueMonths(m).slice(-12).reverse();
  let h = '<a class="back" data-act="goto" data-to="members">' + ic('chev', 18) + ' اعضا</a>';
  h += '<div class="card prof"><div class="av lg">' + esc((m.first || '?').charAt(0)) + '</div><div class="prof-m"><h2>' + esc(fullName(m)) + '</h2><div class="muted">کد عضویت ' + faDigits(m.code) + ' · عضو از ' + fmtDateLong(m.joinDate) + '</div><div>' + statusChip(f.status, f.statusLabel) + '</div></div></div>';
  h += '<div class="btnrow wrap"><button class="btn sm" data-act="member-edit" data-id="' + m.id + '">' + ic('edit', 16) + ' ویرایش</button><button class="btn sm" data-act="member-print" data-id="' + m.id + '">' + ic('print', 16) + ' چاپ / PDF</button><button class="btn sm" data-act="member-share" data-id="' + m.id + '">' + ic('share', 16) + ' اشتراک‌گذاری</button><button class="btn sm ' + (m.active ? 'danger-o' : '') + '" data-act="member-toggle" data-id="' + m.id + '">' + (m.active ? 'غیرفعال کردن' : 'فعال کردن') + '</button></div>';
  h += '<div class="stats two">' +
    stat('تلفن', m.phone ? '<span class="ltr">' + faDigits(m.phone) + '</span>' : '—') + stat('سهم ماهانه', fmtMoney(memberDueFor(m, ymOf(todayJ())) || (m.unitAmount || unitFor(ymOf(todayJ()))) * m.shares), '', faDigits(m.shares) + ' سهم') +
    stat('سهم‌های پرداخت‌شده', fmtMoney(f.sharePaid), 'good') + stat('سهم‌های پرداخت‌نشده', fmtMoney(f.shareUnpaid), f.shareUnpaid ? 'red' : '', f.unpaidMonths ? faDigits(f.unpaidMonths) + ' ماه' : '') +
    stat('مجموع وام دریافتی', fmtMoney(f.loanTotal)) + stat('اقساط پرداخت‌شده', fmtMoney(f.instPaid)) +
    stat('اقساط باقی‌مانده', faDigits(f.remainCount), '', f.overdueCount ? faDigits(f.overdueCount) + ' قسط معوق' : '') + stat('مانده بدهی وام', fmtMoney(f.loanRemaining), f.loanRemaining ? 'warn' : '') +
    stat('آخرین پرداخت', f.lastPay ? faDigits(f.lastPay) : '—') + stat('جمع کل بدهی', fmtMoney(f.totalDebt), f.totalDebt ? 'red' : 'good') + '</div>';
  if (m.note) h += '<div class="card"><b>توضیحات</b><p>' + esc(m.note) + '</p></div>';
  h += '<div class="card"><div class="ch"><b>وضعیت سهم ماه‌های اخیر</b></div><div class="mgrid">' + (months.map(ym => { const i = shareMonthInfo(m, ym); return '<div class="mo ' + i.status + '"><b>' + MONTHS[+ym.slice(5) - 1] + '</b><small>' + (i.status === 'paid' ? 'پرداخت شد' : i.status === 'partial' ? 'مانده ' + fmtShort(i.rest) : i.status === 'unpaid' ? 'پرداخت نشده' : '—') + '</small></div>'; }).join('') || '<div class="empty small">ماه سررسیدی وجود ندارد</div>') + '</div></div>';
  if (loans.length) {
    h += '<div class="card"><div class="ch"><b>وام‌ها</b></div><div class="list">' + loans.map(l => { const s = loanSummary(l); return '<a class="li" data-act="goto" data-to="loan/' + l.id + '"><div class="li-i out">' + ic('loans', 18) + '</div><div class="li-m"><b>وام شماره ' + faDigits(l.no) + ' — ' + fmtMoney(l.amount) + '</b><small>' + faDigits(l.payDate) + ' · ' + (s.status === 'active' ? 'فعال، مانده ' + fmtMoney(s.remaining) : s.status === 'settled' ? 'تسویه‌شده' : 'ابطال‌شده') + '</small></div>' + ic('chev', 16) + '</a>'; }).join('') + '</div></div>';
  }
  h += '<div class="card"><div class="ch"><b>تاریخچه پرداخت‌ها و دریافت‌ها</b></div>' + (history.length ? '<div class="list">' + history.map(txItem).join('') + '</div>' : '<div class="empty small">تراکنشی ثبت نشده است</div>') + '</div>';
  return h;
};
function memberReportHtml(m) {
  const f = memberFinance(m);
  const history = S.tx.filter(t => !t.voided && t.memberId === m.id).sort((a, b) => a.date.localeCompare(b.date) || a.no - b.no);
  const rows = [['کد عضویت', faDigits(m.code)], ['تاریخ عضویت', fmtDateLong(m.joinDate)], ['تعداد سهم', faDigits(m.shares)], ['مجموع سهم‌های پرداخت‌شده', fmtMoney(f.sharePaid)], ['سهم‌های پرداخت‌نشده', fmtMoney(f.shareUnpaid)], ['مجموع وام دریافتی', fmtMoney(f.loanTotal)], ['اقساط پرداخت‌شده', fmtMoney(f.instPaid)], ['تعداد اقساط باقی‌مانده', faDigits(f.remainCount)], ['مانده بدهی وام', fmtMoney(f.loanRemaining)], ['آخرین تاریخ پرداخت', f.lastPay ? faDigits(f.lastPay) : '—'], ['وضعیت مالی', f.statusLabel], ['جمع کل بدهی', fmtMoney(f.totalDebt)]];
  return '<div class="rp-head"><div class="rp-fund">' + esc(S.settings.fundName) + '</div><div class="rp-title">پرونده مالی ' + esc(fullName(m)) + '</div><div class="rp-date">تاریخ تهیه: ' + faDigits(todayJ()) + ' — مبالغ به ' + esc(S.settings.currency) + '</div></div>' +
    '<table class="rp kv"><tbody>' + rows.map(r => '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</tbody></table>' +
    '<h4 class="rp-sub">تاریخچه تراکنش‌ها</h4><table class="rp"><thead><tr><th>تاریخ</th><th>نوع</th><th>شرح</th><th>مبلغ</th></tr></thead><tbody>' +
    (history.map(t => '<tr><td>' + faDigits(t.date) + '</td><td>' + (t.type === 'in' ? 'دریافت' : 'پرداخت') + '</td><td>' + esc(t.desc) + '</td><td class="n">' + fmtMoney(t.amount) + '</td></tr>').join('') || '<tr><td colspan="4" class="empty">تراکنشی ثبت نشده است</td></tr>') + '</tbody></table>';
}
ACT['member-print'] = d => printHtml(memberReportHtml(memberById(d.id)));
ACT['member-share'] = async d => {
  const m = memberById(d.id), f = memberFinance(m);
  const text = S.settings.fundName + '\nپرونده مالی ' + fullName(m) + '\nسهم‌های پرداخت‌شده: ' + fmtMoney(f.sharePaid) + '\nسهم پرداخت‌نشده: ' + fmtMoney(f.shareUnpaid) + '\nمانده وام: ' + fmtMoney(f.loanRemaining) + '\nجمع بدهی: ' + fmtMoney(f.totalDebt) + ' ' + S.settings.currency + '\nتاریخ: ' + faDigits(todayJ());
  await shareFileOrText({ title: 'پرونده مالی', text });
};

/* ======================= سهم‌های ماهانه ======================= */
let shareUi = { ym: null };
VIEWS.shares = function () {
  const ym = shareUi.ym || ymOf(todayJ());
  const cu = currentMonthShareStatus(ym);
  const rowsOf = list => list.map(r => '<div class="li"><div class="av sm">' + esc((r.member.first || '?').charAt(0)) + '</div><div class="li-m"><b>' + esc(fullName(r.member)) + '</b><small>' + faDigits(r.member.shares) + ' سهم · مبلغ ' + fmtMoney(r.due) + (r.paid ? ' · پرداخت‌شده ' + fmtMoney(r.paid) : '') + '</small></div><div class="li-a">' + (r.rest ? '<button class="btn sm primary" data-act="share-pay" data-m="' + r.member.id + '" data-ym="' + ym + '">ثبت پرداخت</button>' : '<span class="chip good">تسویه</span>') + '</div></div>').join('');
  let h = pageHead('سهم‌های ماهانه', '<button class="btn primary sm" data-act="share-pay" data-ym="' + ym + '">' + ic('plus', 18) + ' ثبت پرداخت</button>');
  h += '<div class="card"><div class="ch"><b>ماه</b><div class="mnav"><button class="icbtn" data-act="share-month" data-d="-1" aria-label="ماه قبل">' + ic('chev', 18) + '</button><span>' + ymLabel(ym) + '</span><button class="icbtn rot" data-act="share-month" data-d="1" aria-label="ماه بعد">' + ic('chev', 18) + '</button></div></div>' +
    '<div class="stats two">' + stat('مجموع سهم‌های دریافت‌شده', fmtMoney(cu.receivedSum), 'good') + stat('مجموع سهم‌های دریافت‌نشده', fmtMoney(cu.dueSum - cu.receivedSum), cu.dueSum - cu.receivedSum ? 'red' : '') + '</div>' +
    '<div class="trio"><div class="t g"><b>' + faDigits(cu.paid.length) + '</b>پرداخت کرده</div><div class="t o"><b>' + faDigits(cu.partial.length) + '</b>ناقص</div><div class="t r"><b>' + faDigits(cu.unpaid.length) + '</b>پرداخت نکرده</div></div></div>';
  h += '<div class="btnrow wrap"><button class="btn sm" data-act="share-multi">پرداخت چندماهه یکجا</button><button class="btn sm" data-act="goto" data-to="settings">تغییر مبلغ سهم</button></div>';
  if (cu.unpaid.length) h += '<div class="card"><div class="ch"><b>پرداخت نکرده‌اند (' + faDigits(cu.unpaid.length) + ')</b></div><div class="list">' + rowsOf(cu.unpaid) + '</div></div>';
  if (cu.partial.length) h += '<div class="card"><div class="ch"><b>پرداخت ناقص (' + faDigits(cu.partial.length) + ')</b></div><div class="list">' + rowsOf(cu.partial) + '</div></div>';
  if (cu.paid.length) h += '<div class="card"><div class="ch"><b>پرداخت کرده‌اند (' + faDigits(cu.paid.length) + ')</b></div><div class="list">' + rowsOf(cu.paid) + '</div></div>';
  if (!cu.rows.length) h += '<div class="empty">برای این ماه سهمی تعریف نشده یا عضوی ثبت نشده است</div>';
  const dueAll = activeMembers().map(m => ({ m, t: memberShareTotals(m) })).filter(x => x.t.unpaid > 0).sort((a, b) => b.t.unpaid - a.t.unpaid);
  h += '<div class="card"><div class="ch"><b>بدهی سهم هر عضو (تا ماه جاری)</b></div>' + (dueAll.length ? '<div class="list">' + dueAll.map(x => '<a class="li" data-act="goto" data-to="member/' + x.m.id + '"><div class="li-m"><b>' + esc(fullName(x.m)) + '</b><small>' + faDigits(x.t.unpaidMonths) + ' ماه پرداخت‌نشده</small></div><div class="li-a neg">' + fmtMoney(x.t.unpaid) + '</div></a>').join('') + '</div>' : '<div class="empty small">هیچ عضوی بدهی سهم ندارد 🎉</div>') + '</div>';
  return h;
};
ACT['share-month'] = d => { shareUi.ym = ymNext(shareUi.ym || ymOf(todayJ()), +d.d); render(); };
ACT['share-pay'] = d => {
  const ym0 = d.ym || ymOf(todayJ());
  openForm({
    title: 'ثبت پرداخت سهم ماهانه',
    values: { memberId: d.m || '', forMonth: ym0, date: todayJ() },
    fields: v => {
      const m = memberById(v.memberId), info = m && /^\d{4}\/\d{2}$/.test(v.forMonth) ? shareMonthInfo(m, v.forMonth) : null;
      return [
        { name: 'memberId', label: 'عضو', type: 'select', required: true, reload: true, options: memberOpts(activeMembers(), true) },
        { name: 'forMonth', label: 'پرداخت برای ماه', type: 'month', reload: true, hint: info ? (info.due ? 'سهم این ماه ' + fmtMoney(info.due) + ' — پرداخت‌شده ' + fmtMoney(info.paid) + ' — مانده ' + fmtMoney(info.rest) : 'برای این ماه سهمی تعریف نشده است') : '' },
        { name: 'amount', label: 'مبلغ پرداختی (تومان)', type: 'money', required: true, value: !v.amount && info ? info.rest : v.amount, hint: 'مبلغ کمتر از مانده = پرداخت ناقص' },
        { name: 'date', label: 'تاریخ پرداخت', type: 'date' },
        { name: 'note', label: 'توضیحات', type: 'textarea', rows: 2 },
        { name: 'confirmed', type: 'check', checkLabel: 'پرداخت را بررسی کردم و ثبت نهایی را تأیید می‌کنم' }
      ];
    },
    submit: 'ثبت نهایی',
    onSubmit: async v => {
      const m = memberById(v.memberId); if (!m) throw new Error('عضو را انتخاب کنید');
      const late = v.date.slice(0, 7) > v.forMonth ? ' (با تأخیر)' : '';
      await addTx({ type: 'in', category: 'share', memberId: m.id, amount: v.amount, date: v.date, forMonth: v.forMonth, desc: 'سهم ' + ymLabel(v.forMonth) + late, note: v.note, confirmed: v.confirmed });
      toast('پرداخت ثبت شد'); render();
    }
  });
};
ACT['share-multi'] = () => {
  openForm({
    title: 'پرداخت چندماهه یکجا',
    values: { from: ymOf(todayJ()), count: 3, date: todayJ() },
    note: 'مبلغ هر ماه به‌طور خودکار از مانده‌ی همان ماه پر می‌شود؛ ماه‌های تسویه‌شده رد می‌شوند.',
    fields: v => {
      const m = memberById(v.memberId), n = Math.max(1, Math.min(24, parseInt(enDigits(v.count), 10) || 1));
      let total = 0, prev = '';
      if (m && /^\d{4}\/\d{2}$/.test(v.from)) { const ms = ymRange(v.from, ymNext(v.from, n - 1)); const items = ms.map(y => shareMonthInfo(m, y)).filter(i => i.rest > 0); total = sum(items, i => i.rest); prev = items.length ? items.map(i => ymLabel(i.ym) + ': ' + fmtMoney(i.rest)).join('<br>') + '<br><b>جمع: ' + fmtMoney(total) + ' ' + S.settings.currency + '</b>' : 'برای این بازه مانده‌ای وجود ندارد'; }
      return [
        { name: 'memberId', label: 'عضو', type: 'select', required: true, reload: true, options: memberOpts(activeMembers(), true) },
        { name: 'from', label: 'از ماه', type: 'month', reload: true },
        { name: 'count', label: 'تعداد ماه', type: 'number', reload: true, half: true },
        { name: 'date', label: 'تاریخ پرداخت', type: 'date' },
        { name: 'prev', label: 'پیش‌نمایش', type: 'html', html: prev },
        { name: 'confirmed', type: 'check', checkLabel: 'جمع مبالغ را تأیید می‌کنم' }
      ];
    },
    submit: 'ثبت همه',
    onSubmit: async v => {
      const m = memberById(v.memberId); if (!m) throw new Error('عضو را انتخاب کنید');
      if (!v.confirmed) throw new Error('تأیید مدیر لازم است');
      const n = Math.max(1, Math.min(24, parseInt(enDigits(v.count), 10) || 1));
      const items = ymRange(v.from, ymNext(v.from, n - 1)).map(y => shareMonthInfo(m, y)).filter(i => i.rest > 0);
      if (!items.length) throw new Error('برای این بازه مانده‌ای وجود ندارد');
      for (const i of items) await addTx({ type: 'in', category: 'share', memberId: m.id, amount: i.rest, date: v.date, forMonth: i.ym, desc: 'سهم ' + ymLabel(i.ym) + ' (پرداخت یکجا)', confirmed: true });
      toast(faDigits(items.length) + ' ماه ثبت شد'); render();
    }
  });
};
