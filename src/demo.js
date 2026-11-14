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
  const REC = new URLSearchParams(location.search).has('record');
  const rec = REC ? initRecorder(app) : null;
  const say = rec ? rec.say : (t) => { cap.textContent = t; cap.style.display = t ? 'block' : 'none'; };
  const go = document.createElement('button');
  go.textContent = 'Start demo (starts in 3 s: begin recording first)';
  go.style.cssText = 'position:fixed;left:50%;top:45%;transform:translateX(-50%);padding:18px 30px;font:600 22px system-ui;z-index:100;border-radius:12px;border:0;background:#ffd45e;cursor:pointer';
  document.body.appendChild(go);
  go.onclick = async () => {
    go.remove(); app.audio.unlock();
    if (window.emu) { // inside the emulated Quest: enter VR, then let the virtual hand follow the scripted pointer
      const vb = [...document.querySelectorAll('button')].find((b) => /ENTER VR/i.test(b.textContent)); vb && vb.click(); await sleep(2500);
      setInterval(() => { const h = window.emu.hand, S = inp.script; h.position.set(S.p.x + 0.048, S.p.y + 1.6 - 0.034, S.p.z); h.updatePinchValue && h.updatePinchValue(S.down ? 1 : 0); }, 16);
    }
    await sleep(3000); try { await run(app, say, rec); } catch (e) { console.error(e); say('Demo stopped: ' + e.message); } };
}

async function run(app, say, rec) {
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

  if (rec) { rec.start(); app.menu(); await rec.card('intro', 4200); }
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
  if (rec) { await rec.card('end', 6000); await rec.finish(); }
}

// Composites the WebGL canvas + captions + title cards into a 1920x1080 canvas and records it (with the game audio).
function initRecorder(app) {
  const q = new URLSearchParams(location.search), W = Number(q.get('w')) || 1280, H = Math.round(W * 9 / 16), r = app.renderer, K = W / 1920;
  if (!window.emu) { r.setPixelRatio(1); r.setSize(W, H, false); } if (!window.emu) r.domElement.style.cssText = 'width:100vw;height:100vh;object-fit:contain';
  if (!window.emu) { app.camera.aspect = W / H; app.camera.fov = 54; app.camera.position.set(0, 0.2, 0.55); app.camera.lookAt(0, -0.2, -0.8); app.camera.updateProjectionMatrix(); }
  addEventListener('resize', () => { if (window.emu) return; r.setSize(W, H, false); app.camera.aspect = W / H; app.camera.updateProjectionMatrix(); }, true);
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H; const c = comp.getContext('2d');
  const st = { cap: '', capA: 0, card: null, cardA: 0 };
  const render = r.render.bind(r);
  r.render = (a, b) => {
    render(a, b);
    const cv = r.domElement, sa = cv.width / cv.height, da = W / H; let sw = cv.width, sh = cv.height, sx = 0, sy = 0; // cover-crop to 16:9
    if (sa > da) { sw = cv.height * da; sx = (cv.width - sw) / 2; } else { sh = cv.width / da; sy = (cv.height - sh) / 2; }
    c.drawImage(cv, sx, sy, sw, sh, 0, 0, W, H);
    st.capA += ((st.cap ? 1 : 0) - st.capA) * 0.18; st.cardA += ((st.card ? 1 : 0) - st.cardA) * 0.12;
    if (st.capA > 0.02 && st.cap) {
      c.save(); c.scale(K, K); c.globalAlpha = st.capA; c.font = '600 44px system-ui, sans-serif'; c.textAlign = 'center';
      const W = 1920, H = 1080, w = Math.min(W - 160, c.measureText(st.cap).width + 80);
      c.fillStyle = 'rgba(7,10,20,0.78)'; c.strokeStyle = '#5c6cc8'; c.lineWidth = 2; c.beginPath(); c.roundRect((W - w) / 2, H - 150, w, 84, 18); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.fillText(st.cap, W / 2, H - 94, W - 200); c.restore();
    }
    if (st.cardA > 0.02 && st.card) {
      c.save(); c.globalAlpha = Math.min(1, st.cardA); c.fillStyle = '#070a14'; c.fillRect(0, 0, c.canvas.width, c.canvas.height); c.scale(K, K); const W = 1920, H = 1080;
      c.textAlign = 'center'; c.fillStyle = '#ffd45e'; c.font = '700 120px system-ui, sans-serif'; c.fillText('∇  Gradient', W / 2, H / 2 - 40);
      c.fillStyle = '#fff'; c.font = '500 48px system-ui, sans-serif'; st.card.lines.forEach((l, i) => c.fillText(l, W / 2, H / 2 + 50 + i * 64));
      c.restore();
    }
  };
  const cards = {
    intro: { lines: ['Calculus you can touch.', 'A hands-only, seated VR puzzle game for Meta Quest'] },
    end: { lines: ['Play free in your browser: metatvr.vercel.app', 'WebXR · hand tracking · no controllers', window.emu ? 'Footage: real gameplay on a simulated Meta Quest 3 (Immersive Web Emulator)' : 'Footage: real gameplay, desktop preview of the WebXR build'] },
  };
  window.__shot = () => comp.toBlob((b) => fetch('http://localhost:8799/shot', { method: 'POST', body: b }));
  let mr = null, T0 = 0; const chunks = [], caps = [];
  return {
    say: (t) => { st.cap = t; if (T0 && t) caps.push({ t: +((performance.now() - T0) / 1000).toFixed(2), text: t }); },
    card: async (k, ms) => { if (T0) caps.push({ t: +((performance.now() - T0) / 1000).toFixed(2), text: 'CARD ' + k }); st.card = cards[k]; await sleep(ms); st.card = null; await sleep(600); },
    start() {
      const stream = comp.captureStream(30);
      try { const d = app.audio.ctx.createMediaStreamDestination(); app.audio.master.connect(d); d.stream.getAudioTracks().forEach((t) => stream.addTrack(t)); } catch { /* silent video */ }
      mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 9e6 });
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data); mr.start(1000); T0 = performance.now();
    },
    async finish() {
      await new Promise((res) => { mr.onstop = res; mr.stop(); });
      const blob = new Blob(chunks, { type: 'video/webm' });
      try { await fetch('http://localhost:8799/caps', { method: 'POST', body: JSON.stringify(caps) }); } catch { /* optional */ }
      try { await fetch('http://localhost:8799/save', { method: 'POST', body: blob }); window.__recSaved = blob.size; } catch (e) { window.__recSaved = 'upload failed: ' + e.message; }
    },
  };
}
