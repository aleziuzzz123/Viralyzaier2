import React, { useState, useEffect } from 'react';
import { ShotstackClipSelection } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { WandSparklesIcon } from './Icons';

interface VFXHubProps {
    studio: any | null;
    selection: ShotstackClipSelection | null;
}

const VFXHub: React.FC<VFXHubProps> = ({ studio, selection }) => {
    const { t } = useAppContext();
    const [transitionIn, setTransitionIn] = useState('fade');
    const [transitionOut, setTransitionOut] = useState('fade');
    
    useEffect(() => {
        if (selection?.clip.transition) {
            setTransitionIn(selection.clip.transition.in || 'fade');
            setTransitionOut(selection.clip.transition.out || 'fade');
        } else {
            setTransitionIn('fade');
            setTransitionOut('fade');
        }
    }, [selection]);

    const handleTransitionChange = (type: 'in' | 'out', value: string) => {
        if (studio && selection) {
            const currentTransition = selection.clip.transition || {};
            studio.updateClip(selection.trackIndex, selection.clipIndex, {
                transition: { ...currentTransition, [type]: value }
            });
            if (type === 'in') setTransitionIn(value);
            if (type === 'out') setTransitionOut(value);
        }
    };

    if (!selection || (selection.clip.asset.type !== 'video' && selection.clip.asset.type !== 'image')) {
        return <div className="p-4 text-center text-gray-500">{t('vfx_hub.no_clip_selected')}</div>;
    }
    
    const transitionOptions = ['fade', 'reveal', 'wipeLeft', 'wipeRight', 'slideLeft', 'slideRight', 'slideUp', 'slideDown'];

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <WandSparklesIcon className="w-6 h-6 text-indigo-400" />
                {t('vfx_hub.transitions_title')}
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-400">Transition In</label>
                    <select
                        value={transitionIn}
                        onChange={(e) => handleTransitionChange('in', e.target.value)}
                        className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-white"
                    >
                        {transitionOptions.map(opt => <option key={`in-${opt}`} value={opt}>{opt}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-400">Transition Out</label>
                    <select
                        value={transitionOut}
                        onChange={(e) => handleTransitionChange('out', e.target.value)}
                        className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-white"
                    >
                        {transitionOptions.map(opt => <option key={`out-${opt}`} value={opt}>{opt}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default VFXHub;