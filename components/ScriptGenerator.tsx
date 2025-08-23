import React, { useState, useEffect, useRef } from 'react';
import { Project, Script, Scene, VideoStyle, BrandIdentity, ClonedVoice, ShotstackEditJson, ShotstackTimeline, SoundDesign } from '../types';
import { CheckBadgeIcon, MagicWandIcon, SparklesIcon, PlusIcon, TrashIcon, CheckCircleIcon, PhotoIcon, FilmIcon, TypeIcon, PaintBrushIcon, ScriptIcon, InfoIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { rewriteScriptScene, generateVideoBlueprint, generateSoundDesign } from '../services/geminiService';
import { getErrorMessage } from '../utils';
import { ELEVENLABS_VOICES, generateVoiceover, generateSfx } from '../services/generativeMediaService';
import { uploadFile, dataUrlToBlob, getBrandIdentitiesForUser } from '../services/supabaseService';
import { searchJamendoMusic } from '../services/jamendoService';

interface ScriptEditorProps {
    project: Project;
}

const buildTimelineFromProject = (project: Project): ShotstackEditJson | null => {
    if (!project.script) return null;

    const { script, videoSize, voiceoverUrls, soundDesign } = project;

    const size = videoSize === '16:9' ? { width: 1920, height: 1080 } :
                 videoSize === '9:16' ? { width: 1080, height: 1920 } :
                 { width: 1080, height: 1080 };

    const timeline: ShotstackTimeline = {
        background: '#000000',
        tracks: [
            { name: 'A-Roll', clips: [] },    // Visuals
            { name: 'Overlays', clips: [] },  // Text
            { name: 'Audio', clips: [] },     // Voiceover
            { name: 'SFX', clips: [] },        // Sound Effects
            { name: 'Music', clips: [] },      // Background Music
        ],
    };

    let currentTime = 0;
    let totalDuration = 0;

    script.scenes.forEach((scene: Scene, index: number) => {
        const timeParts = scene.timecode.split('-').map(parseFloat);
        const start = timeParts.length > 0 && !isNaN(timeParts[0]) ? timeParts[0] : currentTime;
        const end = timeParts.length > 1 && !isNaN(timeParts[1]) ? timeParts[1] : start + 5;
        const length = Math.max(0.1, end - start);

        if (scene.storyboardImageUrl) {
            timeline.tracks[0].clips.push({
                asset: { type: 'image', src: scene.storyboardImageUrl },
                start: start,
                length: length,
                transition: { in: 'fade', out: 'fade' },
                effect: { motion: { in: index % 2 === 0 ? 'zoomIn' : 'zoomOut' } },
            });
        }
        
        if (scene.onScreenText && scene.onScreenText.trim() !== '') {
            timeline.tracks[1].clips.push({
                asset: { type: 'title', text: scene.onScreenText, style: 'minimal', color: '#FFFFFF', background: 'rgba(0,0,0,0.5)' },
                start: start,
                length: length,
            });
        }

        if (voiceoverUrls && voiceoverUrls[index]) {
            timeline.tracks[2].clips.push({
                asset: { type: 'audio', src: voiceoverUrls[index] },
                start: start,
                length: length,
            });
        }
        
        currentTime = end;
    });

    if (script.scenes.length > 0) {
        const lastScene = script.scenes[script.scenes.length - 1];
        totalDuration = parseFloat(lastScene.timecode.split('-')[1] || '0');
    }

    if (script.cta && script.cta.trim() !== '') {
        timeline.tracks[1].clips.push({
            asset: { type: 'title', text: script.cta, style: 'minimal', color: '#FFFFFF', background: 'rgba(0,0,0,0.7)' },
            start: currentTime,
            length: 5,
        });
        totalDuration = currentTime + 5;
    }

    if (soundDesign?.musicUrl && totalDuration > 0) {
        timeline.tracks[4].clips.push({
            asset: { type: 'audio', src: soundDesign.musicUrl, volume: 0.3 },
            start: 0,
            length: totalDuration,
        });
    }

    if (soundDesign?.sfx) {
        soundDesign.sfx.forEach(sfx => {
            if (sfx.url) {
                const timeParts = sfx.timecode.split('-').map(parseFloat);
                const start = timeParts.length > 0 && !isNaN(timeParts[0]) ? timeParts[0] : 0;
                timeline.tracks[3].clips.push({
                    asset: { type: 'audio', src: sfx.url, volume: 0.7 },
                    start: start,
                    length: 2,
                });
            }
        });
    }

    return {
        timeline,
        output: { format: 'mp4', size: size },
    };
};

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
    const [creativeIntent, setCreativeIntent] = useState('');
    const selectedBrand = brandIdentities.find((b: BrandIdentity) => b.id === selectedBrandId);
    
    useEffect(() => {
        setScript(project.script);
    }, [project.script]);

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
            // Step 1: Generate the script and visual plan (blueprint)
            setProgressMessage('Generating script and visual plan...');
            const blueprint = await generateVideoBlueprint(
                project.topic,
                videoSize === '16:9' ? 'youtube_long' : 'youtube_short',
                videoStyle,
                (message) => setProgressMessage(message),
                videoLength,
                selectedBrand,
                shouldGenerateMoodboard,
                isNarratorEnabled,
                creativeIntent
            );
    
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
                const uploadedUrls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);
                scriptWithMergedHook.scenes.forEach((scene: Scene, index: number) => {
                    const url = uploadedUrls[index];
                    if (url) {
                        scene.storyboardImageUrl = url;
                        moodboardUrls.push(url);
                    }
                });
            }
            
            const updates: Partial<Project> & { soundDesign?: SoundDesign } = {
                script: scriptWithMergedHook,
                moodboard: moodboardUrls.length > 0 ? moodboardUrls : [],
                title: blueprint.suggestedTitles[0],
                voiceoverVoiceId: narratorVoiceId,
                videoSize: videoSize,
                workflowStep: 3,
                shotstackEditJson: null, shotstackRenderId: null, finalVideoUrl: null, analysis: null,
            };
    
            // Step 3: Generate voiceovers if a narrator is enabled
            if (narratorVoiceId && user) {
                const voiceoverUrls: { [key: number]: string } = {};
                const scenesToProcess = scriptWithMergedHook.scenes.filter((scene: Scene) => scene.voiceover && scene.voiceover.trim() !== '');
                let processedCount = 0;
    
                for (let i = 0; i < scriptWithMergedHook.scenes.length; i++) {
                    const scene = scriptWithMergedHook.scenes[i];
                    if (scene.voiceover && scene.voiceover.trim() !== '') {
                        processedCount++;
                        setProgressMessage(`Generating voiceover ${processedCount} of ${scenesToProcess.length}...`);
                        const sceneBlob = await generateVoiceover(scene.voiceover, narratorVoiceId);
                        const scenePath = `${user.id}/${project.id}/voiceover_scene_${i}.mp3`;
                        voiceoverUrls[i] = await uploadFile(sceneBlob, scenePath, 'audio/mpeg');
                    }
                }
                if (Object.keys(voiceoverUrls).length > 0) {
                    updates.voiceoverUrls = voiceoverUrls;
                }
            }
            
            // Step 4: Generate sound design
            setProgressMessage('Crafting the soundscape...');
            const soundDesignData = await generateSoundDesign(blueprint.script, videoStyle, project.topic);
            updates.soundDesign = { musicQuery: soundDesignData.musicQuery, musicUrl: null, sfx: soundDesignData.sfx };
    
            if (updates.soundDesign.musicQuery) {
                const musicResults = await searchJamendoMusic(updates.soundDesign.musicQuery);
                if (musicResults.length > 0) {
                    updates.soundDesign.musicUrl = musicResults[0].downloadUrl;
                }
            }
    
            if (updates.soundDesign.sfx.length > 0) {
                const sfxPromises = updates.soundDesign.sfx.map(async (sfx, index) => {
                    try {
                        setProgressMessage(`Generating sound effect ${index + 1} of ${updates.soundDesign!.sfx.length}...`);
                        const sfxBlob = await generateSfx(sfx.description);
                        const sfxPath = `${user.id}/${project.id}/sfx_${index}.mp3`;
                        sfx.url = await uploadFile(sfxBlob, sfxPath, 'audio/mpeg');
                    } catch (e) {
                        console.error(`Failed to generate SFX for "${sfx.description}":`, e);
                        sfx.url = undefined;
                    }
                    return sfx;
                });
                updates.soundDesign.sfx = await Promise.all(sfxPromises);
            }
    
            // Step 5: Build the initial timeline for the creative studio
            setProgressMessage('Assembling editor timeline...');
            const tempProjectForTimeline: Project = { ...project, ...updates };
            const editJson = buildTimelineFromProject(tempProjectForTimeline);
            if (editJson) {
                updates.shotstackEditJson = editJson;
            }

            // Step 6: Save all updates and transition the workflow
            setProgressMessage('Finalizing project...');
            await handleUpdateProject(project.id, updates);
            addToast("Blueprint complete! Entering the Creative Studio...", "success");
    
        } catch (e) {
            addToast(`Blueprint generation failed: ${getErrorMessage(e)}`, 'error');
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
                shotstackRenderId: null,
                finalVideoUrl: null,
                analysis: null,
            };
    
            if (project.voiceoverVoiceId) {
                const voiceoverUrls: { [key: number]: string } = {};
                const scenesToProcess = scriptWithMergedHook.scenes.filter((scene: Scene) => scene.voiceover);
                let processedCount = 0;
    
                for (let i = 0; i < scriptWithMergedHook.scenes.length; i++) {
                    const scene = scriptWithMergedHook.scenes[i];
                    if (scene.voiceover) {
                        processedCount++;
                        setVoiceoverProgress(`Generating voiceover ${processedCount} of ${scenesToProcess.length}...`);
                        const sceneBlob = await generateVoiceover(scene.voiceover, project.voiceoverVoiceId);
                        const scenePath = `${user.id}/${project.id}/voiceover_scene_${i}.mp3`;
                        voiceoverUrls[i] = await uploadFile(sceneBlob, scenePath, 'audio/mpeg');
                    }
                }
                if (Object.keys(voiceoverUrls).length > 0) {
                    updates.voiceoverUrls = voiceoverUrls;
                }
            }
    
            // Rebuild timeline with the edited script
            const tempProjectForTimeline: Project = { ...project, script: scriptWithMergedHook, voiceoverUrls: updates.voiceoverUrls };
            const editJson = buildTimelineFromProject(tempProjectForTimeline);
            updates.shotstackEditJson = editJson;

            const success = await handleUpdateProject(project.id, updates);
    
            if (success) {
                addToast("Script saved and timeline updated!", "success");
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

    const intentPlaceholder = {
        'Animation': "e.g., A friendly, flat 2D animation about a robot learning to cook.",
        'Historical Documentary': "e.g., A Ken Burns-style documentary about the Roman Empire.",
        'Vlog': "e.g., A casual, day-in-the-life travel vlog from Kyoto.",
    }[videoStyle] || "e.g., A fast-paced, exciting video with quick cuts.";

    const showCreativeIntent = ['Animation', 'Vlog', 'Historical Documentary', 'Whiteboard'].includes(videoStyle);

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
                                {showCreativeIntent && (
                                    <div className="mt-4">
                                        <label className="font-semibold text-white">Creative Intent (Optional)</label>
                                        <textarea value={creativeIntent} onChange={e => setCreativeIntent(e.target.value)} rows={2} placeholder={intentPlaceholder} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-sm" />
                                    </div>
                                )}
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

            <div className="bg-gray-900/40 p-8 rounded-2xl space-y-8">
                <div>
                    <h4 className="font-bold text-indigo-400 mb-2 flex items-center gap-2">
                        {t('script_generator.hooks_title')}
                        <div className="relative group">
                           <InfoIcon className="w-4 h-4 text-gray-400 cursor-help" />
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-950 text-gray-300 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Your selected hook will be automatically merged into the first scene of the script upon saving.
                               <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-950 transform rotate-45"></div>
                           </div>
                        </div>
                    </h4>
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