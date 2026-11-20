# WILMACHORD LIE013 — V0.4.6

Continues V0.4.5 at `34f37fbbdfaecd2a780c844802fa9d76787729ab`.
Only the unlisted instrument, its test suite and its dedicated CI workflow change.
The surrounding website, homepage, shop, checkout and their assets remain unchanged.

## Behaviour

- DYNAMICS / SPACE / EQ tabs group the existing controls. Presence is hidden;
  legacy Presence and TONE values still round-trip and sound as before.
- Progression controls use Timing & chords, Arpeggiator and Expression groups.
  Chord-only mode hides, but retains, the arp settings.
- Palette arrows navigate; grouping creation/removal remain in EDIT.
- Audition plays the unsaved chord draft using a finite separate voice group.
  Cancel does not replace the original chord; repeated auditions are bounded.
- Selected chord colour replaces the cream outline. FOLLOW/LOCK sits at the
  strum heading. Six, nine or twelve solid bands have one hue/saturation and
  ascending lightness, derived from the current plate colour.
- Main play/pause/stop controls retain the existing shared clock.
- ALL 16 fits sixteen columns and seven tracks together at 375 × 812 and
  375 × 640. The manually selected 8 + 8 view retains larger editing targets.
- Track-name holds toggle mute at 300 ms; movement cancels. The entire row dims
  without erasing notes or effects.
- Factory / My Beats switches preserve collection drafts. Arrows browse beats.
- Beat and performance histories each keep at most 32 edits. Painting and slider
  gestures form a single edit. Undo/redo do not stop the shared transport.
- My Beats stores named complete drum snapshots: factory/custom pattern and its
  implied length, edited grids, BPM, swing, snare, mutes, volume, individual FX,
  global FX and each mode's delay/tone settings.
- My Performances stores the active twelve-chord palette and voicings,
  progression, key/octave, sound, FX/EQ, timing, arp, latch, independent strum
  instrument, string count, PLUCK/HOLD and locked notes. Loading a shorter strum
  layout or replacing an already locked layout is covered by regression tests.
- Each library supports Save, Save As, Rename, Load and confirmed Delete.
  Overwrite is confirmed. Names are bounded and duplicates rejected. Each
  library holds 40 entries and exports with the full saved set.
- Load keeps the current shared BPM unless “Use saved tempo” is checked. A
  performance never replaces the active beat, or vice versa, except for that
  explicit shared-tempo choice. Saved libraries are not posted to the worklet.
- Named saves commit synchronously; page hide also flushes the current state.
  Existing schema-1 saves migrate without changing instrument/sample identities.

## Audio changes

One shared drum delay supports 20–400 ms, per-voice/global Amount and smoothed
Feedback capped at 0.94. Repeats are low-pass filtered, gently saturated and
DC-blocked in the new mode. There are no seven independent delay processors.
Silent processing ends after the wet tail decays. STOP clears the tails.

Older saves retain the original tempo-synced delay and feedback until Time is
edited. Their output is tested sample-for-sample against V0.4.5. Zero Amount
preserves dry drum output. Individual and Global settings remain independent.

GARAGE receives a 0.60 per-voice output gain after its existing transistor
waveshaping. Synthesis and effect algorithms are preserved. All other eleven
internal preset identities, including legacy CASSETTE, and all 38 samples are
preserved; their unchanged signal paths are compared against V0.4.5.

## Reproduce verification

Use Node 22+ and the pinned Playwright package in this directory. Install the
matching Chromium and WebKit browsers with Playwright, then run:

```sh
node .github/wilmachord/controller.test.mjs
node .github/wilmachord/v046-audio.test.mjs
node .github/wilmachord/browser.test.mjs
node .github/wilmachord/browser-v046.test.mjs
node --expose-gc .github/wilmachord/stress-performance.mjs baseline --long --fx --expanded
node --expose-gc .github/wilmachord/stress-performance.mjs v046 --long --fx --expanded
node .github/wilmachord/loudness-v046.mjs
```

Run the other `*.test.mjs` files for the full preserved regression suite. The
dedicated `wilmachord-v046.yml` CI workflow runs software and both browser suites.
Stress output records 600 seconds at each of 44.1 and 48 kHz for both versions.
The loudness comparison reports stereo RMS, peak and a frequency-weighted proxy;
the proxy is not calibrated LUFS or a human listening judgement.

Desktop render timing includes event dispatch, JIT, GC and OS scheduling. Its
occasional deadline overruns are reported, not concealed or treated as evidence
of iPhone underruns. Browser emulation cannot establish physical iPhone speaker
output, finger accuracy, thermal behaviour or subjective sound quality.

## Checkpoints and rollback

- A: `1b566a2` — interface and compact sequencing.
- B: `c9c3d52` — delay, GARAGE balance and audition.
- C: `ca664d3` — libraries and histories.
- D: this release — migration, lock/layout fixes, regression coverage and version metadata.

Rollback branch: `recovery/before-v046-20261120`, at the exact V0.4.5 baseline.
The recovery package includes the complete current preview, the old preview ZIP,
test code/results, a baseline-to-release patch and precise restore instructions.
