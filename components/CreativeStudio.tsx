import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import ShotstackStudio from '../components/ShotstackStudio';
import type { Project, Script, Scene } from '../types';
import { generateVoiceover } from '../services/generativeMediaService';
import * as supabase from '../services/supabaseService';
import { getErrorMessage } from '../utils';
import Loader from './Loader';
import { SparklesIcon } from './Icons';

// This function converts the application's script format into the format required by the Shotstack editor.
const mapScriptToShotstackEdit = (script: Script, videoSize: Project['videoSize'], voiceoverUrls: Record<number, string>): object => {
    const tracks: { clips: any[] }[] = [{ clips: [] }, { clips: [] }, { clips: [] }]; // 0: Visuals, 1: Voiceovers, 2: Text

    const isValidAssetUrl = (url: any): url is string => {
        return typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:'));
    };

    const allScenes: (Scene & { sceneIndex: number })[] = [];
    const selectedHookText = (typeof script.selectedHookIndex === 'number' && script.hooks && script.hooks[script.selectedHookIndex]) || script.hook || null;
    
    if (selectedHookText) {
        const hookDuration = 5;
        const firstScene = script.scenes[0];
        allScenes.push({
            visual: firstScene?.visual || "Abstract visual for hook",
            voiceover: undefined,
            onScreenText: selectedHookText,
            timecode: `0-${hookDuration}`,
            storyboardImageUrl: firstScene?.storyboardImageUrl,
            sceneIndex: -1 // Special index for the hook
        });
    }
    
    script.scenes.forEach((scene, index) => allScenes.push({ ...scene, sceneIndex: index }));
    
    if (script.cta) {
        const ctaDuration = 5;
        const lastScene = script.scenes[script.scenes.length - 1];
        const lastTimecodeEnd = lastScene ? parseFloat(lastScene.timecode.split('-')[1].replace('s','')) : (selectedHookText ? 5 : 0);
        allScenes.push({
            visual: lastScene?.visual || "Call to action visual",
            voiceover: undefined,
            onScreenText: script.cta,
            timecode: `${lastTimecodeEnd}-${lastTimecodeEnd + ctaDuration}`,
            storyboardImageUrl: lastScene?.storyboardImageUrl,
            sceneIndex: -2 // Special index for CTA
        });
    }
    
    let cumulativeTime = 0;
    allScenes.forEach((scene) => {
        const timeParts = scene.timecode.replace(/s/g, '').split('-').map(Number);
        if (timeParts.length !== 2 || isNaN(timeParts[0]) || isNaN(timeParts[1])) return;
        
        const start = cumulativeTime;
        const length = timeParts[1] - timeParts[0];

        if (length <= 0) {
            console.warn('Skipping scene with invalid duration (<= 0):', scene);
            return;
        }

        if (isValidAssetUrl(scene.storyboardImageUrl)) {
            tracks[0].clips.push({ asset: { type: 'image', src: scene.storyboardImageUrl }, start, length });
        }
        
        const voiceoverUrl = voiceoverUrls[scene.sceneIndex];
        if (isValidAssetUrl(voiceoverUrl)) {
             tracks[1].clips.push({ asset: { type: 'audio', src: voiceoverUrl, volume: 1 }, start, length }); 
        }

        if (scene.onScreenText) {
            tracks[2].clips.push({
                asset: { type: 'text', text: scene.onScreenText, font: { family: "Montserrat", color: "#ffffff" }, alignment: { horizontal: "center", vertical: "center" } },
                start, length, transition: { in: "fade", out: "fade" },
            });
        }
        cumulativeTime += length;
    });

    const size = videoSize === '16:9' ? { width: 1280, height: 720 } :
                 videoSize === '9:16' ? { width: 720, height: 1280 } :
                 { width: 1080, height: 1080 };

    return {
        timeline: { background: '#000000', fonts: [{ "family": "Montserrat", "src": "https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.ttf" }], tracks },
        output: { format: 'mp4', fps: 25, size },
    };
};

const CreativeStudio: React.FC = () => {
    const { activeProjectDetails: project, handleUpdateProject, addToast } = useAppContext();
    const [editJson, setEditJson] = useState<object | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("Preparing editor...");
    const [studioEditInstance, setStudioEditInstance] = useState<any | null>(null);

    const handleEditorError = useCallback((err: unknown) => {
        const message = getErrorMessage(err);
        addToast(`Editor critical error: ${message}`, 'error');
    }, [addToast]);

    const handleEditorReady = useCallback((edit: any) => {
        setStudioEditInstance(edit);
    }, []);

    useEffect(() => {
        const prepareEditorData = async () => {
            if (!project || !project.script || !project.user_id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            
            try {
                // Determine which voiceovers need to be generated
                const existingUrls = project.voiceover_urls || {};
                const scenesToGenerate = project.script.scenes
                    .map((scene, index) => ({ text: scene.voiceover, index }))
                    .filter(item => item.text && !item.text.startsWith('http') && !existingUrls[item.index]);

                let finalVoiceoverUrls = { ...existingUrls };

                // Generate missing voiceovers
                if (scenesToGenerate.length > 0) {
                    setLoadingMessage(`Generating ${scenesToGenerate.length} AI voiceover(s)...`);
                    for (const scene of scenesToGenerate) {
                        const audioBlob = await generateVoiceover(scene.text!, project.voiceoverVoiceId || undefined);
                        const path = `${project.user_id}/${project.id}/voiceover_${scene.index}.mp3`;
                        const publicUrl = await supabase.uploadFile(audioBlob, path);
                        finalVoiceoverUrls[scene.index] = publicUrl;
                    }
                    // Persist the new URLs to the database
                    await handleUpdateProject(project.id, { voiceover_urls: finalVoiceoverUrls });
                    addToast('All voiceovers generated!', 'success');
                }

                setLoadingMessage("Mapping script to timeline...");
                const finalEditJson = mapScriptToShotstackEdit(project.script, project.videoSize, finalVoiceoverUrls);
                setEditJson(finalEditJson);

            } catch (err) {
                addToast(`Failed to prepare editor: ${getErrorMessage(err)}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        prepareEditorData();
    }, [project, addToast, handleUpdateProject]);


    const handleRender = useCallback(async () => {
        if (!studioEditInstance || !project) return;
        setIsLoading(true);
        setLoadingMessage("Assembling your video...");
        addToast("Starting video assembly... this can take a few minutes.", 'info');
        
        try {
            const currentEditJson = await studioEditInstance.getEdit();
            const { renderId } = await supabase.invokeEdgeFunction<{ renderId: string }>('shotstack-render', currentEditJson);
            
            // Immediately transition to the Analysis step
            await handleUpdateProject(project.id, { 
                status: 'Rendering', 
                shotstack_render_id: renderId, 
                shotstack_edit_json: currentEditJson,
                final_video_url: null, // Clear any old preview URL
                workflowStep: 4,
            });
            addToast("Video is rendering! You will be taken to the Analysis & Report page.", 'success');

        } catch (err) {
            const message = getErrorMessage(err);
            addToast(`Render failed to start: ${message}`, 'error');
            setIsLoading(false);
        }
    }, [studioEditInstance, project, handleUpdateProject, addToast]);

    if (isLoading || !project || !editJson) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader />
                <p className="text-lg font-semibold text-white">{loadingMessage}</p>
            </div>
        );
    }
    
    return (
        <div className="h-[calc(100vh-200px)] w-full">
            <ShotstackStudio
                editJson={editJson}
                onReady={handleEditorReady}
                onError={handleEditorError}
            />
            <div className="fixed bottom-4 right-4 z-20">
                <button 
                    onClick={handleRender} 
                    disabled={!studioEditInstance}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg flex items-center gap-2 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-5 h-5" />
                    Assemble & Analyze Video
                </button>
            </div>
        </div>
    );
};

export default CreativeStudio;