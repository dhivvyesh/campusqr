# CampusQR test report — 26 September 2026

## Automated results

- 119 tests passed; 0 failed. Run `npm test`.
- Includes 80 combinations: 5 QR types × 4 presets × 4 error-correction levels.
- All five export sizes (256, 384, 640, 1024, 2048) have exact PNG dimensions and decode successfully for the size-test payload.
- Validation, Unicode, malformed inputs, capacity failure, storage recovery, deduplication, 20-entry limit, PNG verification failure and SVG geometry/colours are covered.
- Six additional export fixtures were checked by rasterizing SVG with Sharp and decoding with jsQR: website, Unicode text, email, phone, Wi-Fi and Forest preset. Every SVG decoded to the same payload as its PNG. This artifact check used the bundled Sharp runtime; it is separate from `npm test`.
- Production build passed.

## Confirmed application bug and fix

**Undo deleted newer history.** Reproduction: save A, delete A, save B, then undo. Before the fix, B disappeared because undo replaced all history with an earlier snapshot. Browser reproduction returned zero B entries.

Fix: retain only deleted records for undo, merge them into current history, deduplicate, retain chronological order and enforce the 20-entry limit. A regression test covers preservation, deduplication and the limit. After the fix, browser checks found both A and B. Temporary QA entries were removed; existing user history was retained.

## Browser checks

- Undo restores deleted entries while preserving newly created designs: passed.
- Over-capacity content disables export; shorter valid content recovers: passed.
- White-on-white QR fails verification; explicit override enables export: passed.
- Editing the payload resets the override and blocks export again: passed.
- Normal preset recovers verified output: passed.
- Responsive horizontal overflow checks passed for requested viewport widths 320, 390, 768 and 1280 (content widths after scrollbar: 305, 375, 753 and 1265).
- No browser console errors were recorded during these flows.

## Real-phone checks — pending user results

User-supplied device: OnePlus NORD CE 6 5G. Scanner application, operating-system version and physical scan results have not yet been reported.

Open `http://127.0.0.1:4173/phone-checks/` on the computer and scan the displayed images with the phone. This localhost address refers to the computer; entering it on the phone does not open the computer's app.

| Case | Screen | Downloaded PNG | SVG | Expected |
|---|---|---|---|---|
| Website | Pending | Pending | Pending | https://example.com |
| Unicode text | Pending | Pending | Pending | English, Tamil and emoji preserved |
| Email | Pending | Pending | Pending | Correct recipient, subject and body; do not send |
| Phone | Pending | Pending | Pending | Correct number; do not call |
| Demo Wi-Fi | Pending | Pending | Pending | Recognise fictional network; no connection expected |
| Forest preset | Pending | Pending | Pending | Correct URL |
| Actual owned Wi-Fi | Pending | Pending | Pending | Join an actual network entered locally |

## Remaining limits

Software decoding and responsive viewport testing are not physical phone tests. A full screen-reader audit remains pending. OS-level download completion in the embedded browser has not been confirmed; generated PNG/SVG file contents have been checked. No physical-device pass is claimed until the user reports the scan outcomes.
