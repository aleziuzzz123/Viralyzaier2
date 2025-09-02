import React, { useState } from 'react';
import { Project, LaunchPlan } from '../types';
import { generateSeo, analyzeAndGenerateThumbnails, getSchedulingSuggestion, repurposeProject } from '../services/geminiService';
import { publishVideo, publishToMultiplePlatforms, getOptimalPublishingTimes } from '../services/youtubeService';
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
    const [selectedPlatforms, setSelectedPlatforms] = useState<Array<'youtube_long' | 'youtube_short' | 'tiktok' | 'instagram'>>(['youtube_long']);
    const [publishingResults, setPublishingResults] = useState<Array<{ platform: string; videoUrl: string; status: string; error?: string }> | null>(null);
    const [optimalTimes, setOptimalTimes] = useState<any>(null);

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
            await handleUpdateProject(project.id, { launchPlan: updatedLaunchPlan });
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
            await handleUpdateProject(project.id, { launchPlan: updatedLaunchPlan });
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

    const handlePublishToPlatforms = () => lockAndExecute(async () => {
        if (!project.finalVideoUrl || !project.launchPlan?.thumbnails?.[0] || !project.launchPlan?.seo || !project.title) {
            addToast("Missing video file, SEO, or thumbnail for publishing.", 'error');
            return;
        }
        
        if (selectedPlatforms.length === 0) {
            addToast("Please select at least one platform to publish to.", 'error');
            return;
        }

        setIsPublishing(true);
        setPublishingResults(null);
        
        try {
            const results = await publishToMultiplePlatforms(
                project.finalVideoUrl,
                project.title,
                project.launchPlan.seo.description,
                project.launchPlan.seo.tags,
                project.launchPlan.thumbnails[0],
                selectedPlatforms
            );
            
            setPublishingResults(results);
            
            const successfulPublishes = results.filter(r => r.status === 'success');
            const failedPublishes = results.filter(r => r.status === 'failed');
            
            if (successfulPublishes.length > 0) {
                await handleUpdateProject(project.id, {
                    status: 'Published',
                    publishedUrl: successfulPublishes[0].videoUrl, // Use first successful URL as primary
                });
                
                addToast(`Successfully published to ${successfulPublishes.length} platform(s)!`, 'success');
            }
            
            if (failedPublishes.length > 0) {
                addToast(`Failed to publish to ${failedPublishes.length} platform(s). Check results below.`, 'error');
            }
            
        } catch (e) {
            addToast(`Publishing failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsPublishing(false);
        }
    });

    const handleGetOptimalTimes = () => lockAndExecute(async () => {
        try {
            const times = await getOptimalPublishingTimes(project.platform);
            setOptimalTimes(times);
        } catch (e) {
            addToast(`Failed to get optimal times: ${getErrorMessage(e)}`, 'error');
        }
    });
    
     const handleRepurpose = (targetPlatform: 'youtube_short' | 'tiktok') => lockAndExecute(async () => {
        if (!project.script || !project.title) return;
        if (!await consumeCredits(5)) return;
        setLoading({ repurpose: true });
        addToast(`Repurposing for ${targetPlatform}... this may take a moment.`, 'info');
        try {
            const repurposedScript = await repurposeProject(project.script, project.title, project.platform, targetPlatform);
            await handleCreateProjectFromIdea({
                idea: `Repurposed: ${project.topic}`,
                reason: `Repurposed from ${project.platform} video.`,
                suggestedTitle: `Shorts Cut: ${project.title}`,
                potentialTitles: [], 
                type: 'Experimental'
            }, targetPlatform);
            addToast('Repurposed project created! You can find it on your dashboard.', 'success');
        } catch (e) {
            addToast(`Repurposing failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setLoading({ repurpose: false });
        }
    });

    const isPublishingDisabled = isPublishing || !project.finalVideoUrl || !project.launchPlan?.thumbnails?.[0] || !project.launchPlan?.seo || !project.title || selectedPlatforms.length === 0;


    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">{t('launchpad.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('launchpad.subtitle')}</p>
                
                {/* Workflow Progress Indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-6">
                    <span>Stage 6 of 6 - Final Stage</span>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6].map((step) => (
                            <div
                                key={step}
                                className={`w-2 h-2 rounded-full ${
                                    step <= 6 ? 'bg-indigo-600' : 'bg-gray-600'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {error && <p className="text-red-400 text-center">{error}</p>}

            {/* Platform Selection */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">🎯 Select Publishing Platforms</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { id: 'youtube_long', name: 'YouTube Long', icon: '📺', description: 'Long-form videos' },
                        { id: 'youtube_short', name: 'YouTube Shorts', icon: '📱', description: 'Short vertical videos' },
                        { id: 'tiktok', name: 'TikTok', icon: '🎵', description: 'Short viral videos' },
                        { id: 'instagram', name: 'Instagram', icon: '📸', description: 'Reels & Stories' }
                    ].map((platform) => (
                        <label key={platform.id} className="cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedPlatforms.includes(platform.id as any)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedPlatforms([...selectedPlatforms, platform.id as any]);
                                    } else {
                                        setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                                    }
                                }}
                                className="sr-only"
                            />
                            <div className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                                selectedPlatforms.includes(platform.id as any)
                                    ? 'border-indigo-500 bg-indigo-500/10'
                                    : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                            }`}>
                                <div className="text-2xl mb-2">{platform.icon}</div>
                                <h4 className="font-semibold text-white text-sm">{platform.name}</h4>
                                <p className="text-gray-400 text-xs">{platform.description}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Publishing Results */}
            {publishingResults && (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">📊 Publishing Results</h3>
                    <div className="space-y-4">
                        {publishingResults.map((result, index) => (
                            <div key={index} className={`p-4 rounded-xl border-2 ${
                                result.status === 'success' 
                                    ? 'border-green-500 bg-green-500/10' 
                                    : 'border-red-500 bg-red-500/10'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">
                                            {result.platform === 'youtube_long' ? '📺' :
                                             result.platform === 'youtube_short' ? '📱' :
                                             result.platform === 'tiktok' ? '🎵' : '📸'}
                                        </span>
                                        <div>
                                            <h4 className="font-semibold text-white capitalize">
                                                {result.platform.replace('_', ' ')}
                                            </h4>
                                            <p className={`text-sm ${
                                                result.status === 'success' ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {result.status === 'success' ? 'Published Successfully' : 'Failed to Publish'}
                                            </p>
                                        </div>
                                    </div>
                                    {result.status === 'success' && result.videoUrl && (
                                        <a 
                                            href={result.videoUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
                                        >
                                            View Video
                                        </a>
                                    )}
                                </div>
                                {result.error && (
                                    <p className="text-red-400 text-sm mt-2">{result.error}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                                    <button onClick={handlePublishToPlatforms} disabled={isPublishingDisabled} className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title={isPublishingDisabled ? "Assemble video, generate SEO & Thumbnails to enable" : ""}>
                                        <YouTubeIcon className="w-5 h-5 mr-2" />
                                        {isPublishing ? "Publishing..." : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length > 1 ? 's' : ''}`}
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