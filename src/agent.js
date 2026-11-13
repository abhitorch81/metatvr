// The Field Architect: an agent that DESIGNS levels, then CHECKS them with a simulator, then REVISES.
//   propose (generator)  ->  verify (solver / simulator)  ->  revise (feedback) -> ... -> accept
// The agent only ever produces DATA (a level spec). The game engine interprets that data, and
// `sanitizeSpec` clamps everything, so a spec can never run code. A cloud model can be plugged in
// through `proposeCloud` (same spec format, same verifier); without it the local generator is used.
import { R, clamp, dist, grad, landscape, extremum, rng } from './math.js';

export const TOPICS = ['basin', 'summit', 'flux'];
export const DIFFS = ['easy', 'normal', 'trap'];

/* ------------------------------------------------------------------ BASIN (gradient flow) */
const BASIN_BAND = { easy: [0.4, 0.75], normal: [0.2, 0.45], trap: [0.06, 0.2] };

export function flowEnd(f, x, y) {
  let px = x, py = y;
  for (let i = 0; i < 500; i++) {
    const [gx, gy] = grad(f, px, py);
    if (Math.hypot(gx, gy) < 0.04 && i > 2) break;
    px = clamp(px - gx * 0.11, -R + 0.05, R - 0.05); py = clamp(py - gy * 0.11, -R + 0.05, R - 0.05);
  }
  return [px, py];
}

export function verifyBasin(spec) {
  const f = landscape(spec.bumps), low = extremum(f, -1);
  let ok = 0, total = 0, sample = null, sd = -1;
  const ends = new Set();
  for (let x = -1.8; x <= 1.81; x += 0.3) for (let y = -1.8; y <= 1.81; y += 0.3) {
    total++; const [ex, ey] = flowEnd(f, x, y);
    ends.add(`${Math.round(ex * 2)},${Math.round(ey * 2)}`);
    if (dist(ex, ey, low.x, low.y) < 0.5) { ok++; const d = dist(x, y, low.x, low.y); if (d > sd) { sd = d; sample = { x, y }; } }
  }
  return { frac: ok / total, basins: ends.size, sample, low };
}

function genBasin(r, diff, bias) {
  const nd = diff === 'easy' ? 1 : diff === 'normal' ? 2 : 3, pts = [];
  const place = (minD) => {
    for (let t = 0; t < 60; t++) {
      const p = { x: (r() - 0.5) * 3.0, y: (r() - 0.5) * 3.0 };
      if (pts.every((q) => dist(p.x, p.y, q.x, q.y) > minD)) { pts.push(p); return p; }
    }
    const p = { x: (r() - 0.5) * 3.0, y: (r() - 0.5) * 3.0 }; pts.push(p); return p;
  };
  const bumps = [], tp = place(1.2);
  bumps.push({ a: -(1.05 + r() * 0.35), x: tp.x, y: tp.y, s: clamp(0.55 + bias * 0.22 - (diff === 'trap' ? 0.08 : 0), 0.3, 0.95) });
  for (let i = 0; i < nd; i++) {
    const p = place(1.2);
    bumps.push({ a: -(0.6 + r() * 0.35), x: p.x, y: p.y, s: clamp(0.5 + r() * 0.2 - bias * 0.12 + (diff === 'trap' ? 0.12 : 0), 0.35, 1.0) });
  }
  const nh = 1 + (r() < 0.6 ? 1 : 0);
  for (let i = 0; i < nh; i++) { const p = place(0.8); bumps.push({ a: 0.5 + r() * 0.5, x: p.x, y: p.y, s: 0.55 + r() * 0.25 }); }
  return { kind: 'basin', bumps };
}

/* ------------------------------------------------------------------ SUMMIT (global vs local maximum) */
const SUMMIT_BAND = { easy: [0.4, 0.72], normal: [0.72, 0.86], trap: [0.86, 0.94] };

export function verifySummit(spec) {
  const f = landscape(spec.bumps), top = extremum(f, 1);
  let second = -Infinity;
  for (let x = -1.85; x <= 1.86; x += 0.1) for (let y = -1.85; y <= 1.86; y += 0.1) {
    if (dist(x, y, top.x, top.y) < 1.1) continue;
    const v = f(x, y);
    if (v > f(x + 0.1, y) && v > f(x - 0.1, y) && v > f(x, y + 0.1) && v > f(x, y - 0.1)) second = Math.max(second, v);
  }
  return { top, second, ratio: second > -Infinity ? second / top.v : 0 };
}

function genSummit(r, diff, bias) {
  const mid = { easy: 0.55, normal: 0.79, trap: 0.9 }[diff];
  const ta = 1.0 + r() * 0.3, P = { x: (r() - 0.5) * 2.4, y: (r() - 0.5) * 2.4 };
  let Q; for (let t = 0; t < 60; t++) { Q = { x: (r() - 0.5) * 3.4, y: (r() - 0.5) * 3.4 }; if (dist(P.x, P.y, Q.x, Q.y) > 1.8) break; }
  const bumps = [{ a: ta, x: P.x, y: P.y, s: 0.6 + r() * 0.15 }, { a: ta * (mid + bias * 0.06), x: Q.x, y: Q.y, s: diff === 'trap' ? 0.95 : 0.7 }];
  if (r() < 0.7) bumps.push({ a: -(0.4 + r() * 0.4), x: (r() - 0.5) * 3, y: (r() - 0.5) * 3, s: 0.6 });
  return { kind: 'summit', bumps };
}

/* ------------------------------------------------------------------ FLUX (sources / sinks) */
const FLUX_BAND = { easy: [0.12, 0.5], normal: [0.03, 0.12], trap: [0.008, 0.04] };
const FLUX_NOPLACE = 1.0;

export function simFlux(spec, srcs) {
  const N = 100, dt = 0.05, r = rng(7), px = new Float32Array(N), py = new Float32Array(N), live = new Uint8Array(N);
  for (let i = 0; i < N; i++) { px[i] = -1.8; py[i] = -0.9 + (r() - 0.5) * 0.3; }
  let hits = 0;
  for (let step = 0; step < 440; step++) {
    const emit = Math.min(N, Math.floor(step * dt / 0.06) + 1);
    for (let i = 0; i < emit; i++) {
      if (live[i] === 2) continue;
      let x = px[i], y = py[i], u = spec.wind, v = 0;
      for (const s of srcs) { const dx = x - s.x, dy = y - s.y, k = (s.m * 2.6) / 6.2832 / (dx * dx + dy * dy + 0.06); u += dx * k; v += dy * k; }
      x += u * dt; y += v * dt; px[i] = x; py[i] = y;
      if (dist(x, y, spec.target.x, spec.target.y) < spec.target.r) { live[i] = 2; hits++; continue; }
      if (Math.abs(x) > R + 0.1 || Math.abs(y) > R + 0.1 || srcs.some((s) => s.m < 0 && dist(x, y, s.x, s.y) < 0.18)) live[i] = 2;
    }
  }
  return hits;
}

export async function verifyFlux(spec, yieldFn) {
  const g = []; for (let x = -1.8; x <= 1.81; x += 0.9) for (let y = -1.8; y <= 1.81; y += 0.9) if (dist(x, y, spec.target.x, spec.target.y) > FLUX_NOPLACE) g.push([x, y]);
  let single = false, ok = 0, tot = 0, best = null;
  for (const [x, y] of g) for (const m of [1, -1]) if (simFlux(spec, [{ x, y, m }]) >= 60) single = true;
  for (const [sx, sy] of g) {
    for (const [kx, ky] of g) {
      tot++; const h = simFlux(spec, [{ x: sx, y: sy, m: 1 }, { x: kx, y: ky, m: -1 }]);
      if (h >= 60) { ok++; if (!best || h > best.h) best = { h, a: { x: sx, y: sy }, b: { x: kx, y: ky } }; }
    }
    if (yieldFn) await yieldFn();
  }
  return { frac: tot ? ok / tot : 0, single, best };
}

function genFlux(r, diff, bias) {
  // difficulty comes mostly from how far the target sits from the incoming stream (y ~ -0.9)
  const base = { easy: -1.0, normal: 0.7, trap: 1.15 }[diff];
  const y = clamp(base + (r() - 0.5) * 0.4 + bias * 0.35, -1.5, 1.6);
  return { kind: 'flux', wind: 0.5 + r() * 0.2, target: { x: 0.7 + r() * 0.9, y, r: 0.38 } };
}

/* ------------------------------------------------------------------ the agent loop */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sanitise ANY spec (from the local generator or a cloud model): clamp, cap, drop unknown fields.
export function sanitizeSpec(raw) {
  if (!raw || !TOPICS.includes(raw.kind)) return null;
  const num = (v, lo, hi, d) => (Number.isFinite(v) ? clamp(v, lo, hi) : d);
  if (raw.kind === 'flux') {
    const t = raw.target || {};
    return { kind: 'flux', wind: num(raw.wind, 0.3, 1.0, 0.6), target: { x: num(t.x, -1.6, 1.6, 1.2), y: num(t.y, -1.6, 1.6, 1), r: num(t.r, 0.3, 0.5, 0.38) } };
  }
  if (!Array.isArray(raw.bumps) || raw.bumps.length < 2 || raw.bumps.length > 8) return null;
  return { kind: raw.kind, bumps: raw.bumps.map((b) => ({ a: num(b.a, -1.6, 1.6, 0), x: num(b.x, -1.9, 1.9, 0), y: num(b.y, -1.9, 1.9, 0), s: num(b.s, 0.3, 1.1, 0.6) })) };
}

// Optional cloud brain (OpenAI via our own server, so the key never reaches the browser).
// In dev the Vite proxy forwards /api/agent to `npm run agent`; in production set VITE_AGENT_URL.
const AGENT_URL = (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_AGENT_URL || (import.meta.env.DEV ? '/api/agent' : ''))) || '';
let cloudDown = 0; // time of last failure; we back off for 60 s so the game never stalls

async function callCloud(payload, ms = 9000) {
  if (!AGENT_URL || Date.now() - cloudDown < 60000) return null;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    const res = await fetch(AGENT_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
    clearTimeout(t); if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch { cloudDown = Date.now(); return null; }
}

async function proposeCloud(req) {
  const out = await callCloud({ mode: 'design', ...req });
  const spec = out && sanitizeSpec(out.spec && { ...out.spec, kind: req.topic });
  return spec ? { spec, name: out.name || '', idea: out.idea || '' } : null;
}

// Natural-language coach hint from the LLM (falls back to the local hint when offline).
export async function coachCloud(topic, hintFacts, seconds) {
  const out = await callCloud({ mode: 'coach', topic, hintFacts, seconds }, 6000);
  return out && typeof out.hint === 'string' ? out.hint.slice(0, 200) : null;
}

/**
 * Design a level. `say(text)` narrates each step so the player can watch the agent think.
 * Returns { spec, info } where info carries verifier results (used by the coach).
 */
export async function architect({ topic, diff, seed = Date.now() % 100000, say = () => {}, pause = true }) {
  const r = rng(seed), wait = (ms) => (pause ? sleep(ms) : Promise.resolve());
  let bias = 0, best = null, feedback = '', prev = null;
  const names = { basin: 'gradient-flow basins', summit: 'summits', flux: 'sources and sinks' };
  await say(`Goal: ${diff === 'easy' ? 'an' : 'a'} ${diff} level about ${names[topic]}.`); await wait(500);
  for (let round = 1; round <= 5; round++) {
    let spec = null, source = 'local', idea = '', name = '';
    const cloud = round <= 3 ? await proposeCloud({ topic, diff, round, feedback, prev }) : null; // late rounds fall back to the local generator
    if (cloud) { spec = cloud.spec; source = 'OpenAI'; idea = cloud.idea; name = cloud.name; }
    if (!spec) spec = topic === 'basin' ? genBasin(r, diff, bias) : topic === 'summit' ? genSummit(r, diff, bias) : genFlux(r, diff, bias);
    await say(`Draft ${round} (${source}): ${idea || 'sketching the landscape.'}`); await wait(450);
    let v, score, verdict;
    if (topic === 'basin') {
      v = verifyBasin(spec); const [lo, hi] = BASIN_BAND[diff];
      const okBand = v.frac >= lo && v.frac <= hi && v.basins >= 2;
      score = okBand ? 0 : Math.min(Math.abs(v.frac - lo), Math.abs(v.frac - hi));
      verdict = `Simulated 169 drops: ${Math.round(v.frac * 100)}% reach the target basin (want ${Math.round(lo * 100)}-${Math.round(hi * 100)}%).`;
      if (!okBand) bias += v.frac > hi ? -0.45 : 0.45;
    } else if (topic === 'summit') {
      v = verifySummit(spec); const [lo, hi] = SUMMIT_BAND[diff];
      const okBand = v.ratio >= lo && v.ratio <= hi;
      score = okBand ? 0 : Math.min(Math.abs(v.ratio - lo), Math.abs(v.ratio - hi));
      verdict = v.ratio === 0 ? `No separate decoy peak found: the second bump merged into the main peak. Put a second peak at least 1.8 units away, with a height of ${Math.round((lo + hi) * 50)}% of the main one (want ${Math.round(lo * 100)}-${Math.round(hi * 100)}%).` : `The decoy peak is ${Math.round(v.ratio * 100)}% as tall as the real one (want ${Math.round(lo * 100)}-${Math.round(hi * 100)}%).`;
      if (!okBand) bias += v.ratio > hi ? -0.5 : 0.5;
    } else {
      v = await verifyFlux(spec, () => sleep(0)); const [lo, hi] = FLUX_BAND[diff];
      const okBand = (diff === 'easy' || !v.single) && v.frac >= lo && v.frac <= hi && v.best;
      score = okBand ? 0 : (v.single && diff !== 'easy') ? 1 : v.best ? Math.min(Math.abs(v.frac - lo), Math.abs(v.frac - hi)) : 1;
      verdict = (v.single && diff !== 'easy') ? 'One element is enough to win - too easy.' : `${Math.round(v.frac * 1000) / 10}% of source+sink layouts win (want ${lo * 100}-${hi * 100}%).`;
      if (!okBand) bias += (v.single && diff !== 'easy') || v.frac > hi ? 0.9 : -0.9;
    }
    prev = spec; feedback = verdict; await say(`Check ${round}: ${verdict}`); await wait(600);
    if (!best || score < best.score) best = { spec, v, score, round, name };
    if (score === 0) { await say(`Accepted on draft ${round}. Building it now.`); await wait(500); return { spec, info: v, rounds: round, title: name }; }
    await say('Not right yet - revising the design.'); await wait(450);
  }
  await say(`Best of ${best.round} drafts chosen. Building it now.`); await wait(400);
  return { spec: best.spec, info: best.v, rounds: 5, title: best.name };
}
