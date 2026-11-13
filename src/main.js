import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { LEVELS, PLAYABLE } from './list.js';
import { Menu } from './menu.js';
import { audit } from './comfort.js';

if (new URLSearchParams(location.search).has('emu')) await import('./emu.js');

const SCALE = 0.2; // 1 board unit = 20 cm -> a 80 cm wide board
const SAVE_KEY = 'gradient-vr-progress-v2', META_KEY = 'gradient-vr-meta-v1';
const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);

class App {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.xr.enabled = true;
    // 'local' = origin at the user's head: works for seated play without floor calibration.
    this.renderer.xr.setReferenceSpaceType('local');
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer, { optionalFeatures: ['hand-tracking'] }));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a14);
    this.scene.fog = new THREE.Fog(0x070a14, 2.5, 7);
    this.camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.02, 30);
    // desktop preview only; in VR the headset pose replaces this
    this.camera.position.set(0, 0.12, 0.6);
    this.camera.lookAt(0, -0.08, -0.85);

    // seated layout, everything within arm's reach (the "airplane seat" test)
    this.board = new THREE.Group();
    this.board.position.set(0, -0.4, -0.7);
    this.board.rotation.x = 0.5;
    this.scene.add(this.board);
    this.world = new THREE.Group();
    this.world.scale.setScalar(SCALE);
    this.board.add(this.world);

    this.audio = new Audio();
    this.ui = new UI(this.scene); this.ui.app = this;
    this.input = new Input(this);
    this.addAmbience();

    this.nav = [
      this.ui.addButton('◀ Prev', -0.36, 0.0, -0.95, () => this.go(this.idx - 1), 0.22, 0.07),
      this.ui.addButton('☰ Menu', -0.12, 0.0, -0.95, () => this.menu(), 0.22, 0.07),
      this.ui.addButton('↻ Reset', 0.12, 0.0, -0.95, () => this.go(this.idx), 0.22, 0.07),
      this.ui.addButton('Next ▶', 0.36, 0.0, -0.95, () => this.go(this.idx + 1), 0.22, 0.07),
    ];

    try { this.save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { this.save = {}; }
    try { this.meta = JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { this.meta = {}; }
    this.meta.gallery ||= []; this.meta.mastery ||= {}; this.meta.streak ||= 0; this.meta.best ||= 0;
    this.meta.access ||= { contrast: false, big: false, dwell: false }; this.applyAccess();
    this.idx = 0; this.level = null; this.t0 = performance.now(); this.surfaceFn = null;
    const q = new URLSearchParams(location.search).get('level');
    if (q === 'menu') this.menu(); else this.go(q ? Number(q) : 0);

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.audio.unlock();
      // Quest Browser defaults to 72 Hz; ask for 90 Hz (the recommended target; 120 costs too much for this scene).
      const sess = this.renderer.xr.getSession();
      try {
        const rates = sess.supportedFrameRates ? [...sess.supportedFrameRates] : [];
        const best = Math.max(0, ...rates.filter((r) => r <= 90));
        if (best > 72 && sess.updateTargetFrameRate) sess.updateTargetFrameRate(best);
      } catch { /* optional API */ }
      this.xrStart = performance.now(); this.breakShown = false;
    });
    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  addAmbience() {
    // a soft field of drifting stars so the void feels like a place
    const n = 500, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 3 + Math.random() * 4, a = Math.random() * Math.PI * 2, b = (Math.random() - 0.3) * 2;
      p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = b * 2.5; p[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8fa2ff, size: 0.03, transparent: true, opacity: 0.7 }));
    this.scene.add(this.stars);
    // table disc under the board so it feels anchored
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x0c1230, transparent: true, opacity: 0.85 }));
    disc.position.set(0, -0.015, 0); this.board.add(disc);
  }

  applyAccess() {
    const a = this.meta.access; this.ui.setAccess(a);
    this.scene.background = new THREE.Color(a.contrast ? 0x000000 : 0x070a14);
    this.scene.fog = a.contrast ? null : new THREE.Fog(0x070a14, 2.5, 7);
    if (this.stars) this.stars.visible = !a.contrast;
  }
  toggleAccess(k) { this.meta.access[k] = !this.meta.access[k]; this.saveMeta(); this.applyAccess(); }

  saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(this.meta)); } catch { /* private mode */ } }
  // streak = consecutive days with at least one solved level; shown in the menu and panel footer
  get streak() { const d = dayNum(); return this.meta.last === d || this.meta.last === d - 1 ? this.meta.streak : 0; }
  touchStreak() {
    const d = dayNum(), m = this.meta; if (m.last === d) return;
    m.streak = m.last === d - 1 ? m.streak + 1 : 1; m.last = d; m.best = Math.max(m.best, m.streak); this.saveMeta();
  }
  recordArchitect(entry) {
    const m = this.meta, key = `${entry.topic}:${entry.diff}`;
    m.mastery[key] = (m.mastery[key] || 0) + 1;
    if (!m.gallery.some((g) => JSON.stringify(g.spec) === JSON.stringify(entry.spec))) m.gallery.unshift(entry);
    m.gallery = m.gallery.slice(0, 12); this.saveMeta();
  }
  masteryTier(topic) { return ['easy', 'normal', 'trap'].filter((d) => this.meta.mastery[`${topic}:${d}`]).length; }

  starsFor(name) { const s = this.save[name]; return s ? s.stars : 0; }
  get solvedCount() { return LEVELS.filter((l) => !l.ref && this.save[l.name]).length; }

  clearLevel() {
    if (this.level) this.level.dispose();
    this.audio.stopTone(); this.surfaceFn = null;
  }

  setNav(on) { for (const b of this.nav) b.mesh.visible = on; }

  menu() {
    this.clearLevel(); this.setNav(false); // Prev/Reset/Next make no sense on the menu; frees room inside the comfort zone
    this.idx = -1; this.badgePrefix = '';
    this.level = new Menu(this);
    this.updateProgress();
  }

  go(i) {
    this.clearLevel(); this.setNav(true);
    this.idx = (i + LEVELS.length) % LEVELS.length;
    this.badgePrefix = this.idx === 0 ? '' : `${this.idx} / ${PLAYABLE - 1}  -  `;
    this.level = LEVELS[this.idx].make(this);
    this.levelStart = performance.now();
    this.updateProgress();
  }

  updateProgress() {
    const cur = this.idx >= 0 ? LEVELS[this.idx].name : 'Menu';
    const dots = LEVELS.filter((l) => !l.ref).map((l, i) => (this.save[l.name] ? '●' : i === this.idx ? '◉' : '○')).join('');
    this.ui.state.progress = `${dots}   ${this.solvedCount}/${PLAYABLE} solved  -  ${cur}${this.streak ? `  -  ${this.streak}-day streak` : ''}`;
    this.ui.draw();
  }

  onSolved() {
    const name = LEVELS[this.idx].name, secs = Math.round((performance.now() - this.levelStart) / 1000);
    const stars = secs <= 90 ? 3 : secs <= 200 ? 2 : 1, prev = this.save[name];
    this.save[name] = { stars: Math.max(stars, prev ? prev.stars : 0), best: prev ? Math.min(prev.best, secs) : secs };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch { /* private mode */ }
    this.touchStreak(); this.updateProgress();
    if (this.solvedCount === PLAYABLE) {
      const total = Math.round((performance.now() - this.t0) / 1000);
      setTimeout(() => this.ui.set({ badge: `ALL ${PLAYABLE} SOLVED`, title: 'Calculus, touched.', hint: 'You moved a gradient, tuned a descent, built a volume, bent a divergence, found zero curl, read the Hessian, looped a field with a hole, sliced a disc with the Jacobian, caught flux in a sphere, averaged a harmonic function and met Lagrange. Open the Menu for free play, or come back tomorrow for a new Daily Basin.', status: `${this.save[name].stars ? '★'.repeat(this.save[name].stars) : ''}  session time ${Math.floor(total / 60)}m ${total % 60}s`, color: '#8dffb0' }), 2200);
    } else {
      setTimeout(() => { if (this.level.solved) this.ui.set({ hint: `Solved in ${secs}s  ${'★'.repeat(stars)}  -  pinch "Next ▶" to continue, or open the Menu.` }); }, 1800);
    }
  }

  frame() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05); this.last = now;
    this.input.update();
    const pin = this.input.pointer();
    if (this.ui.update(this.input, dt)) pin.pressed = false;
    this.level.update(dt, pin);
    // gentle break reminder after 25 minutes in VR (comfort guideline), shown once per session
    if (this.xrStart && !this.breakShown && now - this.xrStart > 25 * 60 * 1000) {
      this.breakShown = true; this.ui.setStatus('You have been playing 25 minutes - a short break is a good idea.', '#ffd45e');
    }
    this.stars.rotation.y += dt * 0.01;
    this.renderer.render(this.scene, this.camera);
  }
}

window.app = new App();
window.comfort = () => audit(window.app); // dev helper: UI angles vs the comfort budget
