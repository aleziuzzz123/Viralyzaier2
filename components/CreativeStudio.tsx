import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Edit } from '@shotstack/shotstack-studio';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK, deproxyifyEdit } from '../utils';
import { SparklesIcon, ArrowLeftIcon } from './Icons';

export const CreativeStudio: React.FC = () => {
    const { activeProjectDetails, handleUpdateProject, handleRenderProject, setActiveProjectId } = useAppContext();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const studioRef = useRef<HTMLDivElement | null>(null);
    const timelineRef = useRef<HTMLDivElement | null>(null);
    const loadedRef = useRef(false);
    const handles = useRef<{ app: any; edit: Edit } | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const changeListenerRef = useRef<(() => void) | null>(null);

    // Make view truly full screen
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);
    
    const debouncedUpdateProject = useCallback((edit: Edit) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        setIsSaving(true);
        timeoutRef.current = window.setTimeout(() => {
            if (activeProjectDetails) {
                const editJson = edit.getEdit();
                const deproxiedEdit = deproxyifyEdit(editJson);
                handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxiedEdit }).finally(() => {
                    setIsSaving(false);
                });
            } else {
                setIsSaving(false);
            }
        }, 1500); // 1.5 second debounce
    }, [activeProjectDetails, handleUpdateProject]);


    const handleRender = () => {
        if (handles.current?.edit && activeProjectDetails) {
            setIsRendering(true);
            const editJson = handles.current.edit.getEdit();
            const deproxied = deproxyifyEdit(editJson);
            handleRenderProject(activeProjectDetails.id, deproxied).finally(() => {
                setIsRendering(false);
            });
        }
    };
    
    // Initialize after container is visible
    useEffect(() => {
        if (loadedRef.current || !activeProjectDetails) return;
        if (!hostRef.current || !studioRef.current || !timelineRef.current) return;

        loadedRef.current = true;
        let cleanupFunc: (() => void) | null = null;

        (async () => {
            setErr(null);
            
            try {
                const sdk = await getShotstackSDK();
                const { Application, Edit } = sdk;

                // 1) Get template and harden it
                const rawTemplate = activeProjectDetails.shotstackEditJson;
                const tpl = JSON.parse(JSON.stringify(rawTemplate || {}));

                const w = Number(tpl?.output?.size?.width);
                const h = Number(tpl?.output?.size?.height);
                if (!w || !h) {
                    tpl.output = { ...(tpl.output || {}), size: { width: 1080, height: 1920 } };
                }
                
                tpl.timeline = tpl.timeline || {};
                tpl.timeline.background = tpl.timeline.background || "#000000";

                const finalTemplate = deproxyifyEdit(tpl); // Ensure all URLs are direct for the SDK

                // 2) Create Application and Edit instances
                const controlsEl = document.createElement('div'); // Dummy element for controls
                const app = new Application({
                    studio: studioRef.current!,
                    timeline: timelineRef.current!,
                    controls: controlsEl,
                });
                const edit = new Edit(app, finalTemplate);
                
                await app.load(edit);
                
                handles.current = { app, edit };
                
                changeListenerRef.current = () => debouncedUpdateProject(edit);
                edit.events.on("change", changeListenerRef.current);

                // 3) Keep layout responsive
                const ro = new ResizeObserver(() => {
                    if (handles.current?.app) {
                        handles.current.app.resize();
                    }
                });
                ro.observe(hostRef.current!);

                cleanupFunc = () => {
                    ro.disconnect();
                    if (handles.current && changeListenerRef.current) {
                      handles.current.edit.events.off('change', changeListenerRef.current);
                      handles.current.app?.destroy();
                    }
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                };
            } catch (e: any) {
                console.error('Studio init failed:', e);
                setErr(e?.message || 'Studio failed to initialize');
                loadedRef.current = false;
            }
        })();

        return () => {
            if (cleanupFunc) cleanupFunc();
        }

    }, [activeProjectDetails, debouncedUpdateProject]);

    const handleBack = () => {
        if (activeProjectDetails) {
            handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
        } else {
            setActiveProjectId(null);
        }
    };

    return (
        <div
            ref={hostRef}
            className="fixed inset-0 flex flex-col bg-gray-900 z-10"
        >
            <div className="flex-shrink-0 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-gray-700/50 bg-black/30">
                <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
                    <ArrowLeftIcon className="w-5 h-5"/> Back to Blueprint
                </button>
                <div className="text-white font-bold truncate px-4">{activeProjectDetails?.name}</div>
                <div className="flex items-center gap-4">
                     <span className={`text-sm transition-opacity ${isSaving ? 'opacity-100' : 'opacity-0'} text-gray-400`}>Saving...</span>
                    <button
                        onClick={handleRender}
                        disabled={isRendering}
                        className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm shadow-lg disabled:bg-gray-600"
                    >
                        <SparklesIcon className={`w-5 h-5 mr-2 ${isRendering ? 'animate-pulse' : ''}`} />
                        {isRendering ? 'Submitting Render...' : 'Render & Proceed'}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex">
                <div
                    ref={studioRef}
                    data-shotstack-studio
                    className="flex-1 min-h-0"
                />
            </div>
            
            <div
                ref={timelineRef}
                data-shotstack-timeline
                className="h-[300px] border-t-2 border-gray-700"
            />

            {err && (
                <div className="absolute left-4 bottom-4 bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg shadow-lg">
                    <strong>Error Loading Creative Studio:</strong> {err}
                </div>
            )}
        </div>
    );
};
