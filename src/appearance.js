export const defaults = { size: 640, foreground: '#102144', background: '#ffffff', correction: 'M', margin: 4 };
export const presets = [
  { name: 'Classic', settings: { ...defaults, foreground: '#111111' } },
  { name: 'Midnight', settings: { ...defaults } },
  { name: 'Forest', settings: { ...defaults, foreground: '#145b42', background: '#f4fff8' } },
  { name: 'Berry', settings: { ...defaults, foreground: '#72234b', background: '#fff5fa' } },
];
export function qrOptions(settings) {
  return { width: settings.size, margin: settings.margin, errorCorrectionLevel: settings.correction, color: { dark: settings.foreground, light: settings.background } };
}
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
export function appearanceWarnings(settings, modules) {
  const warnings = [];
  if (settings.margin < 4) warnings.push('Use at least 4 modules of clear margin for more reliable scanning.');
  const dark = luminance(settings.foreground), light = luminance(settings.background);
  if (dark >= light) warnings.push('Use a darker foreground than background. Inverted colours may not scan reliably.');
  if ((Math.max(dark, light) + .05) / (Math.min(dark, light) + .05) < 4.5) warnings.push('These colours have low contrast. Choose a darker foreground or lighter background.');
  if (modules && settings.size / (modules + 2 * settings.margin) < 4) warnings.push('This PNG has fewer than 4 pixels per QR square. Increase its size or shorten the content.');
  return warnings;
}
