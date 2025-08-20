import React from 'react';
import { ShotstackClipSelection } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { AdjustmentsHorizontalIcon, SparklesIcon } from './Icons';

interface ColorAudioStudioProps {
    studio: any | null;
    selection: ShotstackClipSelection | null;
}

const ColorAudioStudio: React.FC<ColorAudioStudioProps> = ({ studio, selection }) => {
    const { t } = useAppContext();

    const isVisualClip = selection && (selection.clip.asset.type === 'video' || selection.clip.asset.type === 'image');
    const isAudioClip = selection && selection.clip.asset.type === 'audio';

    return (
        <div className="p-4 space-y-6">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-6 h-6 text-indigo-400" />
                {t('color_audio_studio.title')}
            </h2>
            
            {!selection && <p className="text-center text-gray-500 pt-4">{t('color_audio_studio.no_clip_selected')}</p>}

            {isVisualClip && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold text-gray-200">{t('color_audio_studio.color_grading_title')}</h3>
                    <p className="text-sm text-gray-500">LUTs and color controls coming soon.</p>
                </div>
            )}
            
            {isAudioClip && (
                 <div className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold text-gray-200">{t('color_audio_studio.audio_mastering_title')}</h3>
                    <button className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg transition-colors hover:bg-gray-600">
                        <span className="text-sm font-medium text-white">{t('color_audio_studio.auto_enhance_label')}</span>
                         <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
                            <SparklesIcon className="w-4 h-4" />
                            {t('color_audio_studio.auto_enhance_desc')}
                         </span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ColorAudioStudio;