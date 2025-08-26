import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';
import { 
    Project, 
    User, 
    ProjectStatus,
    Platform,
    WorkflowStep,
    Script,
    Analysis,
    CompetitorAnalysisResult,
    SoundDesign,
    LaunchPlan,
    VideoPerformance,
    ChannelAudit,
    Notification,
    ClonedVoice,
    Subscription,
    BrandIdentity,
    Json,
    Database,
} from '../types';
import { PLANS } from './plans';
import { getErrorMessage } from '../utils';

// Centralize the bucket name configuration
const BUCKET_NAME = (import.meta as any).env?.VITE_SUPABASE_ASSETS_BUCKET || (window as any).ENV?.VITE_SUPABASE_ASSETS_BUCKET || 'assets';


// --- Type Aliases for Supabase Payloads ---
// We derive them from the main Database type to ensure they are always in sync
// and to avoid "Type instantiation is excessively deep" errors by breaking down the type chain.
type TProfiles = Database["public"]["Tables"]["profiles"];
type ProfileInsert = TProfiles["Insert"];
type ProfileUpdate = TProfiles["Update"];

type TProjects = Database["public"]["Tables"]["projects"];
type ProjectInsert = TProjects["Insert"];
type ProjectUpdate = TProjects["Update"];

type TNotifications = Database["public"]["Tables"]["notifications"];
type NotificationUpdate = TNotifications["Update"];

type TBrandIdentities = Database["public"]["Tables"]["brand_identities"];
type BrandIdentityInsert = TBrandIdentities["Insert"];
type BrandIdentityUpdate = TBrandIdentities["Update"];


// --- Type Guards for Data Validation ---
const isValidSubscription = (sub: any): sub is Subscription => {
    return sub && typeof sub === 'object' &&
           ['free', 'pro', 'viralyzaier'].includes(sub.planId) &&
           ['active', 'canceled'].includes(sub.status);
};

// Helper to sanitize JSON before sending it to Supabase
const sanitizeJson = (value: any): Json | null => {
    // Simple deep-copy for safety. Prevents issues with complex objects.
    return value ? JSON.parse(JSON.stringify(value)) as Json : null;
}


// --- Mappers ---
export const profileRowToUser = (row: any, youtubeConnected: boolean): User => ({
    id: row.id,
    email: row.email,
    subscription: isValidSubscription(row.subscription) ? row.subscription as Subscription : { planId: 'free', status: 'active', endDate: null },
    aiCredits: row.ai_credits,
    channelAudit: row.channel_audit as unknown as ChannelAudit | null,
    youtubeConnected,
    content_pillars: row.content_pillars || [],
    cloned_voices: (row.cloned_voices as unknown as ClonedVoice[] | null) || [],
});

const userToProfileUpdate = (updates: Partial<User>): ProfileUpdate => {
    const dbUpdates: ProfileUpdate = {};
    if (updates.aiCredits !== undefined) dbUpdates.ai_credits = updates.aiCredits;
    if (updates.channelAudit !== undefined) dbUpdates.channel_audit = sanitizeJson(updates.channelAudit);
    if (updates.cloned_voices !== undefined) dbUpdates.cloned_voices = sanitizeJson(updates.cloned_voices);
    if (updates.content_pillars !== undefined) dbUpdates.content_pillars = updates.content_pillars;
    if (updates.subscription !== undefined) dbUpdates.subscription = sanitizeJson(updates.subscription);
    return dbUpdates;
};

export const projectRowToProject = (row: any): Project => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    topic: row.topic,
    platform: row.platform as Platform,
    videoSize: (row.video_size as Project['videoSize']) || '16:9',
    status: row.status as ProjectStatus,
    title: row.title || null,
    script: (row.script as unknown as Script | null) || null,
    analysis: (row.analysis as unknown as Analysis | null) || null,
    competitorAnalysis: row.competitor_analysis as unknown as CompetitorAnalysisResult | null,
    moodboard: row.moodboard || null,
    assets: (row.assets as any) || {},
    soundDesign: (row.sound_design as unknown as SoundDesign | null) || null,
    launchPlan: (row.launch_plan as unknown as LaunchPlan | null) || null,
    performance: (row.performance as unknown as VideoPerformance | null) || null,
    scheduledDate: row.scheduled_date || null,
    publishedUrl: row.published_url || null,
    lastUpdated: row.last_updated,
    workflowStep: row.workflow_step as WorkflowStep,
    voiceoverVoiceId: row.voiceover_voice_id || null,
    lastPerformanceCheck: row.last_performance_check || null,
    finalVideoUrl: row.final_video_url || null,
    shotstackEditJson: row.shotstack_edit_json || null,
    shotstackRenderId: row.shotstack_render_id || null,
    videoUrl: row.video_url || null,
    voiceoverUrls: row.voiceover_urls || null,
});


// --- Edge Function Invoker ---
export const invokeEdgeFunction = async <T>(
    functionName: string,
    body: object,
    responseType: 'json' | 'blob' = 'json'
  ): Promise<T> => {
    const { data: { session } } = await (supabase.auth as any).getSession();
    if (!session) {
        throw new Error('User not authenticated. Cannot invoke function.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

    const isFormData = body instanceof FormData;
    const headers: HeadersInit = {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
    };
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
            method: 'POST',
            headers: headers,
            body: isFormData ? body : JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBodyText = await response.text();
            let errorMessage = `Edge Function '${functionName}' failed: ${errorBodyText.substring(0, 500)}`;
            try {
                const errorJson = JSON.parse(errorBodyText);
                const mainError = errorJson.error || "An unknown error occurred in the edge function.";
                const details = errorJson.details;
                errorMessage = details ? `${mainError}: ${typeof details === 'string' ? details : JSON.stringify(details).substring(0, 300)}` : mainError;
            } catch (e) {
                // Parsing failed, use raw text.
            }
            throw new Error(errorMessage);
        }
        
        if (responseType === 'blob') {
          return await response.blob() as T;
        }
        
        if (response.status === 204 || response.headers.get('content-length') === '0') {
          return null as T;
        }
    
        return await response.json() as T;

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request to edge function '${functionName}' timed out after 30 seconds.`);
        }
        throw error;
    }
  };

// --- Auth ---
export const getSession = async () => {
    const { data: { session } } = await (supabase.auth as any).getSession();
    return { session };
};

export const onAuthStateChange = (callback: (event: string, session: any | null) => void) => {
    const { data: authListener } = (supabase.auth as any).onAuthStateChange(callback as any);
    return authListener;
};

export const signInWithPassword = async (email: string, password: string): Promise<any | null> => {
    const { data, error } = await (supabase.auth as any).signInWithPassword({ email, password });
    if (error) throw new Error(getErrorMessage(error));
    return data.session;
};

export const signUp = async (email: string, password: string): Promise<void> => {
    const { data, error } = await (supabase.auth as any).signUp({ email, password });
    if (error) throw new Error(getErrorMessage(error));
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await (supabase.auth as any).resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw new Error(getErrorMessage(error));
};

export const signOut = async (): Promise<void> => {
    const { error } = await (supabase.auth as any).signOut();
    if (error) throw new Error(getErrorMessage(error));
};

// --- Profiles ---
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(getErrorMessage(error));
    }
    if (!data) return null;
    
    const { data: tokenData, error: tokenError } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).maybeSingle();
    if(tokenError) {
        console.warn("Could not check for YouTube token:", tokenError.message);
    }

    return profileRowToUser(data, !!tokenData);
};

export const createProfileForUser = async (userId: string, email: string | null | undefined): Promise<User> => {
    const freePlan = PLANS.find(p => p.id === 'free')!;
    const fallbackEmail = email || `user_${userId.split('-')[0]}@viralyzer.app`;
    const newUserProfile: ProfileInsert = {
        id: userId,
        email: fallbackEmail,
        subscription: sanitizeJson({ planId: 'free', status: 'active', endDate: null }),
        ai_credits: freePlan.creditLimit,
    };
    const { data, error } = await (supabase.from('profiles') as any).insert([newUserProfile]).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to create profile: no data returned.");
    return profileRowToUser(data, false);
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
    const dbUpdates: ProfileUpdate = userToProfileUpdate(updates);
    const { data, error } = await (supabase.from('profiles') as any).update(dbUpdates).eq('id', userId).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to update profile: no data returned.");
    const { data: tokenData } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).maybeSingle();
    return profileRowToUser(data, !!tokenData);
};

// --- Projects ---
const DASHBOARD_PROJECT_COLUMNS = 'id, name, topic, platform, status, last_updated, published_url, scheduled_date, workflow_step';

export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select(DASHBOARD_PROJECT_COLUMNS)
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });
    if (error) throw new Error(getErrorMessage(error));
    return (data || []).map(p => projectRowToProject(p));
};

export const getProjectsWithAssetsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });
    if (error) throw new Error(getErrorMessage(error));
    return (data || []).map(p => projectRowToProject(p));
};

export const getProjectDetails = async (projectId: string): Promise<Project | null> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found is not an error
        throw new Error(getErrorMessage(error));
    }
    return data ? projectRowToProject(data) : null;
};


export const createProject = async (projectData: Omit<Project, 'id' | 'lastUpdated'>, userId: string): Promise<Project> => {
    const newProjectData: ProjectInsert = {
        user_id: userId,
        name: projectData.name,
        topic: projectData.topic,
        platform: projectData.platform,
        video_size: projectData.videoSize,
        status: projectData.status,
        workflow_step: projectData.workflowStep,
        title: projectData.title,
        script: sanitizeJson(projectData.script),
        analysis: sanitizeJson(projectData.analysis),
        competitor_analysis: sanitizeJson(projectData.competitorAnalysis),
        moodboard: projectData.moodboard,
        assets: sanitizeJson(projectData.assets),
        sound_design: sanitizeJson(projectData.soundDesign),
        launch_plan: sanitizeJson(projectData.launchPlan),
        performance: sanitizeJson(projectData.performance),
        scheduled_date: projectData.scheduledDate,
        published_url: projectData.publishedUrl,
        last_performance_check: projectData.lastPerformanceCheck,
        voiceover_voice_id: projectData.voiceoverVoiceId,
        final_video_url: projectData.finalVideoUrl,
    };
    
    const table = supabase.from('projects');
    const { data, error } = await table
        .insert([newProjectData] as any)
        .select('*')
        .single();
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to create project: no data returned.");
    return projectRowToProject(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const dbUpdates: ProjectUpdate = { last_updated: new Date().toISOString() };
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if (updates.videoSize !== undefined) dbUpdates.video_size = updates.videoSize;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.script !== undefined) dbUpdates.script = sanitizeJson(updates.script);
    if (updates.analysis !== undefined) dbUpdates.analysis = sanitizeJson(updates.analysis);
    if (updates.competitorAnalysis !== undefined) dbUpdates.competitor_analysis = sanitizeJson(updates.competitorAnalysis);
    if (updates.moodboard !== undefined) dbUpdates.moodboard = updates.moodboard;
    if (updates.assets !== undefined) dbUpdates.assets = sanitizeJson(updates.assets);
    if (updates.soundDesign !== undefined) dbUpdates.sound_design = sanitizeJson(updates.soundDesign);
    if (updates.launchPlan !== undefined) dbUpdates.launch_plan = sanitizeJson(updates.launchPlan);
    if (updates.performance !== undefined) dbUpdates.performance = sanitizeJson(updates.performance);
    if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.publishedUrl !== undefined) dbUpdates.published_url = updates.publishedUrl;
    if (updates.workflowStep !== undefined) dbUpdates.workflow_step = updates.workflowStep;
    if (updates.voiceoverVoiceId !== undefined) dbUpdates.voiceover_voice_id = updates.voiceoverVoiceId;
    if (updates.lastPerformanceCheck !== undefined) dbUpdates.last_performance_check = updates.lastPerformanceCheck;
    if (updates.finalVideoUrl !== undefined) dbUpdates.final_video_url = updates.finalVideoUrl;
    if (updates.shotstackEditJson !== undefined) dbUpdates.shotstack_edit_json = sanitizeJson(updates.shotstackEditJson);
    if (updates.shotstackRenderId !== undefined) dbUpdates.shotstack_render_id = updates.shotstackRenderId;
    if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
    if (updates.voiceoverUrls !== undefined) dbUpdates.voiceover_urls = sanitizeJson(updates.voiceoverUrls);

    const table = supabase.from('projects');
    const { data, error } = await table
        .update(dbUpdates as any)
        .eq('id', projectId)
        .select('*')
        .single();
        
    if (error) {
        throw new Error(getErrorMessage(error));
    }
    if (!data) throw new Error("Failed to update project: no data returned.");
    
    return projectRowToProject(data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw new Error(getErrorMessage(error));
};

// --- Notifications ---
const notificationRowToNotification = (row: any): Notification => ({
    id: row.id,
    user_id: row.user_id,
    project_id: row.project_id,
    message: row.message,
    is_read: row.is_read,
    created_at: row.created_at,
});

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(getErrorMessage(error));
    return (data || []).map(n => notificationRowToNotification(n));
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const updates: NotificationUpdate = { is_read: true };
    const { error } = await (supabase.from('notifications') as any).update(updates).eq('id', notificationId);
    if (error) throw new Error(getErrorMessage(error));
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const updates: NotificationUpdate = { is_read: true };
    const { error } = await (supabase.from('notifications') as any).update(updates).eq('user_id', userId);
    if (error) throw new Error(getErrorMessage(error));
};

// --- Brand Identity ---
const brandIdentityRowToBrandIdentity = (row: any): BrandIdentity => ({
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    name: row.name,
    toneOfVoice: row.tone_of_voice,
    writingStyleGuide: row.writing_style_guide,
    colorPalette: row.color_palette ? (row.color_palette as unknown as BrandIdentity['colorPalette']) : { primary: '#6366f1', secondary: '#ec4899', accent: '#f59e0b' },
    fontSelection: row.font_selection,
    thumbnailFormula: row.thumbnail_formula,
    visualStyleGuide: row.visual_style_guide,
    targetAudience: row.target_audience,
    channelMission: row.channel_mission,
    logoUrl: row.logo_url ?? undefined,
});

export const getBrandIdentitiesForUser = async (userId: string): Promise<BrandIdentity[]> => {
    const { data, error } = await supabase
        .from('brand_identities')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        if (error.message.includes('relation "public.brand_identities" does not exist')) {
            console.warn('Brand identities table not found, skipping. This may be expected if the feature is not enabled.');
            return [];
        }
        throw new Error(getErrorMessage(error));
    }
    return (data || []).map(b => brandIdentityRowToBrandIdentity(b));
};

export const createBrandIdentity = async (identityData: Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>, userId: string): Promise<BrandIdentity> => {
    const newIdentityData: BrandIdentityInsert = {
        user_id: userId,
        name: identityData.name,
        tone_of_voice: identityData.toneOfVoice,
        writing_style_guide: identityData.writingStyleGuide,
        color_palette: identityData.colorPalette,
        font_selection: identityData.fontSelection,
        thumbnail_formula: identityData.thumbnailFormula,
        visual_style_guide: identityData.visualStyleGuide,
        target_audience: identityData.targetAudience,
        channel_mission: identityData.channelMission,
        logo_url: identityData.logoUrl ?? null
    };
    const { data, error } = await (supabase.from('brand_identities') as any).insert([newIdentityData]).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to create brand identity: no data returned.");
    return brandIdentityRowToBrandIdentity(data);
};

export const updateBrandIdentity = async (identityId: string, updates: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>): Promise<BrandIdentity> => {
    const dbUpdates: BrandIdentityUpdate = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.toneOfVoice !== undefined) dbUpdates.tone_of_voice = updates.toneOfVoice;
    if (updates.writingStyleGuide !== undefined) dbUpdates.writing_style_guide = updates.writingStyleGuide;
    if (updates.colorPalette !== undefined) dbUpdates.color_palette = updates.colorPalette;
    if (updates.fontSelection !== undefined) dbUpdates.font_selection = updates.fontSelection;
    if (updates.thumbnailFormula !== undefined) dbUpdates.thumbnail_formula = updates.thumbnailFormula;
    if (updates.visualStyleGuide !== undefined) dbUpdates.visual_style_guide = updates.visualStyleGuide;
    if (updates.targetAudience !== undefined) dbUpdates.target_audience = updates.targetAudience;
    if (updates.channelMission !== undefined) dbUpdates.channel_mission = updates.channelMission;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;

    const { data, error } = await (supabase
        .from('brand_identities') as any)
        .update(dbUpdates)
        .eq('id', identityId)
        .select('*')
        .single();
        
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to update brand identity: no data returned.");
    return brandIdentityRowToBrandIdentity(data);
};

export const deleteBrandIdentity = async (identityId: string): Promise<void> => {
    const { error } = await supabase.from('brand_identities').delete().eq('id', identityId);
    if (error) throw new Error(getErrorMessage(error));
};

// --- Storage & Asset Helpers ---

export const uploadFile = async (file: Blob, path: string, contentType?: string): Promise<string> => {
    const uploadOptions: { cacheControl: string; upsert: boolean; contentType?: string } = {
        cacheControl: '3600',
        upsert: true,
    };
    if (contentType) {
        uploadOptions.contentType = contentType;
    }

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, uploadOptions);

    if (error) {
        if (error.message.includes('Bucket not found')) {
            throw new Error(`Supabase Storage error: The bucket named "${BUCKET_NAME}" was not found. Please ensure it exists and is public.`);
        }
        throw new Error(`Failed to upload file to Supabase Storage: ${getErrorMessage(error)}`);
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    if (!publicUrl) {
        throw new Error("Could not get public URL for uploaded file.");
    }
    return publicUrl;
};

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};