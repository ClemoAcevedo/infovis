import * as Tone from "tone";

let injectionSynth = null;
let lastValue = null;

export function initPhysicalVaccinationSound() {
    if (!injectionSynth) {
        injectionSynth = new Tone.Synth({
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

    initPhysicalVaccinationSound();

    // Avoid spamming: trigger only on meaningful change
    if (lastValue !== null && Math.abs(t - lastValue) < 0.015) return;
    lastValue = t;

    // Map vaccination coverage → pitch
    // Think: sterile, clinical rising pitch
    const midi = 40 + t * 30; // low=40 (E2), high=70 (Bb4)
    const freq = Tone.Frequency(midi, "midi").toFrequency();

    // A tiny “dose-like” pulse
    injectionSynth.triggerAttackRelease(freq, 0.12);
}
