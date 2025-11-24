let injectionSynth = null;
let hissSynth = null;
let lastValue = null;
let toneReady = false;
let toneStartRequested = false;

function getTone() {
    if (typeof globalThis !== 'undefined' && globalThis.Tone) return globalThis.Tone;
    if (typeof window !== 'undefined' && window.Tone) return window.Tone;
    return null;
}

function ensureToneReady() {
    const tone = getTone();
    if (!tone) return false;

    const ctx = tone.context || (tone.getContext && tone.getContext());
    if (ctx && ctx.state === 'running') {
        toneReady = true;
        return true;
    }

    if (toneStartRequested) return toneReady;
    toneStartRequested = true;

    const resume = () => {
        tone.start().then(() => {
            toneReady = true;
        }).catch(() => {
            // Ignore; browser likely blocking without gesture
        });
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('pointerdown', () => resume(), { once: true });
        window.addEventListener('touchend', () => resume(), { once: true });
        window.addEventListener('keydown', () => resume(), { once: true });
    }

    return toneReady;
}

export function initPhysicalVaccinationSound() {
    const tone = getTone();
    if (!tone) return;
    if (!ensureToneReady()) return;

    if (!injectionSynth) {
        injectionSynth = new tone.Synth({
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.005,
                decay: 0.15,
                sustain: 0.0,
                release: 0.15
            }
        }).toDestination();

        // Soft clinical-level volume
        injectionSynth.volume.value = -18;
    }

    if (!hissSynth) {
        hissSynth = new tone.NoiseSynth({
            noise: { type: "white" },
            envelope: {
                attack: 0.001,
                decay: 0.08,
                sustain: 0.0,
                release: 0.04
            }
        }).toDestination();
        hissSynth.volume.value = -24;
    }
}

// Triggered by updateVaccinationDetail(t)
// t ∈ [0, 1]
export function physicalVaccinationSonify(t, narrativeActive = false) {
    // Never overlap narrative: exit instantly
    if (narrativeActive) return;

    if (!ensureToneReady()) return;
    initPhysicalVaccinationSound();

    lastValue = t;

    const tone = getTone();
    if (!tone || !injectionSynth) return;

    // Map vaccination coverage → pitch
    // Think: sterile, clinical rising pitch
    const midi = 40 + t * 30; // low=40 (E2), high=70 (Bb4)
    const freq = tone.Frequency(midi, "midi").toFrequency();
    const velocity = 0.35 + 0.6 * t; // subtle louder pulses as coverage rises

    // A tiny “dose-like” pulse
    injectionSynth.triggerAttackRelease(freq, 0.16, undefined, velocity);

    // Add a soft hiss to evoke injection flow
    if (hissSynth) {
        hissSynth.triggerAttackRelease(0.06);
    }
}

// --- Gentle voicing override (append-only) ---
// Keeps the feel but makes it softer/cleaner; also mutes the hiss if present.
function softenPhysicalVaccinationSoundDesign() {
    const tone = getTone();
    if (!tone) return;

    if (injectionSynth) {
        injectionSynth.oscillator.type = "triangle";
        injectionSynth.envelope.attack = 0.002;
        injectionSynth.envelope.decay = 0.06;
        injectionSynth.envelope.sustain = 0.0;
        injectionSynth.envelope.release = 0.05;
        injectionSynth.volume.value = -28; // softer overall
    }

    if (hissSynth) {
        hissSynth.volume.value = -48; // near silent hiss
        hissSynth.triggerAttackRelease = () => {}; // disable hiss bursts
    }
}

let __softenInterval = null;
if (typeof window !== 'undefined') {
    const startSoftening = () => {
        if (__softenInterval) return;
        __softenInterval = window.setInterval(() => {
            softenPhysicalVaccinationSoundDesign();
            // Once the synth exists and is softened, stop checking frequently
            if (injectionSynth) {
                window.clearInterval(__softenInterval);
                __softenInterval = null;
            }
        }, 250);
    };

    if (document.readyState === 'complete') {
        startSoftening();
    } else {
        window.addEventListener('DOMContentLoaded', startSoftening, { once: true });
    }
}

// --- Pleasant revoicing (append-only) ---
// Revoice the physical cue to a softer, pillowy beep without hiss.
let pleasantInjectionSynth = null;

function getPleasantInjectionSynth() {
    const tone = getTone();
    if (!tone) return null;

    if (!pleasantInjectionSynth) {
        pleasantInjectionSynth = new tone.MonoSynth({
            oscillator: { type: "triangle" },
            filter: { type: "lowpass", frequency: 1400, Q: 0.6 },
            envelope: { attack: 0.002, decay: 0.12, sustain: 0.0, release: 0.08 },
            filterEnvelope: {
                attack: 0.001,
                decay: 0.1,
                sustain: 0.0,
                release: 0.08,
                baseFrequency: 800,
                octaves: 1.8
            }
        }).toDestination();
        pleasantInjectionSynth.volume.value = -22;
    }

    return pleasantInjectionSynth;
}

const __originalPhysicalVaccinationSonify = physicalVaccinationSonify;

physicalVaccinationSonify = function pleasantPhysicalVaccinationSonify(t, narrativeActive = false) {
    if (narrativeActive) return;
    if (!ensureToneReady()) return;

    const tone = getTone();
    const synth = getPleasantInjectionSynth();
    if (!tone || !synth) return;

    lastValue = t;

    const freq = 520 + t * 420; // ~520 Hz (low) to ~940 Hz (high)
    const velocity = 0.22 + 0.45 * t;
    const now = tone.now();

    synth.triggerAttackRelease(freq, 0.12, now, velocity);

    if (hissSynth) {
        hissSynth.volume.value = -72;
    }

    injectionSynth = synth; // steer upstream references to the pleasant voice
};
