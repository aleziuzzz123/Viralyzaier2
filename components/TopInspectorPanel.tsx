import React, { useState } from 'react';
import { ShotstackClipSelection } from '../types';
import TextEngine from './TextEngine';
import VFXHub from './VFXHub';
import ColorAudioStudio from './ColorAudioStudio';
import LayoutToolkit from './LayoutToolkit';
import { XIcon, TypeIcon, WandSparklesIcon, AdjustmentsHorizontalIcon, ViewColumnsIcon } from './Icons';

interface TopInspectorPanelProps {
    selection: ShotstackClipSelection;
    studio: any; // The 'edit' instance
    onDeleteClip: () => void;
}

const TopInspectorPanel: React.FC<TopInspectorPanelProps> = ({ selection, studio: edit, onDeleteClip }) => {
    const isText = selection.clip.asset.type === 'title' || selection.clip.asset.type === 'subtitle';
    const isVisual = selection.clip.asset.type === 'video' || selection.clip.asset.type === 'image';
    const isAudio = selection.clip.asset.type === 'audio';
    
    // Default to the most relevant tab
    const getDefaultTab = () => {
        if (isText) return 'Text';
        if (isVisual) return 'VFX';
        if (isAudio) return 'Polish';
        return 'Inspect';
    }
    
    const [activeTab, setActiveTab] = useState(getDefaultTab());

    React.useEffect(() => {
        setActiveTab(getDefaultTab());
    }, [selection.clip.id]);

    const tabs = [
      { name: 'Inspect', icon: AdjustmentsHorizontalIcon, show: true },
      { name: 'Text', icon: TypeIcon, show: isText },
      { name: 'VFX', icon: WandSparklesIcon, show: isVisual },
      { name: 'Polish', icon: AdjustmentsHorizontalIcon, show: isVisual || isAudio },
      { name: 'Layout', icon: ViewColumnsIcon, show: isVisual },
    ].filter(t => t.show);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Text': return <TextEngine studio={edit} selection={selection} />;
            case 'VFX': return <VFXHub studio={edit} selection={selection} />;
            case 'Polish': return <ColorAudioStudio studio={edit} selection={selection} />;
            case 'Layout': return <LayoutToolkit studio={edit} selection={selection} />;
            case 'Inspect':
            default:
                return (
                    <div className="p-4 space-y-4">
                        <div className="text-xs text-gray-400 break-words">
                            <p><span className="font-bold text-gray-200">Type:</span> {selection.clip.asset.type}</p>
                            <p><span className="font-bold text-gray-200">Start:</span> {selection.clip.start.toFixed(2)}s</p>
                            <p><span className="font-bold text-gray-200">Length:</span> {selection.clip.length.toFixed(2)}s</p>
                        </div>
                        <button onClick={onDeleteClip} className="w-full flex items-center justify-center gap-2 p-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md text-sm font-semibold">
                            <XIcon className="w-4 h-4" /> Delete Clip
                        </button>
                    </div>
                );
        }
    }

    return (
        <div className="bg-gray-800 h-full w-full rounded-lg border border-gray-700 flex flex-col animate-fade-in-down" style={{animationDuration: '0.2s'}}>
            <div className="flex-shrink-0 border-b border-gray-700">
                <nav className="flex space-x-2 p-1">
                    {tabs.map(tab => (
                        <button key={tab.name} onClick={() => setActiveTab(tab.name)} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md ${activeTab === tab.name ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>
                            <tab.icon className="w-5 h-5" />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow overflow-y-auto">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default TopInspectorPanel;
