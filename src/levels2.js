import * as THREE from 'three';
import { R, clamp, dist, grad, landscape } from './math.js';
import { makeSurface, makeFlatBoard, makeArrowField, toV, glowMat, ring } from './surface.js';
import { Level, GOOD, WARN, BAD, INFO, makeBall, makeArrow, setArrow, ui_set } from './levels.js';

const pitch = (t) => 220 * Math.pow(4, clamp(t, 0, 1)); // 220 Hz .. 880 Hz

function makeSlider(group, x0, x1, y) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.05, 0.1), glowMat(0x5c6cc8, 0.9));
  bar.position.set((x0 + x1) / 2, 0.03, -y);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), glowMat(0xffd45e));
  knob.position.set(x0, 0.1, -y); group.add(bar, knob);
  return { x0, x1, y, set(t) { knob.position.x = x0 + (x1 - x0) * clamp(t, 0, 1); },
    hit(p) { return p.pressed && p.active && Math.abs(p.y - y) < 0.4 && p.x > x0 - 0.35 && p.x < x1 + 0.35; },
    val(p) { return clamp((p.x - x0) / (x1 - x0), 0, 1); } };
}

/* ------------------------------------------------------------------ 0. HELLO (tutorial) */
export class Hello extends Level {
  constructor(app) {
    super(app);
    this.group.add(makeFlatBoard());
    this.orb = makeBall(0x9fe8ff, 0.2); this.group.add(this.orb);
    this.p = { x: -1.3, y: 0 }; this.grabbed = false; this.t = 0; this.taught = false;
    this.goal = ring(0.45, 0x7dffb0, 0.03); this.goal.position.set(1.3, 0.03, 0); this.group.add(this.goal);
    // Ghost hand: demonstrates pinch -> carry -> release in a loop, so there is no wall of text.
    this.ghost = new THREE.Group();
    this.gThumb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), glowMat(0xffd45e, 0.9));
    this.gIndex = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), glowMat(0xffd45e, 0.9));
    this.gPalm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), glowMat(0xffd45e, 0.25));
    this.gPalm.position.set(0, 0, 0.32); this.ghost.add(this.gThumb, this.gIndex, this.gPalm); this.group.add(this.ghost);
    this.burst = null;
    ui_set(this, '0 / 0  -  WELCOME', 'Pinch to play', 'Copy the ghost hand: pinch the orb, carry it to the green ring, let go.');
  }
  sparkle() { // payoff burst
    const n = 90, pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos.set([1.3, 0.3, 0], i * 3); const a = Math.random() * 6.28, u = 0.6 + Math.random() * 1.6; vel.push([Math.cos(a) * u, 1 + Math.random() * 1.6, Math.sin(a) * u]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd45e, size: 0.12, transparent: true }));
    pts.frustumCulled = false; this.group.add(pts); this.burst = { pts, vel, pos, t: 0 };
  }
  update(dt, pin) {
    this.t += dt;
    this.goal.scale.setScalar(1 + 0.06 * Math.sin(this.t * 3));
    if (pin.pressed && pin.active && dist(pin.x, pin.y, this.p.x, this.p.y) < 0.9) { this.grabbed = true; this.taught = true; this.audio.grab(); }
    if (!pin.down && this.grabbed) {
      this.grabbed = false; this.audio.drop();
      if (dist(this.p.x, this.p.y, 1.3, 0) < 0.5) { this.p = { x: 1.3, y: 0 }; this.sparkle(); this.solve('Perfect pinch! You are ready.'); }
    }
    if (this.grabbed) { this.p.x = clamp(pin.x, -R + 0.2, R - 0.2); this.p.y = clamp(pin.y, -R + 0.2, R - 0.2); }
    this.orb.position.copy(toV(this.p.x, this.p.y, 0.25 + 0.05 * Math.sin(this.t * 4)));
    // ghost loop (6 s): approach 0-1.2, pinch 1.2-1.6, carry 1.6-4, release 4-4.5, fade 4.5-6
    const show = !this.taught && !this.solved, c = this.t % 6;
    this.ghost.visible = show;
    if (show) {
      const k = c < 1.2 ? 0 : c < 4 ? clamp((c - 1.6) / 2.4, 0, 1) : 1, x = -1.3 + 2.6 * k;
      const open = c < 1.2 || c > 4 ? 0.3 : 0.02, y = c < 1.2 ? 0.9 - 0.6 * (c / 1.2) : 0.3;
      this.ghost.position.copy(toV(x, 0, y + 0.1));
      this.gThumb.position.set(-open, 0, 0); this.gIndex.position.set(open, 0, 0);
    }
    if (this.burst) {
      const b = this.burst; b.t += dt;
      for (let i = 0; i < b.vel.length; i++) { b.vel[i][1] -= 3 * dt; for (let j = 0; j < 3; j++) b.pos[i * 3 + j] += b.vel[i][j] * dt; }
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.t / 1.6);
      if (b.t > 1.6) { this.group.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); this.burst = null; }
    }
    if (!this.solved) {
      this.ui.setStatus(!pin.active ? 'Hold up one hand so I can see it' : this.grabbed ? 'Nice - now release over the ring' : 'Pinch the orb to pick it up', pin.active ? INFO : WARN);
    }
  }
}

/* ------------------------------------------------------------------ MATCH THE SLOPE */
export class Slope extends Level {
  constructor(app) {
    super(app);
    this.f = landscape([{ a: 1.1, x: 1.0, y: 0.9, s: 0.75 }, { a: 0.8, x: -1.2, y: -0.8, s: 0.65 }, { a: -0.5, x: -0.2, y: 0.4, s: 0.6 }]);
    this.surface = makeSurface(this.f); this.group.add(this.surface); app.surfaceFn = this.f;
    this.ball = makeBall(); this.group.add(this.ball);
    this.aNow = makeArrow(0xffd45e); this.aTgt = makeArrow(0x59d6ff); this.group.add(this.aNow, this.aTgt);
    const P = [[0.1, 1.2], [-0.7, -1.3], null];
    this.rounds = P.map((q) => (q ? grad(this.f, q[0], q[1]) : [0, 0]));
    this.round = 0; this.p = { x: 1.7, y: -1.6 }; this.grabbed = false; this.hold = 0;
    ui_set(this, '3 / 0  -  GRADIENT AS SLOPE', 'Match the Slope',
      'Drag the ball until the yellow arrow matches the cyan target gradient ∇f.');
  }
  update(dt, pin) {
    const f = this.f, tg = this.rounds[this.round];
    if (pin.pressed && pin.active && dist(pin.x, pin.y, this.p.x, this.p.y) < 0.9) { this.grabbed = true; this.audio.grab(); }
    if (!pin.down) this.grabbed = false;
    if (this.grabbed) { this.p.x = clamp(pin.x, -R + 0.1, R - 0.1); this.p.y = clamp(pin.y, -R + 0.1, R - 0.1); }
    const [gx, gy] = grad(f, this.p.x, this.p.y);
    this.ball.position.copy(toV(this.p.x, this.p.y, f(this.p.x, this.p.y) + 0.12));
    setArrow(this.aNow, this.p.x, this.p.y, f(this.p.x, this.p.y) + 0.3, gx, gy, clamp(Math.hypot(gx, gy) * 1.6, 0.2, 1.2));
    const m = Math.hypot(tg[0], tg[1]);
    if (m > 0.02) setArrow(this.aTgt, -1.55, 1.55, 0.9, tg[0], tg[1], clamp(m * 1.6, 0.2, 1.2)); else this.aTgt.visible = false;
    if (this.solved) return;
    const err = Math.hypot(gx - tg[0], gy - tg[1]);
    this.audio.setTone(pitch(1 - err / 1.0), 0.03);
    this.ui.setStatus(`round ${this.round + 1}/3   target ∇f = (${tg[0].toFixed(2)}, ${tg[1].toFixed(2)})   yours = (${gx.toFixed(2)}, ${gy.toFixed(2)})`, err < 0.12 ? GOOD : INFO);
    this.hold = err < 0.12 ? this.hold + dt : 0;
    if (this.hold > 0.6) {
      this.audio.win(); this.hold = 0;
      if (this.round < 2) { this.round++; } else this.solve('Matched every gradient - slope is a vector!');
    }
  }
}

/* ------------------------------------------------------------------ GRADIENT DESCENT */
export class Descent extends Level {
  constructor(app) {
    super(app);
    this.a = 0.8; this.b = 2.4;
    this.f = (x, y) => 0.35 * 0.5 * (this.a * x * x + this.b * y * y);
    this.surface = makeSurface(this.f, { levels: 7 }); this.group.add(this.surface); app.surfaceFn = this.f;
    this.ball = makeBall(); this.group.add(this.ball);
    const tgt = ring(0.3, 0x7dffb0, 0.04); this.group.add(tgt);
    this.slider = makeSlider(this.group, -1.5, 1.5, -1.8); this.t = 0.4;
    this.slider.set(this.t); this.dots = new THREE.Group(); this.group.add(this.dots);
    this.start = { x: -1.8, y: 1.4 };
    this.p = { ...this.start }; this.state = 'set'; this.steps = 0; this.acc = 0; this.drag = false; this.attempts = 0;
    this.btn('▶ Run', 0.28, -0.08, () => this.run());
    ui_set(this, '4 / 0  -  GRADIENT DESCENT', 'Pick the Step Size',
      'Slide the knob to set the step size α, then press Run. Reach the ring in 10 steps.');
  }
  get alpha() { return 0.05 + this.t * 1.2; }
  run() { if (this.state === 'set') { this.p = { ...this.start }; this.dots.clear(); this.steps = 0; this.acc = 0; this.state = 'run'; this.attempts++; this.audio.grab(); } }
  fail(msg) { this.state = 'fail'; this.acc = 0; this.audio.fail(); this.ui.setStatus(msg, BAD); }
  update(dt, pin) {
    if (this.state === 'set') {
      if (this.slider.hit(pin)) this.drag = true;
      if (!pin.down) this.drag = false;
      if (this.drag) { this.t = this.slider.val(pin); this.slider.set(this.t); }
      this.ui.setStatus(`step size α = ${this.alpha.toFixed(2)}     steps allowed: 10`, INFO);
    } else if (this.state === 'run') {
      this.acc += dt;
      if (this.acc > 0.5) {
        this.acc = 0; this.steps++;
        const g = [this.a * this.p.x, this.b * this.p.y];
        this.p.x -= this.alpha * g[0]; this.p.y -= this.alpha * g[1];
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glowMat(0xffffff, 0.8));
        d.position.copy(toV(clamp(this.p.x, -R, R), clamp(this.p.y, -R, R), this.f(clamp(this.p.x, -R, R), clamp(this.p.y, -R, R)) + 0.05)); this.dots.add(d);
        this.audio.tick();
        const r = Math.hypot(this.p.x, this.p.y);
        this.ui.setStatus(`step ${this.steps}/10     distance to minimum = ${r.toFixed(2)}`, WARN);
        if (r < 0.3) { this.state = 'done'; this.solve(`Converged in ${this.steps} steps with α = ${this.alpha.toFixed(2)}!`); }
        else if (r > 4) this.fail('Diverged! α was too big - the steps overshoot more each time.');
        else if (this.steps >= 10) this.fail('Out of steps - α was too small. Try a bigger step.');
      }
    } else if (this.state === 'fail') {
      this.acc += dt; if (this.acc > 2.2) { this.state = 'set'; this.p = { ...this.start }; this.dots.clear(); }
    }
    const cx = clamp(this.p.x, -R + 0.05, R - 0.05), cy = clamp(this.p.y, -R + 0.05, R - 0.05);
    this.ball.position.copy(toV(cx, cy, this.f(cx, cy) + 0.12));
  }
  dispose() { this.audio.stopTone(); super.dispose(); }
}

/* ------------------------------------------------------------------ RIEMANN / DOUBLE INTEGRAL */
export class Riemann extends Level {
  constructor(app) {
    super(app);
    this.W = 1.6;
    this.f = (x, y) => 0.9 + 0.9 * Math.cos(2.0 * x) * Math.cos(1.8 * y) + 0.2 * y * y;
    let s = 0; const m = 500, h = (2 * this.W) / m;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) s += this.f(-this.W + (i + 0.5) * h, -this.W + (j + 0.5) * h) * h * h;
    this.exact = s;
    this.group.add(makeFlatBoard());
    this.slider = makeSlider(this.group, -1.5, 1.5, -1.85); this.t = 0.15; this.slider.set(this.t);
    this.rule = 'L'; this.n = 0; this.hold = 0; this.drag = false;
    this.max = 24; this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }), this.max * this.max);
    this.mesh.frustumCulled = false; this.group.add(this.mesh);
    this.bL = this.btn('Left corner', -0.28, -0.08, () => { this.rule = 'L'; this.rebuild(true); });
    this.bM = this.btn('Midpoint', 0.0, -0.08, () => { this.rule = 'M'; this.rebuild(true); });
    this.rebuild(true);
    ui_set(this, '5 / 0  -  DOUBLE INTEGRALS', 'Build the Volume',
      'Build the volume ∬f dA from columns. Slide n and pick the sampling. Get within 0.5% using 7 or fewer.');
  }
  rebuild() {
    this.n = Math.round(1 + this.t * 15);
    const n = this.n, h = (2 * this.W) / n, c = new THREE.Color(), M = new THREE.Matrix4();
    let sum = 0, k = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x0 = -this.W + i * h, y0 = -this.W + j * h, v = this.rule === 'M' ? this.f(x0 + h / 2, y0 + h / 2) : this.f(x0, y0);
      sum += v * h * h;
      M.compose(new THREE.Vector3(x0 + h / 2, v * 0.25, -(y0 + h / 2)), new THREE.Quaternion(), new THREE.Vector3(h * 0.9, v * 0.5, h * 0.9));
      this.mesh.setMatrixAt(k, M); c.setHSL(0.62 - clamp((v - 0.1) / 1.8, 0, 1) * 0.5, 0.85, 0.55); this.mesh.setColorAt(k, c); k++;
    }
    this.mesh.count = k; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.sum = sum; this.err = Math.abs(sum - this.exact) / this.exact;
    this.ui.setActive(this.bL, this.rule === 'L'); this.ui.setActive(this.bM, this.rule === 'M');
  }
  update(dt, pin) {
    if (this.slider.hit(pin)) this.drag = true;
    if (!pin.down) this.drag = false;
    if (this.drag) { const t = this.slider.val(pin); if (Math.round(1 + t * 15) !== this.n) { this.t = t; this.rebuild(); this.audio.tick(); } this.slider.set(t); }
    if (this.solved) return;
    const ok = this.err < 0.005 && this.n <= 7;
    this.audio.setTone(pitch(1 - clamp(this.err * 10, 0, 1)), 0.025);
    this.ui.setStatus(`n = ${this.n}×${this.n}     sum = ${this.sum.toFixed(3)}     exact = ${this.exact.toFixed(3)}     error ${(this.err * 100).toFixed(2)}%`, ok ? GOOD : this.err < 0.02 ? WARN : INFO);
    this.hold = ok ? this.hold + dt : 0;
    if (this.hold > 0.6) this.solve(`Within 0.5% using only ${this.n}×${this.n} columns - the ${this.rule === 'M' ? 'midpoint' : 'left-corner'} rule!`);
  }
  dispose() { this.audio.stopTone(); this.mesh.dispose(); super.dispose(); }
}

/* ------------------------------------------------------------------ GREEN / DIVERGENCE THEOREM LOOPS */
const polyArea = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + (a.x * b.y - b.x * a.y) / 2; }, 0);
function inside(p, x, y) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (((p[i].y > y) !== (p[j].y > y)) && x < ((p[j].x - p[i].x) * (y - p[i].y)) / (p[j].y - p[i].y) + p[i].x) c = !c;
  }
  return c;
}
export class Loop extends Level {
  constructor(app) {
    super(app);
    this.group.add(makeFlatBoard());
    this.els = [{ t: 's', x: -1.1, y: 0.6, m: 4 }, { t: 'k', x: 1.2, y: -0.5, m: -4 }, { t: 'v', x: 0.1, y: -1.2, m: 5 }];
    this.field = makeArrowField((x, y) => this.F(x, y), { n: 15, scale: 0.35 }); this.group.add(this.field);
    for (const e of this.els) {
      const col = e.t === 's' ? 0xff7a59 : e.t === 'k' ? 0x59b6ff : 0xffd45e;
      const m = new THREE.Mesh(e.t === 'v' ? new THREE.TorusGeometry(0.2, 0.05, 8, 24) : new THREE.SphereGeometry(0.16, 16, 12), glowMat(col, 0.95));
      if (e.t === 'v') m.rotation.x = Math.PI / 2;
      m.position.copy(toV(e.x, e.y, 0.1)); this.group.add(m);
    }
    this.rounds = [
      { goal: 'Draw a loop around the red SOURCE only: net flux Φ ≥ 2.5', ok: (m) => m.flux >= 2.5 && Math.abs(m.circ) < 1.2 },
      { goal: 'Now enclose the blue SINK only: flux Φ ≤ −2.5', ok: (m) => m.flux <= -2.5 && Math.abs(m.circ) < 1.2 },
      { goal: 'Enclose the yellow VORTEX only: circulation Γ ≥ 3 with |flux| < 1', ok: (m) => m.circ >= 3 && Math.abs(m.flux) < 1 },
      { goal: 'Enclose ALL THREE: fluxes cancel (|Φ| < 1) yet circulation Γ ≥ 3', ok: (m) => m.all && Math.abs(m.flux) < 1 && m.circ >= 3 },
    ];
    this.round = 0; this.pts = []; this.drawing = false; this.live = null; this.lock = false;
    ui_set(this, '9 / 0  -  GREEN & THE DIVERGENCE THEOREM', 'Loop the Field',
      'Draw a closed loop. Flux Φ = what is created inside. Circulation Γ = the swirl inside.');
  }
  F(x, y) {
    let p = 0, q = 0;
    for (const e of this.els) {
      const dx = x - e.x, dy = y - e.y, d = dx * dx + dy * dy + 0.06, k = e.m / (2 * Math.PI) / d;
      if (e.t === 'v') { p += -dy * k; q += dx * k; } else { p += dx * k; q += dy * k; }
    }
    return [p, q];
  }
  metrics(pts) {
    let flux = 0, circ = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], [fx, fy] = this.F((a.x + b.x) / 2, (a.y + b.y) / 2), dx = b.x - a.x, dy = b.y - a.y;
      flux += fx * dy - fy * dx; circ += fx * dx + fy * dy;
    }
    if (polyArea(pts) < 0) { flux = -flux; circ = -circ; }
    return { flux, circ, all: this.els.every((e) => inside(pts, e.x, e.y)) };
  }
  redraw() {
    if (this.live) { this.group.remove(this.live); this.live.geometry.dispose(); }
    const pts = this.pts.concat(this.pts.length ? [this.pts[0]] : []);
    this.live = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => toV(p.x, p.y, 0.06))), new THREE.LineBasicMaterial({ color: 0xffffff }));
    this.live.frustumCulled = false; this.group.add(this.live);
  }
  update(dt, pin) {
    if (!this.lock && pin.pressed && pin.active) { this.drawing = true; this.pts = []; this.audio.grab(); }
    if (this.drawing && pin.down) {
      const l = this.pts[this.pts.length - 1], x = clamp(pin.x, -R, R), y = clamp(pin.y, -R, R);
      if (!l || dist(x, y, l.x, l.y) > 0.08) { this.pts.push({ x, y }); this.redraw(); }
    }
    if (this.drawing && !pin.down) {
      this.drawing = false;
      if (this.pts.length >= 6) {
        const m = this.metrics(this.pts);
        if (this.rounds[this.round].ok(m)) {
          this.audio.win(); this.lock = true;
          this.ui.setStatus(`Φ = ${m.flux.toFixed(2)}   Γ = ${m.circ.toFixed(2)}  - correct!`, GOOD);
          setTimeout(() => {
            this.lock = false;
            if (this.round < this.rounds.length - 1) { this.round++; } else this.solve('Divergence theorem + Stokes: you read the field from its boundary!');
          }, 1500);
        } else { this.audio.fail(); this.ui.setStatus(`Φ = ${m.flux.toFixed(2)}   Γ = ${m.circ.toFixed(2)}  - not quite. Redraw the loop.`, BAD); this.lock = true; setTimeout(() => (this.lock = false), 900); }
      }
    }
    if (this.solved || this.lock) return;
    if (this.drawing && this.pts.length > 3) {
      const m = this.metrics(this.pts);
      this.ui.setStatus(`Φ = ${m.flux.toFixed(2)}     Γ = ${m.circ.toFixed(2)}     (round ${this.round + 1}/4)`, WARN);
    } else this.ui.setStatus(this.rounds[this.round].goal, INFO);
  }
}

/* ------------------------------------------------------------------ FIELD LAB (free play) */
export class Lab extends Level {
  constructor(app) {
    super(app);
    this.group.add(makeFlatBoard());
    this.els = []; this.mode = 's'; this.field = null;
    this.elGroup = new THREE.Group(); this.group.add(this.elGroup);
    this.N = 160; this.pos = new Float32Array(this.N * 3);
    for (let i = 0; i < this.N; i++) this.respawn(i);
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.pts = new THREE.Points(this.geo, new THREE.PointsMaterial({ color: 0x9fe8ff, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
    this.pts.frustumCulled = false; this.group.add(this.pts);
    this.bS = this.btn('+ Source', -0.42, -0.08, () => { this.mode = 's'; this.sync(); });
    this.bK = this.btn('− Sink', -0.14, -0.08, () => { this.mode = 'k'; this.sync(); });
    this.bV = this.btn('↻ Vortex', 0.14, -0.08, () => { this.mode = 'v'; this.sync(); });
    this.btn('Clear', 0.42, -0.08, () => { this.els = []; this.rebuild(); });
    this.sync(); this.rebuild();
    ui_set(this, '11 / 0  -  FIELD LAB', 'Field Lab',
      'Free play. Pick a tool, then pinch the board to place sources, sinks and vortices.');
  }
  sync() { this.ui.setActive(this.bS, this.mode === 's'); this.ui.setActive(this.bK, this.mode === 'k'); this.ui.setActive(this.bV, this.mode === 'v'); }
  respawn(i) { this.pos[i * 3] = (Math.random() - 0.5) * 3.8; this.pos[i * 3 + 1] = 0.05; this.pos[i * 3 + 2] = (Math.random() - 0.5) * 3.8; }
  F(x, y) {
    let p = 0.05, q = 0;
    for (const e of this.els) {
      const dx = x - e.x, dy = y - e.y, d = dx * dx + dy * dy + 0.06, k = e.m / (2 * Math.PI) / d;
      if (e.t === 'v') { p += -dy * k; q += dx * k; } else { p += dx * k; q += dy * k; }
    }
    return [p, q];
  }
  rebuild() {
    if (this.field) { this.group.remove(this.field); this.field.geometry.dispose(); }
    this.field = makeArrowField((x, y) => this.F(x, y), { n: 15, scale: 0.4 }); this.group.add(this.field);
    this.elGroup.clear();
    for (const e of this.els) {
      const col = e.t === 's' ? 0xff7a59 : e.t === 'k' ? 0x59b6ff : 0xffd45e;
      const m = new THREE.Mesh(e.t === 'v' ? new THREE.TorusGeometry(0.2, 0.05, 8, 24) : new THREE.SphereGeometry(0.16, 16, 12), glowMat(col, 0.95));
      if (e.t === 'v') m.rotation.x = Math.PI / 2;
      m.position.copy(toV(e.x, e.y, 0.1)); this.elGroup.add(m);
    }
  }
  update(dt, pin) {
    if (pin.pressed && pin.active && Math.abs(pin.x) < R && Math.abs(pin.y) < R) {
      const i = this.els.findIndex((e) => dist(e.x, e.y, pin.x, pin.y) < 0.3);
      if (i >= 0) { this.els.splice(i, 1); this.audio.drop(); this.rebuild(); }
      else if (this.els.length < 8) { this.els.push({ t: this.mode, x: pin.x, y: pin.y, m: this.mode === 's' ? 4 : this.mode === 'k' ? -4 : 5 }); this.audio.grab(); this.rebuild(); }
    }
    for (let i = 0; i < this.N; i++) {
      let x = this.pos[i * 3], y = -this.pos[i * 3 + 2];
      const [p, q] = this.F(x, y); x += p * dt * 1.6; y += q * dt * 1.6;
      const gone = Math.abs(x) > R || Math.abs(y) > R || this.els.some((e) => e.t === 'k' && dist(x, y, e.x, e.y) < 0.18);
      if (gone) { this.respawn(i); continue; }
      this.pos[i * 3] = x; this.pos[i * 3 + 2] = -y; this.pos[i * 3 + 1] = 0.05;
    }
    this.geo.attributes.position.needsUpdate = true;
    if (pin.active && Math.abs(pin.x) < R && Math.abs(pin.y) < R) {
      const h = 0.01, F = (x, y) => this.F(x, y);
      const div = (F(pin.x + h, pin.y)[0] - F(pin.x - h, pin.y)[0]) / (2 * h) + (F(pin.x, pin.y + h)[1] - F(pin.x, pin.y - h)[1]) / (2 * h);
      const cur = (F(pin.x + h, pin.y)[1] - F(pin.x - h, pin.y)[1]) / (2 * h) - (F(pin.x, pin.y + h)[0] - F(pin.x, pin.y - h)[0]) / (2 * h);
      if (!this.solved) this.ui.setStatus(`at (${pin.x.toFixed(1)}, ${pin.y.toFixed(1)})   div F = ${div.toFixed(2)}   curl F = ${cur.toFixed(2)}`, INFO);
    }
    const types = new Set(this.els.map((e) => e.t));
    if (types.size === 3 && !this.solved) this.solve('Source, sink and vortex placed - keep experimenting!');
  }
}
