// components/CreativeStudio.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import { invokeEdgeFunction } from '../services/supabaseService';
import { PhotoIcon, XCircleIcon } from './Icons';
import EditorToolbar from './EditorToolbar';
import TimelineComponent from './Timeline';
import TopInspectorPanel from './TopInspectorPanel';
import AssetBrowserModal from './AssetBrowserModal';
import HelpModal from './HelpModal';
import { ShotstackClipSelection } from '../types';

type SdkHandles = { edit: any; canvas: any; timeline: any; controls: any; };

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
    const [isLoading, setIsLoading] = useState(true);
  
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
        const sdkHandles: Partial<SdkHandles> = {};

        const cleanup = () => {
            cancelled = true;
            if (sdkHandles.edit) {
                sdkHandles.edit.events.off('clip:selected');
                sdkHandles.edit.events.off('clip:updated');
                sdkHandles.edit.destroy();
            }
            if (sdkHandles.canvas) {
                sdkHandles.canvas.dispose();
            }
            if (sdkHandles.timeline) {
                sdkHandles.timeline.dispose();
            }
            if (sdkHandles.controls) {
                sdkHandles.controls.dispose();
            }
            sdkRef.current = null;
            if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
            if (canvasHost) canvasHost.innerHTML = '';
            setIsReady(false);
            setIsLoading(true);
        };

        const init = async () => {
            if (cancelled) return;
            try {
                setIsLoading(true);
                setError(null);
                console.log('🚀 Starting Shotstack initialization...');
                
                // Dynamic import to avoid module resolution issues
                console.log('📦 Attempting to import Shotstack Studio SDK...');
                const ShotstackStudio = await import('@shotstack/shotstack-studio');
                console.log('✅ Shotstack Studio SDK imported successfully:', ShotstackStudio);
                
                const { Edit, Canvas, Timeline, Controls } = ShotstackStudio;
                console.log('🔍 Extracted components:', { Edit: !!Edit, Canvas: !!Canvas, Timeline: !!Timeline, Controls: !!Controls });
                
                if (!Edit || !Canvas) {
                    throw new Error(`Missing required components: Edit=${!!Edit}, Canvas=${!!Canvas}`);
                }
                
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
                
                console.log('📋 Template prepared:', template);
                
                const getToken = async (): Promise<string> => {
                    console.log('🔑 Requesting Shotstack session token...');
                    const result = await invokeEdgeFunction<{ token: string }>('shotstack-studio-token', {});
                    if (!result?.token) throw new Error("Failed to retrieve Shotstack session token.");
                    console.log('✅ Shotstack session token received');
                    return result.token;
                };

                // Following official docs exactly (like in the working examples):
                // 1. Initialize the edit
                console.log('🎬 Step 1: Creating Edit instance...');
                const edit = new Edit(template.output.size, template.timeline.background);
                console.log('✅ Edit instance created:', edit);
                sdkHandles.edit = edit;
                
                console.log('⏳ Loading Edit instance...');
                await edit.load();
                console.log('✅ Edit instance loaded successfully');
                if (cancelled) return;
                
                // 2. Create canvas to display the edit
                console.log('🎨 Step 2: Creating Canvas instance...');
                const canvas = new Canvas(template.output.size, edit);
                console.log('✅ Canvas instance created:', canvas);
                sdkHandles.canvas = canvas;
                
                console.log('⏳ Loading Canvas instance...');
                try {
                    await canvas.load(); // Renders to [data-shotstack-studio] element
                    console.log('✅ Canvas instance loaded successfully');
                } catch (canvasError) {
                    console.error('💥 Canvas load failed:', canvasError);
                    throw new Error(`Canvas load failed: ${canvasError}`);
                }
                if (cancelled) return;
                
                // 3. Get session token
                console.log('🔑 Step 3: Getting session token...');
                const sessionToken = await getToken();
                if (cancelled) return;
                
                // 4. Load the template with token
                console.log('📋 Step 4: Loading edit template...');
                try {
                    await edit.loadEdit({ ...template, token: sessionToken });
                    console.log('✅ Edit template loaded successfully');
                } catch (editError) {
                    console.error('💥 Edit template load failed:', editError);
                    throw new Error(`Edit template load failed: ${editError}`);
                }
                if (cancelled) return;

                // 5. Initialize the Timeline
                console.log('⏰ Step 5: Creating Timeline instance...');
                const timeline = new Timeline(edit, { width: 1280, height: 300 });
                console.log('✅ Timeline instance created:', timeline);
                sdkHandles.timeline = timeline;
                
                console.log('⏳ Loading Timeline instance...');
                try {
                    await timeline.load(); // Renders to [data-shotstack-timeline] element
                    console.log('✅ Timeline instance loaded successfully');
                } catch (timelineError) {
                    console.error('💥 Timeline load failed:', timelineError);
                    throw new Error(`Timeline load failed: ${timelineError}`);
                }
                if (cancelled) return;

                // 6. Add keyboard controls
                console.log('⌨️ Step 6: Adding keyboard controls...');
                const controls = new Controls(edit);
                console.log('✅ Controls instance created:', controls);
                sdkHandles.controls = controls;
                
                console.log('⏳ Loading Controls instance...');
                try {
                    await controls.load();
                    console.log('✅ Controls instance loaded successfully');
                } catch (controlsError) {
                    console.error('💥 Controls load failed:', controlsError);
                    throw new Error(`Controls load failed: ${controlsError}`);
                }
                if (cancelled) return;

                sdkRef.current = sdkHandles as SdkHandles;
                
                // Set up event listeners (following official docs)
                console.log('🎧 Setting up event listeners...');
                edit.events.on('clip:selected', (data: any) => {
                    console.log('📎 Clip selected:', data.clip);
                    console.log('📎 Track index:', data.trackIndex);
                    console.log('📎 Clip index:', data.clipIndex);
                    setSelection({ trackIndex: data.trackIndex, clipIndex: data.clipIndex });
                });
                
                edit.events.on('clip:updated', (data: any) => {
                    console.log('📝 Clip updated:', data);
                    debouncedUpdateProject(edit);
                });
                
                // Add playback events
                edit.events.on('edit:play', () => setIsPlaying(true));
                edit.events.on('edit:pause', () => setIsPlaying(false));
                edit.events.on('edit:stop', () => setIsPlaying(false));
                
                console.log('🎉 Shotstack Studio SDK initialized successfully with dynamic import!');
                setIsReady(true);
                setIsLoading(false);
                setError(null);
                
            } catch (e: any) {
                if (!cancelled) {
                    console.error("💥 Shotstack initialization error:", e);
                    console.error("💥 Error stack:", e.stack);
                    setError(e.message || String(e));
                    setIsLoading(false);
                }
            }
        };

        // Small delay to ensure DOM is ready (like in working examples)
        const initializeWithDelay = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!cancelled) {
                init();
            }
        };

        initializeWithDelay();
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
                <TimelineComponent script={activeProjectDetails?.script ?? null} onSceneSelect={() => {}} player={sdkRef.current?.edit} />
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

