import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import ShotstackStudio from '../components/ShotstackStudio';
import type { Project, ShotstackClipSelection, Scene } from '../types';
import { getErrorMessage } from '../utils';
import Loader from './Loader';
import { SparklesIcon, MagicWandIcon } from './Icons';
import AssetAndInspectorPanel from './AssetAndInspectorPanel';
import * as supabase from '../services/supabaseService';

// A helper to construct the correct proxy URL for external assets
const PROXY_BASE = 'https://wpgrfukcnpcoyruymxdd.functions.supabase.co/asset-proxy';
const proxyUrl = (url: string): string => {
    if (!url || url.startsWith('data:')) return url;
    try {
        // Use a more robust path-based proxy URL to avoid issues with special characters.
        const encodedUrl = url.replace('https://', '/https/').replace('http://', '/http/');
        return `${PROXY_BASE}${encodedUrl}`;
    } catch (e) {
        console.error("Invalid URL for proxy:", url, e);
        return url;
    }
};

const CreativeStudio: React.FC = () => {
    const { activeProjectDetails: project, handleUpdateProject, addToast, lockAndExecute } = useAppContext();
    const [editJson, setEditJson] = useState<any>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderStatusMessage, setRenderStatusMessage] = useState('');
    const [studio, setStudio] = useState<any | null>(null);
    const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current || !project || !project.script) return;
        hasInitialized.current = true;

        const { script, moodboard, voiceoverUrls, videoSize } = project;
        
        // If a saved edit exists, load it instead of building from scratch.
        if (project.shotstackEditJson) {
            setEditJson(project.shotstackEditJson);
            return;
        }

        const resolutions = {
            '16:9': { width: 1280, height: 720 },
            '9:16': { width: 720, height: 1280 },
            '1:1': { width: 1024, height: 1024 }
        };
        const outputResolution = resolutions[videoSize || '16:9'];

        const aRollTrack = { clips: [] as any[], name: 'A-Roll' };
        const bRollTrack = { clips: [] as any[], name: 'B-Roll' };
        const voiceoverTrack = { clips: [] as any[], name: 'Voiceover' };
        const titlesTrack = { clips: [] as any[], name: 'Titles' };
        const sfxTrack = { clips: [] as any[], name: 'SFX' };
        const musicTrack = { clips: [] as any[], name: 'Music' };
        
        let currentTime = 0;
        
        const finalScript = JSON.parse(JSON.stringify(script));
        // Use the selected hook for the first scene's voiceover
        if (finalScript.hooks && finalScript.hooks.length > 0 && finalScript.scenes[0]) {
            const hookVoiceover = finalScript.hooks[finalScript.selectedHookIndex ?? 0];
            finalScript.scenes[0].voiceover = hookVoiceover + " " + finalScript.scenes[0].voiceover;
        }


        finalScript.scenes.forEach((scene: Scene, index: number) => {
            const timeParts = scene.timecode.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)s?/);
            const start = timeParts ? parseFloat(timeParts[1]) : currentTime;
            const end = timeParts ? parseFloat(timeParts[2]) : start + 5;
            const length = end - start;

            if (moodboard && moodboard[index]) {
                aRollTrack.clips.push({
                    asset: { type: 'image', src: proxyUrl(moodboard[index]) },
                    start: start, length: length, fit: 'cover',
                });
            }
            
            if (voiceoverUrls && voiceoverUrls[index]) {
                voiceoverTrack.clips.push({
                    asset: { type: 'audio', src: proxyUrl(voiceoverUrls[index]), volume: 1 },
                    start: start, length: length,
                });
            }

            if (scene.onScreenText && scene.onScreenText.trim()) {
                titlesTrack.clips.push({
                    asset: {
                        type: 'title', text: scene.onScreenText, style: 'Montserrat', color: '#FFD700',
                        background: 'rgba(0,0,0,0.6)', position: 'bottom', size: 'medium',
                    },
                    start: start, length: length, transition: { in: 'slideUp', out: 'fadeOut' },
                });
            }
            currentTime = end;
        });
        
        const initialEdit = {
            timeline: {
                background: "#000000",
                tracks: [aRollTrack, bRollTrack, voiceoverTrack, titlesTrack, sfxTrack, musicTrack]
            },
            output: { format: "mp4", ...outputResolution }
        };

        setEditJson(initialEdit);
    }, [project]);

    const handleEditorReady = useCallback((editInstance: any) => {
        setStudio(editInstance);
        editInstance.events.on('select', (newSelection: any) => {
            setSelection(newSelection.length > 0 ? {
                clip: newSelection[0].clip, trackIndex: newSelection[0].track, clipIndex: newSelection[0].index,
            } : null);
        });
    }, []);

    const handleAddClip = (clip: any, trackType: 'b-roll' | 'music' | 'sfx' = 'b-roll') => {
        if (!studio || !clip.asset) return;
        if (clip.asset.src && !clip.asset.src.startsWith('data:')) {
            clip.asset.src = proxyUrl(clip.asset.src);
        }
        const trackMap = { 'b-roll': 1, 'music': 5, 'sfx': 4 };
        studio.addClip(clip, trackMap[trackType]);
    };

    const handleAiPolish = () => lockAndExecute(async () => {
        if (!studio || !project || !project.script) return;
        addToast("AI Polish is working its magic...", "info");
        try {
            const currentEdit = studio.getEdit();
            const { timeline } = await supabase.invokeEdgeFunction<{ timeline: any }>('ai-polish', {
                timeline: currentEdit.timeline,
                script: project.script,
                projectId: project.id,
            });
            await studio.loadEdit({ ...currentEdit, timeline });
            addToast("AI Polish complete! SFX and motion effects applied.", "success");
        } catch (err) {
            addToast(`AI Polish failed: ${getErrorMessage(err)}`, 'error');
        }
    });

    const handleRender = () => lockAndExecute(async () => {
        if (!studio || !project) return;
        setIsRendering(true);
        setRenderStatusMessage("Preparing final edit for render...");
        try {
            const finalEditJson = studio.getEdit();
            await handleUpdateProject(project.id, { shotstackEditJson: finalEditJson });
            const { renderId } = await supabase.invokeEdgeFunction<{ renderId: string }>('shotstack-render', {
                edit: finalEditJson, projectId: project.id
            });
            setRenderStatusMessage("Render submitted to the cloud...");
            await handleUpdateProject(project.id, { 
                shotstackRenderId: renderId, status: 'Rendering', workflowStep: 4,
            });
            addToast("Video is now rendering. You'll be navigated to the analysis page to see progress.", "info");
        } catch (err) {
            addToast(`Render failed: ${getErrorMessage(err)}`, "error");
            setIsRendering(false);
        }
    });
    
    if (!project || !editJson) {
        return <div className="flex flex-col items-center justify-center min-h-[60vh]"><Loader /><p className="mt-4 text-lg font-semibold text-white">Assembling Your Video Blueprint...</p></div>;
    }
    
    if (isRendering) {
        return <div className="flex flex-col items-center justify-center min-h-[60vh]"><Loader /><p className="mt-4 text-lg font-semibold text-white">{renderStatusMessage}</p></div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Creative Studio</h1>
                    <p className="mt-1 text-gray-400">Assemble your video, add assets, and prepare for analysis.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <button onClick={handleAiPolish} className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors text-sm">
                        <MagicWandIcon className="w-5 h-5 mr-2" /> AI Polish
                    </button>
                    <button onClick={handleRender} className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors transform hover:scale-105 shadow-lg">
                        <SparklesIcon className="w-6 h-6 mr-2" /> Render Video & Proceed
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
                <div className="lg:col-span-2 h-full min-h-[560px]">
                     <ShotstackStudio
                        editJson={editJson}
                        onReady={handleEditorReady}
                        onError={(e) => addToast(`Editor critical error: ${e.message}`, 'error')}
                        onChange={(edit) => {
                            if (project) {
                                // Debounce this in a real app
                                handleUpdateProject(project.id, { shotstackEditJson: edit });
                            }
                        }}
                    />
                </div>
                <div className="lg:col-span-1 h-full bg-gray-800/50 rounded-lg overflow-hidden">
                    <AssetAndInspectorPanel 
                        project={project}
                        studio={studio}
                        selection={selection}
                        onAddClip={handleAddClip}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreativeStudio;