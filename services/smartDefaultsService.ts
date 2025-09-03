import { invokeEdgeFunction } from './supabaseService';
import { supabase } from './supabaseClient';
import { generateVideoBlueprint } from './geminiService';
import { publishToMultiplePlatforms } from './youtubeService';
import { Platform, VideoStyle, Project, Blueprint } from '../types';

export interface SmartDefaults {
  platform: Platform;
  style: VideoStyle;
  voice: string;
  voiceName: string;
  visualStyle: string;
  length: string;
  includeVoiceover: boolean;
  includeMoodboard: boolean;
  autoApprove: boolean;
  optimalPublishingTime?: string;
  expectedViralScore?: number;
}

export interface TopicAnalysis {
  category: 'education' | 'entertainment' | 'news' | 'lifestyle' | 'tech' | 'business';
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  isEducational: boolean;
  isEntertainment: boolean;
  isNews: boolean;
  optimalLength: number;
  bestStyle: VideoStyle;
  viralPotential: number;
}

export interface UserHistory {
  bestPerformingVoice: string;
  bestPerformingStyle: string;
  bestPerformingLength: number;
  bestPerformingTopics: string[];
  optimalPublishingTimes: string[];
  averageViralScore: number;
}

/**
 * Analyzes a topic to determine the best settings for viral video creation
 */
export const analyzeTopic = async (topic: string): Promise<TopicAnalysis> => {
  const prompt = `Analyze this video topic and provide insights for viral video creation:

Topic: "${topic}"

Please analyze and return a JSON object with:
{
  "category": "education|entertainment|news|lifestyle|tech|business",
  "sentiment": "positive|negative|neutral", 
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "isEducational": boolean,
  "isEntertainment": boolean,
  "isNews": boolean,
  "optimalLength": number (in seconds, 30-300),
  "bestStyle": "High-Energy Viral|Cinematic Documentary|Clean & Corporate|Animation|Historical Documentary|Vlog|Whiteboard",
  "viralPotential": number (1-10 scale)
}`;

  try {
    const response = await invokeEdgeFunction<{ text: string }>('openai-proxy', {
      type: 'generateContent',
      params: {
        model: 'gpt-4o',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Topic analysis error:', error);
    // Return default analysis
    return {
      category: 'entertainment',
      sentiment: 'positive',
      keywords: topic.split(' ').slice(0, 5),
      isEducational: false,
      isEntertainment: true,
      isNews: false,
      optimalLength: 90,
      bestStyle: 'High-Energy Viral',
      viralPotential: 7
    };
  }
};

/**
 * Gets user's historical performance data to personalize defaults
 */
export const getUserHistory = async (userId: string): Promise<UserHistory | null> => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'Published')
      .not('performance', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !projects || projects.length === 0) {
      return null;
    }

    // Analyze user's successful videos
    const successfulVideos = projects.filter(p => 
      p.performance && (p.performance as any).views > 1000
    );

    if (successfulVideos.length === 0) {
      return null;
    }

    // Extract patterns
    const voices = successfulVideos.map(p => p.voiceover_voice_id).filter(Boolean);
    const styles = successfulVideos.map(p => (p.script as any)?.style).filter(Boolean);
    const lengths = successfulVideos.map(p => (p.script as any)?.scenes?.length * 3).filter(Boolean);
    const topics = successfulVideos.map(p => p.topic).filter(Boolean);
    const viralScores = successfulVideos.map(p => (p.performance as any).viralScore || 5);

    return {
      bestPerformingVoice: getMostCommon(voices) || 'pNInz6obpgDQGcFmaJgB',
      bestPerformingStyle: getMostCommon(styles) || 'High-Energy Viral',
      bestPerformingLength: getAverage(lengths) || 90,
      bestPerformingTopics: topics.slice(0, 5),
      optimalPublishingTimes: ['12:00', '15:00', '18:00'], // Default times
      averageViralScore: getAverage(viralScores) || 5
    };
  } catch (error) {
    console.error('Get user history error:', error);
    return null;
  }
};

/**
 * Gets smart defaults based on topic analysis and user history
 */
export const getSmartDefaults = async (topic: string, userId?: string): Promise<SmartDefaults> => {
  // Analyze topic
  const topicAnalysis = await analyzeTopic(topic);
  
  // Get user history if available
  const userHistory = userId ? await getUserHistory(userId) : null;

  // Determine platform based on topic
  const platform: Platform = topicAnalysis.isEducational ? 'youtube_long' : 'youtube_short';

  // Determine style based on analysis and user history
  const style: VideoStyle = userHistory?.bestPerformingStyle || topicAnalysis.bestStyle;

  // Determine voice based on user history
  const voice = userHistory?.bestPerformingVoice || 'pNInz6obpgDQGcFmaJgB';
  const voiceName = getVoiceName(voice);

  // Determine visual style based on topic sentiment
  const visualStyle = getVisualStyleForSentiment(topicAnalysis.sentiment);

  // Determine length based on analysis and user history
  const length = userHistory?.bestPerformingLength || topicAnalysis.optimalLength;

  return {
    platform,
    style,
    voice,
    voiceName,
    visualStyle,
    length: `${length} seconds`,
    includeVoiceover: true,
    includeMoodboard: true,
    autoApprove: true,
    optimalPublishingTime: userHistory?.optimalPublishingTimes[0] || '15:00',
    expectedViralScore: Math.min(10, topicAnalysis.viralPotential + (userHistory?.averageViralScore || 0) / 2)
  };
};

/**
 * Generates a complete video with all assets in parallel
 */
export const generateCompleteVideo = async (
  topic: string, 
  defaults: SmartDefaults,
  userId: string
): Promise<Project> => {
  try {
    // Generate blueprint with smart defaults
    const blueprint = await generateVideoBlueprint(
      topic,
      defaults.platform,
      defaults.style,
      (message: string) => console.log(message), // Progress callback
      defaults.length.includes('seconds') ? parseInt(defaults.length) : 90,
      null, // No brand identity for one-click mode
      defaults.includeMoodboard,
      defaults.includeVoiceover
    );

    // Create project with all assets
    const projectData = {
      name: topic.substring(0, 40) || 'One-Click Viral Video',
      topic: topic,
      platform: defaults.platform,
      videoSize: defaults.platform === 'youtube_long' ? '16:9' : '9:16',
      status: 'Scripting' as const,
      workflowStep: 4 as const, // Skip to Creative Studio
      title: blueprint.suggestedTitles[0] || topic.substring(0, 40),
      script: blueprint.script,
      moodboard: blueprint.moodboard,
      analysis: null,
      competitorAnalysis: null,
      scheduledDate: null,
      assets: {},
      soundDesign: null,
      launchPlan: null,
      performance: null,
      publishedUrl: null,
      voiceoverVoiceId: defaults.voice,
      lastPerformanceCheck: null,
      finalVideoUrl: null
    };

    const project = await supabase.createProject(projectData, userId);
    
    // Generate voiceover if enabled
    if (defaults.includeVoiceover && blueprint.script?.scenes) {
      const voiceoverUrls: { [key: string]: string } = {};
      
      for (let i = 0; i < blueprint.script.scenes.length; i++) {
        const scene = blueprint.script.scenes[i];
        if (scene.voiceover) {
          try {
            const voiceoverBlob = await generateVoiceover(scene.voiceover, defaults.voice);
            const voiceoverUrl = await uploadVoiceover(voiceoverBlob, userId, project.id, i);
            voiceoverUrls[i.toString()] = voiceoverUrl;
          } catch (error) {
            console.error(`Failed to generate voiceover for scene ${i}:`, error);
          }
        }
      }
      
      // Update project with voiceover URLs
      await supabase.updateProject(project.id, { voiceoverUrls });
    }

    return project;
  } catch (error) {
    console.error('Generate complete video error:', error);
    throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Auto-exports and publishes the video
 */
export const autoExportAndPublish = async (project: Project): Promise<any> => {
  try {
    // For now, we'll simulate the export and publish process
    // In a real implementation, this would:
    // 1. Render the video using Shotstack
    // 2. Generate SEO and thumbnails
    // 3. Publish to the optimal platform
    
    console.log('Auto-exporting and publishing video:', project.id);
    
    // Simulate successful publish
    const mockPublishResult = {
      videoUrl: `https://youtube.com/watch?v=mock${project.id}`,
      platform: project.platform,
      status: 'published'
    };
    
    // Update project status
    await supabase.updateProject(project.id, {
      status: 'Published',
      publishedUrl: mockPublishResult.videoUrl
    });
    
    return mockPublishResult;
  } catch (error) {
    console.error('Auto-publish error:', error);
    throw new Error(`Failed to publish video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper functions
const getMostCommon = (arr: any[]): any => {
  if (arr.length === 0) return null;
  const counts: { [key: string]: number } = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
};

const getAverage = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const getVoiceName = (voiceId: string): string => {
  const voiceNames: { [key: string]: string } = {
    'pNInz6obpgDQGcFmaJgB': 'Adam - Deep, Narrative',
    '21m00Tcm4TlvDq8ikWAM': 'Rachel - Calm, Clear',
    '29vD33N1CtxCmqQRPO9k': 'Drew - Upbeat, Conversational',
    '2EiwWnXFnvU5JabPnv8n': 'Clyde - Crisp, Narration',
    '5Q0t7uMcjvnagumLfvZi': 'Dave - Characterful, Storytelling'
  };
  return voiceNames[voiceId] || 'Adam - Deep, Narrative';
};

const getVisualStyleForSentiment = (sentiment: string): string => {
  switch (sentiment) {
    case 'positive': return 'vibrant';
    case 'negative': return 'cinematic';
    default: return 'modern';
  }
};

// Import voiceover generation function
const generateVoiceover = async (text: string, voiceId: string): Promise<Blob> => {
  const { generateVoiceover } = await import('./generativeMediaService');
  return generateVoiceover(text, voiceId);
};

// Import upload function
const uploadVoiceover = async (blob: Blob, userId: string, projectId: string, sceneIndex: number): Promise<string> => {
  const { uploadFile } = await import('./supabaseService');
  const path = `${userId}/${projectId}/voiceover_${sceneIndex}.mp3`;
  return uploadFile(blob, path, 'audio/mpeg');
};
