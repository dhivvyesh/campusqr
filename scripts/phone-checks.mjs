import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import { buildPayload } from '../src/payload.js';
import { defaults, presets, qrOptions } from '../src/appearance.js';
const output=path.resolve('public/phone-checks');
await fs.mkdir(output,{recursive:true});
const cases=[
 ['website','Website','url',{url:'https://example.com'},'Recognises https://example.com and opens that address.',defaults],
 ['text','Unicode text','text',{text:'CampusQR test\nவணக்கம் 👋'},'Shows CampusQR test and வணக்கம் 👋, preserving the text.',defaults],
 ['email','Email draft','email',{address:'hello@example.com',subject:'CampusQR & test?',body:'Line 1\nLine 2'},'Opens a draft addressed to hello@example.com, with subject CampusQR & test? and two body lines. Do not send.',defaults],
 ['phone','Phone number','phone',{number:'+1 202 555 0143'},'Recognises +12025550143 or opens the dialer with that number. Do not call.',defaults],
 ['wifi','Demo Wi-Fi recognition','wifi',{ssid:'CampusQR;Demo',security:'WPA',password:'demo:pass123',hidden:false},'Recognises CampusQR;Demo as Wi-Fi. This fictional network will NOT connect; recognition is the only check here.',defaults],
 ['forest','Coloured preset','url',{url:'https://example.com/forest'},'Recognises https://example.com/forest. The page itself may not exist; verify the decoded address.',presets[2].settings],
];
const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const cards=[];
for(const [id,title,type,values,expect,settings] of cases){
 const payload=buildPayload(type,values).payload;
 await fs.writeFile(path.join(output,id+'.png'),await QRCode.toBuffer(payload,qrOptions(settings)));
 await fs.writeFile(path.join(output,id+'.svg'),await QRCode.toString(payload,{...qrOptions(settings),type:'svg'}));
 cards.push(`<article id="${id}"><h2>${escape(title)}</h2><img src="${id}.png" alt="${escape(title)} test QR" width="320" height="320"><p>${escape(expect)}</p><p><a href="${id}.png" download>Download PNG</a> · <a href="${id}.svg" download>Download SVG</a> · <a href="${id}.svg">View SVG for scanning</a></p><details><summary>Exact expected payload</summary><pre>${escape(payload)}</pre></details></article>`);
}
await fs.writeFile(path.join(output,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CampusQR real-phone checks</title><style>body{font:17px/1.6 system-ui,sans-serif;color:#172541;background:#f5f7fb;margin:0 auto;max-width:760px;padding:24px}article{background:white;border:1px solid #ccd8e9;padding:24px;margin:24px 0;border-radius:16px}img{display:block;width:min(320px,100%);height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#195fea}h1{font-size:30px}h2{font-size:23px}</style><h1>Real-phone scan checklist</h1><p>Device supplied by you: <strong>OnePlus NORD CE 6 5G</strong>. Results: <strong>pending your physical scans</strong>.</p><p>Open this page on your computer. Use your phone camera (or a QR scanner you already use), point at one code at a time and compare with the expected result. Avoid glare. Tell us which camera/scanner you used.</p><p>For each case, test the on-screen code, the downloaded PNG opened on your computer, and the SVG. Report pass/fail separately.</p>${cards.join('')}<article><h2>Actual Wi-Fi connection check</h2><p>In CampusQR, enter a network you own or a test hotspot on another device. Scan with your OnePlus and check whether it joins. Keep credentials on your device; do not send them to us. The fictional Wi-Fi above only tests recognition.</p><h2>Reply with results</h2><pre>Scanner used:
Website: screen / PNG / SVG
Text: screen / PNG / SVG
Email draft: screen / PNG / SVG
Phone: screen / PNG / SVG
Demo Wi-Fi recognition: screen / PNG / SVG
Forest preset: screen / PNG / SVG
Real Wi-Fi connection: pass / fail / not tested
Any incorrect content or error:</pre></article></html>`);
console.log('Phone-check fixtures generated in public/phone-checks. Physical test results remain pending.');

