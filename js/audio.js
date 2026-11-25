// Synthesized 16-bit Web Audio SFX Engine (zero external assets)

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.unlocked = false;

    // Reliable iOS Safari AudioContext unlock on first touch/pointer gesture
    const unlock = () => {
      if (this.unlocked) return;
      this.init();
      if (this.ctx) {
        const buf = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.ctx.destination);
        src.start(0);
        this.unlocked = true;
      }
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone({ type = 'square', freq = 440, freqEnd = null, duration = 0.1, gain = 0.12, delay = 0 }) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  _noise({ duration = 0.12, gain = 0.12, filterFreq = 1200, filterType = 'bandpass', delay = 0 }) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const sampleCount = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    src.start(now);
  }

  shoot(heavy = false) {
    if (heavy) {
      this._tone({ type: 'triangle', freq: 520, freqEnd: 140, duration: 0.14, gain: 0.16 });
      this._noise({ duration: 0.09, gain: 0.1, filterFreq: 2400 });
    } else {
      this._tone({ type: 'triangle', freq: 380, freqEnd: 160, duration: 0.075, gain: 0.1 });
      this._noise({ duration: 0.04, gain: 0.06, filterFreq: 3000 });
    }
  }

  ignite() {
    this._noise({ duration: 0.16, gain: 0.11, filterFreq: 900, filterType: 'lowpass' });
    this._tone({ type: 'sawtooth', freq: 240, freqEnd: 620, duration: 0.12, gain: 0.06 });
  }

  hit(crit = false) {
    if (crit) {
      this._tone({ type: 'square', freq: 720, freqEnd: 1180, duration: 0.08, gain: 0.11 });
      this._tone({ type: 'triangle', freq: 220, freqEnd: 80, duration: 0.1, gain: 0.14 });
    } else {
      this._tone({ type: 'square', freq: 180, freqEnd: 70, duration: 0.06, gain: 0.08 });
    }
  }

  kill() {
    this._noise({ duration: 0.09, gain: 0.09, filterFreq: 800 });
    this._tone({ type: 'square', freq: 260, freqEnd: 95, duration: 0.09, gain: 0.08 });
  }

  explode() {
    this._noise({ duration: 0.34, gain: 0.22, filterFreq: 420, filterType: 'lowpass' });
    this._tone({ type: 'sawtooth', freq: 130, freqEnd: 32, duration: 0.3, gain: 0.18 });
  }

  playerHurt() {
    this._tone({ type: 'sawtooth', freq: 170, freqEnd: 55, duration: 0.2, gain: 0.18 });
    this._noise({ duration: 0.15, gain: 0.14, filterFreq: 600 });
  }

  dash() {
    this._noise({ duration: 0.14, gain: 0.12, filterFreq: 1800 });
    this._tone({ type: 'sine', freq: 320, freqEnd: 680, duration: 0.11, gain: 0.08 });
  }

  volley() {
    for (let i = 0; i < 4; i++) {
      this._tone({ type: 'triangle', freq: 440 + i * 70, freqEnd: 180, duration: 0.08, gain: 0.09, delay: i * 0.045 });
    }
  }

  snare() {
    this._tone({ type: 'square', freq: 580, freqEnd: 290, duration: 0.15, gain: 0.11 });
    this._tone({ type: 'triangle', freq: 880, freqEnd: 440, duration: 0.18, gain: 0.09, delay: 0.06 });
  }

  pickup(isGold = false) {
    if (isGold) {
      this._tone({ type: 'square', freq: 980, freqEnd: 1320, duration: 0.07, gain: 0.07 });
    } else {
      this._tone({ type: 'sine', freq: 660, freqEnd: 990, duration: 0.06, gain: 0.06 });
    }
  }

  levelUp() {
    const notes = [440, 554, 659, 880];
    notes.forEach((n, idx) => {
      this._tone({ type: 'square', freq: n, duration: 0.12, gain: 0.1, delay: idx * 0.075 });
    });
  }

  bossRoar() {
    this._tone({ type: 'sawtooth', freq: 110, freqEnd: 42, duration: 0.55, gain: 0.2 });
    this._noise({ duration: 0.45, gain: 0.16, filterFreq: 350, filterType: 'lowpass' });
  }

  doorOpen() {
    this._tone({ type: 'triangle', freq: 220, freqEnd: 330, duration: 0.18, gain: 0.1 });
    this._tone({ type: 'triangle', freq: 330, freqEnd: 440, duration: 0.2, gain: 0.1, delay: 0.1 });
  }

  uiClick() {
    this._tone({ type: 'square', freq: 620, freqEnd: 480, duration: 0.04, gain: 0.06 });
  }

  reroll() {
    const freqs = [320, 480, 640];
    freqs.forEach((f, idx) => {
      this._tone({ type: 'triangle', freq: f, freqEnd: f * 1.18, duration: 0.055, gain: 0.08, delay: idx * 0.04 });
    });
  }

  evolution() {
    const notes = [440, 554, 659, 880, 1108, 1318];
    notes.forEach((n, idx) => {
      this._tone({ type: 'sawtooth', freq: n, duration: 0.14, gain: 0.09, delay: idx * 0.06 });
    });
  }

  relicOpen() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, idx) => {
      this._tone({ type: 'triangle', freq: n, duration: 0.16, gain: 0.12, delay: idx * 0.07 });
    });
  }

  thunder() {
    this._noise({ duration: 0.22, gain: 0.16, filterFreq: 900, filterType: 'bandpass' });
    this._tone({ type: 'sawtooth', freq: 210, freqEnd: 55, duration: 0.18, gain: 0.12 });
  }
}

export const sfx = new SoundEngine();
