// components/CreativeStudio.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import { invokeEdgeFunction } from '../services/supabaseService';
import { PhotoIcon } from './Icons';

type SdkHandles = { edit: any; };

export const CreativeStudio: React.FC = () => {
  const { 
      activeProjectDetails, 
      handleUpdateProject, 
      setActiveProjectId,
  } = useAppContext();

  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<SdkHandles | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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
    const { current: timelineHost } = timelineHostRef;
    if (!canvasHost || !timelineHost) return;

    let cancelled = false;
    setError(null);
    setIsReady(false);

    (async () => {
      try {
        const { Edit, Canvas, Timeline } = (window as any).shotstack;
        if (!Edit || !Canvas) {
            throw new Error("Shotstack Studio SDK not found. It might have failed to load from the CDN.");
        }
        
        let template;
        if (activeProjectDetails.shotstackEditJson) {
            const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
            if (!sanitizedJson) throw new Error("Project has invalid timeline data.");
            template = proxyifyEdit(sanitizedJson);
        } else {
            // Create a default empty template if none exists, using project's video size
            const size = activeProjectDetails.videoSize === '16:9' ? { width: 1920, height: 1080 } :
                         activeProjectDetails.videoSize === '1:1' ? { width: 1080, height: 1080 } :
                         { width: 1080, height: 1920 }; // Default to vertical

            template = {
                timeline: {
                    background: '#000000',
                    tracks: [
                        { name: 'A-Roll', clips: [] },
                        { name: 'Overlays', clips: [] },
                        { name: 'Audio', clips: [] },
                        { name: 'SFX', clips: [] },
                        { name: 'Music', clips: [] },
                    ],
                },
                output: {
                    format: 'mp4',
                    size: size,
                },
            };
        }
        
        const getToken = async (): Promise<string> => {
          const result = await invokeEdgeFunction<{ token: string }>('shotstack-studio-token', {});
          if (!result?.token) throw new Error("Failed to retrieve Shotstack session token.");
          return result.token;
        };
        const edit = new Edit(template.output.size, template.timeline.background);
        await edit.load();
        if (cancelled) return;
        
        const canvas = new Canvas(template.output.size, edit);
        await canvas.load();
        canvasHost.appendChild((canvas as any).view);

        const timeline = new Timeline(edit, { width: timelineHost.clientWidth, height: timelineHost.clientHeight || 250, });
        await timeline.load();
        timelineHost.appendChild((timeline as any).view);
        
        await edit.loadEdit({ ...template, token: getToken, });
        if (cancelled) return;

        sdkRef.current = { edit };

        edit.events.on('clip:updated', () => debouncedUpdateProject(edit));

        setIsReady(true);
      } catch (e: any) {
        if (!cancelled) {
          console.error("Shotstack initialization error:", e);
          setError(e.message || String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      const edit = sdkRef.current?.edit;
      if (edit) {
        edit.events.off('clip:updated');
        edit.destroy();
      }
      sdkRef.current = null;
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      if (canvasHost) canvasHost.innerHTML = '';
      if (timelineHost) timelineHost.innerHTML = '';
      setIsReady(false);
    };
  }, [activeProjectDetails, debouncedUpdateProject]);

  const handleBack = () => {
    if (activeProjectDetails) handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
    else setActiveProjectId(null);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
      {/* Top Header */}
      <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-black/30">
        <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
          &larr; Back to Blueprint
        </button>
        <div className="text-white font-bold px-4 truncate">{activeProjectDetails?.name}</div>
        <div className="flex items-center gap-4">
          <span className={`text-sm text-gray-400 transition-opacity ${isSaving ? 'opacity-100' : 'opacity-0'}`}>Saving...</span>
        </div>
      </header>
      
      {/* Simplified main layout */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        <div ref={canvasHostRef} className="flex-1 bg-black rounded-lg relative flex items-center justify-center">
          {!isReady && (
            <div className="text-center text-gray-400">
              <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-700"/>
              {error ? `Error: ${error}` : 'Loading Creative Studio...'}
            </div>
          )}
        </div>
        <div ref={timelineHostRef} className="flex-shrink-0 h-64 bg-gray-800/50 rounded-lg border border-gray-700"></div>
      </div>
    </div>
  );
};
