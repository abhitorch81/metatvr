import * as THREE from 'three';

// Everything is scaled about the head by REACH: angular size and field-of-view layout stay identical, but the
// buttons sit 20% closer so a seated hand reaches them (arm reach is about 0.6-0.7 m).
export const REACH = 0.8;

function wrap(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// Floating info panel + pinch-able buttons. Everything is canvas-textured so there are no assets.
export class UI {
  constructor(parent) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280; this.canvas.height = 800;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.45),
      new THREE.MeshBasicMaterial({ map: this.tex, transparent: true }));
    this.panel.position.set(0, 0.25, -1.0);
    this.group.add(this.panel);
    // Comfort: the whole UI sits 12 cm lower so the top of the panel stays under +20 degrees of gaze elevation.
    this.group.position.y = -0.12 * REACH; this.group.scale.setScalar(REACH);
    this.access = { contrast: false, big: false, dwell: false }; this.dwellT = 1.1;
    this.gaze = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    this.gaze.renderOrder = 99; this.gaze.visible = false; this.group.add(this.gaze);
    this.state = { title: '', hint: '', status: '', badge: '', color: '#9fe8ff', progress: '' };
    this.buttons = [];
  }

  set(p) { Object.assign(this.state, p); this.draw(); }
  setStatus(status, color) {
    if (status === this.state.status && (!color || color === this.state.color)) return;
    this.state.status = status; if (color) this.state.color = color; this.draw();
  }

  draw() {
    const { ctx, canvas } = this, s = this.state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    roundRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 44);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const hc = this.access.contrast;
    g.addColorStop(0, hc ? '#000' : 'rgba(14,20,52,0.93)'); g.addColorStop(1, hc ? '#000' : 'rgba(8,10,28,0.93)');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = hc ? 8 : 4; ctx.strokeStyle = hc ? '#fff' : 'rgba(140,165,255,0.45)'; ctx.stroke();
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffd45e'; ctx.font = '600 38px system-ui, sans-serif';
    ctx.fillText(s.badge, 64, 92);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 78px system-ui, sans-serif';
    ctx.fillText(s.title, 64, 180);
    ctx.fillStyle = hc ? '#fff' : '#c9d3ff'; const big = this.access.big; ctx.font = `${hc ? 600 : 400} ${big ? 56 : 46}px system-ui, sans-serif`;
    wrap(ctx, s.hint, 64, 262, canvas.width - 128, big ? 70 : 62);
    ctx.fillStyle = s.color; ctx.font = '600 44px ui-monospace, Consolas, monospace';
    wrap(ctx, s.status, 64, canvas.height - 125, canvas.width - 128, 54);
    ctx.fillStyle = hc ? '#ddd' : '#7f8bc4'; ctx.font = '400 32px system-ui, sans-serif';
    ctx.fillText(s.progress, 64, canvas.height - 40);
    this.tex.needsUpdate = true;
  }

  addButton(label, x, y, z, cb, w = 0.2, h = 0.07, rotY = 0) {
    const c = document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * h / w);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotY; mesh.renderOrder = 10; mesh.material.depthWrite = false; mesh.material.depthTest = false;
    const b = { mesh, cb, c, tex, label, hover: false, active: false, prog: 0 };
    this.paintButton(b); this.group.add(mesh); this.buttons.push(b);
    return b;
  }
  paintButton(b) {
    const { c } = b, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    roundRect(ctx, 4, 4, c.width - 8, c.height - 8, c.height / 2.2);
    const hc = this.access.contrast;
    ctx.fillStyle = b.active ? (hc ? '#ffee00' : 'rgba(255,212,94,0.95)') : b.hover ? (hc ? '#00b7ff' : 'rgba(110,140,255,0.95)') : (hc ? '#000' : 'rgba(30,40,95,0.92)');
    ctx.fill();
    if (b.prog > 0) { ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(0, 0, c.width * b.prog, c.height); ctx.restore(); }
    ctx.lineWidth = hc ? 8 : 4; ctx.strokeStyle = hc ? '#fff' : 'rgba(160,180,255,0.7)'; ctx.stroke();
    ctx.fillStyle = b.active ? '#1b1b1b' : (hc && b.hover ? '#000' : '#fff');
    let fs = Math.round(c.height * 0.46); ctx.font = `700 ${fs}px system-ui, sans-serif`;
    while (fs > 14 && ctx.measureText(b.label).width > c.width * 0.9) { fs -= 2; ctx.font = `700 ${fs}px system-ui, sans-serif`; } // keep long labels inside the button
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.label, c.width / 2, c.height / 2 + 3);
    b.tex.needsUpdate = true;
  }
  setActive(b, on) { if (b.active !== on) { b.active = on; this.paintButton(b); } }
  removeButton(b) {
    this.group.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); b.tex.dispose();
    this.buttons = this.buttons.filter((x) => x !== b);
  }

  flash(b) { b.active = !b.active; this.paintButton(b); setTimeout(() => { b.active = !b.active; this.paintButton(b); }, 130); }

  setAccess(a) { Object.assign(this.access, a); this.draw(); this.buttons.forEach((b) => this.paintButton(b)); }

  // Returns true if a button consumed this frame's press. With dwell on, resting the pointer (hand,
  // mouse, or head gaze when no hand is visible) on a button for ~1 s selects it: no pinch needed.
  update(input, dt = 0.016) {
    const wp = new THREE.Vector3(), dwell = this.access.dwell;
    let consumed = false, gazeRay = null;
    if (dwell && input.xr && !input.active && this.app) {
      const cam = this.app.renderer.xr.getCamera(); const o = new THREE.Vector3(), d = new THREE.Vector3(0, 0, -1);
      cam.getWorldPosition(o); d.applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
      gazeRay = new THREE.Raycaster(o, d);
    }
    let gazeHit = null, nearest = null;
    if (!gazeRay && !input.useRay && (input.xr || input.script) && input.active) { // only the closest button counts, so neighbours never fire together
      let bd = 0.085; for (const b of this.buttons) { if (!b.mesh.visible) continue; const d = input.tipW.distanceTo(b.mesh.getWorldPosition(wp)); if (d < bd) { bd = d; nearest = b; } }
    }
    for (const b of this.buttons) {
      if (!b.mesh.visible) { b.hover = false; continue; }
      let near = false;
      b.mesh.getWorldPosition(wp);
      if (gazeRay) { const h = gazeRay.intersectObject(b.mesh); near = h.length > 0; if (near) gazeHit = h[0].point; }
      else if (input.useRay) near = input.ray.intersectObject(b.mesh).length > 0;
      else if (input.xr || input.script) near = b === nearest;
      if (near !== b.hover) { b.hover = near; b.prog = 0; this.paintButton(b); }
      if (near && input.pressed) { consumed = true; b.cb(); this.flash(b); b.prog = 0; }
      else if (near && dwell && !input.down) {
        b.dwellT = (b.dwellT || 0) + dt; const pr = Math.min(1, b.dwellT / this.dwellT);
        if (Math.abs(pr - b.prog) > 0.08) { b.prog = pr; this.paintButton(b); }
        if (b.dwellT >= this.dwellT) { b.dwellT = -1.5; b.prog = 0; consumed = true; b.cb(); this.flash(b); }
      } else if (!near) { b.dwellT = 0; }
    }
    if (gazeRay) { this.gaze.visible = true; this.group.worldToLocal(this.gaze.position.copy(gazeHit || gazeRay.ray.at(0.9, new THREE.Vector3()))); } else this.gaze.visible = false;
    return consumed;
  }
}
