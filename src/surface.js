import * as THREE from 'three';
import { R } from './math.js';

// Coordinate convention inside `world`: math (x, y, z=f) -> three (x, f, -y).

const VERT = /* glsl */ `
  varying float vH; varying vec3 vN; varying vec2 vXY;
  void main(){
    vH = position.y; vXY = position.xz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const FRAG = /* glsl */ `
  uniform float uMin; uniform float uMax; uniform float uLevels;
  varying float vH; varying vec3 vN; varying vec2 vXY;
  vec3 pal(float t){
    vec3 a = vec3(0.10,0.13,0.48), b = vec3(0.04,0.62,0.66), c = vec3(0.98,0.88,0.25);
    return t < 0.5 ? mix(a, b, t*2.0) : mix(b, c, (t-0.5)*2.0);
  }
  void main(){
    float t = clamp((vH - uMin) / max(uMax - uMin, 1e-3), 0.0, 1.0);
    vec3 col = pal(t);
    float k = vH * uLevels;
    float d = abs(fract(k - 0.5) - 0.5) / max(fwidth(k), 1e-4);
    float line = 1.0 - clamp(d, 0.0, 1.0);
    float lam = clamp(dot(normalize(vN), normalize(vec3(0.3, 0.8, 0.5))) * 0.5 + 0.55, 0.35, 1.1);
    col = mix(col * lam, vec3(0.95, 0.97, 1.0), line * 0.75);
    float edge = max(abs(vXY.x), abs(vXY.y));
    col = mix(col, vec3(1.0), smoothstep(${R.toFixed(2)} - 0.03, ${R.toFixed(2)}, edge) * 0.6);
    gl_FragColor = vec4(col, 1.0);
  }`;

// Surface z = f(x,y) with colour map + contour lines (level curves).
export function makeSurface(f, { n = 110, levels = 4.0 } = {}) {
  const geo = new THREE.PlaneGeometry(2 * R, 2 * R, n, n);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const h = f(pos.getX(i), -pos.getZ(i));
    pos.setY(i, h); mn = Math.min(mn, h); mx = Math.max(mx, h);
  }
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    uniforms: { uMin: { value: mn }, uMax: { value: mx }, uLevels: { value: levels } },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData = { min: mn, max: mx };
  return mesh;
}

// Flat board with a faint grid for planar vector-field levels.
export function makeFlatBoard() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x0b1030, side: THREE.DoubleSide }));
  base.position.y = -0.01;
  const grid = new THREE.GridHelper(2 * R, 16, 0x5c6cc8, 0x2a3470);
  grid.material.transparent = true; grid.material.opacity = 0.7;
  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(2 * R, 2 * R).rotateX(-Math.PI / 2)),
    new THREE.LineBasicMaterial({ color: 0xaab6ff }));
  g.add(base, grid, border);
  return g;
}

// Arrow glyph field: draws F as little coloured arrows on the board plane.
export function makeArrowField(F, { n = 13, lim = R - 0.2, scale = 0.32, h = 0.02 } = {}) {
  const pts = [], cols = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = -lim + (2 * lim * i) / (n - 1), y = -lim + (2 * lim * j) / (n - 1);
    const [p, q] = F(x, y), m = Math.hypot(p, q);
    if (m < 1e-3) continue;
    const L = Math.min(0.34, m * scale), ux = p / m, uy = q / m;
    const x0 = x - (ux * L) / 2, y0 = y - (uy * L) / 2, x1 = x + (ux * L) / 2, y1 = y + (uy * L) / 2;
    const hl = L * 0.35, nx = -uy, ny = ux;
    const A = [x0, y0, x1, y1, x1, y1, x1 - ux * hl + nx * hl * 0.6, y1 - uy * hl + ny * hl * 0.6,
      x1, y1, x1 - ux * hl - nx * hl * 0.6, y1 - uy * hl - ny * hl * 0.6];
    for (let k = 0; k < 6; k++) pts.push(A[k * 2], h, -A[k * 2 + 1]);
    c.setHSL(0.62 - Math.min(1, m / 2.2) * 0.55, 0.9, 0.62);
    for (let k = 0; k < 6; k++) cols.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
}

export const toV = (x, y, h = 0) => new THREE.Vector3(x, h, -y);

export function glowMat(color, opacity = 0.9) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
}

export function ring(r, color, h = 0.03, w = 0.05) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r - w, r, 64).rotateX(-Math.PI / 2), glowMat(color, 0.85));
  m.material.side = THREE.DoubleSide; m.position.y = h;
  return m;
}
