import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { useAppContext } from '../contexts/AppContext';
import CreatomatePlayer from './CreatomatePlayer';
import Loader from './Loader';
import { invokeEdgeFunction } from '../services/supabaseService';
import { getErrorMessage } from '../utils';

const CreativeStudio: React.FC<{ project: Project }> = ({ project }) => {
    const { t, handleUpdateProject, addToast } = useAppContext();
    const [sourceId, setSourceId] = useState<string | null>(project.creatomateTemplateId || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeCreatomateSource = async () => {
            if (!project.script) return;

            setIsLoading(true);
            setError(null);
            try {
                // These env vars are needed by the proxy function to authenticate the user
                const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (window as any).ENV?.VITE_SUPABASE_URL;
                const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (window as any).ENV?.VITE_SUPABASE_ANON_KEY;

                const { sourceId: newSourceId } = await invokeEdgeFunction<{ sourceId: string }>('creatomate-proxy', {
                    script: project.script,
                    videoSize: project.videoSize,
                    supabaseUrl,
                    supabaseAnonKey
                });
                
                if (!newSourceId) throw new Error("Creatomate proxy did not return a source ID.");

                // Save the new ID to the database for this project
                await handleUpdateProject({ id: project.id, creatomateTemplateId: newSourceId });
                setSourceId(newSourceId);

            } catch (err) {
                const message = getErrorMessage(err);
                setError(message);
                addToast(message, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        // If the project doesn't have a creatomate ID yet, create one.
        if (!project.creatomateTemplateId) {
            initializeCreatomateSource();
        } else {
            // If it already exists, just use it.
            setSourceId(project.creatomateTemplateId);
        }
    }, [project.id, project.creatomateTemplateId, project.script, project.videoSize, handleUpdateProject, addToast]);


    if (!project.script) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2>
                <p className="text-gray-400 max-w-md mx-auto text-center">{t('asset_studio.script_required_subtitle')}</p>
            </div>
        );
    }
    
    if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-96"><Loader /> <p className="mt-4">Initializing video editor...</p></div>;
    }

    if (error) {
        return <div className="flex flex-col items-center justify-center h-96 bg-red-900/20 text-red-300 p-8 rounded-lg">
            <h3 className="font-bold text-lg">Failed to Initialize Editor</h3>
            <p className="mt-2 text-sm text-center">{error}</p>
            <p className="mt-4 text-xs text-red-400">Please check the troubleshooting steps in the README.md file and your Supabase function logs.</p>
        </div>;
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{t('final_edit.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('final_edit.subtitle')}</p>
            </header>
            <div className="h-[75vh] w-full bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden relative">
                {sourceId ? <CreatomatePlayer sourceId={sourceId} /> : <div className="flex items-center justify-center h-full text-gray-500">Initializing editor...</div>}
            </div>
        </div>
    );
};

export default CreativeStudio;
