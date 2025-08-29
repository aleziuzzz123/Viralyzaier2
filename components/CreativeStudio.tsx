// components/CreativeStudio.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import { invokeEdgeFunction } from '../services/supabaseService';
import { PhotoIcon, XCircleIcon } from './Icons';
import EditorToolbar from './EditorToolbar';
import Timeline from './Timeline';
import TopInspectorPanel from './TopInspectorPanel';
import AssetBrowserModal from './AssetBrowserModal';
import HelpModal from './HelpModal';
import { ShotstackClipSelection } from '../types';

type SdkHandles = { edit: any; };

export const CreativeStudio: React.FC = () => {
    const { 
        activeProjectDetails, 
        handleUpdateProject, 
        setActiveProjectId,
        handleRenderProject,
        addToast,
        lockAndExecute,
        session
    } = useAppContext();

    const canvasHostRef = useRef<HTMLDivElement>(null);
    const sdkRef = useRef<SdkHandles | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
    const [isAssetBrowserOpen, setIsAssetBrowserOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
  
    const saveTimeoutRef = useRef<number | null>(null);

    const debouncedUpdateProject = useCallback((edit: any) => {
        if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
        setIsSaving(true);
        saveTimeoutRef.current = window.setTimeout(() => {
            if (activeProjectDetails) {
                const editJson = edit.getEdit();
                const deproxied = deproxyifyEdit(editJson);
                handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxied })
                  .finally(() => setIsSaving(false));
            } else {
                setIsSaving(false);
            }
        }, 1500);
    }, [activeProjectDetails, handleUpdateProject]);

    useEffect(() => {
        if (!activeProjectDetails) return;
        const { current: canvasHost } = canvasHostRef;
        if (!canvasHost) return;

        let cancelled = false;
        let pollInterval: number | null = null;
        const sdkHandles: Partial<SdkHandles> = {};

        const cleanup = () => {
            cancelled = true;
            if (pollInterval) clearInterval(pollInterval);
            if (sdkHandles.edit) {
                sdkHandles.edit.events.off('play');
                sdkHandles.edit.events.off('pause');
                sdkHandles.edit.events.off('selection:changed');
                sdkHandles.edit.destroy();
            }
            sdkRef.current = null;
            if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
            if (canvasHost) canvasHost.innerHTML = '';
            setIsReady(false);
        };

        const init = async () => {
            if (cancelled) return;
            try {
                const { Edit, Canvas } = (window as any);
                let template;
                if (activeProjectDetails.shotstackEditJson) {
                    const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
                    if (!sanitizedJson) throw new Error("Project has invalid timeline data.");
                    template = proxyifyEdit(sanitizedJson);
                } else {
                    const size = activeProjectDetails.videoSize === '16:9' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
                    template = {
                        timeline: { background: '#000000', tracks: [{ name: 'A-Roll', clips: [] }, { name: 'Overlays', clips: [] }, { name: 'Music', clips: [] }] },
                        output: { format: 'mp4', size: size },
                    };
                }
                
                const getToken = async (): Promise<string> => {
                  const result = await invokeEdgeFunction<{ token: string }>('shotstack-studio-token', {});
                  if (!result?.token) throw new Error("Failed to retrieve Shotstack session token.");
                  return result.token;
                };

                // Create the edit with dimensions and background
                const edit = new Edit(template.output.size, template.timeline.background);
                sdkHandles.edit = edit;
                await edit.load();
                if (cancelled) return;
                
                // Create canvas to display the edit
                const canvas = new Canvas(template.output.size, edit);
                await canvas.load();
                if (cancelled) return;
                canvasHost.innerHTML = '';
                canvasHost.appendChild(canvas.view);
                
                // Get session token
                const sessionToken = await getToken();
                if (cancelled) return;
                
                // Load the template with token
                await edit.loadEdit({ ...template, token: sessionToken });
                if (cancelled) return;

                sdkRef.current = sdkHandles as SdkHandles;
                // Set up event listeners
                edit.events.on('playback:play', () => setIsPlaying(true));
                edit.events.on('playback:pause', () => setIsPlaying(false));
                edit.events.on('clip:selected', (data: any) => setSelection({ trackIndex: data.trackIndex, clipIndex: data.clipIndex }));
                edit.events.on('clip:updated', () => debouncedUpdateProject(edit));
                edit.events.on('timeline:updated', () => debouncedUpdateProject(edit));
                
                setIsReady(true);
            } catch (e: any) {
                if (!cancelled) {
                  console.error("Shotstack initialization error:", e);
                  setError(e.message || String(e));
                }
            }
        };
        
        const waitForSdkAndInit = () => {
            if (cancelled) return;
            setError(null);
            setIsReady(false);
            let retries = 50;
            pollInterval = window.setInterval(() => {
                if ((window as any).Edit) {
                    if(pollInterval) clearInterval(pollInterval);
                    if (!cancelled) init();
                } else if (--retries <= 0) {
                    if(pollInterval) clearInterval(pollInterval);
                    if (!cancelled) setError("Shotstack Studio SDK failed to load. Please check your internet connection and refresh.");
                }
            }, 100);
        };

        waitForSdkAndInit();
        return cleanup;
    }, [activeProjectDetails, debouncedUpdateProject]);

    const handleBack = () => {
        if (activeProjectDetails) handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
        else setActiveProjectId(null);
    };
    
    const handleRender = () => lockAndExecute(async () => {
        if (!sdkRef.current?.edit || !activeProjectDetails) return;
        const editJson = sdkRef.current.edit.getEdit();
        await handleRenderProject(activeProjectDetails.id, editJson);
    });

    const handleDeleteClip = () => {
        if (sdkRef.current?.edit && selection) {
            sdkRef.current.edit.deleteClip(selection.trackIndex, selection.clipIndex);
            setSelection(null);
        }
    };

    const handleAddClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
        if (!sdkRef.current?.edit) return;
        const edit = sdkRef.current.edit;
        const trackNames = { video: 'A-Roll', image: 'A-Roll', sticker: 'Overlays', audio: 'Music' };
        const trackName = trackNames[assetType];
        const targetTrack = edit.timeline.tracks.find((t: any) => t.name === trackName);
        if (!targetTrack) {
            addToast(`Could not find a suitable track named '${trackName}'`, 'error');
            return;
        }
        const clip = {
            asset: { type: assetType === 'sticker' ? 'image' : assetType, src: url },
            start: edit.playbackTime / 1000, // Convert milliseconds to seconds
            length: assetType === 'audio' ? 10 : 5,
        };
        edit.addClip(targetTrack.id, clip);
        setIsAssetBrowserOpen(false);
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
            <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-black/30">
                <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
                    &larr; Back to Blueprint
                </button>
                <div className="text-white font-bold px-4 truncate">{activeProjectDetails?.name}</div>
                <div className="flex items-center gap-4">
                    <span className={`text-sm text-gray-400 transition-opacity ${isSaving ? 'opacity-100' : 'opacity-0'}`}>Saving...</span>
                </div>
            </header>

            <main className="flex-1 flex p-4 gap-4 overflow-hidden">
                <div className="flex-[3] flex flex-col gap-4">
                    <div ref={canvasHostRef} className="flex-1 bg-black rounded-lg relative flex items-center justify-center">
                        {!isReady && (
                            <div className="text-center text-gray-400">
                                <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-700"/>
                                {error ? <span className="text-red-400 font-semibold">{`Error: ${error}`}</span> : 'Loading Creative Studio...'}
                            </div>
                        )}
                    </div>
                     <EditorToolbar 
                        isPlaying={isPlaying}
                        onPlayPause={() => sdkRef.current?.edit?.[isPlaying ? 'pause' : 'play']()}
                        onStop={() => sdkRef.current?.edit?.stop()}
                        onUndo={() => sdkRef.current?.edit?.undo()}
                        onRedo={() => sdkRef.current?.edit?.redo()}
                        onAddMedia={() => setIsAssetBrowserOpen(true)}
                        onAiPolish={() => addToast('AI Polish coming soon!', 'info')}
                        onRender={handleRender}
                        onOpenHelp={() => setIsHelpOpen(true)}
                    />
                </div>
                <aside className="flex-1 w-80 flex-shrink-0">
                     {selection ? (
                        <TopInspectorPanel studio={sdkRef.current?.edit} selection={selection} onDeleteClip={handleDeleteClip} />
                    ) : (
                        <div className="bg-gray-800/50 h-full w-full rounded-lg border border-gray-700 flex flex-col items-center justify-center text-center text-gray-500 p-4">
                            <h3 className="font-bold text-gray-300">Inspector</h3>
                            <p className="text-sm">Select a clip on the timeline to see its properties here.</p>
                        </div>
                    )}
                </aside>
            </main>
            
            <footer className="flex-shrink-0 h-24 p-4 pt-0">
                <Timeline script={activeProjectDetails?.script ?? null} onSceneSelect={() => {}} player={sdkRef.current?.edit} />
            </footer>
            
            {isAssetBrowserOpen && (
                <AssetBrowserModal 
                    project={activeProjectDetails} 
                    session={session}
                    onClose={() => setIsAssetBrowserOpen(false)} 
                    onAddClip={handleAddClip}
                    addToast={addToast}
                    lockAndExecute={lockAndExecute}
                />
            )}
            
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};
