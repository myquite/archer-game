// ARCHER — Evolving Multi-Section 16-Bit Soundtrack & Balanced Throttled SFX Engine
// - 8-bar (128-step) evolving A / A2 / B / C song structure per biome + Boss Rush
// - Lush sustained chord pads, melodic phrasing, and dynamic drum fills (never a 2-bar loop!)
// - Smart per-SFX cooldown throttling + rebalanced music-forward mix so late-game swarms stay crisp

const NOTE_FREQ = {
  C2: 65.41, Cs2: 69.30, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, Fs2: 92.50, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, Cs3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Cs4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Cs5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, F6: 1396.91,
};

// Each theme is an 8-bar evolving progression (8 chords, 4 distinct 2-bar melody sections A, A2, B, C)
// with sparse musical phrasing, lush sustained pads, and varied drum patterns!
const MUSIC_THEMES = {
  crypts: {
    bpm: 114,
    leadVoice: 'harpsichord',
    // 8 bars of lush chord progressions (A: Dm-Bb-C-A | B: Gm-Dm-Eb-A)
    chords: [
      { bass: 'D2',  pad: ['D3', 'F3', 'A3'] },
      { bass: 'Bb2', pad: ['D3', 'F3', 'Bb3'] },
      { bass: 'C2',  pad: ['C3', 'E3', 'G3'] },
      { bass: 'A2',  pad: ['Cs3', 'E3', 'A3'] },
      { bass: 'G2',  pad: ['D3', 'G3', 'Bb3'] },
      { bass: 'F2',  pad: ['C3', 'F3', 'A3'] },
      { bass: 'Bb2', pad: ['D3', 'F3', 'Bb3'] },
      { bass: 'A2',  pad: ['Cs3', 'E3', 'A3'] },
    ],
    // 8 bars x 16 steps = 128-step evolving melody (rests let the dungeon breathe!)
    melody: [
      // Bar 1-2 (A - haunting motif)
      'D4', null, null, 'F4', 'A4', null, 'G4', null, 'F4', null, 'E4', null, 'D4', null, null, null,
      'Bb4', null, null, 'A4', 'G4', null, 'F4', null, 'E4', null, null, null, null, null, null, null,
      // Bar 3-4 (A2 - rising answer)
      'C4', null, null, 'E4', 'G4', null, 'C5', null, 'B4', null, 'A4', null, 'G4', null, null, null,
      'A4', null, 'Cs5', null, 'E5', null, 'D5', null, 'Cs5', null, null, null, 'A4', null, null, null,
      // Bar 5-6 (B - lyrical bridge)
      'G4', null, 'Bb4', null, 'D5', null, null, 'C5', 'Bb4', null, 'A4', null, 'G4', null, null, null,
      'A4', null, 'C5', null, 'F5', null, null, 'E5', 'D5', null, 'C5', null, 'A4', null, null, null,
      // Bar 7-8 (C - dramatic turnaround)
      'Bb4', null, 'A4', 'G4', 'F4', null, 'D4', null, 'F4', null, 'G4', null, 'A4', null, null, null,
      'E4', null, 'G4', null, 'A4', null, 'Cs5', null, 'A4', null, null, null, null, null, null, null,
    ],
    bassRhythm: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    kick:       [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:        [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
  },

  catacombs: {
    bpm: 108,
    leadVoice: 'bell',
    chords: [
      { bass: 'E2', pad: ['E3', 'G3', 'B3'] },
      { bass: 'F2', pad: ['F3', 'A3', 'C4'] },
      { bass: 'E2', pad: ['E3', 'G3', 'B3'] },
      { bass: 'D2', pad: ['D3', 'F3', 'A3'] },
      { bass: 'C2', pad: ['C3', 'E3', 'G3'] },
      { bass: 'G2', pad: ['D3', 'G3', 'B3'] },
      { bass: 'F2', pad: ['F3', 'A3', 'C4'] },
      { bass: 'B2', pad: ['D3', 'Fs3', 'B3'] },
    ],
    melody: [
      'E4', null, null, 'F4', 'G4', null, null, 'B4', 'A4', null, null, null, 'G4', null, null, null,
      'F4', null, 'A4', null, 'C5', null, 'B4', null, 'A4', null, null, null, null, null, null, null,
      'E5', null, null, 'D5', 'C5', null, 'B4', null, 'G4', null, 'F4', null, 'E4', null, null, null,
      'D4', null, 'F4', null, 'A4', null, 'G4', null, 'F4', null, null, null, null, null, null, null,
      'C5', null, null, 'G4', 'E4', null, 'G4', null, 'C5', null, 'D5', null, 'E5', null, null, null,
      'D5', null, null, 'B4', 'G4', null, 'B4', null, 'D5', null, null, null, 'B4', null, null, null,
      'C5', null, 'B4', null, 'A4', null, 'F4', null, 'A4', null, 'C5', null, 'A4', null, null, null,
      'B4', null, null, 'A4', 'G4', null, 'Fs4', null, 'E4', null, null, null, null, null, null, null,
    ],
    bassRhythm: [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    kick:       [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:        [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  },

  foundry: {
    bpm: 126,
    leadVoice: 'synth',
    chords: [
      { bass: 'C2',  pad: ['C3', 'Eb3', 'G3'] },
      { bass: 'Ab2', pad: ['C3', 'Eb3', 'Ab3'] },
      { bass: 'Bb2', pad: ['D3', 'F3', 'Bb3'] },
      { bass: 'G2',  pad: ['D3', 'G3', 'B3'] },
      { bass: 'F2',  pad: ['C3', 'F3', 'Ab3'] },
      { bass: 'C2',  pad: ['C3', 'Eb3', 'G3'] },
      { bass: 'Ab2', pad: ['C3', 'Eb3', 'Ab3'] },
      { bass: 'G2',  pad: ['D3', 'G3', 'B3'] },
    ],
    melody: [
      'C4', null, 'Eb4', null, 'G4', null, null, 'F4', 'Eb4', null, 'D4', null, 'C4', null, null, null,
      'Ab4', null, null, 'G4', 'F4', null, 'Eb4', null, 'C4', null, null, null, null, null, null, null,
      'Bb4', null, 'F4', null, 'D4', null, 'F4', null, 'Bb4', null, 'C5', null, 'D5', null, null, null,
      'B4', null, null, 'G4', 'D4', null, 'G4', null, 'B4', null, null, null, 'G4', null, null, null,
      'C5', null, null, 'Bb4', 'Ab4', null, 'G4', null, 'F4', null, 'Eb4', null, 'F4', null, null, null,
      'G4', null, 'C5', null, 'Eb5', null, 'D5', null, 'C5', null, null, null, 'G4', null, null, null,
      'Ab4', null, 'C5', null, 'Eb5', null, 'C5', null, 'Bb4', null, 'Ab4', null, 'G4', null, null, null,
      'G4', null, 'B4', null, 'D5', null, 'C5', null, 'B4', null, null, null, null, null, null, null,
    ],
    bassRhythm: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    kick:       [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    snare:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:        [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    anvil:      [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  },

  citadel: {
    bpm: 116,
    leadVoice: 'bell',
    chords: [
      { bass: 'A2', pad: ['A3', 'C4', 'E4'] },
      { bass: 'F2', pad: ['A3', 'C4', 'F4'] },
      { bass: 'C2', pad: ['G3', 'C4', 'E4'] },
      { bass: 'G2', pad: ['G3', 'B3', 'D4'] },
      { bass: 'D2', pad: ['A3', 'D4', 'F4'] },
      { bass: 'A2', pad: ['A3', 'C4', 'E4'] },
      { bass: 'F2', pad: ['A3', 'C4', 'F4'] },
      { bass: 'E2', pad: ['Ab3', 'B3', 'E4'] },
    ],
    melody: [
      'E5', null, null, 'C5', 'A4', null, null, 'B4', 'C5', null, 'E5', null, null, null, null, null,
      'F5', null, null, 'E5', 'C5', null, 'A4', null, 'C5', null, null, null, null, null, null, null,
      'G5', null, null, 'E5', 'C5', null, 'E5', null, 'G5', null, 'A5', null, 'G5', null, null, null,
      'D5', null, null, 'B4', 'G4', null, 'B4', null, 'D5', null, null, null, null, null, null, null,
      'F5', null, 'E5', null, 'D5', null, 'A4', null, 'D5', null, 'F5', null, 'E5', null, null, null,
      'E5', null, null, 'C5', 'A4', null, 'C5', null, 'E5', null, null, null, 'C5', null, null, null,
      'A5', null, null, 'F5', 'C5', null, 'A4', null, 'C5', null, 'F5', null, 'E5', null, null, null,
      'E5', null, 'D5', null, 'B4', null, 'Ab4', null, 'B4', null, null, null, null, null, null, null,
    ],
    bassRhythm: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    kick:       [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:        [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  },

  abyss: {
    bpm: 132,
    leadVoice: 'synth',
    chords: [
      { bass: 'Fs2', pad: ['Fs3', 'A3', 'Cs4'] },
      { bass: 'D2',  pad: ['Fs3', 'A3', 'D4'] },
      { bass: 'E2',  pad: ['E3', 'Ab3', 'B3'] },
      { bass: 'Cs2', pad: ['Cs3', 'F3', 'Ab3'] },
      { bass: 'B2',  pad: ['D3', 'Fs3', 'B3'] },
      { bass: 'Fs2', pad: ['Fs3', 'A3', 'Cs4'] },
      { bass: 'G2',  pad: ['D3', 'G3', 'B3'] },
      { bass: 'Cs2', pad: ['Cs3', 'F3', 'Ab3'] },
    ],
    melody: [
      'Fs4', null, 'A4', null, 'Cs5', null, 'B4', null, 'A4', null, 'Fs4', null, null, null, null, null,
      'D5', null, null, 'Cs5', 'A4', null, 'Fs4', null, 'A4', null, null, null, null, null, null, null,
      'E5', null, 'B4', null, 'Ab4', null, 'B4', null, 'E5', null, 'Fs5', null, 'E5', null, null, null,
      'Cs5', null, null, 'Ab4', 'F4', null, 'Ab4', null, 'Cs5', null, null, null, null, null, null, null,
      'D5', null, 'Fs5', null, 'B4', null, 'D5', null, 'Fs5', null, 'E5', null, 'D5', null, null, null,
      'Cs5', null, 'A4', null, 'Fs4', null, 'A4', null, 'Cs5', null, null, null, 'A4', null, null, null,
      'G4', null, 'B4', null, 'D5', null, 'Fs5', null, 'E5', null, 'D5', null, 'B4', null, null, null,
      'Cs5', null, 'Ab4', null, 'Cs5', null, 'F5', null, 'Cs5', null, null, null, null, null, null, null,
    ],
    bassRhythm: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
    kick:       [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    snare:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat:        [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
  },

  boss: {
    bpm: 140,
    leadVoice: 'synth',
    chords: [
      { bass: 'D2',  pad: ['D3', 'F3', 'A3'] },
      { bass: 'Eb2', pad: ['Eb3', 'G3', 'Bb3'] },
      { bass: 'D2',  pad: ['D3', 'F3', 'A3'] },
      { bass: 'A2',  pad: ['Cs3', 'E3', 'A3'] },
      { bass: 'Bb2', pad: ['D3', 'F3', 'Bb3'] },
      { bass: 'G2',  pad: ['D3', 'G3', 'Bb3'] },
      { bass: 'F2',  pad: ['C3', 'F3', 'A3'] },
      { bass: 'A2',  pad: ['Cs3', 'E3', 'A3'] },
    ],
    melody: [
      'D5', null, 'D5', 'F5', 'E5', null, 'D5', null, 'C5', null, 'A4', null, 'D5', null, null, null,
      'Eb5', null, null, 'D5', 'Bb4', null, 'G4', null, 'Bb4', null, null, null, null, null, null, null,
      'D5', null, 'F5', null, 'A5', null, 'G5', null, 'F5', null, 'E5', null, 'D5', null, null, null,
      'Cs5', null, 'E5', null, 'A5', null, null, 'G5', 'E5', null, null, null, 'Cs5', null, null, null,
      'Bb4', null, 'D5', null, 'F5', null, 'E5', null, 'D5', null, 'C5', null, 'Bb4', null, null, null,
      'G4', null, 'Bb4', null, 'D5', null, 'C5', null, 'Bb4', null, 'A4', null, 'G4', null, null, null,
      'A4', null, 'C5', null, 'F5', null, 'E5', null, 'D5', null, 'C5', null, 'A4', null, null, null,
      'A4', null, 'Cs5', null, 'E5', null, 'G5', null, 'E5', null, 'Cs5', null, 'A4', null, null, null,
    ],
    bassRhythm: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    kick:       [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
    snare:      [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
    hat:        [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    anvil:      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  },
};

const PENTATONIC_PICKUP = [587.33, 698.46, 783.99, 880.00, 1046.50, 1174.66, 1396.91];

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.mode = this._loadMode(); // 'all' | 'sfx' | 'mute'

    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.musicFilter = null;
    this.echoBus = null;

    this.currentTheme = 'crypts';
    this.musicPlaying = false;
    this.ducked = true;
    this.step = 0; // 0..127 (8 full bars!)
    this.cycle = 0; // Increments every 8 bars for subtle arrangement variation!
    this.nextNoteTime = 0;
    this.schedulerId = null;

    this.pickupStreak = 0;
    this.lastPickupTs = 0;
    this.sfxLastTs = new Map(); // Per-SFX cooldown throttling so swarms never drown music!

    const unlock = () => {
      this.init();
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (!this.unlocked) {
          const buf = this.ctx.createBuffer(1, 1, 22050);
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          src.connect(this.ctx.destination);
          src.start(0);
          this.unlocked = true;
        }
        if (this.mode === 'all' && !this.musicPlaying) {
          this.startMusic(this.currentTheme);
        }
      }
    };
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else if (this.mode !== 'mute') this.ctx.resume().catch(() => {});
    });
  }

  _loadMode() {
    try {
      const saved = localStorage.getItem('archer_audio_mode');
      if (saved === 'all' || saved === 'sfx' || saved === 'mute') return saved;
    } catch (_) {}
    return 'all';
  }

  _saveMode() {
    try { localStorage.setItem('archer_audio_mode', this.mode); } catch (_) {}
  }

  getModeIcon() {
    return this.mode === 'all' ? '🔊' : this.mode === 'sfx' ? '🔔' : '🔇';
  }

  getModeLabel() {
    return this.mode === 'all' ? 'Music + SFX' : this.mode === 'sfx' ? 'SFX Only' : 'Muted';
  }

  cycleMode() {
    const order = ['all', 'sfx', 'mute'];
    this.mode = order[(order.indexOf(this.mode) + 1) % order.length];
    this._saveMode();
    this.init();
    this._applyBusVolumes();
    if (this.mode === 'all') this.startMusic(this.currentTheme);
    else this.stopMusic();
    if (this.mode !== 'mute') this.uiClick();
    return this.mode;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Gentle master limiter so music stays proud & never pumps/clips
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 14;
      comp.ratio.value = 4;
      comp.attack.value = 0.006;
      comp.release.value = 0.12;
      comp.connect(this.ctx.destination);
      this.master = comp;

      // Subtle Dungeon Stone-Hall Echo Send
      const delay = this.ctx.createDelay(0.6);
      delay.delayTime.value = 0.24;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.22;
      const echoLP = this.ctx.createBiquadFilter();
      echoLP.type = 'lowpass';
      echoLP.frequency.value = 1850;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.2;

      delay.connect(echoLP);
      echoLP.connect(fb);
      fb.connect(delay);
      echoLP.connect(wet);
      wet.connect(this.master);
      this.echoBus = delay;

      // SFX Bus — polished with a warm 4.2kHz lowpass so rapid combat SFX never grate or bury music!
      const sfxTone = this.ctx.createBiquadFilter();
      sfxTone.type = 'lowpass';
      sfxTone.frequency.value = 4200;

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.44;
      this.sfxBus.connect(sfxTone);
      sfxTone.connect(this.master);

      // Music Bus — warm, prominent & clear in the center of the mix!
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = this.ducked ? 1100 : 7200;

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.ducked ? 0.24 : 0.56;
      this.musicBus.connect(this.musicFilter);
      this.musicFilter.connect(this.master);
      this.musicFilter.connect(this.echoBus);

      this._applyBusVolumes();
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.mode !== 'mute') {
      this.ctx.resume().catch(() => {});
    }
  }

  _applyBusVolumes() {
    if (!this.ctx || !this.sfxBus || !this.musicBus) return;
    const now = this.ctx.currentTime;
    const sfxVol = this.mode === 'mute' ? 0 : 0.44;
    const musVol = this.mode === 'all' ? (this.ducked ? 0.24 : 0.56) : 0;
    const cutoff = this.ducked ? 1050 : 7200;
    this.sfxBus.gain.setTargetAtTime(sfxVol, now, 0.04);
    this.musicBus.gain.setTargetAtTime(musVol, now, 0.1);
    this.musicFilter.frequency.setTargetAtTime(cutoff, now, 0.12);
  }

  setMusicTheme(themeKey) {
    if (!MUSIC_THEMES[themeKey]) themeKey = 'crypts';
    if (this.currentTheme === themeKey && this.musicPlaying) return;
    this.currentTheme = themeKey;
    this.step = 0;
    if (this.mode === 'all' && this.ctx) this.startMusic(themeKey);
  }

  setMusicDucked(isDucked) {
    if (this.ducked === isDucked) return;
    this.ducked = isDucked;
    this._applyBusVolumes();
  }

  startMusic(themeKey = this.currentTheme) {
    this.currentTheme = MUSIC_THEMES[themeKey] ? themeKey : 'crypts';
    if (this.mode !== 'all') return;
    this.init();
    if (!this.ctx || this.musicPlaying) return;

    this.musicPlaying = true;
    this.step = 0;
    this.cycle = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.06;
    this.schedulerId = setInterval(() => this._scheduleMusic(), 45);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  _scheduleMusic() {
    if (!this.ctx || !this.musicPlaying || this.mode !== 'all' || this.ctx.state !== 'running') return;
    const theme = MUSIC_THEMES[this.currentTheme] || MUSIC_THEMES.crypts;
    const stepDur = 60 / theme.bpm / 4;

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this._playMusicStep(theme, this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step += 1;
      if (this.step >= 128) {
        this.step = 0;
        this.cycle += 1;
      }
    }
  }

  _playMusicStep(theme, step, time, stepDur) {
    const bar = Math.floor(step / 16); // 0..7
    const s16 = step % 16;
    const chord = theme.chords[bar];
    const barDur = stepDur * 16;

    // 1. Lush Sustained Dungeon Chord Pad (triggers cleanly on beat 1 of each bar!)
    if (s16 === 0 && chord && chord.pad) {
      for (const noteName of chord.pad) {
        const freq = NOTE_FREQ[noteName];
        if (!freq) continue;
        this._padVoice(freq, time, barDur * 0.96, 0.085);
      }
    }

    // 2. Warm Bassline following each bar's chord root (+ octave bounce on odd cycles)
    if (theme.bassRhythm[s16] && chord && NOTE_FREQ[chord.bass]) {
      const octShift = (this.cycle % 2 === 1 && s16 === 6) ? 2 : 1;
      this._musicNote({
        freq: NOTE_FREQ[chord.bass] * octShift,
        type: 'triangle',
        time,
        dur: stepDur * 2.1,
        gain: 0.34,
        filterStart: 520,
        filterEnd: 170,
      });
    }

    // 3. Tasteful Sparse Arpeggio Accent (only on bars 2-3 & 6-7, never constant 16th spam!)
    if ((bar === 2 || bar === 3 || bar === 6 || bar === 7) && s16 % 4 === 2 && chord && chord.pad) {
      const idx = Math.floor(s16 / 4) % chord.pad.length;
      const arpFreq = NOTE_FREQ[chord.pad[idx]];
      if (arpFreq) {
        this._musicNote({
          freq: arpFreq * 2,
          type: 'sine',
          time,
          dur: stepDur * 1.8,
          gain: 0.08,
          filterStart: 2600,
          filterEnd: 900,
        });
      }
    }

    // 4. Evolving 8-Bar Expressive Lead Melody (alternates octave/timbre subtly every 8-bar cycle!)
    const leadNote = theme.melody[step];
    if (leadNote && NOTE_FREQ[leadNote]) {
      const freq = NOTE_FREQ[leadNote];
      // On alternate cycles, drop into an atmospheric chill breakdown on bars 0-1 (pads + bass breathe!)
      const isBreakdown = this.cycle % 2 === 1 && bar < 2 && this.currentTheme !== 'boss';
      if (!isBreakdown) {
        const vel = s16 % 4 === 0 ? 1.0 : 0.84;
        if (theme.leadVoice === 'bell') {
          this._musicNote({ freq, type: 'triangle', time, dur: stepDur * 2.8, gain: 0.19 * vel, filterStart: 4200, filterEnd: 1100 });
          this._musicNote({ freq: freq * 2, type: 'sine', time, dur: stepDur * 1.4, gain: 0.05 * vel, filterStart: 4800, filterEnd: 1800 });
        } else if (theme.leadVoice === 'harpsichord') {
          this._musicNote({ freq, type: 'sawtooth', time, dur: stepDur * 2.1, gain: 0.14 * vel, filterStart: 3200, filterEnd: 560 });
          this._musicNote({ freq: freq * 0.5, type: 'triangle', time, dur: stepDur * 2.4, gain: 0.07 * vel, filterStart: 1200, filterEnd: 400 });
        } else {
          this._musicNote({ freq, type: 'sawtooth', time, dur: stepDur * 2.2, gain: 0.15 * vel, filterStart: 2600, filterEnd: 820 });
        }
      }
    }

    // 5. Dynamic Percussion (with turnaround fill on bar 7!)
    const isFill = bar === 7 && s16 >= 12;
    if (theme.kick[s16]) this._drumKick(time);
    if (theme.snare[s16] || (isFill && (s16 === 13 || s16 === 15))) this._drumSnare(time, isFill ? 0.11 : 0.14);
    if (theme.hat[s16] && !(this.cycle % 2 === 1 && bar === 0)) this._drumHat(time);
    if (theme.anvil && theme.anvil[s16] && bar % 2 === 1) this._drumAnvil(time);
  }

  _padVoice(freq, time, dur, gain) {
    const osc = this.ctx.createOscillator();
    const flt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(860, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gain, time + Math.min(0.28, dur * 0.25));
    g.gain.setValueAtTime(gain * 0.85, time + dur * 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(flt);
    flt.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + dur + 0.04);
  }

  _musicNote({ freq, type, time, dur, gain, filterStart, filterEnd }) {
    const osc = this.ctx.createOscillator();
    const flt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(filterStart, time);
    flt.frequency.exponentialRampToValueAtTime(Math.max(80, filterEnd), time + dur);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(flt);
    flt.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  _drumKick(time) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(138, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    g.gain.setValueAtTime(0.32, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    osc.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  _drumSnare(time, vol = 0.14) {
    const len = Math.floor(this.ctx.sampleRate * 0.08);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1850, time);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.musicBus);
    src.start(time);
  }

  _drumHat(time) {
    const len = Math.floor(this.ctx.sampleRate * 0.024);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(7400, time);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.045, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.024);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    src.start(time);
  }

  _drumAnvil(time) {
    this._musicNote({ freq: 880, type: 'triangle', time, dur: 0.16, gain: 0.06, filterStart: 3600, filterEnd: 900 });
    this._musicNote({ freq: 1385, type: 'sine', time, dur: 0.13, gain: 0.045, filterStart: 4200, filterEnd: 1200 });
  }

  // ======================================================
  // BALANCED, THROTTLED LAYERED SFX (Never Drowns Music!)
  // ======================================================
  _canSfx(tag = null, minGapMs = 0) {
    if (this.mode === 'mute') return false;
    if (tag && minGapMs > 0) {
      const now = performance.now();
      const prev = this.sfxLastTs.get(tag) || 0;
      if (now - prev < minGapMs) return false;
      this.sfxLastTs.set(tag, now);
    }
    this.init();
    return !!this.ctx;
  }

  _jitter(val, pct = 0.06) {
    return val * (1 + (Math.random() * 2 - 1) * pct);
  }

  _tone({ type = 'square', freq = 440, freqEnd = null, duration = 0.1, gain = 0.09, delay = 0, echo = false }) {
    if (this.mode === 'mute') return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(24, freqEnd), now + duration);
    }
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(g);
    g.connect(this.sfxBus);
    if (echo && this.echoBus) g.connect(this.echoBus);
    osc.start(now);
    osc.stop(now + duration + 0.015);
  }

  _noise({ duration = 0.12, gain = 0.09, filterFreq = 1200, filterType = 'bandpass', delay = 0, echo = false }) {
    if (this.mode === 'mute') return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const sampleCount = Math.max(64, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;

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
    g.connect(this.sfxBus);
    if (echo && this.echoBus) g.connect(this.echoBus);
    src.start(now);
  }

  shoot(heavy = false, weaponId = 'recurve') {
    if (!this._canSfx('shoot', 70)) return;
    if (weaponId === 'dragoncannon') {
      this._tone({ type: 'sine', freq: this._jitter(155), freqEnd: 44, duration: 0.15, gain: 0.16 });
      this._noise({ duration: 0.1, gain: 0.1, filterFreq: 680, filterType: 'lowpass' });
      return;
    }
    if (weaponId === 'arbalest') {
      this._tone({ type: 'triangle', freq: this._jitter(520), freqEnd: 210, duration: 0.05, gain: 0.07 });
      this._noise({ duration: 0.04, gain: 0.05, filterFreq: 3200 });
      return;
    }
    if (weaponId === 'frostfang') {
      this._tone({ type: 'triangle', freq: this._jitter(heavy ? 880 : 740), freqEnd: 340, duration: 0.09, gain: 0.08 });
      this._tone({ type: 'sine', freq: this._jitter(1420), freqEnd: 960, duration: 0.07, gain: 0.045 });
      return;
    }
    if (weaponId === 'greatbow') {
      this._tone({ type: 'triangle', freq: this._jitter(250), freqEnd: 82, duration: 0.14, gain: 0.13 });
      this._noise({ duration: 0.08, gain: 0.07, filterFreq: 1800 });
      return;
    }
    if (weaponId === 'astraltwin' || weaponId === 'soulweaver') {
      this._tone({ type: 'sine', freq: this._jitter(heavy ? 840 : 660), freqEnd: 290, duration: 0.09, gain: 0.08 });
      return;
    }
    if (weaponId === 'chakram') {
      this._tone({ type: 'triangle', freq: this._jitter(600), freqEnd: 840, duration: 0.075, gain: 0.07 });
      return;
    }

    if (heavy) {
      this._tone({ type: 'triangle', freq: this._jitter(540), freqEnd: 155, duration: 0.12, gain: 0.11 });
      this._noise({ duration: 0.07, gain: 0.06, filterFreq: 2400 });
    } else {
      this._tone({ type: 'triangle', freq: this._jitter(400), freqEnd: 170, duration: 0.065, gain: 0.07 });
    }
  }

  ignite() {
    if (!this._canSfx('ignite', 160)) return;
    this._noise({ duration: 0.13, gain: 0.08, filterFreq: 950, filterType: 'lowpass' });
    this._tone({ type: 'triangle', freq: 260, freqEnd: 620, duration: 0.1, gain: 0.05 });
  }

  hit(crit = false) {
    if (!this._canSfx(crit ? 'crit' : 'hit', crit ? 85 : 80)) return;
    if (crit) {
      this._tone({ type: 'triangle', freq: this._jitter(820), freqEnd: 1240, duration: 0.07, gain: 0.085 });
      this._tone({ type: 'sine', freq: 210, freqEnd: 85, duration: 0.08, gain: 0.09 });
    } else {
      this._tone({ type: 'triangle', freq: this._jitter(190), freqEnd: 82, duration: 0.045, gain: 0.05 });
    }
  }

  armorBreak() {
    if (!this._canSfx('armor', 150)) return;
    this._noise({ duration: 0.18, gain: 0.13, filterFreq: 2200, echo: true });
    this._tone({ type: 'sawtooth', freq: 620, freqEnd: 150, duration: 0.16, gain: 0.1 });
  }

  frostNova() {
    if (!this._canSfx('frost', 140)) return;
    this._noise({ duration: 0.18, gain: 0.09, filterFreq: 3400, filterType: 'highpass', echo: true });
    this._tone({ type: 'sine', freq: 1320, freqEnd: 660, duration: 0.18, gain: 0.08, echo: true });
  }

  kill() {
    if (!this._canSfx('kill', 90)) return;
    this._noise({ duration: 0.07, gain: 0.055, filterFreq: 900 });
    this._tone({ type: 'triangle', freq: this._jitter(265), freqEnd: 95, duration: 0.075, gain: 0.06 });
  }

  explode() {
    if (!this._canSfx('explode', 150)) return;
    this._noise({ duration: 0.24, gain: 0.14, filterFreq: 440, filterType: 'lowpass' });
    this._tone({ type: 'sine', freq: 125, freqEnd: 36, duration: 0.22, gain: 0.14 });
  }

  playerHurt() {
    if (!this._canSfx('hurt', 180)) return;
    this._tone({ type: 'sawtooth', freq: 175, freqEnd: 55, duration: 0.18, gain: 0.14 });
    this._noise({ duration: 0.13, gain: 0.1, filterFreq: 620 });
  }

  dash() {
    if (!this._canSfx('dash', 100)) return;
    this._noise({ duration: 0.11, gain: 0.08, filterFreq: 1900 });
    this._tone({ type: 'sine', freq: 330, freqEnd: 700, duration: 0.09, gain: 0.07 });
  }

  volley() {
    if (!this._canSfx('volley', 180)) return;
    for (let i = 0; i < 3; i++) {
      this._tone({ type: 'triangle', freq: 440 + i * 95, freqEnd: 200, duration: 0.08, gain: 0.075, delay: i * 0.045, echo: true });
    }
  }

  snare() {
    if (!this._canSfx('snare', 150)) return;
    this._tone({ type: 'triangle', freq: 580, freqEnd: 290, duration: 0.14, gain: 0.09, echo: true });
    this._tone({ type: 'sine', freq: 880, freqEnd: 440, duration: 0.16, gain: 0.07, delay: 0.05 });
  }

  pickup(isGold = false) {
    if (!this._canSfx('pickup', 70)) return;
    const now = performance.now();
    if (now - this.lastPickupTs < 650) {
      this.pickupStreak = Math.min(PENTATONIC_PICKUP.length - 1, this.pickupStreak + 1);
    } else {
      this.pickupStreak = 0;
    }
    this.lastPickupTs = now;

    const base = PENTATONIC_PICKUP[this.pickupStreak];
    if (isGold) {
      this._tone({ type: 'triangle', freq: base * 1.25, freqEnd: base * 1.5, duration: 0.06, gain: 0.055 });
    } else {
      this._tone({ type: 'sine', freq: base, freqEnd: base * 1.25, duration: 0.055, gain: 0.05 });
    }
  }

  levelUp() {
    [440, 554.37, 659.25, 880, 1108.73].forEach((n, idx) => {
      this._tone({ type: 'triangle', freq: n, duration: 0.14, gain: 0.1, delay: idx * 0.065, echo: true });
    });
  }

  bossRoar() {
    this._tone({ type: 'sawtooth', freq: 112, freqEnd: 42, duration: 0.52, gain: 0.16, echo: true });
    this._noise({ duration: 0.4, gain: 0.12, filterFreq: 340, filterType: 'lowpass', echo: true });
  }

  doorOpen() {
    this._tone({ type: 'triangle', freq: 240, freqEnd: 360, duration: 0.16, gain: 0.085, echo: true });
    this._tone({ type: 'triangle', freq: 360, freqEnd: 520, duration: 0.18, gain: 0.085, delay: 0.09, echo: true });
  }

  gameOver() {
    [392, 349.23, 311.13, 261.63].forEach((n, idx) => {
      this._tone({ type: 'triangle', freq: n, freqEnd: n * 0.94, duration: 0.22, gain: 0.1, delay: idx * 0.14, echo: true });
    });
  }

  uiClick() {
    this._tone({ type: 'triangle', freq: 620, freqEnd: 480, duration: 0.04, gain: 0.055 });
  }

  reroll() {
    [340, 510, 680].forEach((f, idx) => {
      this._tone({ type: 'triangle', freq: f, freqEnd: f * 1.18, duration: 0.05, gain: 0.07, delay: idx * 0.04 });
    });
  }

  evolution() {
    [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((n, idx) => {
      this._tone({ type: 'triangle', freq: n, duration: 0.15, gain: 0.09, delay: idx * 0.055, echo: true });
    });
  }

  relicOpen() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
      this._tone({ type: 'triangle', freq: n, duration: 0.17, gain: 0.1, delay: idx * 0.065, echo: true });
    });
  }

  thunder() {
    if (!this._canSfx('thunder', 135)) return;
    this._noise({ duration: 0.18, gain: 0.11, filterFreq: 900, filterType: 'bandpass', echo: true });
    this._tone({ type: 'triangle', freq: 205, freqEnd: 55, duration: 0.15, gain: 0.09, echo: true });
  }
}

export const sfx = new SoundEngine();
