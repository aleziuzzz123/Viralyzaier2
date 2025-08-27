import { NormalizedStockAsset, GiphyAsset } from '../types';
import { invokeEdgeFunction } from './supabaseService';

export const searchGiphy = async (query: string, type: 'stickers' | 'gifs'): Promise<NormalizedStockAsset[]> => {
    const data = await invokeEdgeFunction<GiphyAsset[]>('giphy-proxy', { query, type });
    return (data || []).map(gif => ({
        id: gif.id,
        previewImageUrl: gif.images.fixed_height.webp || gif.images.fixed_height.url,
        downloadUrl: gif.images.original.webp || gif.images.original.url,
        type: 'sticker',
        description: gif.title || 'Giphy Sticker',
        provider: 'giphy',
    }));
};
