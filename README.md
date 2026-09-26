# CampusQR — QR Code Generator & Designer

A browser-only React QR generator built for a GDG recruitment project. This is an independent student project, not an official GDG or SRM product.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the address printed in the terminal. To create the production build, run `npm run build`. Run `npm test` for payload validation and QR image round-trip checks.

## Implemented

- Responsive desktop/mobile layout with accessible form labels and keyboard focus.
- Website, plain text, email, phone and Wi-Fi inputs.
- Live QR preview using the `qrcode` package; four-module quiet zone and medium error correction.
- URL normalization, encoded email subject/body, phone formatting and Wi-Fi escaping.
- Inline validation, empty and capacity-error states.
- Latest-input rendering: superseded async results cannot replace a newer preview.
- Drafts survive switching between QR types during the current session.
- Editable Classic, Midnight, Forest and Berry presets.
- PNG size, foreground/background colour, error correction and clear-margin controls.
- PNG download reuses the exact preview data URL, including its colours and margin.
- Download is disabled whenever input or appearance differs from the completed render.
- Low contrast, inverted colour and small-margin warnings with a safe-settings reset. The contrast cutoff (4.5:1) is an application heuristic, not a QR certification standard.
- Density guidance warns below four PNG pixels per module; this is a heuristic.
- Local PNG decoding runs in a cancellable worker and checks the exact payload. Checks restart after edits, with a 12-second timeout. Failed or unavailable checks require an explicit download override; changing the design resets that choice.
- Matching SVG export uses the same library, payload and appearance settings. The PNG is independently decoded; SVG is not independently decoded in the app.
- Editable colour hex inputs, accessible validation descriptions, polite verification announcements, keyboard skip link, touch targets and responsive export controls.

## Verification limits

See `TEST_REPORT.md` for the current 119-test result, browser checks, the history-undo bug fix and the pending physical-device checklist. Run `node scripts/phone-checks.mjs` to regenerate the sample PNG/SVG files and scan page, then rebuild. The test page is available at `/phone-checks/` in the local preview.

Software decoding does not guarantee real-phone results. Test with actual cameras and print sizes before submission. Contrast, margin and density warnings remain visible even when decoding passes. No scan-success percentage is claimed. The bundled automated tests cover payloads, storage recovery, PNG round trips, decode failures and SVG geometry/colours. A complete screen-reader audit and real-phone checks are still pending.

## Scope and limitations

The 20 most recent distinct valid designs save locally after a 1.5-second pause following an edit and successful rendering. Restore brings back the content and appearance. Delete and clear support undo during the session. Wi-Fi designs save only through the explicit save button; credentials are unencrypted. The initial example is not automatically saved. Invalid drafts are not saved. Blocked storage falls back to session-only history; malformed records are skipped. Private browsing and clearing browser data can erase history.

QR content is processed locally; no QR API, remote font, analytics or backend is used. Wi-Fi credentials are embedded in the QR image and readable by anyone with access to it.

## Deployment

The GitHub Actions workflow runs the automated tests, builds the app and publishes `dist` to GitHub Pages on pushes to `main`. In repository Settings → Pages, select **GitHub Actions** as the source. Relative asset paths support hosting under the repository path. Deployment status is shown in the Actions tab.

## Two-minute demo

1. Enter a website URL and show the live QR preview and local decode result.
2. Select Forest, change the size and colours, then download matching PNG and SVG files.
3. Show text, email and phone inputs and their appropriate fields.
4. Try an invalid URL and low-contrast colours; explain the validation and reliability warnings.
5. Restore a recent QR, refresh the page and show local persistence.
6. Scan the QR on a real phone. For Wi-Fi, enter an actual test hotspot's details locally.

The bundled `phone-checks/` Wi-Fi example is a **fictional network** and cannot connect. It tests QR recognition only. Actual connection requires an available network with matching credentials and a compatible scanner. Enterprise campus networks are unsupported.

URL inputs accept public HTTP(S) addresses containing a dotted hostname; they do not check reachability. Email and phone validation is intentionally basic and does not establish deliverability. Wi-Fi supports personal WPA/WPA2, legacy WEP and open networks, not enterprise authentication. Scanner actions vary by device. Automated decoding is not a replacement for testing real phones.

## Structure

- `src/main.jsx`: UI, per-type form drafts and live rendering.
- `src/payload.js`: pure validation and payload builders.
- `src/styles.css`: responsive layout and visual styles.
- `tests/payload.test.js`: payload edge cases and independent image decoding.

## Credits

React, Vite, node-qrcode, Lucide, jsQR and pngjs. Payload conventions follow the ZXing Barcode Contents documentation: https://github.com/zxing/zxing/wiki/Barcode-Contents

Understand and review the implementation before submitting it. Attribute third-party libraries and follow the recruitment rules regarding outside assistance.
