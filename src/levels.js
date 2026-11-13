import * as THREE from 'three';
import { R, clamp, dist, grad, curl, landscape, extremum, rng } from './math.js';
import { makeSurface, makeFlatBoard, makeArrowField, toV, glowMat, ring } from './surface.js';

export const GOOD = '#8dffb0', WARN = '#ffd45e', BAD = '#ff8a8a', INFO = '#9fe8ff';

export class Level {
  constructor(app) {
    this.app = app; this.ui = app.ui; this.audio = app.audio;
    this.group = new THREE.Group(); app.world.add(this.group);
    this.solved = false; this.btns = [];
  }
  btn(label, x, y, cb) { const b = this.ui.addButton(label, x, y, -0.95, cb, 0.22, 0.07); this.btns.push(b); return b; }
  solve(msg) {
    if (this.solved) return;
    this.solved = true; this.audio.win();
    this.ui.setStatus(msg || 'Solved!', GOOD);
    this.app.onSolved();
  }
  update() {}
  dispose() {
    this.btns.forEach((b) => this.ui.removeButton(b));
    this.app.world.remove(this.group);
    this.group.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
  }
}

// A draggable bead that follows the pointer once grabbed.
export function makeBall(color = 0xffd45e, r = 0.12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16),
    new THREE.MeshBasicMaterial({ color }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 16, 12), glowMat(color, 0.22));
  m.add(halo); return m;
}
export function makeArrow(color) {
  const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.5, color, 0.16, 0.1);
  a.visible = false; return a;
}
export function setArrow(a, x, y, h, dx, dy, len) {
  const m = Math.hypot(dx, dy);
  if (m < 1e-6) { a.visible = false; return; }
  a.visible = true; a.position.copy(toV(x, y, h));
  a.setDirection(new THREE.Vector3(dx / m, 0, -dy / m)); a.setLength(len, Math.min(0.18, len * 0.4), 0.1);
}

/* ------------------------------------------------------------------ 1. SUMMIT */
export class Summit extends Level {
  constructor(app, spec = null) {
    super(app);
    this.f = landscape(spec ? spec.bumps : [{ a: 1.1, x: 1.0, y: 0.9, s: 0.75 }, { a: 0.8, x: -1.2, y: -0.8, s: 0.65 }, { a: -0.5, x: -0.2, y: 0.4, s: 0.6 }]);
    this.top = extremum(this.f, 1);
    this.surface = makeSurface(this.f); this.group.add(this.surface); app.surfaceFn = this.f;
    this.ball = makeBall(); this.group.add(this.ball);
    this.p = { x: -1.4, y: 1.3 }; this.grabbed = false; this.hold = 0;
    ui_set(this, '1 / 7  -  SURFACES & LEVEL CURVES', 'Summit',
      'Pinch the ball and drag it to the highest peak. White rings = same height (level curves).');
  }
  update(dt, pin) {
    if (pin.pressed && pin.active && dist(pin.x, pin.y, this.p.x, this.p.y) < 0.8) { this.grabbed = true; this.audio.grab(); }
    if (!pin.down) { if (this.grabbed) this.audio.drop(); this.grabbed = false; }
    if (this.grabbed) { this.p.x = clamp(pin.x, -R + 0.1, R - 0.1); this.p.y = clamp(pin.y, -R + 0.1, R - 0.1); }
    const z = this.f(this.p.x, this.p.y);
    this.ball.position.copy(toV(this.p.x, this.p.y, z + 0.12));
    if (this.solved) return;
    const frac = (z - this.surface.userData.min) / (this.top.v - this.surface.userData.min);
    this.audio.setTone(220 * Math.pow(4, clamp(frac, 0, 1)), 0.03);
    this.ui.setStatus(`z = f(${this.p.x.toFixed(1)}, ${this.p.y.toFixed(1)}) = ${z.toFixed(2)}     summit ${this.top.v.toFixed(2)}`, frac > 0.9 ? GOOD : INFO);
    if (z >= 0.97 * this.top.v && !this.grabbed) this.hold += dt; else if (z < 0.97 * this.top.v) this.hold = 0;
    if (this.hold > 0.5) this.solve('Summit reached - the global maximum!');
  }
}

/* ------------------------------------------------------------------ 2. ROLL (gradient flow) + daily */
export class Roll extends Level {
  constructor(app, daily = false, spec = null) {
    super(app);
    this.daily = daily;
    if (spec) {
      this.f = landscape(spec.bumps);
    } else if (daily) {
      const d = new Date(); const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      const r = rng(seed), bumps = [];
      for (let i = 0; i < 3; i++) bumps.push({ a: -(0.7 + r() * 0.7), x: (r() - 0.5) * 3, y: (r() - 0.5) * 3, s: 0.45 + r() * 0.3 });
      for (let i = 0; i < 2; i++) bumps.push({ a: 0.6 + r() * 0.6, x: (r() - 0.5) * 2.6, y: (r() - 0.5) * 2.6, s: 0.5 + r() * 0.4 });
      this.f = landscape(bumps); this.seed = seed;
    } else {
      this.f = landscape([{ a: -1.2, x: -1.2, y: 1.0, s: 0.6 }, { a: -0.9, x: 1.2, y: -1.0, s: 0.6 },
        { a: 1.0, x: 0.1, y: 0.0, s: 0.8 }, { a: 0.4, x: -1.5, y: -1.2, s: 0.5 }]);
    }
    this.low = extremum(this.f, -1);
    this.surface = makeSurface(this.f); this.group.add(this.surface); app.surfaceFn = this.f;
    const tgt = ring(0.5, 0x7dffb0, this.f(this.low.x, this.low.y) + 0.06); tgt.position.set(this.low.x, tgt.position.y, -this.low.y);
    this.group.add(tgt); this.tgt = tgt;
    this.ball = makeBall(); this.group.add(this.ball);
    this.arrow = makeArrow(0xff7a59); this.group.add(this.arrow);
    const N = 220; this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); this.trailGeo.setDrawRange(0, 0);
    this.trail = new THREE.Line(this.trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff })); this.trail.frustumCulled = false;
    this.group.add(this.trail); this.N = N; this.nTrail = 0;
    this.start = { x: 0, y: -1.6 }; this.p = { ...this.start };
    this.state = 'aim'; this.grabbed = false; this.attempts = 0; this.timer = 0; this.still = 0;
    ui_set(this, daily ? '7 / 7  -  DAILY CHALLENGE' : '2 / 7  -  THE GRADIENT',
      daily ? 'Daily Basin' : 'Follow the Gradient',
      `Pinch the ball, drop it, and let it roll (−∇f) into the green ring${daily ? '. New landscape every day.' : '.'}`);
  }
  addTrail(x, y) {
    if (this.nTrail >= this.N) return;
    const a = this.trailGeo.attributes.position, v = toV(x, y, this.f(x, y) + 0.05);
    a.setXYZ(this.nTrail++, v.x, v.y, v.z); a.needsUpdate = true; this.trailGeo.setDrawRange(0, this.nTrail);
  }
  reset() { this.p = { ...this.start }; this.state = 'aim'; this.nTrail = 0; this.trailGeo.setDrawRange(0, 0); }
  update(dt, pin) {
    const f = this.f;
    if (this.state === 'aim') {
      if (pin.pressed && pin.active && dist(pin.x, pin.y, this.p.x, this.p.y) < 0.8) { this.grabbed = true; this.audio.grab(); }
      if (this.grabbed && pin.down) { this.p.x = clamp(pin.x, -R + 0.1, R - 0.1); this.p.y = clamp(pin.y, -R + 0.1, R - 0.1); }
      if (this.grabbed && !pin.down) {
        this.grabbed = false; this.state = 'roll'; this.timer = 0; this.still = 0; this.attempts++;
        this.nTrail = 0; this.addTrail(this.p.x, this.p.y); this.audio.drop();
      }
      const [gx, gy] = grad(f, this.p.x, this.p.y);
      setArrow(this.arrow, this.p.x, this.p.y, f(this.p.x, this.p.y) + 0.25, -gx, -gy, clamp(Math.hypot(gx, gy) * 0.9, 0.2, 1.0));
      this.ui.setStatus(this.grabbed ? `∇f = (${gx.toFixed(2)}, ${gy.toFixed(2)})   |∇f| = ${Math.hypot(gx, gy).toFixed(2)}` : 'Pinch the ball to pick it up', INFO);
    } else if (this.state === 'roll') {
      this.arrow.visible = false;
      const [gx, gy] = grad(f, this.p.x, this.p.y), sp = Math.hypot(gx, gy);
      const k = 2.2 * dt; this.p.x = clamp(this.p.x - gx * k, -R + 0.05, R - 0.05); this.p.y = clamp(this.p.y - gy * k, -R + 0.05, R - 0.05);
      this.timer += dt; this.still = sp < 0.04 ? this.still + dt : 0;
      if (Math.floor(this.timer * 24) !== Math.floor((this.timer - dt) * 24)) this.addTrail(this.p.x, this.p.y);
      this.ui.setStatus(`rolling along −∇f ...   |∇f| = ${sp.toFixed(2)}`, WARN);
      if (this.still > 0.25 || this.timer > 9) {
        const ok = dist(this.p.x, this.p.y, this.low.x, this.low.y) < 0.5;
        if (ok) { this.state = 'done'; this.solve(`Landed in the deepest basin in ${this.attempts} ${this.attempts === 1 ? 'try' : 'tries'}!`); }
        else { this.state = 'fail'; this.timer = 0; this.audio.fail(); this.ui.setStatus('Wrong basin - the ridge sent it the other way. Try again.', BAD); }
      }
    } else if (this.state === 'fail') {
      this.timer += dt; if (this.timer > 1.4) this.reset();
    }
    this.ball.position.copy(toV(this.p.x, this.p.y, f(this.p.x, this.p.y) + 0.12));
  }
}

/* ------------------------------------------------------------------ 3. FLUX / DIVERGENCE */
export class Flux extends Level {
  constructor(app, spec = null) {
    super(app);
    this.group.add(makeFlatBoard());
    this.srcs = []; this.max = 3; this.mode = 1;
    this.target = spec ? { ...spec.target } : { x: 1.3, y: 1.15, r: 0.38 };
    this.wind = spec ? spec.wind : 0.6;
    const t = ring(this.target.r, 0x7dffb0, 0.03); t.position.set(this.target.x, 0.03, -this.target.y); this.group.add(t);
    const nz = ring(1.0, 0x5a3a52, 0.025, 0.03); nz.position.set(this.target.x, 0.025, -this.target.y); this.group.add(nz);
    const em = ring(0.2, 0xffd45e, 0.03); em.position.set(-1.8, 0.03, 0.9); this.group.add(em);
    const N = 100; this.N = N;
    this.pos = new Float32Array(N * 3); this.alive = new Array(N).fill(false);
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.pts = new THREE.Points(this.geo, new THREE.PointsMaterial({ color: 0x9fe8ff, size: 0.1, sizeAttenuation: true, map: dotTex(), alphaTest: 0.4, transparent: true }));
    this.pts.frustumCulled = false; this.group.add(this.pts);
    this.srcGroup = new THREE.Group(); this.group.add(this.srcGroup);
    this.bSrc = this.btn('+ Source', -0.28, -0.08, () => { this.mode = 1; this.sync(); });
    this.bSink = this.btn('− Sink', 0.0, -0.08, () => { this.mode = -1; this.sync(); });
    this.btn('Clear', 0.28, -0.08, () => { this.srcs = []; this.rebuildSrc(); this.restart(); });
    this.sync(); this.restart();
    ui_set(this, '3 / 7  -  FLUX & DIVERGENCE', 'Steer the Flow',
      'Pinch the board to place sources and sinks (div F). Steer 60 of 100 particles into the green ring.');
  }
  sync() { this.ui.setActive(this.bSrc, this.mode > 0); this.ui.setActive(this.bSink, this.mode < 0); }
  restart() { this.spawned = 0; this.hits = 0; this.lost = 0; this.acc = 0; this.alive.fill(false); this.ended = false; }
  rebuildSrc() {
    this.srcGroup.clear();
    for (const s of this.srcs) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), glowMat(s.m > 0 ? 0xff7a59 : 0x59b6ff, 0.95));
      m.position.copy(toV(s.x, s.y, 0.08)); this.srcGroup.add(m);
    }
  }
  F(x, y) {
    let p = this.wind, q = 0;
    for (const s of this.srcs) {
      const dx = x - s.x, dy = y - s.y, r2 = dx * dx + dy * dy + 0.06, k = (s.m * 2.6) / (2 * Math.PI) / r2;
      p += dx * k; q += dy * k;
    }
    return [p, q];
  }
  update(dt, pin) {
    if (pin.pressed && pin.active && Math.abs(pin.x) < R && Math.abs(pin.y) < R && dist(pin.x, pin.y, this.target.x, this.target.y) > 1.0) {
      const i = this.srcs.findIndex((s) => dist(s.x, s.y, pin.x, pin.y) < 0.3);
      if (i >= 0) { this.srcs.splice(i, 1); this.audio.drop(); this.rebuildSrc(); this.restart(); }
      else if (this.srcs.length < this.max) { this.srcs.push({ x: pin.x, y: pin.y, m: this.mode }); this.audio.grab(); this.rebuildSrc(); this.restart(); }
    }
    if (!this.ended) {
      this.acc += dt;
      while (this.acc > 0.06 && this.spawned < this.N) {
        this.acc -= 0.06; const i = this.alive.indexOf(false);
        if (i < 0) break;
        this.alive[i] = true; this.pos[i * 3] = -1.8 + Math.random() * 0.1; this.pos[i * 3 + 1] = 0.04; this.pos[i * 3 + 2] = 0.9 + (Math.random() - 0.5) * 0.3; this.spawned++;
      }
    }
    for (let i = 0; i < this.N; i++) {
      if (!this.alive[i]) { this.pos[i * 3 + 1] = -5; continue; }
      let x = this.pos[i * 3], y = -this.pos[i * 3 + 2];
      const [p, q] = this.F(x, y); x += p * dt; y += q * dt;
      this.pos[i * 3] = x; this.pos[i * 3 + 2] = -y; this.pos[i * 3 + 1] = 0.04;
      if (dist(x, y, this.target.x, this.target.y) < this.target.r) { this.alive[i] = false; this.hits++; }
      else if (Math.abs(x) > R + 0.1 || Math.abs(y) > R + 0.1 || this.srcs.some((s) => s.m < 0 && dist(x, y, s.x, s.y) < 0.18)) { this.alive[i] = false; this.lost++; }
    }
    this.geo.attributes.position.needsUpdate = true;
    if (this.solved) return;
    const done = this.spawned >= this.N && !this.alive.some(Boolean);
    this.ui.setStatus(`reached target: ${this.hits} / 100     lost: ${this.lost}     placed ${this.srcs.length}/${this.max}`, this.hits >= 60 ? GOOD : INFO);
    if (this.hits >= 60) this.solve(`${this.hits} particles delivered - you bent the flow!`);
    else if (done && !this.ended) { this.ended = true; this.audio.fail(); this.ui.setStatus(`Only ${this.hits} arrived. Move or add sources/sinks - the run restarts automatically.`, BAD); setTimeout(() => !this.solved && this.restart(), 1800); }
  }
}

/* ------------------------------------------------------------------ 4. CURL */
const CURL_ROUNDS = [
  { name: 'F = (−y, x²)', F: (x, y) => [-y, x * x] },
  { name: 'F = (sin y, x·y)', F: (x, y) => [Math.sin(y), x * y] },
  { name: 'F = 0.4(−y(r²−1), x(r²−1))', F: (x, y) => { const g = 0.4 * (x * x + y * y - 1); return [-y * g, x * g]; } },
];
export class Curl extends Level {
  constructor(app) {
    super(app);
    this.group.add(makeFlatBoard());
    this.round = 0; this.fieldMesh = null;
    this.wheel = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.wheel.add(hub);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.1), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff7a59 : 0xffd45e }));
      arm.rotation.y = (i * Math.PI) / 4; this.wheel.add(arm);
    }
    this.group.add(this.wheel);
    this.p = { x: -1.3, y: -1.3 }; this.grabbed = false; this.ang = 0; this.calm = 0;
    this.loadRound();
    ui_set(this, '4 / 7  -  CURL', 'The Paddlewheel',
      'Drag the paddlewheel. Find where it stops spinning (curl = 0) and hold it there.');
  }
  loadRound() {
    if (this.fieldMesh) { this.group.remove(this.fieldMesh); this.fieldMesh.geometry.dispose(); }
    this.cur = CURL_ROUNDS[this.round];
    this.fieldMesh = makeArrowField(this.cur.F, { n: 15, scale: 0.28 }); this.group.add(this.fieldMesh);
    this.calm = 0;
  }
  update(dt, pin) {
    if (pin.pressed && pin.active && dist(pin.x, pin.y, this.p.x, this.p.y) < 0.8) { this.grabbed = true; this.audio.grab(); }
    if (!pin.down) this.grabbed = false;
    if (this.grabbed) { this.p.x = clamp(pin.x, -R + 0.15, R - 0.15); this.p.y = clamp(pin.y, -R + 0.15, R - 0.15); }
    const c = curl(this.cur.F, this.p.x, this.p.y);
    this.ang += c * 0.9 * dt;
    this.wheel.position.copy(toV(this.p.x, this.p.y, 0.1)); this.wheel.rotation.y = this.ang;
    if (this.solved) return;
    const calm = Math.abs(c) < 0.25;
    this.calm = calm ? this.calm + dt : 0;
    this.ui.setStatus(`${this.cur.name}     curl = ${c.toFixed(2)}     round ${this.round + 1}/3`, calm ? GOOD : INFO);
    if (this.calm > 1.0) {
      this.audio.win();
      if (this.round < CURL_ROUNDS.length - 1) { this.round++; this.loadRound(); this.p = { x: -1.3, y: -1.3 }; this.grabbed = false; }
      else this.solve('Zero curl found in all three fields!');
    }
  }
}

/* ------------------------------------------------------------------ 5. LINE INTEGRAL / WORK */
const WORK_ROUNDS = [
  { goal: 'Draw a path from A to B with total work W ≤ −1.5 (ride the flow!)', F: (x, y) => [-0.6 * y, 0.6 * x], ok: (W) => W <= -1.5 },
  { goal: 'Now draw an A→B path with work close to ZERO  (|W| < 0.5)', F: (x, y) => [-0.6 * y, 0.6 * x], ok: (W) => Math.abs(W) < 0.5 },
  { goal: 'This field is a gradient (conservative). Draw TWO different routes from A to B.', F: null, ok: null },
];
export class Work extends Level {
  constructor(app) {
    super(app);
    this.group.add(makeFlatBoard());
    this.A = { x: -1.6, y: -1.2 }; this.B = { x: 1.6, y: -1.2 };
    for (const [pt, col] of [[this.A, 0xffd45e], [this.B, 0x7dffb0]]) {
      const r = ring(0.3, col, 0.03); r.position.set(pt.x, 0.03, -pt.y); this.group.add(r);
    }
    const pot = landscape([{ a: 1.0, x: 0, y: 0.4, s: 0.9 }, { a: -0.7, x: -0.8, y: -0.4, s: 0.7 }]);
    this.consF = (x, y) => { const g = grad(pot, x, y); return [g[0] * 1.3, g[1] * 1.3]; };
    this.round = 0; this.fieldMesh = null; this.lines = [];
    this.pathGeo = null; this.drawing = false; this.W = 0; this.pts = []; this.done = [];
    this.loadRound();
    ui_set(this, '5 / 7  -  LINE INTEGRALS', 'Work Along a Path',
      'Pinch near A, draw a path to B. The meter shows the work W = ∫F·dr.');
  }
  get F() { return this.round < 2 ? WORK_ROUNDS[this.round].F : this.consF; }
  loadRound() {
    if (this.fieldMesh) { this.group.remove(this.fieldMesh); this.fieldMesh.geometry.dispose(); }
    this.fieldMesh = makeArrowField(this.F, { n: 15, scale: 0.55 }); this.group.add(this.fieldMesh);
    this.clearLines(); this.done = []; this.W = 0; this.pts = [];
  }
  clearLines() { for (const l of this.lines) { this.group.remove(l); l.geometry.dispose(); } this.lines = []; }
  rebuildLine(pts, color) {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => toV(p.x, p.y, 0.06)));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color })); l.frustumCulled = false; return l;
  }
  update(dt, pin) {
    const F = this.F;
    if (pin.pressed && pin.active && dist(pin.x, pin.y, this.A.x, this.A.y) < 0.55) {
      this.drawing = true; this.W = 0; this.pts = [{ x: this.A.x, y: this.A.y }]; this.len = 0; this.audio.grab();
      if (this.live) { this.group.remove(this.live); this.live.geometry.dispose(); this.live = null; }
    }
    if (this.drawing && pin.down) {
      const last = this.pts[this.pts.length - 1], x = clamp(pin.x, -R, R), y = clamp(pin.y, -R, R), d = dist(x, y, last.x, last.y);
      if (d > 0.06) {
        const a = F(last.x, last.y), b = F(x, y);
        this.W += 0.5 * ((a[0] + b[0]) * (x - last.x) + (a[1] + b[1]) * (y - last.y)); this.len += d;
        this.pts.push({ x, y });
        if (this.live) { this.group.remove(this.live); this.live.geometry.dispose(); }
        this.live = this.rebuildLine(this.pts, 0xffffff); this.group.add(this.live);
      }
    }
    if (this.drawing && !pin.down) {
      this.drawing = false;
      const end = this.pts[this.pts.length - 1];
      if (this.pts.length > 3 && dist(end.x, end.y, this.B.x, this.B.y) < 0.5) this.finishPath();
      else { this.ui.setStatus('The path must end inside the green ring B. Try again.', BAD); this.audio.fail(); }
    }
    if (this.solved) return;
    if (this.drawing) this.ui.setStatus(`W = ∫ F·dr = ${this.W.toFixed(2)}     (round ${this.round + 1}/3)`, WARN);
    else if (!this.msgLock) this.ui.setStatus(WORK_ROUNDS[this.round].goal, INFO);
  }
  finishPath() {
    const W = this.W;
    if (this.round < 2) {
      if (WORK_ROUNDS[this.round].ok(W)) {
        this.ui.setStatus(`W = ${W.toFixed(2)}  - correct!`, GOOD); this.audio.win(); this.msgLock = true;
        setTimeout(() => { this.msgLock = false; this.round++; this.loadRound(); if (this.live) { this.group.remove(this.live); this.live = null; } }, 1300);
      } else { this.ui.setStatus(`W = ${W.toFixed(2)}  - not quite. Try another path.`, BAD); this.audio.fail(); }
    } else {
      this.done.push({ W, len: this.len, pts: this.pts.slice() });
      this.lines.push(this.rebuildLine(this.pts, this.done.length === 1 ? 0xffd45e : 0xff7a59)); this.group.add(this.lines[this.lines.length - 1]);
      if (this.live) { this.group.remove(this.live); this.live = null; }
      if (this.done.length === 1) this.ui.setStatus(`Route 1: W = ${W.toFixed(3)}. Draw a very different route.`, INFO);
      else {
        const [a, b] = this.done.slice(-2);
        if (Math.abs(a.len - b.len) < 0.7) { this.ui.setStatus(`Route 2 is too similar (W = ${b.W.toFixed(3)}). Take a very different path.`, BAD); this.done.pop(); this.group.remove(this.lines.pop()); }
        else this.solve(`W₁ = ${a.W.toFixed(3)}, W₂ = ${b.W.toFixed(3)} - path independent! F = ∇φ`);
      }
    }
  }
}

/* ------------------------------------------------------------------ 6. LAGRANGE */
export class Lagrange extends Level {
  constructor(app) {
    super(app);
    this.f = landscape([{ a: 1.0, x: 1.3, y: 0.2, s: 0.9 }, { a: 0.7, x: -0.8, y: 1.2, s: 0.7 }, { a: -0.5, x: 0, y: -1.0, s: 0.8 }]);
    this.surface = makeSurface(this.f, { levels: 5 }); this.group.add(this.surface); app.surfaceFn = this.f;
    this.rc = 1.45; this.th = Math.PI * 0.9;
    const pts = []; for (let i = 0; i <= 160; i++) { const t = (i / 160) * Math.PI * 2; pts.push(toV(this.rc * Math.cos(t), this.rc * Math.sin(t), this.f(this.rc * Math.cos(t), this.rc * Math.sin(t)) + 0.04)); }
    this.circle = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xff7a59 })); this.group.add(this.circle);
    let best = -Infinity; for (let i = 0; i < 1440; i++) { const t = (i / 1440) * Math.PI * 2; best = Math.max(best, this.f(this.rc * Math.cos(t), this.rc * Math.sin(t))); }
    this.best = best;
    this.ball = makeBall(0xffffff, 0.1); this.group.add(this.ball);
    this.aF = makeArrow(0xffd45e); this.aG = makeArrow(0x59d6ff); this.group.add(this.aF, this.aG);
    this.hold = 0;
    ui_set(this, '6 / 7  -  LAGRANGE MULTIPLIERS', 'Maximum on a Constraint',
      'Swing the bead around the circle to the highest point. At the top, ∇f and ∇g line up.');
  }
  update(dt, pin) {
    if (pin.down && pin.active) this.th = Math.atan2(pin.y, pin.x);
    const x = this.rc * Math.cos(this.th), y = this.rc * Math.sin(this.th), z = this.f(x, y);
    this.ball.position.copy(toV(x, y, z + 0.1));
    const [fx, fy] = grad(this.f, x, y), gx = 2 * x, gy = 2 * y;
    const mf = Math.hypot(fx, fy), mg = Math.hypot(gx, gy);
    const cr = (fx * gy - fy * gx) / (mf * mg + 1e-9), lam = (fx * gx + fy * gy) / (mg * mg);
    setArrow(this.aF, x, y, z + 0.22, fx, fy, clamp(mf * 1.2, 0.25, 1.1));
    setArrow(this.aG, x, y, z + 0.22, gx, gy, 0.7);
    if (this.solved) return;
    const aligned = Math.abs(cr) < 0.08, isMax = z >= 0.985 * this.best;
    this.audio.setTone(220 * Math.pow(4, clamp(1 - Math.abs(cr), 0, 1)), 0.03);
    this.ui.setStatus(`f = ${z.toFixed(2)}     misalignment = ${Math.abs(cr).toFixed(2)}     λ = ${lam.toFixed(2)}`, aligned ? (isMax ? GOOD : WARN) : INFO);
    if (aligned && isMax) this.hold += dt; else this.hold = 0;
    if (aligned && !isMax && !this.hintShown && pin.down) { this.hintShown = true; this.ui.setStatus('Aligned, but this is a lower critical point. Keep searching for the maximum!', WARN); }
    if (this.hold > 0.8) this.solve(`∇f ∥ ∇g at the constrained maximum, λ = ${lam.toFixed(2)}!`);
  }
}

function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); x.beginPath(); x.arc(32, 32, 28, 0, 7); x.fillStyle = '#fff'; x.fill();
  return new THREE.CanvasTexture(c);
}

export function ui_set(level, badge, title, hint) {
  const topic = badge.replace(/^\d+ \/ \d+\s+-\s+/, '');
  level.ui.set({ badge: `${level.app.badgePrefix || ''}${topic}`, title, hint, status: '', color: INFO });
}

