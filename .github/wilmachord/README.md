# WILMACHORD LIE013 — V0.4.2

The application is the existing self-contained build in `lie013-preview-7x9/`.
`index.html` contains the editable interface/controller source and all 38 bundled
PCM sample zones. `worklet.js` contains the audio engine. Its identical embedded
fallback remains in the HTML. No npm packages, external sample servers or build
process are required by the deployed instrument. Serve the directory over HTTPS.

The working V0.4.1 baseline is `10df54224eebb79e28063b1cd34fbe82b9449218`.
The branch `recovery/before-v042-20261119` preserves that release.
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

## Batch 2 changes

- Warm compensated DRIVE, exact bypass at zero, oversampling and antialiasing.
- CRUSH LEVEL was introduced in Batch 2 and is superseded by V0.4.2 below.
- KOSMISCHE pulse speed/depth control its existing ring stage; warmer filter voicing.
- HAUNTED retains resonator energy for longer natural and RELEASE-controlled tails.
- All Batch 1 interface and transport improvements above remain intact.

## V0.4.2 refinements

- One CRUSH slider: original quantizer and high-setting harmonics, automatic
  upper-band-aware compensation and a small clean anchor for quiet notes.
  Legacy CRUSH LEVEL fields are ignored safely on load/import.
- HAUNTED has a new warm harmonic reed body, detuned rank, bloom and restrained
  old modal resonances. Its dry voice, not its reverb, supplies the new character.
- ROCKSTEADY selection defaults to 50 ms ATTACK; explicit saved attacks survive.
- DRIVE retains antialiasing and level compensation, with bounded asymmetric
  transistor breakup, smooth high-setting supply sag and more upper-band presence.
- Existing drum tails bridge retriggers for 4 ms; held sample loops crossfade
  their seams for 12 ms. The shared clock, BPM setter and output routing are intact.

See [V042-DSP.md](V042-DSP.md) for current parameter definitions and native-port
notes; [BATCH2-DSP.md](BATCH2-DSP.md) is historical. All twelve presets and 38 sample
zones remain. Eleven unchanged voices match V0.4.1 with DRIVE off and moderate
CRUSH, excluding intentional loop-seam repairs. HAUNTED is tested separately.

## Automated checks

From the repository root, with Node 22 or newer:

```sh
node .github/wilmachord/sound-refinement.test.mjs
node .github/wilmachord/transport.test.mjs
node .github/wilmachord/controller.test.mjs
node .github/wilmachord/audio-regression.test.mjs
node .github/wilmachord/diagnostic-worklet.test.mjs
node .github/wilmachord/diagnostic-controller.test.mjs
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
Use **Manual Deploy → Deploy a specific commit** with the tested V0.4.2 commit.
Keep the established public website and its separate checkout service unchanged.
Do not change the configured branch or enable automatic deployments as a shortcut.

After publication, compare the live `version.json`, `index.html`, `worklet.js`
and `SOUND-CREDITS.txt` against that commit. `version.json` contains SHA-256 hashes.
The preview remains `/lie013-preview-7x9/`, unlisted and marked noindex, not
password-protected. A Git push alone does not establish Render publication.

Rollback uses the same manual deployment control with the baseline commit above.
An independently deployable copy of the baseline is also in the recovery ZIP.
No public navigation, artwork, shop, Stripe code or other project is changed.
