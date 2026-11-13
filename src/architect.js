import { Level, Summit, Roll, Flux, INFO, WARN } from './levels.js';
import { architect, coachCloud, verifyBasin, verifySummit, verifyFlux } from './agent.js';

const TOPICS = [['basin', 'Gradient'], ['summit', 'Summit'], ['flux', 'Divergence']];
const DIFFS = [['easy', 'Easy'], ['normal', 'Normal'], ['trap', 'Trap!']];
const COACH_AFTER = 45; // seconds

const where = (x, y) => `${y > 0.5 ? 'the far' : y < -0.5 ? 'the near' : 'the middle'} ${x > 0.5 ? 'right' : x < -0.5 ? 'left' : 'centre'} of the board`;

// The in-game agent: pinch a topic + difficulty, then watch it design a level, test it with its own
// simulator, revise it, and hand it to you. A coach hint appears if you get stuck.
export class Architect extends Level {
  constructor(app) {
    super(app);
    this.topic = 'basin'; this.diff = 'normal'; this.inner = null; this.token = 0; this.log = [];
    this.menuUI();
  }

  clearBtns() { this.btns.forEach((b) => this.ui.removeButton(b)); this.btns = []; }

  menuUI() {
    this.token++; this.clearBtns(); this.disposeInner(); this.phase = 'menu'; this.solved = false;
    this.app.surfaceFn = null; this.app.audio.stopTone();
    this.ui.set({ badge: `${this.app.badgePrefix}AGENT`, title: 'Field Architect', hint: 'An AI designer that invents a brand new level for you, plays it with its own simulator to check it is fair, then hands it over. Pick a topic and a difficulty, then pinch Build.', status: '', color: INFO });
    this.chips = [];
    TOPICS.forEach(([k, label], i) => { const b = this.ui.addButton(label, (i - 1) * 0.28, -0.04, -0.78, () => { this.topic = k; this.paint(); }, 0.26, 0.065); b.key = k; b.row = 'topic'; this.btns.push(b); this.chips.push(b); });
    DIFFS.forEach(([k, label], i) => { const b = this.ui.addButton(label, (i - 1) * 0.28, -0.115, -0.78, () => { this.diff = k; this.paint(); }, 0.26, 0.065); b.key = k; b.row = 'diff'; this.btns.push(b); this.chips.push(b); });
    this.btns.push(this.ui.addButton('Build it  ▶', -0.15, -0.20, -0.78, () => this.build(), 0.3, 0.085));
    const n = this.app.meta.gallery.length;
    this.btns.push(this.ui.addButton(`Gallery (${n})`, 0.17, -0.20, -0.78, () => this.galleryUI(), 0.26, 0.085));
    const tier = (t) => '★'.repeat(this.app.masteryTier(t)) || '-';
    this.ui.setStatus(`Mastery  Gradient ${tier('basin')}  Summit ${tier('summit')}  Divergence ${tier('flux')}`, '#8dffb0');
    this.paint();
  }

  galleryUI() {
    this.clearBtns(); this.phase = 'gallery'; const g = this.app.meta.gallery;
    this.ui.set({ badge: `${this.app.badgePrefix}AGENT`, title: 'Your Gallery', hint: g.length ? 'Levels the Architect designed that you solved. Pinch one to play it again.' : 'Nothing here yet. Solve an Architect level and it is saved to your gallery.', status: '', color: INFO });
    g.slice(0, 6).forEach((e, i) => {
      const b = this.ui.addButton(`${e.title || e.topic} (${e.diff})`, ((i % 2) - 0.5) * 0.4, -0.04 - Math.floor(i / 2) * 0.08, -0.78, () => this.play({ spec: e.spec, info: this.reverify(e.spec), rounds: 1, title: e.title }, e), 0.38, 0.075);
      this.btns.push(b);
    });
    this.btns.push(this.ui.addButton('◀ Back', 0, -0.28, -0.78, () => this.menuUI(), 0.26, 0.07));
  }

  paint() { for (const b of this.chips) this.ui.setActive(b, b.row === 'topic' ? b.key === this.topic : b.key === this.diff); }

  async build() {
    if (this.phase !== 'menu') return;
    this.phase = 'think'; const my = ++this.token; this.log = [];
    this.clearBtns();
    const say = async (t) => { if (my !== this.token) return; this.log.push(t); this.ui.set({ badge: `${this.app.badgePrefix}AGENT`, title: 'Designing...', hint: this.log.slice(-3).join('  '), status: '', color: WARN }); };
    const out = await architect({ topic: this.topic, diff: this.diff, say, seed: (Date.now() % 100000) | 0 });
    if (my !== this.token) return; // user left meanwhile
    this.start(out, { topic: this.topic, diff: this.diff });
  }

  reverify(spec) { return spec.kind === 'basin' ? verifyBasin(spec) : spec.kind === 'summit' ? verifySummit(spec) : {}; }

  start(out, meta) { this.play(out, meta); }

  play({ spec, info, rounds, title }, meta) {
    this.cur = { spec, title, topic: meta.topic, diff: meta.diff };
    this.clearBtns(); this.phase = 'play'; this.recorded = false; this.solved = false; this.spec = spec; this.info = info; this.playT = 0; this.coached = false;
    this.inner = spec.kind === 'basin' ? new Roll(this.app, false, spec) : spec.kind === 'summit' ? new Summit(this.app, spec) : new Flux(this.app, spec);
    this.btns.push(this.ui.addButton('New design', 0.0, -0.20, -0.78, () => this.menuUI(), 0.3, 0.07));
    this.ui.setStatus(`${title ? `"${title}" - ` : ''}designed in ${rounds} draft${rounds > 1 ? 's' : ''}, verified solvable.`, INFO);
    this.app.audio.tick();
  }

  disposeInner() { if (this.inner) { this.inner.dispose(); this.inner = null; } }

  coachFacts() {
    const i = this.info || {}, k = this.spec.kind;
    if (k === 'basin' && i.sample) return `Deepest pit is ${where(i.low.x, i.low.y)}; balls dropped in ${where(i.sample.x, i.sample.y)} reach it; ${Math.round(i.frac * 100)}% of start points win.`;
    if (k === 'summit' && i.top) return `Highest peak is in ${where(i.top.x, i.top.y)}; a decoy peak is ${Math.round(i.ratio * 100)}% as tall.`;
    if (k === 'flux' && i.best) return `A source in ${where(i.best.a.x, i.best.a.y)} plus a sink in ${where(i.best.b.x, i.best.b.y)} wins.`;
    return '';
  }

  localHint() {
    const i = this.info || {}, k = this.spec.kind;
    if (k === 'basin' && i.sample) return `Coach: the agent's own test found a winning drop in ${where(i.sample.x, i.sample.y)}. Remember, drops roll downhill.`;
    if (k === 'summit' && i.top) return `Coach: the true highest peak is in ${where(i.top.x, i.top.y)}. The other peak is a decoy.`;
    if (k === 'flux' && i.best) return `Coach: one winning layout puts a source in ${where(i.best.a.x, i.best.a.y)} and a sink in ${where(i.best.b.x, i.best.b.y)}.`;
    return null;
  }

  async coach() {
    const tok = this.token, facts = this.coachFacts();
    const cloud = facts ? await coachCloud(this.spec.kind, facts, Math.round(this.playT)) : null;
    if (tok !== this.token || this.inner?.solved) return;
    const h = cloud ? `Coach (OpenAI): ${cloud}` : this.localHint();
    if (h) this.ui.setStatus(h, WARN);
  }

  update(dt, pin) {
    if (this.phase !== 'play' || !this.inner) return;
    this.inner.update(dt, pin);
    if (this.inner.solved && !this.recorded) { this.recorded = true; this.solved = true; this.app.recordArchitect({ ...this.cur, day: new Date().toISOString().slice(0, 10) }); }
    this.playT += dt;
    if (!this.coached && !this.inner.solved && this.playT > COACH_AFTER) {
      this.coached = true; this.coach();
    }
  }

  dispose() { this.token++; this.disposeInner(); super.dispose(); }
}
