
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

        if (error.includes('Sanity Probe Failed')) {
            title = "Configuration Error: Invalid Template or API Key";
            solution = (
                <div>
                    <p className="font-extrabold text-sm mb-2">SOLUTION:</p>
                    <p>The function's sanity check failed. This means your `CREATOMATE_API_KEY` or Template ID secrets are incorrect.</p>
                    <ul className="list-decimal list-inside text-left mt-2 text-xs space-y-1">
                        <li>Confirm your API Key and all three Template IDs are from the **SAME** Creatomate project.</li>
                        <li>Carefully re-copy your secrets into Supabase to check for typos.</li>
                        <li>Go to your Supabase function and click 'Redeploy'. This is required after changing secrets.</li>
                    </ul>
                </div>
            );
        } else if (error.includes('Function Configuration Error')) {
            title = "Configuration Error: Missing Secrets";
            solution = (
                <div>
                     <p className="font-extrabold text-sm mb-2">SOLUTION:</p>
                     <p>The function is missing required secrets. Please set all 'CREATOMATE_...' secrets in your Supabase Dashboard and then redeploy the function.</p>
                </div>
            );
        } else if (error.includes('after a successful sanity probe')) {
            title = "Creatomate API Error: Invalid Request Data";
            solution = (
                 <div className="text-left">
                    <p className="font-extrabold text-sm mb-2">DETAILS:</p>
                    <p className="mb-3 text-xs">Your API keys and Template ID are correct! However, Creatomate rejected the data sent to it. This is almost always caused by a misconfiguration in your template.</p>
                    <p className="font-bold mb-2">TOP SOLUTIONS:</p>
                    <ul className="list-decimal list-inside text-xs space-y-1">
                        <li className="font-bold text-amber-300"><strong>MOST LIKELY:</strong> Check that your key elements (`Scene-1-Visual`, `Scene-1-Voiceover`, etc.) are marked as **"Dynamic"**. Select each element in the editor and find the "Dynamic" checkbox in the Properties panel on the right.</li>
                        <li>Double-check all element names for typos (e.g., 'Scene-1-Vusual' instead of 'Scene-1-Visual').</li>
                        <li>Ensure your `Voiceover` element is a **"Text-to-Speech"** type, not a standard "Audio" type.</li>
                        <li>If the problem persists, try duplicating the template in Creatomate and using the new ID.</li>
                    </ul>
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
