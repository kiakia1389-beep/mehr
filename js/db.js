/* db.js — ذخیره‌سازی محلی دائمی روی گوشی (IndexedDB) + حافظه‌ی لحظه‌ای */
'use strict';

const DB_NAME = 'mehr-family-fund';
const DB_VERSION = 1;
const STORES = ['members', 'tx', 'loans', 'requests', 'docs', 'audit', 'lotteries', 'kv'];

/** وضعیت لحظه‌ای برنامه؛ هر تغییر هم‌زمان در IndexedDB ذخیره می‌شود */
const S = { members: [], tx: [], loans: [], requests: [], docs: [], audit: [], lotteries: [], settings: null };

let _db = null;

const DB = {
  open() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in self)) return reject(new Error('مرورگر از ذخیره‌سازی محلی پشتیبانی نمی‌کند'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'kv' ? 'key' : 'id' });
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(); };
      req.onerror = () => reject(req.error || new Error('خطا در باز کردن پایگاه داده'));
    });
  },
  _tx(store, mode) { return _db.transaction(store, mode).objectStore(store); },
  getAll(store) {
    return new Promise((res, rej) => {
      const r = DB._tx(store, 'readonly').getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  },
  get(store, key) {
    return new Promise((res, rej) => {
      const r = DB._tx(store, 'readonly').get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  put(store, obj) {
    return new Promise((res, rej) => {
      const r = DB._tx(store, 'readwrite').put(obj);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  del(store, key) {
    return new Promise((res, rej) => {
      const r = DB._tx(store, 'readwrite').delete(key);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  clear(store) {
    return new Promise((res, rej) => {
      const r = DB._tx(store, 'readwrite').clear();
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  /** بارگذاری همه‌ی داده‌ها در حافظه */
  async loadAll() {
    S.members = await DB.getAll('members');
    S.tx = await DB.getAll('tx');
    S.loans = await DB.getAll('loans');
    S.requests = await DB.getAll('requests');
    S.docs = (await DB.getAll('docs')).map(d => { const { blob, ...meta } = d; return meta; });
    S.audit = await DB.getAll('audit');
    S.lotteries = await DB.getAll('lotteries');
    const kv = await DB.get('kv', 'settings');
    S.settings = mergeSettings(kv ? kv.value : null);
    S.tx.sort((a, b) => a.no - b.no);
    S.audit.sort((a, b) => a.ts - b.ts);
  },
  async saveSettings() { await DB.put('kv', { key: 'settings', value: S.settings }); },
  async getKV(key) { const r = await DB.get('kv', key); return r ? r.value : undefined; },
  async setKV(key, value) { await DB.put('kv', { key, value }); },
  /** ذخیره‌ی یک رکورد و به‌روزرسانی آرایه‌ی حافظه */
  async save(store, obj) {
    await DB.put(store, obj);
    const arr = S[store];
    const i = arr.findIndex(x => x.id === obj.id);
    if (i >= 0) arr[i] = obj; else arr.push(obj);
  },
  async saveDocBlob(meta, blob) {
    await DB.put('docs', Object.assign({}, meta, { blob }));
    const i = S.docs.findIndex(x => x.id === meta.id);
    if (i >= 0) S.docs[i] = meta; else S.docs.push(meta);
  },
  async getDocBlob(id) { const d = await DB.get('docs', id); return d ? d.blob : null; },
  async wipeAll() {
    for (const s of STORES) await DB.clear(s);
    S.members = []; S.tx = []; S.loans = []; S.requests = []; S.docs = []; S.audit = []; S.lotteries = [];
    S.settings = mergeSettings(null);
  }
};
