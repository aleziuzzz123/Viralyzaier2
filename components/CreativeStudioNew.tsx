// components/CreativeStudioNew.tsx
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
import { ShotstackDebugger } from './ShotstackDebugger';
import { ShotstackClipSelection } from '../types';

// Shotstack Studio SDK will be imported dynamically

type SdkHandles = { edit: any; canvas: any; timeline: any; controls: any; };

export const CreativeStudioNew: React.FC<{ testProject?: any }> = ({ testProject }) => {
    const { 
        handleUpdateProject, 
        setActiveProjectId,
        handleRenderProject,
        addToast,
        lockAndExecute,
        session
    } = useAppContext();

    // Use testProject if provided, otherwise use activeProjectDetails
    const projectToUse = testProject || {
        id: 'test-project',
        name: 'Test Project',
        shotstackEdit: {
            timeline: {
                tracks: [
                    {
                        clips: [
                            {
                                asset: {
                                    src: 'https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/footage/cab-ride.mp4',
                                    type: 'video'
                                },
                                start: 0,
                                length: 5,
                                fit: 'cover'
                            }
                        ]
                    }
                ]
            }
        }
    };

    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    const canvasHostRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sdkHandles, setSdkHandles] = useState<SdkHandles | null>(null);
    const [showDebugger, setShowDebugger] = useState(false);

    // Initialize Shotstack Studio SDK
    const initializeShotstack = useCallback(async () => {
        try {
            console.log('🚀 Initializing Shotstack Studio SDK...');
            
            if (!canvasHostRef.current) {
                throw new Error('Canvas host element not found');
            }

            // Dynamically import Shotstack Studio SDK
            console.log('📦 Loading Shotstack Studio SDK...');
            const shotstackModule = await import('@shotstack/shotstack-studio');
            console.log('✅ Shotstack Studio SDK loaded successfully');
            
            const { Canvas, Controls, Edit, Timeline: ShotstackTimeline } = shotstackModule;
            
            // Check if SDK components are available
            if (!Edit || !Canvas || !ShotstackTimeline || !Controls) {
                throw new Error('Shotstack Studio SDK components not loaded. Please check your internet connection and refresh.');
            }

            // Get session token from Supabase
            console.log('🔐 Getting Shotstack session token...');
            try {
                const result = await invokeEdgeFunction('shotstack-studio-token', {});
                const tokenData = result as any;
                
                if (tokenData?.error || !tokenData?.token) {
                    throw new Error(`Failed to get Shotstack session token: ${tokenData?.error || 'No token received'}`);
                }

                console.log('✅ Got Shotstack session token');
            } catch (tokenError: any) {
                console.error('❌ Token error details:', tokenError);
                throw new Error(`Authentication failed: ${tokenError.message}. Please check your Supabase configuration.`);
            }

            // Initialize the individual Shotstack components
            console.log('🔧 Initializing Shotstack components...');
            try {
                const edit = new Edit();
                console.log('✅ Edit component initialized');
                
                const size = { width: 1920, height: 1080 }; // Default HD size
                const canvas = new Canvas(size, edit);
                console.log('✅ Canvas component initialized');
                
                const timeline = new ShotstackTimeline();
                console.log('✅ Timeline component initialized');
                
                const controls = new Controls();
                console.log('✅ Controls component initialized');

                // Set up the SDK handles
                const handles: SdkHandles = {
                    edit,
                    canvas,
                    timeline,
                    controls
                };

                console.log('✅ Shotstack Studio SDK components initialized!', handles);
                setSdkHandles(handles);
                setIsReady(true);
                setIsLoading(false);

            } catch (componentError: any) {
                console.error('❌ Component initialization error:', componentError);
                throw new Error(`Failed to initialize Shotstack components: ${componentError.message}`);
            }

        } catch (err: any) {
            console.error('❌ Failed to initialize Shotstack Studio SDK:', err);
            setError(`Failed to initialize Shotstack Studio SDK: ${err.message}`);
            setIsLoading(false);
        }
    }, [projectToUse?.shotstackEdit]);

    // Initialize SDK when component mounts or project changes
    useEffect(() => {
        console.log('🚀 CreativeStudioNew: useEffect running');
        console.log('🚀 CreativeStudioNew: projectToUse:', projectToUse);
        
        if (!projectToUse?.id) {
            console.log('🚀 CreativeStudioNew: No project, returning early');
            return;
        }

        // Reset state
        setError(null);
        setIsReady(false);
        setIsLoading(true);
        setSdkHandles(null);

        // Initialize Shotstack Studio SDK
        initializeShotstack();

    }, [projectToUse?.id, initializeShotstack]);

    // Debug logging
    console.log('🔍 CreativeStudioNew: Component rendering');
    console.log('🔍 CreativeStudioNew: testProject:', testProject);
    console.log('🔍 CreativeStudioNew: projectToUse:', projectToUse);
    console.log('🔍 CreativeStudioNew: projectToUse?.id:', projectToUse?.id);

    // Guard against missing project details - AFTER ALL HOOKS
    if (!projectToUse?.id) {
        console.error('❌ CreativeStudioNew: No project details available');
        console.error('❌ CreativeStudioNew: testProject:', testProject);
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

    const handleBack = () => {
        if (projectToUse) handleUpdateProject(projectToUse.id, { workflowStep: 2 });
        else setActiveProjectId(null);
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
                    <h1 className="text-2xl font-bold mb-4">Loading Creative Studio...</h1>
                    <p className="text-gray-400">Initializing Shotstack Studio SDK...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <XCircleIcon className="h-32 w-32 text-red-500 mb-4" />
                    <h1 className="text-2xl font-bold mb-4 text-red-500">Shotstack Studio SDK Failed to Load</h1>
                    <p className="mb-4 text-gray-400">{error}</p>
                    <div className="flex gap-4 justify-center">
                        <button 
                            onClick={() => setShowDebugger(true)} 
                            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded"
                        >
                            Debug Issue
                        </button>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded"
                        >
                            Refresh Page
                        </button>
                        <button 
                            onClick={handleBack} 
                            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
            <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-black/30">
                <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
                    &larr; Back to Blueprint
                </button>
                <div className="text-white font-bold px-4 truncate">{projectToUse?.name}</div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-green-400">✅ Shotstack Studio SDK Ready</span>
                    <button 
                        onClick={() => setShowDebugger(true)}
                        className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                    >
                        Debug
                    </button>
                </div>
            </header>

            <main className="flex-1 flex p-4 gap-4 overflow-hidden">
                <div className="flex-[3] flex flex-col gap-4">
                    {/* Canvas Area */}
                    <div className="flex-1 bg-black rounded-lg overflow-hidden">
                        <div 
                            ref={canvasHostRef} 
                            className="w-full h-full"
                            style={{ minHeight: '400px' }}
                        />
                    </div>

                    {/* Timeline */}
                    <div className="h-32 bg-gray-800 rounded-lg p-4">
                        <TimelineComponent 
                            sdkHandles={sdkHandles}
                            project={projectToUse}
                        />
                    </div>
                </div>

                {/* Inspector Panel */}
                <div className="flex-[1] bg-gray-800 rounded-lg p-4">
                    <TopInspectorPanel 
                        sdkHandles={sdkHandles}
                        project={projectToUse}
                    />
                </div>
            </main>

            {/* Asset Browser Modal */}
            <AssetBrowserModal 
                isOpen={false}
                onClose={() => {}}
                onSelectAsset={() => {}}
            />

            {/* Help Modal */}
            <HelpModal 
                isOpen={false}
                onClose={() => {}}
            />

            {/* Debugger Modal */}
            {showDebugger && (
                <ShotstackDebugger />
            )}
        </div>
    );
};
