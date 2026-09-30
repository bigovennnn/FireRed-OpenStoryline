"""Synthesise the soundtrack from code: a cute 120 BPM music-box/marimba loop,
Animal-Crossing-style "talking" blips synced to the typewriter subtitles, and
pops on scene transitions. Usage: python3 audio.py out.wav"""
import json, sys, wave
from pathlib import Path
import numpy as np

SR = 44100
HERE = Path(__file__).parent
S = json.loads((HERE / "script.json").read_text(encoding="utf-8"))
DUR = S["duration"]
N = int(DUR * SR)
music = np.zeros(N)
voice = np.zeros(N)
sfx = np.zeros(N)
rs = np.random.RandomState(42)

BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
EXTRA = {"sparkle": [4.7, 62.0, 84.0], "whoosh": []}  # extra hits synced to visuals


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(buf, t, sig, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def bell(f, dur=1.2, d=0.45):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.12) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.05)
    return s * env(len(t), 0.002, d)


def marimba(f, dur=0.5):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)
    return s * env(len(t), 0.002, 0.16)


def bass(f, dur=0.9):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return s * env(len(t), 0.01, 0.35)


def kick():
    t = np.arange(int(0.25 * SR)) / SR
    f = 110 * np.exp(-t / 0.04) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.09)


def shaker():
    n = int(0.06 * SR)
    x = rs.randn(n)
    x = np.diff(np.concatenate([[0], x]))  # crude high-pass
    return x * env(n, 0.003, 0.018)


# chords: C  Am  F  G   (one bar each), as midi triads
PROG = [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [53, 57, 60]), (43, [55, 59, 62])]
PENTA = [72, 74, 76, 79, 81, 84]
mel_rng = np.random.RandomState(7)
bar = 0
t = 0.0
while t < DUR - 0.01:
    root, tri = PROG[bar % 4]
    section_end = t >= 88.0
    if section_end:  # final chord, let it ring
        for m in [48, 60, 64, 67, 72]:
            add(music, t, bell(midi(m), 3.5, 1.2), 0.18)
        break
    intro = t < 4.0
    # bass on 1 and 3
    add(music, t, bass(midi(root)), 0.32)
    add(music, t + 2 * BEAT, bass(midi(root)), 0.22)
    # marimba arpeggio in 8ths
    arp = tri + [tri[1] + 12, tri[2], tri[1]]
    for k in range(8):
        add(music, t + k * BEAT / 2, marimba(midi(arp[k % len(arp)] + 12)), 0.10 if intro else 0.13)
    # drums
    if not intro:
        for b in range(4):
            if b in (0, 2):
                add(music, t + b * BEAT, kick(), 0.35)
            add(music, t + b * BEAT + BEAT / 2, shaker(), 0.05)
    # music-box melody: phrase of 2 bars, seeded
    if t >= 2.0:
        for b in range(4):
            if mel_rng.rand() < 0.75:
                choices = [m for m in PENTA if (m % 12) in {x % 12 for x in tri}] or PENTA
                m = choices[mel_rng.randint(len(choices))] if mel_rng.rand() < 0.7 else PENTA[mel_rng.randint(len(PENTA))]
                add(music, t + b * BEAT, bell(midi(m)), 0.12)
            if mel_rng.rand() < 0.3:
                add(music, t + b * BEAT + BEAT / 2, bell(midi(PENTA[mel_rng.randint(len(PENTA))])), 0.08)
    t += BAR
    bar += 1

# --- talking blips (16 chars/s, same as core.typed) ---
CPS = 16
SKIP = set(" ，。！？、～“”—-:：…!?,.()（）")
for sub in S["subs"]:
    chars = list(sub["text"])
    for i, ch in enumerate(chars):
        if ch in SKIP or i % 2:  # every other char keeps it chirpy, not buzzy
            continue
        tt = sub["s"] + i / CPS
        if tt >= sub["e"]:
            break
        h = (ord(ch) * 2654435761) & 0xFFFF
        f = midi(76 + [0, 2, 4, 7, 9, 12][h % 6])
        n = int(0.055 * SR)
        x = np.arange(n) / SR
        fr = f * (1 + 0.25 * x / 0.055)  # little upward chirp
        sq = np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * 0.35 + np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.65
        add(voice, tt, sq * env(n, 0.004, 0.025), 0.22)

# --- scene transition pops ---
for sc in S["scenes"][1:]:
    n = int(0.14 * SR)
    x = np.arange(n) / SR
    f = 300 + 1500 * x / 0.14
    add(sfx, sc["start"] + 0.05, np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.05), 0.35)
for tt in EXTRA["sparkle"]:
    for k, m in enumerate([84, 88, 91, 96]):
        add(sfx, tt + k * 0.06, bell(midi(m), 0.8, 0.25), 0.10)

# duck music a bit while Claude talks
duck = np.ones(N)
for sub in S["subs"]:
    a, b = int(sub["s"] * SR), int(sub["e"] * SR)
    duck[a:b] = 0.75
k = int(0.15 * SR)
duck = np.convolve(duck, np.ones(k) / k, mode="same")

mix = music * duck + voice + sfx
fade = int(1.5 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)
mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.85
pcm = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else "soundtrack.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out, f"{DUR}s")
