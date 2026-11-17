// All sound is synthesized live with the Web Audio API: no audio files.
// Every effect is a short oscillator burst with an envelope, so the game
// stays silent in headless runs (no AudioContext) without crashing.

export function createAudio() {
  const sfx = {
    muted: false,
    ctx: null,
    master: null,

    ensure() {
      if (this.ctx) return true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
        return true;
      } catch (e) {
        return false;
      }
    },

    // One blip: oscillator type, start/end frequency, seconds, volume.
    blip(type, f0, f1, secs, vol) {
      if (this.muted || !this.ensure()) return;
      try {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(Math.max(20, f0), t);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + secs);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + secs);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + secs + 0.02);
      } catch (e) { /* sound is decoration, never fatal */ }
    },

    shoot(kind) {
      if (kind === 'cannon') this.blip('sine', 220, 60, 0.16, 0.5);
      else if (kind === 'spark') this.blip('sawtooth', 900, 300, 0.07, 0.16);
      else if (kind === 'longbow') this.blip('triangle', 700, 180, 0.09, 0.3);
      else if (kind === 'frost') this.blip('sine', 1200, 900, 0.08, 0.14);
      else this.blip('square', 660, 440, 0.05, 0.12);
    },

    hit() { this.blip('triangle', 300, 140, 0.05, 0.1); },
    coin() { this.blip('sine', 880, 1320, 0.09, 0.16); },
    leak() { this.blip('sawtooth', 160, 60, 0.35, 0.4); },
    place() { this.blip('triangle', 330, 520, 0.1, 0.25); },
    upgrade() { this.blip('sine', 520, 1040, 0.16, 0.25); },
    sell() { this.blip('sine', 520, 260, 0.12, 0.2); },
    wave() { this.blip('square', 220, 440, 0.18, 0.2); },
    click() { this.blip('sine', 700, 700, 0.04, 0.14); },
    denied() { this.blip('square', 180, 120, 0.12, 0.2); },
    boss() { this.blip('sawtooth', 90, 45, 0.7, 0.5); },
    freeze() { this.blip('sine', 1400, 500, 0.3, 0.2); },

    win() {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => this.blip('triangle', f, f, 0.22, 0.25), i * 110);
      });
    },

    lose() {
      [392, 330, 262, 196].forEach((f, i) => {
        setTimeout(() => this.blip('triangle', f, f * 0.9, 0.25, 0.22), i * 140);
      });
    },
  };
  return sfx;
}
