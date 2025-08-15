import React, { useEffect, useState, useMemo } from 'react';
import { Project } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon } from './Icons';
import { invokeEdgeFunction } from '../services/supabaseService';
import type { EditorOptions } from '@creatomate/editor';
import CreatomateEditor from './CreatomateEditor'; // The new wrapper

const CreativeStudio: React.FC<{ project: Project }> = ({ project }) => {
    const { t, handleUpdateProject, addToast } = useAppContext();
    const [sourceId, setSourceId] = useState<string | null>(project.creatomateTemplateId || null);
    const [isLoading, setIsLoading] = useState(!sourceId);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initialize = async () => {
            if (sourceId) {
                setIsLoading(false);
                return;
            }

            if (!project.script) {
                setError(t('asset_studio.script_required_subtitle'));
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                addToast("Preparing your video timeline...", "info");
                const response = await invokeEdgeFunction<{ sourceId: string }>('creatomate-proxy', { script: project.script });
                
                if (!response.sourceId) {
                    throw new Error("Backend did not return a valid sourceId. Check the creatomate-proxy function logs and ensure your Base Template ID is correct in Supabase secrets.");
                }

                await handleUpdateProject({ id: project.id, creatomateTemplateId: response.sourceId });
                setSourceId(response.sourceId);

            } catch (err) {
                const message = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(`Failed to initialize editor: ${message}`);
                addToast(`Failed to initialize editor: ${message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        initialize();
        
    }, [project.id, project.script, sourceId, handleUpdateProject, addToast, t]);
    
    const editorOptions = useMemo((): EditorOptions | null => {
        const publicToken = (import.meta as any).env?.VITE_CREATOMATE_PUBLIC_TOKEN || (window as any).ENV?.VITE_CREATOMATE_PUBLIC_TOKEN;
        if (!publicToken || publicToken.includes('YOUR_')) {
            setError('Creatomate Public Token is not configured. Please follow the instructions in README.md.');
            return null;
        }
        if (!sourceId) return null;

        return {
            token: publicToken,
            sourceId: sourceId,
            theme: 'dark',
            onExport: async (exports) => {
                if (exports.length > 0) {
                    const finalUrl = exports[0].url;
                    addToast("Video exported! Moving to analysis...", "success");
                    await handleUpdateProject({
                        id: project.id,
                        final_video_url: finalUrl,
                        publishedUrl: finalUrl, // Use this for the preview in the next step
                        workflowStep: 4,
                        status: 'Rendering' // This status shows a loader in the next step
                    });
                }
            },
            onError: (err) => {
                console.error("Creatomate Editor Error:", err);
                setError(`Editor failed: ${err.message}`);
            },
        };
    }, [sourceId, project.id, handleUpdateProject, addToast]);


    if (!project.script) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2>
                <p className="text-gray-400 max-w-md mx-auto text-center">{t('asset_studio.script_required_subtitle')}</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{t('final_edit.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('final_edit.subtitle')}</p>
            </header>
            <div className="h-[75vh] w-full bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                        <SparklesIcon className="w-16 h-16 text-indigo-400 animate-pulse" />
                        <p className="mt-4 text-white font-semibold">Initializing Creative Studio...</p>
                    </div>
                )}
                 {error && !isLoading && (
                    <div className="absolute inset-0 bg-red-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-4">
                        <h3 className="text-2xl font-bold text-red-300">Initialization Failed</h3>
                        <p className="mt-2 text-red-200 text-center max-w-md">{error}</p>
                    </div>
                )}
                {editorOptions && !error && <CreatomateEditor options={editorOptions} />}
            </div>
        </div>
    );
};

export default CreativeStudio;