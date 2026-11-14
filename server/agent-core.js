// Server-side brain for the Field Architect. Runs ONLY on a server (local proxy or Vercel function),
// so the OpenAI key never reaches the browser. Dependency-free: uses fetch.
const MODEL = () => process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SPEC_DOC = `Level spec formats (board coordinates x,y in [-1.9,1.9]; the player stands at y=-2 looking toward +y):
- topic "basin": {"kind":"basin","bumps":[{"a":amp,"x":..,"y":..,"s":width}]}  height z=sum a*exp(-d^2/(2 s^2)). Negative a = pits. The DEEPEST pit is the goal; a ball dropped anywhere rolls downhill into the nearest pit. Use 3-5 bumps, widths 0.35-1.0, |a| up to 1.6.
- topic "summit": same bumps, kind "summit". The goal is the HIGHEST peak. Use exactly two positive bumps as the main peak and a decoy, centres AT LEAST 1.8 units apart (e.g. (-1,0.8) and (1,-0.8)), widths 0.55-0.9, decoy amplitude = a fraction (e.g. 0.9) of the main amplitude. Optionally add one small negative bump as a pit. Close or overlapping bumps merge into one peak, which is invalid.
- topic "flux": {"kind":"flux","wind":0.3-1.0,"target":{"x":..,"y":..,"r":0.38}}. Wind blows +x from the left edge near y=-0.9. The player places up to 1 source+sinks to bend the stream into the target ring. Targets further from y=-0.9 are harder.`;

async function chat(messages, max = 500) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set on the server');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL(), temperature: 0.9, max_tokens: max, response_format: { type: 'json_object' }, messages }),
  });
  if (!r.ok) { let d = ''; try { const j = await r.json(); d = ` ${j.error?.code || j.error?.type || ''}: ${j.error?.message || ''}`.slice(0, 200); } catch { /* no body */ } throw new Error(`OpenAI ${r.status}${d}`); }
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

const clip = (s, n) => String(s ?? '').slice(0, n);

export async function handle(body) {
  const mode = body && body.mode;
  if (mode === 'design') {
    const { topic, diff, round = 1, feedback = '', prev = null } = body;
    const sys = `You are the Field Architect, a level designer inside a hands-only VR calculus game (multivariable & vector calculus). You output ONLY JSON: {"name": short evocative level name (<=24 chars), "idea": one friendly sentence (<=140 chars) explaining your design idea, "spec": <level spec>}.\n${SPEC_DOC}\nA separate simulator will measure your level and send feedback; revise accordingly.`;
    const user = `Design a ${clip(diff, 10)} "${clip(topic, 10)}" level. Round ${Number(round) || 1}.${feedback ? ` Your previous draft was ${clip(JSON.stringify(prev), 700)}. Simulator feedback on it: ${clip(feedback, 300)} Adjust THAT draft (change amplitudes/positions/widths) to hit the target; do not start from scratch.` : ''}`;
    const out = await chat([{ role: 'system', content: sys }, { role: 'user', content: user }]);
    return { name: clip(out.name, 24), idea: clip(out.idea, 160), spec: out.spec };
  }
  if (mode === 'coach') {
    const { topic, hintFacts = '', seconds = 0 } = body;
    const sys = 'You are a warm, concise VR calculus coach. Output ONLY JSON {"hint": string <=170 chars}. Give a conceptual nudge using the facts, name the calculus idea (gradient, level curves, divergence...), never give exact coordinates.';
    const out = await chat([{ role: 'system', content: sys }, { role: 'user', content: `Topic: ${clip(topic, 10)}. Player stuck ${Number(seconds) || 0}s. Verified facts about this level: ${clip(hintFacts, 400)}` }], 200);
    return { hint: clip(out.hint, 200) };
  }
  throw new Error('unknown mode');
}
