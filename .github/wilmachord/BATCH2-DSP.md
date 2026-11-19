# WILMACHORD 0.4.1 — portable DSP specification

Baseline: `b74a6b95542d4d533b366a234aff4d8375f7f4a7` (working V0.4.0 Batch 1).
All changes run in the existing `Engine` and `voiceTone` renderer. No new audio
nodes, clocks, sample resources, network requests or output connections are used.
The AudioWorklet processor wrapper, activation/resumption, diagnostics and stereo
worklet → AudioContext.destination route are unchanged. No Audio Unit is modified.

## Parameters and state migration

Schema remains 1; absent new fields receive these defaults on import/load. Values
are finite-checked and clamped in both the controller and renderer. Preset selection
continues to set its original five FX values, while these independent settings persist.

| Stable state field | Unit / range | Default | Smoothing |
| --- | --- | --- | --- |
| `drive` | normalized 0–1 | 0 (exact bypass) | 25 ms one-pole |
| `crushLevel` | linear wet amplitude 0–1 | 1 (original behavior) | 25 ms one-pole |
| `kosmische.pulseSpeed` | Hz, 0.12–24 | 17.3 | 25 ms one-pole |
| `kosmische.pulseDepth` | normalized 0–1 | 0.44 | 25 ms one-pole |

Smoothing coefficient is `1 - exp(-1/(sampleRate * 0.025))` per audio sample.
Pulse speed's slider maps `v` to `0.12 * 200^v`; saved/automated DSP values are Hz,
not slider coordinates. All definitions are independent of DOM/UI availability.
DRIVE and CRUSH LEVEL are global instrument-bus controls, including strum, manual
chords, progression and arp. Drums retain their original separate output contribution.

## DRIVE

Insert order: original chord/arp glitch buses → DRIVE → original CRUSH with new
wet level → existing TONE/filter/reverb → original drum sum/DC filter/master limiter.

Zero skips the insert completely, with no filter, extra signal delay or RNG calls.
An automated return to zero settles within about 0.5 seconds before exact bypass.
The existing GARAGE pulse-dividers and internal biased tanh are untouched.

The curve is `tanh(k*x+b) - tanh(b)` where `k=1+18*a²`, `a` is smoothed amount.
The bias starts at `0.02+0.16*a`. Above 65%, a bounded product of 3.7 Hz and
1.5281 Hz sines adds up to 0.16 bias, producing uneven, softly sputtering breakup.
There is no noise source, feedback, hard gate or use of the voice/drum RNG.
The private phase advances by `3.7/sampleRate`, modulo 1000 (both sines continuous
at wrap). The output is deterministic for a given input and parameter sequence.

The tanh antiderivative is log-cosh. First-order antiderivative antialiasing averages
that curve over each input segment; use a midpoint evaluation near a zero divisor.
Two linearly interpolated input substeps run per output frame. Two Butterworth
biquads (Q 0.5411961001 and 1.3065629649) low-pass the oversampled output at
`min(15000, sampleRate*0.31)` Hz before downsampling. Stable log-cosh uses
`abs(x)+log1p(exp(-2*abs(x)))-ln(2)`. This reduces aliasing; it is not a claim that
all possible inputs are alias-free. Mathematics reference: Parker, Zavalishin and
Le Bivic, DAFx 2016, “Reducing the Aliasing of Nonlinear Waveshaping Using
Continuous-Time Convolution,” https://www.dafx.de/paper-archive/2016/dafxpapers/20-DAFx-16_paper_41-PN.pdf.
Implementation is original; no third-party DSP code or recordings were copied.

Small-signal normalization divides the shaped signal by k before RMS compensation.
Dry/wet energy detectors use 18 ms smoothing. Makeup is bounded to
`min(k,1+3.5*a)`, approaches lower gains in 5 ms and higher gains in 90 ms, and
starts at unity. The applied gain ceiling also follows downward amount sweeps.
Dry/wet mix is `min(1,3*a)`. No unbounded adaptive gain or feedback is present.

## CRUSH LEVEL

The original quantizer, sample-hold cadence, saturator, RMS detectors and gain
compensation are unchanged. Immediately after compensated wet generation:

`out = dry + crush * (wet * crushGain * crushLevelNow - dry)`.

At default level 1 this is sample-identical to Batch 1 on unchanged voices with
DRIVE off. Level is excluded from the wet RMS detector, so the compensation cannot
undo the attenuation. The crushed stem scales linearly without changing harmonic
ratios. Existing dry contribution is `(1-crush)*dry`; at 100% CRUSH there was no
dry contribution, and LEVEL zero therefore silences that instrument contribution.
The downstream original limiter is nonlinear, so full-output harmonic ratios can
change slightly as its input level changes. The crusher itself is not redesigned.

## KOSMISCHE

The existing pulse is the AM/ring stage after the moving resonant filter:
`low * (1 - 0.5*depth + 0.5*depth*sin(phase))`.
Default depth 0.44 gives the original `0.78+0.22*sin(...)` law. One continuous
engine-wide phase is advanced by the smoothed frequency/sampleRate; moving the
controls never resets phase. The original saw/pulse/sub voices, pulse-width LFO,
resonance, filter LFO and wooze remain. The existing cutoff trajectory is scaled
by 0.86 before its safety clamp to gently warm the default voicing. The user's
TONE setting is not reset or commandeered. No additional tremolo is layered on.

## HAUNTED

Cause: its original modal amplitudes decayed exponentially at 1.6, 3.1, 6.8 and
15 per second, independent of RELEASE. Only the held fundamental had a floor;
that floor vanished at note-off. Increasing the outer release could not restore
energy already lost inside the resonators.

Ratios (1, 2.013, 5.067, 8.11), weights (0.6, 0.28, 0.16, 0.07), excitation phase,
attack and body oscillator remain. Modal amplitudes now persist as voice state.
Natural decay rates are 0.28, 0.75, 1.6 and 3.8 per second. Held equilibrium
amplitudes are 0.24, 0.09, 0.025, 0.008. Initial amplitudes retain the previous
0.82 strike, with fundamental 1.0 for held notes. The body starts at 1, decays at
0.28 per second toward a held floor of 0.2, and keeps its original 0.08 weight.
At note-off there is no amplitude reset: modal damping slows to 12% of its normal
rate, and body damping to 0.04 per second, while the existing outer RELEASE
exponential governs the tail. Existing PLUCK decay, voice limits, voice stealing,
STOP fades and termination thresholds remain. Reverb and all preset FX defaults
are unchanged. A native port can use the same per-voice amplitude states and rates.

## Preservation and evidence

The ten unmodified voices are compared sample-for-sample with Batch 1 through
combined chord/arp, CRUSH, TONE, GLITCH and reverb. HAUNTED and KOSMISCHE are
intentional voice changes with dedicated envelope/modulation checks. All 12 preset
definitions, 38 bundled sample zones, six rhythms and six snares remain intact.
DRIVE and LEVEL do not change drum-only samples or the musical clock.
Numerical tests cover wet-stem scalar invariance, alias suppression, all-preset
single/extended-chord levels, fast parameter sweeps, release termination, 32-voice
cost and a baseline comparison. Browser tests cover mobile layout, saved settings
and all Batch 1 functions in Chromium and WebKit. None verifies physical iPhone
speakers, subjective sound preference, real touchscreen handling or battery cost.
