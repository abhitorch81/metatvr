// Tiny WebAudio synth - no assets needed.
export class Audio {
  constructor() { this.ctx = null; this.muted = false; }
  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* no audio */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq, dur = 0.15, type = 'sine', vol = 0.12, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // Sonification: a continuous tone whose pitch tracks the quantity you are exploring
  // (height, closeness to the answer...) so the maths can be heard as well as seen.
  setTone(freq, vol = 0.035) {
    if (!this.ctx || this.muted) return;
    if (!this.osc) {
      this.osc = this.ctx.createOscillator(); this.og = this.ctx.createGain();
      this.osc.type = 'sine'; this.og.gain.value = 0;
      this.osc.connect(this.og).connect(this.ctx.destination); this.osc.start();
    }
    const t = this.ctx.currentTime;
    this.osc.frequency.setTargetAtTime(freq, t, 0.05); this.og.gain.setTargetAtTime(vol, t, 0.05);
  }
  stopTone() { if (this.og) this.og.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); }
  grab() { this.tone(520, 0.08, 'triangle'); }
  drop() { this.tone(330, 0.1, 'triangle'); }
  tick() { this.tone(880, 0.04, 'square', 0.04); }
  fail() { this.tone(180, 0.25, 'sawtooth', 0.08); this.tone(140, 0.3, 'sawtooth', 0.08, 0.12); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'sine', 0.14, i * 0.09)); }
}
