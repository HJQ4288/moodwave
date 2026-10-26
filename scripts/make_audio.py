"""
生成兜底曲库的音频素材（纯标准库，无第三方依赖）

用途：在线曲库失效时，本地曲目要能真实播放，而不是只有进度条动画。
每种情绪合成一段 12 秒的氛围循环，参数（调式、速度、音色、织体）随情绪变化：
  happy 明亮大调快速琶音 / sad 小调慢速长音 / angry 强力和弦失真推进
  fearful 小二度不协和长音 / disgusted 失谐锯齿 / surprised 高音断奏跳跃
  neutral 大七和弦柔和铺底

用法：python scripts/make_audio.py
输出：public/audio/mood-<key>.wav
"""

import math
import os
import struct
import wave

SR = 22050      # 采样率
DUR = 12.0      # 时长（秒）
N = int(SR * DUR)

# 音名 → 频率（MIDI 音高）
def hz(midi):
    return 440.0 * (2 ** ((midi - 69) / 12))


def env(t, dur, a, d, s, r):
    """ADSR 包络"""
    if t < 0 or t > dur:
        return 0.0
    if t < a:
        return t / a if a > 0 else 1.0
    if t < a + d:
        k = (t - a) / d if d > 0 else 1.0
        return 1.0 - (1.0 - s) * k
    if t < dur - r:
        return s
    k = (t - (dur - r)) / r if r > 0 else 1.0
    return s * max(0.0, 1.0 - k)


def osc(phase):
    """phase 为 0..1 的循环相位"""
    return math.sin(2 * math.pi * phase)


def saw(phase):
    return 2.0 * (phase - math.floor(phase + 0.5))


def sqr(phase):
    return 1.0 if (phase % 1.0) < 0.5 else -1.0


class Mix:
    def __init__(self, n):
        self.buf = [0.0] * n

    def add_note(self, freq, start, dur, amp, wave_mix, detune=0.0,
                 a=0.01, d=0.12, s=0.7, r=0.15, vibrato=0.0):
        i0 = int(start * SR)
        n = int(dur * SR)
        if i0 >= len(self.buf):
            return
        n = min(n, len(self.buf) - i0)
        p1 = 0.0
        p2 = 0.0
        f2 = freq * (1.0 + detune)
        for k in range(n):
            t = k / SR
            e = env(t, dur, a, d, s, r)
            if e <= 0:
                continue
            vib = 1.0 + vibrato * math.sin(2 * math.pi * 5.2 * t)
            p1 = (p1 + freq * vib / SR) % 1.0
            p2 = (p2 + f2 * vib / SR) % 1.0
            v = wave_mix(p1) * 0.65 + wave_mix(p2) * 0.35
            self.buf[i0 + k] += v * amp * e

    def drone(self, freq, dur, amp, wave_mix, a=1.2, r=1.5):
        self.add_note(freq, 0.0, dur, amp, wave_mix, detune=0.004,
                      a=a, d=0.5, s=0.85, r=r, vibrato=0.0025)

    def lowpass(self, alpha):
        y = 0.0
        buf = self.buf
        for i, x in enumerate(buf):
            y += alpha * (x - y)
            buf[i] = y


def build(cfg):
    m = Mix(N)
    beat = 60.0 / cfg['bpm']
    bar = beat * 4
    scale = cfg['scale']
    root = cfg['root']
    w = cfg['wave']
    noise = cfg.get('noise', 0.0)

    # —— 铺底：和弦长音 ——
    for ci, chord in enumerate(cfg['chords']):
        start = ci * bar * cfg.get('chord_bars', 2)
        if start >= DUR:
            break
        for deg in chord:
            m.add_note(hz(root + scale[deg % len(scale)] + 12 * (deg // len(scale))),
                       start, min(bar * cfg.get('chord_bars', 2) * 1.05, DUR - start),
                       cfg['pad_amp'], w, detune=0.003,
                       a=cfg.get('pad_attack', 0.5), d=0.4, s=0.75,
                       r=cfg.get('pad_release', 0.8), vibrato=0.0018)

    # —— 低音 ——
    if cfg.get('bass_amp', 0) > 0:
        steps = int(DUR / beat)
        for i in range(steps):
            deg = cfg['bass_pattern'][i % len(cfg['bass_pattern'])]
            m.add_note(hz(root - 12 + scale[deg % len(scale)]),
                       i * beat, beat * 0.95, cfg['bass_amp'], w,
                       a=0.006, d=0.08, s=0.55, r=0.12)

    # —— 琶音 / 旋律 ——
    if cfg.get('arp_amp', 0) > 0:
        step = beat * cfg.get('arp_div', 0.5)
        total = int(DUR / step)
        pat = cfg['arp_pattern']
        for i in range(total):
            deg = pat[i % len(pat)]
            oct_up = cfg.get('arp_octave', 12)
            f = hz(root + oct_up + scale[deg % len(scale)])
            m.add_note(f, i * step + cfg.get('arp_offset', 0.0),
                       step * cfg.get('arp_len', 1.4), cfg['arp_amp'], w,
                       a=cfg.get('arp_attack', 0.005), d=step * 0.7,
                       s=cfg.get('arp_sustain', 0.25), r=step * 0.5)

    if noise > 0:
        import random
        random.seed(7)
        for i in range(N):
            m.buf[i] += (random.random() * 2 - 1) * noise * 0.35

    # —— 音色整形 ——
    if cfg.get('lowpass'):
        m.lowpass(cfg['lowpass'])

    # —— 归一化 + 首尾淡入淡出（循环无爆音）——
    peak = max(1e-9, max(abs(x) for x in m.buf))
    g = cfg.get('peak', 0.82) / peak
    fade = int(0.06 * SR)
    for i in range(N):
        v = m.buf[i] * g
        if i < fade:
            v *= i / fade
        if i > N - fade:
            v *= (N - i) / fade
        m.buf[i] = max(-1.0, min(1.0, v))
    return m.buf


MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]
MAJ7 = [0, 2, 4, 5, 7, 9, 11]

CONFIGS = {
    'happy': dict(
        bpm=126, root=60, scale=MAJOR,
        wave=lambda p: osc(p) * 0.7 + saw(p) * 0.3,
        chords=[[0, 2, 4], [3, 5, 0], [4, 6, 1], [0, 2, 4]],
        chord_bars=1, pad_amp=0.11, pad_attack=0.25, pad_release=0.5,
        bass_amp=0.16, bass_pattern=[0, 0, 4, 4],
        arp_amp=0.13, arp_div=0.25, arp_pattern=[0, 2, 4, 6, 4, 2, 4, 6],
        arp_attack=0.004, arp_sustain=0.3, lowpass=0.5,
    ),
    'sad': dict(
        bpm=64, root=57, scale=MINOR,
        wave=osc,
        chords=[[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]],
        chord_bars=1, pad_amp=0.13, pad_attack=1.4, pad_release=1.6,
        bass_amp=0.13, bass_pattern=[0, 0, 0, 5],
        arp_amp=0.07, arp_div=1.0, arp_pattern=[4, 2, 0, 2],
        arp_attack=0.05, arp_sustain=0.35, lowpass=0.22,
    ),
    'angry': dict(
        bpm=148, root=52, scale=MINOR,
        wave=lambda p: saw(p) * 0.62 + sqr(p) * 0.38,
        chords=[[0, 4, 7], [0, 4, 7], [3, 7, 10], [0, 4, 7]],
        chord_bars=1, pad_amp=0.09, pad_attack=0.02, pad_release=0.2,
        bass_amp=0.2, bass_pattern=[0, 0, 0, 3],
        arp_amp=0.1, arp_div=0.25, arp_pattern=[0, 0, 4, 0, 3, 3, 4, 0],
        arp_attack=0.002, arp_sustain=0.2, lowpass=0.65, peak=0.86,
    ),
    'fearful': dict(
        bpm=76, root=50, scale=MINOR,
        wave=lambda p: osc(p) * 0.55 + saw(p) * 0.2 + sqr(p) * 0.25,
        chords=[[0, 1, 4], [0, 1, 4], [0, 1, 6], [0, 1, 4]],
        chord_bars=2, pad_amp=0.1, pad_attack=1.8, pad_release=2.0,
        bass_amp=0.15, bass_pattern=[0, 0, 0, 0],
        arp_amp=0.05, arp_div=1.5, arp_pattern=[6, 4, 6],
        arp_attack=0.5, arp_sustain=0.4, lowpass=0.16, noise=0.05,
    ),
    'disgusted': dict(
        bpm=98, root=51, scale=MINOR,
        wave=lambda p: saw(p) * 0.55 + sqr(p) * 0.45,
        chords=[[0, 3, 3], [1, 4, 4], [0, 3, 6], [1, 4, 4]],
        chord_bars=1, pad_amp=0.085, pad_attack=0.15, pad_release=0.4,
        bass_amp=0.17, bass_pattern=[0, 1, 0, 1],
        arp_amp=0.08, arp_div=0.35, arp_pattern=[0, 3, 4, 3, 1, 3, 4, 3],
        arp_attack=0.01, arp_sustain=0.25, lowpass=0.4, noise=0.03,
    ),
    'surprised': dict(
        bpm=132, root=62, scale=MAJOR,
        wave=lambda p: osc(p) * 0.5 + saw(p) * 0.5,
        chords=[[0, 2, 4], [4, 6, 1], [2, 4, 6], [5, 0, 2]],
        chord_bars=1, pad_amp=0.075, pad_attack=0.1, pad_release=0.3,
        bass_amp=0.14, bass_pattern=[0, 3, 4, 3],
        arp_amp=0.14, arp_div=0.2, arp_pattern=[0, 4, 2, 6, 4, 7, 2, 5],
        arp_attack=0.003, arp_sustain=0.15, arp_octave=24, lowpass=0.55,
    ),
    'neutral': dict(
        bpm=78, root=60, scale=MAJ7,
        wave=osc,
        chords=[[0, 2, 4, 6], [3, 5, 0, 2], [5, 0, 2, 4], [0, 2, 4, 6]],
        chord_bars=1, pad_amp=0.11, pad_attack=0.9, pad_release=1.0,
        bass_amp=0.1, bass_pattern=[0, 0, 5, 5],
        arp_amp=0.06, arp_div=0.75, arp_pattern=[4, 6, 2, 0],
        arp_attack=0.03, arp_sustain=0.3, lowpass=0.26,
    ),
}


def write_wav(path, buf):
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        frames = bytearray()
        for v in buf:
            frames += struct.pack('<h', int(v * 32767))
        f.writeframes(bytes(frames))


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(root, 'public', 'audio')
    os.makedirs(out, exist_ok=True)
    for key, cfg in CONFIGS.items():
        buf = build(cfg)
        path = os.path.join(out, f'mood-{key}.wav')
        write_wav(path, buf)
        size = os.path.getsize(path) / 1024
        print(f'{key:10s} -> {path}  ({size:.0f} KB)')


if __name__ == '__main__':
    main()
