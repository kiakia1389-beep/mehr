/* pages2.js — وام‌ها، نوبت و ضمانت، دریافت و پرداخت، وضعیت اعضا */
'use strict';

const LOAN_ST = { active: ['warn', 'فعال'], settled: ['good', 'تسویه‌شده'], cancelled: ['inactive', 'ابطال‌شده'] };

/* ======================= وام‌ها ======================= */
let loanUi = { filter: 'active' };
VIEWS.loans = function () {
  const all = S.loans.map(l => ({ l, s: loanSummary(l) }));
  const cnt = k => all.filter(x => k === 'all' ? x.s.status !== 'cancelled' : k === 'overdue' ? x.s.overdue.length && x.s.status === 'active' : x.s.status === k).length;
  let list = all.filter(x => loanUi.filter === 'all' ? x.s.status !== 'cancelled' : loanUi.filter === 'overdue' ? x.s.overdue.length && x.s.status === 'active' : x.s.status === loanUi.filter).sort((a, b) => b.l.no - a.l.no);
  const tabs = [['active', 'فعال'], ['overdue', 'دارای قسط معوق'], ['settled', 'تسویه‌شده'], ['all', 'همه']];
  let h = pageHead('مدیریت وام‌ها', '<button class="btn primary sm" data-act="loan-new">' + ic('plus', 18) + ' وام جدید</button>');
  h += '<div class="stats two">' + stat('وام‌های فعال', faDigits(cnt('active'))) + stat('مانده بدهی وام‌ها', fmtMoney(sum(all.filter(x => x.s.status === 'active'), x => x.s.remaining)), 'warn') + '</div>';
  h += '<div class="tabs">' + tabs.map(t => '<button class="tab' + (loanUi.filter === t[0] ? ' on' : '') + '" data-act="loan-filter" data-f="' + t[0] + '">' + t[1] + ' <small>' + faDigits(cnt(t[0])) + '</small></button>').join('') + '</div>';
  h += '<div class="list cards">' + (list.map(({ l, s }) => {
    const m = memberById(l.memberId), pct = Math.round(s.paid * 100 / l.amount);
    return '<a class="lcard" data-act="goto" data-to="loan/' + l.id + '"><div class="lc-t"><b>وام ' + faDigits(l.no) + ' — ' + esc(fullName(m)) + '</b>' + statusChip(LOAN_ST[s.status][0], LOAN_ST[s.status][1]) + '</div><div class="muted small">' + fmtMoney(l.amount) + ' ' + esc(S.settings.currency) + ' · ' + faDigits(l.count) + ' قسط ' + fmtMoney(l.instAmount) + ' · ' + faDigits(l.payDate) + '</div><div class="prog"><i style="width:' + pct + '%"></i></div><div class="prog-l"><span>پرداخت‌شده: ' + fmtMoney(s.paid) + '</span><span>مانده: ' + fmtMoney(s.remaining) + '</span></div>' + (s.overdue.length && s.status === 'active' ? '<div class="neg small">' + faDigits(s.overdue.length) + ' قسط معوق به مبلغ ' + fmtMoney(s.overdueSum) + '</div>' : '') + '</a>';
  }).join('') || '<div class="empty">وامی در این دسته وجود ندارد</div>') + '</div>';
  return h;
};
ACT['loan-filter'] = d => { loanUi.filter = d.f; render(); };

function loanFormFields(v) {
  const needLoan = v.requestId ? S.requests.find(r => r.id === v.requestId) : null;
  const m = memberById(v.memberId), el = m ? loanEligibility(m.id) : null;
  const gOpts = memberOpts(activeMembers().filter(x => x.id !== v.memberId), true);
  const blocking = el ? el.reasons.filter(r => !r.startsWith('درخواست وام فعال')) : [];
  return [
    { name: 'memberId', label: 'دریافت‌کننده وام', type: 'select', required: true, reload: true, options: memberOpts(activeMembers(), true), hint: m ? (blocking.length ? '<span class="neg">' + esc(blocking.join('، ')) + '</span>' : '<span class="pos">شرایط عمومی دریافت وام برقرار است</span>') : '' },
    { name: 'amount', label: 'مبلغ وام', type: 'money', required: true, half: true, hint: 'موجودی صندوق: ' + fmtMoney(balance()) },
    { name: 'count', label: 'تعداد اقساط', type: 'number', required: true, half: true },
    { name: 'instAmount', label: 'مبلغ هر قسط', type: 'money', required: true, half: true },
    { name: 'payDate', label: 'تاریخ پرداخت وام', type: 'date' },
    { name: 'startDate', label: 'تاریخ شروع بازپرداخت (سررسید قسط اول)', type: 'date' },
    { name: 'g1', label: 'ضامن اول', type: 'select', required: true, options: gOpts },
    { name: 'g2', label: 'ضامن دوم', type: 'select', required: true, options: gOpts },
    { name: 'note', label: 'توضیحات', type: 'textarea', rows: 2 },
    { name: 'confirmed', type: 'check', checkLabel: 'مشخصات را بررسی کردم؛ پرداخت وام و ثبت نهایی را تأیید می‌کنم' }
  ];
}
ACT['loan-new'] = d => {
  const req = d.req ? S.requests.find(r => r.id === d.req) : null;
  const pay = todayJ();
  openForm({
    title: 'ثبت وام جدید', wide: true,
    values: Object.assign({ amount: S.settings.loanAmount, count: S.settings.instCount, instAmount: S.settings.instAmount, payDate: pay, startDate: addMonthsJ(pay, 1) }, req ? { memberId: req.memberId, g1: req.g1, g2: req.g2, requestId: req.id } : {}),
    fields: v => loanFormFields(v),
    submit: 'ثبت و پرداخت وام',
    onSubmit: async v => {
      const rid = req ? req.id : (S.requests.find(r => r.memberId === v.memberId && r.status === 'approved') || {}).id;
      const loan = await createLoan(Object.assign({}, v, { requestId: rid }));
      toast('وام شماره ' + faDigits(loan.no) + ' ثبت شد'); go('#/loan/' + loan.id);
    }
  });
};

VIEWS.loan = function (id) {
  const l = loanById(id);
  if (!l) return '<div class="empty">وام پیدا نشد</div>';
  const s = loanSummary(l), m = memberById(l.memberId), g1 = memberById(l.g1), g2 = memberById(l.g2);
  const st = LOAN_ST[s.status];
  let h = '<a class="back" data-act="goto" data-to="loans">' + ic('chev', 18) + ' وام‌ها</a>';
  h += '<div class="card"><div class="ch"><h2>وام شماره ' + faDigits(l.no) + '</h2>' + statusChip(st[0], st[1]) + '</div>' +
    '<div class="kv2"><div><span>دریافت‌کننده</span><b><a class="lnk" data-act="goto" data-to="member/' + m.id + '">' + esc(fullName(m)) + '</a></b></div><div><span>مبلغ وام</span><b>' + fmtMoney(l.amount) + '</b></div><div><span>تاریخ پرداخت</span><b>' + faDigits(l.payDate) + '</b></div><div><span>اقساط</span><b>' + faDigits(l.count) + ' × ' + fmtMoney(l.instAmount) + '</b></div><div><span>شروع بازپرداخت</span><b>' + faDigits(l.startDate) + '</b></div><div><span>ضامن اول</span><b>' + esc(fullName(g1)) + '</b></div><div><span>ضامن دوم</span><b>' + esc(fullName(g2)) + '</b></div></div>' + (l.note ? '<p class="muted">' + esc(l.note) + '</p>' : '') + '</div>';
  h += '<div class="stats two">' + stat('اقساط پرداخت‌شده', fmtMoney(s.paid), 'good', faDigits(s.paidCount) + ' قسط کامل') + stat('مانده بدهی', fmtMoney(s.remaining), s.remaining ? 'warn' : 'good', faDigits(s.remainCount) + ' قسط باقی‌مانده') + stat('اقساط معوق', faDigits(s.overdue.length), s.overdue.length ? 'red' : '', s.overdue.length ? fmtMoney(s.overdueSum) : '') + stat('قسط بعدی', s.next ? faDigits(s.next.due) : '—', '', s.next ? 'قسط ' + faDigits(s.next.no) : '') + '</div>';
  if (l.status !== 'cancelled') h += '<div class="btnrow wrap">' + (s.status === 'active' ? '<button class="btn primary sm" data-act="inst-pay" data-loan="' + l.id + '">' + ic('cash', 16) + ' ثبت پرداخت قسط</button>' : '') + '<button class="btn sm" data-act="loan-edit" data-id="' + l.id + '">' + ic('edit', 16) + ' ویرایش ضامن/توضیحات</button><button class="btn sm" data-act="loan-print" data-id="' + l.id + '">' + ic('print', 16) + ' گزارش وام</button>' + (s.paid === 0 ? '<button class="btn sm danger-o" data-act="loan-cancel" data-id="' + l.id + '">ابطال وام</button>' : '') + '</div>';
  h += '<div class="card"><div class="ch"><b>جدول اقساط</b></div><div class="tblwrap"><table class="rp"><thead><tr><th>قسط</th><th>سررسید</th><th>مبلغ</th><th>پرداختی</th><th>وضعیت</th></tr></thead><tbody>' +
    s.insts.map(i => '<tr class="' + (i.overdue ? 'od' : '') + '"><td class="n">' + faDigits(i.no) + '</td><td>' + faDigits(i.due) + '</td><td class="n">' + fmtMoney(i.amount) + '</td><td class="n">' + fmtMoney(i.paid) + '</td><td>' + (i.status === 'paid' ? statusChip('good', 'پرداخت‌شده') : i.overdue ? statusChip('debtor', i.status === 'partial' ? 'ناقص و معوق' : 'معوق') : i.status === 'partial' ? statusChip('warn', 'ناقص') : statusChip('inactive', 'در انتظار')) + (i.status !== 'paid' && s.status === 'active' ? ' <button class="btn xs" data-act="inst-pay" data-loan="' + l.id + '" data-no="' + i.no + '">ثبت</button>' : '') + '</td></tr>').join('') + '</tbody></table></div></div>';
  const txs = S.tx.filter(t => t.loanId === l.id).sort((a, b) => a.no - b.no);
  h += '<div class="card"><div class="ch"><b>تراکنش‌های این وام</b></div><div class="list">' + txs.map(t => '<div class="li' + (t.voided ? ' void' : '') + '"><div class="li-m"><b>' + esc(t.desc) + (t.voided ? ' (ابطال‌شده)' : '') + '</b><small>' + faDigits(t.date) + ' · تراکنش ' + faDigits(t.no) + '</small></div><div class="li-a ' + (t.type === 'in' ? 'pos' : 'neg') + '">' + fmtMoney(t.amount) + '</div></div>').join('') + '</div></div>';
  return h;
};
ACT['inst-pay'] = d => {
  const loan = loanById(d.loan), s = loanSummary(loan);
  const open = s.insts.filter(i => i.status !== 'paid');
  if (!open.length) { toast('همه اقساط پرداخت شده است'); return; }
  openForm({
    title: 'ثبت پرداخت قسط — وام ' + faDigits(loan.no),
    values: { instNo: d.no || open[0].no, date: todayJ() },
    fields: v => {
      const i = s.insts.find(x => x.no === +v.instNo) || open[0];
      return [
        { name: 'instNo', label: 'قسط', type: 'select', reload: true, options: open.map(x => [x.no, 'قسط ' + faDigits(x.no) + ' — سررسید ' + faDigits(x.due) + ' — مانده ' + fmtMoney(x.rest)]) },
        { name: 'amount', label: 'مبلغ پرداختی', type: 'money', required: true, value: !v.amount || v.instNoChanged ? i.rest : v.amount, hint: 'مانده این قسط: ' + fmtMoney(i.rest) },
        { name: 'date', label: 'تاریخ پرداخت', type: 'date' },
        { name: 'note', label: 'توضیحات', type: 'textarea', rows: 2 },
        { name: 'confirmed', type: 'check', checkLabel: 'پرداخت را تأیید و ثبت نهایی می‌کنم' }
      ];
    },
    submit: 'ثبت قسط',
    onSubmit: async v => {
      await addTx({ type: 'in', category: 'installment', memberId: loan.memberId, loanId: loan.id, instNo: +v.instNo, amount: v.amount, date: v.date, desc: 'قسط ' + faDigits(v.instNo) + ' وام ' + faDigits(loan.no) + ' — ' + fullName(memberById(loan.memberId)), note: v.note, confirmed: v.confirmed });
      toast('قسط ثبت شد'); render();
    }
  });
};
ACT['loan-edit'] = d => {
  const l = loanById(d.id), gs = memberOpts(activeMembers().concat(S.members.filter(m => !m.active && [l.g1, l.g2].includes(m.id))).filter(x => x.id !== l.memberId), true);
  openForm({ title: 'ویرایش وام ' + faDigits(l.no), values: { g1: l.g1, g2: l.g2, note: l.note },
    note: 'مبلغ، تعداد و تاریخ اقساط پس از ثبت وام قابل تغییر نیست تا سوابق مالی دست‌نخورده بماند.',
    fields: [{ name: 'g1', label: 'ضامن اول', type: 'select', options: gs }, { name: 'g2', label: 'ضامن دوم', type: 'select', options: gs }, { name: 'note', label: 'توضیحات', type: 'textarea' }],
    onSubmit: async v => { await updateLoanInfo(l.id, v); toast('ذخیره شد'); render(); } });
};
ACT['loan-cancel'] = async d => {
  const l = loanById(d.id);
  const reason = await promptDlg('ابطال وام ' + faDigits(l.no), 'دلیل ابطال (در تاریخچه ثبت می‌شود)', { danger: true, okLabel: 'ابطال وام' });
  if (!reason) return;
  await cancelLoan(l.id, reason); toast('وام ابطال شد'); render();
};
function loanReportHtml(l) {
  const s = loanSummary(l), m = memberById(l.memberId);
  const rows = [['شماره وام', faDigits(l.no)], ['دریافت‌کننده', esc(fullName(m))], ['مبلغ وام', fmtMoney(l.amount)], ['تاریخ پرداخت', faDigits(l.payDate)], ['تعداد و مبلغ اقساط', faDigits(l.count) + ' × ' + fmtMoney(l.instAmount)], ['ضامن اول', esc(fullName(memberById(l.g1)))], ['ضامن دوم', esc(fullName(memberById(l.g2)))], ['پرداخت‌شده', fmtMoney(s.paid)], ['مانده بدهی', fmtMoney(s.remaining)], ['وضعیت', LOAN_ST[s.status][1]]];
  return '<div class="rp-head"><div class="rp-fund">' + esc(S.settings.fundName) + '</div><div class="rp-title">گزارش کامل وام شماره ' + faDigits(l.no) + '</div><div class="rp-date">تاریخ تهیه: ' + faDigits(todayJ()) + ' — مبالغ به ' + esc(S.settings.currency) + '</div></div><table class="rp kv"><tbody>' + rows.map(r => '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</tbody></table><h4 class="rp-sub">جدول اقساط</h4><table class="rp"><thead><tr><th>قسط</th><th>سررسید</th><th>مبلغ</th><th>پرداختی</th><th>مانده</th></tr></thead><tbody>' + s.insts.map(i => '<tr><td class="n">' + faDigits(i.no) + '</td><td>' + faDigits(i.due) + '</td><td class="n">' + fmtMoney(i.amount) + '</td><td class="n">' + fmtMoney(i.paid) + '</td><td class="n">' + fmtMoney(i.rest) + '</td></tr>').join('') + '</tbody></table>';
}
ACT['loan-print'] = d => printHtml(loanReportHtml(loanById(d.id)));

/* ======================= نوبت وام و ضمانت‌ها ======================= */
VIEWS.queue = function () {
  const pend = pendingRequests(), appr = S.requests.filter(r => r.status === 'approved').sort((a, b) => (a.turn || 99) - (b.turn || 99));
  const elig = eligibleMembers(), hasReq = new Set(S.requests.filter(r => ['pending', 'approved'].includes(r.status)).map(r => r.memberId));
  const reqItem = (r, i, isAppr) => {
    const m = memberById(r.memberId);
    return '<div class="li col"><div class="li-row"><div class="av sm">' + faDigits(isAppr ? r.turn : i + 1) + '</div><div class="li-m"><b>' + esc(fullName(m)) + '</b><small>درخواست ' + faDigits(r.date) + ' · ضامن‌ها: ' + esc(fullName(memberById(r.g1))) + '، ' + esc(fullName(memberById(r.g2))) + '</small></div></div>' +
      '<div class="btnrow wrap tight">' + (isAppr ? '<button class="btn xs primary" data-act="loan-new" data-req="' + r.id + '">پرداخت وام</button>' : '<button class="btn xs" data-act="req-approve" data-id="' + r.id + '">تأیید و نوبت‌دهی</button><button class="btn xs" data-act="req-move" data-id="' + r.id + '" data-d="-1">بالا</button><button class="btn xs" data-act="req-move" data-id="' + r.id + '" data-d="1">پایین</button>') + '<button class="btn xs danger-o" data-act="req-reject" data-id="' + r.id + '">' + (isAppr ? 'لغو' : 'رد') + '</button></div></div>';
  };
  let h = pageHead('نوبت وام و ضمانت‌ها', '<button class="btn primary sm" data-act="req-new">' + ic('plus', 18) + ' درخواست جدید</button>');
  h += '<div class="stats two">' + stat('ظرفیت هر نوبت', faDigits(S.settings.loanCapacity) + ' وام') + stat('متقاضیان در انتظار', faDigits(pend.length), pend.length > S.settings.loanCapacity ? 'warn' : '') + '</div>';
  if (pend.length > S.settings.loanCapacity) h += '<div class="banner warn"><span>تعداد متقاضیان (' + faDigits(pend.length) + ') از ظرفیت (' + faDigits(S.settings.loanCapacity) + ') بیشتر است. می‌توانید قرعه‌کشی کنید.</span><button class="btn sm" data-act="lottery">' + ic('dice', 16) + ' قرعه‌کشی</button></div>';
  else if (pend.length) h += '<div class="btnrow"><button class="btn sm" data-act="lottery">' + ic('dice', 16) + ' قرعه‌کشی بین متقاضیان</button></div>';
  h += '<div class="card"><div class="ch"><b>متقاضیان در انتظار (به ترتیب اولویت)</b></div><div class="list">' + (pend.map((r, i) => reqItem(r, i, false)).join('') || '<div class="empty small">متقاضی در انتظاری وجود ندارد</div>') + '</div></div>';
  h += '<div class="card"><div class="ch"><b>نوبت‌های تأییدشده</b></div><div class="list">' + (appr.map(r => reqItem(r, 0, true)).join('') || '<div class="empty small">نوبتی ثبت نشده است</div>') + '</div></div>';
  h += '<div class="card"><div class="ch"><b>اعضای واجد شرایط دریافت وام (' + faDigits(elig.length) + ')</b></div><div class="chips">' + (elig.map(m => '<span class="chip ' + (hasReq.has(m.id) ? 'warn' : 'good') + '">' + esc(fullName(m)) + (hasReq.has(m.id) ? ' · در نوبت' : '') + '</span>').join('') || '<div class="empty small">عضو واجد شرایطی نیست</div>') + '</div></div>';
  const lots = S.lotteries.slice().sort((a, b) => b.ts - a.ts);
  if (lots.length) h += '<div class="card"><div class="ch"><b>نتایج قرعه‌کشی</b></div><div class="list">' + lots.map(x => '<div class="li col"><b>' + faDigits(x.date) + (x.note ? ' — ' + esc(x.note) : '') + '</b><small>برندگان: ' + x.winners.map(i => esc(fullName(memberById(i)))).join('، ') + '</small><small>متقاضیان: ' + x.candidates.map(i => esc(fullName(memberById(i)))).join('، ') + '</small></div>').join('') + '</div></div>';
  const mine = S.loans.filter(l => l.status !== 'cancelled');
  if (mine.length) h += '<div class="card"><div class="ch"><b>ضامن‌های وام‌ها</b></div><div class="list">' + mine.sort((a, b) => b.no - a.no).map(l => '<a class="li col" data-act="goto" data-to="loan/' + l.id + '"><b>وام ' + faDigits(l.no) + ' — ' + esc(fullName(memberById(l.memberId))) + '</b><small>ضامن‌ها: ' + esc(fullName(memberById(l.g1))) + '، ' + esc(fullName(memberById(l.g2))) + '</small></a>').join('') + '</div></div>';
  return h;
};
ACT['req-new'] = () => {
  openForm({ title: 'ثبت درخواست وام', values: { date: todayJ() },
    fields: v => {
      const el = v.memberId ? loanEligibility(v.memberId) : null;
      const gs = memberOpts(activeMembers().filter(x => x.id !== v.memberId), true);
      return [
        { name: 'memberId', label: 'متقاضی', type: 'select', required: true, reload: true, options: memberOpts(activeMembers(), true), hint: el ? (el.ok ? '<span class="pos">واجد شرایط است</span>' : '<span class="neg">' + esc(el.reasons.join('، ')) + '</span>') : '' },
        { name: 'date', label: 'تاریخ درخواست', type: 'date' },
        { name: 'g1', label: 'ضامن اول', type: 'select', required: true, options: gs },
        { name: 'g2', label: 'ضامن دوم', type: 'select', required: true, options: gs },
        { name: 'note', label: 'توضیحات', type: 'textarea', rows: 2 }
      ];
    },
    submit: 'ثبت درخواست', onSubmit: async v => { await addRequest(v); toast('درخواست ثبت شد'); render(); } });
};
ACT['req-approve'] = async d => {
  const turn = Math.max(0, ...S.requests.filter(r => r.status === 'approved').map(r => r.turn || 0)) + 1;
  await setRequestStatus(d.id, 'approved', turn); toast('نوبت ' + faDigits(turn) + ' ثبت شد'); render();
};
ACT['req-reject'] = async d => {
  const r = S.requests.find(x => x.id === d.id), ap = r.status === 'approved';
  if (!(await confirmDlg(ap ? 'نوبت این عضو لغو شود؟' : 'درخواست رد شود؟', { danger: true }))) return;
  await setRequestStatus(d.id, ap ? 'cancelled' : 'rejected', null); render();
};
ACT['req-move'] = async d => {
  const list = pendingRequests(), i = list.findIndex(r => r.id === d.id), j = i + +d.d;
  if (i < 0 || j < 0 || j >= list.length) return;
  const arr = list.slice(); const x = arr[i]; arr[i] = arr[j]; arr[j] = x;
  for (let k = 0; k < arr.length; k++) await setRequestPriority(arr[k].id, k + 1);
  render();
};
ACT.lottery = () => {
  const n = pendingRequests().length;
  openForm({ title: 'قرعه‌کشی نوبت وام', values: { count: S.settings.loanCapacity },
    note: 'بین ' + faDigits(n) + ' متقاضی در انتظار قرعه‌کشی می‌شود. نتیجه ذخیره و برندگان به‌ترتیب قرعه نوبت می‌گیرند.',
    fields: [{ name: 'count', label: 'تعداد برندگان', type: 'number' }, { name: 'note', label: 'توضیحات (مثلاً دوره)', type: 'text' }, { name: 'confirmed', type: 'check', checkLabel: 'قرعه‌کشی را تأیید می‌کنم (قابل برگشت نیست)' }],
    submit: 'انجام قرعه‌کشی',
    onSubmit: async v => {
      if (!v.confirmed) throw new Error('تأیید مدیر لازم است');
      const rec = await drawLottery(parseInt(enDigits(v.count), 10) || 1, v.note);
      toast('قرعه‌کشی انجام شد'); render();
      openModal('نتیجه قرعه‌کشی', '<div class="confirm-msg"><b>برندگان:</b><br>' + rec.winners.map((id, i) => faDigits(i + 1) + '. ' + esc(fullName(memberById(id)))).join('<br>') + '</div><div class="btnrow"><button class="btn primary" data-close>بستن</button></div>');
    } });
};

/* ======================= دریافت و پرداخت ======================= */
let txUi = { type: 'all', q: '', void: false, from: '', to: '' };
VIEWS.tx = function () {
  const t = totals();
  let list = S.tx.filter(x => (txUi.void ? true : !x.voided) && (txUi.type === 'all' || x.type === txUi.type));
  const q = normText(txUi.q);
  if (q) list = list.filter(x => normText(x.desc + ' ' + x.no + ' ' + catLabel(x.category) + ' ' + (x.memberId ? fullName(memberById(x.memberId)) : '')).includes(q));
  list = list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.no - a.no);
  let h = pageHead('دریافت و پرداخت', '<button class="btn primary sm" data-act="tx-new" data-type="in">+ دریافت</button><button class="btn sm" data-act="tx-new" data-type="out">+ پرداخت</button>');
  h += '<div class="stats three">' + stat('جمع دریافت‌ها', fmtMoney(t.inSum), 'good') + stat('جمع پرداخت‌ها', fmtMoney(t.outSum), 'warn') + stat('موجودی صندوق', fmtMoney(t.balance), 'jade') + '</div>';
  h += '<div class="toolbar"><div class="searchbox">' + ic('search', 18) + '<input id="tq" class="inp" placeholder="جست‌وجو در تراکنش‌ها" value="' + esc(txUi.q) + '"></div><select class="inp" id="ttype"><option value="all">همه</option><option value="in">دریافت‌ها</option><option value="out">پرداخت‌ها</option></select><label class="chk"><input type="checkbox" id="tvoid"' + (txUi.void ? ' checked' : '') + '><span>ابطال‌شده‌ها</span></label></div>';
  h += '<div class="list">' + (list.slice(0, 150).map(x => {
    const m = x.memberId ? memberById(x.memberId) : null;
    return '<a class="li' + (x.voided ? ' void' : '') + '" data-act="tx-open" data-id="' + x.id + '"><div class="li-i ' + (x.type === 'in' ? 'in' : 'out') + '">' + ic(x.type === 'in' ? 'down' : 'up', 18) + '</div><div class="li-m"><b>' + esc(x.desc) + (x.voided ? ' (ابطال‌شده)' : '') + '</b><small>شماره ' + faDigits(x.no) + ' · ' + faDigits(x.date) + ' · ' + esc(catLabel(x.category)) + (m ? ' · ' + esc(fullName(m)) : '') + '</small></div><div class="li-a ' + (x.type === 'in' ? 'pos' : 'neg') + '">' + (x.type === 'in' ? '+' : '−') + fmtMoney(x.amount) + '</div></a>';
  }).join('') || '<div class="empty">تراکنشی وجود ندارد</div>') + '</div>' + (list.length > 150 ? '<div class="muted small center">۱۵۰ مورد آخر نمایش داده شد؛ برای فهرست کامل از «گزارش‌ها» استفاده کنید</div>' : '');
  setTimeout(() => { const s = $('#ttype'); if (s) s.value = txUi.type; }, 0);
  return h;
};
document.addEventListener('input', e => { if (e.target.id === 'tq') { txUi.q = e.target.value; const p = e.target.selectionStart; render(); const el = $('#tq'); if (el) { el.focus(); try { el.setSelectionRange(p, p); } catch (x) { /* ignore */ } } } });
document.addEventListener('change', e => {
  if (e.target.id === 'ttype') { txUi.type = e.target.value; render(); }
  if (e.target.id === 'tvoid') { txUi.void = e.target.checked; render(); }
});
ACT['tx-new'] = d => {
  const type = d.type;
  openForm({
    title: type === 'in' ? 'ثبت دریافت جدید' : 'ثبت پرداخت جدید',
    values: { category: type === 'in' ? 'misc_in' : 'expense', date: todayJ() },
    fields: v => {
      const cats = type === 'in' ? { misc_in: IN_CATS.misc_in, other_in: IN_CATS.other_in } : { expense: OUT_CATS.expense, withdraw: OUT_CATS.withdraw, other_out: OUT_CATS.other_out };
      return [
        { name: 'category', label: 'دسته‌بندی', type: 'select', options: Object.entries(cats) },
        { name: 'memberId', label: 'عضو (اختیاری)', type: 'select', options: memberOpts(S.members, true, '— بدون عضو —') },
        { name: 'amount', label: 'مبلغ (تومان)', type: 'money', required: true, hint: type === 'out' ? 'موجودی صندوق: ' + fmtMoney(balance()) : '' },
        { name: 'date', label: 'تاریخ', type: 'date' },
        { name: 'desc', label: 'شرح عملیات', required: true },
        { name: 'note', label: 'توضیحات', type: 'textarea', rows: 2 },
        { name: 'confirmed', type: 'check', checkLabel: 'ثبت نهایی را تأیید می‌کنم' }
      ];
    },
    note: 'سهم ماهانه از بخش «سهم‌ها»، قسط از «مدیریت وام‌ها» و پرداخت وام از «وام جدید» ثبت می‌شود.',
    submit: 'ثبت نهایی',
    onSubmit: async v => { if (!v.desc.trim()) throw new Error('شرح عملیات را بنویسید'); await addTx({ type, category: v.category, memberId: v.memberId || null, amount: v.amount, date: v.date, desc: v.desc, note: v.note, confirmed: v.confirmed }); toast('تراکنش ثبت شد'); render(); }
  });
};
ACT['tx-open'] = d => {
  const t = S.tx.find(x => x.id === d.id), m = t.memberId ? memberById(t.memberId) : null;
  const hist = S.audit.filter(a => a.entityId === t.id);
  const w = openModal('تراکنش شماره ' + faDigits(t.no),
    '<div class="kv2"><div><span>نوع</span><b>' + (t.type === 'in' ? 'دریافت' : 'پرداخت') + '</b></div><div><span>مبلغ</span><b>' + fmtMoney(t.amount) + '</b></div><div><span>تاریخ</span><b>' + faDigits(t.date) + '</b></div><div><span>دسته‌بندی</span><b>' + esc(catLabel(t.category)) + '</b></div><div><span>عضو</span><b>' + (m ? esc(fullName(m)) : '—') + '</b></div><div><span>شرح</span><b>' + esc(t.desc) + '</b></div></div>' +
    (t.note ? '<p class="muted">' + esc(t.note) + '</p>' : '') + (t.voided ? '<div class="banner warn"><span>ابطال شده در ' + faDigits(t.voidDate) + ': ' + esc(t.voidReason) + '</span></div>' : '') +
    '<div class="btnrow wrap">' + (t.voided ? '' : '<button class="btn sm" data-act="tx-edit" data-id="' + t.id + '">اصلاح</button>' + (t.category !== 'loan' ? '<button class="btn sm danger-o" data-act="tx-void" data-id="' + t.id + '">ابطال (حذف با سابقه)</button>' : '')) + '</div>' +
    '<h4 class="rp-sub">تاریخچه تغییرات</h4><div class="list">' + (hist.map(a => '<div class="li col"><b>' + esc(a.action) + '</b><small>' + faDigits(a.date) + (a.reason ? ' — ' + esc(a.reason) : '') + '</small></div>').join('') || '<div class="empty small">—</div>') + '</div>');
};
ACT['tx-edit'] = d => {
  const t = S.tx.find(x => x.id === d.id); closeModal();
  openForm({ title: 'اصلاح تراکنش ' + faDigits(t.no), values: { amount: t.amount, date: t.date, desc: t.desc, note: t.note },
    note: 'نسخه‌ی قبلی در تاریخچه‌ی تغییرات نگهداری می‌شود.',
    fields: [{ name: 'amount', label: 'مبلغ', type: 'money', required: true }, { name: 'date', label: 'تاریخ', type: 'date' }, { name: 'desc', label: 'شرح' }, { name: 'note', label: 'توضیحات', type: 'textarea', rows: 2 }, { name: 'reason', label: 'دلیل اصلاح', required: true }, { name: 'confirmed', type: 'check', checkLabel: 'اصلاح را تأیید می‌کنم' }],
    onSubmit: async v => { await editTx(t.id, v, v.reason.trim()); toast('اصلاح شد'); render(); } });
};
ACT['tx-void'] = async d => {
  const t = S.tx.find(x => x.id === d.id); closeModal();
  const r = await promptDlg('ابطال تراکنش ' + faDigits(t.no), 'دلیل ابطال', { danger: true, okLabel: 'ابطال' });
  if (!r) return;
  await voidTx(t.id, r); toast('تراکنش ابطال شد (سابقه حفظ شد)'); render();
};

/* ======================= وضعیت اعضا ======================= */
VIEWS.status = function () {
  const rows = S.members.map(m => ({ m, f: memberFinance(m) })).sort((a, b) => b.f.totalDebt - a.f.totalDebt || a.m.code - b.m.code);
  let h = pageHead('وضعیت اعضا');
  h += '<div class="stats three">' + stat('خوش‌حساب', faDigits(rows.filter(r => r.f.status === 'good').length), 'good') + stat('بدهکار', faDigits(rows.filter(r => r.f.status === 'debtor').length), 'red') + stat('غیرفعال', faDigits(rows.filter(r => r.f.status === 'inactive').length)) + '</div>';
  h += '<div class="card"><div class="tblwrap"><table class="rp"><thead><tr><th>عضو</th><th>وضعیت</th><th>سهم معوق</th><th>مانده وام</th><th>جمع بدهی</th></tr></thead><tbody>' +
    rows.map(({ m, f }) => '<tr data-act="goto" data-to="member/' + m.id + '" class="clk"><td>' + esc(fullName(m)) + '</td><td>' + statusChip(f.status, f.statusLabel) + '</td><td class="n">' + fmtMoney(f.shareUnpaid) + '</td><td class="n">' + fmtMoney(f.loanRemaining) + '</td><td class="n"><b>' + fmtMoney(f.totalDebt) + '</b></td></tr>').join('') + '</tbody></table></div></div>';
  return h;
};
