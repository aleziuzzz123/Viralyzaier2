import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK, sanitizeShotstackJson, proxyifyEdit, deproxyifyEdit } from '../utils';
import { SparklesIcon } from './Icons';

// Type placeholders for the dynamic SDK imports
type StudioApplication = any;
type StudioEdit = any;

export const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  
  const hostRef = useRef<HTMLDivElement | null>(null);
  const instancesRef = useRef<{ app: StudioApplication; edit: StudioEdit } | null>(null);
  const startedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const debouncedUpdateProject = useCallback((editJson: any) => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
        if (activeProjectDetails) {
            const deproxiedEdit = deproxyifyEdit(editJson);
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
        debouncedUpdateProject(instancesRef.current.edit.getEdit());
      }
    };

    // Cleanup function to destroy all SDK instances and remove listeners
    const cleanup = () => {
      cancelled = true;
      startedRef.current = false;
      const instances = instancesRef.current;
      if (instances?.app) {
        try {
          instances.edit.events.off('change', save);
          instances.app.dispose();
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
        
        // The default export from the SDK module is the Application class
        const { default: Application, Edit } = sdk;
        if (!Application || !Edit) {
            throw new Error("Shotstack SDK loaded incorrectly. `Application` or `Edit` class is missing.");
        }
        
        const template = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson) || {
            timeline: { background: "#000000", tracks: [] },
            output: { resolution: 'hd', aspectRatio: activeProjectDetails.videoSize || '16:9' }
        };
        
        const proxiedTemplate = proxyifyEdit(template);

        const studioEl = hostRef.current?.querySelector('[data-shotstack-studio]');
        const timelineEl = hostRef.current?.querySelector('[data-shotstack-timeline]');
        const controlsEl = hostRef.current?.querySelector('[data-shotstack-controls]');

        if (!studioEl || !timelineEl || !controlsEl) {
          throw new Error("Required Shotstack DOM elements not found inside the host component.");
        }

        const app = new Application({
            studio: studioEl as HTMLElement,
            timeline: timelineEl as HTMLElement,
            controls: controlsEl as HTMLElement,
        });

        const edit = new Edit(app, proxiedTemplate);
        
        instancesRef.current = { app, edit };

        await app.load(edit);
        if (cancelled) return;
        
        // Use the 'change' event for more efficient debounced saving
        edit.events.on('change', save);
        
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
            className="absolute bottom-[320px] mb-4 right-4 z-10 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm shadow-lg"
        >
            <SparklesIcon className="w-5 h-5 mr-2" /> Render & Proceed
        </button>
    </div>
  );
};
