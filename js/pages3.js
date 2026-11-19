/* pages3.js — گزارش‌ها، اسناد، پیام‌رسانی، تنظیمات، پشتیبان‌گیری */
'use strict';

/* ======================= گزارش‌ها ======================= */
let rpUi = { id: null, month: null, year: null, from: '', to: '' };
VIEWS.reports = function () {
  let h = pageHead('گزارش‌های مدیریتی');
  if (!rpUi.id) {
    h += '<div class="list cards">' + REPORTS.map((r, i) => '<a class="mcard" data-act="rp-open" data-id="' + r.id + '"><div class="av sm">' + faDigits(i + 1) + '</div><div class="mc-m"><b>' + esc(r.title) + '</b></div>' + ic('chev', 16) + '</a>').join('') + '</div>';
    return h;
  }
  const def = REPORTS.find(r => r.id === rpUi.id);
  const p = { month: rpUi.month || ymOf(todayJ()), year: rpUi.year || S.settings.fiscalYear, from: rpUi.from, to: rpUi.to };
  let ctl = '';
  if (def.params.includes('month')) ctl = '<div class="field">' + jmonthHtml('rpmonth', p.month) + '</div>';
  if (def.params.includes('year')) ctl = '<div class="field"><select class="inp" id="rpyear">' + [-3, -2, -1, 0, 1, 2].map(d => { const y = parseJ(todayJ()).jy + d; return '<option value="' + y + '"' + (y === +p.year ? ' selected' : '') + '>' + faDigits(y) + '</option>'; }).join('') + '</select></div>';
  if (def.params.includes('range')) ctl = '<div class="fgrid"><div class="field half"><label class="fl">از تاریخ</label>' + jdateHtml('rpfrom', p.from || S.settings.startMonth + '/01') + '</div><div class="field half"><label class="fl">تا تاریخ</label>' + jdateHtml('rpto', p.to || todayJ()) + '</div></div>';
  const r = def.build(p);
  h += '<a class="back" data-act="rp-back">' + ic('chev', 18) + ' فهرست گزارش‌ها</a>' + ctl;
  h += '<div class="btnrow wrap"><button class="btn sm primary" data-act="rp-pdf">' + ic('print', 16) + ' چاپ / PDF</button><button class="btn sm" data-act="rp-xlsx">Excel</button><button class="btn sm" data-act="rp-share">' + ic('share', 16) + ' اشتراک‌گذاری</button></div>';
  h += '<div class="card report">' + reportHtml(r) + '</div>';
  VIEWS._lastReport = r;
  return h;
};
ACT['rp-open'] = d => { rpUi.id = d.id; render(); };
ACT['rp-back'] = () => { rpUi.id = null; render(); };
document.addEventListener('change', e => {
  const n = e.target.name;
  if (n === 'rpmonth') { rpUi.month = e.target.value; render(); }
  if (n === 'rpfrom') { rpUi.from = e.target.value; render(); }
  if (n === 'rpto') { rpUi.to = e.target.value; render(); }
  if (e.target.id === 'rpyear') { rpUi.year = e.target.value; render(); }
});
ACT['rp-pdf'] = () => printHtml(reportHtml(VIEWS._lastReport));
function reportXlsxBlob(r) { const x = reportToXlsxRows(r); return buildXlsx(r.title, x.rows, x.headerRows, r.cols.map((c, i) => i === 0 ? 14 : 20)); }
ACT['rp-xlsx'] = () => { const r = VIEWS._lastReport; saveBlob(reportXlsxBlob(r), 'گزارش-' + todayJ().replace(/\//g, '-') + '.xlsx'); toast('فایل Excel ساخته شد'); };
ACT['rp-share'] = async () => {
  const r = VIEWS._lastReport;
  await shareFileOrText({ blob: reportXlsxBlob(r), name: 'report-' + todayJ().replace(/\//g, '-') + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', title: r.title, text: reportToText(r) });
};

/* ======================= اسناد و مدارک ======================= */
let docUi = { q: '', cat: 'all' };
const DOC_CATS = { receipt: 'رسید پرداخت', deposit: 'فیش واریزی', minutes: 'صورت‌جلسه', loan: 'سند وام', pdf: 'فایل PDF', other: 'سایر' };
VIEWS.docs = function () {
  const q = normText(docUi.q);
  const list = S.docs.filter(d => (docUi.cat === 'all' || d.cat === docUi.cat) && (!q || normText(d.title + ' ' + d.name + ' ' + (d.memberId ? fullName(memberById(d.memberId)) : '')).includes(q))).sort((a, b) => b.ts - a.ts);
  let h = pageHead('اسناد و مدارک', '<button class="btn primary sm" data-act="doc-new">' + ic('plus', 18) + ' سند جدید</button>');
  h += '<div class="toolbar"><div class="searchbox">' + ic('search', 18) + '<input id="dq" class="inp" placeholder="جست‌وجوی اسناد" value="' + esc(docUi.q) + '"></div><select class="inp" id="dcat"><option value="all">همه دسته‌ها</option>' + Object.entries(DOC_CATS).map(c => '<option value="' + c[0] + '">' + c[1] + '</option>').join('') + '</select></div>';
  h += '<div class="muted small">حجم کل: ' + faDigits((sum(S.docs, d => d.size || 0) / 1048576).toFixed(1)) + ' مگابایت</div><div class="list">' + (list.map(d => {
    const m = d.memberId ? memberById(d.memberId) : null, tx = d.txId ? S.tx.find(t => t.id === d.txId) : null;
    return '<div class="li col"><div class="li-row"><div class="li-i in">' + ic('file', 18) + '</div><div class="li-m"><b>' + esc(d.title) + '</b><small>' + esc(DOC_CATS[d.cat] || '') + ' · ' + faDigits(d.date) + (m ? ' · ' + esc(fullName(m)) : '') + (tx ? ' · تراکنش ' + faDigits(tx.no) : '') + '</small></div></div><div class="btnrow wrap tight"><button class="btn xs primary" data-act="doc-view" data-id="' + d.id + '">مشاهده</button><button class="btn xs" data-act="doc-dl" data-id="' + d.id + '">دریافت فایل</button><button class="btn xs danger-o" data-act="doc-del" data-id="' + d.id + '">حذف</button></div></div>';
  }).join('') || '<div class="empty">سندی ذخیره نشده است</div>') + '</div>';
  setTimeout(() => { const s = $('#dcat'); if (s) s.value = docUi.cat; }, 0);
  return h;
};
document.addEventListener('input', e => { if (e.target.id === 'dq') { docUi.q = e.target.value; const p = e.target.selectionStart; render(); const el = $('#dq'); if (el) { el.focus(); try { el.setSelectionRange(p, p); } catch (x) { /* ignore */ } } } });
document.addEventListener('change', e => { if (e.target.id === 'dcat') { docUi.cat = e.target.value; render(); } });
ACT['doc-new'] = () => {
  openForm({ title: 'ذخیره سند جدید', values: { date: todayJ(), cat: 'receipt' },
    fields: [
      { name: 'file', label: 'فایل (عکس، PDF یا سند)', type: 'file', required: true, accept: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt' },
      { name: 'title', label: 'عنوان', required: true }, { name: 'cat', label: 'دسته‌بندی', type: 'select', options: Object.entries(DOC_CATS) },
      { name: 'date', label: 'تاریخ سند', type: 'date' },
      { name: 'memberId', label: 'اتصال به عضو (اختیاری)', type: 'select', options: memberOpts(S.members, true, '— بدون اتصال —') },
      { name: 'txId', label: 'اتصال به تراکنش (اختیاری)', type: 'select', options: [['', '— بدون اتصال —']].concat(S.tx.filter(t => !t.voided).slice(-60).reverse().map(t => [t.id, faDigits(t.no) + ' — ' + t.desc + ' — ' + fmtMoney(t.amount)])) }
    ],
    onSubmit: async v => {
      if (!v.file) throw new Error('فایلی انتخاب نشده است');
      if (v.file.size > 15 * 1048576) throw new Error('حجم فایل بیشتر از ۱۵ مگابایت است');
      if (!v.title.trim()) throw new Error('عنوان را بنویسید');
      const meta = { id: uid(), title: v.title.trim(), cat: v.cat, date: v.date, memberId: v.memberId || null, txId: v.txId || null, name: v.file.name, mime: v.file.type, size: v.file.size, ts: Date.now() };
      await DB.saveDocBlob(meta, v.file); await audit('ذخیره سند', 'doc', meta.id, null, { title: meta.title });
      toast('سند ذخیره شد'); render();
    } });
};
ACT['doc-view'] = async d => {
  const meta = S.docs.find(x => x.id === d.id), blob = await DB.getDocBlob(d.id);
  if (!blob) throw new Error('فایل پیدا نشد');
  const url = URL.createObjectURL(blob);
  const body = meta.mime.startsWith('image/') ? '<img class="docimg" src="' + url + '" alt="">' : meta.mime === 'application/pdf' ? '<iframe class="docpdf" src="' + url + '"></iframe><p class="muted small">اگر PDF نمایش داده نشد، «دریافت فایل» را بزنید.</p>' : '<p>این نوع فایل پیش‌نمایش ندارد. «دریافت فایل» را بزنید.</p>';
  openModal(meta.title, body, { wide: true, onClose: () => URL.revokeObjectURL(url) });
};
ACT['doc-dl'] = async d => { const meta = S.docs.find(x => x.id === d.id), blob = await DB.getDocBlob(d.id); saveBlob(blob, meta.name); };
ACT['doc-del'] = async d => {
  const meta = S.docs.find(x => x.id === d.id);
  if (!(await confirmDlg('سند «' + meta.title + '» حذف شود؟ این کار قابل بازگشت نیست.', { danger: true, okLabel: 'حذف سند' }))) return;
  await DB.del('docs', d.id);
  S.docs = S.docs.filter(x => x.id !== d.id);
  await audit('حذف سند', 'doc', d.id, { title: meta.title }, null);
  toast('سند حذف شد'); render();
};

/* ======================= پیام‌رسانی ======================= */
function fillTemplate(text, ctx) {
  const map = { '{name}': ctx.name || '', '{fund}': S.settings.fundName, '{amount}': ctx.amount != null ? fmtMoney(ctx.amount) + ' ' + S.settings.currency : '', '{month}': ctx.month || ymLabel(ymOf(todayJ())), '{date}': ctx.date || faDigits(todayJ()) };
  let out = text;
  for (const k of Object.keys(map)) out = out.split(k).join(map[k]);
  return out;
}
function templateContext(key, m) {
  const ctx = { name: m ? fullName(m) : 'اعضای محترم' };
  if (m) {
    const f = memberFinance(m);
    if (key === 'share') ctx.amount = memberDueFor(m, ymOf(todayJ())) || (m.unitAmount || S.settings.shareAmount) * m.shares;
    if (key === 'installment') { const l = loansOfMember(m.id).find(x => loanSummary(x).status === 'active'); const n = l && loanSummary(l).next; if (n) { ctx.amount = n.rest; ctx.date = faDigits(n.due); } }
    if (key === 'debt') ctx.amount = f.totalDebt;
    if (key === 'loanPaid') { const l = loansOfMember(m.id).sort((a, b) => b.no - a.no)[0]; if (l) { ctx.amount = l.amount; ctx.date = faDigits(l.payDate); } }
  }
  if (key === 'newShare') ctx.amount = S.settings.shareAmount;
  if (key === 'newLoan') ctx.amount = S.settings.loanAmount;
  if (key === 'newPeriod') ctx.amount = S.settings.shareAmount;
  return ctx;
}
let msgUi = { key: 'share', memberId: '', text: null };
VIEWS.messages = function () {
  const keys = Object.keys(S.settings.templates), tpl = S.settings.templates[msgUi.key] || S.settings.templates[keys[0]];
  const m = memberById(msgUi.memberId);
  const text = msgUi.text != null ? msgUi.text : fillTemplate(tpl.text, templateContext(msgUi.key, m));
  let h = pageHead('پیام‌رسانی');
  h += '<div class="note">برنامه هیچ پیامی را خودکار ارسال نمی‌کند. پیام را ببینید، ویرایش کنید و با تأیید خودتان در واتساپ باز می‌شود.</div>';
  h += '<div class="card"><div class="field"><label class="fl">نوع پیام</label><select class="inp" id="mkey">' + keys.map(k => '<option value="' + k + '"' + (k === msgUi.key ? ' selected' : '') + '>' + esc(S.settings.templates[k].title) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label class="fl">گیرنده</label><select class="inp" id="mmember"><option value="">— همه اعضا / عمومی —</option>' + S.members.filter(x => x.active).map(x => '<option value="' + x.id + '"' + (x.id === msgUi.memberId ? ' selected' : '') + '>' + esc(fullName(x)) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label class="fl">متن پیام (قابل ویرایش)</label><textarea class="inp" id="mtext" rows="8">' + esc(text) + '</textarea></div>' +
    '<div class="btnrow wrap"><button class="btn sm" data-act="msg-copy">' + ic('copy', 16) + ' کپی</button><button class="btn primary sm" data-act="msg-wa">' + ic('wa', 16) + ' ارسال با واتساپ</button><button class="btn sm" data-act="msg-reset">بازنشانی متن</button></div></div>';
  if (msgUi.key === 'share' || msgUi.key === 'debt' || msgUi.key === 'installment') h += '<div class="card"><div class="ch"><b>ارسال دسته‌ای (نفر به نفر با تأیید شما)</b></div><button class="btn sm" data-act="msg-bulk">آماده‌سازی پیام برای همه‌ی مشمولان</button></div>';
  return h;
};
document.addEventListener('change', e => {
  if (e.target.id === 'mkey') { msgUi.key = e.target.value; msgUi.text = null; render(); }
  if (e.target.id === 'mmember') { msgUi.memberId = e.target.value; msgUi.text = null; render(); }
});
document.addEventListener('input', e => { if (e.target.id === 'mtext') msgUi.text = e.target.value; });
ACT['msg-copy'] = async () => { toast((await copyText($('#mtext').value)) ? 'متن کپی شد' : 'کپی نشد', ''); };
ACT['msg-reset'] = () => { msgUi.text = null; render(); };
function waNumber(p) {
  let n = enDigits(p || '').replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '98' + n.slice(1);
  return n;
}
function openWhatsApp(phone, text) {
  const n = waNumber(phone);
  window.open('https://wa.me/' + (n || '') + '?text=' + encodeURIComponent(text), '_blank');
}
ACT['msg-wa'] = async () => {
  const m = memberById(msgUi.memberId), text = $('#mtext').value;
  if (m && !m.phone) throw new Error('برای این عضو شماره تماس ثبت نشده است');
  if (!(await confirmDlg('پیام در واتساپ باز می‌شود' + (m ? ' (گیرنده: ' + fullName(m) + ')' : ' تا گیرنده را خودتان انتخاب کنید') + '. ارسال نهایی با شماست. ادامه؟', { okLabel: 'باز کردن واتساپ' }))) return;
  openWhatsApp(m ? m.phone : '', text);
};
ACT['msg-bulk'] = () => {
  const key = msgUi.key;
  let targets = activeMembers();
  if (key === 'share') targets = targets.filter(m => shareMonthInfo(m, ymOf(todayJ())).rest > 0);
  if (key === 'debt') targets = targets.filter(m => memberFinance(m).totalDebt > 0);
  if (key === 'installment') targets = targets.filter(m => loansOfMember(m.id).some(l => loanSummary(l).status === 'active'));
  const w = openModal('ارسال دسته‌ای', '<p class="muted small">برای هر نفر دکمه‌ی «ارسال» را بزنید؛ هیچ پیامی خودکار ارسال نمی‌شود.</p><div class="list">' + (targets.map(m => '<div class="li"><div class="li-m"><b>' + esc(fullName(m)) + '</b><small>' + (m.phone ? faDigits(m.phone) : 'بدون شماره') + '</small></div><button class="btn xs primary" data-bulk="' + m.id + '"' + (m.phone ? '' : ' disabled') + '>ارسال</button></div>').join('') || '<div class="empty small">مشمولی وجود ندارد</div>') + '</div>');
  w.addEventListener('click', e => {
    const b = e.target.closest('[data-bulk]'); if (!b) return;
    const m = memberById(b.dataset.bulk);
    openWhatsApp(m.phone, fillTemplate(S.settings.templates[key].text, templateContext(key, m))); b.textContent = 'باز شد ✓';
  });
};

/* ======================= تنظیمات ======================= */
VIEWS.settings = function () {
  const st = S.settings;
  let h = pageHead('تنظیمات مدیریتی');
  h += '<div class="note">تغییر مبلغ‌ها فقط روی وام‌ها و ماه‌های جدید اثر می‌گذارد؛ اطلاعات قبلی تغییر نمی‌کند.</div>';
  const row = (label, val, act) => '<a class="setrow" data-act="' + act + '"><span>' + label + '</span><b>' + val + '</b>' + ic('chev', 16) + '</a>';
  h += '<div class="card nopad">' +
    row('نام صندوق', esc(st.fundName), 'set-name') + row('لوگو', st.logo ? 'سفارشی' : 'پیش‌فرض', 'set-logo') +
    row('مبلغ هر سهم ماهانه', fmtMoney(st.shareAmount) + ' ' + esc(st.currency), 'set-share') +
    row('مبلغ پیش‌فرض وام', fmtMoney(st.loanAmount), 'set-loan') +
    row('تعداد اقساط / مبلغ قسط', faDigits(st.instCount) + ' × ' + fmtMoney(st.instAmount), 'set-inst') +
    row('ظرفیت وام در هر نوبت', faDigits(st.loanCapacity), 'set-cap') +
    row('تعداد ضامن الزامی', faDigits(st.guarantorCount) + ' نفر', 'set-guar') +
    row('شروع دوره مالی', ymLabel(st.startMonth), 'set-start') +
    row('سال مالی', faDigits(st.fiscalYear), 'set-year') +
    row('سررسید سهم ماهانه (روز ماه)', faDigits(st.dueDay), 'set-due') +
    row('واحد پول', esc(st.currency), 'set-currency') + row('پیام‌های آماده', faDigits(Object.keys(st.templates).length) + ' قالب', 'set-templates') + '</div>';
  const hist = st.shareHistory;
  h += '<div class="card"><div class="ch"><b>تاریخچه تغییر مبلغ سهم</b></div><div class="list">' + hist.map(x => '<div class="li"><div class="li-m"><b>از ' + ymLabel(x.from) + '</b></div><div class="li-a">' + fmtMoney(x.amount) + '</div></div>').join('') + '</div></div>';
  h += '<div class="card"><div class="ch"><b>تاریخچه تغییرات مالی و سیستمی</b><a class="lnk" data-act="audit-view">مشاهده</a></div><div class="muted small">' + faDigits(S.audit.length) + ' رویداد ثبت شده است</div></div>';
  return h;
};
const setNum = (label, key, o) => () => openForm({ title: label, values: { v: S.settings[key] }, fields: [{ name: 'v', label, type: o.money ? 'money' : 'number', required: true }],
  onSubmit: async x => { const n = o.money ? x.v : parseInt(enDigits(x.v), 10); if (!(n >= (o.min == null ? 1 : o.min)) || isNaN(n)) throw new Error('مقدار نامعتبر است'); const before = S.settings[key]; S.settings[key] = n; await DB.saveSettings(); await audit('تغییر تنظیمات: ' + label, 'settings', key, before, n); toast('ذخیره شد'); render(); } });
ACT['set-name'] = () => openForm({ title: 'نام صندوق', values: { v: S.settings.fundName }, fields: [{ name: 'v', label: 'نام صندوق', required: true }], onSubmit: async x => { if (!x.v.trim()) throw new Error('نام را بنویسید'); S.settings.fundName = x.v.trim(); await DB.saveSettings(); applyBrand(); render(); } });
ACT['set-currency'] = () => openForm({ title: 'واحد پول', values: { v: S.settings.currency }, fields: [{ name: 'v', label: 'واحد پول', required: true }], onSubmit: async x => { S.settings.currency = x.v.trim() || 'تومان'; await DB.saveSettings(); render(); } });
ACT['set-loan'] = setNum('مبلغ پیش‌فرض وام', 'loanAmount', { money: true });
ACT['set-cap'] = setNum('ظرفیت وام در هر نوبت', 'loanCapacity', {});
ACT['set-guar'] = setNum('تعداد ضامن الزامی (۱ یا ۲)', 'guarantorCount', {});
ACT['set-year'] = setNum('سال مالی', 'fiscalYear', {});
ACT['set-due'] = setNum('روز سررسید سهم ماهانه', 'dueDay', {});
ACT['set-inst'] = () => openForm({ title: 'اقساط وام (برای وام‌های جدید)', values: { c: S.settings.instCount, a: S.settings.instAmount }, fields: [{ name: 'c', label: 'تعداد اقساط', type: 'number', half: true }, { name: 'a', label: 'مبلغ هر قسط', type: 'money', half: true }],
  onSubmit: async x => { const c = parseInt(enDigits(x.c), 10); if (!(c >= 1) || !(x.a > 0)) throw new Error('مقادیر نامعتبر است'); S.settings.instCount = c; S.settings.instAmount = x.a; await DB.saveSettings(); await audit('تغییر تنظیمات اقساط', 'settings', 'inst', null, { c, a: x.a }); toast('ذخیره شد'); render(); } });
ACT['set-start'] = () => openForm({ title: 'شروع دوره مالی', note: 'ماه اول محاسبه‌ی سهم‌ها. تغییر آن بر بدهی سهم همه‌ی اعضا اثر می‌گذارد؛ فقط در ابتدای کار تغییر دهید.', values: { v: S.settings.startMonth }, fields: [{ name: 'v', label: 'ماه شروع', type: 'month' }],
  onSubmit: async x => { const before = S.settings.startMonth; S.settings.startMonth = x.v; S.settings.shareHistory = S.settings.shareHistory.map(h => h.from === before ? { from: x.v, amount: h.amount } : h); await DB.saveSettings(); await audit('تغییر شروع دوره مالی', 'settings', 'startMonth', before, x.v); render(); } });
ACT['set-share'] = () => openForm({ title: 'تغییر مبلغ سهم', note: 'مبلغ جدید فقط از ماه انتخابی به بعد اعمال می‌شود و ماه‌های قبل تغییر نمی‌کنند.', values: { amount: S.settings.shareAmount, from: ymNext(ymOf(todayJ()), 1) },
  fields: [{ name: 'amount', label: 'مبلغ جدید هر سهم', type: 'money', required: true }, { name: 'from', label: 'اعمال از ماه', type: 'month' }],
  onSubmit: async x => { await setShareAmount(x.amount, x.from); toast('ذخیره شد'); render(); } });
ACT['set-logo'] = () => openForm({ title: 'تغییر لوگو', fields: [{ name: 'file', label: 'تصویر لوگو', type: 'file', accept: 'image/*' }, { name: 'reset', type: 'check', checkLabel: 'بازگشت به لوگوی پیش‌فرض' }],
  onSubmit: async x => {
    if (x.reset) S.settings.logo = null;
    else { if (!x.file) throw new Error('تصویری انتخاب نشده است'); if (x.file.size > 700000) throw new Error('حجم تصویر باید کمتر از ۷۰۰ کیلوبایت باشد'); S.settings.logo = await blobToDataUrl(x.file); }
    await DB.saveSettings(); applyBrand(); render();
  } });
ACT['set-templates'] = () => {
  const keys = Object.keys(S.settings.templates);
  openForm({ title: 'ویرایش پیام‌های آماده', values: { key: keys[0], text: S.settings.templates[keys[0]].text },
    note: 'متغیرها: {name} {fund} {amount} {month} {date}',
    fields: v => [{ name: 'key', label: 'قالب', type: 'select', reload: true, options: keys.map(k => [k, S.settings.templates[k].title]) }, { name: 'text', label: 'متن', type: 'textarea', rows: 7, value: v._k === v.key ? v.text : S.settings.templates[v.key].text }, { name: 'reset', type: 'check', checkLabel: 'بازگشت به متن پیش‌فرض این قالب' }],
    submit: 'ذخیره', onSubmit: async x => { S.settings.templates[x.key] = { title: S.settings.templates[x.key].title, text: x.reset ? DEFAULT_TEMPLATES[x.key].text : x.text }; await DB.saveSettings(); toast('ذخیره شد'); render(); } });
};
ACT['audit-view'] = () => {
  const list = S.audit.slice().reverse().slice(0, 120);
  openModal('تاریخچه تغییرات', '<div class="list">' + list.map(a => '<div class="li col"><b>' + esc(a.action) + '</b><small>' + faDigits(a.date) + (a.reason ? ' — ' + esc(a.reason) : '') + '</small></div>').join('') + '</div>' + (S.audit.length > 120 ? '<div class="muted small center">۱۲۰ رویداد آخر نمایش داده شد؛ همه‌ی موارد در فایل پشتیبان موجود است</div>' : ''), { wide: true });
};

/* ======================= پشتیبان‌گیری و امنیت ======================= */
VIEWS.backup = function () {
  const st = S.settings, bu = backupDue();
  let h = pageHead('پشتیبان‌گیری و امنیت');
  if (bu) h += '<div class="banner warn">' + ic('backup', 20) + '<span>' + esc(bu) + '</span></div>';
  h += '<div class="card"><div class="ch"><b>نسخه‌ی پشتیبان</b></div><p class="muted small">آخرین پشتیبان‌گیری: ' + (st.lastBackup ? faDigits(st.lastBackup) : 'انجام نشده') + '</p>' +
    '<div class="btnrow wrap"><button class="btn primary" data-act="bk-save">' + ic('backup', 18) + ' ذخیره‌ی پشتیبان در گوشی</button><button class="btn" data-act="bk-share">' + ic('share', 18) + ' ارسال / انتقال پشتیبان</button><button class="btn" data-act="bk-restore">بازیابی از فایل پشتیبان</button></div>' +
    '<p class="muted small">فایل پشتیبان شامل همه‌ی اعضا، تراکنش‌ها، وام‌ها، اسناد و تنظیمات است. برای انتقال به گوشی جدید، فایل را به گوشی جدید بفرستید و همان‌جا «بازیابی» کنید.</p></div>';
  h += '<div class="card"><div class="ch"><b>یادآوری پشتیبان‌گیری</b></div><div class="field"><label class="fl">هر چند روز یادآوری شود؟</label><select class="inp" id="bkdays">' + [7, 14, 30, 60].map(n => '<option value="' + n + '"' + (n === st.backupReminderDays ? ' selected' : '') + '>هر ' + faDigits(n) + ' روز</option>').join('') + '</select></div></div>';
  h += '<div class="card"><div class="ch"><b>رمز ورود و قفل برنامه</b></div><p class="muted small">وضعیت: ' + (hasPass() ? '<b class="pos">رمز فعال است</b>' : '<b class="neg">رمز تعیین نشده</b>') + '</p><div class="btnrow wrap"><button class="btn" data-act="pw-set">' + (hasPass() ? 'تغییر رمز' : 'تعیین رمز') + '</button>' + (hasPass() ? '<button class="btn" data-act="pw-lock">قفل کردن اکنون</button><button class="btn danger-o" data-act="pw-remove">حذف رمز</button>' : '') + '</div></div>';
  h += '<div class="card"><div class="ch"><b>بازگشت به وضعیت قبل از آخرین بازیابی</b></div><button class="btn sm" data-act="bk-undo">بازگردانی نسخه‌ی ایمنی</button></div>';
  h += '<div class="card"><div class="ch"><b>اطلاعات ذخیره‌سازی</b></div><p class="muted small" id="storageInfo">—</p><p class="muted small">اطلاعات روی حافظه‌ی همین گوشی (مرورگر) ذخیره می‌شود. پاک کردن اطلاعات مرورگر یا حذف برنامه ممکن است اطلاعات را از بین ببرد؛ پس حتماً پشتیبان بگیرید.</p></div>';
  setTimeout(async () => { const el = $('#storageInfo'); if (!el) return; try { const p = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; el.textContent = 'حافظه‌ی ماندگار: ' + (p ? 'فعال ✓' : 'درخواست نشده / غیرفعال') + (e ? ' — مصرف: ' + faDigits(((e.usage || 0) / 1048576).toFixed(1)) + ' مگابایت' : ''); } catch (x) { el.textContent = '—'; } }, 0);
  return h;
};
document.addEventListener('change', async e => { if (e.target.id === 'bkdays') { S.settings.backupReminderDays = +e.target.value; await DB.saveSettings(); toast('ذخیره شد'); } });
async function backupBlob() { const b = await buildBackup(true); return new Blob([JSON.stringify(b)], { type: 'application/json' }); }
ACT['bk-save'] = async () => { const blob = await backupBlob(); saveBlob(blob, backupFileName()); await markBackupDone(); toast('پشتیبان در پوشه‌ی دانلود گوشی ذخیره شد'); render(); };
ACT['bk-share'] = async () => { const blob = await backupBlob(); await shareFileOrText({ blob, name: backupFileName(), mime: 'application/json', title: 'پشتیبان صندوق' }); await markBackupDone(); render(); };
ACT['bk-restore'] = () => openForm({ title: 'بازیابی اطلاعات', danger: true, note: '<b>هشدار:</b> اطلاعات فعلی با محتوای فایل جایگزین می‌شود. پیش از جایگزینی، یک نسخه‌ی ایمنی از وضعیت فعلی نگه‌داری می‌شود.',
  fields: [{ name: 'file', label: 'فایل پشتیبان (.json)', type: 'file', accept: '.json,application/json', required: true }, { name: 'confirmed', type: 'check', checkLabel: 'متوجه هستم که اطلاعات فعلی جایگزین می‌شود' }],
  submit: 'بازیابی',
  onSubmit: async v => {
    if (!v.file) throw new Error('فایلی انتخاب نشده است');
    if (!v.confirmed) throw new Error('تأیید لازم است');
    let b; try { b = JSON.parse(await v.file.text()); } catch (x) { throw new Error('فایل قابل خواندن نیست'); }
    validateBackup(b);
    await restoreBackup(b); toast('اطلاعات بازیابی شد'); applyBrand(); go('#/dashboard');
  } });
ACT['bk-undo'] = async () => { if (!(await confirmDlg('اطلاعات به وضعیت قبل از آخرین بازیابی برگردد؟', { danger: true }))) return; await restorePreSnapshot(); toast('بازگردانی شد'); applyBrand(); render(); };
ACT['pw-set'] = () => openForm({ title: hasPass() ? 'تغییر رمز' : 'تعیین رمز ورود', fields: (hasPass() ? [{ name: 'old', label: 'رمز فعلی', type: 'password' }] : []).concat([{ name: 'p1', label: 'رمز جدید (حداقل ۴ کاراکتر)', type: 'password' }, { name: 'p2', label: 'تکرار رمز', type: 'password' }]),
  note: 'رمز قابل بازیابی نیست. حتماً آن را جایی امن بنویسید. در صورت فراموشی، فقط با پاک کردن اطلاعات برنامه و بازیابی از پشتیبان می‌توان وارد شد.',
  onSubmit: async v => { if (hasPass() && !(await checkPassword(v.old))) throw new Error('رمز فعلی اشتباه است'); if (v.p1 !== v.p2) throw new Error('تکرار رمز یکسان نیست'); await setPassword(v.p1); toast('رمز ذخیره شد'); render(); } });
ACT['pw-remove'] = () => openForm({ title: 'حذف رمز', danger: true, fields: [{ name: 'old', label: 'رمز فعلی', type: 'password' }], onSubmit: async v => { if (!(await checkPassword(v.old))) throw new Error('رمز اشتباه است'); await removePassword(); toast('رمز حذف شد'); render(); } });
ACT['pw-lock'] = () => lockApp();
