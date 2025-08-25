import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK, deproxyifyEdit } from '../utils';
import { SparklesIcon } from './Icons';
import type Studio from '@shotstack/shotstack-studio';

// Define instance types from the SDK's default export
type Application = InstanceType<Studio['Application']>;
type Edit = InstanceType<Studio['Edit']>;


export const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  
  const studioRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const instancesRef = useRef<{ app: Application; edit: Edit; ro: ResizeObserver; changeHandler: () => void; } | null>(null);
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
  
  const debouncedUpdateProject = useCallback((edit: Edit) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
        if (activeProjectDetails) {
            const editJson = edit.getEdit();
            const deproxiedEdit = deproxyifyEdit(editJson);
            handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxiedEdit });
        }
    }, 1000);
  }, [activeProjectDetails, handleUpdateProject]);

  useEffect(() => {
    if (!activeProjectDetails || !studioRef.current || !timelineRef.current) return;
    
    let isMounted = true;

    const boot = async () => {
      try {
        await new Promise(r => requestAnimationFrame(() => r(null)));
        if (!isMounted) return;

        setLoading(true);
        const StudioSDK = await getShotstackSDK();
        const Studio = StudioSDK.default;
        
        if (!Studio || !Studio.Application || !Studio.Edit) {
             throw new Error("Shotstack SDK loaded incorrectly. Core classes (Studio.Application, Studio.Edit) are missing.");
        }

        const template = normalizeTemplate(activeProjectDetails.shotstackEditJson);

        const app = new Studio.Application({
            studio: studioRef.current!,
            timeline: timelineRef.current!,
        });
        const edit = new Studio.Edit(app, template);

        await app.load(edit);

        const fit = () => app.fit();
        fit();
        const ro = new ResizeObserver(fit);
        if(timelineRef.current) ro.observe(timelineRef.current);

        if(isMounted) {
            const changeHandler = () => debouncedUpdateProject(edit);
            edit.events.on("change", changeHandler);
            instancesRef.current = { app, edit, ro, changeHandler };
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
        instances.ro?.disconnect();
        try { instances.edit.events.off("change", instances.changeHandler); } catch {}
        try { instances.app?.dispose?.(); } catch {}
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
      <div ref={studioRef} className="flex-1 min-h-0" />
      <div ref={timelineRef} className="h-[300px] border-t-2 border-gray-700" />
      
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
