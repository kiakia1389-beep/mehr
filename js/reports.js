/* reports.js — گزارش‌های مدیریتی (۱۲ گزارش) + تبدیل به HTML / Excel / متن */
'use strict';

const C = { text: 'text', money: 'money', num: 'num', date: 'date' };
const liveTx = () => S.tx.filter(t => !t.voided).slice().sort((a, b) => a.date.localeCompare(b.date) || a.no - b.no);
const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

function txRow(t) {
  const m = t.memberId ? memberById(t.memberId) : null;
  return [t.no, t.date, t.type === 'in' ? 'دریافت' : 'پرداخت', catLabel(t.category), m ? fullName(m) : '—', t.desc || '', t.amount];
}
const TX_COLS = [{ label: 'شماره', t: C.num }, { label: 'تاریخ', t: C.date }, { label: 'نوع' }, { label: 'دسته‌بندی' }, { label: 'عضو' }, { label: 'شرح' }, { label: 'مبلغ (تومان)', t: C.money }];

function sumFoot(rows, idx, label) {
  const f = new Array(TX_COLS.length).fill('');
  f[0] = label || 'جمع'; f[idx] = sum(rows, r => r[idx]);
  return f;
}

const REPORTS = [
  {
    id: 'monthly', title: 'گزارش ماهانه صندوق', params: ['month'],
    build(p) {
      const ym = p.month || ymOf(todayJ());
      const tx = liveTx().filter(t => ymOf(t.date) === ym);
      const rows = tx.map(txRow);
      const inn = sum(tx.filter(t => t.type === 'in'), t => t.amount), out = sum(tx.filter(t => t.type === 'out'), t => t.amount);
      const prev = sum(liveTx().filter(t => ymOf(t.date) < ym && t.type === 'in'), t => t.amount) - sum(liveTx().filter(t => ymOf(t.date) < ym && t.type === 'out'), t => t.amount);
      return {
        title: 'گزارش ماهانه صندوق — ' + ymLabel(ym), cols: TX_COLS, rows,
        summary: [['موجودی ابتدای ماه', prev], ['جمع دریافت‌ها', inn], ['جمع پرداخت‌ها', out], ['موجودی پایان ماه', prev + inn - out]]
      };
    }
  },
  {
    id: 'yearly', title: 'گزارش سالانه صندوق', params: ['year'],
    build(p) {
      const y = +p.year || S.settings.fiscalYear;
      const rows = []; let run = sum(liveTx().filter(t => t.date < y + '/01/01' && t.type === 'in'), t => t.amount) - sum(liveTx().filter(t => t.date < y + '/01/01' && t.type === 'out'), t => t.amount);
      const start = run;
      for (let m = 1; m <= 12; m++) {
        const ym = y + '/' + pad2(m), tx = liveTx().filter(t => ymOf(t.date) === ym);
        const g = c => sum(tx.filter(t => t.category === c), t => t.amount);
        const inn = sum(tx.filter(t => t.type === 'in'), t => t.amount), out = sum(tx.filter(t => t.type === 'out'), t => t.amount);
        run += inn - out;
        rows.push([MONTHS[m - 1], g('share'), g('installment'), g('misc_in') + g('other_in'), g('loan'), g('expense') + g('withdraw') + g('other_out'), inn, out, run]);
      }
      const foot = ['جمع سال', ...[1, 2, 3, 4, 5, 6, 7].map(i => sum(rows, r => r[i])), run];
      return {
        title: 'گزارش سالانه صندوق — سال ' + faDigits(y),
        cols: [{ label: 'ماه' }, { label: 'سهم‌ها', t: C.money }, { label: 'اقساط', t: C.money }, { label: 'سایر درآمد', t: C.money }, { label: 'وام پرداختی', t: C.money }, { label: 'هزینه و برداشت', t: C.money }, { label: 'جمع دریافت', t: C.money }, { label: 'جمع پرداخت', t: C.money }, { label: 'موجودی', t: C.money }],
        rows, foot, summary: [['موجودی ابتدای سال', start], ['موجودی پایان سال', run]]
      };
    }
  },
  {
    id: 'deposits', title: 'گزارش واریزی اعضا', params: [],
    build() {
      const rows = S.members.slice().sort((a, b) => a.code - b.code).map(m => {
        const t = memberShareTotals(m);
        return [m.code, fullName(m), m.shares, t.paid, t.due, t.unpaid, m.active ? 'فعال' : 'غیرفعال'];
      });
      return {
        title: 'گزارش واریزی اعضا (سهم‌های ماهانه)',
        cols: [{ label: 'کد', t: C.num }, { label: 'عضو' }, { label: 'تعداد سهم', t: C.num }, { label: 'مجموع واریزی', t: C.money }, { label: 'سهم سررسیدشده', t: C.money }, { label: 'پرداخت‌نشده', t: C.money }, { label: 'وضعیت' }],
        rows, foot: ['جمع', '', '', sum(rows, r => r[3]), sum(rows, r => r[4]), sum(rows, r => r[5]), '']
      };
    }
  },
  {
    id: 'debtors', title: 'گزارش بدهکاران', params: [],
    build() {
      const rows = activeMembers().map(m => ({ m, f: memberFinance(m) })).filter(x => x.f.debtor)
        .sort((a, b) => b.f.totalDebt - a.f.totalDebt)
        .map(x => [x.m.code, fullName(x.m), x.f.unpaidMonths, x.f.shareUnpaid, x.f.overdueCount, x.f.overdueSum, x.f.loanRemaining, x.f.totalDebt]);
      return {
        title: 'گزارش بدهکاران',
        cols: [{ label: 'کد', t: C.num }, { label: 'عضو' }, { label: 'ماه سهم معوق', t: C.num }, { label: 'سهم معوق', t: C.money }, { label: 'قسط معوق', t: C.num }, { label: 'مبلغ قسط معوق', t: C.money }, { label: 'مانده وام', t: C.money }, { label: 'جمع بدهی', t: C.money }],
        rows, foot: ['جمع', '', '', sum(rows, r => r[3]), '', sum(rows, r => r[5]), sum(rows, r => r[6]), sum(rows, r => r[7])]
      };
    }
  },
  {
    id: 'good', title: 'گزارش خوش‌حساب‌ها', params: [],
    build() {
      const rows = activeMembers().map(m => ({ m, f: memberFinance(m) })).filter(x => !x.f.debtor)
        .map(x => [x.m.code, fullName(x.m), x.f.sharePaid, x.f.instPaid, x.f.lastPay || '—']);
      return {
        title: 'گزارش خوش‌حساب‌ها',
        cols: [{ label: 'کد', t: C.num }, { label: 'عضو' }, { label: 'مجموع سهم‌ها', t: C.money }, { label: 'اقساط پرداختی', t: C.money }, { label: 'آخرین پرداخت', t: C.date }],
        rows
      };
    }
  },
  {
    id: 'loansPaid', title: 'گزارش وام‌های پرداخت‌شده', params: [],
    build() {
      const rows = S.loans.filter(l => l.status !== 'cancelled').sort((a, b) => a.no - b.no).map(l => {
        const s = loanSummary(l);
        return [l.no, fullName(memberById(l.memberId)), l.payDate, l.amount, l.count, l.instAmount, s.paid, s.remaining, s.status === 'settled' ? 'تسویه' : 'فعال'];
      });
      return {
        title: 'گزارش وام‌های پرداخت‌شده',
        cols: [{ label: 'شماره', t: C.num }, { label: 'دریافت‌کننده' }, { label: 'تاریخ پرداخت', t: C.date }, { label: 'مبلغ وام', t: C.money }, { label: 'تعداد قسط', t: C.num }, { label: 'مبلغ قسط', t: C.money }, { label: 'بازپرداخت‌شده', t: C.money }, { label: 'مانده', t: C.money }, { label: 'وضعیت' }],
        rows, foot: ['جمع', '', '', sum(rows, r => r[3]), '', '', sum(rows, r => r[6]), sum(rows, r => r[7]), '']
      };
    }
  },
  {
    id: 'loansSettled', title: 'گزارش وام‌های تسویه‌شده', params: [],
    build() {
      const rows = S.loans.filter(l => loanSummary(l).status === 'settled').sort((a, b) => a.no - b.no).map(l => {
        const last = S.tx.filter(t => !t.voided && t.loanId === l.id && t.category === 'installment').reduce((a, t) => (t.date > a ? t.date : a), '');
        return [l.no, fullName(memberById(l.memberId)), l.payDate, l.amount, l.count, last || '—'];
      });
      return {
        title: 'گزارش وام‌های تسویه‌شده',
        cols: [{ label: 'شماره', t: C.num }, { label: 'دریافت‌کننده' }, { label: 'تاریخ پرداخت', t: C.date }, { label: 'مبلغ وام', t: C.money }, { label: 'تعداد قسط', t: C.num }, { label: 'تاریخ تسویه', t: C.date }],
        rows, foot: ['جمع', '', '', sum(rows, r => r[3]), '', '']
      };
    }
  },
  {
    id: 'overdue', title: 'گزارش اقساط معوق', params: [],
    build() {
      const today = todayJ(), rows = [];
      for (const l of S.loans.filter(l => l.status !== 'cancelled')) {
        for (const i of loanSummary(l).overdue) rows.push([l.no, fullName(memberById(l.memberId)), i.no, i.due, i.rest, diffDaysJ(i.due, today)]);
      }
      rows.sort((a, b) => b[5] - a[5]);
      return {
        title: 'گزارش اقساط معوق (تا ' + fmtDateLong(today) + ')',
        cols: [{ label: 'شماره وام', t: C.num }, { label: 'عضو' }, { label: 'شماره قسط', t: C.num }, { label: 'سررسید', t: C.date }, { label: 'مبلغ معوق', t: C.money }, { label: 'روز تأخیر', t: C.num }],
        rows, foot: ['جمع', '', '', '', sum(rows, r => r[4]), '']
      };
    }
  },
  {
    id: 'income', title: 'گزارش درآمدها', params: ['range'],
    build(p) {
      const rows = liveTx().filter(t => t.type === 'in' && inRange(t.date, p.from, p.to)).map(txRow);
      return { title: 'گزارش درآمدها (دریافت‌ها)' + rangeLabel(p), cols: TX_COLS, rows, foot: sumFoot(rows, 6) };
    }
  },
  {
    id: 'expenses', title: 'گزارش هزینه‌ها', params: ['range'],
    build(p) {
      const rows = liveTx().filter(t => t.type === 'out' && t.category !== 'loan' && inRange(t.date, p.from, p.to)).map(txRow);
      return { title: 'گزارش هزینه‌ها و برداشت‌ها' + rangeLabel(p), cols: TX_COLS, rows, foot: sumFoot(rows, 6) };
    }
  },
  {
    id: 'balance', title: 'گزارش موجودی صندوق', params: [],
    build() {
      const live = liveTx(), rows = [];
      for (const k of Object.keys(IN_CATS)) rows.push(['دریافت', IN_CATS[k], sum(live.filter(t => t.category === k), t => t.amount)]);
      for (const k of Object.keys(OUT_CATS)) rows.push(['پرداخت', OUT_CATS[k], sum(live.filter(t => t.category === k), t => t.amount)]);
      const tt = totals();
      return {
        title: 'گزارش موجودی صندوق — ' + fmtDateLong(todayJ()),
        cols: [{ label: 'نوع' }, { label: 'دسته‌بندی' }, { label: 'مبلغ (تومان)', t: C.money }], rows,
        summary: [['جمع دریافت‌ها', tt.inSum], ['جمع پرداخت‌ها', tt.outSum], ['موجودی صندوق', tt.balance], ['بدهی باقی‌مانده وام‌ها', sum(S.loans.filter(l => l.status !== 'cancelled'), l => loanSummary(l).remaining)]]
      };
    }
  },
  {
    id: 'performance', title: 'گزارش عملکرد هر عضو', params: [],
    build() {
      const rows = activeMembers().sort((a, b) => a.code - b.code).map(m => {
        const months = memberDueMonths(m), f = memberFinance(m);
        const full = months.filter(ym => shareMonthInfo(m, ym).status === 'paid').length;
        const pct = months.length ? Math.round(full * 100 / months.length) : 100;
        return [m.code, fullName(m), months.length, full, pct, loansOfMember(m.id).length, f.overdueCount, f.statusLabel];
      });
      return {
        title: 'گزارش عملکرد اعضا',
        cols: [{ label: 'کد', t: C.num }, { label: 'عضو' }, { label: 'ماه‌های سررسید', t: C.num }, { label: 'ماه کامل پرداخت', t: C.num }, { label: 'درصد پرداخت', t: C.num }, { label: 'تعداد وام', t: C.num }, { label: 'قسط معوق', t: C.num }, { label: 'وضعیت' }],
        rows
      };
    }
  }
];
function rangeLabel(p) { return p.from || p.to ? ' — از ' + fmtDateLong(p.from || '') + ' تا ' + fmtDateLong(p.to || todayJ()) : ''; }

/* ---------- نمایش ---------- */
function cellText(v, t) {
  if (v === '' || v == null) return '';
  if (t === C.money) return fmtMoney(v);
  if (t === C.num) return faDigits(v);
  if (t === C.date) return v === '—' ? v : faDigits(v);
  return esc(v);
}
function reportHtml(r) {
  const head = '<div class="rp-head"><div class="rp-fund">' + esc(S.settings.fundName) + '</div><div class="rp-title">' + esc(r.title) + '</div><div class="rp-date">تاریخ تهیه: ' + faDigits(todayJ()) + ' — مبالغ به ' + esc(S.settings.currency) + '</div></div>';
  let sm = '';
  if (r.summary) sm = '<div class="rp-sum">' + r.summary.map(s => '<div><span>' + esc(s[0]) + '</span><b>' + fmtMoney(s[1]) + '</b></div>').join('') + '</div>';
  const th = '<tr>' + r.cols.map(c => '<th>' + esc(c.label) + '</th>').join('') + '</tr>';
  const body = r.rows.length
    ? r.rows.map(row => '<tr>' + row.map((v, i) => '<td class="' + (r.cols[i].t === C.money || r.cols[i].t === C.num ? 'n' : '') + '">' + cellText(v, r.cols[i].t) + '</td>').join('') + '</tr>').join('')
    : '<tr><td colspan="' + r.cols.length + '" class="empty">موردی برای نمایش وجود ندارد</td></tr>';
  const foot = r.foot ? '<tr class="ft">' + r.foot.map((v, i) => '<td class="' + (r.cols[i].t === C.money || r.cols[i].t === C.num ? 'n' : '') + '">' + cellText(v, r.cols[i].t) + '</td>').join('') + '</tr>' : '';
  return head + sm + '<div class="tblwrap"><table class="rp"><thead>' + th + '</thead><tbody>' + body + foot + '</tbody></table></div><div class="rp-foot">' + esc(S.settings.fundName) + ' — تولیدشده توسط برنامه‌ی مدیریت صندوق</div>';
}
function reportToXlsxRows(r) {
  const rows = [[S.settings.fundName], [r.title], ['تاریخ تهیه: ' + todayJ()]];
  if (r.summary) r.summary.forEach(s => rows.push([s[0], s[1]]));
  rows.push([]);
  const hdr = rows.length;
  rows.push(r.cols.map(c => c.label));
  r.rows.forEach(row => rows.push(row.map((v, i) => (r.cols[i].t === C.money || r.cols[i].t === C.num) && typeof v === 'number' ? v : (v == null ? '' : String(v)))));
  if (r.foot) rows.push(r.foot);
  return { rows, headerRows: hdr + 1 };
}
function reportToText(r) {
  const lines = [S.settings.fundName, r.title, 'تاریخ: ' + faDigits(todayJ()), ''];
  if (r.summary) r.summary.forEach(s => lines.push(s[0] + ': ' + fmtMoney(s[1]) + ' ' + S.settings.currency));
  if (r.summary) lines.push('');
  r.rows.slice(0, 60).forEach(row => lines.push(row.map((v, i) => cellText(v, r.cols[i].t)).filter(Boolean).join(' | ')));
  if (r.rows.length > 60) lines.push('… و ' + faDigits(r.rows.length - 60) + ' ردیف دیگر (فایل کامل را از خروجی Excel بگیرید)');
  if (r.foot) lines.push(r.foot.map((v, i) => cellText(v, r.cols[i].t)).filter(Boolean).join(' | '));
  return lines.join('\n');
}
