import React, { useState, useEffect, useCallback } from 'react';
import { Project, NormalizedStockAsset, BrandIdentity } from '../types';
import { LayersIcon, PhotoIcon, MusicNoteIcon, PaintBrushIcon, SparklesIcon, SearchIcon, WandSparklesIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import { getErrorMessage } from '../utils';
import { useAppContext } from '../contexts/AppContext';

// --- SUB-PANEL COMPONENTS (Defined in one file for simplicity) ---

// 1. Inspector Panel
const InspectorPanel = ({ selectedElement }: { selectedElement: any | null }) => {
    if (!selectedElement) {
        return <div className="p-4 text-gray-400 text-sm text-center">Select an element on the timeline or in the preview to see its properties here.</div>;
    }
    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-bold text-white">Inspector</h3>
            <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-xs text-gray-400">Selected Element Name</p>
                <p className="text-white font-semibold">{selectedElement.name}</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-xs text-gray-400">Type</p>
                <p className="text-white font-semibold">{selectedElement.type}</p>
            </div>
            <div className="text-gray-500 text-sm text-center pt-4">Detailed property controls coming soon.</div>
        </div>
    );
};

// 2. Media Panel
const MediaPanel = ({ onApplyVisual, scriptText }: { onApplyVisual: (url: string) => void, scriptText: string }) => {
    type MediaProvider = 'pexels' | 'pixabay';
    type MediaType = 'videos' | 'photos' | 'stickers';
    
    const [activeTab, setActiveTab] = useState<'ai' | 'video' | 'image' | 'sticker'>('ai');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<NormalizedStockAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<{ type: string; query?: string; prompt?: string} | null>(null);

    const handleSearch = useCallback(async (query: string, type: MediaType, provider: MediaProvider = 'pexels') => {
        if (!query) return;
        setIsLoading(true);
        setResults([]);
        try {
            let assets: NormalizedStockAsset[] = [];
            if (type === 'stickers') {
                assets = await geminiService.searchGiphy(query, 'stickers');
            } else {
                if (provider === 'pexels') {
                    assets = await geminiService.searchPexels(query, type);
                } else {
                    assets = await geminiService.searchPixabay(query, type);
                }
            }
            setResults(assets);
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            let mediaType: MediaType | null = null;
            if (activeTab === 'video') mediaType = 'videos';
            else if (activeTab === 'image') mediaType = 'photos';
            else if (activeTab === 'sticker') mediaType = 'stickers';

            if (mediaType) {
                handleSearch(searchTerm, mediaType);
            }
        }
    };

    const handleAiSuggestion = useCallback(async () => {
        if (!scriptText) return;
        setIsLoading(true);
        setAiSuggestion(null);
        try {
            const suggestion = await geminiService.getAiBrollSuggestion(scriptText);
            setAiSuggestion(suggestion);
            if (suggestion.type === 'stock' && suggestion.query) {
                setSearchTerm(suggestion.query);
                handleSearch(suggestion.query, 'videos');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [scriptText, handleSearch]);

    return (
        <div className="p-4 space-y-4">
            <div className="flex bg-gray-900/50 p-1 rounded-lg">
                <button onClick={() => setActiveTab('ai')} className={`flex-1 text-xs p-2 rounded-md font-semibold transition ${activeTab==='ai' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}>AI Suggestion</button>
                <button onClick={() => setActiveTab('video')} className={`flex-1 text-xs p-2 rounded-md font-semibold transition ${activeTab==='video' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}>Video</button>
                <button onClick={() => setActiveTab('image')} className={`flex-1 text-xs p-2 rounded-md font-semibold transition ${activeTab==='image' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}>Image</button>
                <button onClick={() => setActiveTab('sticker')} className={`flex-1 text-xs p-2 rounded-md font-semibold transition ${activeTab==='sticker' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}>Stickers</button>
            </div>
            
            {activeTab === 'ai' ? (
                <div className="text-center p-4">
                    <button onClick={handleAiSuggestion} disabled={isLoading} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-gray-600">
                        <WandSparklesIcon className="w-5 h-5"/>
                        {isLoading ? 'Thinking...' : 'Suggest Visual for this Scene'}
                    </button>
                    {aiSuggestion?.type === 'ai_video' && <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-900 rounded">AI recommends generating a custom video for this scene. (Generation coming soon)</p>}
                </div>
            ) : (
                <div className="relative">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyPress={handleKeyPress} placeholder="Search for visuals..." className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 pl-10 text-white"/>
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"/>
                </div>
            )}
            
            <div className="h-[calc(100vh-400px)] overflow-y-auto">
                {isLoading && <p className="text-center text-gray-400">Loading...</p>}
                <div className="grid grid-cols-2 gap-2">
                    {results.map(asset => (
                        <div key={asset.id} className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group" onClick={() => onApplyVisual(asset.downloadUrl)}>
                            <img src={asset.previewImageUrl} alt={asset.description} className="w-full h-full object-cover"/>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <p className="text-white text-xs font-bold text-center">Apply</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// 3. Audio Panel
const AudioPanel = ({ onModification }: { onModification: (key: string, value: any) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<NormalizedStockAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSearch = async () => {
        if (!searchTerm) return;
        setIsLoading(true);
        setResults([]);
        try {
            const assets = await geminiService.searchJamendoMusic(searchTerm);
            setResults(assets);
        } catch (e) {
            console.error("Music search failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyMusic = (url: string) => {
        // This key 'Background-Music' MUST match an element name in your Creatomate template.
        onModification('Background-Music', url);
    };

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-bold text-white">Background Music</h3>
            <div className="relative">
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()} placeholder="Search for music (e.g., 'upbeat corporate')" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 pl-10 text-white"/>
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"/>
            </div>
            <div className="h-[calc(100vh-400px)] overflow-y-auto">
                {isLoading && <p className="text-center text-gray-400">Searching...</p>}
                <ul className="space-y-2">
                    {results.map(asset => (
                        <li key={asset.id} className="bg-gray-900/50 p-2 rounded-lg flex items-center gap-3">
                            <img src={asset.previewImageUrl} alt={asset.description} className="w-12 h-12 rounded-md object-cover"/>
                            <div className="flex-grow">
                                <p className="text-sm text-white font-semibold truncate">{asset.description}</p>
                            </div>
                            <button onClick={() => handleApplyMusic(asset.downloadUrl)} className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-500">Add</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// 4. Brand Panel
const BrandPanel = ({ onBatchModification }: { onBatchModification: (mods: Record<string, any>) => void }) => {
    const { brandIdentities } = useAppContext();
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

    const selectedBrand = brandIdentities.find(b => b.id === selectedBrandId) || null;

    const applyBrand = () => {
        if (!selectedBrand) return;
        const modifications: Record<string, any> = {};
        // These keys (e.g., 'Primary-Color') MUST match dynamic elements in your Creatomate template.
        modifications['Primary-Color'] = selectedBrand.colorPalette.primary;
        modifications['Secondary-Color'] = selectedBrand.colorPalette.secondary;
        if(selectedBrand.logoUrl) {
            modifications['Brand-Logo'] = selectedBrand.logoUrl;
        }
        onBatchModification(modifications);
    };

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-bold text-white">Brand Kit</h3>
            <select value={selectedBrandId || ''} onChange={e => setSelectedBrandId(e.target.value)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                <option value="">Select a Brand Identity</option>
                {brandIdentities.map((brand: BrandIdentity) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
            {selectedBrand && (
                <div className="space-y-4 pt-4 border-t border-gray-700">
                    <div className="flex justify-around">
                        <div className="text-center"><div style={{backgroundColor: selectedBrand.colorPalette.primary}} className="w-10 h-10 rounded-full mx-auto border-2 border-white/20"></div><p className="text-xs mt-1">Primary</p></div>
                        <div className="text-center"><div style={{backgroundColor: selectedBrand.colorPalette.secondary}} className="w-10 h-10 rounded-full mx-auto border-2 border-white/20"></div><p className="text-xs mt-1">Secondary</p></div>
                        <div className="text-center"><div style={{backgroundColor: selectedBrand.colorPalette.accent}} className="w-10 h-10 rounded-full mx-auto border-2 border-white/20"></div><p className="text-xs mt-1">Accent</p></div>
                    </div>
                    {selectedBrand.logoUrl && <img src={selectedBrand.logoUrl} alt="logo" className="max-h-20 mx-auto bg-white/10 p-2 rounded-lg"/>}
                    <button onClick={applyBrand} className="w-full p-2 bg-indigo-600 rounded-lg text-white font-semibold">Apply Brand to Video</button>
                </div>
            )}
        </div>
    );
};


// --- MAIN COMPONENT ---

interface AssetAndInspectorPanelProps {
    project: Project;
    selectedElement: any | null;
    onModification: (key: string, value: any) => void;
    onBatchModification: (mods: Record<string, any>) => void;
    onApplyVisual: (url: string) => void;
    activeSceneIndex: number;
    player: any | null;
}

type Tab = 'Inspector' | 'Media' | 'Audio' | 'Brand';

const AssetAndInspectorPanel: React.FC<AssetAndInspectorPanelProps> = ({ 
    project, selectedElement, onModification, onBatchModification, onApplyVisual, activeSceneIndex 
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('Media');

    const renderActiveTab = () => {
        const currentSceneScript = project.script?.scenes[activeSceneIndex]?.visual || '';
        switch(activeTab) {
            case 'Inspector':
                return <InspectorPanel selectedElement={selectedElement} />;
            case 'Media':
                return <MediaPanel onApplyVisual={onApplyVisual} scriptText={currentSceneScript} />;
            case 'Audio':
                 return <AudioPanel onModification={onModification} />;
            case 'Brand':
                 return <BrandPanel onBatchModification={onBatchModification} />;
            default:
                return null;
        }
    }

    const tabs: { id: Tab, icon: React.FC<{className?:string}> }[] = [
        { id: 'Inspector', icon: LayersIcon },
        { id: 'Media', icon: PhotoIcon },
        { id: 'Audio', icon: MusicNoteIcon },
        { id: 'Brand', icon: PaintBrushIcon },
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-gray-700/50 flex justify-around">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                        title={tab.id}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="hidden lg:inline">{tab.id}</span>
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
