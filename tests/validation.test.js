import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload } from '../src/payload.js';
test('URLs preserve case and queries, accept ports and reject unsafe malformed addresses', () => {
  assert.equal(buildPayload('url',{url:'example.com:8080/Case?a=b#part'}).payload,'https://example.com:8080/Case?a=b#part');
  for(const url of ['https:example.com','javascript:alert(1)','https://user:secret@example.com','https://bad host.com','https://-bad.com','https://example.com/\nhello']) assert.equal(buildPayload('url',{url}).valid,false,url);
});
test('email formatting handles plus tags and rejects malformed or unpaired Unicode input', () => {
  assert.equal(buildPayload('email',{address:'me+club@example.com',subject:'Hello & you?',body:'A\nB'}).payload,'mailto:me%2Bclub@example.com?subject=Hello%20%26%20you%3F&body=A%0AB');
  assert.equal(buildPayload('email',{address:'.bad@example.com',subject:'',body:''}).valid,false);
  assert.equal(buildPayload('email',{address:'me@example.com',subject:'\ud800',body:''}).valid,false);
});
test('phone validation allows local leading zero and rejects extensions and non-numbers', () => {
  assert.equal(buildPayload('phone',{number:'044 1234 5678'}).valid,true);
  for(const number of ['00000000','+012345678','+91 98765 ext 1','123\n4567']) assert.equal(buildPayload('phone',{number}).valid,false);
});
test('Wi-Fi validates key formats and SSID byte length without trimming secrets', () => {
  const wifi={ssid:'Guest',security:'WPA',password:' secret ',hidden:false};
  assert.equal(buildPayload('wifi',wifi).valid,true);
  assert.equal(buildPayload('wifi',{...wifi,password:'short'}).valid,false);
  assert.equal(buildPayload('wifi',{...wifi,ssid:'🙂'.repeat(9)}).valid,false);
  assert.equal(buildPayload('wifi',{...wifi,security:'WEP',password:'abcde'}).valid,true);
  assert.equal(buildPayload('wifi',{...wifi,security:'nopass',password:''}).valid,true);
});
test('oversized and malformed values are rejected safely', () => {
  assert.equal(buildPayload('text',{text:'a'.repeat(12001)}).valid,false);
  assert.equal(buildPayload('email',{}).valid,false);
  assert.equal(buildPayload('unknown',{}).valid,false);
});
