import { NormalizedStockAsset, StockAsset } from '../types';
import { invokeEdgeFunction } from './supabaseService';

export const searchPexels = async (query: string, type: 'videos' | 'photos'): Promise<NormalizedStockAsset[]> => {
    const data = await invokeEdgeFunction<{ photos?: StockAsset[], videos?: StockAsset[] }>('pexels-proxy', { query, type });

    if (type === 'videos') {
        return (data.videos || []).map(video => ({
            id: video.id,
            previewImageUrl: video.image || '',
            downloadUrl: video.video_files?.find(f => f.quality === 'hd')?.link || video.video_files?.[0]?.link || '',
            type: 'video',
            description: video.photographer || 'Pexels Video',
            duration: video.duration,
            provider: 'pexels',
        }));
    }
    
    return (data.photos || []).map(photo => ({
        id: photo.id,
        previewImageUrl: photo.src?.medium || '',
        // FIX: Use `medium` as a fallback instead of the non-existent `large`.
        downloadUrl: photo.src?.large2x || photo.src?.medium || '',
        type: 'image',
        description: photo.alt || photo.photographer || 'Pexels Image',
        provider: 'pexels',
    }));
};