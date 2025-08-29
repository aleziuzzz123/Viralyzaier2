// --- Core Types ---
export type PlanId = 'free' | 'pro' | 'viralyzaier';
export type ProjectStatus = 'Autopilot' | 'Idea' | 'Scripting' | 'Rendering' | 'Scheduled' | 'Published' | 'Failed' | 'Rendered';
export type Platform = 'youtube_long' | 'youtube_short' | 'tiktok' | 'instagram';
export type WorkflowStep = 1 | 2 | 3 | 4 | 5;
export type VideoStyle = 'High-Energy Viral' | 'Cinematic Documentary' | 'Clean & Corporate' | 'Animation' | 'Historical Documentary' | 'Vlog' | 'Whiteboard';
export type AiVideoModel = 'runwayml' | 'kling' | 'minimax' | 'seedance';

// A specific, non-recursive type for JSON to prevent "Type instantiation is excessively deep" errors
// with the Supabase client, which can occur with complex, auto-generated schemas.
// Using `any` is a pragmatic solution to TypeScript's complexity limits with Supabase's generated types.
export type Json = any;


// --- UI & System Types ---
export interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }
export interface Plan {
    id: PlanId;
    name: string;
    price: number;
    creditLimit: number;
    features: string[];
    isMostPopular?: boolean;
}
export interface Subscription { planId: PlanId; status: 'active' | 'canceled'; endDate: string | null; }

export interface ShotstackOutput {
  format: string;
  size: {
    width: number;
    height: number;
  };
}

export interface ShotstackTimeline {
  background: string;
  tracks: any[];
}

export interface ShotstackEditJson {
  timeline: ShotstackTimeline;
  output: ShotstackOutput;
}

export interface ShotstackClipSelection {
  clip: any; // The full clip object from Shotstack
  trackIndex: number;
  clipIndex: number;
}


// --- User & Brand Types ---
export interface ChannelAudit {
  contentPillars: string[];
  audiencePersona: string;
  viralFormula: string;
  opportunities: Opportunity[];
}

export interface User {
  id: string;
  email: string;
  subscription: Subscription;
  aiCredits: number;
  channelAudit: ChannelAudit | null;
  youtubeConnected: boolean;
  content_pillars: string[];
  cloned_voices: ClonedVoice[];
  isPersonalized?: boolean;
}

export interface ClonedVoice { id: string; name: string; status: 'ready' | 'pending' | 'failed'; }
export interface BrandIdentity {
    id: string;
    user_id: string;
    created_at: string;
    name: string;
    toneOfVoice: string;
    writingStyleGuide: string;
    colorPalette: { primary: string, secondary: string, accent: string };
    fontSelection: string;
    thumbnailFormula: string;
    visualStyleGuide: string;
    targetAudience: string;
    channelMission: string;
    logoUrl?: string;
}

// --- Project & Content Types ---
export interface Project {
  id: string;
  userId?: string;
  name: string;
  topic: string;
  platform: Platform;
  videoSize: '16:9' | '9:16' | '1:1';
  status: ProjectStatus;
  lastUpdated: string;
  title: string | null;
  script: Script | null;
  analysis: Analysis | null;
  competitorAnalysis: CompetitorAnalysisResult | null;
  moodboard: string[] | null;
  assets: { [key: string]: SceneAssets };
  soundDesign: SoundDesign | null;
  launchPlan: LaunchPlan | null;
  performance: VideoPerformance | null;
  scheduledDate: string | null;
  publishedUrl: string | null;
  workflowStep: WorkflowStep;
  voiceoverVoiceId: string | null;
  lastPerformanceCheck: string | null;
  finalVideoUrl?: string | null;
  shotstackEditJson?: ShotstackEditJson | null;
  shotstackRenderId?: string | null;
  videoUrl?: string | null;
  voiceoverUrls?: { [key: number]: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface Scene {
  visual: string;
  voiceover?: string;
  onScreenText?: string;
  timecode: string;
  storyboardImageUrl?: string;
}
export interface Script {
  id?: string;
  tone?: string;
  isNew?: boolean;
  hook?: string;
  hooks?: string[];
  scenes: Scene[];
  cta?: string;
  selectedHookIndex?: number;
}
export interface MoodboardImage { prompt: string; url: string; }
export interface Blueprint { suggestedTitles: string[]; script: Script; moodboard: string[]; strategicSummary: string; platform: Platform; }
export interface SceneAssets { visualUrl: string | null; voiceoverUrl: string | null; }

export interface SfxObject {
  description: string;
  timecode: string;
  url?: string; // Populated after generation
}
export interface SoundDesign {
  musicQuery: string | null;
  musicUrl: string | null;
  sfx: SfxObject[];
}
export interface LaunchPlan {
  seo: { description: string; tags: string[]; };
  thumbnails: string[] | null;
  promotionPlan: { platform: string; action: string; }[] | null;
}

// --- Analysis & Intelligence Types ---
export type ScriptGoal = 'educate' | 'subscribe' | 'sell' | 'entertain';
export interface ScriptOptimization {
    initialScore: number;
    finalScore: number;
    analysisLog: { step: string; target: string; }[];
    finalScript: Script;
}
export interface TitleAnalysis { score: number; pros: string[]; cons: string[]; }
export interface Analysis {
  scores: { overall: number; hook: number; pacing: number; audio: number; cta: number; };
  summary: string;
  goldenNugget: string;
  strengths: string[];
  improvements: { suggestion: string; reason: string; }[];
}
export interface CompetitorAnalysisResult {
  videoTitle: string;
  viralityDeconstruction: string;
  stealableStructure: { step: string; description: string; }[];
  extractedKeywords: string[];
  suggestedTitles: string[];
  sources?: { uri: string; title: string; }[];
}
export interface ChannelStats {
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  topPerformingVideo: { title: string; views: number; };
}
export interface VideoPerformance { views: number; likes: number; comments: number; retention: number; }
export interface PerformanceReview { summary: string; whatWorked: string[]; whatToImprove: string[]; }
export interface Opportunity { idea: string; reason: string; suggestedTitle: string; type: 'Quick Win' | 'Growth Bet' | 'Experimental'; }
export interface ContentGapSuggestion { idea: string; reason: string; potentialTitles: string[]; }
export interface ViralTrendSuggestion {
    topic: string;
    angle: string;
    hook: string;
    suggestedTitle: string;
    source: {
        title: string;
        uri: string;
    };
}
export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

// --- Asset & Media Types ---
export interface UserAsset { id: string; user_id: string; url: string; type: 'video' | 'audio' | 'image'; name: string; created_at: string; }

export interface Subtitle {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface TimelineState {
  subtitles: Subtitle[];
  [key: string]: any;
}

export interface SubtitleWord {
  word: string;
  style?: {
    fontWeight?: number;
    color?: string;
  };
}

export interface StockAsset {
  id: number;
  image?: string;
  src?: { medium: string; large2x: string };
  video_files?: { quality: string; link: string }[];
  photographer?: string;
  alt?: string;
  duration?: number;
  previewURL?: string;
  largeImageURL?: string;
  videos?: { medium: { url: string } };
  user?: string;
  picture_id?: string;
}

export interface NormalizedStockAsset {
  id: number | string;
  previewImageUrl: string;
  downloadUrl: string;
  type: 'video' | 'image' | 'audio' | 'sticker';
  description: string;
  duration?: number;
  provider: 'pexels' | 'pixabay' | 'jamendo' | 'giphy';
}

export interface JamendoTrack {
  id: string;
  image: string;
  audio: string;
  name: string;
  artist_name: string;
  duration: number;
}

export interface GiphyAsset {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      webp: string;
    };
    original: {
      url: string;
      webp: string;
    };
  };
}

// --- Database Types (Auto-generated from Supabase) ---
export type Database = {
  public: {
    Tables: {
      brand_identities: {
        Row: {
          channel_mission: string | null
          color_palette: Json | null
          created_at: string
          font_selection: string | null
          id: string
          logo_url: string | null
          name: string | null
          target_audience: string | null
          thumbnail_formula: string | null
          tone_of_voice: string | null
          user_id: string
          visual_style_guide: string | null
          writing_style_guide: string | null
        }
        Insert: {
          channel_mission?: string | null
          color_palette?: Json | null
          created_at?: string
          font_selection?: string | null
          id?: string
          logo_url?: string | null
          name?: string | null
          target_audience?: string | null
          thumbnail_formula?: string | null
          tone_of_voice?: string | null
          user_id: string
          visual_style_guide?: string | null
          writing_style_guide?: string | null
        }
        Update: {
          channel_mission?: string | null
          color_palette?: Json | null
          created_at?: string
          font_selection?: string | null
          id?: string
          logo_url?: string | null
          name?: string | null
          target_audience?: string | null
          thumbnail_formula?: string | null
          tone_of_voice?: string | null
          user_id?: string
          visual_style_guide?: string | null
          writing_style_guide?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_credits: number
          channel_audit: Json | null
          cloned_voices: Json | null
          content_pillars: string[] | null
          email: string
          id: string
          stripe_customer_id: string | null
          subscription: Json | null
        }
        Insert: {
          ai_credits?: number
          channel_audit?: Json | null
          cloned_voices?: Json | null
          content_pillars?: string[] | null
          email: string
          id: string
          stripe_customer_id?: string | null
          subscription?: Json | null
        }
        Update: {
          ai_credits?: number
          channel_audit?: Json | null
          cloned_voices?: Json | null
          content_pillars?: string[] | null
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscription?: Json | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          analysis: Json | null
          assets: Json | null
          competitor_analysis: Json | null
          final_video_url: string | null
          id: string
          last_performance_check: string | null
          last_updated: string
          launch_plan: Json | null
          moodboard: string[] | null
          name: string
          performance: Json | null
          platform: "youtube_long" | "youtube_short" | "tiktok" | "instagram"
          published_url: string | null
          scheduled_date: string | null
          script: Json | null
          shotstack_edit_json: Json | null
          shotstack_render_id: string | null
          sound_design: Json | null
          status: "Autopilot" | "Idea" | "Scripting" | "Rendering" | "Scheduled" | "Published" | "Failed" | "Rendered"
          title: string | null
          topic: string
          user_id: string
          video_size: string | null
          video_url: string | null
          voiceover_urls: Json | null
          voiceover_voice_id: string | null
          workflow_step: number
        }
        Insert: {
          analysis?: Json | null
          assets?: Json | null
          competitor_analysis?: Json | null
          final_video_url?: string | null
          id?: string
          last_performance_check?: string | null
          last_updated?: string
          launch_plan?: Json | null
          moodboard?: string[] | null
          name: string
          performance?: Json | null
          platform: "youtube_long" | "youtube_short" | "tiktok" | "instagram"
          published_url?: string | null
          scheduled_date?: string | null
          script?: Json | null
          shotstack_edit_json?: Json | null
          shotstack_render_id?: string | null
          sound_design?: Json | null
          status: "Autopilot" | "Idea" | "Scripting" | "Rendering" | "Scheduled" | "Published" | "Failed" | "Rendered"
          title?: string | null
          topic: string
          user_id: string
          video_size?: string | null
          video_url?: string | null
          voiceover_urls?: Json | null
          voiceover_voice_id?: string | null
          workflow_step: number
        }
        Update: {
          analysis?: Json | null
          assets?: Json | null
          competitor_analysis?: Json | null
          final_video_url?: string | null
          id?: string
          last_performance_check?: string | null
          last_updated?: string
          launch_plan?: Json | null
          moodboard?: string[] | null
          name?: string
          performance?: Json | null
          platform?: "youtube_long" | "youtube_short" | "tiktok" | "instagram"
          published_url?: string | null
          scheduled_date?: string | null
          script?: Json | null
          shotstack_edit_json?: Json | null
          shotstack_render_id?: string | null
          sound_design?: Json | null
          status?: "Autopilot" | "Idea" | "Scripting" | "Rendering" | "Scheduled" | "Published" | "Failed" | "Rendered"
          title?: string | null
          topic?: string
          user_id?: string
          video_size?: string | null
          video_url?: string | null
          voiceover_urls?: Json | null
          voiceover_voice_id?: string | null
          workflow_step?: number
        }
        Relationships: []
      }
      user_youtube_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          refresh_token: string
          scope: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          refresh_token: string
          scope: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          refresh_token?: string
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      video_jobs: {
        Row: {
          id: string
          created_at: string
          project_id: string
          user_id: string
          status: string
          job_payload: Json | null
          updated_at: string
          error_message: string | null
          output_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          user_id: string
          status?: string
          job_payload?: Json | null
          updated_at?: string
          error_message?: string | null
          output_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          user_id?: string
          status?: string
          job_payload?: Json | null
          updated_at?: string
          error_message?: string | null
          output_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      platform: "youtube_long" | "youtube_short" | "tiktok" | "instagram"
      project_status: "Autopilot" | "Idea" | "Scripting" | "Rendering" | "Scheduled" | "Published" | "Failed" | "Rendered"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
