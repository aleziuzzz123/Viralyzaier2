
// api/render.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ENDPOINT_BASE =
  process.env.SHOTSTACK_ENV === 'prod'
    ? 'https://api.shotstack.io/edit/v1'
    : 'https://api.shotstack.io/edit/stage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for browser calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const apiKey = process.env.SHOTSTACK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing SHOTSTACK_API_KEY' });

  const edit = req.body;
  if (!edit?.timeline || !edit?.output) {
    return res.status(400).json({ error: 'Body must include timeline and output' });
  }

  const r = await fetch(`${ENDPOINT_BASE}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(edit),
  });

  const data = await r.json().catch(() => ({}));
  return res.status(r.status).json(data);
}
