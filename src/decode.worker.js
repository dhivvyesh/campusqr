import { verifyPixels } from './decode.js';
self.onmessage = ({ data }) => {
  try { self.postMessage(verifyPixels(data.pixels, data.width, data.height, data.expected)); }
  catch { self.postMessage('unavailable'); }
};
