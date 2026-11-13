// Local dev proxy:  OPENAI_API_KEY=sk-... node server/dev-proxy.mjs   (or put it in .env.local)
import http from 'node:http';
import fs from 'node:fs';
import { handle } from './agent-core.js';

try { // minimal .env.local loader (not committed)
  for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no file */ }

http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/api/agent')) { res.writeHead(404).end(); return; }
  let data = ''; req.on('data', (c) => { data += c; if (data.length > 20000) req.destroy(); });
  req.on('end', async () => {
    try { const out = await handle(JSON.parse(data)); res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out)); }
    catch (e) { console.error(e.message); res.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message })); }
  });
}).listen(8787, () => console.log(`agent proxy on :8787  key ${process.env.OPENAI_API_KEY ? 'loaded' : 'MISSING'}`));
