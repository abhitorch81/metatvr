# Devpost submission kit (aligned with the official rules, read 8 Nov 2026)

**Name:** Gradient
**Tagline (<=140 chars):** Hands-only VR calculus: grab gradients, bend divergence, loop fields, and let an AI architect build you new levels.
**Track:** Gaming (puzzle, seated, no controllers)   **Division:** New Experience (conceived and built after 24 Sep 2026)
**Special awards to aim at ($25K each):** Best Agentic Interaction, Best Reason to Come Back, Best First Five Minutes, Best Accessibility Forward Experience, Boldest Original Concept. (Judge's Choice comes for free.)

## What the official rules require (checklist)
- [ ] Be a member of **Meta VR Start by the time you submit**; have a Meta account with Developer Access; be 18+; not in an excluded region.
- [ ] One entry per person. Free to play, available until the winner announcement (about 11 Dec 2026). No edits after the deadline.
- [ ] **Link to the playable WebXR build** (GitHub Pages or Vercel etc.) on the Devpost form. See DEPLOY.md.
- [ ] **Demo video under 3 minutes**, public on YouTube or Vimeo, showing real footage from a Quest or an XR simulator/emulator. No AI-generated video carrying the pitch.
- [ ] Text description: inspiration, how it was built, future plans, **target launch date** (below).
- [ ] Select Track = Gaming, Division = New Experience.
- [ ] English only. No brands/logos, no real people, no third-party assets (we use none).
- [ ] Deadline **18 Nov 2026, 12:00 PM Pacific**. Submit a day early.

## Judging criteria (4 x 25%) and how we answer each
| Criterion | Our answer | Honest gap |
|---|---|---|
| Innovation and creativity | Touching gradients, flux, holes and harmonic functions with your hands; an agent that designs and verifies levels | No passthrough/MR |
| Experience design | Seated, pinch-only, ghost-hand tutorial, one-line hints, daily streak, gallery, mastery | UI audited against a Quest FoV budget (`comfort()`); not yet confirmed on device |
| Technical implementation | WebXR hand joints + gaze-dwell + ray fallback, 90 Hz request, simulator-verified AI levels | **Not yet measured on a Quest (60 fps minimum)** |
| Polish and presentation | Contour shader, sonification, sparkle payoff, high-contrast mode | Art is geometric; needs a strong video |

## Description (paste into Devpost)
**Inspiration.** Multivariable and vector calculus is where many people stop believing maths is visual. Gradients, divergence, curl and flux are taught as symbols, yet they describe things you could pick up. Hands-first VR is the first medium where you can.

**What it does.** Gradient is a seated, controller-free puzzle game. A board floats within arm's reach and each level lets you touch one idea with a pinch: drag a ball to the highest peak using level curves; read the Hessian to tell a saddle from a pit; drop a ball and watch it follow the negative gradient; place sources and sinks to steer a stream; draw loops in a field with a hole to see why zero curl is not enough; slice a disc into polar cells to see why dA = r dr dθ; resize a sphere around floating sources to watch flux equal the charge inside (the divergence theorem in 3D); and compare a circle's average with its centre to meet harmonic functions. There are 19 playable levels, a free-play Field Lab, and a Codex that lists 60 topics from a full syllabus and says honestly which are playable (32) and which are only explained.

**The Field Architect (AI as a core loop).** Pick a topic and difficulty and an AI designer invents a new level. It proposes a design (OpenAI when connected, a local generator otherwise), tests it with its own simulator (drops 169 virtual balls, measures decoy-peak height, or runs particle flows over hundreds of source/sink layouts), reads the numbers, revises up to five times, then hands it over. If you get stuck it coaches you in plain language using facts from its own solution. Levels you solve are saved to your gallery.

**Why you come back.** A daily streak, a Daily Basin generated from the date, per-topic mastery stars, a gallery of agent-made levels, and endless new levels from the Architect.

**How we built it.** WebXR + Three.js from scratch: a contour-line surface shader, numerical gradient/Hessian/curl, a particle flow solver, a unified pinch pointer on XR hand joints (with ray and gaze fallbacks), canvas-textured UI and a tiny WebAudio synth that sonifies height. AI is a thin server proxy (`api/agent.js`) so the key never reaches the browser, and every model output is clamped and re-verified by our simulator before you see it. Remove OpenAI and the whole project still works.

**Accessibility.** Seated-only, no locomotion, High contrast mode, Large text, and Hover-to-select (rest on a button by hand, mouse, or head gaze for about a second; no pinch needed for menus). Sonification lets you hear the maths. Not yet: voice control and full eyes-only play inside levels.

**Future plans.** Voice tutor, passthrough mode that puts the board on your real table, surface integrals and Stokes in true 3D, a teacher mode to share custom fields by link, and co-solving for two players. **Target launch date:** [EDIT: your real plan, e.g. Q1 2027 on the Meta Horizon Store; the WebXR build is live now].

## Testing instructions for judges (paste into Devpost)
1. Open the link in Meta Quest Browser and press **Enter VR**. Hand tracking on; no controllers needed.
2. Start with the **Hello** level: copy the ghost hand (pinch the orb, carry it to the ring).
3. Try **Critical**, **Hole**, **Jacobian**, **Gauss**, **Harmonic**, then **Architect** (pick a topic, pinch Build, watch it design a level).
4. Menu toggles at the bottom: High contrast, Large text, Hover-to-select.
5. No headset? Open the same link on a desktop browser and use the mouse (click and drag).

## 3-minute video: shot list (real footage only; Quest or XR emulator)
Lead with the story, not the menu. Hands visible throughout.
- 0:00-0:12 **Hook:** hands pinch a ball up a glowing hill. Caption: "Calculus you can touch."
- 0:12-0:35 **Hole:** loop the post, circulation 2π on a curl-free field. "Zero curl is not enough."
- 0:35-1:00 **Gauss:** stretch the sphere around a floating source; flux = charge inside.
- 1:00-1:25 **Critical or Jacobian:** peak, pit, saddle; or half the disc by area.
- 1:25-2:15 **Field Architect (the money shot):** pick Summit + Trap!, the log shows draft, check, revise, accepted; play the level it built; a coach hint.
- 2:15-2:40 **Come back:** streak, gallery, mastery, Daily Basin. Quick flash of High contrast and Hover-to-select.
- 2:40-3:00 Title card + link + one-line pitch.

## Known limitations (be upfront if asked)
- Built and tested with the Immersive Web Emulator / IWER; measure real Quest performance before submitting.
- No passthrough or scene understanding. Seated VR only.
- Built with Claude Code (AI-assisted); level suggestions can come from OpenAI via our server, always verified by our own simulator.
