# WILMACHORD V0.4.3 — Batch 3A

Rollback: `5f520d5e36219c50c9c5ee50b864b9c5664deb8b`, recovery branch `recovery/before-v043-20261119`.
The release is the four files in `lie013-preview-7x9/`. No build or remote sample service is needed. Serve that directory over HTTPS; retain the folder name on the artist website. The source is the readable HTML module and worklet.js. The HTML embeds the same worklet for fallback; `stability-eq.test.mjs` verifies equality and unchanged sample data. Do not edit one copy alone. version.json records file SHA-256 hashes.

## Investigation and limits
The repeatable desktop baseline reaches 32 voices, steals held notes during rapid strumming, allocates new voice/sample objects on every note and two filter arrays per render block. Sample voices calculate three unused oscillator phases per sample. Repeated coefficient calculations and dynamic property iteration consume measurable rendering time. CPU profiles identify voice rendering and the main processing loop as dominant costs. This is evidence of avoidable work and allocation pressure, **not proof of the iPhone's reported complete signal loss**. Baseline desktop tests do not reproduce that loss. Silent Mode, session interruption and browser/device scheduling still require device observation.

The renderer, sample rate/quality, resampling law, loop crossfade, existing DSP and stereo destination connection remain in place. Changes cache immutable calculations, skip unused oscillator work for sample voices, specialize sample rendering, replace hot dynamic FX iteration with explicit fields, pool voice/sample storage and compact arrays in place. At less than 32 voices the regression suite compares all twelve instruments sample-for-sample against V0.4.2 at both sample rates, with effects and drums; it additionally verifies all six rhythms.

## Polyphony
32 active voices plus at most eight 8 ms stealing fades, from 40 preallocated slots. The former renderer allowed its stealing-tail array to grow without an explicit bound. Prefer released notes, then older plucked notes, then arp notes; protect new attacks and manual, progression and HOLD voices where practical. Quietness breaks ties. If more than eight tails collide, preserve the quietest tail's final stereo contribution in a bounded-bus 4 ms decaying bridge. This avoids an abrupt cutoff without allocating more full voices. Tail exhaustion can change extremely dense passages; the limit is documented rather than silently dropping whole chords. HOLD retuning at capacity and all pool identities/cleanup are tested.

## Instrument EQ and Presence (portable DSP)
Four stereo direct-form-II-transposed biquads, before the existing instrument output filter/reverb and **before drum summing**. RBJ Audio EQ Cookbook: https://www.w3.org/TR/audio-eq-cookbook/ . All coefficient/state storage is preallocated. Calculate coefficients on parameter changes, not per sample; interpolate coefficients and compensation over 30 ms. Normalized stable second-order denominators are interpolated within their stability region. Neutral steady state bypasses the filters exactly. No new output nodes, routing or latency.

| Parameter | Range/default | Response |
| --- | --- | --- |
| LOW | −12 to +12 dB / 0 | 180 Hz low shelf, slope 1 |
| MID | −12 to +12 dB / 0 | 850 Hz bell, Q 0.7 |
| HIGH | −12 to +12 dB / 0 | 4.5 kHz high shelf, slope 1 |
| PRESENCE | −1 to +1 / 0 | 2.6 kHz bell, Q 0.65, ±4.5 dB |

Instrument gain compensation in dB: `−0.35 × max(0, LOW, MID, HIGH) − 0.65 × max(0, PRESENCE)`. This retains useful boost, adds headroom and avoids simply increasing overall volume. Existing final soft limiter remains unchanged. Frequency-response, extreme combinations, smoothing, exact neutral bypass and drum exclusion are numerically checked. Presence is a broad upper-mid bell, distinguishable from the HIGH shelf.

`eqByPreset[presetId]` stores three dB values independently per instrument. EQ RESET affects only those three bands on the selected instrument. Presence remains a global performance control, like old TONE. Schema 1, palette/progression/rhythm and other user settings remain compatible.

**Old saved TONE:** direct substitution cannot preserve its 1.2 kHz one-pole tilt exactly. Old nonzero values are retained as `legacyTone`; Presence displays a conservative starting value `oldTone × 0.5`, with an explicit on-screen migration hint. The old coloration remains exact while this marker exists, with the new Presence filter bypassed. The first deliberate Presence adjustment clears legacyTone and old tone, smoothly switching to the new bell. Export/import preserves that marker. New sets and neutral old sets start at neutral Presence. This avoids an unexpected timbre change on loading an old performance; adjusting Presence intentionally adopts a different response. LOW/MID/HIGH continue to work independently in compatibility mode.

## Optional diagnostics
Help → PERFORMANCE DIAGNOSTICS, OFF by default. No diagnostic timer reads/counters/messages when OFF. When ON, count active/peak voices, fade tails, held-note steals, AudioContext states and audio-frame discontinuities. If the worklet exposes a high-resolution monotonic timer, measure render-call duration, worst observed duration and calls exceeding the block duration; otherwise display **timer unavailable**. Do not derive CPU time from AudioContext.currentTime. Aggregate reports twice per second. These measurements cannot establish physical speaker audibility, capture every driver underrun or conclusively identify iOS overload. Existing output-peak and A/B/C listening diagnostics remain available.

## Tests and reproducibility
Node 22+; no dependencies for DSP/controller tests. Run all `*.test.mjs` except browser.test.mjs with Node. Browser tests use pinned Playwright 1.57.0 Chromium and WebKit at 375×812 and 375×640. The V0.4.3 GitHub workflow supplies these browsers.

Run `node --expose-gc .github/wilmachord/stress-performance.mjs baseline` and `... v043`; repeat both with `--long`. Short cases cover sustained strings, rapid strums with latch on/off, drums, progression, arp, combined playback, extreme FX, tempo changes and enabled EQ. Each long test renders ten minutes of combined performance at both 44.1 and 48 kHz. Deterministic inputs; 128-frame blocks; primitive trace buffers and fixed buffers for steal tracking avoid allocation-heavy measurement code. Baseline loaded from Git, never modified. Results record mean/percentile/worst time, instrumented budget overruns, silence/nonfinite output, peak/sample jumps, voices/steals, musical-clock error and event lateness, heap before/after forced GC. Heap deltas include JIT/harness/runtime effects and are not by themselves a leak diagnosis. Offline wall-time spikes include OS scheduling and GC; they are not measured iPhone hardware buffer underruns. A maximum sample jump is an indicator, not an objective proof of an audible pop.

## Physical iPhone check still required
Silent Mode off. Load the verified V0.4.3 URL, choose TAPE STRINGS, start MOTORIK drums, LATCH on, alternate sustained chords and fast sweeps across 12 PLUCK strings for two minutes; continue ten minutes if stable. Repeat with LATCH off and HOLD multitouch, then CHORD + ARP, gradually and rapidly adjust BPM, and try high DRIVE/CRUSH. Compare scope ON/OFF and neutral/enabled EQ. If audio drops, enable Help diagnostics and report context state, voices, peak, timing availability/counters and whether direct Test A can be heard. Avoid interpreting a nonzero peak as proof of speaker output. **Do not claim this issue resolved until the user confirms stability on the physical iPhone.**

Protected website/shop/Stripe and all other projects are outside this change. No Batch 3B features or Audio Unit changes.
