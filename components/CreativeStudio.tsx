import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import ShotstackStudio from '../components/ShotstackStudio';
import type { Project, ShotstackClipSelection } from '../types';
import { getErrorMessage } from '../utils';
import Loader from './Loader';
import { SparklesIcon } from './Icons';
import AssetAndInspectorPanel from './AssetAndInspectorPanel';
import { customEditorTheme } from '../themes/customEditorTheme';
import * as supabase from '../services/supabaseService';

// Hardcoded soundtrack URL as requested
const SOUNDTRACK_URL = 'https://wpgrfukcnpcoyruymxdd.functions.supabase.co/asset-proxy/https/shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/freepd/motions.mp3';

const CreativeStudio: React.FC = () => {
    const { activeProjectDetails: project, handleUpdateProject } = useAppContext();
    const [editJson, setEditJson] = useState<any>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderStatusMessage, setRenderStatusMessage] = useState('');
    const [studio, setStudio] = useState<any | null>(null);
    const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const starterEdit = {
            timeline: {
                background: "#000000",
                soundtrack: { src: SOUNDTRACK_URL, effect: "fadeInOut", volume: 0.7 },
                tracks: [
                    {
                        clips: [
                            {
                                asset: { type: "title", text: "Starter Clip", style: "minimal", size: "x-large" },
                                length: 5,
                                start: 0,
                                transition: { in: "fade", out: "fade" }
                            }
                        ]
                    }
                ]
            },
            output: {
                format: "mp4",
                resolution: "sd"
            },
            theme: customEditorTheme,
        };
        
        console.log("Final soundtrack src:", starterEdit.timeline.soundtrack.src);
        setEditJson(starterEdit);
    }, []);
    
    const handleEditorReady = useCallback((editInstance: any) => {
        setStudio(editInstance);
        editInstance.events.on('select', (newSelection: any) => {
            if (newSelection.length > 0) {
                setSelection({
                    clip: newSelection[0].clip,
                    trackIndex: newSelection[0].track,
                    clipIndex: newSelection[0].index,
                });
            } else {
                setSelection(null);
            }
        });
    }, []);

    const handleAddClipToScene = (asset: { type: 'video' | 'image' | 'audio', url: string, duration?: number }) => {
        if (!studio) return;
        
        const currentTime = studio.getCurrentTime();
        
        studio.addClip({
            asset: {
                type: asset.type,
                src: asset.url,
            },
            start: currentTime,
            length: asset.duration || 5,
        }, 0);
    };

    const handleRender = async () => {
        if (!studio || !project) {
            alert("Editor or project is not ready.");
            return;
        }
        setIsRendering(true);
        setRenderStatusMessage("Preparing final edit for render...");
        try {
            const finalEditJson = studio.getEdit();
            await handleUpdateProject(project.id, { shotstackEditJson: finalEditJson });

            const { renderId } = await supabase.invokeEdgeFunction<{ renderId: string }>('shotstack-render', finalEditJson);
            
            setRenderStatusMessage("Render submitted to the cloud...");
            await handleUpdateProject(project.id, { shotstackRenderId: renderId, status: 'Rendering' });
            
            alert("Video is now rendering in the cloud. You'll be notified when it's ready for analysis.");

        } catch (err) {
            alert(`Render failed: ${getErrorMessage(err)}`);
        } finally {
            setIsRendering(false);
        }
    };
    
    if (isRendering) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader />
                <p className="mt-4 text-lg font-semibold text-white">{renderStatusMessage}</p>
            </div>
        );
    }
    
    if (!editJson) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader />
                <p className="mt-4 text-lg font-semibold text-white">Initializing editor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Creative Studio</h1>
                    <p className="mt-1 text-gray-400">Assemble your video, add assets, and prepare for analysis.</p>
                </div>
                <button
                    onClick={handleRender}
                    className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    <SparklesIcon className="w-6 h-6 mr-2" />
                    Render Video & Proceed to Analysis
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
                <div className="lg:col-span-2 h-full min-h-[560px]">
                     <ShotstackStudio
                        editJson={editJson}
                        onReady={handleEditorReady}
                        onError={(e) => alert(`Editor critical error: ${e.message}`)}
                        onChange={(edit: any) => { /* console.log('Edit changed') */ }}
                    />
                </div>
                <div className="lg:col-span-1 h-full bg-gray-800/50 rounded-lg overflow-hidden">
                    <AssetAndInspectorPanel 
                        project={project!}
                        studio={studio}
                        selection={selection}
                        activeSceneIndex={0}
                        onAddClip={handleAddClipToScene}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreativeStudio;