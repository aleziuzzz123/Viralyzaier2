// components/CreativeStudio.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import { invokeEdgeFunction } from '../services/supabaseService';
import { PhotoIcon } from './Icons';

// Import the new top-level Application class and styles
// FIX: Changed to a default import as 'Application' is likely the default export of the module.
import Application from '@shotstack/shotstack-studio';
import '@shotstack/shotstack-studio/dist/style.css';
import darkTheme from '@shotstack/shotstack-studio/themes/dark.json';

export const CreativeStudio: React.FC = () => {
    const {
        activeProjectDetails,
        handleUpdateProject,
        setActiveProjectId,
        handleRenderProject,
        addToast,
        lockAndExecute
    } = useAppContext();

    // Single ref for the SDK to mount into
    const mountRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef<number | null>(null);

    // Debounced save function using the new app.toJSON() method
    const debouncedUpdateProject = useCallback(async (app: Application) => {
        if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
        setIsSaving(true);
        saveTimeoutRef.current = window.setTimeout(async () => {
            if (activeProjectDetails) {
                try {
                    const editJson = await app.toJSON();
                    const deproxied = deproxyifyEdit(editJson);
                    await handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxied });
                } catch (e) {
                    addToast("Failed to save project changes.", "error");
                } finally {
                    setIsSaving(false);
                }
            } else {
                setIsSaving(false);
            }
        }, 1500);
    }, [activeProjectDetails, handleUpdateProject, addToast]);


    // Main initialization effect, following the user's recommended pattern
    useEffect(() => {
        if (!activeProjectDetails) return;
        const mountEl = mountRef.current;
        if (!mountEl) return;

        let cancelled = false;

        const init = async () => {
            if (cancelled) return;
            setError(null);
            setIsReady(false);
            try {
                // Prepare the edit JSON from the project
                let editJson;
                if (activeProjectDetails.shotstackEditJson) {
                    const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
                    if (!sanitizedJson) throw new Error("Project has invalid timeline data.");
                    editJson = proxyifyEdit(sanitizedJson);
                } else {
                    const size = activeProjectDetails.videoSize === '16:9' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
                    editJson = {
                        timeline: { background: '#000000', tracks: [{ clips: [] }] },
                        output: { format: 'mp4', size },
                    };
                }

                // 1. Create the Application instance (ONLY ONCE)
                if (!appRef.current) {
                    const tokenProvider = async (): Promise<string> => {
                        console.log("[Studio] Requesting session token...");
                        const result = await invokeEdgeFunction<{ token: string }>('shotstack-studio-token', {});
                        if (!result?.token) throw new Error("Failed to retrieve Shotstack session token.");
                        console.log("[Studio] Session token received.");
                        return result.token;
                    };

                    appRef.current = new Application({
                        target: mountEl,
                        token: tokenProvider,
                        theme: darkTheme as any, // Cast to any to match expected SDK theme type
                    });
                }
                
                if (cancelled) return;

                // 2. Load the timeline data into the app
                await appRef.current!.load(editJson);
                setIsReady(true);

                // 3. Set up event listener for saving changes
                appRef.current!.on('change', () => {
                    if (appRef.current) {
                        debouncedUpdateProject(appRef.current);
                    }
                });

            } catch (e: any) {
                if (!cancelled) {
                    console.error("Shotstack initialization error:", e);
                    setError(e.message || String(e));
                }
            }
        };

        init();

        // Cleanup function
        return () => {
            cancelled = true;
            if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
            // Destroy the app instance to prevent memory leaks, as per user's recommendation
            // This also cleans up the DOM inside mountEl
            appRef.current?.destroy();
            appRef.current = null;
        };
    }, [activeProjectDetails, debouncedUpdateProject]);

    const handleBack = () => {
        if (activeProjectDetails) handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
        else setActiveProjectId(null);
    };
  
    const handleRender = () => lockAndExecute(async () => {
        if (appRef.current && activeProjectDetails) {
            const editJson = await appRef.current.toJSON();
            const deproxied = deproxyifyEdit(editJson);
            await handleRenderProject(activeProjectDetails.id, deproxied);
        } else {
            addToast("Editor is not ready or no project is active.", "error");
        }
    });

    return (
        <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
            <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-black/30">
                <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
                    &larr; Back to Blueprint
                </button>
                <div className="text-white font-bold px-4 truncate">{activeProjectDetails?.name}</div>
                <div className="flex items-center gap-4">
                    <span className={`text-sm text-gray-400 transition-opacity ${isSaving ? 'opacity-100' : 'opacity-0'}`}>Saving...</span>
                    <button onClick={handleRender} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm">
                        Render & Proceed
                    </button>
                </div>
            </header>
      
            {/* Single mount point for the entire SDK application */}
            <div ref={mountRef} className="flex-1 min-h-0 relative">
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-gray-400 bg-black">
                        <div>
                            <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-700"/>
                            {error ? <span className="text-red-400 font-semibold">{`Error: ${error}`}</span> : 'Authenticating & Loading Studio...'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};