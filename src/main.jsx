import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import { QrCode, Link, Type, Mail, Phone, Wifi, ArrowUpRight, ShieldCheck, ScanLine, Eye, EyeOff, Check, CircleAlert } from 'lucide-react';
import { buildPayload, initialValues } from './payload.js';
import './styles.css';
import { defaults, presets, qrOptions, appearanceWarnings } from './appearance.js';
import { loadHistory, saveHistory, addEntry, signature, historyTitle, restoreDeleted } from './history.js';
import { verifyImage } from './verify-image.js';

function ColourField({ label, value, resetVersion, onChange, onValidity }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const valid = /^#[0-9a-f]{6}$/i.test(draft);
  useEffect(() => { setDraft(value); onValidity(true); }, [value, resetVersion]);
  return <div className="field"><label htmlFor={`${id}-hex`}>{label}</label><div className="colour-control"><input aria-label={`${label} colour picker`} type="color" value={value} onChange={event => { setDraft(event.target.value); onValidity(true); onChange(event.target.value); }}/><input id={`${id}-hex`} aria-label={`${label} hex code`} aria-invalid={!valid} aria-describedby={!valid ? `${id}-error` : undefined} type="text" spellCheck={false} maxLength={7} value={draft} onChange={event => { const next = event.target.value; setDraft(next); const ok = /^#[0-9a-f]{6}$/i.test(next); onValidity(ok); if (ok) onChange(next.toLowerCase()); }}/></div>{!valid && <p id={`${id}-error`} className="field-error">Use # and six hexadecimal digits, for example #123456.</p>}</div>;
}

const types = [
  { id: 'url', label: 'Website', icon: Link, title: 'Where should your QR lead?', description: 'Share an event, a portfolio, or a favourite corner of the internet.' },
  { id: 'text', label: 'Text', icon: Type, title: 'A little message. One scan.', description: 'Turn a note, instructions, or a few words into a QR code.' },
  { id: 'email', label: 'Email', icon: Mail, title: 'Make the first hello easier.', description: 'Open an email draft with the recipient and message ready.' },
  { id: 'phone', label: 'Phone', icon: Phone, title: 'Connect with a scan.', description: 'Let someone open your number in their phone’s dialer.' },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi, title: 'Share your network.', description: 'Help guests connect to a personal Wi-Fi network without typing.' },
];

function Field({ label, error, hint, multiline, ...props }) {
  const id = useId();
  const Component = multiline ? 'textarea' : 'input';
  return <div className="field"><label htmlFor={id}>{label}</label><Component id={id} {...props} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-help` : undefined}/>{(error || hint) && <p id={`${id}-help`} className={error ? 'field-error' : 'field-hint'}>{error || hint}</p>}</div>;
}

function App() {
  const [type, setType] = useState('url');
  const [allValues, setAllValues] = useState(initialValues);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState(defaults);
  const [rendered, setRendered] = useState({ key: '', image: '', error: '' });
  const [verification, setVerification] = useState({ key: '', status: 'checking' });
  const [overrideKey, setOverrideKey] = useState('');
  const [colourValidity, setColourValidity] = useState({ foreground: true, background: true });
  const [colourReset, setColourReset] = useState(0);
  const coloursValid = colourValidity.foreground && colourValidity.background;
  const [stored] = useState(() => { try { return loadHistory(window.localStorage); } catch { return { entries: [], notice: 'Local storage is unavailable. History is kept for this session only.' }; } });
  const [history, setHistory] = useState(stored.entries);
  const historyRef = useRef(stored.entries);
  const [storageNotice, setStorageNotice] = useState(stored.notice);
  const [historyMessage, setHistoryMessage] = useState('');
  const [undoEntries, setUndoEntries] = useState(null);
  const [editVersion, setEditVersion] = useState(0);
  const handledSignature = useRef('');
  const selected = types.find(item => item.id === type);
  const values = allValues[type];
  const result = buildPayload(type, values);
  const renderKey = JSON.stringify([result.payload, settings]);
  const warnings = appearanceWarnings(settings, rendered.key === renderKey ? rendered.modules : undefined);
  const edited = () => { handledSignature.current = ''; setEditVersion(version => version + 1); };
  const customize = (key, value) => { edited(); setSettings(previous => ({ ...previous, [key]: value })); };
  const applySettings = next => { edited(); setColourReset(value => value + 1); setSettings({ ...next }); };
  const activePreset = presets.find(preset => Object.keys(defaults).every(key => preset.settings[key] === settings[key]));
  const update = (key, value) => { edited(); setAllValues(previous => ({ ...previous, [type]: { ...previous[type], [key]: value } })); };
  const field = key => ({ value: values[key], onChange: event => update(key, event.target.value), error: result.errors[key] });

  useEffect(() => {
    let cancelled = false;
    if (!result.valid) return;
    const options = qrOptions(settings);
    Promise.all([QRCode.toDataURL(result.payload, options), QRCode.toString(result.payload, { ...options, type: 'svg' })])
      .then(([image, svg]) => { if (!cancelled) setRendered({ key: renderKey, image, svg, modules: QRCode.create(result.payload, options).modules.size, error: '' }); })
      .catch(() => { if (!cancelled) setRendered({ key: renderKey, image: '', error: 'This content is too large for the selected error correction. Shorten it or choose a lower level.' }); });
    return () => { cancelled = true; };
  }, [renderKey, result.valid]);

  const current = result.valid && rendered.key === renderKey;
  const ready = current && !!rendered.image && coloursValid;
  const renderError = current && rendered.error;
  useEffect(() => {
    setOverrideKey('');
    if (!ready) return;
    setVerification({ key: renderKey, status: 'checking' });
    return verifyImage(rendered.image, result.payload, status => setVerification({ key: renderKey, status }));
  }, [ready, renderKey, rendered.image]);
  const decodeStatus = ready && verification.key === renderKey ? verification.status : 'checking';
  const needsOverride = ready && ['failed', 'unavailable'].includes(decodeStatus);
  const canDownload = ready && (decodeStatus === 'passed' || (needsOverride && overrideKey === renderKey));
  const commitHistory = entries => {
    historyRef.current = entries;
    setHistory(entries);
    try { setStorageNotice(saveHistory(window.localStorage, entries)); }
    catch { setStorageNotice('History could not be saved. Changes are kept for this session only.'); }
  };
  const saveCurrent = () => {
    if (!ready) return;
    const savedValues = { ...values };
    if (type === 'wifi' && values.security === 'nopass') savedValues.password = '';
    const entry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), type, values: savedValues, settings: { ...settings } };
    commitHistory(addEntry(historyRef.current, entry));
    handledSignature.current = signature(type, values, settings);
    setHistoryMessage(type === 'wifi' ? 'Wi-Fi design saved on this device.' : 'Design saved to recent history.');
  };
  useEffect(() => {
    if (!editVersion || !ready || type === 'wifi') return;
    const key = signature(type, values, settings);
    if (handledSignature.current === key) return;
    const timer = setTimeout(() => { if (handledSignature.current !== key) saveCurrent(); }, 1500);
    return () => clearTimeout(timer);
  }, [editVersion, ready, renderKey, type]);
  const restore = entry => {
    handledSignature.current = signature(entry.type, entry.values, entry.settings);
    setType(entry.type); setAllValues(previous => ({ ...previous, [entry.type]: { ...entry.values } }));
    setSettings({ ...entry.settings }); setColourReset(value => value + 1); setShowPassword(false);
    setHistoryMessage('Design restored. You can edit it above.');
    document.getElementById('editor-heading')?.focus();
  };
  const removeHistory = id => {
    handledSignature.current = signature(type, values, settings);
    setUndoEntries(id ? historyRef.current.filter(entry => entry.id === id) : historyRef.current);
    commitHistory(id ? historyRef.current.filter(entry => entry.id !== id) : []);
    setHistoryMessage(id ? 'Design removed.' : 'History cleared.');
  };
  const download = (format = 'png') => {
    if (!canDownload) return;
    // Export the very same PNG used by the preview; never render a separate copy.
    const anchor = document.createElement('a');
    const bytes = format === 'svg' ? rendered.svg : Uint8Array.from(atob(rendered.image.split(',')[1]), char => char.charCodeAt(0));
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: format === 'svg' ? 'image/svg+xml' : 'image/png' }));
    anchor.href = objectUrl;
    anchor.download = `campusqr-${type}-${settings.size}px.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  };
  return <div className="app-shell">
    <a className="skip-link" href="#editor-heading">Skip to QR editor</a>
    <header className="topbar"><a className="brand" href="/" aria-label="CampusQR home"><span className="brand-icon"><QrCode size={25}/></span><span>Campus<span className="brand-light">QR</span></span></a><span className="browser-badge"><ShieldCheck size={16}/> Made in your browser</span></header>
    <main>
      <div className="intro"><div><p className="eyebrow">SMALL CODE. BIG CONNECTIONS.</p><h1>What will you share?</h1><p className="intro-copy">Your next connection starts with a scan.</p></div><div className="step-label"><span>01</span> Create your QR</div></div>
      <div className="workspace">
        <section className="editor" aria-label="QR code editor">
          <div className="section-caption"><span>CONTENT</span><span>Choose a QR type</span></div>
          <div className="type-picker" role="group" aria-label="QR type">{types.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={id === type} className={id === type ? 'type-button selected' : 'type-button'} onClick={() => setType(id)}><Icon size={21}/><span>{label}</span></button>)}</div>
          <div className="form-heading"><h2 id="editor-heading" tabIndex="-1">{selected.title}</h2><p>{selected.description}</p></div>
          <form onSubmit={event => event.preventDefault()} noValidate>
            {type === 'url' && <Field label="Website address" type="url" placeholder="https://example.com" autoComplete="url" spellCheck={false} hint="Use a public website address. Its availability isn’t checked." {...field('url')}/>}
            {type === 'text' && <Field label="Your text" multiline rows={6} placeholder="Write something worth sharing…" {...field('text')} hint="Line breaks, emoji, and different languages are welcome."/>}
            {type === 'email' && <><Field label="Email address" type="email" placeholder="hello@example.com" autoComplete="email" {...field('address')}/><Field label="Subject (optional)" placeholder="Let’s connect" {...field('subject')}/><Field label="Message (optional)" multiline rows={3} placeholder="Hi there…" {...field('body')}/></>}
            {type === 'phone' && <Field label="Phone number" type="tel" autoComplete="tel" placeholder="+91 98765 43210" hint="Include the country code. Scanning opens the dialer; it doesn’t make a call." {...field('number')}/>}
            {type === 'wifi' && <><Field label="Network name (SSID)" placeholder="My Wi-Fi" autoComplete="off" spellCheck={false} {...field('ssid')}/><div className="field"><label htmlFor="security">Security</label><select id="security" value={values.security} onChange={event => update('security', event.target.value)}><option value="WPA">WPA / WPA2 Personal</option><option value="WEP">WEP (legacy)</option><option value="nopass">Open network (no password)</option></select></div>{values.security !== 'nopass' && <div className="password-field"><Field label="Password" type={showPassword ? 'text' : 'password'} autoComplete="off" {...field('password')}/><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div>}<label className="checkbox"><input type="checkbox" checked={values.hidden} onChange={event => update('hidden', event.target.checked)}/> This is a hidden network</label><p className="privacy-note">Anyone with this QR can read the network credentials. Enterprise Wi-Fi is not supported.</p></>}
          </form>
          {result.note && <p className="input-note"><Check size={16}/>{result.note}</p>}
          <section className="appearance" aria-label="QR appearance">
            <div className="section-caption"><span>MAKE IT YOURS</span><span>{activePreset?.name || 'Custom'}</span></div>
            <div className="presets" role="group" aria-label="Visual presets">{presets.map(preset => <button type="button" key={preset.name} className="preset" aria-pressed={activePreset?.name === preset.name} onClick={() => applySettings(preset.settings)}><span className="preset-swatch" style={{ background: preset.settings.background, color: preset.settings.foreground }}><QrCode size={23}/></span>{preset.name}</button>)}</div>
            <p className="field-hint">Start with a preset, then adjust any setting.</p>
            <div className="appearance-grid">
              {['foreground', 'background'].map(key => <ColourField key={key} resetVersion={colourReset} label={key === 'foreground' ? 'Foreground' : 'Background'} value={settings[key]} onChange={value => customize(key, value)} onValidity={valid => setColourValidity(previous => previous[key] === valid ? previous : { ...previous, [key]: valid })}/>)}
              <div className="field"><label htmlFor="size">PNG size</label><select id="size" value={settings.size} onChange={event => customize('size', Number(event.target.value))}>{[256, 384, 640, 1024, 2048].map(size => <option key={size} value={size}>{size} × {size} px</option>)}</select></div>
              <div className="field"><label htmlFor="correction">Error correction</label><select id="correction" value={settings.correction} onChange={event => customize('correction', event.target.value)}><option value="L">Low · L</option><option value="M">Medium · M</option><option value="Q">Quartile · Q</option><option value="H">High · H</option></select></div>
            </div>
            <div className="field margin-field"><label htmlFor="margin">Clear margin <span>{settings.margin} modules</span></label><input id="margin" type="range" min="0" max="12" step="1" value={settings.margin} onChange={event => customize('margin', Number(event.target.value))}/><p className="field-hint">4 or more recommended. One module is one small QR square.</p></div>
            <p className="field-hint">Higher error correction tolerates more damage but can make the pattern denser.</p>
          </section>
          <a className="jump-preview" href="#live-preview">View QR preview ↓</a><div className="editor-foot"><span className="live-dot"/>Changes appear in your preview automatically.</div>
        </section>
        <section id="live-preview" tabIndex="-1" className="preview-panel" aria-label="Live QR preview">
          <div className="preview-heading"><span>LIVE PREVIEW</span><span className="type-chip"><selected.icon size={14}/>{selected.label}</span></div>
          <div className="qr-stage"><div className="qr-paper">{ready ? <img src={rendered.image} width={settings.size} height={settings.size} alt={`${selected.label} QR code generated from your input`}/> : <div className="empty-qr"><ScanLine size={58} strokeWidth={1}/><p>{renderError ? 'Try shorter content' : result.valid ? 'Creating your QR…' : 'Your QR belongs here'}</p><span>{renderError || 'Complete the details to see it come to life.'}</span></div>}</div></div>
          <div className={`preview-status ${renderError || warnings.length ? 'error-status' : ''}`} role="status">{ready ? warnings.length ? <><CircleAlert size={17}/>Review scan warnings</> : <><Check size={17}/>Ready to try</> : renderError ? <><CircleAlert size={17}/>Content exceeds QR capacity</> : result.valid ? 'Updating preview…' : 'Waiting for valid details'}</div>
          <p className="scan-hint">{ready ? 'Point your phone camera at the code to try it.' : 'Your preview updates as you type.'}</p>
          {warnings.length > 0 && <div className="scan-warnings"><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul><button type="button" onClick={() => applySettings(defaults)}>Restore safe settings</button><p>These checks are guidance, not a guarantee that every camera will scan the code.</p></div>}
          <div className="verification-panel"><p role="status" aria-live="polite" aria-atomic="true" className="verification-status">{!coloursValid ? 'Enter valid colour hex codes to continue.' : !ready ? 'Verification waits for a valid QR image.' : decodeStatus === 'checking' ? 'Checking this image locally…' : decodeStatus === 'passed' ? 'Decoded successfully — content matches.' : decodeStatus === 'failed' ? 'Could not verify this design.' : 'Local verification is unavailable.'}</p><p>The exact PNG is checked on this device. A successful check does not guarantee scanning on every phone. SVG uses the same content and settings; it is not independently decoded.</p>{needsOverride && <><button type="button" onClick={() => applySettings(defaults)}>Restore safe settings</button><label className="checkbox"><input type="checkbox" checked={overrideKey === renderKey} onChange={event => setOverrideKey(event.target.checked ? renderKey : '')}/> Download anyway without successful verification</label></>}</div>
          <div className="export-actions"><button type="button" className="download-button" disabled={!canDownload} onClick={() => download('png')}>Download PNG</button><button type="button" className="download-button svg-download" disabled={!canDownload} onClick={() => download('svg')}>Download SVG</button></div>
          {type === 'wifi' && <div className="wifi-save"><button type="button" disabled={!ready} onClick={saveCurrent}>Save this Wi-Fi design locally</button><p>Includes credentials in unencrypted browser storage. Only save on a device you trust.</p></div>}
          <p className="download-hint">PNG matches the preview exactly. SVG scales smoothly for print.</p>
          <div className="preview-specs"><div><span>PNG SIZE</span><strong>{settings.size} × {settings.size} px</strong></div><div><span>CORRECTION</span><strong>{settings.correction} · {settings.margin} module margin</strong></div></div>
        </section>
      </div>
      <div className="bottom-note"><ShieldCheck size={19}/><p><strong>Your content stays here.</strong> QR generation happens on this device. Inputs aren’t uploaded. Recent designs are stored in this browser; Wi-Fi is saved only when you choose.</p><ArrowUpRight size={19} aria-hidden="true"/></div>
      <section className="history-section" aria-label="Recent QR codes">
        <div className="history-heading"><div><h2>Recent QR codes <span>{history.length}/20</span></h2><p>Valid designs save after a short pause. Restore one to keep editing.</p></div><button type="button" disabled={!history.length} onClick={() => removeHistory()}>Clear history</button></div>
        {storageNotice && <p className="storage-notice" role="alert">{storageNotice}</p>}
        <div className="history-feedback"><p role="status">{historyMessage}</p>{undoEntries && <button type="button" onClick={() => { commitHistory(restoreDeleted(historyRef.current, undoEntries)); setUndoEntries(null); setHistoryMessage('Deleted designs restored. Newer designs were kept.'); }}>Undo deletion</button>}</div>
        {history.length ? <ul className="history-grid">{history.map(entry => <li key={entry.id} className="history-card"><div className="history-card-top"><span>{types.find(item => item.id === entry.type)?.label}</span><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></div><p className="history-title">{historyTitle(entry)}</p><p className="history-detail">{entry.settings.size} px · {entry.settings.correction} correction{entry.type === 'wifi' ? ' · Credentials saved' : ''}</p><div className="history-actions"><button type="button" onClick={() => restore(entry)}>Restore</button><button type="button" aria-label={`Delete ${historyTitle(entry).slice(0,80)}`} onClick={() => removeHistory(entry.id)}>Delete</button></div></li>)}</ul> : <div className="history-empty">No saved designs yet. Create a QR code to start your history.</div>}
      </section>
    </main>
    <footer><span>CampusQR</span><span>A simpler way to share.</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
