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
    if (!canvasHost) return;

    let cancelled = false;
    let editInstance: any = null;

    const cleanup = () => {
        cancelled = true;
        if (editInstance) {
            editInstance.events.off('clip:updated');
            editInstance.destroy();
        }
        sdkRef.current = null;
        if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
        if (canvasHost) canvasHost.innerHTML = '';
        setIsReady(false);
    };

    const init = async () => {
        if (cancelled) return;
        try {
            const { Edit, Canvas } = (window as any).shotstack;
            
            let template;
            if (activeProjectDetails.shotstackEditJson) {
                const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
                if (!sanitizedJson) throw new Error("Project has invalid timeline data.");
                template = proxyifyEdit(sanitizedJson);
            } else {
                const size = activeProjectDetails.videoSize === '16:9' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
                template = {
                    timeline: { background: '#000000', tracks: [{ clips: [] }] },
                    output: { format: 'mp4', size: size },
                };
            }
            
            const getToken = async (): Promise<string> => {
              const result = await invokeEdgeFunction<{ token: string }>('shotstack-studio-token', {});
              if (!result?.token) throw new Error("Failed to retrieve Shotstack session token.");
              return result.token;
            };

            const edit = new Edit(template.output.size, template.timeline.background);
            editInstance = edit;
            await edit.load();
            if (cancelled) return;
            
            const canvas = new Canvas(template.output.size, edit);
            await canvas.load();
            if (cancelled) return;
            canvasHost.innerHTML = '';
            canvasHost.appendChild((canvas as any).view);
            
            await edit.loadEdit({ ...template, token: getToken });
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
    };
    
    const loadScriptAndInit = () => {
        if (cancelled) return;
        if ((window as any).shotstack?.Edit) {
            init();
            return;
        }

        setError(null);
        setIsReady(false);

        const existingScript = document.getElementById('shotstack-sdk-script');
        if (existingScript) {
            let retries = 50; // 5 second timeout
            const poll = setInterval(() => {
                if ((window as any).shotstack?.Edit) {
                    clearInterval(poll);
                    if (!cancelled) init();
                } else if (--retries <= 0) {
                    clearInterval(poll);
                    if (!cancelled) setError("Shotstack Studio SDK failed to load. The script tag exists but initialization failed.");
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.id = 'shotstack-sdk-script';
        script.src = 'https://cdn.jsdelivr.net/npm/@shotstack/shotstack-studio@1.1.2/dist/shotstack-studio.global.js';
        script.async = true;
        script.crossOrigin = 'anonymous';

        script.onload = () => {
            if (!cancelled) init();
        };
        script.onerror = () => {
            if (!cancelled) setError("Shotstack Studio SDK failed to load from the CDN. Please check your internet connection and refresh the page.");
        };

        document.body.appendChild(script);
    };

    loadScriptAndInit();

    return cleanup;
  }, [activeProjectDetails, debouncedUpdateProject]);

  const handleBack = () => {
    if (activeProjectDetails) handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
    else setActiveProjectId(null);
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
      
      <div className="flex-1 p-4 flex overflow-hidden">
        <div ref={canvasHostRef} className="flex-1 bg-black rounded-lg relative flex items-center justify-center">
          {!isReady && (
            <div className="text-center text-gray-400">
              <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-700"/>
              {error ? <span className="text-red-400 font-semibold">{`Error: ${error}`}</span> : 'Loading Creative Studio...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};