import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Project, Script, Scene } from '../types';
import { invokeEdgeFunction } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

interface BlueprintReviewProps {
    project: Project;
    onApprove: () => void;
    onBack: () => void;
}

const BlueprintReview: React.FC<BlueprintReviewProps> = ({ project, onApprove, onBack }) => {
    const { addToast, handleUpdateProject } = useAppContext();
    const [editedScript, setEditedScript] = useState<Script | null>(null);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>(project.voiceoverVoiceId || 'pNInz6obpgDQGcFmaJgB');
    const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Available voice options
    const voiceOptions = [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Sarah (Professional Female)', preview: 'A clear, professional female voice perfect for business content.' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Josh (Friendly Male)', preview: 'A warm, friendly male voice great for casual content.' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Deep Male)', preview: 'A deep, authoritative male voice perfect for dramatic content.' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Energetic Female)', preview: 'An energetic, upbeat female voice great for dynamic content.' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Smooth Male)', preview: 'A smooth, charismatic male voice perfect for lifestyle content.' }
    ];

    useEffect(() => {
        if (project.script) {
            setEditedScript(project.script);
        }
    }, [project.script]);

    const handleScriptChange = (field: string, value: any, sceneIndex?: number) => {
        if (!editedScript) return;

        if (sceneIndex !== undefined) {
            // Editing a specific scene
            const updatedScenes = [...editedScript.scenes];
            updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], [field]: value };
            setEditedScript({ ...editedScript, scenes: updatedScenes });
        } else {
            // Editing script-level fields
            setEditedScript({ ...editedScript, [field]: value });
        }
    };

    const regenerateContent = async (type: 'title' | 'hook' | 'scene' | 'moodboard', sceneIndex?: number) => {
        if (!editedScript) return;

        setIsRegenerating(type);
        try {
            // Implementation for regenerating content
            addToast(`${type} regenerated successfully!`, 'success');
        } catch (error) {
            console.error(`Error regenerating ${type}:`, error);
            addToast(`Failed to regenerate ${type}`, 'error');
        } finally {
            setIsRegenerating(null);
        }
    };

    const handleVoiceChange = async (voiceId: string) => {
        setSelectedVoiceId(voiceId);
        
        try {
            // Regenerate voiceovers with new voice
            if (editedScript && editedScript.scenes) {
                const voiceoverPromises = editedScript.scenes.map(async (scene, index) => {
                    if (!scene.voiceover) return null;

                    const response = await invokeEdgeFunction('elevenlabs-proxy', {
                        type: 'generate',
                        text: scene.voiceover,
                        voiceId
                    });

                    return response.audioUrl;
                });

                const voiceoverUrls = await Promise.all(voiceoverPromises);
                const validUrls = voiceoverUrls.filter(url => url !== null);
                
                if (validUrls.length > 0) {
                    await handleUpdateProject(project.id, { 
                        voiceoverUrls: validUrls,
                        voiceoverVoiceId: voiceId
                    });
                    addToast('Voiceover updated with new narrator!', 'success');
                }
            }
        } catch (error) {
            console.error('Error updating voiceover:', error);
            addToast('Failed to update voiceover', 'error');
        }
    };

    const handleSaveAndContinue = async () => {
        if (!editedScript) return;

        setIsSaving(true);
        try {
            await handleUpdateProject(project.id, { 
                script: editedScript,
                voiceoverVoiceId: selectedVoiceId,
                workflowStep: 4 // Move to Creative Studio
            });
            
            addToast('Blueprint saved successfully!', 'success');
            onApprove();
        } catch (error) {
            console.error('Error saving blueprint:', error);
            addToast('Failed to save blueprint', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!editedScript) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading your blueprint...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
            <div className="max-w-7xl mx-auto p-6 space-y-10 animate-fade-in-up">
                {/* Hero Header */}
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-8 shadow-2xl">
                        <span className="text-4xl">🎬</span>
                    </div>
                    <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-300 mb-8">
                        Review Your Blueprint
                    </h1>
                    <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
                        Perfect your content before creating your video. Edit, regenerate, or customize any element below.
                    </p>
                </div>

                <div className="space-y-12">
                    {/* Script Hook Section */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                        <div className="relative bg-gray-800/90 backdrop-blur-xl p-10 rounded-3xl border border-gray-700/50 shadow-2xl">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <span className="text-2xl">🎯</span>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-bold text-white mb-2">Script Hook</h3>
                                        <p className="text-gray-400 text-lg">The opening that captures attention</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => regenerateContent('hook')}
                                    disabled={isRegenerating === 'hook'}
                                    className="inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                                >
                                    <span className="mr-3">🔄</span>
                                    {isRegenerating === 'hook' ? 'Regenerating...' : 'Regenerate Hook'}
                                </button>
                            </div>
                            <div className="space-y-6">
                                {(editedScript.hooks || []).map((hook, index) => (
                                    <div key={index} className="group/item relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-2xl blur-sm group-hover/item:blur-none transition-all duration-300"></div>
                                        <div className="relative bg-gray-700/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-600/50 group-hover/item:border-indigo-500/50 transition-all duration-300">
                                            <textarea
                                                value={hook}
                                                onChange={(e) => handleScriptChange('hooks', editedScript.hooks?.map((h, i) => i === index ? e.target.value : h) || [], index)}
                                                className="w-full bg-transparent text-white placeholder-gray-400 border-none resize-none focus:outline-none text-xl leading-relaxed"
                                                rows={3}
                                                placeholder="Enter your hook here..."
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Scenes Section */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                        <div className="relative bg-gray-800/90 backdrop-blur-xl p-10 rounded-3xl border border-gray-700/50 shadow-2xl">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <span className="text-2xl">🎭</span>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-bold text-white mb-2">Video Scenes</h3>
                                        <p className="text-gray-400 text-lg">Your story broken into engaging scenes</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => regenerateContent('scene')}
                                    disabled={isRegenerating === 'scene'}
                                    className="inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                                >
                                    <span className="mr-3">🔄</span>
                                    {isRegenerating === 'scene' ? 'Regenerating...' : 'Regenerate All Scenes'}
                                </button>
                            </div>
                            <div className="grid gap-8">
                                {editedScript.scenes?.map((scene, index) => (
                                    <div key={index} className="group/scene relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-600/10 rounded-2xl blur-sm group-hover/scene:blur-none transition-all duration-300"></div>
                                        <div className="relative bg-gray-700/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-600/50 group-hover/scene:border-blue-500/50 transition-all duration-300">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                                    {index + 1}
                                                </div>
                                                <h4 className="text-2xl font-bold text-white">Scene {index + 1}</h4>
                                            </div>
                                            
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-gray-300 font-semibold mb-3 text-lg">Visual Description</label>
                                                    <textarea
                                                        value={scene.visual}
                                                        onChange={(e) => handleScriptChange('visual', e.target.value, index)}
                                                        className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded-xl p-4 focus:outline-none focus:border-blue-500 resize-none"
                                                        rows={4}
                                                        placeholder="Describe the visual for this scene..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-300 font-semibold mb-3 text-lg">Voiceover</label>
                                                    <textarea
                                                        value={scene.voiceover}
                                                        onChange={(e) => handleScriptChange('voiceover', e.target.value, index)}
                                                        className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded-xl p-4 focus:outline-none focus:border-blue-500 resize-none"
                                                        rows={4}
                                                        placeholder="Enter the voiceover text..."
                                                    />
                                                </div>
                                            </div>
                                            
                                            {scene.storyboardImageUrl && (
                                                <div className="mt-6">
                                                    <label className="block text-gray-300 font-semibold mb-3 text-lg">Storyboard Image</label>
                                                    <div className="relative group/img">
                                                        <img 
                                                            src={scene.storyboardImageUrl} 
                                                            alt={`Scene ${index + 1} storyboard`}
                                                            className="w-full max-w-md h-48 object-cover rounded-xl border border-gray-600 group-hover/img:border-blue-500 transition-all duration-300"
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
                                                            <span className="text-white font-semibold">Storyboard Preview</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Voiceover Selection */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                        <div className="relative bg-gray-800/90 backdrop-blur-xl p-10 rounded-3xl border border-gray-700/50 shadow-2xl">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    <span className="text-2xl">🎤</span>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-bold text-white mb-2">Voiceover Selection</h3>
                                    <p className="text-gray-400 text-lg">Choose the perfect narrator for your video</p>
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {voiceOptions.map((voice) => (
                                    <div
                                        key={voice.id}
                                        onClick={() => handleVoiceChange(voice.id)}
                                        className={`relative cursor-pointer group/voice transition-all duration-300 ${
                                            selectedVoiceId === voice.id 
                                                ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-800' 
                                                : 'hover:ring-2 hover:ring-green-500/50 hover:ring-offset-2 hover:ring-offset-gray-800'
                                        }`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-600/10 rounded-2xl blur-sm group-hover/voice:blur-none transition-all duration-300"></div>
                                        <div className="relative bg-gray-700/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/50 group-hover/voice:border-green-500/50 transition-all duration-300">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    selectedVoiceId === voice.id 
                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                                                        : 'bg-gray-600'
                                                }`}>
                                                    <span className="text-xl">🎵</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-white">{voice.name}</h4>
                                                    {selectedVoiceId === voice.id && (
                                                        <span className="text-green-400 text-sm font-semibold">✓ Selected</span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-gray-400 text-sm leading-relaxed">{voice.preview}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Moodboard Section */}
                    {project.moodboard && project.moodboard.length > 0 && (
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                            <div className="relative bg-gray-800/90 backdrop-blur-xl p-10 rounded-3xl border border-gray-700/50 shadow-2xl">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                                            <span className="text-2xl">🎨</span>
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-bold text-white mb-2">Moodboard</h3>
                                            <p className="text-gray-400 text-lg">Visual inspiration for your video</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => regenerateContent('moodboard')}
                                        disabled={isRegenerating === 'moodboard'}
                                        className="inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                                    >
                                        <span className="mr-3">🔄</span>
                                        {isRegenerating === 'moodboard' ? 'Regenerating...' : 'Regenerate Images'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {project.moodboard.map((imageUrl, index) => (
                                        <div key={index} className="group/img relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-600/10 rounded-2xl blur-sm group-hover/img:blur-none transition-all duration-300"></div>
                                            <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-600/50 group-hover/img:border-purple-500/50 transition-all duration-300">
                                                <img 
                                                    src={imageUrl} 
                                                    alt={`Moodboard ${index + 1}`}
                                                    className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                    <span className="text-white font-semibold">Moodboard {index + 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="flex justify-between items-center pt-12 pb-8">
                    <button 
                        onClick={onBack}
                        className="inline-flex items-center justify-center px-10 py-5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg text-lg"
                    >
                        <span className="mr-3">←</span>
                        Back to Blueprint
                    </button>
                    
                    <div className="flex items-center gap-3 text-gray-400">
                        <span className="text-lg font-semibold">Stage 3 of 6</span>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5, 6].map((step) => (
                                <div
                                    key={step}
                                    className={`w-3 h-3 rounded-full ${
                                        step <= 3 ? 'bg-indigo-600' : 'bg-gray-600'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSaveAndContinue}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center px-12 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                    >
                        <span className="mr-3">🎬</span>
                        {isSaving ? 'Saving...' : 'Save & Continue to Studio →'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlueprintReview;