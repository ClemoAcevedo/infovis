let injectionSynth = null;
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
}

// Triggered by updateVaccinationDetail(t)
// t ∈ [0, 1]
export function physicalVaccinationSonify(t, narrativeActive = false) {
    // Never overlap narrative: exit instantly
    if (narrativeActive) return;

    if (!ensureToneReady()) return;
    initPhysicalVaccinationSound();

    // Avoid spamming: trigger only on meaningful change
    if (lastValue !== null && Math.abs(t - lastValue) < 0.015) return;
    lastValue = t;

    const tone = getTone();
    if (!tone || !injectionSynth) return;

    // Map vaccination coverage → pitch
    // Think: sterile, clinical rising pitch
    const midi = 40 + t * 30; // low=40 (E2), high=70 (Bb4)
    const freq = tone.Frequency(midi, "midi").toFrequency();

    // A tiny “dose-like” pulse
    injectionSynth.triggerAttackRelease(freq, 0.12);
}
