import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ShotstackClipSelection, NormalizedStockAsset } from '../types';
import { SearchIcon, SparklesIcon, XIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import { generateAiImage } from '../services/generativeMediaService';
import TextEngine from './TextEngine';
import VFXHub from './VFXHub';
import ColorAudioStudio from './ColorAudioStudio';
import LayoutToolkit from './LayoutToolkit';

interface AssetAndInspectorPanelProps {
    studio: any;
    selection: ShotstackClipSelection | null;
    onAddClip: (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => void;
    onDeleteClip: (trackIndex: number, clipIndex: number) => void;
}

type AssetType = 'Video' | 'Image' | 'Music' | 'Stickers' | 'AI';

const AiAssetGenerator: React.FC<{ onAddClip: (type: 'image', url: string) => void }> = ({ onAddClip }) => {
    const { addToast, lockAndExecute, activeProjectDetails } = useAppContext();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = () => lockAndExecute(async () => {
        if (!prompt.trim() || !activeProjectDetails) {
            addToast("Please enter a prompt and ensure a project is active.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const imageUrl = await generateAiImage(prompt, activeProjectDetails.platform, activeProjectDetails.id);
            addToast("Image generated successfully!", "success");
            onAddClip('image', imageUrl);
            setPrompt('');
        } catch(e) {
            addToast(e instanceof Error ? e.message : "Failed to generate AI image.", 'error');
        } finally {
            setIsLoading(false);
        }
    });

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-bold text-white">AI Image Generation</h3>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A cinematic shot of a robot meditating on a mountaintop"
                rows={4}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white"
            />
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-gray-500"
            >
                <SparklesIcon className="w-5 h-5"/>
                {isLoading ? "Generating..." : "Generate (2 Credits)"}
            </button>
        </div>
    )
}

const AssetBrowser: React.FC<{ onAddClip: (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => void }> = ({ onAddClip }) => {
    const { t, lockAndExecute, addToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<AssetType>('Video');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<NormalizedStockAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = useCallback(() => lockAndExecute(async () => {
        if (!searchTerm.trim()) return;
        setIsLoading(true);
        setResults([]);
        try {
            let searchResults: NormalizedStockAsset[] = [];
            switch (activeTab) {
                case 'Video':
                    searchResults = await geminiService.searchPexels(searchTerm, 'videos');
                    break;
                case 'Image':
                    searchResults = await geminiService.searchPexels(searchTerm, 'photos');
                    break;
                case 'Music':
                    searchResults = await geminiService.searchJamendoMusic(searchTerm);
                    break;
                case 'Stickers':
                    searchResults = await geminiService.searchGiphy(searchTerm, 'stickers');
                    break;
            }
            setResults(searchResults);
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Failed to search assets.', 'error');
        } finally {
            setIsLoading(false);
        }
    }), [searchTerm, activeTab, lockAndExecute, addToast]);

    const tabs: AssetType[] = ['Video', 'Image', 'Music', 'Stickers', 'AI'];

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-700">
                {activeTab !== 'AI' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={`Search for ${activeTab}...`}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button onClick={handleSearch} disabled={isLoading} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:bg-gray-600">
                            <SearchIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
                 <nav className="mt-4 -mb-4 flex space-x-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'AI' ? (
                     <AiAssetGenerator onAddClip={onAddClip as (type: 'image', url: string) => void} />
                ) : (
                    <div className="p-4">
                        {isLoading && <p className="text-center text-gray-400">Loading...</p>}
                        <div className="grid grid-cols-2 gap-4">
                            {results.map(asset => (
                                <div key={asset.id} className="group relative cursor-pointer" onClick={() => onAddClip(asset.type, asset.downloadUrl)}>
                                    <img src={asset.previewImageUrl} alt={asset.description} className="w-full h-24 object-cover rounded-md bg-black" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-white text-xs text-center p-1">{asset.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Inspector: React.FC<{ selection: ShotstackClipSelection; studio: any; onDeleteClip: (trackIndex: number, clipIndex: number) => void }> = ({ selection, studio, onDeleteClip }) => {
    const [activeTab, setActiveTab] = useState('Inspect');
    const tabs = ['Inspect', 'Text', 'VFX', 'Polish', 'Layout'];

    useEffect(() => {
        // Reset to inspect tab when selection changes to avoid showing an irrelevant inspector
        setActiveTab('Inspect');
    }, [selection]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Text': return <TextEngine studio={studio} selection={selection} />;
            case 'VFX': return <VFXHub studio={studio} selection={selection} />;
            case 'Polish': return <ColorAudioStudio studio={studio} selection={selection} />;
            case 'Layout': return <LayoutToolkit studio={studio} selection={selection} />;
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
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Inspector</h2>
                 <nav className="mt-2 -mb-4 flex space-x-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 overflow-y-auto">
                {renderTabContent()}
            </div>
        </div>
    );
};

const AssetAndInspectorPanel: React.FC<AssetAndInspectorPanelProps> = ({ studio, selection, onAddClip, onDeleteClip }) => {
    return (
        <div className="bg-gray-800/50 h-full rounded-lg border border-gray-700 overflow-hidden">
            {selection ? (
                <Inspector selection={selection} studio={studio} onDeleteClip={onDeleteClip} />
            ) : (
                <AssetBrowser onAddClip={onAddClip} />
            )}
        </div>
    );
};

export default AssetAndInspectorPanel;