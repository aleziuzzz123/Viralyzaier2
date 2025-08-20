import { invokeEdgeFunction } from './supabaseService';

interface RenderStatus {
    status: 'submitted' | 'queued' | 'rendering' | 'done' | 'failed' | 'cancelled';
    url?: string;
}

/**
 * Checks the status of a Shotstack render job.
 * @param renderId The ID of the render job to check.
 * @returns The current status and URL if completed.
 */
export const getRenderStatus = async (renderId: string): Promise<RenderStatus> => {
    // The Supabase function can be called via GET or POST.
    // We use POST here for consistency with other service calls.
    return await invokeEdgeFunction<RenderStatus>('shotstack-status', { id: renderId });
};
