# WILMACHORD V0.4.4 — Batch 3B

The existing AudioWorklet engine, direct output route, 38 PCM sample zones,
three-page interface and 40-slot voice allocation are retained. There are 11
selectable instruments. CASSETTE remains an internal preset for older saves.
No Audio Unit code or unrelated website/checkout files are modified.

## Recovery stages

| Stage | Commit | Change |
| --- | --- | --- |
| Baseline / rollback | `95dd29d2e699b145df669551e8675a041846bc3f` | Deployed V0.4.3 |
| A | `76ebc00` | Clocked fragment replay, reverse, stutter and HOLD |
| B | `038eb5a` | Per-voice tuning and shared spring/delay sends |
| C | `75b7607` | Melody LOCK and independent strum instrument |
| D | `e78b899` | Independent gates, shared BPM and hidden CASSETTE selector |

The final validation checkpoint adds neutral drum-control bypass, reproducible
stress scenarios, test automation and this documentation. Each stage was checked
before advancing. The release report supplies final hashes and measurements.

## Portable parameter contract

| State / message | Range / default | Musical behavior |
| --- | --- | --- |
| `glitch` | 0–1 / 0 | Density, fragment size, look-back and reverse probability |
| `glitchTarget` | chord, arp, drums, all / all | Existing performance-bus selection |
| `glitch-hold`, `on` | boolean / false | Freeze the selected recorded fragments; release returns to live capture |
| `drumFx[i].pitch` | −12 to +12 semitones / 0 | Independent oscillator and noise/timbre tuning |
| `drumFx[i].spring` | 0–1 / 0 | Voice send into one stereo spring model |
| `drumFx[i].delay` | 0–1 / 0 | Voice send into one shared mono analogue-style delay |
| `strumLock`, `strum-lock` | boolean / false | Capture the current 12-note layout; FOLLOW releases the lock |
| `lockedNotes` | 12 integer MIDI notes / null | Persisted authoritative lock layout, MIDI 24–120 |
| `strumPreset` | same or an existing preset ID / same | Per-strum voice allocation in the same engine and sample pool |
| `chordLength` | 0.1–1.25 bars / 1 | 10–125% gate: one full four-beat bar at default; up to 25% overlap |
| `arp.length` | 0.1–1 / 0.65 | Arpeggio gate as a fraction of its independent step duration |
| `arp.speed` | 0–5 / 1 | Existing beat divisions: 1, 1/2, 1/3, 1/4, 1/6, 1/8 |
| `tempo` | 40–220 BPM / 110 | The existing 24-tick-per-quarter musical clock |

Drum index order is kick, snare, closed hat, open hat, wood, tom, clap. There are
seven actual synthesized voices; the existing six-row sequencer combines wood
and tom in its percussion row. The new voice selector exposes all seven.

GLITCH records three fixed stereo rings of 0.9 seconds: 1,036,800 bytes at
48 kHz, 952,560 at 44.1 kHz. It replays previous audio, rather than gating the
current waveform. Shared-clock edit decisions occur every 3 ticks (1.5 at high
intensity). Grains range from 6 down to 0.25 ticks, bounded to at least 96 frames.
Loop seams overlap by up to 1.5 ms; edit changes and wet/dry switching smooth over
3 ms. High settings add occasional reverse fragments and rhythmic gaps. HOLD
can freeze a fragment even with the slider at zero. Zero with HOLD off returns
to sample-exact bypass after the short transition. Rings remain ready for edits;
there is no extra dry-path latency and no per-sample buffer allocation.

The spring uses two damped feedback strings (37.1/49.7 ms), each with three short
allpass dispersion stages, 90 Hz input DC filtering, 2.8 kHz damping, feedback
0.72 and bounded saturation. The delay is a dotted eighth (0.75 beats), with
feedback 0.43, 2.3 kHz filtering, soft saturation and 40 ms delay-time glide.
Pitch and sends smooth over 20 ms. Shared tails idle after five seconds without
input; neutral controls bypass the new smoothing/filter work. All controls
start neutral and preserve the previous dry drum signal.

Independent strum sound selects existing synthesis/sample resources per voice.
Its preset attack and release are applied to that voice; instrument bus effects
(EQ, PRESENCE, DRIVE, CRUSH, WOOZE and hall reverb) remain shared. Changing only
STRUM SOUND releases only its existing strum voices over 25 ms. SAME AS CHORDS
uses the original path. The pool remains 32 active voices plus eight short
termination tails. No second engine or sample library is introduced.

LOCK snapshots the live layout, including progression chord one before the
first render. Subsequent progression, key and octave changes leave that snapshot
alone. FOLLOW retunes held strums to the current chord. The worklet reports its
authoritative notes so displayed lane labels and saved lock state agree.

CHORD LENGTH sets gates in clock ticks, including overlap across a bar boundary.
ARP LENGTH changes only individual arp gates; ARP SPEED changes their schedule.
BPM changes preserve clock phase, pending musical events and pause/resume state.

## Saved-set migration

The schema and existing storage/import/export mechanism remain compatible.
Missing drum fields become neutral; missing strum fields become FOLLOW and SAME.
An old save without `chordLength` inherits its old `arp.length`, preserving its
previous shared gate duration. Newly created sets use a full-bar chord gate.
CASSETTE is omitted from both visible instrument selectors, while old saves
continue to render its original synthesis and retained settings. Its code and
all bundled samples remain in the recovery source.

## Verification

With Node 22+ from the repository root, run every `*.test.mjs` in
`.github/wilmachord` except `browser.test.mjs` for the software regression suite.
The latter needs pinned Playwright 1.57.0 and its Chromium/WebKit browsers.
`WILMA_TEST_OUTPUT` selects the result folder. The V0.4.4 workflow runs all eleven
software suites and both mobile-dimension browser suites.

Prolonged before/after commands:

```sh
node --expose-gc .github/wilmachord/stress-performance.mjs baseline --long
node --expose-gc .github/wilmachord/stress-performance.mjs v044-neutral --long
node --expose-gc .github/wilmachord/stress-performance.mjs v044-combined --long --fx
```

Each renders ten minutes at both 44.1 and 48 kHz. The matched neutral scenario
uses TAPE STRINGS, drums, progression, fast arp, rapid 12-lane strums and tempo
changes. The combined case adds GARAGE strums, long overlapping chords, GLITCH
85%, DRIVE 35%, all seven spring/delay sends, tuning, LOCK changes and HOLD.
The script records timing distributions, deadline-budget exceedances, voice
counts, silence, finite output, clock error, stop cleanup and heap growth.

Desktop instrumented offline timings include host scheduling and garbage
collection. Their deadline-budget exceedances are not measurements of physical
iPhone underruns. Automated live browser tests are also not physical-device
listening. Real iPhone 13 mini sustained load, output routing, multitouch,
background/resume behavior, battery and subjective sound remain to be tested.

## Deployment

Use the existing Render Static Site `christy-taylor-static`, service
`srv-dap8q48ae00c739four0`, Manual Deploy → Deploy a specific commit. Keep its
configured branch and build settings intact. The URL remains the existing
unlisted `/lie013-preview-7x9/` path. Compare all four runtime files to the tested
commit after deployment, including hashes listed in `version.json`.

Rollback through the same control to
`95dd29d2e699b145df669551e8675a041846bc3f`.

The recovery ZIP contains independently servable current/baseline instrument
folders, tests, documentation, measurements and an incremental Git bundle. Its
bundle must be fetched into the existing repository with the prerequisite base;
the standalone instrument folders do not require Git or a build step.
