import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";
// CSS is now loaded via <link> tag in index.html to fix 404 errors
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import { SparklesIcon, ArrowLeftIcon } from './Icons';

type Shotstack = typeof import('@shotstack/shotstack-studio');

export const CreativeStudio: React.FC = () => {
    const { activeProjectDetails, handleUpdateProject, handleRenderProject, setActiveProjectId } = useAppContext();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const handlesRef = useRef<{ 
        edit: Edit; 
        canvas: Canvas; 
        timeline: Timeline;
        controls: Controls;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
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
        if (!activeProjectDetails || !hostRef.current) {
            return;
        }

        let cancelled = false;
        let changeListener: (() => void) | null = null;
        let resizeObserver: ResizeObserver | null = null;
        
        const hostElement = hostRef.current;
        
        (async () => {
            try {
                const { Edit, Canvas, Controls, Timeline } = await import('@shotstack/shotstack-studio');

                const sanitizedTemplate = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
                if (!sanitizedTemplate) {
                    throw new Error("Project has invalid or missing timeline data.");
                }
                const template = proxyifyEdit(sanitizedTemplate);

                const edit = new Edit(template.output.size, template.timeline.background);
                await edit.load();
                if (cancelled) return;
                
                const studioElement = hostElement.querySelector<HTMLElement>('[data-shotstack-studio]');
                if (!studioElement) throw new Error("Could not find studio container");

                const canvas = new Canvas(template.output.size, edit);
                await canvas.load();
                if (cancelled) return;
                studioElement.appendChild((canvas as any).view);


                await edit.loadEdit(template);
                if (cancelled) return;
                
                const controls = new Controls(edit);
                await controls.load();
                if (cancelled) return;

                const timelineElement = hostElement.querySelector<HTMLElement>('[data-shotstack-timeline]');
                if (!timelineElement) throw new Error("Could not find timeline container");

                const timeline = new Timeline(edit, { 
                    width: timelineElement.clientWidth, 
                    height: 300 
                });
                await timeline.load();
                if (cancelled) return;
                timelineElement.appendChild((timeline as any).view);


                handlesRef.current = { edit, canvas, timeline, controls };

                changeListener = () => debouncedUpdateProject(edit);
                edit.events.on("change", changeListener);

                resizeObserver = new ResizeObserver(() => {
                    if (handlesRef.current && timelineElement) {
                        (handlesRef.current.timeline as any).setSize(timelineElement.clientWidth, 300);
                        handlesRef.current.canvas.zoomToFit();
                    }
                });
                resizeObserver.observe(hostElement);

            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message ?? String(e));
                    console.error(e);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (handlesRef.current && changeListener) {
                handlesRef.current.edit.events.off("change", changeListener);
            }
            if (resizeObserver && hostElement) {
                resizeObserver.unobserve(hostElement);
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            
            const studioChild = hostElement.querySelector('[data-shotstack-studio]');
            const timelineChild = hostElement.querySelector('[data-shotstack-timeline]');
            if (studioChild) studioChild.innerHTML = '';
            if (timelineChild) timelineChild.innerHTML = '';
            
            handlesRef.current = null;
        };
    }, [activeProjectDetails, debouncedUpdateProject]);

    const handleRender = () => {
        if (handlesRef.current?.edit && activeProjectDetails) {
            setIsRendering(true);
            const editJson = handlesRef.current.edit.getEdit();
            const deproxied = deproxyifyEdit(editJson);
            handleRenderProject(activeProjectDetails.id, deproxied).finally(() => {
                setIsRendering(false);
            });
        }
    };
    
    const handleBack = () => {
        if (activeProjectDetails) {
            handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
        } else {
            setActiveProjectId(null);
        }
    };

    return (
         <div ref={hostRef} className="fixed inset-0 flex flex-col bg-gray-900 z-10">
            <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-gray-700/50 bg-black/30">
                <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
                    <ArrowLeftIcon className="w-5 h-5"/> Back to Blueprint
                </button>
                <div className="text-white font-bold truncate px-4">{activeProjectDetails?.name}</div>
                <div className="flex items-center gap-4">
                     <span className={`text-sm transition-opacity ${isSaving ? 'opacity-100' : 'opacity-0'} text-gray-400`}>Saving...</span>
                    <button onClick={handleRender} disabled={isRendering} className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm shadow-lg disabled:bg-gray-600">
                        <SparklesIcon className={`w-5 h-5 mr-2 ${isRendering ? 'animate-pulse' : ''}`} />
                        {isRendering ? 'Submitting Render...' : 'Render & Proceed'}
                    </button>
                </div>
            </header>
            
            <div className="flex-1 min-h-0 flex flex-col">
                {error && (
                    <div className="p-4 bg-red-900 text-red-200 text-center">
                        <strong>Error Loading Creative Studio:</strong> {error}
                    </div>
                )}
                <div data-shotstack-studio className="flex-1 min-h-[300px]" />
                <div data-shotstack-timeline className="h-[300px] border-t-2 border-gray-700" />
            </div>
        </div>
    );
};
