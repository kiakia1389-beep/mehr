/* ui-core.js — اجزای مشترک رابط: آیکون، پنجره، فرم، تاریخ شمسی، نمودار، مسیریابی */
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ---------- آیکون‌ها ---------- */
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', members: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5M17 11a3 3 0 1 0-1-5.8M18 14.7c2.2.5 3.5 2.2 3.5 5.3',
  shares: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2.5-3.5H17M16.5 14h2.5',
  loans: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18',
  queue: 'M4 6h16M4 12h16M4 18h9M17 16l2 2 3-4',
  tx: 'M7 4v14M3 14l4 4 4-4M17 20V6M13 10l4-4 4 4',
  status: 'M5 12.5l4.5 4.5L19 7.5',
  reports: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7M9 8h3',
  docs: 'M3 6.5h6l2 2.5h10V19H3z',
  msg: 'M4 5h16v11H9.5L5 20v-4H4z',
  settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  backup: 'M12 3v12M7 10.5l5 5 5-5M4 20h16',
  lock: 'M6 11h12v9.5H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  menu: 'M4 6.5h16M4 12h16M4 17.5h16', plus: 'M12 5v14M5 12h14',
  print: 'M7 9V3h10v6M6 17H4v-6h16v6h-2M7 14h10v7H7z', share: 'M12 15V3M8 7l4-4 4 4M5 12v8.5h14V12',
  edit: 'M4 20h4L19.5 8.5l-4-4L4 16z', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M21 21l-5-5',
  x: 'M6 6l12 12M18 6L6 18', chev: 'M14 6l-6 6 6 6', up: 'M6 14l6-6 6 6', down: 'M6 10l6 6 6-6',
  copy: 'M9 9h11v11H9zM5 15V4h11', wa: 'M4 20l1.3-4.2A8 8 0 1 1 8.4 19zM9 9c0 3 3 6 6 6l1.3-1.5-2-1-1 .7c-1-.4-1.8-1.2-2.2-2.2l.7-1-1-2z',
  dice: 'M5 5h14v14H5zM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01', file: 'M6 3h9l4 4v14H6zM14 3v5h5',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', cash: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5'
};
function ic(name, size) {
  const s = size || 22;
  return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICONS[name] || '') + '"/></svg>';
}
const LOGO_SVG = '<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17a883"/><stop offset="1" stop-color="#0a5f4a"/></linearGradient></defs><rect width="128" height="128" rx="30" fill="url(#lg)"/><path d="M64 60c-5-10-22-8-22 5 0 10 12 17 22 25 10-8 22-15 22-25 0-13-17-15-22-5z" fill="#f2c94c"/><path d="M14 88c4 16 20 26 36 22l14-4-6-8c-10 3-22 0-28-10z" fill="#fff"/><path d="M114 88c-4 16-20 26-36 22l-14-4 6-8c10 3 22 0 28-10z" fill="#fff" opacity=".92"/><circle cx="64" cy="99" r="3.5" fill="#f2c94c"/></svg>';
function logoHtml(cls) {
  return '<span class="' + (cls || 'logo') + '">' + (S.settings && S.settings.logo ? '<img src="' + S.settings.logo + '" alt="">' : LOGO_SVG) + '</span>';
}

/* ---------- پیام کوتاه و پنجره ---------- */
function toast(msg, type) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast show ' + (type || '');
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'toast'; }, type === 'err' ? 4200 : 2400);
}
let _modalId = 0;
function openModal(title, bodyHtml, opts) {
  opts = opts || {};
  const id = ++_modalId;
  const wrap = document.createElement('div');
  wrap.className = 'modal'; wrap.dataset.mid = id;
  wrap.innerHTML = '<div class="sheet' + (opts.wide ? ' wide' : '') + '"><div class="sheet-h"><b>' + esc(title) + '</b><button class="icbtn" data-close aria-label="بستن">' + ic('x') + '</button></div><div class="sheet-b">' + bodyHtml + '</div></div>';
  $('#modalRoot').appendChild(wrap);
  document.body.classList.add('noscroll');
  wrap.addEventListener('mousedown', e => { if (e.target === wrap && !opts.sticky) closeModal(wrap); });
  wrap._onClose = opts.onClose;
  return wrap;
}
function closeModal(w) {
  const wrap = w || $('#modalRoot').lastElementChild;
  if (!wrap) return;
  wrap.remove();
  if (wrap._onClose) wrap._onClose();
  if (!$('#modalRoot').children.length) document.body.classList.remove('noscroll');
}
function confirmDlg(message, o) {
  o = o || {};
  return new Promise(resolve => {
    const w = openModal(o.title || 'تأیید', '<div class="confirm-msg">' + (o.html ? message : esc(message).replace(/\n/g, '<br>')) + '</div><div class="btnrow"><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-ok>' + esc(o.okLabel || 'تأیید') + '</button><button class="btn" data-no>' + esc(o.cancelLabel || 'انصراف') + '</button></div>', { sticky: true });
    let done = false;
    const fin = v => { if (done) return; done = true; closeModal(w); resolve(v); };
    w.addEventListener('click', e => {
      if (e.target.closest('[data-ok]')) fin(true);
      else if (e.target.closest('[data-no]') || e.target.closest('[data-close]')) fin(false);
    }, true);
  });
}
/** ورود متن (مثلاً دلیل ابطال) */
function promptDlg(title, label, o) {
  o = o || {};
  return new Promise(resolve => {
    const w = openModal(title, '<label class="fl">' + esc(label) + '</label><textarea class="inp" id="pd" rows="3" placeholder="' + esc(o.placeholder || '') + '"></textarea><div class="err" id="pderr"></div><div class="btnrow"><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-ok>' + esc(o.okLabel || 'ثبت') + '</button><button class="btn" data-no>انصراف</button></div>', { sticky: true });
    let done = false;
    const fin = v => { if (done) return; done = true; closeModal(w); resolve(v); };
    w.addEventListener('click', e => {
      if (e.target.closest('[data-ok]')) {
        const v = $('#pd', w).value.trim();
        if (!v && !o.optional) { $('#pderr', w).textContent = 'این مورد الزامی است'; return; }
        fin(v);
      } else if (e.target.closest('[data-no]') || e.target.closest('[data-close]')) fin(null);
    }, true);
  });
}

/* ---------- فیلدهای فرم ---------- */
function jdateHtml(name, value, o) {
  const p = parseJ(value) || parseJ(todayJ());
  const yNow = parseJ(todayJ()).jy;
  const y0 = Math.min(p.jy, yNow - 8), y1 = Math.max(p.jy, yNow + 12);
  let ys = '', ms = '', ds = '';
  for (let y = y1; y >= y0; y--) ys += '<option value="' + y + '"' + (y === p.jy ? ' selected' : '') + '>' + faDigits(y) + '</option>';
  MONTHS.forEach((mn, i) => { ms += '<option value="' + (i + 1) + '"' + (i + 1 === p.jm ? ' selected' : '') + '>' + mn + '</option>'; });
  for (let d = 1; d <= daysInMonthJ(p.jy, p.jm); d++) ds += '<option value="' + d + '"' + (d === p.jd ? ' selected' : '') + '>' + faDigits(d) + '</option>';
  return '<div class="jdate" data-kind="date"><select class="inp jd" aria-label="روز">' + ds + '</select><select class="inp jm" aria-label="ماه">' + ms + '</select><select class="inp jy" aria-label="سال">' + ys + '</select><input type="hidden" name="' + name + '" value="' + fmtJ(p.jy, p.jm, p.jd) + '"></div>';
}
function jmonthHtml(name, value) {
  const cur = ymOf(todayJ()), v = /^\d{4}\/\d{2}$/.test(value || '') ? value : cur;
  const [vy, vm] = v.split('/').map(Number), yNow = +cur.slice(0, 4);
  let ys = '', ms = '';
  for (let y = Math.max(vy, yNow + 3); y >= Math.min(vy, yNow - 8); y--) ys += '<option value="' + y + '"' + (y === vy ? ' selected' : '') + '>' + faDigits(y) + '</option>';
  MONTHS.forEach((mn, i) => { ms += '<option value="' + (i + 1) + '"' + (i + 1 === vm ? ' selected' : '') + '>' + mn + '</option>'; });
  return '<div class="jdate" data-kind="month"><select class="inp jm">' + ms + '</select><select class="inp jy">' + ys + '</select><input type="hidden" name="' + name + '" value="' + vy + '/' + pad2(vm) + '"></div>';
}
document.addEventListener('change', e => {
  const wrap = e.target.closest('.jdate');
  if (!wrap) return;
  const y = +$('.jy', wrap).value, m = +$('.jm', wrap).value, hid = $('input[type=hidden]', wrap);
  if (wrap.dataset.kind === 'date') {
    const dsel = $('.jd', wrap), n = daysInMonthJ(y, m);
    let d = +dsel.value;
    if (e.target.classList.contains('jy') || e.target.classList.contains('jm')) {
      let o = ''; if (d > n) d = n;
      for (let i = 1; i <= n; i++) o += '<option value="' + i + '"' + (i === d ? ' selected' : '') + '>' + faDigits(i) + '</option>';
      dsel.innerHTML = o;
    }
    hid.value = fmtJ(y, m, d);
  } else hid.value = y + '/' + pad2(m);
  hid.dispatchEvent(new Event('change', { bubbles: true }));
});
document.addEventListener('blur', e => {
  if (e.target.classList && e.target.classList.contains('money')) { const n = parseAmount(e.target.value); e.target.value = n ? faDigits(fmtNum(n)) : ''; }
}, true);
document.addEventListener('input', e => {
  if (e.target.classList && e.target.classList.contains('money')) {
    const n = parseAmount(e.target.value); const pos = e.target.value.length;
    e.target.value = n ? fmtNum(n) : ''; void pos;
  }
});

function fieldHtml(f) {
  const v = f.value == null ? '' : f.value, id = 'fld_' + f.name;
  let inner = '';
  switch (f.type) {
    case 'money': inner = '<input class="inp money" id="' + id + '" name="' + f.name + '" inputmode="numeric" autocomplete="off" value="' + (v !== '' && +v ? esc(faDigits(fmtNum(v))) : '') + '" placeholder="' + esc(f.placeholder || '') + '">'; break;
    case 'number': inner = '<input class="inp" id="' + id + '" name="' + f.name + '" inputmode="numeric" autocomplete="off" value="' + esc(faDigits(v)) + '">'; break;
    case 'tel': inner = '<input class="inp ltr" id="' + id + '" name="' + f.name + '" type="tel" inputmode="tel" value="' + esc(v) + '" placeholder="09123456789">'; break;
    case 'date': inner = jdateHtml(f.name, v); break;
    case 'month': inner = jmonthHtml(f.name, v); break;
    case 'password': inner = '<input class="inp ltr" id="' + id + '" name="' + f.name + '" type="password" autocomplete="off" value="' + esc(v) + '">'; break;
    case 'textarea': inner = '<textarea class="inp" id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(v) + '</textarea>'; break;
    case 'select': inner = '<select class="inp" id="' + id + '" name="' + f.name + '"' + (f.reload ? ' data-reload="1"' : '') + '>' + (f.options || []).map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>'; break;
    case 'check': inner = '<label class="chk"><input type="checkbox" name="' + f.name + '"' + (v ? ' checked' : '') + '><span>' + esc(f.checkLabel || f.label) + '</span></label>'; break;
    case 'html': return '<div class="field"><label class="fl">' + esc(f.label) + '</label><div class="infobox">' + (f.html || '') + '</div></div>';
    case 'file': inner = '<input class="inp" id="' + id + '" name="' + f.name + '" type="file" accept="' + esc(f.accept || '') + '">'; break;
    default: inner = '<input class="inp" id="' + id + '" name="' + f.name + '" autocomplete="off" value="' + esc(v) + '" placeholder="' + esc(f.placeholder || '') + '"' + (f.reload ? ' data-reload="1"' : '') + '>';
  }
  const label = f.type === 'check' ? '' : '<label class="fl" for="' + id + '">' + esc(f.label) + (f.required ? ' <i>*</i>' : '') + '</label>';
  return '<div class="field' + (f.half ? ' half' : '') + '">' + label + inner + (f.hint ? '<div class="hint">' + f.hint + '</div>' : '') + '</div>';
}
function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;
    if (f.type === 'check') out[f.name] = el.checked;
    else if (f.type === 'money') out[f.name] = parseAmount(el.value);
    else if (f.type === 'number') out[f.name] = enDigits(el.value).trim();
    else if (f.type === 'file') out[f.name] = el.files && el.files[0] ? el.files[0] : null;
    else out[f.name] = el.value;
  }
  return out;
}
/**
 * cfg: {title, fields: array | (vals)=>array, values, submit, onSubmit(vals)->Promise, danger, note}
 * فیلدهای دارای reload:true با تغییر، فرم را با مقادیر فعلی دوباره می‌سازند.
 */
function openForm(cfg) {
  let vals = Object.assign({}, cfg.values || {});
  const w = openModal(cfg.title, '', { sticky: cfg.sticky !== false, wide: cfg.wide });
  const body = $('.sheet-b', w);
  let fields = [];
  function draw() {
    fields = typeof cfg.fields === 'function' ? cfg.fields(vals) : cfg.fields;
    fields.forEach(f => { if (f.value === undefined && vals[f.name] !== undefined) f.value = vals[f.name]; });
    body.innerHTML = (cfg.note ? '<div class="note">' + cfg.note + '</div>' : '') +
      '<form novalidate autocomplete="off"><div class="fgrid">' + fields.map(fieldHtml).join('') + '</div><div class="err" role="alert"></div>' +
      '<div class="btnrow"><button class="btn ' + (cfg.danger ? 'danger' : 'primary') + '" type="submit">' + esc(cfg.submit || 'ثبت') + '</button><button class="btn" type="button" data-close>انصراف</button></div></form>';
  }
  draw();
  body.addEventListener('change', e => {
    if (e.target.dataset && e.target.dataset.reload) {
      vals = Object.assign(vals, readForm($('form', body), fields));
      draw();
    }
  });
  body.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target, btn = $('button[type=submit]', form), err = $('.err', form);
    err.textContent = '';
    const v = readForm(form, fields);
    btn.disabled = true;
    try {
      const keep = await cfg.onSubmit(v);
      if (keep !== false) closeModal(w);
    } catch (ex) {
      err.textContent = ex && ex.message ? ex.message : String(ex);
      err.scrollIntoView({ block: 'nearest' });
      btn.disabled = false;
    }
  });
  return w;
}

/* ---------- نمودارها (SVG، بدون کتابخانه) ---------- */
const CH = { jade: '#0f8a6c', gold: '#c9a227', red: '#c8553d', blue: '#3a7ca5', gray: '#9aa7a3' };
function chartEmpty() { return '<div class="empty small">داده‌ای برای نمایش وجود ندارد</div>'; }
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
/** نمودار میله‌ای گروهی؛ ماه‌ها از راست به چپ */
function barChart(labels, series) {
  const W = 360, H = 210, pl = 8, pr = 44, pt = 12, pb = 38, n = labels.length;
  if (!n || series.every(s => s.data.every(x => !x))) return chartEmpty();
  const max = niceMax(Math.max(...series.flatMap(s => s.data), 1));
  const iw = W - pl - pr, ih = H - pt - pb, slot = iw / n, bw = Math.min(26, (slot * 0.72) / series.length);
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = pt + ih - (ih * i) / 4;
    g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (W - pr + 4) + '" y="' + (y + 3) + '" class="gt">' + fmtShort(max * i / 4) + '</text>';
  }
  labels.forEach((lb, i) => {
    const cx = W - pr - slot * i - slot / 2;
    series.forEach((s, si) => {
      const val = s.data[i] || 0, bh = (val / max) * ih, x = cx - (series.length * bw) / 2 + si * bw;
      g += '<rect x="' + x.toFixed(1) + '" y="' + (pt + ih - bh).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + Math.max(bh, val ? 1 : 0).toFixed(1) + '" rx="3" fill="' + s.color + '"><title>' + esc(s.name) + ': ' + fmtMoney(val) + '</title></rect>';
    });
    g += '<text x="' + cx + '" y="' + (H - 20) + '" class="gx" text-anchor="middle">' + esc(lb) + '</text>';
  });
  const legend = series.length > 1 ? '<div class="legend">' + series.map(s => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>' : '';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img">' + g + '</svg>' + legend;
}
function lineChart(labels, data, color) {
  const W = 360, H = 210, pl = 8, pr = 44, pt = 14, pb = 38, n = labels.length;
  if (!n || data.every(x => !x)) return chartEmpty();
  const mx = Math.max(...data, 0), mn = Math.min(...data, 0), span = niceMax(mx - mn || mx || 1);
  const lo = mn < 0 ? -niceMax(-mn) : 0, hi = lo + Math.max(span, mx - lo);
  const iw = W - pl - pr, ih = H - pt - pb, step = n > 1 ? iw / (n - 1) : 0;
  const X = i => (n > 1 ? W - pr - step * i : W - pr - iw / 2), Y = v => pt + ih - ((v - lo) / (hi - lo || 1)) * ih;
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const val = lo + ((hi - lo) * i) / 4, y = Y(val);
    g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (W - pr + 4) + '" y="' + (y + 3) + '" class="gt">' + fmtShort(val) + '</text>';
  }
  const pts = data.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1));
  g += '<polygon points="' + X(n - 1).toFixed(1) + ',' + Y(lo).toFixed(1) + ' ' + pts.join(' ') + ' ' + X(0).toFixed(1) + ',' + Y(lo).toFixed(1) + '" fill="' + color + '" opacity=".12"/>';
  g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  data.forEach((v, i) => { g += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.4" fill="#fff" stroke="' + color + '" stroke-width="2"><title>' + esc(labels[i]) + ': ' + fmtMoney(v) + '</title></circle>'; });
  labels.forEach((lb, i) => { if (n <= 8 || i % 2 === 0) g += '<text x="' + X(i) + '" y="' + (H - 20) + '" class="gx" text-anchor="middle">' + esc(lb) + '</text>'; });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img">' + g + '</svg>';
}
function hbarChart(items, color) {            // items: [{label, value}]
  if (!items.length) return chartEmpty();
  const max = Math.max(...items.map(i => i.value), 1);
  return '<div class="hbars">' + items.map(i => '<div class="hb"><span class="hl">' + esc(i.label) + '</span><span class="hbar"><i style="width:' + Math.max(3, (i.value / max) * 100) + '%;background:' + color + '"></i></span><span class="hv">' + fmtShort(i.value) + '</span></div>').join('') + '</div>';
}

/* ---------- خروجی‌ها ---------- */
function saveBlob(blob, name) {
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
}
async function shareFileOrText(o) {      // {blob, name, mime, title, text}
  try {
    if (o.blob && navigator.canShare) {
      const file = new File([o.blob], o.name, { type: o.mime || o.blob.type });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: o.title || '', text: o.text || '' }); return true; }
    }
    if (navigator.share && o.text) { await navigator.share({ title: o.title || '', text: o.text }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return true; }
  if (o.blob) { saveBlob(o.blob, o.name); toast('اشتراک‌گذاری مستقیم پشتیبانی نشد؛ فایل دانلود شد'); return false; }
  await copyText(o.text || ''); toast('متن کپی شد'); return false;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (x) { /* ignore */ } ta.remove(); return ok;
  }
}
function printHtml(html) {
  const pa = $('#printArea');
  pa.innerHTML = '<div class="print-doc">' + html + '</div>';
  const clear = () => { pa.innerHTML = ''; window.removeEventListener('afterprint', clear); };
  window.addEventListener('afterprint', clear);
  setTimeout(() => window.print(), 80);
}

/* ---------- مسیریابی و رخدادها ---------- */
const ACT = {};          // نام عملیات → تابع (data-act)
const VIEWS = {};        // نام صفحه → تابع رندر
let _cur = { name: '', arg: '' };

function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function parseHash() {
  const h = (location.hash || '#/dashboard').replace(/^#\/?/, '');
  const [name, ...rest] = h.split('/');
  return { name: name || 'dashboard', arg: decodeURIComponent(rest.join('/')) };
}
function render() {
  const { name, arg } = parseHash();
  _cur = { name, arg };
  const v = VIEWS[name] || VIEWS.dashboard;
  const view = $('#view');
  const scroll = view.dataset.name === name ? window.scrollY : 0;
  try { view.innerHTML = v(arg) || ''; }
  catch (e) { console.error(e); view.innerHTML = '<div class="card err">خطا در نمایش صفحه: ' + esc(e.message) + '</div>'; }
  view.dataset.name = name;
  window.scrollTo(0, scroll);
  $$('.bottom a').forEach(a => a.classList.toggle('on', a.dataset.nav === name || (name === 'member' && a.dataset.nav === 'members') || (name === 'loan' && a.dataset.nav === 'loans')));
  $('#drawer').classList.remove('open');
  const t = $('#pageTitle'); if (t) t.textContent = '';
}
document.addEventListener('click', async e => {
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) {
    const m = closeBtn.closest('.modal');
    if (m && m.isConnected) { closeModal(m); return; }
    if (m) return;                       // پنجره‌ی تأیید قبلاً توسط خودش بسته شده است
  }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const fn = ACT[a.dataset.act];
  if (!fn) return;
  e.preventDefault();
  try { await fn(a.dataset, a, e); }
  catch (ex) { console.error(ex); toast(ex && ex.message ? ex.message : 'خطای ناشناخته', 'err'); }
});
window.addEventListener('hashchange', render);
