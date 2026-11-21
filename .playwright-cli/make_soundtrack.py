import math
import struct
import wave

SAMPLE_RATE = 44100
DURATION = 22.0
NUM_SAMPLES = int(SAMPLE_RATE * DURATION)
BPM = 110.0
BEAT_DUR = 60.0 / BPM

# Chord progression in Hz (warm cinematic luxury electric progression: Fm9 -> Dbmaj9 -> Abmaj7 -> Eb6)
CHORDS = [
    [174.61, 207.65, 261.63, 311.13, 392.00],  # Fm9
    [138.59, 174.61, 207.65, 261.63, 311.13],  # Dbmaj9
    [207.65, 261.63, 311.13, 392.00, 440.00],  # Abmaj7 / luxury shimmer
    [155.56, 196.00, 233.08, 261.63, 349.23],  # Eb6/9
]
BASS_ROOTS = [87.31, 69.30, 103.83, 77.78]  # F2, Db2, Ab2, Eb2

# Scene transition chime timestamps (seconds)
CHIME_TIMES = [0.4, 4.2, 9.2, 14.0, 18.2]


def soft_clip(x: float) -> float:
    return math.tanh(x * 0.9)


def synth_sample(t: float):
    # Global fade-in & fade-out
    env_master = 1.0
    if t < 0.45:
        env_master = t / 0.45
    elif t > DURATION - 1.3:
        env_master = max(0.0, (DURATION - t) / 1.3)

    beat_pos = t / BEAT_DUR
    bar_idx = int(beat_pos // 4) % len(CHORDS)
    bar_phase = (beat_pos % 4.0) / 4.0
    chord = CHORDS[bar_idx]
    bass_freq = BASS_ROOTS[bar_idx]

    # 1. Warm sub + mid bass pulse on beats
    beat_frac = beat_pos % 1.0
    bass_env = math.exp(-beat_frac * 2.6) * 0.65 + 0.35
    bass = (
        math.sin(2.0 * math.pi * bass_freq * t) * 0.65
        + math.sin(2.0 * math.pi * bass_freq * 2.0 * t) * 0.22
    ) * bass_env * 0.34

    # 2. Lush detuned pad chord with slow filter-like swell per bar
    pad_swell = math.sin(bar_phase * math.pi) ** 0.55 * 0.6 + 0.4
    pad_l = 0.0
    pad_r = 0.0
    for idx, f in enumerate(chord):
        # Gentle stereo detune
        w1 = math.sin(2.0 * math.pi * (f * 0.997) * t)
        w2 = math.sin(2.0 * math.pi * (f * 1.003) * t)
        w_harm = math.sin(2.0 * math.pi * (f * 2.0) * t) * 0.14
        pan = (idx / max(1, len(chord) - 1)) - 0.5
        pad_l += (w1 * (0.6 - pan * 0.3) + w2 * 0.4 + w_harm) * 0.075
        pad_r += (w2 * (0.6 + pan * 0.3) + w1 * 0.4 + w_harm) * 0.075
    pad_l *= pad_swell
    pad_r *= pad_swell

    # 3. Clean electric plucked arpeggio (16th notes)
    sixteenth = beat_pos * 4.0
    step_idx = int(sixteenth)
    step_frac = sixteenth % 1.0
    arp_note = chord[step_idx % len(chord)] * (2.0 if (step_idx % 8) >= 4 else 1.0)
    arp_env = math.exp(-step_frac * 6.5)
    arp_sig = (
        math.sin(2.0 * math.pi * arp_note * t) * 0.7
        + math.sin(2.0 * math.pi * arp_note * 2.0 * t) * 0.25
    ) * arp_env * 0.13
    arp_pan = math.sin(step_idx * 0.9) * 0.35
    arp_l = arp_sig * (0.5 - arp_pan * 0.4)
    arp_r = arp_sig * (0.5 + arp_pan * 0.4)

    # 4. Crisp modern kick on beats 1, 2, 3, 4 (starts subtly from beat 2)
    kick = 0.0
    if t >= 1.0:
        kick_t = beat_frac * BEAT_DUR
        if kick_t < 0.16:
            f_inst = 46.0 + 115.0 * math.exp(-kick_t * 38.0)
            kick = math.sin(2.0 * math.pi * f_inst * kick_t) * math.exp(-kick_t * 22.0) * 0.36

    # 5. Soft shaker/hat tick on off-beats
    hat = 0.0
    if t >= 4.0:
        hat_pos = (beat_pos * 2.0) % 1.0
        hat_t = hat_pos * (BEAT_DUR * 0.5)
        if hat_t < 0.045 and int(beat_pos * 2.0) % 2 == 1:
            # Deterministic metallic shimmer without random hiss
            metallic = (
                math.sin(2.0 * math.pi * 6420.0 * t)
                + math.sin(2.0 * math.pi * 8310.0 * t)
                + math.sin(2.0 * math.pi * 10450.0 * t)
            ) * 0.33
            hat = metallic * math.exp(-hat_t * 95.0) * 0.065

    # 6. Glass chime accents at scene cuts
    chime_l = 0.0
    chime_r = 0.0
    for c_idx, ct in enumerate(CHIME_TIMES):
        dt = t - ct
        if 0.0 <= dt < 1.1:
            c_freq = 1046.50 if c_idx % 2 == 0 else 1318.51
            c_env = math.exp(-dt * 4.8) * (1.0 - math.exp(-dt * 120.0))
            c_sig = (
                math.sin(2.0 * math.pi * c_freq * dt) * 0.65
                + math.sin(2.0 * math.pi * c_freq * 1.5 * dt) * 0.25
            ) * c_env * 0.16
            chime_l += c_sig * (0.65 if c_idx % 2 == 0 else 0.45)
            chime_r += c_sig * (0.45 if c_idx % 2 == 0 else 0.65)

    mix_l = soft_clip((bass + pad_l + arp_l + kick + hat + chime_l) * env_master)
    mix_r = soft_clip((bass + pad_r + arp_r + kick + hat + chime_r) * env_master)
    return mix_l, mix_r


def main():
    out_path = ".playwright-cli/be6-soundtrack.wav"
    frames = bytearray()
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        l, r = synth_sample(t)
        frames.extend(
            struct.pack(
                "<hh",
                max(-32767, min(32767, int(l * 29000))),
                max(-32767, min(32767, int(r * 29000))),
            )
        )

    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(bytes(frames))
    print(f"Generated {out_path} ({DURATION}s stereo)")


if __name__ == "__main__":
    main()
