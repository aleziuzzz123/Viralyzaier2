import React from 'react';
import { Project } from '../types';
import { useAppContext } from '../contexts/AppContext';
import CreatomatePlayer from './CreatomatePlayer';

const CreativeStudio: React.FC<{ project: Project }> = ({ project }) => {
    const { t } = useAppContext();

    if (!project.script) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2>
                <p className="text-gray-400 max-w-md mx-auto text-center">{t('asset_studio.script_required_subtitle')}</p>
            </div>
        );
    }

    // This component now renders the minimal player to fix the build.
    // The player will show a blank Creatomate interface, ready to be connected to a data source.
    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{t('final_edit.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('final_edit.subtitle')}</p>
            </header>
            <div className="h-[75vh] w-full bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden relative">
                <CreatomatePlayer />
            </div>
        </div>
    );
};

export default CreativeStudio;
