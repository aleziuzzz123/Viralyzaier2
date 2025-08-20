import React, { useState, useEffect, useCallback } from 'react';
import { Project, ShotstackClipSelection, NormalizedStockAsset } from '../types';
import { LayersIcon, PhotoIcon, TrashIcon, WandSparklesIcon, TypeIcon, AdjustmentsHorizontalIcon, ViewColumnsIcon, SearchIcon, PlusIcon, MusicNoteIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import Loader from './Loader';
import { getErrorMessage } from '../utils';

const InspectorPanelContent: React.FC<{ studio: any | null, selection: ShotstackClipSelection | null }> = ({ studio, selection }) => {
    const handleDelete = () => {
        if (!studio || !selection) return;
        studio.deleteClip(selection.trackIndex, selection.clipIndex);
    };
    
    if (!selection || !selection.clip) {
        return <div className="p-4 text-center text-gray-500">Select a clip on the timeline to edit its properties.</div>;
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <p className="text-sm font-bold text-white capitalize">{selection.clip.asset.type} Clip</p>
                <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-400" title="Delete Clip"><TrashIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};

interface MediaPanelProps {
    project: Project;
    studio: any | null;
    onAddClip: (clip: any, trackType: 'b-roll' | 'music') => void;
}
type MediaTab = 'Video' | 'Image' | 'Music' | 'Stickers' | 'AI';

const MediaPanel: React.FC<MediaPanelProps> = ({ project, studio, onAddClip }) => {
    const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>('Video');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<NormalizedStockAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // AI B-Roll state
    const [aiBrollPrompt, setAiBrollPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setResults([]);
        try {
            let data: NormalizedStockAsset[] = [];
            switch (activeMediaTab) {
                case 'Video': data = await geminiService.searchPexels(query, 'videos'); break;
                case 'Image': data = await geminiService.searchPexels(query, 'photos'); break;
                case 'Music': data = await geminiService.searchJamendoMusic(query); break;
                case 'Stickers': data = await geminiService.searchGiphy(query, 'stickers'); break;
            }
            setResults(data);
        } catch (error) { console.error(`Failed to search ${activeMediaTab}:`, error); } finally { setIsLoading(false); }
    }, [query, activeMediaTab]);

    const handleAddStockAsset = (asset: NormalizedStockAsset) => {
        if (!studio) return;
        const trackType = asset.type === 'audio' ? 'music' : 'b-roll';
        onAddClip({
            asset: { type: asset.type, src: asset.downloadUrl },
            start: studio.getCurrentTime(),
            length: asset.duration || 5
        }, trackType);
    };

    const handleAiBroll = async () => {
        if (!aiBrollPrompt.trim()) return;
        setIsAiLoading(true);
        try {
            const suggestion = await geminiService.getAiBrollSuggestion(aiBrollPrompt);
            if (suggestion.type === 'stock' && suggestion.query) {
                setActiveMediaTab('Video');
                setQuery(suggestion.query);
                // Trigger search after state updates
                setTimeout(() => document.getElementById('media-search-button')?.click(), 100);
            } else if (suggestion.type === 'ai_video' && suggestion.prompt) {
                // Future: Handle AI video generation
            }
        } catch(e) {
            console.error(getErrorMessage(e));
        } finally {
            setIsAiLoading(false);
        }
    };
    
    return (
        <div className="p-4 flex flex-col h-full">
            <div className="flex-shrink-0">
                 <div className="flex gap-2 border-b border-gray-700">
                    {['Video', 'Image', 'Music', 'Stickers', 'AI'].map(tab => (
                        <button key={tab} onClick={() => setActiveMediaTab(tab as MediaTab)} className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 ${activeMediaTab === tab ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400'}`}>
                           {tab === 'AI' && <WandSparklesIcon className="w-4 h-4"/>} {tab}
                        </button>
                    ))}
                </div>
                 {activeMediaTab !== 'AI' ? (
                    <div className="flex items-center gap-2 my-4">
                        <div className="flex-grow relative">
                            <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} placeholder={`Search for ${activeMediaTab}...`} className="w-full bg-gray-900 border border-gray-700 rounded-full pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                        </div>
                        <button id="media-search-button" onClick={handleSearch} disabled={isLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold text-sm disabled:bg-gray-600">Search</button>
                    </div>
                ) : (
                    <div className="my-4 space-y-3">
                        <textarea value={aiBrollPrompt} onChange={e => setAiBrollPrompt(e.target.value)} placeholder="Describe a visual you need..." rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <button onClick={handleAiBroll} disabled={isAiLoading} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold text-sm disabled:bg-gray-600">{isAiLoading ? "Thinking..." : "Get B-Roll Suggestion"}</button>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto mt-2 pr-2 -mr-2">
                {isLoading ? <div className="flex justify-center items-center h-full"><Loader /></div> : (
                    <div className={activeMediaTab === 'Music' ? "space-y-2" : "grid grid-cols-2 gap-2"}>
                        {results.map(asset => (
                             <div key={asset.id} className="relative group cursor-pointer rounded-md overflow-hidden" onClick={() => handleAddStockAsset(asset)}>
                                {asset.type === 'audio' ? (
                                    <div className="bg-gray-900/50 p-3 flex items-center justify-between hover:bg-gray-900">
                                        <div className="flex items-center gap-3">
                                            <MusicNoteIcon className="w-5 h-5 text-indigo-400"/>
                                            <p className="text-sm text-gray-300 truncate">{asset.description}</p>
                                        </div>
                                        <PlusIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100"/>
                                    </div>
                                ) : (
                                    <>
                                        <img src={asset.previewImageUrl} alt={asset.description} className="w-full h-full object-cover aspect-video" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <PlusIcon className="w-8 h-8 text-white"/>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface AssetAndInspectorPanelProps {
    project: Project;
    studio: any | null;
    selection: ShotstackClipSelection | null;
    onAddClip: (clip: any, trackType: 'b-roll' | 'music') => void;
}

type Tab = 'Media' | 'Inspector';

const AssetAndInspectorPanel: React.FC<AssetAndInspectorPanelProps> = ({ project, studio, selection, onAddClip }) => {
    const [activeTab, setActiveTab] = useState<Tab>('Media');

    useEffect(() => {
        if (selection) setActiveTab('Inspector');
        else setActiveTab('Media');
    }, [selection]);

    const renderActiveTab = () => {
        switch(activeTab) {
            case 'Media': return <MediaPanel project={project} studio={studio} onAddClip={onAddClip} />;
            case 'Inspector': return <InspectorPanelContent studio={studio} selection={selection} />;
            default: return null;
        }
    };

    const tabs: { id: Tab, icon: React.FC<{className?:string}>, label: string }[] = [
        { id: 'Media', icon: PhotoIcon, label: 'Media' },
        { id: 'Inspector', icon: LayersIcon, label: 'Inspector' },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            <div className="flex-shrink-0 border-b border-gray-700/50 flex justify-around">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        disabled={tab.id === 'Inspector' && !selection}
                        className={`w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed ${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                        title={tab.label}
                    >
                        <tab.icon className="w-5 h-5" /> {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex-grow overflow-y-auto">
                {renderActiveTab()}
            </div>
        </div>
    );
};

export default AssetAndInspectorPanel;
