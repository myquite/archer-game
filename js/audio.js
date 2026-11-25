// ARCHER — 16-Bit Adaptive Soundtrack & Layered Web Audio SFX Engine
// Pure zero-asset Web Audio synthesizer with:
// - 5 Chapter Biome Themes + High-Intensity Boss Theme (lookahead scheduled)
// - Smooth modal ducking/lowpass filtering + iOS Safari unlock & visibility pause
// - Subtle dungeon echo bus + master dynamics compressor (clip-free on iPhone speakers)
// - Distinct per-weapon fire signatures, pentatonic XP/Gold pickup streaks & 3-state audio mode

const NOTE_FREQ = {
  C2: 65.41, Cs2: 69.30, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, Fs2: 92.50, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, Cs3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Cs4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Cs5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760.00,
};

// 5 Biome Dungeon Themes + High-Intensity Boss Rush Theme (16th-note step patterns)
const MUSIC_THEMES = {
  crypts: {
    bpm: 118,
    leadVoice: 'harpsichord',
    bass: ['D2', null, null, null, 'D2', null, 'A2', null, 'Bb2', null, null, null, 'C3', null, 'A2', null,
           'D2', null, null, null, 'F2', null, 'G2', null, 'A2', null, 'G2', null, 'F2', null, 'E2', null],
    lead: ['D4', null, 'F4', null, 'A4', null, 'D5', null, 'C5', null, 'Bb4', null, 'A4', null, 'G4', 'A4',
           'F4', null, 'A4', null, 'C5', null, 'Bb4', null, 'A4', null, 'G4', null, 'F4', 'E4', 'D4', null],
    arp:  ['A3', 'D4', 'F4', 'A4', 'A3', 'D4', 'F4', 'A4', 'Bb3', 'D4', 'F4', 'Bb4', 'A3', 'Cs4', 'E4', 'A4',
           'A3', 'D4', 'F4', 'A4', 'C4', 'F4', 'A4', 'C5', 'G3', 'Bb3', 'D4', 'G4', 'A3', 'Cs4', 'E4', 'A4'],
    kick: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
  },
  catacombs: {
    bpm: 112,
    leadVoice: 'bell',
    bass: ['E2', null, null, 'E2', null, null, 'F2', null, 'E2', null, null, 'B2', 'G2', null, 'F2', null,
           'E2', null, null, 'E2', 'G2', null, 'A2', null, 'B2', null, 'A2', null, 'G2', null, 'F2', null],
    lead: ['E4', null, 'F4', null, 'G4', null, 'B4', null, 'A4', null, null, 'G4', 'F4', null, 'E4', null,
           'B4', null, 'C5', null, 'B4', null, 'G4', null, 'F4', null, 'G4', null, 'E4', null, null, null],
    arp:  ['E4', null, 'B4', null, 'F4', null, 'C5', null, 'E4', null, 'G4', null, 'B4', null, 'F4', null,
           'E4', null, 'G4', null, 'A4', null, 'B4', null, 'G4', null, 'F4', null, 'E4', null, 'B3', null],
    kick: [1,0,0,1, 0,0,1,0, 0,0,1,0, 0,1,0,0],
    snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:  [1,0,0,1, 1,0,1,0, 1,0,0,1, 1,0,1,0],
  },
  foundry: {
    bpm: 132,
    leadVoice: 'synth',
    bass: ['C2', 'C2', null, 'C2', 'Eb2', null, 'F2', null, 'G2', 'G2', null, 'F2', 'Eb2', null, 'D2', null,
           'C2', 'C2', null, 'C2', 'Ab2', null, 'G2', null, 'F2', null, 'Eb2', null, 'G2', null, 'B2', null],
    lead: ['C4', null, 'Eb4', 'F4', 'G4', null, 'C5', null, 'Bb4', null, 'G4', null, 'F4', 'Eb4', 'D4', null,
           'C4', null, 'G4', null, 'Ab4', null, 'G4', 'F4', 'Eb4', null, 'D4', null, 'C4', null, null, null],
    arp:  ['C3', 'G3', 'C4', 'G3', 'Eb3', 'Bb3', 'Eb4', 'Bb3', 'G3', 'D4', 'G4', 'D4', 'F3', 'C4', 'F4', 'C4',
           'C3', 'G3', 'C4', 'G3', 'Ab3', 'Eb4', 'Ab4', 'Eb4', 'G3', 'D4', 'G4', 'B4', 'G3', 'B3', 'D4', 'G4'],
    kick: [1,0,1,0, 0,0,1,0, 1,0,1,0, 0,1,0,0],
    snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    hat:  [1,1,1,0, 1,1,1,0, 1,1,1,0, 1,1,1,1],
    anvil:[0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
  },
  citadel: {
    bpm: 120,
    leadVoice: 'bell',
    bass: ['A2', null, null, null, 'E2', null, null, null, 'F2', null, null, null, 'G2', null, 'E2', null,
           'A2', null, null, null, 'C3', null, null, null, 'D3', null, 'C3', null, 'B2', null, 'E2', null],
    lead: ['A5', null, 'E5', null, 'C5', null, 'B4', 'C5', 'A4', null, 'C5', null, 'E5', null, 'G5', null,
           'A5', null, 'G5', null, 'E5', null, 'D5', null, 'C5', null, 'B4', null, 'A4', null, null, null],
    arp:  ['A4', 'C5', 'E5', 'A5', 'E4', 'B4', 'E5', 'G5', 'F4', 'A4', 'C5', 'F5', 'G4', 'B4', 'D5', 'G5',
           'A4', 'C5', 'E5', 'A5', 'C5', 'E5', 'G5', 'C6', 'D5', 'F5', 'A5', 'D6', 'E4', 'Ab4', 'B4', 'E5'],
    kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
    snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1],
  },
  abyss: {
    bpm: 140,
    leadVoice: 'synth',
    bass: ['Fs2', 'Fs2', 'A2', 'Fs2', 'B2', 'Fs2', 'Cs3', 'B2', 'D2', 'D2', 'Fs2', 'D2', 'Cs2', 'Cs2', 'E2', 'Cs2',
           'Fs2', 'Fs2', 'A2', 'Fs2', 'D3', 'Cs3', 'B2', 'A2', 'G2', 'G2', 'B2', 'G2', 'Cs3', 'Cs3', 'Fs2', null],
    lead: ['Fs4', null, 'A4', 'B4', 'Cs5', null, 'Fs5', null, 'E5', 'D5', 'Cs5', null, 'B4', null, 'Cs5', null,
           'Fs5', null, 'E5', 'D5', 'Cs5', null, 'B4', 'A4', 'G4', null, 'B4', null, 'Cs5', null, 'Fs4', null],
    arp:  ['Fs4', 'A4', 'Cs5', 'Fs5', 'B4', 'D5', 'Fs5', 'B5', 'D4', 'Fs4', 'A4', 'D5', 'Cs4', 'E4', 'Ab4', 'Cs5',
           'Fs4', 'A4', 'Cs5', 'Fs5', 'D5', 'Fs5', 'A5', 'D6', 'G4', 'B4', 'D5', 'G5', 'Cs5', 'E5', 'Ab5', 'Cs5'],
    kick: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
    snare:[0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,1],
    hat:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
  },
  boss: {
    bpm: 148,
    leadVoice: 'synth',
    bass: ['D2', 'D2', 'D3', 'D2', 'D2', 'D2', 'F2', 'G2', 'Ab2', 'Ab2', 'G2', 'F2', 'E2', 'E2', 'A2', 'G2',
           'D2', 'D2', 'D3', 'D2', 'Bb2', 'Bb2', 'A2', 'G2', 'F2', 'F2', 'E2', 'D2', 'A2', 'A2', 'Cs3', 'A2'],
    lead: ['D5', null, 'D5', 'F5', 'E5', null, 'D5', 'C5', 'Bb4', null, 'A4', 'G4', 'A4', null, null, null,
           'D5', null, 'F5', 'G5', 'Ab5', null, 'G5', 'F5', 'E5', 'D5', 'Cs5', 'E5', 'D5', null, null, null],
    arp:  ['D4', 'F4', 'A4', 'D5', 'D4', 'F4', 'A4', 'D5', 'Bb3', 'D4', 'F4', 'Bb4', 'A3', 'Cs4', 'E4', 'A4',
           'D4', 'F4', 'A4', 'D5', 'G4', 'Bb4', 'D5', 'G5', 'F4', 'A4', 'D5', 'F5', 'A4', 'Cs5', 'E5', 'A5'],
    kick: [1,0,1,0, 1,0,0,1, 1,0,1,0, 1,0,1,0],
    snare:[0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,1],
    hat:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    anvil:[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
  },
};

const PENTATONIC_PICKUP = [587.33, 698.46, 783.99, 880.00, 1046.50, 1174.66, 1396.91];

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.mode = this._loadMode(); // 'all' | 'sfx' | 'mute'

    // Master buses
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.musicFilter = null;
    this.echoBus = null;

    // Adaptive Music Sequencer state
    this.currentTheme = 'crypts';
    this.musicPlaying = false;
    this.ducked = true;
    this.step = 0;
    this.nextNoteTime = 0;
    this.schedulerId = null;

    // Pickup pitch streak state
    this.pickupStreak = 0;
    this.lastPickupTs = 0;

    // Reliable iOS Safari AudioContext unlock on first touch/pointer gesture
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

    // Cleanly pause/resume on iPhone lock screen or tab switch
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.ctx.suspend().catch(() => {});
      } else if (this.mode !== 'mute') {
        this.ctx.resume().catch(() => {});
      }
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
    try {
      localStorage.setItem('archer_audio_mode', this.mode);
    } catch (_) {}
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
    if (this.mode === 'all') {
      this.startMusic(this.currentTheme);
    } else {
      this.stopMusic();
    }
    if (this.mode !== 'mute') this.uiClick();
    return this.mode;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Dynamics Compressor (prevents iPhone speaker clipping!)
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.14;
      comp.connect(this.ctx.destination);
      this.master = comp;

      // Subtle Dungeon Stone-Hall Echo Send
      const delay = this.ctx.createDelay(0.5);
      delay.delayTime.value = 0.21;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.24;
      const echoLP = this.ctx.createBiquadFilter();
      echoLP.type = 'lowpass';
      echoLP.frequency.value = 2100;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.22;

      delay.connect(echoLP);
      echoLP.connect(fb);
      fb.connect(delay);
      echoLP.connect(wet);
      wet.connect(this.master);
      this.echoBus = delay;

      // SFX Bus
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.85;
      this.sfxBus.connect(this.master);

      // Music Bus (with smooth modal ducking filter!)
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = this.ducked ? 950 : 6200;

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.ducked ? 0.16 : 0.36;
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
    const sfxVol = this.mode === 'mute' ? 0 : 0.85;
    const musVol = this.mode === 'all' ? (this.ducked ? 0.15 : 0.34) : 0;
    const cutoff = this.ducked ? 920 : 6400;
    this.sfxBus.gain.setTargetAtTime(sfxVol, now, 0.04);
    this.musicBus.gain.setTargetAtTime(musVol, now, 0.08);
    this.musicFilter.frequency.setTargetAtTime(cutoff, now, 0.1);
  }

  setMusicTheme(themeKey) {
    if (!MUSIC_THEMES[themeKey]) themeKey = 'crypts';
    if (this.currentTheme === themeKey && this.musicPlaying) return;
    this.currentTheme = themeKey;
    if (this.mode === 'all' && this.ctx) {
      this.startMusic(themeKey);
    }
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
    if (!this.ctx) return;

    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.step = 0;
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
    const stepDur = 60 / theme.bpm / 4; // 16th-note duration

    while (this.nextNoteTime < this.ctx.currentTime + 0.14) {
      this._playMusicStep(theme, this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 32;
    }
  }

  _playMusicStep(theme, step, time, stepDur) {
    const s16 = step % 16;

    // 1. Sub / Synth Bass
    const bassNote = theme.bass[step];
    if (bassNote && NOTE_FREQ[bassNote]) {
      this._musicNote({
        freq: NOTE_FREQ[bassNote],
        type: 'triangle',
        time,
        dur: stepDur * 1.9,
        gain: 0.34,
        filterStart: 480,
        filterEnd: 160,
      });
    }

    // 2. Arpeggio Harmony Layer
    const arpNote = theme.arp[step];
    if (arpNote && NOTE_FREQ[arpNote]) {
      this._musicNote({
        freq: NOTE_FREQ[arpNote],
        type: theme.leadVoice === 'bell' ? 'sine' : 'triangle',
        time,
        dur: stepDur * 0.85,
        gain: 0.11,
        filterStart: 2200,
        filterEnd: 700,
      });
    }

    // 3. Lead Melody Voice
    const leadNote = theme.lead[step];
    if (leadNote && NOTE_FREQ[leadNote]) {
      const freq = NOTE_FREQ[leadNote];
      if (theme.leadVoice === 'bell') {
        this._musicNote({ freq, type: 'triangle', time, dur: stepDur * 2.2, gain: 0.19, filterStart: 4200, filterEnd: 1200 });
        this._musicNote({ freq: freq * 2, type: 'sine', time, dur: stepDur * 1.2, gain: 0.06, filterStart: 5000, filterEnd: 2000 });
      } else if (theme.leadVoice === 'harpsichord') {
        this._musicNote({ freq, type: 'sawtooth', time, dur: stepDur * 1.5, gain: 0.14, filterStart: 3600, filterEnd: 620 });
      } else {
        this._musicNote({ freq, type: 'sawtooth', time, dur: stepDur * 1.7, gain: 0.15, filterStart: 2800, filterEnd: 900 });
      }
    }

    // 4. 16-Bit Percussion (softer when ducked)
    if (theme.kick[s16]) this._drumKick(time);
    if (theme.snare[s16]) this._drumSnare(time);
    if (theme.hat[s16]) this._drumHat(time);
    if (theme.anvil && theme.anvil[s16]) this._drumAnvil(time);
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
    g.gain.linearRampToValueAtTime(gain, time + 0.008);
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
    osc.frequency.setValueAtTime(142, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    g.gain.setValueAtTime(0.36, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    osc.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  _drumSnare(time) {
    const len = Math.floor(this.ctx.sampleRate * 0.085);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1900, time);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.085);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.musicBus);
    src.start(time);
  }

  _drumHat(time) {
    const len = Math.floor(this.ctx.sampleRate * 0.028);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(7200, time);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    src.start(time);
  }

  _drumAnvil(time) {
    this._musicNote({ freq: 880, type: 'square', time, dur: 0.18, gain: 0.08, filterStart: 4200, filterEnd: 900 });
    this._musicNote({ freq: 1385, type: 'triangle', time, dur: 0.14, gain: 0.06, filterStart: 5000, filterEnd: 1200 });
  }

  // ======================================================
  // LAYERED 16-BIT SFX ENGINE
  // ======================================================
  _canSfx() {
    if (this.mode === 'mute') return false;
    this.init();
    return !!this.ctx;
  }

  _jitter(val, pct = 0.06) {
    return val * (1 + (Math.random() * 2 - 1) * pct);
  }

  _tone({ type = 'square', freq = 440, freqEnd = null, duration = 0.1, gain = 0.12, delay = 0, echo = false }) {
    if (!this._canSfx()) return;
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

  _noise({ duration = 0.12, gain = 0.12, filterFreq = 1200, filterType = 'bandpass', delay = 0, echo = false }) {
    if (!this._canSfx()) return;
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

  // Distinct per-weapon firing signatures!
  shoot(heavy = false, weaponId = 'recurve') {
    if (weaponId === 'dragoncannon') {
      this._tone({ type: 'sine', freq: this._jitter(165), freqEnd: 42, duration: 0.18, gain: 0.24, echo: true });
      this._noise({ duration: 0.14, gain: 0.16, filterFreq: 680, filterType: 'lowpass', echo: true });
      return;
    }
    if (weaponId === 'arbalest') {
      this._tone({ type: 'square', freq: this._jitter(540), freqEnd: 210, duration: 0.055, gain: 0.09 });
      this._noise({ duration: 0.045, gain: 0.08, filterFreq: 3400 });
      return;
    }
    if (weaponId === 'frostfang') {
      this._tone({ type: 'triangle', freq: this._jitter(heavy ? 920 : 760), freqEnd: 320, duration: 0.11, gain: 0.11, echo: true });
      this._tone({ type: 'sine', freq: this._jitter(1480), freqEnd: 980, duration: 0.08, gain: 0.06, echo: true });
      return;
    }
    if (weaponId === 'greatbow') {
      this._tone({ type: 'sawtooth', freq: this._jitter(260), freqEnd: 78, duration: 0.17, gain: 0.16, echo: true });
      this._noise({ duration: 0.1, gain: 0.11, filterFreq: 1900 });
      return;
    }
    if (weaponId === 'astraltwin' || weaponId === 'soulweaver') {
      this._tone({ type: 'sine', freq: this._jitter(heavy ? 880 : 680), freqEnd: 290, duration: 0.11, gain: 0.11, echo: true });
      this._tone({ type: 'triangle', freq: this._jitter(1240), freqEnd: 540, duration: 0.08, gain: 0.07, delay: 0.015 });
      return;
    }
    if (weaponId === 'chakram') {
      this._tone({ type: 'triangle', freq: this._jitter(620), freqEnd: 880, duration: 0.09, gain: 0.1 });
      this._noise({ duration: 0.06, gain: 0.07, filterFreq: 3800 });
      return;
    }

    // Default Shadow Recurve twang
    if (heavy) {
      this._tone({ type: 'triangle', freq: this._jitter(560), freqEnd: 150, duration: 0.14, gain: 0.16, echo: true });
      this._noise({ duration: 0.09, gain: 0.1, filterFreq: 2500 });
    } else {
      this._tone({ type: 'triangle', freq: this._jitter(410), freqEnd: 165, duration: 0.075, gain: 0.1 });
      this._noise({ duration: 0.04, gain: 0.06, filterFreq: 3000 });
    }
  }

  ignite() {
    this._noise({ duration: 0.18, gain: 0.13, filterFreq: 950, filterType: 'lowpass', echo: true });
    this._tone({ type: 'sawtooth', freq: 240, freqEnd: 680, duration: 0.12, gain: 0.07 });
  }

  hit(crit = false) {
    if (crit) {
      this._tone({ type: 'square', freq: this._jitter(780), freqEnd: 1260, duration: 0.08, gain: 0.11, echo: true });
      this._tone({ type: 'triangle', freq: 220, freqEnd: 78, duration: 0.1, gain: 0.14 });
    } else {
      this._tone({ type: 'square', freq: this._jitter(185), freqEnd: 72, duration: 0.055, gain: 0.08 });
    }
  }

  armorBreak() {
    this._noise({ duration: 0.22, gain: 0.18, filterFreq: 2400, echo: true });
    this._tone({ type: 'sawtooth', freq: 640, freqEnd: 140, duration: 0.2, gain: 0.14, echo: true });
    this._tone({ type: 'square', freq: 980, freqEnd: 420, duration: 0.14, gain: 0.09, delay: 0.04 });
  }

  frostNova() {
    this._noise({ duration: 0.24, gain: 0.14, filterFreq: 3600, filterType: 'highpass', echo: true });
    this._tone({ type: 'sine', freq: 1320, freqEnd: 660, duration: 0.22, gain: 0.11, echo: true });
    this._tone({ type: 'triangle', freq: 1760, freqEnd: 880, duration: 0.18, gain: 0.08, delay: 0.03, echo: true });
  }

  kill() {
    this._noise({ duration: 0.09, gain: 0.09, filterFreq: 860 });
    this._tone({ type: 'square', freq: this._jitter(265), freqEnd: 92, duration: 0.09, gain: 0.085 });
  }

  explode() {
    this._noise({ duration: 0.36, gain: 0.22, filterFreq: 420, filterType: 'lowpass', echo: true });
    this._tone({ type: 'sawtooth', freq: 135, freqEnd: 32, duration: 0.32, gain: 0.19, echo: true });
  }

  playerHurt() {
    this._tone({ type: 'sawtooth', freq: 175, freqEnd: 52, duration: 0.22, gain: 0.19 });
    this._noise({ duration: 0.16, gain: 0.15, filterFreq: 620 });
  }

  dash() {
    this._noise({ duration: 0.14, gain: 0.12, filterFreq: 1900 });
    this._tone({ type: 'sine', freq: 330, freqEnd: 720, duration: 0.11, gain: 0.09, echo: true });
  }

  volley() {
    for (let i = 0; i < 4; i++) {
      this._tone({ type: 'triangle', freq: 440 + i * 85, freqEnd: 190, duration: 0.085, gain: 0.095, delay: i * 0.04, echo: true });
    }
  }

  snare() {
    this._tone({ type: 'square', freq: 580, freqEnd: 290, duration: 0.15, gain: 0.11, echo: true });
    this._tone({ type: 'triangle', freq: 880, freqEnd: 440, duration: 0.18, gain: 0.09, delay: 0.06, echo: true });
  }

  // Dopamine pentatonic climbing chime when sweeping up rapid coins & XP crystals!
  pickup(isGold = false) {
    const now = performance.now();
    if (now - this.lastPickupTs < 650) {
      this.pickupStreak = Math.min(PENTATONIC_PICKUP.length - 1, this.pickupStreak + 1);
    } else {
      this.pickupStreak = 0;
    }
    this.lastPickupTs = now;

    const base = PENTATONIC_PICKUP[this.pickupStreak];
    if (isGold) {
      this._tone({ type: 'square', freq: base * 1.25, freqEnd: base * 1.5, duration: 0.07, gain: 0.065, echo: true });
    } else {
      this._tone({ type: 'sine', freq: base, freqEnd: base * 1.25, duration: 0.065, gain: 0.06 });
    }
  }

  levelUp() {
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((n, idx) => {
      this._tone({ type: 'triangle', freq: n, duration: 0.14, gain: 0.11, delay: idx * 0.065, echo: true });
    });
  }

  bossRoar() {
    this._tone({ type: 'sawtooth', freq: 112, freqEnd: 40, duration: 0.6, gain: 0.22, echo: true });
    this._noise({ duration: 0.48, gain: 0.17, filterFreq: 340, filterType: 'lowpass', echo: true });
  }

  doorOpen() {
    this._tone({ type: 'triangle', freq: 240, freqEnd: 360, duration: 0.18, gain: 0.1, echo: true });
    this._tone({ type: 'triangle', freq: 360, freqEnd: 520, duration: 0.2, gain: 0.1, delay: 0.09, echo: true });
  }

  gameOver() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, idx) => {
      this._tone({ type: 'sawtooth', freq: n, freqEnd: n * 0.94, duration: 0.22, gain: 0.11, delay: idx * 0.14, echo: true });
    });
  }

  uiClick() {
    this._tone({ type: 'square', freq: 620, freqEnd: 480, duration: 0.04, gain: 0.06 });
  }

  reroll() {
    [340, 510, 680].forEach((f, idx) => {
      this._tone({ type: 'triangle', freq: f, freqEnd: f * 1.18, duration: 0.055, gain: 0.08, delay: idx * 0.04 });
    });
  }

  evolution() {
    [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((n, idx) => {
      this._tone({ type: 'sawtooth', freq: n, duration: 0.15, gain: 0.09, delay: idx * 0.055, echo: true });
    });
  }

  relicOpen() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
      this._tone({ type: 'triangle', freq: n, duration: 0.17, gain: 0.12, delay: idx * 0.065, echo: true });
    });
  }

  thunder() {
    this._noise({ duration: 0.24, gain: 0.17, filterFreq: 900, filterType: 'bandpass', echo: true });
    this._tone({ type: 'sawtooth', freq: 215, freqEnd: 52, duration: 0.19, gain: 0.13, echo: true });
  }
}

export const sfx = new SoundEngine();
