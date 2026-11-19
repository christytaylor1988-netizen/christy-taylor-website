# WILMACHORD LIE013 — V0.4.0 Batch 1

The application is the existing self-contained build in `lie013-preview-7x9/`.
`index.html` contains the editable interface/controller source and all 38 bundled
PCM sample zones. `worklet.js` contains the audio engine. Its identical embedded
fallback remains in the HTML. No npm packages, external sample servers or build
process are required by the deployed instrument. Serve the directory over HTTPS.

The working V0.3.1 baseline is `f633d54f0a721881bc3c5c2b70a8996749700cae`.
The branch `recovery/before-v04-batch1-20261119` preserves that release.
The user confirmed audible iPhone 13 mini output with the physical Silent Mode
switch OFF. Software tests do not replace listening on the phone.

## Batch 1 changes

- Scrollable instrument and progression pages, larger slider targets and spacing.
- Explicit EDIT/DONE palette mode; chord holding never opens the editor in PLAY.
- Visible CHORD / ARP / CHORD + ARP controls and retained BALANCE.
- Rhythm settings beside drum transport; a matching transport on page 2.
- Shared PLAY / PAUSE / STOP controls. Pause freezes the same musical clock for
  drums, chords and arp; resume continues its position; stop resets to the start.
- Output oscilloscope, persisted ON/OFF, reduced-motion default and no animation
  or analyser connection while disabled. The direct worklet→destination route
  is unchanged; the scope is a read-only side connection.
- Drum bank follows playback, deferring during drawing until the next loop.

Synthesis, sample data, effect algorithms, factory rhythms and preset identities
are preserved. Normal playback is tested sample-for-sample against the baseline.
The only engine changes are transport state, pause/resume and stop-position reset.

## Automated checks

From the repository root, with Node 22 or newer:

```sh
node .github/wilmachord/transport.test.mjs
node .github/wilmachord/controller.test.mjs
node .github/wilmachord/audio-regression.test.mjs
```

For Chromium and WebKit tests, install the pinned test-only dependency in
`.github/wilmachord`, install Playwright's browsers, then run
`node .github/wilmachord/browser.test.mjs`. Ubuntu 24.04 is the CI platform.
Browser tests serve a temporary local page with test-only accessors appended in
memory; none of those accessors ship in the application. Tests and screenshots
are written to `.github/wilmachord/output/` and uploaded as CI artifacts.

The tests distinguish numerical DSP checks, simulated controller events,
desktop browser mobile emulation and trusted Chromium touch input. They cannot
verify physical iPhone speakers, Safari's physical Silent Mode behavior, or
real-world multi-finger performance and battery usage.

## Publication and rollback

The existing Render Static Site is `christy-taylor-static`, service
`srv-dap8q48ae00c739four0`, publishing repository root `.` with no build required.
Use **Manual Deploy → Deploy a specific commit** with the tested Batch 1 commit.
Keep the established public website and its separate checkout service unchanged.
Do not change the configured branch or enable automatic deployments as a shortcut.

After publication, compare the live `version.json`, `index.html`, `worklet.js`
and `SOUND-CREDITS.txt` against that commit. `version.json` contains SHA-256 hashes.
The preview remains `/lie013-preview-7x9/`, unlisted and marked noindex, not
password-protected. A Git push alone does not establish Render publication.

Rollback uses the same manual deployment control with the baseline commit above.
An independently deployable copy of the baseline is also in the recovery ZIP.
No public navigation, artwork, shop, Stripe code or other project is changed.
