# ∇ Gradient — touch the math

A hands-only, seated VR puzzle game that teaches **multivariable & vector calculus** by letting you
grab, drop and draw inside the equations. Built for the **Meta VR Start Developer Competition 2026**
(Gaming track, New Experience division). WebXR + Three.js, no controllers needed.

## The 19 levels (+ Codex)
| # | Level | Concept | What your hands do |
|---|-------|---------|--------------------|
| 0 | Hello | Pinch tutorial | Learn the pinch by carrying an orb into a ring (first 20 seconds) |
| 1 | Summit | Surfaces & level curves | Drag a ball to the highest peak using the contour rings |
| 2 | Gradient | Gradient flow -grad f | Drop a ball so it rolls into the deepest basin |
| 3 | Slope | Gradient as a vector | Drag a ball until your gradient arrow matches a target arrow (last round: grad f = 0) |
| 4 | Descent | Gradient descent step size | Slide to choose alpha; reach the minimum in 10 steps (too small is slow, too big diverges) |
| 5 | Riemann | Double integrals | Choose n and sampling rule to approximate the volume within 0.5% using 7 columns |
| 6 | Divergence | Sources, sinks, flux | Place sources/sinks to steer 100 particles into a ring |
| 7 | Curl | Curl of a field | Drag a paddlewheel to the zero-curl spot in 3 fields |
| 8 | Work | Line integrals, conservative fields | Draw paths with a live integral of F.dr; finale shows path independence |
| 9 | Loop | Divergence theorem & Stokes | Draw closed loops; live flux and circulation match the field inside |
| 10 | Lagrange | Lagrange multipliers | Swing a bead on a constraint until grad f is parallel to grad g |
| 11 | Field Lab | Free play | Place sources, sinks and vortices; read div and curl under your fingertip |
| 12 | Architect | An AI agent designs a new level for you | Propose, simulate, revise, hand over; coach hints |
| 13 | Daily | A new landscape every day | Seeded by date: a reason to come back |

Extras: level-select menu with 3-star speed ratings, progress saved locally, and **sonification**
(a tone whose pitch tracks height / closeness to the answer) so the maths can also be heard.

## Competition fit
- **Hands-first**: pinch (thumb+index) is the only input. Whole game playable without a controller.
- **Seated / airplane-seat test**: board is 80 cm wide, 70 cm in front of you, nothing needs room-scale.
- **10-minute test**: each level is 1-2 minutes; first level is solvable in ~20 seconds.
- **Original, not a wrapper**: every field, solver and shader is in this repo; no third-party service.
- Accessibility: seated only, no locomotion, blue-yellow colour map (colour-blind safe), large text, audio cues.

## Run it
```bash
npm install
npm run dev          # desktop preview at http://localhost:5173 (mouse = pinch)
npm run dev:ssl      # https on your LAN: open https://<your-pc-ip>:5173 in the Quest Browser
npm run build        # static site in dist/
```
WebXR needs https (or localhost). On a Quest you can also `adb reverse tcp:5173 tcp:5173` and open
`http://localhost:5173` in the headset browser. Tap **Enter VR**, allow hand tracking.

Use `?level=N` (1-7) to jump to a level.

### No headset? Emulate a Quest 3
Open `http://localhost:5173/?emu=1`. This loads Meta's open-source IWER runtime (the engine behind the
Immersive Web Emulator extension) with a virtual Quest 3 and a virtual hand, so the real WebXR /
hand-tracking code path runs in desktop Chrome. Click **Enter VR**, then drive the hand from the
console via `window.emu` (`emu.hand.position.set(x,y,z)`, `emu.hand.updatePinchValue(0..1)`), or use
the Immersive Web Emulator extension on the normal URL for a GUI.

## Agentic workflow (Meta's agentic-tools)
This project was built with a coding agent and [meta-quest/agentic-tools](https://github.com/meta-quest/agentic-tools).
Skills applied: **hz-immersive-designer** (comfort / reach / readability review) and **hz-iwsdk-webxr** (WebXR gotchas).
What they changed in the game:
- **Input that works on Meta VR Glasses**: joints-first pinch, with a gaze-pinch / target-ray fallback (`select` events) for devices without hand joints.
- **90 Hz** requested after session start (Quest Browser defaults to 72 Hz).
- Seated reach: board 0.7 m away, targets >= 64 mm, panel at 1.0 m, no head-locked UI, one-handed use.
- Hover **and** press feedback on every button; visual + text feedback for every audio cue; a 25-minute break reminder.

Optional dev setup for your own agent (run in your terminal):
```bash
npx -y metavr init                      # installs the skills + MCP server for your agent
metavr docs search "hand tracking pinch"   # verify API details against Meta docs
# Claude Code: /plugin marketplace add meta-quest/agentic-tools  then  /plugin install meta-vr@meta-vr
```

## Deploy (judges open a link)
Push the repo to GitHub, then `npm run build` and publish `dist/` with GitHub Pages
(or `npx vercel dist`). The build uses relative paths so it works from any sub-path.
Submit the https URL as your playable build (WebXR/IWSDK-style submission).

## Code map
- `src/main.js` seated layout, level switching, progress (localStorage)
- `src/input.js` unified pinch pointer (XR hands or mouse)
- `src/levels.js` the 7 levels; `src/math.js` gradient/curl/extremum helpers
- `src/surface.js` contour-line surface shader, arrow-field glyphs
- `src/ui.js` canvas HUD + pinchable buttons; `src/audio.js` synth sounds


## Field Architect (the in-game agent)
Level 12 is an agent that **designs levels**. Pick a topic (Gradient / Summit / Divergence) and a difficulty (Easy / Normal / Trap!), pinch Build, and watch it work in the panel:
1. **Propose** a level spec (pure JSON data, never code).
2. **Verify** it with its own simulator: it drops 169 virtual balls down the landscape, measures decoy-peak height, or runs particle flows for hundreds of source/sink layouts.
3. **Revise** if the measured difficulty misses the target band (up to 5 drafts), then hand the level to the player.
4. **Coach**: if you are stuck for 45 s, a hint is derived from the verifier's own solution.

Logic lives in `src/agent.js` (pure, testable in Node) and `src/architect.js`. Runs fully offline. To plug in a cloud model, set `VITE_AGENT_URL` to an endpoint that accepts `{topic,diff,round,bias}` and returns a level spec; every spec is clamped by `sanitizeSpec` and checked by the same verifier, and the app falls back to the local generator on any failure.

### Turning on the OpenAI brain
The key never goes in the browser. Copy `.env.example` to `.env.local`, set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`), then in a second terminal:
```
npm run agent      # proxy on :8787 (Vite forwards /api/agent to it)
npm run dev
```
With the proxy up, drafts say "(OpenAI)": the model proposes a level and a name, our simulator measures it and sends the numbers back as feedback for the next draft, and the coach hint is written by the model. Without it everything falls back to the local generator. For production deploy on Vercel: `api/agent.js` is the function; set `OPENAI_API_KEY` in the project's environment variables and nothing else.

## Award fit
- **Best Agentic Interaction:** Field Architect (LLM proposes, simulator verifies, loop revises, LLM coaches).
- **Best Reason to Come Back:** daily streak, Daily Basin, a Gallery of Architect levels you solved, per-topic mastery stars.
- **Best First Five Minutes:** a looping ghost hand teaches the pinch with one short sentence, ending in a sparkle payoff.
- **Best Accessibility Forward:** seated and hands-only, plus High contrast, Large text and Hover-to-select (rest on a button, by hand, mouse, or head gaze if no hand is visible) in the Menu. Voice and full eyes-only play are not built yet.


## Syllabus coverage (checked against a full multivariable and vector calculus checklist)
Of the 60 checklist items, 32 are playable and 28 are explained in the in-game **Codex** (pinch an entry to read its formula and jump to the level that demonstrates it). The Codex marks every item "playable" or "explained only", so nothing is overclaimed.

| Topic | Playable in |
|---|---|
| Gradient, level curves, directional derivative | Gradient, Slope, Summit |
| Fermat, Hessian test, Clairaut | **Critical** |
| Convexity, Taylor (quadratic model), descent | Descent |
| Double integrals, Fubini | Riemann |
| Change of variables, Jacobian (polar) | **Jacobian** |
| Divergence, curl, fields | Divergence, Curl, Field Lab |
| Gradient theorem, conservative fields | Work |
| Curl-free is not enough (holes, Poincare) | **Hole** |
| Green (circulation and flux), planar Stokes | Loop |
| Gauss divergence theorem in 3D | **Gauss** |
| Laplacian, mean value property, maximum principle | **Harmonic** |
| Lagrange multipliers, implicit function theorem | Lagrange |
| Helmholtz decomposition | Field Lab |

Explained only (no level): Tonelli, convergence theorems, Leibniz, Reynolds, coarea/area formulas, generalized Stokes, Hodge, de Rham, Green's identities, Dirichlet/Neumann uniqueness, Liouville, KKT, inverse/constant-rank theorems and a few identities.

## Comfort budget (Quest field of view)
`src/comfort.js` audits where UI sits relative to the eye (head at the origin, looking down -z). Budget, tuned for the narrower Quest 2 as well as Quest 3: essential UI within +-30 deg azimuth and -30..+20 deg elevation; board content within +-40 deg and -55..+10 deg. The level menu is laid out on an arc so every button faces the player. Run `comfort()` in the browser console (or `?emu`) on any screen to list anything outside the budget; all screens currently pass.
