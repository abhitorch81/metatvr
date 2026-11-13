// Vercel serverless function: set OPENAI_API_KEY in the project's environment variables.
// CORS is open so the game can be hosted elsewhere (e.g. GitHub Pages) and still call this function.
import { handle } from '../server/agent-core.js';
export default async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();
  try { res.status(200).json(await handle(req.body)); } catch (e) { res.status(502).json({ error: e.message }); }
}
