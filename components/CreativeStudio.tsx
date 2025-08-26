import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Edit, Canvas, Timeline } from "@shotstack/shotstack-studio";
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import { ArrowLeftIcon, PhotoIcon, SparklesIcon } from './Icons';
import EditorToolbar from './EditorToolbar';
import AssetBrowserModal from './AssetBrowserModal';
import TopInspectorPanel from './TopInspectorPanel';
import { ShotstackClipSelection } from '../types';
import { getErrorMessage } from '../utils';

type SdkHandles = { edit: Edit; canvas: Canvas; timeline: Timeline; };

export const CreativeStudio: React.FC = () => {
    const { 
        activeProjectDetails, 
        handleUpdateProject, 
        handleRenderProject, 
        setActiveProjectId,
        addToast,
        session,
        lockAndExecute,
    } = useAppContext();
    
    const canvasHostRef = useRef<HTMLDivElement>(null);
    const timelineHostRef = useRef<HTMLDivElement>(null);
    const sdk = useRef<SdkHandles | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
    const [isAssetBrowserOpen, setIsAssetBrowserOpen] = useState(false);
    const saveTimeoutRef = useRef<number | null>(null);

    // Full screen effect
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const debouncedUpdateProject = useCallback((edit: Edit) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        setIsSaving(true);
        saveTimeoutRef.current = window.setTimeout(() => {
            if (activeProjectDetails) {
                const editJson = edit.getEdit();
                const deproxiedEdit = deproxyifyEdit(editJson);
                handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxiedEdit }).finally(() => {
                    setIsSaving(false);
                });
            } else {
                setIsSaving(false);
            }
        }, 1500);
    }, [activeProjectDetails, handleUpdateProject]);

    useEffect(() => {
        if (!activeProjectDetails || !canvasHostRef.current || !timelineHostRef.current) return;

        let cancelled = false;
        
        const hostCanvas = canvasHostRef.current;
        const hostTimeline = timelineHostRef.current;
        let changeListener: (() => void) | null = null;
        let selectListener: ((sel: ShotstackClipSelection) => void) | null = null;
        let deselectListener: (() => void) | null = null;
        let playListener: (() => void) | null = null;
        let pauseListener: (() => void) | null = null;
        
        (async () => {
            try {
                const { Edit, Canvas, Timeline } = await import('@shotstack/shotstack-studio');

                const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
                if (!sanitizedJson) throw new Error("Project has invalid or missing timeline data.");
                
                const template = proxyifyEdit(sanitizedJson);

                const edit = new Edit(template.output.size, template.timeline.background);
                await edit.load();
                if (cancelled) return;

                const canvas = new Canvas(template.output.size, edit);
                await canvas.load();
                if (cancelled) return;
                hostCanvas.appendChild((canvas as any).view);

                await edit.loadEdit(template);
                if (cancelled) return;

                const timeline = new Timeline(edit, { width: hostTimeline.clientWidth, height: hostTimeline.clientHeight });
                await timeline.load();
                if (cancelled) return;
                hostTimeline.appendChild((timeline as any).view);

                sdk.current = { edit, canvas, timeline };

                changeListener = () => debouncedUpdateProject(edit);
                selectListener = (sel) => setSelection(sel);
                deselectListener = () => setSelection(null);
                playListener = () => setIsPlaying(true);
                pauseListener = () => setIsPlaying(false);

                edit.events.on("change", changeListener);
                edit.events.on("select", selectListener);
                edit.events.on("deselect", deselectListener);
                edit.events.on("play", playListener);
                edit.events.on("pause", pauseListener);
                edit.events.on("stop", pauseListener);

                setIsReady(true);
                canvas.zoomToFit();
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? String(e));
            }
        })();

        return () => {
            cancelled = true;
            if (sdk.current && changeListener) sdk.current.edit.events.off("change", changeListener);
            if (sdk.current && selectListener) sdk.current.edit.events.off("select", selectListener);
            if (sdk.current && deselectListener) sdk.current.edit.events.off("deselect", deselectListener);
            if (sdk.current && playListener) sdk.current.edit.events.off("play", playListener);
            if (sdk.current && pauseListener) sdk.current.edit.events.off("pause", pauseListener);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            
            hostCanvas.innerHTML = '';
            hostTimeline.innerHTML = '';
            sdk.current = null;
            setIsReady(false);
        };
    }, [activeProjectDetails, debouncedUpdateProject]);

    const handleRender = () => {
        if (sdk.current?.edit && activeProjectDetails) {
            setIsRendering(true);
            const editJson = sdk.current.edit.getEdit();
            const deproxied = deproxyifyEdit(editJson);
            handleRenderProject(activeProjectDetails.id, deproxied).finally(() => {
                setIsRendering(false);
            });
        }
    };
    
    const handleAddClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
        if (!sdk.current) return;
        const typeMap: { [key: string]: 'video' | 'image' | 'audio' } = {
            video: 'video',
            image: 'image',
            sticker: 'image', // Treat stickers as images
            audio: 'audio',
        };
        const shotstackType = typeMap[assetType];
        if (!shotstackType) return;

        const proxiedUrl = proxyifyEdit({ timeline: { tracks: [{ clips: [{ asset: { src: url } }] }] } })
            .timeline.tracks[0].clips[0].asset.src;

        sdk.current.edit.addClip({
            asset: { type: shotstackType, src: proxiedUrl },
            length: shotstackType === 'audio' ? 20 : 5, // Default lengths
        });
    };

    const handleDeleteClip = () => {
        if (sdk.current && selection) {
            sdk.current.edit.deleteClip(selection.trackIndex, selection.clipIndex);
            setSelection(null);
        }
    };

    const handleBack = () => {
        if (activeProjectDetails) handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
        else setActiveProjectId(null);
    };

    return (
         <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
            <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-gray-700/50 bg-black/30">
                <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
                    <ArrowLeftIcon className="w-5 h-5"/> Back to Blueprint
                </button>
                <div className="text-white font-bold truncate px-4">{activeProjectDetails?.name}</div>
                <div className="flex items-center gap-4">
                     <span className={`text-sm transition-opacity ${isSaving ? 'opacity-100' : 'opacity-0'} text-gray-400`}>Saving...</span>
                </div>
            </header>
            
             <div className="flex-1 grid grid-cols-[1fr_350px] gap-4 p-4 overflow-hidden">
                <main className="flex flex-col gap-4 overflow-hidden">
                    <div ref={canvasHostRef} className="flex-1 bg-black rounded-lg relative flex items-center justify-center">
                        {!isReady && <p className="text-gray-400">Loading Editor...</p>}
                    </div>
                    <div ref={timelineHostRef} className="h-[250px] bg-gray-800 rounded-lg" />
                    <EditorToolbar
                        isPlaying={isPlaying}
                        onPlayPause={() => isPlaying ? sdk.current?.edit.pause() : sdk.current?.edit.play()}
                        onStop={() => sdk.current?.edit.stop()}
                        onUndo={() => sdk.current?.edit.undo()}
                        onRedo={() => sdk.current?.edit.redo()}
                        onAiPolish={() => addToast("AI Polish coming soon!", "info")}
                        onRender={handleRender}
                        onOpenHelp={() => {}}
                        onAddMedia={() => setIsAssetBrowserOpen(true)}
                    />
                </main>
                <aside className="bg-gray-800/50 rounded-lg overflow-y-auto">
                     {selection ? (
                        <TopInspectorPanel 
                            selection={selection} 
                            studio={sdk.current?.edit} 
                            onDeleteClip={handleDeleteClip}
                        />
                    ) : (
                         <div className="p-4 text-center text-gray-500 space-y-4 pt-10">
                             <PhotoIcon className="w-12 h-12 mx-auto text-gray-600"/>
                             <h3 className="font-bold text-gray-300">Inspector Panel</h3>
                            <p className="text-sm">Select a clip on the timeline to inspect and edit its properties.</p>
                        </div>
                    )}
                </aside>
            </div>

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

            {error && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 p-4 bg-red-800 text-white rounded-lg shadow-2xl z-50">
                    <strong>Error Loading Creative Studio:</strong> {error}
                </div>
            )}
        </div>
    );
};
