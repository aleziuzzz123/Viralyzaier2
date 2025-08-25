import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK, deproxyifyEdit } from '../utils';
import { SparklesIcon } from './Icons';
import type { Edit, Canvas, Controls, Timeline } from '@shotstack/shotstack-studio';

export const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const instancesRef = useRef<{ edit: Edit, canvas: Canvas, controls: Controls, timeline: Timeline } | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Helper: ensure template structure is valid and URLs are direct, public links.
  const normalizeTemplate = useCallback((rawTemplate: any) => {
      const template = JSON.parse(JSON.stringify(rawTemplate || {}));

      // Ensure output.size is present and contains valid numbers to prevent crashes.
      template.output = template.output || {};
      const w = Number(template.output?.size?.width);
      const h = Number(template.output?.size?.height);
      template.output.size = {
        width: Number.isFinite(w) && w > 0 ? w : 1920,
        height: Number.isFinite(h) && h > 0 ? h : 1080,
      };
      
      // Provide a fallback background color.
      template.timeline = template.timeline || {};
      template.timeline.background = template.timeline.background || "#000000";

      // CRITICAL FIX: Convert all proxied asset URLs (e.g., /functions/v1/asset-proxy?url=...)
      // back to their direct public URLs so the browser-side SDK can load them.
      return deproxyifyEdit(template);
  }, []);
  
  const debouncedUpdateProject = useCallback((edit: Edit) => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
        if (activeProjectDetails) {
            const editJson = edit.getEdit();
            // Deproxy again on save to ensure any newly added assets are also saved with direct URLs.
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
        
        const sdk = await getShotstackSDK();
        const { Edit, Canvas, Controls, Timeline } = sdk;
        if (!Edit || !Canvas || !Controls || !Timeline) {
             throw new Error("Shotstack SDK loaded incorrectly. Core classes are missing.");
        }

        // 1) Get template from context and NORMALIZE it to fix URLs and dimensions.
        const template = normalizeTemplate(activeProjectDetails.shotstackEditJson);
        
        // 2) Use the now-safe size and background from the normalized template.
        const size = template.output.size;
        const bg = template.timeline.background;

        // 3) Create Edit instance.
        const edit = new Edit(size, bg);
        await edit.load();

        // 4) Mount Canvas (renders into [data-shotstack-studio]).
        const canvas = new Canvas(size, edit);
        await canvas.load();

        // 5) Load the normalized (and now fixed) template data into the editor.
        await edit.loadEdit(template);

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
  }, [activeProjectDetails, debouncedUpdateProject, normalizeTemplate]);
      
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
                    <li>Ensure all asset URLs are direct public links, not proxied through functions.</li>
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