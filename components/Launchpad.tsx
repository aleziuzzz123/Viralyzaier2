import React, { useState } from 'react';
import { Project, LaunchPlan } from '../types';
import { generateSeo, analyzeAndGenerateThumbnails, getSchedulingSuggestion, repurposeProject } from '../services/geminiService';
import { publishVideo } from '../services/youtubeService';
import { SparklesIcon, ClipboardCopyIcon, DownloadIcon, YouTubeIcon, CheckCircleIcon, CalendarIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';

interface LaunchpadProps {
    project: Project;
}

const Launchpad: React.FC<LaunchpadProps> = ({ project }) => {
    const { user, consumeCredits, addToast, handleUpdateProject, t, setActiveProjectId, lockAndExecute, openScheduleModal, handleCreateProjectFromIdea } = useAppContext();
    const [loading, setLoading] = useState<{ seo?: boolean, thumbnails?: boolean, promotion?: boolean, schedule?: boolean, repurpose?: boolean }>({});
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scheduleSuggestion, setScheduleSuggestion] = useState<string | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('toast.copied'), 'success');
    };

    const handleCopyForYouTube = () => {
        if (!project.title || !project.launchPlan?.seo) {
            addToast("SEO data not available.", 'error');
            return;
        }

        const { description, tags } = project.launchPlan.seo;
        const clipboardText = `TITLE:\n${project.title}\n\nDESCRIPTION:\n${description}\n\nTAGS:\n${tags.join(', ')}`;
        
        navigator.clipboard.writeText(clipboardText);
        addToast("Title, description, and tags copied!", 'success');
    };

    const handleGenerateSeo = () => lockAndExecute(async () => {
        if (!project.script || !project.title) return;
        if (!await consumeCredits(1)) return;
        setLoading({ seo: true });
        try {
            const seo = await generateSeo(project.title, project.script, project.platform);
            const updatedLaunchPlan: LaunchPlan = { 
                ...(project.launchPlan || { thumbnails: null, promotionPlan: null, seo: { description: '', tags: [] } }),
                seo 
            };
            await handleUpdateProject({ id: project.id, launchPlan: updatedLaunchPlan });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate SEO.');
        } finally {
            setLoading({});
        }
    });
    
    const handleGenerateThumbnails = () => lockAndExecute(async () => {
        if (!project.title || !user) return;
        if (!await consumeCredits(4)) return; // Generate 2 images for 4 credits
        setLoading({ thumbnails: true });
        try {
            const thumbnails = await analyzeAndGenerateThumbnails(project.title, project.platform);
            const updatedLaunchPlan: LaunchPlan = { 
                ...(project.launchPlan || { seo: { description: '', tags: [] }, thumbnails: null, promotionPlan: null }),
                thumbnails 
            };
            await handleUpdateProject({ id: project.id, launchPlan: updatedLaunchPlan });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate thumbnails.');
        } finally {
            setLoading({});
        }
    });
    
    const handleGetScheduleSuggestion = () => lockAndExecute(async () => {
        if (!project.topic) return;
        if (!await consumeCredits(1)) return;
        setLoading({ schedule: true });
        try {
            const suggestion = await getSchedulingSuggestion(project.topic);
            setScheduleSuggestion(suggestion);
        } catch (e) {
             setError(e instanceof Error ? e.message : 'Failed to get suggestion.');
        } finally {
            setLoading({});
        }
    });

    const handlePublishToYouTube = () => lockAndExecute(async () => {
        // The project.publishedUrl here is the URL to the video file in Supabase storage,
        // which was set during the "Assemble & Analyze" step.
        if (!project.publishedUrl || !project.launchPlan?.thumbnails?.[0] || !project.launchPlan?.seo || !project.title) {
            addToast("Missing video file, SEO, or thumbnail for publishing.", 'error');
            return;
        }
        setIsPublishing(true);
        try {
            const videoUrl = await publishVideo(
                project.publishedUrl,
                project.title,
                project.launchPlan.seo.description,
                project.launchPlan.seo.tags,
                project.launchPlan.thumbnails[0]
            );
            
            await handleUpdateProject({
                id: project.id,
                status: 'Published',
                publishedUrl: videoUrl, // This now stores the final YouTube URL.
            });

            addToast("Video successfully published to YouTube!", 'success');
        } catch (e) {
            addToast(`YouTube publish failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsPublishing(false);
        }
    });
    
     const handleRepurpose = (targetPlatform: 'youtube_short' | 'tiktok') => lockAndExecute(async () => {
        if (!project.script || !project.title) return;
        if (!await consumeCredits(5)) return;
        setLoading({ repurpose: true });
        addToast(`Repurposing for ${targetPlatform}... this may take a moment.`, 'info');
        try {
            const repurposedScript = await repurposeProject(project.script, project.title, project.platform, targetPlatform);
            // Re-using this context function is a clean way to create a new project
            await handleCreateProjectFromIdea({
                idea: `Repurposed: ${project.topic}`,
                reason: `Repurposed from ${project.platform} video.`,
                suggestedTitle: `Shorts Cut: ${project.title}`,
                potentialTitles: [], // Add this to satisfy the type
                type: 'Experimental'
            }, targetPlatform);
            addToast('Repurposed project created! You can find it on your dashboard.', 'success');
        } catch (e) {
            addToast(`Repurposing failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setLoading({ repurpose: false });
        }
    });

    const isPublishingDisabled = isPublishing || !project.publishedUrl || !project.launchPlan?.thumbnails?.[0] || !project.launchPlan?.seo || !project.title;


    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">{t('launchpad.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('launchpad.subtitle')}</p>
            </header>

            {error && <p className="text-red-400 text-center">{error}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SEO & Promotion */}
                <div className="space-y-8">
                    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4 flex flex-col">
                        <h3 className="text-2xl font-bold text-white">{t('launchpad.seo_title')}</h3>
                        {project.launchPlan?.seo ? (
                            <div className="space-y-4 animate-fade-in-up flex-grow flex flex-col">
                                <div className="flex-grow">
                                    <div>
                                        <h4 className="font-semibold text-gray-300 mb-2">{t('launchpad.description_title')}</h4>
                                        <div className="bg-gray-900/50 p-3 rounded-lg text-sm text-gray-400 relative">
                                            <p>{project.launchPlan.seo.description}</p>
                                            <button onClick={() => copyToClipboard(project.launchPlan!.seo!.description)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"><ClipboardCopyIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-gray-300 mb-2">{t('launchpad.tags_title')}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {project.launchPlan.seo.tags.map((tag: string) => <span key={tag} className="px-2 py-1 bg-gray-700 text-xs rounded-full">{tag}</span>)}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 border-t border-gray-700/50 pt-4">
                                    <button
                                        onClick={handleCopyForYouTube}
                                        className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition-colors"
                                    >
                                        <ClipboardCopyIcon className="w-5 h-5 mr-2" />
                                        {t('launchpad.copy_for_youtube')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={handleGenerateSeo} disabled={loading.seo} className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                {loading.seo ? t('launchpad.seo_generating') : t('launchpad.seo_button')}
                            </button>
                        )}
                    </div>
                     <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                        <h3 className="text-2xl font-bold text-white">Content Repurposing Engine</h3>
                        <p className="text-sm text-gray-400">Turn this video into multiple pieces of content with one click.</p>
                         {project.platform === 'youtube_long' && (
                              <button onClick={() => handleRepurpose('youtube_short')} disabled={loading.repurpose} className="w-full inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                {loading.repurpose ? "Repurposing..." : "Create YouTube Short (5 Credits)"}
                            </button>
                         )}
                         {project.platform.includes('short') || project.platform === 'tiktok' ? (
                             <p className="text-sm text-center text-gray-500">Repurposing is available for long-form videos.</p>
                         ) : null}
                    </div>
                </div>

                {/* Thumbnails & Publishing */}
                 <div className="space-y-8">
                    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                         <h3 className="text-2xl font-bold text-white">{t('launchpad.thumbnail_title')}</h3>
                         {project.launchPlan?.thumbnails ? (
                             <div className="grid grid-cols-1 gap-4 animate-fade-in-up">
                                {project.launchPlan.thumbnails.map((thumb: string, i: number) => (
                                    <div key={i} className="relative group aspect-video">
                                        <img src={thumb} alt={`Thumbnail ${i+1}`} className="w-full h-full rounded-lg object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <a href={thumb} download={`thumbnail_${i+1}.jpg`} className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30"><DownloadIcon className="w-5 h-5" /></a>
                                        </div>
                                    </div>
                                ))}
                             </div>
                         ) : (
                             <button onClick={handleGenerateThumbnails} disabled={loading.thumbnails} className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                                 <SparklesIcon className="w-5 h-5 mr-2" />
                                {loading.thumbnails ? t('launchpad.thumbnail_designing') : t('launchpad.thumbnail_button', { count: 2, credits: 4 })}
                             </button>
                         )}
                    </div>
                     <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                        <h3 className="text-2xl font-bold text-white">{t('launchpad.predictive_scheduling_title')}</h3>
                         {scheduleSuggestion ? (
                             <div className="bg-gray-900/50 p-4 rounded-lg text-center animate-fade-in-up">
                                 <p className="text-gray-300">{scheduleSuggestion}</p>
                             </div>
                         ) : (
                            <button onClick={handleGetScheduleSuggestion} disabled={loading.schedule} className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                                <CalendarIcon className="w-5 h-5 mr-2" />
                                {loading.schedule ? t('launchpad.predictive_scheduling_fetching') : t('launchpad.predictive_scheduling_button')}
                            </button>
                         )}
                    </div>
                     <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                        <h3 className="text-2xl font-bold text-white">Direct Publishing</h3>
                        {user?.youtubeConnected ? (
                             project.status === 'Published' && project.publishedUrl && project.publishedUrl.includes('youtube.com') ? (
                                <div className="text-center animate-fade-in-up">
                                    <CheckCircleIcon className="w-16 h-16 mx-auto text-green-400 mb-4" />
                                    <h4 className="text-lg font-bold text-white">Published!</h4>
                                    <a href={project.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline break-all block mt-2">
                                        {project.publishedUrl}
                                    </a>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={handlePublishToYouTube} disabled={isPublishingDisabled} className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title={isPublishingDisabled ? "Assemble video, generate SEO & Thumbnails to enable" : ""}>
                                        <YouTubeIcon className="w-5 h-5 mr-2" />
                                        {isPublishing ? "Publishing..." : "Publish"}
                                    </button>
                                     <button onClick={() => openScheduleModal(project.id)} className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors">
                                        <CalendarIcon className="w-5 h-5 mr-2" />
                                        Schedule
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-400 mb-4">Connect your YouTube channel to enable direct publishing.</p>
                                <button onClick={() => setActiveProjectId(null)} className="font-semibold text-indigo-400 hover:underline">
                                    Go to My Channel Hub
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Launchpad;