import React from 'react';
import { ShotstackClipSelection } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { TypeIcon, SparklesIcon } from './Icons';

interface TextEngineProps {
    studio: any | null;
    selection: ShotstackClipSelection | null;
}

const TextEngine: React.FC<TextEngineProps> = ({ studio, selection }) => {
    const { t } = useAppContext();

    if (!selection || (selection.clip.asset.type !== 'title' && selection.clip.asset.type !== 'subtitle')) {
        return <div className="p-4 text-center text-gray-500">Select a text or subtitle clip on the timeline to edit its style.</div>;
    }

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TypeIcon className="w-6 h-6 text-indigo-400" />
                {t('text_engine.title')}
            </h2>

            <div className="space-y-4">
                <h3 className="font-semibold text-gray-200">{t('text_engine.viral_styles')}</h3>
                <p className="text-sm text-gray-500">One-click viral text styles coming soon.</p>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-gray-200">{t('text_engine.font_control')}</h3>
                <p className="text-sm text-gray-500">Advanced font controls (size, weight, color) coming soon.</p>
            </div>
            
             <div className="space-y-4">
                <button className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors">
                    <SparklesIcon className="w-5 h-5"/>
                    {t('text_engine.ai_emphasis')}
                </button>
             </div>
        </div>
    );
};

export default TextEngine;