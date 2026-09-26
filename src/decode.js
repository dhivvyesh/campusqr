import jsQR from 'jsqr';

export function verifyPixels(data, width, height, expected) {
  const decoded = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  return decoded?.data === expected ? 'passed' : 'failed';
}
