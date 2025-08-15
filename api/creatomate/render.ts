import type { VercelRequest, VercelResponse } from '@vercel/node';
import Creatomate from 'creatomate';
const apiKey = process.env.CREATOMATE_API_KEY as string;
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!apiKey) return res.status(500).json({ error: 'Missing CREATOMATE_API_KEY' });
  try {
    const { source, webhookUrl, outputFormat = 'mp4' } = req.body || {};
    if (!source) return res.status(400).json({ error: 'Missing "source"' });
    const client = new Creatomate.Client(apiKey);
    const [job] = await client.render({ source, outputFormat, webhookUrl });
    res.status(202).json(job);
  } catch (e: any) { res.status(500).json({ error: e?.message ?? 'Render failed' }); }
}
