export const initialValues = {
  url: { url: 'https://example.com' },
  text: { text: '' },
  email: { address: '', subject: '', body: '' },
  phone: { number: '' },
  wifi: { ssid: '', security: 'WPA', password: '', hidden: false },
};

export function escapeWifi(value) {
  return value.replace(/[\\;,:\"]/g, '\\$&');
}

// Validation and formatting are independent of React so every type is testable.
export function buildPayload(type, values) {
  const errors = {};
  let payload = '';
  let note = '';
  if (!Object.hasOwn(initialValues, type) || !values) return { payload, errors: { type: 'Choose a QR type.' }, note, valid: false };
  for (const [key, sample] of Object.entries(initialValues[type])) {
    if (typeof values[key] !== typeof sample) errors[key] = 'Enter a valid value.';
    else if (typeof sample === 'string' && values[key].length > 12000) errors[key] = 'This content is too long. Shorten it to create a QR code.';
    else if (typeof sample === 'string' && !values[key].isWellFormed()) errors[key] = 'This text contains an incomplete Unicode character. Remove it and try again.';
  }
  if (Object.keys(errors).length) return { payload, errors, note, valid: false };
  if (type === 'url') {
    const raw = values.url.trim();
    if (!raw) errors.url = 'Enter a website address.';
    else {
      const hasProtocol = /^[a-z][a-z\d+.-]*:/i.test(raw) && !/^[^/:]+\.\w+:\d+(?:[/?#]|$)/.test(raw);
      const candidate = hasProtocol ? raw : `https://${raw}`;
      try {
        const url = new URL(candidate);
        const validHost = url.hostname.split('.').every(part => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(part));
        if (/[\s\\\u0000-\u001f]/.test(raw) || (hasProtocol && !/^https?:\/\//i.test(raw)) || !['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || !validHost || url.username || url.password) {
          throw new Error('Unsupported address');
        }
        payload = url.href;
        if (!hasProtocol) note = 'https:// is added to your QR code.';
      } catch { errors.url = 'Enter a public http:// or https:// website address, such as example.com.'; }
    }
  } else if (type === 'text') {
    if (!values.text.trim()) errors.text = 'Enter some text to create a QR code.';
    else payload = values.text;
  } else if (type === 'email') {
    const address = values.address.trim();
    const parts = address.split('@');
    if (address.length > 254 || parts.length !== 2 || parts[0].length > 64 || !/^[a-z\d!$%'+_`{|}~^.-]+$/i.test(parts[0]) || parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..') || !parts[1]?.includes('.') || !parts[1].split('.').every(part => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(part))) errors.address = 'Enter an email address, such as hello@example.com.';
    else {
      const params = [];
      if (values.subject) params.push(`subject=${encodeURIComponent(values.subject)}`);
      if (values.body) params.push(`body=${encodeURIComponent(values.body)}`);
      payload = `mailto:${encodeURIComponent(parts[0])}@${parts[1]}${params.length ? '?' + params.join('&') : ''}`;
    }
  } else if (type === 'phone') {
    const raw = values.number.trim();
    const normalized = raw.replace(/[\s().-]/g, '');
    if (!/^\+?[\d\s().-]+$/.test(raw) || !/^(?:\+[1-9]\d{6,14}|\d{7,15})$/.test(normalized) || /^0+$/.test(normalized) || /[\r\n]/.test(raw)) errors.number = 'Enter 7–15 digits, preferably with a country code (for example +91).';
    else { payload = `tel:${normalized}`; if (!normalized.startsWith('+')) note = 'Add a country code for more reliable international dialing.'; }
  } else if (type === 'wifi') {
    if (!values.ssid.trim()) errors.ssid = 'Enter the network name exactly as it appears.';
    else if (new TextEncoder().encode(values.ssid).length > 32) errors.ssid = 'Network names must fit within 32 UTF-8 bytes.';
    if (!['WPA', 'WEP', 'nopass'].includes(values.security)) errors.security = 'Choose a supported security type.';
    if (values.security !== 'nopass' && !values.password) errors.password = 'Enter the Wi-Fi password, or choose Open network.';
    else if (values.security === 'WPA' && !(/^[\x20-\x7e]{8,63}$/.test(values.password) || /^[a-f\d]{64}$/i.test(values.password))) errors.password = 'WPA/WPA2 Personal requires 8–63 ASCII characters or a 64-digit hexadecimal key.';
    else if (values.security === 'WEP' && !(/^(?:[\x20-\x7e]{5}|[\x20-\x7e]{13})$/.test(values.password) || /^(?:[a-f\d]{10}|[a-f\d]{26})$/i.test(values.password))) errors.password = 'WEP needs 5 or 13 ASCII characters, or 10 or 26 hexadecimal digits.';
    if (!Object.keys(errors).length) payload = `WIFI:T:${values.security};S:${escapeWifi(values.ssid)};${values.security !== 'nopass' ? `P:${escapeWifi(values.password)};` : ''}H:${values.hidden ? 'true' : 'false'};;`;
  } else errors.type = 'Choose a QR type.';
  return { payload, errors, note, valid: !!payload && !Object.keys(errors).length };
}
