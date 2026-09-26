import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { defaults, presets, qrOptions, appearanceWarnings } from '../src/appearance.js';

for (const preset of presets) {
  test(`${preset.name} PNG has selected size, background and decodable content`, async () => {
    const options = qrOptions(preset.settings);
    const png = PNG.sync.read(await QRCode.toBuffer('https://example.com/event', options));
    assert.equal(png.width, options.width);
    assert.equal(png.height, options.width);
    const background = preset.settings.background.slice(1).match(/../g).map(v => parseInt(v, 16));
    assert.deepEqual([...png.data.slice(0, 4)], [...background, 255]);
    assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, 'https://example.com/event');
    assert.deepEqual(appearanceWarnings(preset.settings), []);
  });
}
test('custom size, correction and margin survive export', async () => {
  for (const correction of ['L', 'M', 'Q', 'H']) {
    const settings = { ...defaults, size: 384, correction, margin: 8 };
    const png = PNG.sync.read(await QRCode.toBuffer('Custom QR 123', qrOptions(settings)));
    assert.equal(png.width, 384);
    assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, 'Custom QR 123');
  }
});
test('unsafe appearance produces actionable warnings', () => {
  assert.equal(appearanceWarnings({ ...defaults, margin: 0 }).length, 1);
  assert.equal(appearanceWarnings({ ...defaults, foreground: '#ffffff' }).length, 2);
  assert.match(appearanceWarnings({ ...defaults, foreground: '#bbbbbb' })[0], /contrast/);
});
