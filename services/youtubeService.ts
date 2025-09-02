import { ChannelStats, VideoPerformance } from '../types';
import { invokeEdgeFunction } from './supabaseService';

// This service is now a client for our secure backend proxy.
// It no longer contains any AI simulation logic.

/**
 * Fetches a list of the user's most recent YouTube videos with their stats.
 */
export const fetchChannelVideos = async (): Promise<{id: string, title: string, views: number, likes: number, comments: number}[]> => {
    // This is a multi-step process in the real API.
    // 1. Search for videos to get IDs.
    const searchData = await invokeEdgeFunction<{ items: any[] }>('youtube-api-proxy', {
        endpoint: 'search',
        params: {
            part: 'snippet',
            forMine: true,
            type: 'video',
            maxResults: 10,
            order: 'date'
        }
    });

    if (!searchData.items || searchData.items.length === 0) {
        return [];
    }

    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    // 2. Get statistics for those videos.
    const statsData = await invokeEdgeFunction<{ items: any[] }>('youtube-api-proxy', {
        endpoint: 'videos',
        params: {
            part: 'statistics,snippet',
            id: videoIds,
        }
    });
    
    if (!statsData.items) return [];

    return statsData.items.map(item => ({
        id: item.id,
        title: item.snippet.title,
        views: parseInt(item.statistics.viewCount, 10) || 0,
        likes: parseInt(item.statistics.likeCount, 10) || 0,
        comments: parseInt(item.statistics.commentCount, 10) || 0,
    }));
};

export const fetchChannelStats = async (): Promise<ChannelStats> => {
    const data = await invokeEdgeFunction<{ items: any[] }>('youtube-api-proxy', {
        endpoint: 'channels',
        params: {
            part: 'snippet,statistics',
            mine: true
        }
    });

    if (!data.items || data.items.length === 0) {
        throw new Error("Could not fetch channel statistics.");
    }

    const stats = data.items[0].statistics;

    // We need a top performing video, which requires another call. Let's get the most recent videos first.
    const videos = await fetchChannelVideos();
    const topVideo = videos.length > 0 ? videos.sort((a,b) => b.views - a.views)[0] : { title: 'N/A', views: 0 };

    return {
        subscriberCount: parseInt(stats.subscriberCount, 10),
        totalViews: parseInt(stats.viewCount, 10),
        totalVideos: parseInt(stats.videoCount, 10),
        topPerformingVideo: {
            title: topVideo.title,
            views: topVideo.views,
        }
    };
};

export const fetchVideoPerformance = async (videoId: string): Promise<VideoPerformance> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const data = await invokeEdgeFunction<{ rows: any[][] }>('youtube-api-proxy', {
        endpoint: 'reports',
        isAnalytics: true,
        params: {
            ids: 'channel==MINE',
            startDate: startDate,
            endDate: new Date().toISOString().split('T')[0],
            metrics: 'views,likes,comments,averageViewDuration,estimatedMinutesWatched',
            dimensions: 'video',
            filters: `video==${videoId}`
        }
    });
    
    if (!data.rows || data.rows.length === 0) {
        // Return zeroed data if no performance metrics are available yet.
        return { views: 0, likes: 0, comments: 0, retention: 0 };
    }

    const row = data.rows[0];
    const views = row[1] || 0;
    const avgDuration = row[4] || 0;
    // Note: A full retention calculation requires the video's total duration, which is not in this API response.
    // This is a simplified estimation. A more accurate approach would fetch video duration separately.
    const retention = avgDuration > 0 ? 50 : 0; // Placeholder calculation

    return {
        views: views,
        likes: row[2] || 0,
        comments: row[3] || 0,
        retention: Math.round(retention),
    };
};

/**
 * Publishes a video to the user's connected YouTube channel.
 * @returns The final URL of the published YouTube video.
 */
export const publishVideo = async (
    videoFileUrl: string,
    title: string,
    description: string,
    tags: string[],
    thumbnailUrl: string,
    platform: 'youtube_long' | 'youtube_short' | 'tiktok' | 'instagram' = 'youtube_long'
): Promise<{ videoUrl: string; platform: string; status: string }> => {
    try {
        const response = await invokeEdgeFunction<{ 
            videoUrl: string; 
            platform: string; 
            status: string;
            error?: string;
        }>('youtube-publish', {
        videoFileUrl,
        title,
        description,
        tags,
        thumbnailUrl,
            platform,
            publishOptions: {
                privacyStatus: 'public',
                categoryId: platform === 'youtube_short' ? '22' : '28', // People & Blogs for shorts, Science & Technology for long-form
                defaultLanguage: 'en',
                defaultAudioLanguage: 'en'
            }
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return {
            videoUrl: response.videoUrl,
            platform: response.platform,
            status: response.status
        };
    } catch (error) {
        console.error('Publishing error:', error);
        throw new Error(`Failed to publish video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Publishes to multiple platforms simultaneously
 */
export const publishToMultiplePlatforms = async (
    videoFileUrl: string,
    title: string,
    description: string,
    tags: string[],
    thumbnailUrl: string,
    platforms: Array<'youtube_long' | 'youtube_short' | 'tiktok' | 'instagram'>
): Promise<Array<{ platform: string; videoUrl: string; status: string; error?: string }>> => {
    const publishPromises = platforms.map(async (platform) => {
        try {
            const result = await publishVideo(videoFileUrl, title, description, tags, thumbnailUrl, platform);
            return { ...result, error: undefined };
        } catch (error) {
            return {
                platform,
                videoUrl: '',
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });

    return Promise.all(publishPromises);
};

/**
 * Get optimal publishing times based on platform and audience
 */
export const getOptimalPublishingTimes = async (platform: string): Promise<{
    bestTimes: Array<{ day: string; time: string; reason: string }>;
    timezone: string;
}> => {
    const response = await invokeEdgeFunction<{
        bestTimes: Array<{ day: string; time: string; reason: string }>;
        timezone: string;
    }>('publishing-optimizer', {
        platform,
        action: 'getOptimalTimes'
    });

    return response;
};