import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { buildPayload, escapeWifi } from '../src/payload.js';

const samples = [
  ['url', { url: 'example.com/Event?name=hello&count=2' }, 'https://example.com/Event?name=hello&count=2'],
  ['text', { text: ' வணக்கம் 👋\nHello! ' }, ' வணக்கம் 👋\nHello! '],
  ['email', { address: 'hello@example.com', subject: 'Hello & welcome?', body: 'Line 1\nLine 2' }, 'mailto:hello@example.com?subject=Hello%20%26%20welcome%3F&body=Line%201%0ALine%202'],
  ['phone', { number: '+91 (98765) 43210' }, 'tel:+919876543210'],
  ['wifi', { ssid: 'Lab;Guest', security: 'WPA', password: 'hello\\world:123', hidden: true }, 'WIFI:T:WPA;S:Lab\\;Guest;P:hello\\\\world\\:123;H:true;;'],
];

for (const [type, values, expected] of samples) {
  test(`${type}: formats correctly and survives image encode/decode`, async () => {
    const result = buildPayload(type, values);
    assert.equal(result.valid, true);
    assert.equal(result.payload, expected);
    const bytes = await QRCode.toBuffer(result.payload, { width: 640, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#102144', light: '#ffffff' } });
    const png = PNG.sync.read(bytes);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert.equal(decoded?.data, expected);
  });
}

test('open Wi-Fi omits an old password and preserves SSID spaces', () => {
  assert.equal(buildPayload('wifi', { ssid: ' Guest ', security: 'nopass', password: 'stale', hidden: false }).payload, 'WIFI:T:nopass;S: Guest ;H:false;;');
});
test('Wi-Fi escaping handles every reserved character', () => {
  assert.equal(escapeWifi('a\\b;c,d:e"f'), 'a\\\\b\\;c\\,d\\:e\\"f');
});
test('invalid input never produces a usable payload', () => {
  for (const [type, values] of [
    ['url', { url: 'javascript:alert(1)' }], ['url', { url: 'https://' }], ['url', { url: 'not a url' }],
    ['text', { text: '   ' }], ['email', { address: 'bad@', subject: '', body: '' }],
    ['phone', { number: '+91 abc 123' }], ['phone', { number: '123' }],
    ['wifi', { ssid: 'Network', security: 'WPA', password: '', hidden: false }],
    ['wifi', { ssid: 'a'.repeat(33), security: 'nopass', password: '', hidden: false }],
  ]) assert.equal(buildPayload(type, values).valid, false, `${type}: ${JSON.stringify(values)}`);
});
test('very long content produces a recoverable library error', async () => {
  await assert.rejects(QRCode.toBuffer('a'.repeat(10000)));
});
