import test from 'node:test';
import assert from 'node:assert/strict';
import { addEntry, loadHistory, saveHistory, HISTORY_KEY, historyTitle, restoreDeleted } from '../src/history.js';
import { defaults } from '../src/appearance.js';
const entry = n => ({ id: String(n), createdAt: new Date().toISOString(), type: 'url', values: { url: `https://example.com/${n}` }, settings: {...defaults} });
const storage = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };
test('undo deletion preserves designs created afterward and avoids duplicates', () => {
  const deleted = {...entry(1),createdAt:'2026-09-25T10:00:00Z'};
  const newer = {...entry(2),createdAt:'2026-09-26T10:00:00Z'};
  assert.deepEqual(restoreDeleted([newer],[deleted]).map(x=>x.id),['2','1']);
  assert.equal(restoreDeleted([deleted],[deleted]).length,1);
  assert.equal(restoreDeleted(Array.from({length:20},(_,i)=>entry(i+2)),[deleted]).length,20);
});
test('history survives serialization and restores content and design', () => {
  const disk = storage(); const saved = entry(1); saved.settings.foreground = '#123456';
  assert.equal(saveHistory(disk, [saved]), '');
  assert.deepEqual(loadHistory(disk).entries, [saved]);
});
test('history keeps 20 newest distinct designs', () => {
  let list = []; for (let n=0;n<25;n++) list = addEntry(list, entry(n));
  assert.equal(list.length,20); assert.equal(list[0].id,'24');
  list = addEntry(list, {...entry(24), id:'repeat'});
  assert.equal(list.length,20); assert.equal(list[0].id,'repeat');
  assert.equal(list.filter(x => x.values.url.endsWith('/24')).length,1);
});
test('same content with a changed appearance is a separate design', () => {
  assert.equal(addEntry([entry(1)], {...entry(1),settings:{...defaults,size:1024}}).length,2);
});
test('broken storage and malformed records are handled without crashing', () => {
  const disk=storage(); disk.setItem(HISTORY_KEY,'{');
  assert.deepEqual(loadHistory(disk).entries,[]);
  disk.setItem(HISTORY_KEY,JSON.stringify({version:1,entries:[entry(1),{...entry(2),settings:{size:-5}}]}));
  assert.equal(loadHistory(disk).entries.length,1); assert.ok(loadHistory(disk).notice);
  const blocked={getItem(){throw Error();},setItem(){throw Error();}};
  assert.ok(loadHistory(blocked).notice); assert.ok(saveHistory(blocked,[]));
});
test('deletion and clearing survive reload', () => {
  const disk=storage(); saveHistory(disk,[entry(1),entry(2)].filter(x=>x.id!=='1'));
  assert.equal(loadHistory(disk).entries[0].id,'2');
  saveHistory(disk,[]); assert.deepEqual(loadHistory(disk).entries,[]);
});
test('open network history discards stale credentials and titles never contain passwords', () => {
  const disk=storage(); const wifi={...entry(1),type:'wifi',values:{ssid:'Guest',security:'nopass',password:'oldsecret',hidden:false}};
  saveHistory(disk,[wifi]); const restored=loadHistory(disk).entries[0];
  assert.equal(restored.values.password,''); assert.equal(historyTitle(restored),'Guest');
});
