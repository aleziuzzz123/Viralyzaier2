import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK, proxyifyEdit, deproxyifyEdit } from '../utils';
import { SparklesIcon } from './Icons';
import type { Edit, Canvas, Controls, Timeline } from '@shotstack/shotstack-studio';

export const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const instancesRef = useRef<{ edit: Edit, canvas: Canvas, controls: Controls, timeline: Timeline } | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Helper from guide: coerce a safe numeric size to prevent crashes
  const safeSize = (raw: any) => {
    const w = Number(raw?.width);
    const h = Number(raw?.height);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      return { width: w, height: h };
    }
    // Fallback if template has no size or is malformed, using project context
    const videoSize = activeProjectDetails?.videoSize;
    if (videoSize === '9:16') return { width: 1080, height: 1920 };
    if (videoSize === '1:1') return { width: 1080, height: 1080 };
    return { width: 1920, height: 1080 }; // Default to 16:9 HD
  };
  
  const debouncedUpdateProject = useCallback((edit: Edit) => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
        if (activeProjectDetails) {
            const editJson = edit.getEdit();
            const deproxiedEdit = deproxyifyEdit(editJson);
            handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxiedEdit });
        }
    }, 1000);
  }, [activeProjectDetails, handleUpdateProject]);


  useEffect(() => {
    if (!activeProjectDetails) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the utility function which correctly imports the npm package.
        const sdk = await getShotstackSDK();
        const { Edit, Canvas, Controls, Timeline } = sdk;
        if (!Edit || !Canvas || !Controls || !Timeline) {
             throw new Error("Shotstack SDK loaded incorrectly. Core classes are missing.");
        }

        // 1) Get template from context and proxy asset URLs to prevent CORS issues.
        const template = activeProjectDetails.shotstackEditJson || {
            timeline: { background: "#000000", tracks: [] },
            output: { size: { width: 1920, height: 1080 }, format: 'mp4' }
        };
        const proxiedTemplate = proxyifyEdit(template);

        // 2) Normalize dimensions & background color with fallbacks.
        const size = safeSize(proxiedTemplate?.output?.size);
        const bg = proxiedTemplate?.timeline?.background ?? "#000000";

        // 3) Create Edit instance.
        const edit = new Edit(size, bg);
        await edit.load();

        // 4) Mount Canvas (renders into [data-shotstack-studio]).
        const canvas = new Canvas(size, edit);
        await canvas.load();

        // 5) Load the template data into the editor.
        await edit.loadEdit(proxiedTemplate);

        // 6) Load Controls for keyboard shortcuts and transport.
        const controls = new Controls(edit);
        await controls.load();

        // 7) Mount Timeline, making it responsive to its container width.
        const container = document.querySelector<HTMLElement>("[data-shotstack-timeline]");
        if (!container) throw new Error("Timeline container element not found in the DOM.");

        const timeline = new Timeline(edit, {
          width: container.clientWidth,
          height: container.clientHeight || 300,
        });
        await timeline.load();

        instancesRef.current = { edit, canvas, controls, timeline };

        // 8) Set up event listener for debounced auto-saving.
        edit.events.on("change", () => debouncedUpdateProject(edit));
        
        setLoading(false);

      } catch (e: any) {
        console.error("Studio init failed:", e);
        setError(e?.message ?? String(e));
        setLoading(false);
        initializedRef.current = false; // Allow retry if component remounts.
      }
    };

    run();

    // Cleanup function runs on component unmount.
    return () => {
      const instances = instancesRef.current;
      if(instances) {
        try { instances.edit.events.off("change"); } catch {}
        try { instances.timeline?.dispose?.(); } catch {}
        try { instances.canvas?.dispose?.(); } catch {}
      }
      instancesRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeProjectDetails, debouncedUpdateProject]);
      
  const handleRender = () => {
      if (instancesRef.current?.edit && activeProjectDetails) {
        const editJson = instancesRef.current.edit.getEdit();
        const deproxied = deproxyifyEdit(editJson);
        handleRenderProject(activeProjectDetails.id, deproxied);
      }
  };

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-red-900/20 text-red-300 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Error Loading Creative Studio</h3>
            <pre className="text-xs text-left font-mono whitespace-pre-wrap">{error}</pre>
             <div className="mt-4 text-sm bg-red-950/50 p-3 rounded-md">
                <b>Common fixes:</b>
                <ul className="list-disc list-inside mt-2">
                    <li>Remove CDN scripts/styles for Shotstack from `index.html`.</li>
                    <li>Ensure `shotstackEditJson` in the project data includes a valid `output.size` with numeric width/height.</li>
                </ul>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-black rounded-lg overflow-hidden">
        {loading && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20">
                <div className="text-center">
                    <SparklesIcon className="w-12 h-12 text-indigo-400 animate-pulse mx-auto" />
                    <p className="mt-2 text-white font-semibold">Loading Creative Studio...</p>
                </div>
            </div>
        )}
        <div data-shotstack-studio className="flex-grow min-h-0"></div>
        <div data-shotstack-timeline className="flex-shrink-0 h-[300px] border-t-2 border-gray-700"></div>
        
        <button
            onClick={handleRender}
            className="absolute bottom-[320px] mb-4 right-4 z-10 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm shadow-lg"
        >
            <SparklesIcon className="w-5 h-5 mr-2" /> Render & Proceed
        </button>
    </div>
  );
};
