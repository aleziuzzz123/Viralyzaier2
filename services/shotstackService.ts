// src/services/shotstackService.ts
import { invokeEdgeFunction } from './supabaseService';

export type RenderPhase =
  | 'submitted'
  | 'queued'
  | 'rendering'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface RenderStatus {
  status: RenderPhase;
  url?: string;
  message?: string;
}

// Start a render via an edge function (optional but handy)
export async function submitRender(edit: any, projectId: string): Promise<{ renderId: string }> {
  return await invokeEdgeFunction<{ renderId: string }>('shotstack-render', { edit, projectId });
}

// Check render status (this is what your UI polls)
export async function getRenderStatus(renderId: string): Promise<RenderStatus> {
  if (!renderId) throw new Error('renderId is required');
  return await invokeEdgeFunction<RenderStatus>('shotstack-status', { id: renderId });
}

// Utility: poll until finished
export async function pollRender(
  renderId: string,
  { intervalMs = 4000, timeoutMs = 15 * 60_000 } = {}
): Promise<RenderStatus> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await getRenderStatus(renderId);
    if (s.status === 'done' || s.status === 'failed' || s.status === 'cancelled') return s;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Render polling timed out');
}