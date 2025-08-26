
import React, { useEffect, useRef, useState } from 'react';
// Fix: Correctly import the type of the default export from the Shotstack Studio SDK.
import type ShotstackApplication from "@shotstack/shotstack-studio";
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import { ArrowLeftIcon, SparklesIcon } from './Icons';
import { invokeEdgeFunction } from '../services/supabaseService';
import { customEditorTheme } from '../themes/customEditorTheme';

export const CreativeStudio: React.FC = () => {
    const { 
        activeProjectDetails, 
        handleUpdateProject, 
        handleRenderProject, 
        setActiveProjectId,
        addToast,
    } = useAppContext();
    
    const hostRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<ShotstackApplication | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isRendering, setIsRendering] = useState(false);

    // Full screen effect
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Main SDK initialization effect
    useEffect(() => {
        if (!activeProjectDetails || !hostRef.current) return;
        
        let cancelled = false;
        const host = hostRef.current;

        const initializeEditor = async () => {
            try {
                // The SDK is loaded via import map in index.html
                // Fix: Changed dynamic import to handle potential CJS/ESM interop issues.
                const StudioSDK = await import('@shotstack/shotstack-studio');
                const Application = (StudioSDK.default || StudioSDK) as any;


                if (!Application) {
                    throw new Error("Failed to import Shotstack Studio Application class.");
                }

                // Sanitize and proxy asset URLs in the project JSON
                const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
                if (!sanitizedJson) throw new Error("Project has invalid or missing timeline data.");
                const template = proxyifyEdit(sanitizedJson);

                // Initialize the Shotstack Application
                appRef.current = new Application({
                    host,
                    theme: customEditorTheme,
                    // This function securely fetches the session token from your backend
                    token: async () => {
                        const { token } = await invokeEdgeFunction<{ token: string }>('shotstack-studio-token', {});
                        if (!token) throw new Error('Received an invalid token from the server.');
                        return token;
                    },
                });
                
                // Event listener for real-time saving
                appRef.current.on('change', (edit) => {
                    const deproxiedEdit = deproxyifyEdit(edit);
                    handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxiedEdit });
                });

                // Load the editor with your project's timeline data
                await appRef.current.load(template);

                if (!cancelled) {
                    setIsReady(true);
                }

            } catch (e: any) {
                if (!cancelled) {
                    const message = e?.detail || e?.message || String(e);
                    setError(`Error during editor initialization: ${message}`);
                    console.error(e);
                }
            }
        };

        initializeEditor();

        return () => {
            cancelled = true;
            appRef.current?.destroy();
            appRef.current = null;
            if (host) host.innerHTML = '';
            setIsReady(false);
        };
    }, [activeProjectDetails, handleUpdateProject]);


    const handleRender = () => {
        if (appRef.current && activeProjectDetails) {
            setIsRendering(true);
            const editJson = appRef.current.getEdit();
            const deproxied = deproxyifyEdit(editJson);
            handleRenderProject(activeProjectDetails.id, deproxied).finally(() => {
                setIsRendering(false);
            });
        }
    };
    
    const handleBack = () => {
        // Return to the blueprint step
        if (activeProjectDetails) handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
        else setActiveProjectId(null);
    };

    return (
         <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
            <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-gray-700/50 bg-black/30">
                <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
                    <ArrowLeftIcon className="w-5 h-5"/> Back to Blueprint
                </button>
                <div className="text-white font-bold truncate px-4">{activeProjectDetails?.name}</div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleRender} 
                        disabled={isRendering || !isReady}
                        className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm disabled:bg-gray-600"
                    >
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        {isRendering ? 'Submitting Render...' : 'Render & Proceed'}
                    </button>
                </div>
            </header>
            
            <main ref={hostRef} className="flex-1 w-full h-full relative">
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <p className="text-gray-400 text-lg animate-pulse">Initializing Creative Studio...</p>
                    </div>
                )}
            </main>

            {error && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 p-4 bg-red-800 text-white rounded-lg shadow-2xl z-50">
                    <strong>Error:</strong> {error}
                </div>
            )}
        </div>
    );
};
