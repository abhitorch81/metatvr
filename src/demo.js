// `?demo` : a scripted virtual hand plays the game while captions explain it. Made for screen recording.
// Open the page with ?demo (desktop) or ?emu&demo (inside the emulated Quest), press "Start demo", record the window.
import * as THREE from 'three';
import { toV } from './surface.js';
import { LEVELS } from './list.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => t * t * (3 - 2 * t);

export function setup(app) {
  const inp = app.input;
  inp.script = { p: new THREE.Vector3(0, 0.2, -0.3), down: false };
  const cap = document.createElement('div');
  cap.style.cssText = 'position:fixed;left:50%;bottom:6%;transform:translateX(-50%);max-width:80%;padding:14px 26px;border-radius:14px;background:rgba(7,10,20,.82);color:#fff;font:600 26px system-ui,sans-serif;text-align:center;z-index:99;display:none;border:1px solid #5c6cc8';
  document.body.appendChild(cap);
  const say = (t) => { cap.textContent = t; cap.style.display = t ? 'block' : 'none'; };
  const go = document.createElement('button');
  go.textContent = 'Start demo (starts in 3 s: begin recording first)';
  go.style.cssText = 'position:fixed;left:50%;top:45%;transform:translateX(-50%);padding:18px 30px;font:600 22px system-ui;z-index:100;border-radius:12px;border:0;background:#ffd45e;cursor:pointer';
  document.body.appendChild(go);
  go.onclick = async () => { go.remove(); app.audio.unlock(); await sleep(3000); try { await run(app, say); } catch (e) { console.error(e); say('Demo stopped: ' + e.message); } };
}

async function run(app, say) {
  const S = app.input.script, W = (x, y, h = 0) => app.world.localToWorld(toV(x, y, h));
  const tween = async (to, ms) => { const a = S.p.clone(); const t0 = performance.now(); for (;;) { const k = Math.min(1, (performance.now() - t0) / ms); S.p.lerpVectors(a, to, ease(k)); if (k >= 1) break; await sleep(8); } };
  const move = (x, y, h, ms = 900) => tween(W(x, y, h), ms);
  const pinch = async (v) => { S.down = v; await sleep(160); };
  const idle = () => tween(new THREE.Vector3(0.25, 0.05, -0.35), 700);
  const lvl = (name) => app.go(LEVELS.findIndex((l) => l.name === name));
  const press = async (b) => { const p = b.mesh.getWorldPosition(new THREE.Vector3()); await tween(p, 900); await pinch(true); await pinch(false); };
  const btn = (f) => { const b = app.ui.buttons.find((x) => x.mesh.visible && f(x)); if (!b) throw new Error('button not found'); return b; };
  const until = async (f, ms) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await sleep(200); } return true; };
  const circle = async (cx, cy, r, ms, a0 = 0) => {
    const t0 = performance.now();
    for (;;) { const k = Math.min(1, (performance.now() - t0) / ms), a = a0 + k * Math.PI * 2; S.p.copy(W(cx + r * Math.cos(a), cy + r * Math.sin(a))); if (k >= 1) break; await sleep(8); }
  };

  say('Gradient: calculus you can touch, with your hands'); app.menu(); await idle(); await sleep(2600);

  // 1. Hello: pinch and carry
  say('Level 1: pinch the orb, carry it to the ring'); lvl('Hello'); await sleep(2800);
  await move(-1.3, 0, 0.3); await pinch(true); await move(1.3, 0, 0.3, 1800); await pinch(false); await sleep(1800);

  // 2. Summit: level curves
  say('Surfaces and level curves: drag the ball to the global peak'); lvl('Summit'); await sleep(2200);
  const L = app.level, f = L.f;
  await move(L.p.x, L.p.y, f(L.p.x, L.p.y) + 0.12); await pinch(true);
  const a = { x: L.p.x, y: L.p.y }, t0 = performance.now(); // curve through the valley and up
  for (;;) { const k = Math.min(1, (performance.now() - t0) / 3200), e = ease(k); const x = a.x + (L.top.x - a.x) * e, y = a.y + (L.top.y - a.y) * e; S.p.copy(W(x, y, f(x, y) + 0.12)); if (k >= 1) break; await sleep(8); }
  await sleep(1800); await pinch(false); await sleep(900);

  // 3. Hole in the field
  say('When zero curl is not enough: loop a curl-free field'); lvl('Hole'); await sleep(2200);
  say('A loop that misses the post: circulation is 0');
  await move(1.9 - 0.6, 1.0, 0.06); await pinch(true); await circle(1.3, 1.0, 0.6, 2200); await pinch(false); await sleep(2200);
  say('Now loop AROUND the post: circulation is 2π, with zero curl');
  await move(1.0, 0, 0.06); await pinch(true); await circle(0, 0, 1.0, 2600); await pinch(false); await sleep(2200);
  say('A bigger loop gives the same 2π: the hole decides, not the curl');
  await move(1.8, 0, 0.06); await pinch(true); await circle(0, 0, 1.8, 3200); await pinch(false); await sleep(2800);

  // 4. Gauss
  say('Gauss in 3D: flux through a sphere equals the charge inside'); lvl('Gauss'); await sleep(2200);
  await move(0, 0, 0.1); await pinch(true); await move(-1.1, 0.7, 0.1, 1600); await pinch(false);
  say('Enclose the +2 source: flux about +2'); await sleep(2600);
  await move(-1.1, 0.7, 0.1, 500); await pinch(true); await move(1.2, -0.5, 0.1, 2000); await pinch(false);
  say('Enclose the −2 sink: flux about −2'); await sleep(3200);

  // 5. Field Architect
  say('The Field Architect: an AI designs a brand new level'); lvl('Architect'); await sleep(2400);
  say('Pick a topic and a difficulty'); await press(btn((b) => b.key === 'summit')); await press(btn((b) => b.key === 'trap'));
  say('It designs, tests with its own simulator, revises, then hands it over'); await press(btn((b) => b.label.startsWith('Build')));
  await idle(); const built = await until(() => app.level.phase === 'play', 60000);
  if (built) {
    say('Level built and verified. Now play it'); await sleep(2800);
    const I = app.level.inner, g = I.f;
    await move(I.p.x, I.p.y, g(I.p.x, I.p.y) + 0.12); await pinch(true);
    const b0 = { x: I.p.x, y: I.p.y }, t1 = performance.now();
    for (;;) { const k = Math.min(1, (performance.now() - t1) / 3200), e = ease(k); const x = b0.x + (I.top.x - b0.x) * e, y = b0.y + (I.top.y - b0.y) * e; S.p.copy(W(x, y, g(x, y) + 0.12)); if (k >= 1) break; await sleep(8); }
    await sleep(1800); await pinch(false); say('Solved: saved to your gallery'); await sleep(2800);
  }

  // 6. Come back + accessibility
  say('Come back daily: streaks, a gallery of AI-made levels, mastery stars'); app.menu(); await idle(); await sleep(3200);
  say('Accessibility: high contrast, large text, hover-to-select'); await press(btn((b) => b.label === 'High contrast')); await sleep(1600);
  await press(btn((b) => b.label === 'Large text')); await sleep(1800);
  await press(btn((b) => b.label === 'High contrast')); await press(btn((b) => b.label === 'Large text')); await idle();
  say('Gradient: hands-only VR calculus. Play it at metatvr.vercel.app'); await sleep(5000);
  say('');
}
