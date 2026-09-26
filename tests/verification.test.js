import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { verifyPixels } from '../src/decode.js';
import { defaults, presets, qrOptions, appearanceWarnings } from '../src/appearance.js';

test('local verification matches the intended payload and rejects another payload', async () => {
  const png = PNG.sync.read(await QRCode.toBuffer('வணக்கம் 👋', qrOptions(defaults)));
  assert.equal(verifyPixels(new Uint8ClampedArray(png.data), png.width, png.height, 'வணக்கம் 👋'), 'passed');
  assert.equal(verifyPixels(new Uint8ClampedArray(png.data), png.width, png.height, 'wrong payload'), 'failed');
});
test('unreadable same-colour image fails verification', async () => {
  const png = PNG.sync.read(await QRCode.toBuffer('hello', qrOptions({...defaults, foreground:'#ffffff'})));
  assert.equal(verifyPixels(new Uint8ClampedArray(png.data), png.width, png.height, 'hello'), 'failed');
});
test('density warning responds to payload module count and image size', () => {
  assert.match(appearanceWarnings({...defaults,size:256},100).join(' '), /pixels/);
  assert.equal(appearanceWarnings({...defaults,size:1024},100).length,0);
});
for (const preset of presets) test(`${preset.name}: SVG preserves size, colours and quiet-zone geometry`, async () => {
  const settings = {...preset.settings,size:1024,margin:6,correction:'H'};
  const options = qrOptions(settings);
  const payload = 'https://example.com/?q=%3Cscript%3E';
  const svg = await QRCode.toString(payload,{...options,type:'svg'});
  const modules = QRCode.create(payload, options).modules.size;
  assert.ok(svg.includes('width="1024"')); assert.ok(svg.includes('height="1024"'));
  assert.ok(svg.includes(`viewBox="0 0 ${modules+12} ${modules+12}"`));
  assert.ok(svg.includes(settings.foreground)); assert.ok(svg.includes(settings.background));
  assert.ok(!svg.includes('<script'));
});
