import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK, sanitizeShotstackJson, proxyifyEdit, deproxyifyEdit } from '../utils';
import { SparklesIcon } from './Icons';

type Size = { width: number; height: number };

const RES_MAP: Record<string, Record<string, Size>> = {
  sd:    { '16:9': { width: 640,  height: 360  }, '9:16': { width: 360,  height: 640  }, '1:1': { width: 480,  height: 480  }, '4:5': { width: 608,  height: 760  } },
  hd:    { '16:9': { width: 1280, height: 720  }, '9:16': { width: 720,  height: 1280 }, '1:1': { width: 1080, height: 1080 }, '4:5': { width: 1080, height: 1350 } },
  '1080':{ '16:9': { width: 1920, height: 1080 }, '9:16': { width: 1080, height: 1920 }, '1:1': { width: 1080, height: 1080 }, '4:5': { width: 1080, height: 1350 } },
  '4k':  { '16:9': { width: 3840, height: 2160 }, '9:16': { width: 2160, height: 3840 }, '1:1': { width: 2160, height: 2160 }, '4:5': { width: 2160, height: 2700 } },
};

function resolveSizeFromTemplate(template: any): Size {
  // 1) if explicit size exists (and is numeric), use it
  const w = Number(template?.output?.size?.width);
  const h = Number(template?.output?.size?.height);
  if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
    return { width: w, height: h };
  }

  // 2) else compute from resolution + aspectRatio
  const resolution = String(template?.output?.resolution ?? 'hd');
  const aspect = String(template?.output?.aspectRatio ?? '16:9');
  const size = RES_MAP[resolution]?.[aspect] ?? RES_MAP.hd['16:9'];
  return size;
}


export const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  
  const hostRef = useRef<HTMLDivElement | null>(null);
  const instancesRef = useRef<{ edit: any; canvas: any; controls: any; timeline: any } | null>(null);
  const startedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const debouncedUpdateProject = useCallback((editInstance: any) => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
        if (activeProjectDetails) {
            const deproxiedEdit = deproxyifyEdit(editInstance.getEdit());
            handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxiedEdit });
        }
    }, 1000);
  }, [activeProjectDetails, handleUpdateProject]);


  useEffect(() => {
    if (!activeProjectDetails) return;
    
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const save = () => {
      if (instancesRef.current?.edit) {
        debouncedUpdateProject(instancesRef.current.edit);
      }
    };

    // Cleanup function to destroy all SDK instances and remove listeners
    const cleanup = () => {
      cancelled = true;
      startedRef.current = false;
      const instances = instancesRef.current;
      if (instances) {
        try {
          instances.edit.events.off('clip:updated', save);
          instances.edit.events.off('clip:added', save);
          instances.edit.events.off('clip:deleted', save);
          instances.edit.events.off('track:added', save);
          instances.edit.events.off('track:deleted', save);
          
          instances.canvas.dispose();
          instances.controls.dispose();
          instances.timeline.dispose();
        } catch(e) { console.error('Studio cleanup error', e); }
      }
      instancesRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    (async () => {
      try {
        setLoading(true);
        setError(null);

        await new Promise(resolve => setTimeout(resolve, 100));
        if (cancelled || !hostRef.current) return;

        const sdk = await getShotstackSDK();
        if (cancelled) return;
        const { Edit, Canvas, Controls, Timeline } = sdk;
        if (!Edit || !Canvas || !Controls || !Timeline) {
            throw new Error("Shotstack SDK loaded incorrectly. Core components are missing.");
        }
        
        const template = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson) || {
            timeline: { background: "#000000", tracks: [] },
            output: { resolution: 'hd', aspectRatio: activeProjectDetails.videoSize || '16:9' }
        };
        
        const size = resolveSizeFromTemplate(template);
        const background = template?.timeline?.background ?? '#000000';
        const proxiedTemplate = proxyifyEdit(template);

        const edit = new Edit(size, background);
        await edit.load();
        if (cancelled) return;
        
        const canvas = new Canvas(size, edit);
        const controls = new Controls(edit);
        const timeline = new Timeline(edit, { width: size.width, height: 300 });
        
        instancesRef.current = { edit, canvas, controls, timeline };

        await Promise.all([
          canvas.load(),
          controls.load(),
          timeline.load(),
        ]);
        if (cancelled) return;
        
        await edit.loadEdit(proxiedTemplate);
        if (cancelled) return;

        edit.events.on('clip:updated', save);
        edit.events.on('clip:added', save);
        edit.events.on('clip:deleted', save);
        edit.events.on('track:added', save);
        edit.events.on('track:deleted', save);
        
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          console.error('[Studio Init Failed]', e);
          let friendlyMessage = e?.message || 'Failed to load the creative studio. Please try refreshing the page.';
          setError(friendlyMessage);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return cleanup;
  }, [activeProjectDetails, debouncedUpdateProject]);
      
  const handleRender = () => {
      if (instancesRef.current?.edit && activeProjectDetails) {
        const deproxied = deproxyifyEdit(instancesRef.current.edit.getEdit());
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
    <div ref={hostRef} className="w-full h-full flex flex-col relative bg-black rounded-lg overflow-hidden">
        {loading && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20">
                <div className="text-center">
                    <SparklesIcon className="w-12 h-12 text-indigo-400 animate-pulse mx-auto" />
                    <p className="mt-2 text-white font-semibold">Loading Creative Studio...</p>
                </div>
            </div>
        )}
        <div data-shotstack-studio className="flex-grow min-h-0"></div>
        <div data-shotstack-controls></div>
        <div data-shotstack-timeline className="flex-shrink-0 h-[300px] border-t-2 border-gray-700"></div>
        
        <button
            onClick={handleRender}
            className="absolute bottom-52 right-4 z-10 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm shadow-lg"
        >
            <SparklesIcon className="w-5 h-5 mr-2" /> Render & Proceed
        </button>
    </div>
  );
};