// Comfort audit: where does each piece of UI sit in the player's view? Angles are measured from the
// eye (head at the origin of the 'local' reference space, looking down -z), in degrees.
// Budget (typical VR guidance, tuned for the narrower Quest 2 as well as Quest 3):
//   essential UI  : azimuth within +-30, elevation from -30 up to +20
//   board content : azimuth within +-40, elevation from -55 up to +10
import * as THREE from 'three';

export const BUDGET = { ui: { az: 30, lo: -30, hi: 20 }, board: { az: 40, lo: -55, hi: 10 } };

const deg = (r) => (r * 180) / Math.PI;

function corners(mesh) {
  const g = mesh.geometry; g.computeBoundingBox(); const b = g.boundingBox, out = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) out.push(new THREE.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld));
  return out;
}

export function angles(meshes) {
  let az = 0, lo = Infinity, hi = -Infinity;
  for (const m of meshes) { m.updateWorldMatrix(true, false); for (const p of corners(m)) {
    az = Math.max(az, Math.abs(deg(Math.atan2(p.x, -p.z)))); const el = deg(Math.atan2(p.y, Math.hypot(p.x, p.z))); lo = Math.min(lo, el); hi = Math.max(hi, el); } }
  return { az: +az.toFixed(1), lo: +lo.toFixed(1), hi: +hi.toFixed(1) };
}

// returns {panel, buttons, worst:[labels outside budget]}
export function audit(app) {
  const ui = app.ui, B = BUDGET.ui, bad = [];
  const panel = angles([ui.panel]);
  const items = ui.buttons.filter((b) => b.mesh.visible).map((b) => ({ label: b.label, ...angles([b.mesh]) }));
  const outside = (a) => a.az > B.az || a.lo < B.lo || a.hi > B.hi;
  if (outside(panel)) bad.push('panel');
  for (const it of items) if (outside(it)) bad.push(`${it.label} (az ${it.az}, el ${it.lo}..${it.hi})`);
  return { panel, buttons: items.length, extent: angles([ui.panel, ...ui.buttons.map((b) => b.mesh)]), bad };
}
