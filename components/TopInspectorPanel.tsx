import React, { useState } from 'react';
import { ShotstackClipSelection } from '../types';
import TextEngine from './TextEngine';
import VFXHub from './VFXHub';
import ColorAudioStudio from './ColorAudioStudio';
import LayoutToolkit from './LayoutToolkit';
import { XIcon } from './Icons';

type SDK = typeof import("@shotstack/shotstack-studio");

interface TopInspectorPanelProps {
    selection: ShotstackClipSelection;
    edit: InstanceType<SDK["Edit"]>;
    onDeleteClip: (trackIndex: number, clipIndex: number) => void;
}

const TopInspectorPanel: React.FC<TopInspectorPanelProps> = ({ selection, edit, onDeleteClip }) => {
    const [activeTab, setActiveTab] = useState('Inspect');
    const tabs = ['Inspect', 'Text', 'VFX', 'Polish', 'Layout'];

    const renderTabContent = () => {
        // The `studio` prop for these sub-components is the `edit` instance
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
                        <button onClick={() => onDeleteClip(selection.trackIndex, selection.clipIndex)} className="w-full flex items-center justify-center gap-2 p-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md text-sm font-semibold">
                            <XIcon className="w-4 h-4" /> Delete Clip
                        </button>
                    </div>
                );
        }
    }

    return (
        <div className="bg-gray-800 h-full w-full p-2 flex flex-col animate-fade-in-down" style={{animationDuration: '0.2s'}}>
            <div className="flex-shrink-0 border-b border-gray-700">
                <nav className="flex space-x-4">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 px-3 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}>
                            {tab}
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
