// Small calculus toolkit used by every level. All maths lives in "board units":
// x,y in [-R, R] with R = 2.

export const R = 2;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// numeric gradient of a scalar field f(x,y)
export function grad(f, x, y, h = 1e-3) {
  return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
}

// scalar curl (dQ/dx - dP/dy) of a planar vector field F(x,y) -> [P,Q]
export function curl(F, x, y, h = 1e-3) {
  const dQdx = (F(x + h, y)[1] - F(x - h, y)[1]) / (2 * h);
  const dPdy = (F(x, y + h)[0] - F(x, y - h)[0]) / (2 * h);
  return dQdx - dPdy;
}

// sum of gaussian bumps -> smooth landscape
export function landscape(bumps) {
  return (x, y) => {
    let s = 0;
    for (const b of bumps) {
      const dx = x - b.x, dy = y - b.y;
      s += b.a * Math.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s));
    }
    return s;
  };
}

// brute force extremum search on the board
export function extremum(f, sign = 1, n = 120, lim = R - 0.15) {
  let best = { v: -Infinity * sign, x: 0, y: 0 };
  best.v = sign > 0 ? -Infinity : Infinity;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const x = -lim + (2 * lim * i) / n, y = -lim + (2 * lim * j) / n;
    const v = f(x, y);
    if ((sign > 0 && v > best.v) || (sign < 0 && v < best.v)) best = { v, x, y };
  }
  return best;
}
