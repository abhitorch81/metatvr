// Theory-completeness levels: Hessian test, topology of conservative fields, change of variables,
// the 3-D divergence theorem and harmonic functions.
import * as THREE from 'three';
import { R, clamp, dist, grad, landscape } from './math.js';
import { makeSurface, makeFlatBoard, makeArrowField, toV, glowMat, ring } from './surface.js';
import { Level, GOOD, WARN, BAD, INFO, makeBall, ui_set } from './levels.js';

/* ------------------------------------------------------------------ shared maths */
export function hess(f, x, y, h = 0.05) {
  const c = f(x, y);
  const fxx = (f(x + h, y) - 2 * c + f(x - h, y)) / (h * h), fyy = (f(x, y + h) - 2 * c + f(x, y - h)) / (h * h);
  const fxy = (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) / (4 * h * h);
  return { fxx, fyy, fxy, D: fxx * fyy - fxy * fxy };
}
export const classify = ({ fxx, D }) => (D < 0 ? 'saddle' : fxx < 0 ? 'max' : 'min');

export function findCritical(f) {
  const out = [];
  for (let sx = -1.8; sx <= 1.81; sx += 0.45) for (let sy = -1.8; sy <= 1.81; sy += 0.45) {
    let x = sx, y = sy, ok = false;
    for (let i = 0; i < 40; i++) {
      const [gx, gy] = grad(f, x, y), H = hess(f, x, y), det = H.fxx * H.fyy - H.fxy * H.fxy;
      if (Math.hypot(gx, gy) < 1e-5) { ok = true; break; }
      if (Math.abs(det) < 1e-6) break;
      x -= (H.fyy * gx - H.fxy * gy) / det; y -= (-H.fxy * gx + H.fxx * gy) / det;
      if (Math.abs(x) > 1.9 || Math.abs(y) > 1.9) break;
    }
    if (ok && !out.some((c) => dist(c.x, c.y, x, y) < 0.15)) out.push({ x, y, type: classify(hess(f, x, y)) });
  }
  return out;
}

const polyArea = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };
const inside = (p, x, y) => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i].y > y) !== (p[j].y > y) && x < ((p[j].x - p[i].x) * (y - p[i].y)) / (p[j].y - p[i].y) + p[i].x) c = !c;
  }
  return c;
};

/* ------------------------------------------------------------------ CRITICAL POINTS (Fermat, Hessian, Clairaut) */
export class Critical extends Level {
  constructor(app) {
    super(app);
    this.f = landscape([{ a: 1, x: -1.05, y: 0.1, s: 0.7 }, { a: 1, x: 1.05, y: 0.1, s: 0.7 }, { a: -0.9, x: 0, y: -1.35, s: 0.6 }]);
    this.group.add(makeSurface(this.f)); app.surfaceFn = this.f;
    this.ball = makeBall(); this.group.add(this.ball);
    this.crit = findCritical(this.f);
    for (const c of this.crit) { const m = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.13, 20).rotateX(-Math.PI / 2), glowMat(0xffffff, 0.35)); m.position.copy(toV(c.x, c.y, this.f(c.x, c.y) + 0.02)); this.group.add(m); }
    this.rounds = ['saddle', 'max', 'min']; this.round = 0; this.p = { x: 0, y: 1.5 }; this.grabbed = false; this.hold = 0;
    ui_set(this, '0 / 0  -  CRITICAL POINTS', 'Read the Hessian',
      'Drag the ball to a SADDLE. Gradient = 0 there, and the Hessian test D < 0 confirms it.');
  }
  update(dt, pin) {
    const f = this.f;
    if (pin.pressed && pin.active && dist(pin.x, pin.y, this.p.x, this.p.y) < 0.9) { this.grabbed = true; this.audio.grab(); }
    if (!pin.down) this.grabbed = false;
    if (this.grabbed) { this.p.x = clamp(pin.x, -R + 0.1, R - 0.1); this.p.y = clamp(pin.y, -R + 0.1, R - 0.1); }
    this.ball.position.copy(toV(this.p.x, this.p.y, f(this.p.x, this.p.y) + 0.14));
    if (this.solved) return;
    const [gx, gy] = grad(f, this.p.x, this.p.y), g = Math.hypot(gx, gy), H = hess(f, this.p.x, this.p.y), want = this.rounds[this.round];
    const flat = g < 0.1, type = classify(H), label = { saddle: 'saddle', max: 'peak (local max)', min: 'pit (local min)' }[type];
    this.ui.setStatus(`|∇f|=${g.toFixed(2)}  fxx=${H.fxx.toFixed(1)}  fyy=${H.fyy.toFixed(1)}  fxy=${H.fxy.toFixed(1)}  D=${H.D.toFixed(1)}  ${flat ? '-> ' + label : '(not flat)'}`, flat ? (type === want ? GOOD : WARN) : INFO);
    this.hold = flat && type === want && !this.grabbed ? this.hold + dt : 0;
    if (this.hold > 0.5) {
      this.audio.win(); this.hold = 0;
      if (this.round < this.rounds.length - 1) { this.round++; this.ui.set({ hint: `Correct. Now find a ${{ max: 'PEAK (D>0, fxx<0)', min: 'PIT (D>0, fxx>0)' }[this.rounds[this.round]]}.` }); }
      else this.solve('Saddle, peak and pit: gradient zero, Hessian decides!');
    }
  }
}

/* ------------------------------------------------------------------ THE HOLE (conservative fields & topology) */
export class Hole extends Level {
  constructor(app) {
    super(app);
    this.group.add(makeFlatBoard());
    this.F = (x, y) => { const d = x * x + y * y + 0.03; return [-y / d, x / d]; };
    this.group.add(makeArrowField(this.F, { n: 15, scale: 0.3 }));
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16), glowMat(0xff5a5a, 0.95)); hole.position.copy(toV(0, 0, 0.15)); this.group.add(hole);
    this.rounds = [
      { goal: 'Round 1: draw a loop that does NOT surround the red post. The field has zero curl everywhere, so expect Γ ≈ 0.', ok: (m) => !m.hole && Math.abs(m.circ) < 0.4 && m.area > 0.5 },
      { goal: 'Round 2: now loop AROUND the post. Same curl-free field, yet Γ = 2π ≈ 6.28!', ok: (m) => m.hole && m.circ > 5 && m.circ < 6.6 },
      { goal: 'Round 3: loop the post again with a very different size. Γ is the same: the hole decides, not the curl.', ok: (m) => m.hole && m.circ > 5 && m.circ < 6.6 && (m.area > this.lastArea * 1.6 || m.area < this.lastArea / 1.6) },
    ];
    this.round = 0; this.pts = []; this.drawing = false; this.live = null; this.lock = false; this.lastArea = 1;
    ui_set(this, '0 / 0  -  WHEN CURL ZERO IS NOT ENOUGH', 'The Hole in the Field',
      'Draw loops to measure the circulation Γ. A potential needs every loop to give 0.');
  }
  metrics(pts) {
    let circ = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], [fx, fy] = this.F((a.x + b.x) / 2, (a.y + b.y) / 2); circ += fx * (b.x - a.x) + fy * (b.y - a.y); }
    const A = polyArea(pts); if (A < 0) circ = -circ;
    return { circ, area: Math.abs(A), hole: inside(pts, 0, 0) };
  }
  redraw() {
    if (this.live) { this.group.remove(this.live); this.live.geometry.dispose(); }
    const p = this.pts.concat(this.pts.length ? [this.pts[0]] : []);
    this.live = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p.map((q) => toV(q.x, q.y, 0.06))), new THREE.LineBasicMaterial({ color: 0xffffff }));
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
        const m = this.metrics(this.pts); this.lock = true;
        if (this.rounds[this.round].ok(m)) {
          this.audio.win(); this.ui.setStatus(`Γ = ${m.circ.toFixed(2)}  - yes!`, GOOD);
          if (m.hole) this.lastArea = m.area;
          setTimeout(() => { this.lock = false; if (this.round < this.rounds.length - 1) this.round++; else this.solve('Zero curl, yet Γ = 2π: no potential exists on a domain with a hole.'); }, 1500);
        } else { this.audio.fail(); this.ui.setStatus(`Γ = ${m.circ.toFixed(2)}  - not quite. Try again.`, BAD); setTimeout(() => (this.lock = false), 900); }
      }
    }
    if (this.solved || this.lock) return;
    if (this.drawing && this.pts.length > 3) this.ui.setStatus(`Γ = ${this.metrics(this.pts).circ.toFixed(2)}`, WARN);
    else this.ui.setStatus(this.rounds[this.round].goal, INFO);
  }
}

/* ------------------------------------------------------------------ JACOBIAN (change of variables, Fubini) */
export class Jacobian extends Level {
  constructor(app) {
    super(app);
    this.group.add(makeFlatBoard());
    this.NR = 5; this.NT = 12; this.dr = 0.4; this.dt = (2 * Math.PI) / this.NT;
    this.cells = []; this.total = Math.PI * 4;
    for (let k = 0; k < this.NR; k++) for (let j = 0; j < this.NT; j++) {
      const r0 = k * this.dr + 0.01, r1 = (k + 1) * this.dr - 0.01, t0 = j * this.dt + 0.015;
      const mat = new THREE.MeshBasicMaterial({ color: (k + j) % 2 ? 0x24307a : 0x2c3a90, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 8, 1, t0, this.dt - 0.03).rotateX(-Math.PI / 2), mat); mesh.position.y = 0.02; this.group.add(mesh);
      this.cells.push({ k, j, sel: false, mat, mesh, area: 0.5 * (((k + 1) * this.dr) ** 2 - (k * this.dr) ** 2) * this.dt });
    }
    this.targets = [0.5, 0.2]; this.round = 0; this.lock = false;
    this.btn('Clear', 0, -0.08, () => { this.cells.forEach((c) => this.setSel(c, false)); });
    ui_set(this, '0 / 0  -  CHANGE OF VARIABLES', 'Why the extra r?',
      'Pinch cells to cover exactly half of the disc area. Outer cells are bigger: dA = r dr dθ.');
  }
  setSel(c, on) { c.sel = on; c.mat.color.setHex(on ? 0xffd45e : (c.k + c.j) % 2 ? 0x24307a : 0x2c3a90); }
  update(dt, pin) {
    if (pin.pressed && pin.active && !this.lock) {
      const r = Math.hypot(pin.x, pin.y);
      if (r < this.NR * this.dr) {
        const k = Math.floor(r / this.dr), j = Math.floor((((Math.atan2(pin.y, pin.x) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / this.dt);
        const c = this.cells.find((q) => q.k === k && q.j === j); if (c) { this.setSel(c, !c.sel); this.audio.grab(); }
      }
    }
    if (this.solved) return;
    const sel = this.cells.filter((c) => c.sel), area = sel.reduce((s, c) => s + c.area, 0), frac = area / this.total, want = this.targets[this.round];
    this.ui.setStatus(`${sel.length}/60 cells = ${(sel.length / 0.6).toFixed(0)}% of the cells, but ${(frac * 100).toFixed(1)}% of the area. Target ${(want * 100).toFixed(0)}% area.`, Math.abs(frac - want) < 0.015 ? GOOD : INFO);
    if (sel.length && Math.abs(frac - want) < 0.015 && !this.lock) {
      this.lock = true; this.audio.win();
      setTimeout(() => {
        if (this.round < this.targets.length - 1) { this.round++; this.cells.forEach((c) => this.setSel(c, false)); this.ui.set({ hint: `Now select cells covering exactly ${(this.targets[this.round] * 100).toFixed(0)}% of the disc area.` }); this.lock = false; }
        else this.solve('Jacobian r: area depends on how far from the origin the cell lies!');
      }, 900);
    }
  }
}

/* ------------------------------------------------------------------ GAUSS (3-D divergence theorem) */
export class Gauss extends Level {
  constructor(app) {
    super(app);
    this.group.add(makeFlatBoard());
    this.src = [{ x: -1.1, y: 0.7, z: 0.5, m: 2 }, { x: 1.2, y: -0.5, z: 0.3, m: -2 }, { x: 0.1, y: 1.3, z: 1.1, m: 1 }, { x: -0.2, y: -1.2, z: 0.2, m: -1 }];
    for (const s of this.src) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), glowMat(s.m > 0 ? 0xff7a59 : 0x59b6ff, 0.95)); m.position.copy(toV(s.x, s.y, s.z)); this.group.add(m);
      this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([toV(s.x, s.y, 0), toV(s.x, s.y, s.z)]), new THREE.LineBasicMaterial({ color: 0x8a96d8, transparent: true, opacity: 0.6 })));
    }
    this.sph = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, wireframe: true, transparent: true, opacity: 0.35 }));
    this.rim = ring(1, 0xffd45e, 0.03, 0.04); this.group.add(this.sph, this.rim);
    this.c = { x: 0, y: 0 }; this.r = 0.8; this.mode = null; this.off = { x: 0, y: 0 }; this.hold = 0;
    this.pts = []; const N = 320, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) { const z = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - z * z); this.pts.push([Math.cos(ga * i) * rr, Math.sin(ga * i) * rr, z]); }
    this.rounds = [
      { goal: 'Round 1: enclose the red +2 source only. Net flux Φ ≥ 1.7.', ok: (m) => m.phi >= 1.7 },
      { goal: 'Round 2: enclose the blue −2 sink. Φ ≤ −1.7.', ok: (m) => m.phi <= -1.7 },
      { goal: 'Round 3: a BIG sphere (r ≥ 1.3) whose net flux is zero: sources cancel sinks.', ok: (m) => this.r >= 1.3 && Math.abs(m.phi) < 0.35 && m.count >= 2 },
      { goal: 'Round 4: the small +1 source floats high above the board. Capture only it: Φ ≈ 1 (0.7 to 1.3).', ok: (m) => m.phi > 0.7 && m.phi < 1.3 && m.count === 1 },
    ];
    this.round = 0;
    ui_set(this, '0 / 0  -  GAUSS DIVERGENCE THEOREM IN 3D', 'Flux Through a Sphere',
      'Move the sphere, pinch its gold rim to resize. Flux through it = charge inside.');
  }
  Fv(x, y, z) {
    let u = 0, v = 0, w = 0;
    for (const s of this.src) { const dx = x - s.x, dy = y - s.y, dz = z - s.z, k = s.m / (4 * Math.PI * Math.pow(dx * dx + dy * dy + dz * dz + 0.01, 1.5)); u += dx * k; v += dy * k; w += dz * k; }
    return [u, v, w];
  }
  measure() {
    let phi = 0; const dA = (4 * Math.PI * this.r * this.r) / this.pts.length;
    for (const [nx, ny, nz] of this.pts) { const [u, v, w] = this.Fv(this.c.x + nx * this.r, this.c.y + ny * this.r, nz * this.r); phi += (u * nx + v * ny + w * nz) * dA; }
    const ins = this.src.filter((s) => Math.hypot(s.x - this.c.x, s.y - this.c.y, s.z) < this.r);
    return { phi, count: ins.length, div: ins.reduce((a, s) => a + s.m, 0) };
  }
  update(dt, pin) {
    if (pin.pressed && pin.active) {
      const d = dist(pin.x, pin.y, this.c.x, this.c.y);
      if (Math.abs(d - this.r) < 0.35) { this.mode = 'size'; this.audio.grab(); }
      else if (d < this.r + 0.15) { this.mode = 'move'; this.off = { x: pin.x - this.c.x, y: pin.y - this.c.y }; this.audio.grab(); }
    }
    if (!pin.down) this.mode = null;
    if (this.mode === 'size') this.r = clamp(dist(pin.x, pin.y, this.c.x, this.c.y), 0.3, 2.4);
    if (this.mode === 'move') { this.c.x = clamp(pin.x - this.off.x, -R, R); this.c.y = clamp(pin.y - this.off.y, -R, R); }
    this.sph.position.copy(toV(this.c.x, this.c.y, 0)); this.sph.scale.setScalar(this.r);
    this.rim.position.copy(toV(this.c.x, this.c.y, 0.03)); this.rim.scale.set(this.r, 1, this.r);
    if (this.solved) return;
    const m = this.measure();
    this.ui.setStatus(`Φ = ${m.phi.toFixed(2)}   ∭div F dV = ${m.div.toFixed(1)} (charge inside)   r = ${this.r.toFixed(2)}`, this.rounds[this.round].ok(m) ? GOOD : INFO);
    this.hold = !this.mode && this.rounds[this.round].ok(m) ? this.hold + dt : 0;
    if (this.hold > 0.6) {
      this.audio.win(); this.hold = 0;
      if (this.round < this.rounds.length - 1) { this.round++; this.ui.set({ hint: this.rounds[this.round].goal }); } else this.solve('Flux through the surface = charge inside. Gauss, in 3D!');
    }
  }
}

/* ------------------------------------------------------------------ HARMONIC (Laplacian, mean value, maximum principle) */
export class Harmonic extends Level {
  constructor(app) {
    super(app);
    this.f0 = (x, y) => 0.3 * (x * x - y * y);
    this.f1 = (x, y) => 0.3 * (x * x - y * y) + 0.5 * Math.exp(-((x - 1.0) ** 2 + (y + 0.9) ** 2) / 0.18);
    this.f2 = (x, y) => 0.12 * (x ** 3 - 3 * x * y * y);
    this.round = 0; this.rad = 0.8; this.c = { x: 0, y: 0.6 }; this.grabbed = false; this.seen = [];
    this.ball = makeBall(0xffd45e, 0.12); this.avg = makeBall(0xff7ad9, 0.08);
    this.loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0xffffff })); this.loop.frustumCulled = false;
    this.bound = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => toV(1.8 * Math.cos((i / 96) * 6.2832), 1.8 * Math.sin((i / 96) * 6.2832), 0.04))), new THREE.LineBasicMaterial({ color: 0x7dffb0 }));
    this.group.add(this.ball, this.avg, this.loop); this.hold = 0; this.p = { x: 0.2, y: 0.2 };
    this.setSurface(this.f0);
    ui_set(this, '0 / 0  -  LAPLACIAN & HARMONIC FUNCTIONS', 'The Average Property',
      'Drag the circle. Gold bead = f at the centre, pink = average around it. Try 3 spots.');
  }
  setSurface(f) {
    if (this.surf) { this.group.remove(this.surf); this.surf.geometry.dispose(); this.surf.material.dispose(); }
    this.f = f; this.surf = makeSurface(f); this.group.add(this.surf); this.app.surfaceFn = f;
  }
  circAvg() { let s = 0; for (let i = 0; i < 64; i++) { const t = (i / 64) * 6.2832; s += this.f(this.c.x + this.rad * Math.cos(t), this.c.y + this.rad * Math.sin(t)); } return s / 64; }
  update(dt, pin) {
    const f = this.f;
    if (this.round < 2) {
      if (pin.pressed && pin.active && dist(pin.x, pin.y, this.c.x, this.c.y) < 1.0) { this.grabbed = true; this.audio.grab(); }
      if (!pin.down && this.grabbed) { this.grabbed = false; this.released = true; }
      if (this.grabbed) { this.c.x = clamp(pin.x, -R + this.rad, R - this.rad); this.c.y = clamp(pin.y, -R + this.rad, R - this.rad); }
      const pa = this.loop.geometry.attributes.position;
      for (let i = 0; i < 64; i++) { const t = (i / 64) * 6.2832, x = this.c.x + this.rad * Math.cos(t), y = this.c.y + this.rad * Math.sin(t); pa.setXYZ(i, x, f(x, y) + 0.04, -y); }
      pa.needsUpdate = true;
      const fc = f(this.c.x, this.c.y), av = this.circAvg(), diff = av - fc;
      this.ball.position.copy(toV(this.c.x, this.c.y, fc)); this.avg.position.copy(toV(this.c.x, this.c.y, av)); this.avg.visible = true; this.loop.visible = true;
      if (this.solved) return;
      this.ui.setStatus(`f(centre) = ${fc.toFixed(3)}   average on circle = ${av.toFixed(3)}   difference ${diff.toFixed(3)}   [${this.seen.length}/3 spots]`, Math.abs(diff) < 0.01 ? GOOD : WARN);
      if (this.released) {
        this.released = false;
        if (this.round === 0 && Math.abs(diff) < 0.01 && this.seen.every((s) => dist(s.x, s.y, this.c.x, this.c.y) > 1.0)) { this.seen.push({ ...this.c }); this.audio.tick(); }
        if (this.round === 0 && this.seen.length >= 3) { this.audio.win(); this.round = 1; this.setSurface(this.f1); this.ui.set({ title: 'Find the Break', hint: 'Something hidden breaks the rule. Drag the circle until the two beads separate.', status: '' }); }
        else if (this.round === 1 && Math.abs(diff) > 0.05) {
          this.audio.win(); this.round = 2; this.setSurface(this.f2); this.group.add(this.bound); this.loop.visible = false; this.avg.visible = false;
          this.ui.set({ title: 'No Interior Peak', hint: 'Drag the bead to the highest point inside the green boundary. Where is it?', status: '' });
        }
      }
    } else {
      if (pin.pressed && pin.active && dist(pin.x, pin.y, this.p.x, this.p.y) < 0.9) { this.grabbed = true; this.audio.grab(); }
      if (!pin.down) this.grabbed = false;
      if (this.grabbed) { const d = Math.hypot(pin.x, pin.y), k = d > 1.8 ? 1.8 / d : 1; this.p.x = pin.x * k; this.p.y = pin.y * k; }
      this.ball.position.copy(toV(this.p.x, this.p.y, f(this.p.x, this.p.y) + 0.1));
      if (this.solved) return;
      const [gx, gy] = grad(f, this.p.x, this.p.y), h = f(this.p.x, this.p.y);
      this.ui.setStatus(`z = ${h.toFixed(2)}   |∇f| = ${Math.hypot(gx, gy).toFixed(2)}   distance from centre ${Math.hypot(this.p.x, this.p.y).toFixed(2)} (boundary at 1.8)`, h > 0.63 ? GOOD : INFO);
      this.hold = h > 0.63 && !this.grabbed ? this.hold + dt : 0;
      if (this.hold > 0.5) this.solve('The maximum sits on the boundary: harmonic functions have no interior peaks!');
    }
  }
}
