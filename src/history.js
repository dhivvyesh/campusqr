import { initialValues, buildPayload } from './payload.js';
export const HISTORY_KEY = 'campusqr.history.v1';
export function signature(type, values, settings) {
  return JSON.stringify([type, buildPayload(type, values).payload, settings.size, settings.foreground, settings.background, settings.correction, settings.margin]);
}
export function sanitizeEntry(entry) {
  try {
    if (!entry || !Object.hasOwn(initialValues, entry.type) || typeof entry.id !== 'string' || !Number.isFinite(Date.parse(entry.createdAt))) return null;
    const values = {};
    for (const [key, sample] of Object.entries(initialValues[entry.type])) {
      const value = entry.values?.[key];
      if (typeof value !== typeof sample || (typeof value === 'string' && value.length > 12000)) return null;
      values[key] = value;
    }
    const s = entry.settings;
    if (!s || ![256,384,640,1024,2048].includes(s.size) || !['L','M','Q','H'].includes(s.correction) || !Number.isInteger(s.margin) || s.margin < 0 || s.margin > 12 || !/^#[\da-f]{6}$/i.test(s.foreground) || !/^#[\da-f]{6}$/i.test(s.background)) return null;
    if (!buildPayload(entry.type, values).valid) return null;
    if (entry.type === 'wifi' && values.security === 'nopass') values.password = '';
    return { id: entry.id, createdAt: entry.createdAt, type: entry.type, values, settings: { size: s.size, foreground: s.foreground, background: s.background, correction: s.correction, margin: s.margin } };
  } catch { return null; }
}
export function addEntry(entries, entry) {
  const key = signature(entry.type, entry.values, entry.settings);
  return [entry, ...entries.filter(item => signature(item.type, item.values, item.settings) !== key)].slice(0,20);
}
export function restoreDeleted(current, deleted) {
  const existing = new Set(current.map(entry => signature(entry.type, entry.values, entry.settings)));
  const additions = deleted.filter(entry => {
    const key = signature(entry.type, entry.values, entry.settings);
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  return [...current, ...additions].sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0,20);
}
export function loadHistory(storage) {
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return { entries: [], notice: '' };
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) throw new Error('Invalid history');
    const valid = parsed.entries.map(sanitizeEntry).filter(Boolean);
    const entries = valid.reduceRight((list, entry) => addEntry(list, entry), []);
    return { entries, notice: valid.length !== parsed.entries.length ? 'Some unreadable history entries were skipped. Your generator is still available.' : '' };
  } catch { return { entries: [], notice: 'Saved history could not be read. You can still create QR codes.' }; }
}
export function saveHistory(storage, entries) {
  try { storage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, entries })); return ''; }
  catch { return 'History could not be saved on this device. Changes are kept for this session only.'; }
}
export function historyTitle(entry) {
  const v = entry.values;
  return ({ url: v.url, text: v.text, email: v.address, phone: v.number, wifi: v.ssid })[entry.type];
}
