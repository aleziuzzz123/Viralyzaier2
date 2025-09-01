import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Project, Script, Scene } from '../types';
import { invokeEdgeFunction } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { SparklesIcon } from './Icons';

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
            if (type === 'hook') {
                // Regenerate hooks using OpenAI
                const response = await invokeEdgeFunction('openai-proxy', {
                    type: 'generateContent',
                    params: {
                        model: 'gpt-4o',
                        contents: `Generate 3 engaging hooks for a video about "${project.topic}". Each hook should be 1-2 sentences and designed to capture attention immediately. Make them diverse and compelling.`,
                        config: {
                            systemInstruction: 'You are a viral video expert. Generate hooks that are attention-grabbing, emotional, and designed to make viewers want to watch more. Return only the hooks, one per line.'
                        }
                    }
                });

                if (response.text) {
                    const newHooks = response.text.split('\n').filter(hook => hook.trim()).slice(0, 3);
                    setEditedScript({ ...editedScript, hooks: newHooks });
                    addToast('Hooks regenerated successfully!', 'success');
                }
            } else if (type === 'moodboard') {
                // Regenerate moodboard images
                const imagePromises = Array.from({ length: 4 }, (_, index) => 
                    invokeEdgeFunction('openai-proxy', {
                        type: 'generateImages',
                        params: {
                            prompt: `Create a vibrant, engaging visual for a video about "${project.topic}". Style: modern, colorful, dynamic. Aspect ratio: 16:9.`,
                            config: {
                                numberOfImages: 1,
                                aspectRatio: '16:9'
                            }
                        }
                    })
                );

                const imageResponses = await Promise.all(imagePromises);
                const newMoodboardUrls = imageResponses
                    .filter(response => response.generatedImages && response.generatedImages.length > 0)
                    .map(response => `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`);

                if (newMoodboardUrls.length > 0) {
                    // Upload images to Supabase storage and get URLs
                    const uploadedUrls = [];
                    for (let i = 0; i < newMoodboardUrls.length; i++) {
                        const base64Data = newMoodboardUrls[i].split(',')[1];
                        const fileName = `moodboard_${i}_${Date.now()}.png`;
                        const filePath = `${project.userId}/${project.id}/${fileName}`;
                        
                        const { data, error } = await supabase.storage
                            .from('assets')
                            .upload(filePath, Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)), {
                                contentType: 'image/png',
                                upsert: true
                            });
                        
                        if (!error && data) {
                            const { data: urlData } = supabase.storage
                                .from('assets')
                                .getPublicUrl(filePath);
                            uploadedUrls.push(urlData.publicUrl);
                        }
                    }
                    
                    if (uploadedUrls.length > 0) {
                        await handleUpdateProject(project.id, { moodboard: uploadedUrls });
                        addToast('Moodboard regenerated successfully!', 'success');
                    }
                }
            } else if (type === 'scene' && sceneIndex !== undefined) {
                // Regenerate specific scene
                const scene = editedScript.scenes[sceneIndex];
                const response = await invokeEdgeFunction('openai-proxy', {
                    type: 'generateContent',
                    params: {
                        model: 'gpt-4o',
                        contents: `Improve this video scene for "${project.topic}": Visual: "${scene.visual}", Voiceover: "${scene.voiceover}". Make it more engaging and viral-worthy.`,
                        config: {
                            systemInstruction: 'You are a viral video expert. Improve the visual description and voiceover to make them more engaging, emotional, and likely to go viral. Return as JSON with "visual" and "voiceover" fields.'
                        }
                    }
                });

                if (response.text) {
                    try {
                        const improvedScene = JSON.parse(response.text);
                        const updatedScenes = [...editedScript.scenes];
                        updatedScenes[sceneIndex] = {
                            ...updatedScenes[sceneIndex],
                            visual: improvedScene.visual || scene.visual,
                            voiceover: improvedScene.voiceover || scene.voiceover
                        };
                        setEditedScript({ ...editedScript, scenes: updatedScenes });
                        addToast('Scene regenerated successfully!', 'success');
                    } catch (parseError) {
                        console.error('Error parsing scene response:', parseError);
                        addToast('Failed to parse regenerated scene', 'error');
                    }
                }
            }
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

                    // Sanitize text content to avoid ElevenLabs issues
                    const sanitizedText = scene.voiceover
                        .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special characters
                        .replace(/\s+/g, ' ') // Normalize whitespace
                        .trim();

                    if (!sanitizedText || sanitizedText.length < 3) {
                        console.warn(`Scene ${index} has invalid text content, skipping:`, scene.voiceover);
                        return null;
                    }

                    // Retry logic for failed voiceovers
                    const maxRetries = 2; // Reduced retries to avoid long delays
                    let lastError = null;

                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        try {
                            console.log(`🎤 Generating voiceover for scene ${index} (attempt ${attempt}/${maxRetries}):`, {
                                originalText: scene.voiceover,
                                sanitizedText: sanitizedText,
                                textLength: sanitizedText.length,
                                voiceId
                            });
                            
                            const response = await invokeEdgeFunction('elevenlabs-proxy', {
                                type: 'tts',
                                text: sanitizedText,
                                voiceId
                            });
                            
                            console.log(`🎤 Voiceover response for scene ${index} (attempt ${attempt}):`, response);

                            if (response && response.audioUrl) {
                                return response.audioUrl;
                            } else {
                                console.error(`No audio URL returned for scene ${index} (attempt ${attempt}):`, response);
                                lastError = new Error(`No audio URL returned for scene ${index}`);
                            }
                        } catch (voiceError) {
                            console.error(`Error generating voiceover for scene ${index} (attempt ${attempt}):`, voiceError);
                            lastError = voiceError;
                            
                            // Check if it's a subscription error
                            const errorMessage = voiceError?.message || voiceError?.toString() || '';
                            if (errorMessage.includes('subscription') || errorMessage.includes('payment')) {
                                console.error('ElevenLabs subscription issue detected for scene', index);
                                // Don't retry subscription errors
                                break;
                            }
                            
                            // Wait before retrying (shorter delay)
                            if (attempt < maxRetries) {
                                const delay = 1000; // 1 second delay
                                console.log(`⏳ Waiting ${delay}ms before retry for scene ${index}...`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                        }
                    }
                    
                    // If all retries failed, log the final error but don't show toast for individual scenes
                    if (lastError) {
                        const errorMessage = lastError?.message || lastError?.toString() || '';
                        if (errorMessage.includes('subscription') || errorMessage.includes('payment')) {
                            console.error(`Scene ${index} failed with subscription issue:`, errorMessage);
                        }
                    }
                    
                    return null;
                });

                const voiceoverUrls = await Promise.all(voiceoverPromises);
                const validUrls = voiceoverUrls.filter(url => url !== null);
                const totalScenes = editedScript.scenes.length;
                const successCount = validUrls.length;
                
                if (validUrls.length > 0) {
                    // Convert array to object with string keys
                    const voiceoverUrlsObject: { [key: string]: string } = {};
                    validUrls.forEach((url, index) => {
                        if (url) {
                            voiceoverUrlsObject[index.toString()] = url;
                        }
                    });
                    
                    await handleUpdateProject(project.id, { 
                        voiceoverUrls: voiceoverUrlsObject,
                        voiceoverVoiceId: voiceId
                    });
                    
                    if (successCount === totalScenes) {
                        addToast('Voiceover updated with new narrator!', 'success');
                    } else {
                        addToast(`Voiceover updated! ${successCount}/${totalScenes} scenes generated successfully. You can still proceed to the editor.`, 'warning');
                    }
                } else {
                    // Still update the voice ID even if voiceovers failed
                    await handleUpdateProject(project.id, { 
                        voiceoverVoiceId: voiceId
                    });
                    addToast('Voiceover generation failed, but you can still proceed to the editor. Voiceovers can be added later.', 'warning');
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
            <div className="text-center py-20 px-6 bg-gray-800/50 rounded-2xl max-w-2xl mx-auto space-y-6 animate-fade-in">
                <h2 className="text-3xl font-bold text-white">Loading Your Blueprint</h2>
                <p className="text-gray-400">Preparing your content for review...</p>
            </div>
        );
    }

    return (
        <div className="text-center py-10 px-6 bg-gray-800/50 rounded-2xl max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-white mb-3">Review Your Blueprint</h2>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">Perfect your content before creating your video. Edit, regenerate, or customize any element below.</p>
            
            <div className="space-y-8 text-left">
                {/* Script Hook */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-white">Script Hook</h3>
                            <p className="text-gray-400 text-sm">Cost: 1 Credit per regeneration</p>
                        </div>
                        <button
                            onClick={() => regenerateContent('hook')}
                            disabled={isRegenerating === 'hook'}
                            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isRegenerating === 'hook' ? 'Regenerating...' : 'Regenerate Hook (1 Credit)'}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {(editedScript.hooks || []).map((hook, index) => (
                            <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                                <textarea
                                    value={hook}
                                    onChange={(e) => handleScriptChange('hooks', editedScript.hooks?.map((h, i) => i === index ? e.target.value : h) || [], index)}
                                    className="w-full bg-transparent text-white placeholder-gray-400 border-none resize-none focus:outline-none"
                                    rows={2}
                                    placeholder="Enter your hook here..."
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Video Scenes */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-white">Video Scenes</h3>
                            <p className="text-gray-400 text-sm">Cost: 1 Credit per scene regeneration</p>
                        </div>
                        <button
                            onClick={() => regenerateContent('scene')}
                            disabled={isRegenerating === 'scene'}
                            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isRegenerating === 'scene' ? 'Regenerating...' : 'Regenerate All Scenes (1 Credit)'}
                        </button>
                    </div>
                    <div className="space-y-6">
                        {editedScript.scenes?.map((scene, index) => (
                            <div key={index} className="bg-gray-700/50 p-6 rounded-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <h4 className="text-lg font-bold text-white">Scene {index + 1}</h4>
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-300 font-semibold mb-2">Visual Description</label>
                                        <textarea
                                            value={scene.visual}
                                            onChange={(e) => handleScriptChange('visual', e.target.value, index)}
                                            className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-indigo-500 resize-none"
                                            rows={3}
                                            placeholder="Describe the visual for this scene..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 font-semibold mb-2">Voiceover</label>
                                        <textarea
                                            value={scene.voiceover}
                                            onChange={(e) => handleScriptChange('voiceover', e.target.value, index)}
                                            className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-indigo-500 resize-none"
                                            rows={3}
                                            placeholder="Enter the voiceover text..."
                                        />
                                    </div>
                                </div>
                                
                                {scene.storyboardImageUrl && (
                                    <div className="mt-4">
                                        <label className="block text-gray-300 font-semibold mb-2">Storyboard Image</label>
                                        <img 
                                            src={scene.storyboardImageUrl} 
                                            alt={`Scene ${index + 1} storyboard`}
                                            className="w-full max-w-md h-32 object-cover rounded-lg border border-gray-600"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Voiceover Selection */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Voiceover Selection</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {voiceOptions.map((voice) => (
                            <div
                                key={voice.id}
                                onClick={() => handleVoiceChange(voice.id)}
                                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                                    selectedVoiceId === voice.id 
                                        ? 'bg-indigo-600 border-indigo-500' 
                                        : 'bg-gray-700/50 border-gray-700 hover:border-gray-600'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        selectedVoiceId === voice.id 
                                            ? 'bg-indigo-500' 
                                            : 'bg-gray-600'
                                    }`}>
                                        <span className="text-sm">🎵</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white text-sm">{voice.name}</h4>
                                        {selectedVoiceId === voice.id && (
                                            <span className="text-indigo-300 text-xs">✓ Selected</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-gray-400 text-xs">{voice.preview}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Moodboard */}
                {project.moodboard && project.moodboard.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Moodboard</h3>
                                <p className="text-gray-400 text-sm">Cost: 4 Credits for 4 new images</p>
                            </div>
                            <button
                                onClick={() => regenerateContent('moodboard')}
                                disabled={isRegenerating === 'moodboard'}
                                className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                            >
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                {isRegenerating === 'moodboard' ? 'Regenerating...' : 'Regenerate Images (4 Credits)'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {project.moodboard.map((imageUrl, index) => (
                                <div key={index} className="aspect-video rounded-lg overflow-hidden border border-gray-600">
                                    <img 
                                        src={imageUrl} 
                                        alt={`Moodboard ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Action Button - Centered like Build Your Blueprint */}
            <div className="text-center pt-8">
                <button 
                    onClick={handleSaveAndContinue}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    <SparklesIcon className="w-6 h-6 mr-3" />
                    {isSaving ? 'Saving...' : 'Save & Continue to Studio →'}
                </button>
            </div>

            {/* Footer Navigation */}
            <div className="flex justify-between items-center pt-4">
                <button 
                    onClick={onBack}
                    className="inline-flex items-center justify-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300"
                >
                    <span className="mr-2">←</span>
                    Back to Blueprint
                </button>
                
                <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-sm">Stage 3 of 6</span>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6].map((step) => (
                            <div
                                key={step}
                                className={`w-2 h-2 rounded-full ${
                                    step <= 3 ? 'bg-indigo-600' : 'bg-gray-600'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlueprintReview;