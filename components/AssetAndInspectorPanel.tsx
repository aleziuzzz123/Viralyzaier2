import React, { useState, useEffect, useCallback } from 'react';
import { Project, NormalizedStockAsset, BrandIdentity, ShotstackClipSelection } from '../types';
import { LayersIcon, PhotoIcon, MusicNoteIcon, PaintBrushIcon, SparklesIcon, SearchIcon, WandSparklesIcon, TypeIcon, TrashIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import { useAppContext } from '../contexts/AppContext';

// --- SUB-PANEL COMPONENTS ---

const InspectorPanelContent: React.FC<{ studio: any | null, selection: ShotstackClipSelection | null }> = ({ studio, selection }) => {
    const [clipData, setClipData] = useState<any | null>(null);

    useEffect(() => {
        setClipData(selection ? selection.clip : null);
    }, [selection]);

    const handleUpdate = (newProperties: Partial<any>) => {
        if (!studio || !selection || !clipData) return;
        const updatedAsset = { ...clipData.asset, ...newProperties };
        const updatedClip = { ...clipData, asset: updatedAsset };
        setClipData(updatedClip); // Optimistic update
        studio.updateClip(selection.trackIndex, selection.clipIndex, updatedClip);
    };

    const handleDelete = () => {
        if (!studio || !selection) return;
        studio.deleteClip(selection.trackIndex, selection.clipIndex);
    };

    const renderTextInspector = () => (
        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-gray-400">Text Content</label>
                <textarea value={clipData.asset.text || ''} onChange={(e) => handleUpdate({ text: e.target.value })} rows={4} className="w-full text-sm bg-gray-700/50 rounded p-2 mt-1 text-gray-200 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-400">Text Color</label>
                <input type="color" value={clipData.asset.color || '#FFFFFF'} onChange={(e) => handleUpdate({ color: e.target.value })} className="w-full h-10 mt-1 bg-transparent border-none rounded cursor-pointer"/>
            </div>
        </div>
    );

    const renderImageInspector = () => (
        <div className="space-y-4">
            <img src={clipData.asset.src} alt="Selected visual" className="w-full aspect-video rounded-md mt-1 bg-black object-contain"/>
            <button className="w-full py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg">Replace Image</button>
        </div>
    );

    const getIconForType = (type: string) => {
        switch (type) {
            case 'text': return <TypeIcon className="w-5 h-5" />;
            case 'image': return <PhotoIcon className="w-5 h-5" />;
            default: return <LayersIcon className="w-5 h-5" />;
        }
    };
    
    if (!selection || !clipData) {
        return <div className="p-4 text-center text-gray-500">Select a clip on the timeline to edit its properties.</div>;
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-900/50 rounded-md text-indigo-300">{getIconForType(clipData.asset.type)}</div>
                    <div>
                         <p className="text-sm font-bold text-white capitalize">{clipData.asset.type} Clip</p>
                         <p className="text-xs text-gray-400">Track {selection.trackIndex + 1}</p>
                    </div>
                </div>
                <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-400" title="Delete Clip">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
            {clipData.asset.type === 'text' && renderTextInspector()}
            {clipData.asset.type === 'image' && renderImageInspector()}
        </div>
    );
};

const MediaPanel: React.FC<{ onAddClip: (asset: any) => void, scriptText: string }> = ({ onAddClip, scriptText }) => {
    const [activeTab, setActiveTab] = useState<'ai' | 'video' | 'image' | 'sticker'>('ai');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<NormalizedStockAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<{ type: string; query?: string; prompt?: string} | null>(null);

    const handleSearch = useCallback(async (query: string, type: 'videos' | 'photos' | 'stickers') => {
        if (!query) return;
        setIsLoading(true); setResults([]);
        try {
            const assets = type === 'stickers' ? await geminiService.searchGiphy(query, 'stickers') : await geminiService.searchPexels(query, type);
            setResults(assets);
        } catch (e) { console.error("Search failed", e); } 
        finally { setIsLoading(false); }
    }, []);
    
    const handleAiSuggestion = useCallback(async () => {
        if (!scriptText) return;
        setIsLoading(true); setAiSuggestion(null);
        try {
            const suggestion = await geminiService.getAiBrollSuggestion(scriptText);
            setAiSuggestion(suggestion);
            if (suggestion.type === 'stock' && suggestion.query) {
                setSearchTerm(suggestion.query);
                setActiveTab('video');
                handleSearch(suggestion.query, 'videos');
            }
        } catch (e) { console.error(e); } 
        finally { setIsLoading(false); }
    }, [scriptText, handleSearch]);

    return (
        <div className="p-4 space-y-4">
            <div className="flex bg-gray-900/50 p-1 rounded-lg">
                <button onClick={() => setActiveTab('ai')} className={`flex-1 text-xs p-2 rounded-md font-semibold transition ${activeTab === 'ai' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>AI</button>
                <button onClick={() => setActiveTab('video')} className={`flex-1 text-xs p-2 rounded-md font-semibold transition ${activeTab === 'video' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>Video</button>
                <button onClick={() => setActiveTab('image')} className={`flex-1 text-xs p-2 rounded-md font-semibold transition ${activeTab === 'image' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>Image</button>
                <button onClick={() => setActiveTab('sticker')} className={`flex-1 text-xs p-2 rounded-md font-semibold transition ${activeTab === 'sticker' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>Stickers</button>
            </div>
            
            {activeTab === 'ai' && (
                <div className="text-center p-4">
                    <button onClick={handleAiSuggestion} disabled={isLoading} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-gray-600">
                        <WandSparklesIcon className="w-5 h-5"/>{isLoading ? 'Thinking...' : 'Suggest Visual'}
                    </button>
                    {aiSuggestion?.type === 'ai_video' && <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-900 rounded">AI recommends generating a custom video for this scene.</p>}
                </div>
            )}

            {activeTab !== 'ai' && (
                <div className="relative">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch(searchTerm, activeTab as any)} placeholder="Search for visuals..." className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 pl-10 text-white"/>
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"/>
                </div>
            )}
            
            <div className="h-[calc(100vh-450px)] overflow-y-auto pr-2">
                {isLoading && <p className="text-center text-gray-400">Loading...</p>}
                <div className="grid grid-cols-2 gap-2">
                    {results.map(asset => (
                        <div key={asset.id} className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group" onClick={() => onAddClip({ type: asset.type, url: asset.downloadUrl, duration: asset.duration })}>
                            <img src={asset.previewImageUrl} alt={asset.description} className="w-full h-full object-cover"/>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><p className="text-white text-xs font-bold text-center">Add to Scene</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AudioPanel: React.FC<{ onAddClip: (asset: any) => void }> = ({ onAddClip }) => {
    // Placeholder - implement music search and add to timeline
    return <div className="p-4 text-gray-400 text-sm">Background music and SFX coming soon.</div>;
};

const BrandPanel: React.FC = () => {
    const { brandIdentities } = useAppContext();
    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-bold text-white">Brand Kit</h3>
            <select className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                <option value="">Select a Brand Identity</option>
                {brandIdentities.map((brand: BrandIdentity) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface AssetAndInspectorPanelProps {
    project: Project;
    studio: any | null;
    selection: ShotstackClipSelection | null;
    activeSceneIndex: number;
    onAddClip: (asset: { type: 'video' | 'image' | 'audio', url: string, duration?: number }) => void;
}

type Tab = 'Inspector' | 'Media' | 'Audio' | 'Brand';

const AssetAndInspectorPanel: React.FC<AssetAndInspectorPanelProps> = ({ project, studio, selection, activeSceneIndex, onAddClip }) => {
    const [activeTab, setActiveTab] = useState<Tab>('Media');

    const renderActiveTab = () => {
        const currentSceneScript = project.script?.scenes[activeSceneIndex]?.visual || '';
        switch(activeTab) {
            case 'Inspector': return <InspectorPanelContent studio={studio} selection={selection} />;
            case 'Media': return <MediaPanel onAddClip={onAddClip} scriptText={currentSceneScript} />;
            case 'Audio': return <AudioPanel onAddClip={onAddClip} />;
            case 'Brand': return <BrandPanel />;
            default: return null;
        }
    };

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