# WILMACHORD V0.4.5

Continue the V0.4.4 renderer at `c62ad3ab2c45e9d9be920f5aaab894a8f84b1cc4`.
The 38 sample zones, eleven selectable sounds, legacy CASSETTE, voice pool,
three pages, routing, transport and shared musical clock are retained.

## Checkpoints

- Before: remote `recovery/before-v045-20261120`, exact V0.4.4 commit above.
- A `a45b1fc`: instrument button grid, one EFFECTS section, manual drum views,
  independent seven-row editing and smooth track mute.
- B `3e868ea`: dispersive spring, wet tone, separate global drum effects,
  musical fragment length and protection against capturing previous silence.
- C `c2e8185`: DEFAULT/NIGHT/OLIVE/INK/CUSTOM, saved colour combinations,
  contrast adjustment and twelve independent chord tile colours.
- D: final version metadata, regression and performance verification, source
  notes, complete recovery package, existing Render deployment.

## State and DSP contract

| State | Range / default | Behavior |
| --- | --- | --- |
| `drumView` | `split` or `all` / split | Manual 8 + 8 banks, or horizontally scrollable 16 steps |
| `drumBank` | 0 or 1 / 0 | Never follows playback; persisted through reload/STOP |
| `drumMutes` | seven booleans / false | DSP order: kick, snare, closed hat, open hat, wood, tom, clap |
| `drumFxMode` | individual or global / individual | Separate saved controls; switch does not overwrite either set |
| `drumFx[i]` | existing pitch ±12, spring/delay 0–1 | Original per-voice controls |
| `drumSpringTone` | −1…1 / 0 | Shared wet spring colour in INDIVIDUAL mode |
| `globalDrumFx` | pitch ±12; spring/delay 0–1; tone −1…1 / all 0 | Whole-kit tuning and shared effects |
| `fragmentLength` | 0–1 / 0.25 | Short fragments → longer phrases; ORIGINAL is 0.25 |
| `appearance` | theme, custom colours/tiles, saved combinations | Controller-only appearance; never rewires or controls audio |

Track labels require a 550 ms press, cancelled after 8 px of movement or pointer
cancellation. Keyboard activation is supported. Grid cells retain painting and
never toggle mutes. WOOD and TOM now have independent rows, preserving their
factory patterns and old edited data. Muting fades the dry voice and both sends
with a 4 ms time constant; existing shared wet tails decay naturally. The
unmuted neutral output is sample-identical to V0.4.4 at 44.1 and 48 kHz.

GLOBAL PITCH retunes all seven drum synthesizers by the same semitone amount;
it is not a delayed post-mix pitch shifter. Pitch and send targets glide over
20 ms. GLOBAL SPRING/DELAY take the complete post-speaker drum mix. INDIVIDUAL
uses the preserved voice sends. One stereo spring and one mono delay are shared
by both modes; existing tails continue during transitions. Zero global controls
reproduce the neutral dry signal exactly. The individual spring-tone control
colours the shared spring return, so it applies to all individual spring sends.

The old spring had two damped lines with only three short dispersion stages.
The new model uses 28.7/37.9 ms lines and sixteen stretched allpass stages per
line, accumulating frequency-dependent travel time on each reflection. Input
high-pass 160 Hz; feedback 0.82; damping 5.2 kHz; bounded saturation. Wet tone
is a smoothed spectral tilt outside feedback, leaving dry drums and delay
unchanged. Spring and delay each idle after five seconds without input.
No measured hardware tank or subjective listening equivalence is claimed.

The model is informed by the dispersive-waveguide approach described in
[Parker & Bilbao, DAFx 2009](https://dafx.de/paper-archive/details/MBjqiMDVjnAseoN9C-fzBw)
and the [DAFx 2013 discussion](https://dafx.de/paper-archive/details/omUNRAXkKDeEOxMkIyPwQg).
The implementation is original and deliberately lighter than a full mechanical
finite-difference simulation. The existing dotted-eighth delay remains at
feedback 0.43, 2.3 kHz filtering and 40 ms time glide.

GLITCH keeps the original 0.9-second capture rings, plus 2.4-second phrase rings,
for three stereo buses. Total fixed PCM history at 48 kHz is 3,801,600 bytes
(3.63 MiB); no ring allocation occurs during rendering. Original length uses
sample-identical V0.4.4 splice decisions and capture behavior. Other lengths
scale grains by `2 ** ((value - .25) * 8)`; longer settings increase the shared-
clock decision spacing by powers of two. Maximum grain is 82% of the 2.4-second
ring. Short seam fades and 3 ms edit crossfades remain. HOLD freezes the selected
capture. Long phrases reject old silence, constrain look-back to the recent
sound history, and avoid extending short glitch gaps into long dropouts.
Clean playback has no added latency. Extreme lengths, HOLD, default equivalence,
start after silence and simultaneous FX are tested at both sample rates.

## Colours and migration

Existing schema 1 and browser storage key are retained. Missing new audio fields
receive the defaults above; old drum edits, preset data and CASSETTE still load.
Appearance uses CSS variables, with DEFAULT retaining the existing palette.
NIGHT, OLIVE and INK are alternatives. CUSTOM edits background, panel, button,
text, accent, active and plate colours, plus twelve tile colours independently.
Up to twelve named combinations can be saved, reloaded or deleted. Reset restores
DEFAULT while retaining saved combinations. Invalid imported colours are rejected;
hex colours and bounded names are normalized. Foreground text is adjusted to at
least 4.5:1 against its relevant background. The black/green scope is preserved.
Themes and all musical settings use the existing export/import and persistence.

## Verification and reproduction

The GitHub workflow runs all thirteen software suites plus Chromium and WebKit
at 375 × 812 and 375 × 640 CSS pixels. Trusted Chromium touch input verifies
vertical scrolling and horizontal ALL 16 scrolling separately from page swipes.

`stress-performance.mjs baseline --long --fx` renders V0.4.4 for ten minutes per
sample rate. `stress-performance.mjs v045-combined --long --fx` renders the same
workload with V0.4.5. Add `--expanded` for alternating global/individual modes,
extreme fragment lengths, tone sweeps and independent track mutes. Run Node with
`--expose-gc` and set `WILMA_TEST_OUTPUT` to the result directory. Timing measures
instrumented desktop calls, including dispatch and OS/GC delays; outliers are not
proof of physical iPhone dropouts. The report records actual measurements.

Physical iPhone 13 mini listening, multitouch, output routing, interruptions,
battery and thermal behavior are not established by desktop WebKit emulation.
The report provides a short device-listening checklist. Existing AU/Logic code,
website pages, shop and checkout remain outside this change.
