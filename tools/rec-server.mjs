// Receives the recorded demo video from the page (?demo&record) and writes video/demo-raw.webm.
import http from 'node:http';
import fs from 'node:fs';
fs.mkdirSync('video', { recursive: true });
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST') return res.writeHead(404).end();
  const out = fs.createWriteStream(req.url === '/shot' ? 'video/shot.png' : 'video/demo-raw.webm');
  req.pipe(out); out.on('finish', () => { console.log('saved video/demo-raw.webm'); res.writeHead(200).end('ok'); });
}).listen(8799, () => console.log('recording receiver on :8799'));
