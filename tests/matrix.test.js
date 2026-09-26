import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { verifyPixels } from '../src/decode.js';
import { presets, defaults, qrOptions } from '../src/appearance.js';
import { buildPayload } from '../src/payload.js';
const samples = [
 ['url',{url:'https://example.com/Event?x=1&y=2'}],
 ['text',{text:'வணக்கம் 👋\nCampusQR test'}],
 ['email',{address:'hello+club@example.com',subject:'Hi & welcome?',body:'Line 1\nLine 2'}],
 ['phone',{number:'+1 (202) 555-0143'}],
 ['wifi',{ssid:'Demo;Guest',security:'WPA',password:'demo\\pass:123',hidden:true}],
];
for(const [type,values] of samples) for(const preset of presets) for(const correction of ['L','M','Q','H']) {
 test(`${type}/${preset.name}/${correction}: export decodes`,async()=>{
  const payload=buildPayload(type,values).payload;
  const png=PNG.sync.read(await QRCode.toBuffer(payload,qrOptions({...preset.settings,correction,size:384})));
  assert.equal(verifyPixels(new Uint8ClampedArray(png.data),png.width,png.height,payload),'passed');
 });
}
for(const size of [256,384,640,1024,2048]) test(`export size ${size} is exact and scannable`,async()=>{
 const png=PNG.sync.read(await QRCode.toBuffer('Size test',qrOptions({...defaults,size})));
 assert.equal(png.width,size);assert.equal(png.height,size);
 assert.equal(verifyPixels(new Uint8ClampedArray(png.data),size,size,'Size test'),'passed');
});
