// components/CreativeStudio.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import { invokeEdgeFunction } from '../services/supabaseService';
import { PhotoIcon, XCircleIcon } from './Icons';
import EditorToolbar from './EditorToolbar';
import TimelineComponent from './Timeline';
import TopInspectorPanel from './TopInspectorPanel';
import AssetBrowserModal from './AssetBrowserModal';
import HelpModal from './HelpModal';
import { ShotstackClipSelection } from '../types';

type SdkHandles = { edit: any; canvas: any; timeline: any; controls: any; };

export const CreativeStudio: React.FC<{ testProject?: any }> = ({ testProject }) => {
    const { 
        handleUpdateProject, 
        setActiveProjectId,
        handleRenderProject,
        addToast,
        lockAndExecute,
        session
    } = useAppContext();

    // Use testProject if provided, otherwise use activeProjectDetails
    const projectToUse = testProject;

    // Debug logging
    console.log('🔍 CreativeStudio: Component rendering');
    console.log('🔍 CreativeStudio: testProject:', testProject);
    console.log('🔍 CreativeStudio: projectToUse:', projectToUse);
    console.log('🔍 CreativeStudio: projectToUse?.id:', projectToUse?.id);

    // Guard against missing project details
    if (!projectToUse?.id) {
        console.error('❌ CreativeStudio: No project details available');
        console.error('❌ CreativeStudio: testProject:', testProject);
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">No Active Project</h1>
                    <p className="mb-4">Please select a project to continue.</p>
                    <p className="mb-4 text-sm text-gray-400">Debug: {JSON.stringify(projectToUse)}</p>
                    <button 
                        onClick={() => setActiveProjectId(null)} 
                        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // MINIMAL VERSION - Only essential hooks
    const canvasHostRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Simple initialization effect
    useEffect(() => {
        console.log('🚀 MINIMAL VERSION: useEffect running');
        console.log('🚀 MINIMAL VERSION: projectToUse:', projectToUse);
        
        if (!projectToUse?.id) {
            console.log('🚀 MINIMAL VERSION: No project, returning early');
            return;
        }

        // Simple timeout to simulate initialization
        const timer = setTimeout(() => {
            console.log('🚀 MINIMAL VERSION: Setting ready state');
            setIsReady(true);
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [projectToUse?.id]);

    const handleBack = () => {
        if (projectToUse) handleUpdateProject(projectToUse.id, { workflowStep: 2 });
        else setActiveProjectId(null);
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
            <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-black/30">
                <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
                    &larr; Back to Blueprint
                </button>
                <div className="text-white font-bold px-4 truncate">{projectToUse?.name}</div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">MINIMAL VERSION</span>
                </div>
            </header>

            <main className="flex-1 flex p-4 gap-4 overflow-hidden">
                <div className="flex-[3] flex flex-col gap-4">
                    <div ref={canvasHostRef} className="flex-1 bg-black rounded-lg relative flex items-center justify-center">
                        {!isReady && (
                            <div className="text-center text-gray-400">
                                <div className="w-16 h-16 mx-auto mb-4 text-gray-700 bg-gray-600 rounded animate-pulse"/>
                                {error ? <span className="text-red-400 font-semibold">{`Error: ${error}`}</span> : 'Loading MINIMAL Creative Studio...'}
                            </div>
                        )}
                        {isReady && (
                            <div className="text-center text-white">
                                <h2 className="text-2xl font-bold mb-4">MINIMAL VERSION LOADED!</h2>
                                <p className="mb-4">Project: {projectToUse.name}</p>
                                <p className="mb-4">ID: {projectToUse.id}</p>
                                <p className="text-green-400">✅ No React Error #310!</p>
                            </div>
                        )}
                    </div>
                </div>
                <aside className="flex-1 w-80 flex-shrink-0">
                    <div className="bg-gray-800/50 h-full w-full rounded-lg border border-gray-700 flex flex-col items-center justify-center text-center text-gray-500 p-4">
                        <h3 className="font-bold text-gray-300">MINIMAL VERSION</h3>
                        <p className="text-sm">This is a simplified version to test React hooks.</p>
                    </div>
                </aside>
            </main>
        </div>
    );
};

