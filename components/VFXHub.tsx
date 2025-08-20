import React from 'react';
import { ShotstackClipSelection } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { WandSparklesIcon } from './Icons';

interface VFXHubProps {
    studio: any | null;
    selection: ShotstackClipSelection | null;
}

const VFXHub: React.FC<VFXHubProps> = ({ studio, selection }) => {
    const { t } = useAppContext();

    if (!selection || (selection.clip.asset.type !== 'video' && selection.clip.asset.type !== 'image')) {
        return <div className="p-4 text-center text-gray-500">{t('vfx_hub.no_clip_selected')}</div>;
    }

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <WandSparklesIcon className="w-6 h-6 text-indigo-400" />
                {t('vfx_hub.title')}
            </h2>

            <div className="space-y-4">
                <h3 className="font-semibold text-gray-200">{t('vfx_hub.animations_title')}</h3>
                <p className="text-sm text-gray-500">In/Out animations coming soon.</p>
            </div>
            
             <div className="space-y-4">
                <h3 className="font-semibold text-gray-200">{t('vfx_hub.transitions_title')}</h3>
                <p className="text-sm text-gray-500">Smart transitions between clips coming soon.</p>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-gray-200">{t('vfx_hub.overlays_title')}</h3>
                <p className="text-sm text-gray-500">Stickers and effects overlays coming soon.</p>
            </div>
        </div>
    );
};

export default VFXHub;