# WILMACHORD V0.4.2 — sound and continuity specification

Rollback/baseline: `10df54224eebb79e28063b1cd34fbe82b9449218` (V0.4.1).
This updates the existing renderer; the AudioWorklet wrapper, stereo output
connection, activation, musical clock and event scheduler remain unchanged.
All 38 PCM zones are byte-identical. No Audio Unit or unrelated project changed.

## Parameters and migration

| Parameter | Range/default | Behaviour |
| --- | --- | --- |
| `fx.crush` | 0–1, existing preset default | Original smoothing/quantizer; new internal compensation |
| `crushLevel` | Retired | Ignored on import/load/configure, including zero; not re-saved |
| `drive` | 0–1, default 0 | Existing 25 ms smoothing; exact bypass at settled zero |
| ROCKSTEADY `fx.attack` | Default 0.05 seconds | Preset selection uses 50 ms; explicit saved/manual values win |
| KOSMISCHE pulse parameters | Unchanged | Existing continuous phase, ranges, defaults and smoothing |

Storage key and schema remain unchanged. A legacy ROCKSTEADY attack of 0.004
seconds is indistinguishable from a deliberate user value, so loading preserves
it. Selecting the preset again applies 0.05 seconds. Other preset attacks do not
change. New DSP state is renderer-owned and independent of DOM controls.

## Single CRUSH control

The quantization levels `2^(15-11*c)`, hold increment `1/(1+23*c*c)`, tanh stage,
dry/wet RMS detectors and existing bounded compensation are untouched. Additional
2200 Hz one-poles measure upper-band energy only; they do not filter the signal.

Let `h=smoothstep(clamp((c-0.6)/0.4,0,1))`. Compare upper-band fractions of dry and
uncompensated wet signals using `ear=clamp(sqrt((1+12*Hd/D)/(1+12*Hw/W)),0.45,1)`.
For negligible detector energies, use 1. Smooth `comfort=1-h*(1-ear)` over 25 ms.
The existing 0.0005-per-sample detector smoothing is retained at both rates.

Mix is `c*(1-0.16*h)*(1-h*(1-available))`, where
`available=clamp(W/(0.04*D+1e-12),0,1)`. Output is
`dry + mix*(wet*originalCrushGain*smoothedComfort-dry)`.
At full CRUSH, a 16% clean anchor preserves the fundamental when the wet stem is
present. When quiet notes fall below the quantizer threshold, the mix smoothly
returns toward dry instead of swallowing them. The wet stem's spectral ratios
remain intact; its gain changes. No high-frequency low-pass is inserted.
Zero is the original unaffected signal. From a fresh state, the processing below
60% matches V0.4.1 with LEVEL 1. Previous high-setting compensation settles smoothly
when returning down the range. This is deliberate loudness control, not a new
distortion algorithm or a global instrument attenuation.

## HAUNTED dry voice

The modal instrument ID and voice lifecycle remain. Metallic modal weights are
reduced from `[0.6,0.28,0.16,0.07]` to `[0.06,0.055,0.018,0.006]`; their ratios,
damping and held energy from V0.4.1 remain. The old body weight is 0.025.

A harmonic reed body supplies fundamental weight 0.48 and a second, independently
detuned rank at weight `0.19*(0.2+0.8*bloom)`. Bloom approaches 1 with a 180 ms
one-pole. Harmonics 2–4 have velocity/register-dependent brightness and slow
0.17 Hz movement; components above 0.43*sampleRate are omitted. A quiet octave
below fades out toward the bass register to prevent muddy low chords.
Detuned rank cents are `-3.2 + 1.3*sin(0.113*t+n*0.071)
+ 0.65*sin(0.37*t+n*0.19)` using the renderer's existing sine phase convention.
The frequency multiplier is `1+cents*0.00057762265`.

Reed amplitude decays at 0.32/sec toward held floor 0.38; after note-off its
internal damping is 0.045/sec, allowing the existing outer RELEASE to govern
the tail. No phase or amplitude reset occurs on note-off. The original attack,
PLUCK decay, voice limit/stealing, STOP fade and termination thresholds remain.
No extra reverb/delay, sample download or unlimited resonator feedback is used.
Exact harmonic weights and register factors are in `voiceTone` in `worklet.js`.

## DRIVE refinement

Keep the V0.4.1 antiderivative tanh antialiasing, two interpolated substeps, bounded
RMS compensation and dry/wet law. Raise the oversampled fourth-order Butterworth
cutoff from `min(15000,sr*0.31)` to `min(19000,sr*0.4)` Hz. Add a restrained dry
presence residual above a 1800 Hz one-pole before the existing energy detector;
it is scaled by `0.14*amount/max(1,makeupGain)`.

Bias is `0.02+0.4*amount+0.75*broken*biasWander`, with
`broken=max(0,(amount-0.65)/0.35)`. Private deterministic LCG seed 0x44525645,
multiplier 1664525, increment 1013904223 (unsigned 32-bit) selects new targets
every 18–123 ms. With 60% probability, supply target is 0.5–0.85, otherwise 1;
bias target is -1 to +1, scaled to 0.3 for the non-starved case. Both targets
follow 4 ms smoothing. Applied output supply is `1-broken*(1-supply)`.
Thus high settings change bias and supply gradually, without random sample pops,
hard gates or injected noise. Low/mid settings retain the fundamental and receive
asymmetric saturation. The dedicated RNG never changes the drum/voice RNG sequence.
Zero input stays zero; settled zero DRIVE bypasses exactly. Existing GARAGE tone
generation is unchanged. All following effects and output protection are retained.

## Tempo discontinuity investigation and repair

The baseline tempo setter preserves tick, phase, next drum/arp positions and
active voice IDs. A tempo edit's first output sample matches a no-edit control
exactly at 44.1/48 kHz. No scheduler reset or second timer was found.

Two discontinuities were found in generated audio:

1. Drum retriggers immediately reset an audible previous tail to a new attack.
   Save the preceding per-lane sample at a hit and add it to the new voice with
   `0.5+0.5*cos(pi*age/round(sr*0.004))` for 4 ms. This preserves the initial
   waveform value and tapers its correction to zero. Original hit times,
   velocities, snare synthesis, RNG calls and swing event positions remain.
2. Held sample loops can have a raw boundary jump up to 0.129 in the bundled tape
   material. Crossfade the last 12 ms into the first 12 ms with a raised cosine,
   capped at one eighth of the loop. On wrap resume after the already blended
   head, avoiding a duplicate segment. This changes playback only; PCM bytes and
   non-looping sample playback remain exact. No global filter masks the seams.

The shared musical clock, BPM configuration, arpeggiator subdivisions, pause/
resume and scheduling are unchanged. Tests verify event order/count across 80
tempo edits per scenario, five playback configurations and both sample rates,
plus the existing ten-minute clock soak. Numerical continuity improvements do
not prove the absence of device-specific underruns; physical iPhone listening
and performance testing are still needed.

## Evidence and limits

Eleven unaffected voices are compared to V0.4.1 sample-for-sample with DRIVE off
and moderate CRUSH; intentional drum/loop repairs are tested separately. The new
HAUNTED voice has dry register, bloom, held chord, short note and release tests.
All presets have level/finite-output/STOP checks. CRUSH wet-stem quantization
remains exact, with quiet-note coverage and legacy zero-LEVEL migration.
DRIVE is checked for deterministic breakup, zero bypass, bounded loudness,
alias reduction and output continuity. Desktop CPU measurements are not iPhone
benchmarks. Browser emulation cannot establish subjective sound quality, physical
multitouch feel, speaker output, battery use or long-session device stability.
