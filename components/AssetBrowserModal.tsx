import React, { useState, useCallback } from 'react';
import { NormalizedStockAsset, Project, User } from '../types';
import { SearchIcon, SparklesIcon, XCircleIcon, UploadIcon } from './Icons';
// FIX: Import search functions from their respective services instead of geminiService
import { searchPexels } from '../services/pexelsService';
import { searchJamendoMusic } from '../services/jamendoService';
import { searchGiphy } from '../services/giphyService';
import { generateAiImage } from '../services/generativeMediaService';
import * as supabase from '../services/supabaseService';
import { v4 as uuidv4 } from 'uuid';

type AssetType = 'Video' | 'Image' | 'Music' | 'Stickers' | 'AI' | 'Upload';

interface AiAssetGeneratorProps {
    project: Project | null;
    onAddClip: (type: 'image', url: string) => void;
    addToast: (message: string, type: 'info' | 'success' | 'error') => void;
    lockAndExecute: <T>(asyncFunction: () => Promise<T>) => Promise<T | undefined>;
}

const AiAssetGenerator: React.FC<AiAssetGeneratorProps> = ({ project, onAddClip, addToast, lockAndExecute }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = () => lockAndExecute(async () => {
        if (!prompt.trim() || !project) {
            addToast("Please enter a prompt and ensure a project is active.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const imageUrl = await generateAiImage(prompt, project.platform, project.id);
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

const Uploader: React.FC<{
    onAddClip: (assetType: 'video' | 'image' | 'audio', url: string, name: string) => void;
    project: Project | null;
    session: any | null;
    addToast: (message: string, type: 'info' | 'success' | 'error') => void;
}> = ({ onAddClip, project, session, addToast }) => {
    
    const inferType = (file: File): "image"|"video"|"audio" => {
        if (file.type.startsWith("image/")) return "image";
        if (file.type.startsWith("video/")) return "video";
        return "audio";
    }

    const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!session || !project) {
            addToast("Cannot upload file: user session or project is missing.", "error");
            return;
        }

        for (const f of files) {
            addToast(`Uploading ${f.name}...`, 'info');
            try {
                const path = `${session.user.id}/${project.id}/uploads/${uuidv4()}_${f.name}`;
                const publicUrl = await supabase.uploadFile(f, path, f.type);
                const type = inferType(f);
                onAddClip(type, publicUrl, f.name);
            } catch (err) {
                addToast(`Failed to upload ${f.name}: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
            }
        }
    };

    return (
        <div className="p-4 flex flex-col items-center justify-center h-full">
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700/50 w-full h-full">
                <UploadIcon className="w-12 h-12 text-gray-500 mb-4" />
                <span className="font-semibold text-white">Click to upload</span>
                <span className="text-sm text-gray-400">or drag and drop files</span>
                <input type="file" multiple style={{display:"none"}} onChange={onPickFiles} accept="image/*,video/*,audio/*"/>
            </label>
        </div>
    );
}

interface AssetBrowserModalProps {
    project: Project | null;
    session: any | null;
    onClose: () => void;
    onAddClip: (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => void;
    addToast: (message: string, type: 'info' | 'success' | 'error') => void;
    lockAndExecute: <T>(asyncFunction: () => Promise<T>) => Promise<T | undefined>;
}

const AssetBrowserModal: React.FC<AssetBrowserModalProps> = ({ project, session, onClose, onAddClip, addToast, lockAndExecute }) => {
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
                case 'Video': searchResults = await searchPexels(searchTerm, 'videos'); break;
                case 'Image': searchResults = await searchPexels(searchTerm, 'photos'); break;
                case 'Music': searchResults = await searchJamendoMusic(searchTerm); break;
                case 'Stickers': searchResults = await searchGiphy(searchTerm, 'stickers'); break;
            }
            setResults(searchResults);
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Failed to search assets.', 'error');
        } finally {
            setIsLoading(false);
        }
    }), [searchTerm, activeTab, lockAndExecute, addToast]);
    
    const handleLocalFileAdd = (assetType: "image" | "video" | "audio", url: string, name: string) => {
        onAddClip(assetType, url);
        addToast(`Added ${name} to timeline`, 'success');
        onClose();
    };

    const tabs: AssetType[] = ['Video', 'Image', 'Music', 'Stickers', 'AI', 'Upload'];

    const renderContent = () => {
        if (activeTab === 'AI') return <AiAssetGenerator project={project} onAddClip={onAddClip} addToast={addToast} lockAndExecute={lockAndExecute} />;
        if (activeTab === 'Upload') return <Uploader onAddClip={handleLocalFileAdd} project={project} session={session} addToast={addToast} />;

        return (
            <div className="p-4">
                {isLoading && <p className="text-center text-gray-400">Loading...</p>}
                <div className="grid grid-cols-3 gap-4">
                    {results.map(asset => (
                        <div key={asset.id} className="group relative cursor-pointer aspect-video" onClick={() => { onAddClip(asset.type, asset.downloadUrl); onClose(); }}>
                            <img src={asset.previewImageUrl} alt={asset.description} className="w-full h-full object-cover rounded-md bg-black" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white text-xs text-center p-1">{asset.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Asset Browser</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="w-6 h-6" /></button>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    <aside className="w-48 flex-shrink-0 bg-gray-900/50 p-2">
                        <nav className="flex flex-col gap-1">
                            {tabs.map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-md ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <main className="flex-1 flex flex-col">
                        {(activeTab !== 'AI' && activeTab !== 'Upload') && (
                            <div className="flex-shrink-0 p-4 border-b border-gray-700">
                                <div className="flex items-center gap-2">
                                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} placeholder={`Search for ${activeTab}...`} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <button onClick={handleSearch} disabled={isLoading} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:bg-gray-600"><SearchIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        )}
                        <div className="flex-grow overflow-y-auto">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AssetBrowserModal;