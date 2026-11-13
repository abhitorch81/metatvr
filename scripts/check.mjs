// Pre-flight check: `npm run check`. Verifies the agent still designs fair levels and the build passes.
import { architect } from '../src/agent.js';
import { codexCount } from '../src/codex.js';
import { execSync } from 'node:child_process';

let bad = 0;
for (const topic of ['basin', 'summit']) for (const diff of ['easy', 'normal', 'trap']) {
  let ok = 0; const N = 8;
  for (let s = 1; s <= N; s++) { const o = await architect({ topic, diff, seed: s * 131, pause: false }); if (o.rounds < 5) ok++; }
  const pass = ok >= 6; if (!pass) bad++;
  console.log(`${pass ? 'PASS' : 'FAIL'} agent ${topic}/${diff}: ${ok}/${N} accepted within 5 drafts`);
}
const o = await architect({ topic: 'flux', diff: 'normal', seed: 77, pause: false });
console.log(`${o.rounds < 5 ? 'PASS' : 'FAIL'} agent flux/normal: accepted in ${o.rounds} drafts`); if (o.rounds >= 5) bad++;
const c = codexCount(); console.log(`INFO codex: ${c.playable}/${c.total} playable`);
try { execSync('npx vite build', { stdio: 'pipe' }); console.log('PASS production build'); } catch { console.log('FAIL production build'); bad++; }
console.log(bad ? `\n${bad} check(s) failed` : '\nAll checks passed'); process.exit(bad ? 1 : 0);
