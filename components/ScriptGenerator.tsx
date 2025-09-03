import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, Script, Scene, VideoStyle, BrandIdentity, ClonedVoice } from '../types';
import { CheckBadgeIcon, MagicWandIcon, SparklesIcon, PlusIcon, TrashIcon, CheckCircleIcon, PhotoIcon, FilmIcon, TypeIcon, PaintBrushIcon, ScriptIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { rewriteScriptScene, generateVideoBlueprint } from '../services/geminiService';
import { getErrorMessage } from '../utils';
import { ELEVENLABS_VOICES, generateVoiceover } from '../services/generativeMediaService';
import { uploadFile, dataUrlToBlob, getBrandIdentitiesForUser, invokeEdgeFunction } from '../services/supabaseService';

interface ScriptEditorProps {
    project: Project;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ project }) => {
    const { t, user, consumeCredits, lockAndExecute, addToast, handleUpdateProject } = useAppContext();
    const [script, setScript] = useState<Script | null>(project.script);
    const [activeCopilot, setActiveCopilot] = useState<number | null>(null);
    const [isRewriting, setIsRewriting] = useState(false);
    const copilotRef = useRef<HTMLDivElement>(null);
    const [isSavingScript, setIsSavingScript] = useState(false);
    const [voiceoverProgress, setVoiceoverProgress] = useState<string | null>(null);
    const [brandIdentities, setBrandIdentities] = useState<BrandIdentity[]>([]);

    // New state for Blueprint generation
    const [isGeneratingBlueprint, setIsLoadingBlueprint] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [videoStyle, setVideoStyle] = useState<VideoStyle>('High-Energy Viral');
    const [videoSize, setVideoSize] = useState<'16:9' | '9:16' | '1:1'>(project.videoSize || '16:9');
    const [videoLength, setVideoLength] = useState(60);
    const [isNarratorEnabled, setIsNarratorEnabled] = useState(true);
    const [narrator, setNarrator] = useState('pNInz6obpgDQGcFmaJgB');
    const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(undefined);
    const [shouldGenerateMoodboard, setShouldGenerateMoodboard] = useState(true);
    const selectedBrand = brandIdentities.find((b: BrandIdentity) => b.id === selectedBrandId);
    
    // Quality scoring system
    const [qualityScores, setQualityScores] = useState<{
        script: number;
        visual: number;
        viral: number;
        overall: number;
    } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [improvementSuggestions, setImprovementSuggestions] = useState<string[]>([]);
    
    // Quality analysis function
    const analyzeScriptQuality = (script: Script) => {
        if (!script || !script.scenes || script.scenes.length === 0) return null;
        
        let scriptScore = 0;
        let visualScore = 0;
        let viralScore = 0;
        const suggestions: string[] = [];
        
        // Analyze script quality
        const totalScenes = script.scenes.length;
        const hasHook = script.hook && script.hook.length > 0;
        const hasCTA = script.cta && script.cta.length > 0;
        
        // Calculate average scene length safely
        const scenesWithVoiceover = script.scenes.filter(scene => scene.voiceover && scene.voiceover.length > 0);
        const avgSceneLength = scenesWithVoiceover.length > 0 
            ? scenesWithVoiceover.reduce((acc, scene) => acc + (scene.voiceover?.length || 0), 0) / scenesWithVoiceover.length
            : 0;
        
        // Script scoring (0-10) - More sophisticated scoring with caps
        if (hasHook) scriptScore += 3;
        if (hasCTA) scriptScore += 2;
        if (totalScenes >= 3 && totalScenes <= 8) scriptScore += 2;
        if (avgSceneLength >= 10 && avgSceneLength <= 30) scriptScore += 2;
        if (project.title && project.title.length > 0) scriptScore += 1;
        
        // Additional quality checks (with caps to prevent exceeding 10)
        if (hasHook && script.hook.length > 20 && scriptScore < 10) scriptScore += 1; // Detailed hook
        if (hasCTA && script.cta.length > 10 && scriptScore < 10) scriptScore += 1; // Detailed CTA
        
        // Cap script score at 10
        scriptScore = Math.min(scriptScore, 10);
        
        // Visual scoring (0-10) with caps
        const hasVisuals = script.scenes.some(scene => scene.visual && scene.visual.length > 0);
        const hasMoodboard = project.moodboard && project.moodboard.length > 0;
        if (hasVisuals) visualScore += 4;
        if (hasMoodboard) visualScore += 3;
        if (totalScenes >= 3) visualScore += 2;
        if (videoStyle === 'High-Energy Viral') visualScore += 1;
        
        // Cap visual score at 10
        visualScore = Math.min(visualScore, 10);
        
        // Viral scoring (0-10) with caps
        if (hasHook && script.hook.includes('!')) viralScore += 2;
        if (project.title && (project.title.includes('!') || project.title.includes('?'))) viralScore += 2;
        if (videoStyle === 'High-Energy Viral') viralScore += 3;
        if (videoLength <= 60) viralScore += 2;
        if (hasCTA) viralScore += 1;
        
        // Cap viral score at 10
        viralScore = Math.min(viralScore, 10);
        
        // Generate more specific and actionable suggestions
        if (!hasHook) suggestions.push("🎯 Add a compelling hook in the first 3 seconds to grab attention");
        if (hasHook && script.hook.length < 20) suggestions.push("💡 Expand your hook with more details to increase engagement");
        if (!hasCTA) suggestions.push("📢 Add a clear call-to-action at the end to drive engagement");
        if (hasCTA && script.cta.length < 10) suggestions.push("🎯 Make your CTA more specific and actionable");
        if (totalScenes < 3) suggestions.push("📈 Add 2-3 more scenes for better story structure");
        if (totalScenes > 8) suggestions.push("✂️ Consider combining similar scenes for better focus");
        if (avgSceneLength < 10 && avgSceneLength > 0) suggestions.push("📝 Add more detail to scenes for better engagement");
        if (avgSceneLength > 30) suggestions.push("⚡ Keep scenes under 30 words for better retention");
        if (!hasVisuals) suggestions.push("🎨 Add visual descriptions to each scene for better storytelling");
        if (!hasMoodboard) suggestions.push("🖼️ Generate a moodboard for consistent visual style");
        if (videoLength > 90) suggestions.push("⏱️ Consider 60-90 seconds for better viral potential");
        if (scenesWithVoiceover.length === 0) suggestions.push("🎤 Add voiceover content to make your video more engaging");
        
        const overallScore = Math.round((scriptScore + visualScore + viralScore) / 3);
        
        return {
            script: scriptScore,
            visual: visualScore,
            viral: viralScore,
            overall: overallScore,
            suggestions
        };
    };
    
    // Memoize quality analysis to prevent unnecessary recalculations
    const qualityAnalysis = useMemo(() => {
        if (!project.script) return null;
        return analyzeScriptQuality(project.script);
    }, [project.script, project.title, project.moodboard, videoStyle, videoLength, project.videoSize, project.platform]);
    
    useEffect(() => {
        setScript(project.script);
        if (qualityAnalysis) {
            setQualityScores({
                script: qualityAnalysis.script,
                visual: qualityAnalysis.visual,
                viral: qualityAnalysis.viral,
                overall: qualityAnalysis.overall
            });
            setImprovementSuggestions(qualityAnalysis.suggestions);
        } else {
            setQualityScores(null);
            setImprovementSuggestions([]);
        }
    }, [qualityAnalysis]);

    // One-click improvement functions
    const handleImproveScript = () => lockAndExecute(async () => {
        if (!script || !await consumeCredits(2)) return;
        
        setIsAnalyzing(true);
        try {
            // Regenerate script with viral optimization
            const improvedBlueprint = await generateVideoBlueprint(
                project.topic,
                videoSize === '16:9' ? 'youtube_long' : 'youtube_short',
                'High-Energy Viral', // Force viral style
                (message) => setProgressMessage(message),
                Math.min(videoLength, 60), // Optimize for shorter length
                selectedBrand,
                true, // Always generate moodboard
                isNarratorEnabled
            );
            
            const success = await handleUpdateProject(project.id, {
                script: improvedBlueprint.script,
                moodboard: improvedBlueprint.moodboard,
                workflowStep: 3
            });
            
            if (success) {
                // Update local script state to reflect changes
                setScript(improvedBlueprint.script);
                addToast("Script improved for viral potential! 🚀", "success");
            } else {
                addToast("Failed to save improved script. Please try again.", "error");
            }
        } catch (error) {
            console.error("Script improvement error:", error);
            addToast(`Failed to improve script: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        } finally {
            setIsAnalyzing(false);
        }
    });

    const handleOptimizeForViral = () => lockAndExecute(async () => {
        if (!script || !await consumeCredits(1)) return;
        
        setIsAnalyzing(true);
        try {
            // Optimize current script for viral potential
            const optimizedScript = { ...script };
            let improvementsMade: string[] = [];
            
            // Enhance hook with viral elements
            if (optimizedScript.hook) {
                const originalHook = optimizedScript.hook;
                if (!originalHook.includes('!') && !originalHook.includes('?')) {
                    optimizedScript.hook = originalHook + " This will blow your mind!";
                    improvementsMade.push("Enhanced hook with viral element");
                }
            }
            
            // Enhance title (update project title)
            if (project.title) {
                const originalTitle = project.title;
                if (!originalTitle.includes('!') && !originalTitle.includes('?')) {
                    await handleUpdateProject(project.id, {
                        title: originalTitle.replace(/[.!]$/, '') + "!"
                    });
                    improvementsMade.push("Added viral punctuation to title");
                }
            }
            
            // Add viral elements to scenes (more sophisticated)
            optimizedScript.scenes.forEach((scene, index) => {
                if (scene.voiceover && !scene.voiceover.includes('!') && !scene.voiceover.includes('amazing') && !scene.voiceover.includes('incredible')) {
                    const viralAdditions = [
                        " This is absolutely incredible!",
                        " You won't believe this!",
                        " This will shock you!",
                        " This is mind-blowing!"
                    ];
                    const randomAddition = viralAdditions[index % viralAdditions.length];
                    scene.voiceover = scene.voiceover + randomAddition;
                }
            });
            
            if (improvementsMade.length > 0) {
                improvementsMade.push("Added viral elements to scenes");
            }
            
            const success = await handleUpdateProject(project.id, {
                script: optimizedScript,
                workflowStep: 3
            });
            
            if (success) {
                // Update local script state to reflect changes
                setScript(optimizedScript);
                const improvementText = improvementsMade.length > 0 
                    ? `Script optimized! Improvements: ${improvementsMade.join(', ')} 🔥`
                    : "Script already optimized for viral potential! 🎯";
                
                addToast(improvementText, "success");
            } else {
                addToast("Failed to save optimized script. Please try again.", "error");
            }
        } catch (error) {
            console.error("Viral optimization error:", error);
            addToast(`Failed to optimize script: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        } finally {
            setIsAnalyzing(false);
        }
    });

    useEffect(() => {
        if (user) {
            getBrandIdentitiesForUser(user.id)
                .then(setBrandIdentities)
                .catch(() => addToast("Failed to load brand identities.", "error"));
        }
    }, [user, addToast]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (copilotRef.current && !copilotRef.current.contains(event.target as Node)) {
                setActiveCopilot(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleGenerateBlueprint = () => lockAndExecute(async () => {
        if (!project.topic) { addToast("Project topic is missing.", "error"); return; }
        if (!user) { addToast("User not found.", "error"); return; }
        if (!await consumeCredits(5)) return;
    
        setIsLoadingBlueprint(true);
        setProgressMessage('Kicking off the creative process...');
    
        try {
            // Step 1: Generate the script and visual plan (blueprint) with retry logic
            setProgressMessage('Generating script and visual plan...');
            
            let blueprint;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    blueprint = await generateVideoBlueprint(
                        project.topic,
                        videoSize === '16:9' ? 'youtube_long' : 'youtube_short',
                        videoStyle,
                        (message) => setProgressMessage(message),
                        videoLength,
                        selectedBrand,
                        shouldGenerateMoodboard,
                        isNarratorEnabled
                    );
                    break; // Success, exit retry loop
                } catch (error: any) {
                    retryCount++;
                    const errorMessage = getErrorMessage(error);
                    
                    // Check if it's a Gemini API overload error
                    if (errorMessage.includes('overloaded') || errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE')) {
                        if (retryCount < maxRetries) {
                            const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
                            setProgressMessage(`AI service is busy. Retrying in ${waitTime/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                        } else {
                            throw new Error(`AI service is currently overloaded. Please try again in a few minutes. (Attempted ${maxRetries} times)`);
                        }
                    } else {
                        // For other errors, don't retry
                        throw error;
                    }
                }
            }
    
            const narratorVoiceId = isNarratorEnabled ? narrator : null;
            let scriptWithMergedHook = JSON.parse(JSON.stringify(blueprint.script));
    
            if (scriptWithMergedHook.hooks && scriptWithMergedHook.hooks.length > 0) {
                const hookText = scriptWithMergedHook.hooks[0];
                if (hookText && scriptWithMergedHook.scenes[0]) {
                    scriptWithMergedHook.scenes[0].voiceover = `${hookText} ${scriptWithMergedHook.scenes[0].voiceover}`;
                }
            }
            
            // Step 2: Upload moodboard images and enrich the script with final URLs
            const moodboardUrls: string[] = [];
            if (shouldGenerateMoodboard && blueprint.moodboard && user) {
                const uploadPromises = blueprint.moodboard.map(async (base64Img: string, index: number) => {
                    setProgressMessage(`Uploading visual asset ${index + 1} of ${blueprint.moodboard.length}...`);
                    try {
                        const blob = await dataUrlToBlob(base64Img);
                        const path = `${user.id}/${project.id}/moodboard_${index}.jpg`;
                        return await uploadFile(blob, path, 'image/jpeg');
                    } catch (e) {
                        console.error(`Failed to upload moodboard image ${index}:`, e);
                        return null;
                    }
                });
                const uploadedUrls = await Promise.all(uploadPromises);
                scriptWithMergedHook.scenes.forEach((scene: Scene, index: number) => {
                    const url = uploadedUrls[index];
                    if (url) {
                        scene.storyboardImageUrl = url;
                        moodboardUrls.push(url);
                    }
                });
            }
            
            const updates: Partial<Project> = {
                script: scriptWithMergedHook,
                moodboard: moodboardUrls.length > 0 ? moodboardUrls : blueprint.moodboard,
                title: blueprint.suggestedTitles[0],
                voiceoverVoiceId: narratorVoiceId,
                videoSize: videoSize,
                workflowStep: 3, // Go to blueprint review instead of directly to Creative Studio
                shotstackEditJson: null, shotstackRenderId: null, finalVideoUrl: null, analysis: null,
            };
    
            // Step 3: Generate voiceovers if a narrator is enabled
            if (narratorVoiceId && user) {
                const voiceoverUrls: { [key: number]: string } = {};
                const scenesToProcess = scriptWithMergedHook.scenes.filter((scene: Scene) => scene.voiceover && scene.voiceover.trim() !== '');
                let processedCount = 0;
    
                for (const scene of scriptWithMergedHook.scenes) {
                    const sceneIndex = scriptWithMergedHook.scenes.indexOf(scene);
                    if (scene.voiceover && scene.voiceover.trim() !== '') {
                        processedCount++;
                        setProgressMessage(`Generating voiceover ${processedCount} of ${scenesToProcess.length}...`);
                        const sceneBlob = await generateVoiceover(scene.voiceover, narratorVoiceId);
                        const scenePath = `${user.id}/${project.id}/voiceover_scene_${sceneIndex}.mp3`;
                        voiceoverUrls[sceneIndex] = await uploadFile(sceneBlob, scenePath, 'audio/mpeg');
                    }
                }
                if (Object.keys(voiceoverUrls).length > 0) {
                    updates.voiceoverUrls = voiceoverUrls;
                }
            }
    
            // Step 4: Save all updates and transition the workflow
            setProgressMessage('Finalizing project...');
            await handleUpdateProject(project.id, updates);
            addToast("Blueprint complete! Review your generated content...", "success");
    
        } catch (e) {
            console.error('Blueprint generation error:', e);
            const errorMessage = getErrorMessage(e);
            console.error('Error message:', errorMessage);
            
            // Check if it's a subscription/payment error
                    if (errorMessage.includes('subscription') || errorMessage.includes('payment') || errorMessage.includes('invoice')) {
            addToast(`Subscription issue detected. Attempting to fix...`, 'error');
            
            // Try to fix the subscription status
            try {
                const response = await invokeEdgeFunction('fix-user-subscription', {
                    userId: user.id
                });
                
                if ((response as any).success) {
                    addToast('Subscription status fixed! Please try generating your blueprint again.', 'success');
                } else {
                    addToast(`Subscription issue: ${errorMessage}. Please contact support.`, 'error');
                }
            } catch (fixError) {
                console.error('Failed to fix subscription:', fixError);
                addToast(`Subscription issue: ${errorMessage}. Please contact support.`, 'error');
            }
        } else {
            addToast(`Blueprint generation failed: ${errorMessage}`, 'error');
        }
        } finally {
            setIsLoadingBlueprint(false);
            setProgressMessage('');
        }
    });

    const handleScriptChange = (
        type: 'hook' | 'scene' | 'cta',
        index: number,
        field: 'visual' | 'voiceover' | 'onScreenText' | 'storyboardImageUrl' | 'cta',
        value: string
    ) => {
        if (!script) return;

        const newScript = { ...script };
        if (type === 'hook') {
            const newHooks = [...(newScript.hooks || [])];
            newHooks[index] = value;
            newScript.hooks = newHooks;
        } else if (type === 'cta') {
            newScript.cta = value;
        } else if (type === 'scene') {
            (newScript.scenes[index] as any)[field] = value;
        }
        setScript(newScript);
    };
    
    const handleSelectHook = (index: number) => {
        if (!script) return;
        setScript({ ...script, selectedHookIndex: index });
    };
    
    const addHook = () => {
        if (!script) return;
        const newHooks = [...(script.hooks || []), ''];
        setScript({ ...script, hooks: newHooks });
    };

    const removeHook = (index: number) => {
        if (!script || !script.hooks || script.hooks.length <= 1) return;
        const newHooks = script.hooks.filter((_: string, i: number) => i !== index);
        const newSelectedHookIndex = script.selectedHookIndex === index 
            ? 0 
            : (script.selectedHookIndex && script.selectedHookIndex > index ? script.selectedHookIndex - 1 : script.selectedHookIndex);
        setScript({ ...script, hooks: newHooks, selectedHookIndex: newSelectedHookIndex });
    };

    const handleCopilotAction = async (sceneIndex: number, action: string) => {
        if (!script) return;
        if (!await consumeCredits(1)) return;

        setIsRewriting(true);
        setActiveCopilot(null);
        try {
            const originalScene = script.scenes[sceneIndex];
            const rewrittenScene = await rewriteScriptScene(originalScene, action);

            const newScript = { ...script };
            newScript.scenes[sceneIndex] = { ...originalScene, ...rewrittenScene };
            setScript(newScript);
        } catch (e) {
            console.error("Co-writer failed:", e);
        } finally {
            setIsRewriting(false);
        }
    };
    
    const handleSave = () => lockAndExecute(async () => {
        if (!script || !user) return;
    
        setIsSavingScript(true);
        setVoiceoverProgress('Preparing scenes...');
        try {
            const scriptWithMergedHook = JSON.parse(JSON.stringify(script));
            if (script.hooks && script.hooks.length > 0) {
                const hookText = script.hooks[script.selectedHookIndex ?? 0];
                if (hookText && scriptWithMergedHook.scenes[0]) {
                    scriptWithMergedHook.scenes[0].voiceover = `${hookText} ${scriptWithMergedHook.scenes[0].voiceover}`;
                }
            }
    
            const updates: Partial<Project> = {
                script: scriptWithMergedHook,
                workflowStep: 3,
                // Reset downstream data to ensure the editor rebuilds the timeline from the new script
                shotstackEditJson: null,
                shotstackRenderId: null,
                finalVideoUrl: null,
                analysis: null,
            };
    
            if (project.voiceoverVoiceId) {
                const voiceoverUrls: { [key: number]: string } = {};
                const scenesToProcess = scriptWithMergedHook.scenes.filter((scene: Scene) => scene.voiceover);
                let processedCount = 0;
    
                for (const scene of scriptWithMergedHook.scenes) {
                    const sceneIndex = scriptWithMergedHook.scenes.indexOf(scene);
                    if (scene.voiceover) {
                        processedCount++;
                        setVoiceoverProgress(`Generating voiceover ${processedCount} of ${scenesToProcess.length}...`);
                        const sceneBlob = await generateVoiceover(scene.voiceover, project.voiceoverVoiceId);
                        const scenePath = `${user.id}/${project.id}/voiceover_scene_${sceneIndex}.mp3`;
                        voiceoverUrls[sceneIndex] = await uploadFile(sceneBlob, scenePath, 'audio/mpeg');
                    }
                }
                if (Object.keys(voiceoverUrls).length > 0) {
                    updates.voiceoverUrls = voiceoverUrls;
                }
            }
    
            const success = await handleUpdateProject(project.id, updates);
    
            if (success) {
                addToast("Script saved!", "success");
            }
        } catch (e) {
            addToast(`Failed to save script: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsSavingScript(false);
            setVoiceoverProgress(null);
        }
    });

    const styleOptions: { id: VideoStyle, name: string, icon: React.FC<{className?:string}> }[] = [
        { id: 'High-Energy Viral', name: t('style.viral_name'), icon: SparklesIcon },
        { id: 'Cinematic Documentary', name: t('style.cinematic_name'), icon: FilmIcon },
        { id: 'Clean & Corporate', name: t('style.corporate_name'), icon: TypeIcon },
        { id: 'Animation', name: 'Animation', icon: PaintBrushIcon },
        { id: 'Vlog', name: 'Vlog Style', icon: FilmIcon },
        { id: 'Historical Documentary', name: 'Historical Doc', icon: FilmIcon },
        { id: 'Whiteboard', name: 'Whiteboard', icon: ScriptIcon },
    ];
    
    const copilotActions = [
        { key: 'action_concise', label: t('script_editor.copilot.action_concise') },
        { key: 'action_engaging', label: t('script_editor.copilot.action_engaging') },
        { key: 'action_visual', label: t('script_editor.copilot.action_visual') }
    ];

    if (!project.script) {
        if (isGeneratingBlueprint) {
            return (
                <div className="text-center py-20 px-6 bg-gray-800/50 rounded-2xl max-w-2xl mx-auto space-y-6 animate-fade-in">
                    <h2 className="text-3xl font-bold text-white">Generating Your Blueprint</h2>
                    <p className="text-gray-400">Our AI is crafting your script and visual plan. This may take a moment.</p>
                    <div className="flex justify-center items-center space-x-4">
                        <SparklesIcon className="w-8 h-8 text-indigo-400 animate-pulse" />
                        <p className="text-lg font-semibold text-white">{progressMessage}</p>
                    </div>
                </div>
            );
        }
        
        return (
             <div className="text-center py-10 px-6 bg-gray-800/50 rounded-2xl max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                <h2 className="text-3xl font-bold text-white mb-3">Build Your Blueprint</h2>
                <p className="text-gray-400 mb-6 max-w-xl mx-auto">Define the creative direction for your video. Our AI will use these settings to generate a tailored script and visual plan.</p>
                <div className="space-y-6 text-left">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-3">1. Define Your Video</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="font-semibold text-white">Video Style</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">{styleOptions.map(opt => (<button key={opt.id} onClick={() => setVideoStyle(opt.id)} className={`p-3 text-center rounded-lg border-2 transition-all ${videoStyle === opt.id ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700/50 border-gray-700 hover:border-gray-600'}`}><opt.icon className={`w-6 h-6 mx-auto mb-1 ${videoStyle === opt.id ? 'text-white' : 'text-gray-400'}`} /><p className={`text-xs font-semibold ${videoStyle === opt.id ? 'text-white' : 'text-gray-300'}`}>{opt.name}</p></button>))}</div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="font-semibold text-white">Brand Identity (Optional)</label>
                                    <select value={selectedBrandId || ''} onChange={e => setSelectedBrandId(e.target.value || undefined)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"><option value="">No Brand Identity</option>{brandIdentities.map((brand: BrandIdentity) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
                                </div>
                                <div>
                                    <label className="font-semibold text-white">Video Length: {videoLength}s</label>
                                    <input type="range" min="10" max="300" step="10" value={videoLength} onChange={e => setVideoLength(parseInt(e.target.value))} className="w-full mt-2" />
                                </div>
                                <div>
                                    <label className="font-semibold text-white">Video Size</label>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setVideoSize('16:9')} className={`flex-1 text-xs py-2 rounded ${videoSize === '16:9' ? 'bg-indigo-600' : 'bg-gray-700'}`}>16:9 (Horizontal)</button>
                                        <button onClick={() => setVideoSize('9:16')} className={`flex-1 text-xs py-2 rounded ${videoSize === '9:16' ? 'bg-indigo-600' : 'bg-gray-700'}`}>9:16 (Vertical)</button>
                                        <button onClick={() => setVideoSize('1:1')} className={`flex-1 text-xs py-2 rounded ${videoSize === '1:1' ? 'bg-indigo-600' : 'bg-gray-700'}`}>1:1 (Square)</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-3">2. Audio & Visuals</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="font-semibold text-white">Add AI Narrator (Voice-over)</label>
                                <div className="flex items-center justify-between mt-2 bg-gray-900 rounded-lg p-3">
                                    <p className="text-sm text-gray-400">Enable AI voice-over for your video?</p>
                                    <button onClick={() => setIsNarratorEnabled(!isNarratorEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isNarratorEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isNarratorEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                {isNarratorEnabled && (
                                <div className="mt-4">
                                    <label className="font-semibold text-white">Narrator Voice</label>
                                    <select value={narrator} onChange={e => setNarrator(e.target.value)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                                        <optgroup label="Your Voices">{user?.cloned_voices.map((v: ClonedVoice) => <option key={v.id} value={v.id} disabled={v.status !== 'ready'}>{v.name} ({v.status})</option>)}</optgroup>
                                        <optgroup label="Standard Voices">{ELEVENLABS_VOICES.map((v: { id: string; name: string; }) => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
                                    </select>
                                </div>
                                )}
                            </div>
                             <div>
                                <label className="font-semibold text-white">Generate Visual Moodboard</label>
                                <div className="flex items-center justify-between mt-2 bg-gray-900 rounded-lg p-3">
                                    <p className="text-sm text-gray-400">Generate AI images for each scene?</p>
                                    <button onClick={() => setShouldGenerateMoodboard(!shouldGenerateMoodboard)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shouldGenerateMoodboard ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shouldGenerateMoodboard ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                 <button onClick={handleGenerateBlueprint} disabled={isGeneratingBlueprint} className="mt-8 inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-gray-600">
                    <SparklesIcon className="w-6 h-6 mr-3" />
                    {isGeneratingBlueprint ? 'Generating...' : 'Generate Blueprint & Proceed (5 Credits)'}
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{t('script_editor.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('script_editor.subtitle')}</p>
            </header>

            {/* Quality Scoring System */}
            {qualityScores && (
                <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 p-6 rounded-2xl border border-indigo-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <SparklesIcon className="w-6 h-6 text-indigo-400" />
                            Video Quality Score
                        </h3>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-white">{qualityScores.overall || 0}/10</div>
                            <div className="text-sm text-gray-400">Overall Score</div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-300">Script Quality</span>
                                <span className="text-lg font-bold text-white">{qualityScores.script || 0}/10</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${((qualityScores.script || 0) / 10) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-300">Visual Appeal</span>
                                <span className="text-lg font-bold text-white">{qualityScores.visual || 0}/10</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${((qualityScores.visual || 0) / 10) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-300">Viral Potential</span>
                                <span className="text-lg font-bold text-white">{qualityScores.viral || 0}/10</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${((qualityScores.viral || 0) / 10) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    
                    {/* One-Click Improvement Buttons */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        <button
                            onClick={handleImproveScript}
                            disabled={isAnalyzing}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Improving...
                                </>
                            ) : (
                                <>
                                    <MagicWandIcon className="w-4 h-4 mr-2" />
                                    Improve Script (2 Credits)
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={handleOptimizeForViral}
                            disabled={isAnalyzing}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Optimizing...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-4 h-4 mr-2" />
                                    Optimize for Viral (1 Credit)
                                </>
                            )}
                        </button>
                    </div>
                    
                    {/* Improvement Suggestions */}
                    {improvementSuggestions.length > 0 && (
                        <div className="bg-gray-800/30 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-yellow-400 mb-2">💡 Improvement Suggestions:</h4>
                            <ul className="space-y-1">
                                {improvementSuggestions.map((suggestion, index) => (
                                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                                        <span className="text-yellow-400 mt-0.5">•</span>
                                        {suggestion}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-gray-900/40 p-8 rounded-2xl space-y-8">
                <div>
                    <h4 className="font-bold text-indigo-400 mb-2">{t('script_generator.hooks_title')}</h4>
                     <div className="space-y-3">
                        {script?.hooks?.map((hook: string, index: number) => (
                            <div key={index} className={`flex items-center gap-3 p-1 rounded-lg border transition-all ${script.selectedHookIndex === index ? 'bg-indigo-900/30 border-indigo-500' : 'bg-gray-800/50 border-gray-700'}`}>
                                <button onClick={() => handleSelectHook(index)} className={`p-2 rounded-md ${script.selectedHookIndex === index ? 'text-green-400' : 'text-gray-500 hover:text-white'}`} title="Select this hook"><CheckCircleIcon className="w-5 h-5"/></button>
                                <input type="text" value={hook} onChange={e => handleScriptChange('hook', index, 'visual', e.target.value)} placeholder={`Hook option ${index + 1}`} className="w-full bg-transparent text-gray-300 focus:outline-none" />
                                {script.hooks && script.hooks.length > 1 && (<button onClick={() => removeHook(index)} className="p-1 text-gray-500 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>)}
                            </div>
                        ))}
                        <button onClick={addHook} className="flex items-center gap-1 text-sm font-semibold text-indigo-400 hover:text-indigo-300 mt-2"><PlusIcon className="w-4 h-4" /> Add Hook Option</button>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-bold text-indigo-400 mb-2">{t('script_generator.script_title')}</h4>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
                        {script?.scenes.map((scene: Scene, i: number) => (
                            <div key={i} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-gray-200">Scene {i+1} ({scene.timecode})</p>
                                    <div className="relative" ref={activeCopilot === i ? copilotRef : null}>
                                        <button onClick={() => setActiveCopilot(activeCopilot === i ? null : i)} disabled={isRewriting} className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50">{isRewriting ? <SparklesIcon className="w-5 h-5 animate-pulse"/> : <MagicWandIcon className="w-5 h-5"/>}</button>
                                        {activeCopilot === i && (
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-10 p-2"><p className="text-xs font-bold text-indigo-300 px-2 py-1">{t('script_editor.copilot.title')}</p>{copilotActions.map(action => (<button key={action.key} onClick={() => handleCopilotAction(i, action.label)} className="w-full text-left px-2 py-1.5 text-sm text-gray-200 rounded-md hover:bg-gray-700">{action.label}</button>))}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        {scene.storyboardImageUrl && (<div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center"><img src={scene.storyboardImageUrl} alt={`Storyboard for scene ${i+1}`} className="w-full h-full object-cover rounded-lg"/></div>)}
                                        <label className="text-sm font-bold text-gray-400">{t('script_generator.table_visual')}</label>
                                        <textarea value={scene.visual} onChange={e => handleScriptChange('scene', i, 'visual', e.target.value)} rows={4} className="w-full text-sm bg-gray-700/50 rounded p-2 mt-1 text-gray-300 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"/>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-400">{t('script_generator.table_voiceover')}</label>
                                        <textarea value={scene.voiceover} onChange={e => handleScriptChange('scene', i, 'voiceover', e.target.value)} rows={4} className="w-full text-sm bg-gray-700/50 rounded p-2 mt-1 text-gray-300 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-indigo-400 mb-2">{t('script_generator.cta_title')}</h4>
                    <textarea value={script?.cta || ''} onChange={e => handleScriptChange('cta', 0, 'cta', e.target.value)} rows={2} className="w-full bg-gray-800/50 rounded-lg p-3 text-gray-300 border border-gray-700 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
            </div>
            <div className="text-center">
                <button 
                    onClick={handleSave} 
                    disabled={isSavingScript}
                    className="w-full max-w-sm inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-gray-600 disabled:cursor-wait"
                >
                    <CheckBadgeIcon className="w-6 h-6 mr-3" />
                    {isSavingScript ? (voiceoverProgress || 'Generating Voiceovers...') : t('script_editor.save_button')}
                </button>
            </div>
        </div>
    );
};

export default ScriptEditor;