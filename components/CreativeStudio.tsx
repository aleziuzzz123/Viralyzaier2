import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit } from '../utils';
import { SparklesIcon } from './Icons';

// Correct, modular imports
import { Edit, Canvas, Controls, Timeline } from '@shotstack/shotstack-studio';
// Import the required CSS
import '@shotstack/shotstack-studio/dist/style.css';


export const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use a ref to hold instances for cleanup and event handlers
  const instancesRef = useRef<{ edit: Edit, canvas: Canvas, controls: Controls, timeline: Timeline } | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const normalizeTemplate = useCallback((rawTemplate: any) => {
    const template = JSON.parse(JSON.stringify(rawTemplate || {}));
    template.output = template.output || {};
    if (!template.output.format) template.output.format = 'mp4';
    const w = Number(template.output?.size?.width);
    const h = Number(template.output?.size?.height);
    template.output.size = {
      width: Number.isFinite(w) && w > 0 ? w : 1920,
      height: Number.isFinite(h) && h > 0 ? h : 1080,
    };
    template.timeline = template.timeline || {};
    template.timeline.background = template.timeline.background || "#000000";
    if (!Array.isArray(template.timeline.tracks)) template.timeline.tracks = [];
    return deproxyifyEdit(template);
  }, []);
  
  const debouncedUpdateProject = useCallback((editInstance: Edit) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
        if (activeProjectDetails) {
            const editJson = editInstance.getEdit();
            const deproxiedEdit = deproxyifyEdit(editJson);
            handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxiedEdit });
        }
    }, 1000);
  }, [activeProjectDetails, handleUpdateProject]);

  useEffect(() => {
    if (!activeProjectDetails) return;
    
    let isMounted = true;
    let changeHandler: () => void;

    const boot = async () => {
      try {
        await new Promise(r => requestAnimationFrame(() => r(null)));
        if (!isMounted) return;

        setLoading(true);

        const template = normalizeTemplate(activeProjectDetails.shotstackEditJson);
        const size = template.output.size;
        const bg = template.timeline.background;

        // 1. Create Edit
        const edit = new Edit(size, bg);
        await edit.load();

        // 2. Mount Canvas (renders into [data-shotstack-studio])
        const canvas = new Canvas(size, edit);
        await canvas.load();

        // 3. Load the template data into the editor
        await edit.loadEdit(template);

        // 4. Controls (keyboard, transport)
        const controls = new Controls(edit);
        await controls.load();

        // 5. Timeline (renders into [data-shotstack-timeline])
        const timelineContainer = document.querySelector<HTMLElement>('[data-shotstack-timeline]');
        const timeline = new Timeline(edit, {
            width: timelineContainer?.clientWidth || size.width,
            height: 300,
        });
        await timeline.load();

        if (isMounted) {
            instancesRef.current = { edit, canvas, controls, timeline };
            changeHandler = () => debouncedUpdateProject(edit);
            edit.events.on("change", changeHandler);
            setLoading(false);
        }

      } catch (e: any) {
        console.error("Studio init failed:", e);
        if (isMounted) setError(e?.message ?? String(e));
      }
    };

    boot();

    return () => {
      isMounted = false;
      const instances = instancesRef.current;
      if (instances) {
        try { instances.edit.events.off("change", changeHandler); } catch {}
        try { instances.timeline?.destroy?.(); } catch {}
        try { instances.canvas?.destroy?.(); } catch {}
        // Controls/Edit don’t usually need manual dispose, but safe to drop refs
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
            <p className="mb-4">Shotstack SDK loaded incorrectly. Core classes are missing.</p>
            <pre className="text-xs text-left font-mono whitespace-pre-wrap bg-gray-900/50 p-2 rounded">{error}</pre>
        </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#0b1220] relative">
      {loading && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20">
          <div className="text-center">
            <SparklesIcon className="w-12 h-12 text-indigo-400 animate-pulse mx-auto" />
            <p className="mt-2 text-white font-semibold">Loading Creative Studio...</p>
          </div>
        </div>
      )}
      {/* The SDK will automatically find and mount to these data attributes */}
      <div data-shotstack-studio className="flex-1 min-h-0" />
      <div data-shotstack-timeline className="h-[300px] border-t-2 border-gray-700" />
      
      {!loading && (
        <button
            onClick={handleRender}
            className="absolute bottom-[316px] right-4 z-10 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all text-sm shadow-lg transform hover:scale-105"
        >
            <SparklesIcon className="w-5 h-5 mr-2" /> Render & Proceed
        </button>
      )}
    </div>
  );
};
