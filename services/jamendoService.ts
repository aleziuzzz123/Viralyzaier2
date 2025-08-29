import { NormalizedStockAsset, JamendoTrack } from '../types';
import { invokeEdgeFunction } from './supabaseService';

export const searchJamendoMusic = async (query: string): Promise<NormalizedStockAsset[]> => {
    const data = await invokeEdgeFunction<{ results: JamendoTrack[] }>('jamendo-proxy', { query });
    return (data.results || []).map(track => ({
        id: track.id,
        previewImageUrl: track.image,
        downloadUrl: track.audio,
        type: 'audio',
        description: `${track.name} by ${track.artist_name}`,
        duration: track.duration,
        provider: 'jamendo',
    }));
};
