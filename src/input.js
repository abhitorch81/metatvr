import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

const PINCH_ON = 0.028, PINCH_OFF = 0.045;

// One unified "pinch pointer". In VR it is the midpoint between thumb and index fingertips of the
// hand that is tracked / pinching (hands only - no controllers needed). On desktop it is the mouse.
export class Input {
  constructor(app) {
    this.app = app;
    this.xr = false;
    this.tipW = new THREE.Vector3();
    this.active = false;
    this.down = false; this.pressed = false; this.released = false;
    this.ray = new THREE.Raycaster();
    this.hoverRay = false;
    this.mouse = new THREE.Vector2(); this.mouseDown = false;
    this._prev = false;

    const factory = new XRHandModelFactory();
    this.hands = [0, 1].map((i) => {
      const hand = app.renderer.xr.getHand(i);
      hand.add(factory.createHandModel(hand, 'spheres'));
      app.scene.add(hand);
      const st = { hand, pinching: false };
      hand.addEventListener('connected', (e) => { st.handedness = e.data.handedness; });
      return st;
    });

    // Ray fallback: Meta VR Glasses use gaze-pinch (a target ray + select event instead of hand joints),
    // and controllers / jointless hands behave the same way. Joints win when available.
    this.useRay = false;
    this.ctrls = [0, 1].map((i) => {
      const c = app.renderer.xr.getController(i); app.scene.add(c);
      const st = { c, sel: false };
      c.addEventListener('selectstart', () => { st.sel = true; });
      c.addEventListener('selectend', () => { st.sel = false; });
      c.addEventListener('disconnected', () => { st.sel = false; });
      return st;
    });
    this.cursor = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.cursor.visible = false; app.scene.add(this.cursor);

    const el = app.renderer.domElement;
    const setMouse = (e) => {
      const r = el.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.hoverRay = true;
    };
    el.addEventListener('pointermove', setMouse);
    el.addEventListener('pointerdown', (e) => { setMouse(e); this.mouseDown = true; app.audio.unlock(); });
    window.addEventListener('pointerup', () => { this.mouseDown = false; });
    el.addEventListener('pointerleave', () => { this.hoverRay = false; this.mouseDown = false; });
  }

  update() {
    const app = this.app;
    this.xr = app.renderer.xr.isPresenting;
    this._prev = this.down;
    if (this.xr) {
      let best = null, bestScore = Infinity;
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      for (const st of this.hands) {
        const idx = st.hand.joints?.['index-finger-tip'], thb = st.hand.joints?.['thumb-tip'];
        st.tracked = !!(idx && thb && idx.visible && thb.visible);
        if (!st.tracked) { st.pinching = false; continue; }
        idx.getWorldPosition(a); thb.getWorldPosition(b);
        const d = a.distanceTo(b);
        st.pinching = st.pinching ? d < PINCH_OFF : d < PINCH_ON;
        st.mid = a.clone().add(b).multiplyScalar(0.5);
        // prefer a pinching hand, then the hand nearest the board
        const score = (st.pinching ? 0 : 10) + st.mid.distanceTo(app.board.position) + (st === this.primary ? -0.3 : 0);
        if (score < bestScore) { bestScore = score; best = st; }
      }
      this.primary = best;
      this.active = !!best;
      if (best) { this.tipW.copy(best.mid); this.down = best.pinching; this.useRay = false; }
      else {
        // stick to whichever pointer last pressed select; default to the right-hand one
        let pick = this.ctrls.find((st) => st.c.visible && st.sel) || null;
        if (pick) this.lastCtrl = pick;
        else if (this.lastCtrl && this.lastCtrl.c.visible) pick = this.lastCtrl;
        else pick = [...this.ctrls].reverse().find((st) => st.c.visible) || null;
        if (pick) {
          this.useRay = true;
          const o = new THREE.Vector3(), q = new THREE.Quaternion();
          pick.c.getWorldPosition(o); pick.c.getWorldQuaternion(q);
          this.ray.set(o, new THREE.Vector3(0, 0, -1).applyQuaternion(q));
          this.active = this.boardHit(); this.down = pick.sel;
        } else { this.useRay = false; this.active = false; this.down = false; }
      }
      this.cursor.visible = this.useRay && this.active; if (this.cursor.visible) this.cursor.position.copy(this.tipW);
    } else {
      this.primary = null;
      this.active = this.hoverRay;
      this.down = this.mouseDown;
      this.ray.setFromCamera(this.mouse, app.camera);
      this.useRay = this.hoverRay;
      if (!this.boardHit()) this.active = false;
      this.cursor.visible = false;
    }
    if (this.script) { // demo mode: a scripted virtual hand overrides the real pointer
      this.active = true; this.useRay = false; this.tipW.copy(this.script.p); this.down = this.script.down; this.cursor.visible = true;
      this.cursor.position.copy(this.tipW); this.cursor.scale.setScalar(this.down ? 0.5 : 0.9); this.cursor.material.color.set(this.down ? 0xffd45e : 0xffffff);
    }
    this.pressed = this.down && !this._prev;
    this.released = !this.down && this._prev;
  }

  // Intersect this.ray with the board (and the landscape if the level has one) -> this.tipW
  boardHit() {
    const app = this.app;
    const n = new THREE.Vector3(0, 1, 0).transformDirection(app.world.matrixWorld);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, app.board.position);
    if (!this.ray.ray.intersectPlane(plane, this.tipW)) return false;
    if (app.surfaceFn) this.marchSurface(app.surfaceFn);
    return true;
  }

  // Slide a ray along the landscape along the landscape so you grab what you see, not the flat plane.
  marchSurface(f) {
    const w = this.app.world, inv = new THREE.Matrix4().copy(w.matrixWorld).invert();
    const o = this.ray.ray.origin.clone().applyMatrix4(inv);
    const d = this.ray.ray.origin.clone().add(this.ray.ray.direction).applyMatrix4(inv).sub(o).normalize();
    const p = new THREE.Vector3();
    for (let t = 0; t < 40; t += 0.03) {
      p.copy(d).multiplyScalar(t).add(o);
      if (Math.abs(p.x) <= 2 && Math.abs(p.z) <= 2 && p.y <= f(p.x, -p.z)) { this.tipW.copy(w.localToWorld(p)); return; }
    }
  }

  // pointer in board (math) coordinates
  pointer() {
    const l = this.app.world.worldToLocal(this.tipW.clone());
    return { active: this.active, x: l.x, y: -l.z, h: l.y, down: this.down, pressed: this.pressed, released: this.released };
  }
}
