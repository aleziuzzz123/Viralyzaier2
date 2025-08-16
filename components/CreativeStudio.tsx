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
                const { sourceId: newSourceId } = await invokeEdgeFunction<{ sourceId: string }>('creatomate-proxy', {
                    script: project.script,
                    videoSize: project.videoSize,
                });
                
                if (!newSourceId) throw new Error("Creatomate proxy did not return a source ID.");

                // Save the new ID to the database for this project
                await handleUpdateProject({ id: project.id, creatomateTemplateId: newSourceId });
                setSourceId(newSourceId);

            } catch (err) {
                const message = getErrorMessage(err);
                setError(message);
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
        let title = "Failed to Initialize Editor";
        let solution = <p>Please check the troubleshooting steps in the README.md file and your Supabase function logs.</p>;

        if (error.includes('404 Not Found') && error.includes('template with ID')) {
            title = "Configuration Error: Template Not Found";
            solution = (
                <div>
                    <p className="font-extrabold text-sm mb-2">SOLUTION:</p>
                    <p>This 404 error means the function is running but Creatomate rejected the request. Please carefully check the DEBUG INFO in the error details above and then follow these steps:</p>
                    <ul className="list-decimal list-inside text-left mt-2 text-xs space-y-1">
                        <li>Confirm your API Key and Template ID are from the SAME Creatomate project.</li>
                        <li>Carefully re-copy your secrets into Supabase to check for typos or extra spaces.</li>
                        <li>Go to your Supabase function and click 'Redeploy'. This is the most common fix.</li>
                    </ul>
                </div>
            );
        } else if (error.includes('Missing secrets')) {
            title = "Configuration Error: Missing Secrets";
            solution = (
                <div>
                     <p className="font-extrabold text-sm mb-2">SOLUTION:</p>
                     <p>The function is missing required secrets. Please set all 'CREATOMATE_...' secrets in Supabase and then **redeploy the function**.</p>
                </div>
            );
        } else if (error.includes('Missing supabaseUrl or supabaseAnonKey')) {
            title = "Deployment Mismatch: Your Code is Out of Sync!";
            solution = (
                 <div className="text-left">
                    <p className="font-extrabold text-sm mb-2">SOLUTION (This is a required manual step):</p>
                    <p className="mb-3 text-xs">This error confirms your local code is correct, but the deployed version of the 'creatomate-proxy' function on Supabase is outdated and insecure.</p>
                    <div className="mt-4 pt-3 border-t border-red-400/30 text-xs">
                        <p className="font-bold mb-2">The best solution is to use the new automated deployment workflow:</p>
                        <ol className="list-decimal list-inside space-y-2">
                           <li>Go to the `README.md` file in your project.</li>
                           <li>Follow the steps in **Section 4: GitHub & Supabase: Set Up Automated Deployment**.</li>
                           <li>Once set up, push a small change to any file to trigger the automatic update.</li>
                        </ol>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-auto min-h-96 bg-red-900/20 text-red-300 p-8 rounded-lg">
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="mt-2 text-sm text-left whitespace-pre-wrap font-mono bg-red-900/30 p-4 rounded-md w-full">{error}</p>
                <div className="mt-4 text-xs text-red-300 font-bold text-center bg-gray-900/50 p-4 rounded-lg whitespace-pre-wrap w-full">
                    {solution}
                </div>
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
                {sourceId ? <CreatomatePlayer sourceId={sourceId} /> : <div className="flex items-center justify-center h-full text-gray-500">Initializing editor...</div>}
            </div>
        </div>
    );
};

export default CreativeStudio;