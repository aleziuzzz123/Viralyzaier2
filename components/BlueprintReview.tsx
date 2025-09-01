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
    const [voiceoverProgress, setVoiceoverProgress] = useState<{ current: number; total: number } | null>(null);

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

                if ((response as any).text) {
                    const newHooks = (response as any).text.split('\n').filter((hook: string) => hook.trim()).slice(0, 3);
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
                    .filter((response: any) => response.generatedImages && response.generatedImages.length > 0)
                    .map((response: any) => `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`);

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

                if ((response as any).text) {
                    try {
                        const improvedScene = JSON.parse((response as any).text);
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
            // Regenerate voiceovers with new voice - SEQUENTIALLY to avoid rate limiting
            if (editedScript && editedScript.scenes) {
                const voiceoverUrls: (string | null)[] = [];
                const totalScenes = editedScript.scenes.length;
                
                // Set initial progress
                setVoiceoverProgress({ current: 0, total: totalScenes });
                
                console.log(`🎤 Starting sequential voiceover generation for ${totalScenes} scenes...`);
                
                for (let index = 0; index < editedScript.scenes.length; index++) {
                    const scene = editedScript.scenes[index];
                    
                    // Update progress
                    setVoiceoverProgress({ current: index + 1, total: totalScenes });
                    
                    if (!scene.voiceover) {
                        console.log(`⏭️ Skipping scene ${index + 1}/${totalScenes} - no voiceover text`);
                        voiceoverUrls.push(null);
                        continue;
                    }

                    // Sanitize text content to avoid ElevenLabs issues
                    const sanitizedText = scene.voiceover
                        .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special characters
                        .replace(/\s+/g, ' ') // Normalize whitespace
                        .trim();

                    if (!sanitizedText || sanitizedText.length < 3) {
                        console.warn(`Scene ${index + 1}/${totalScenes} has invalid text content, skipping:`, scene.voiceover);
                        voiceoverUrls.push(null);
                        continue;
                    }

                    // Additional debugging for scene 3 specifically
                    if (index === 3) {
                        console.log(`🔍 SCENE 3 DEBUG:`, {
                            originalText: scene.voiceover,
                            sanitizedText: sanitizedText,
                            originalLength: scene.voiceover.length,
                            sanitizedLength: sanitizedText.length,
                            hasSpecialChars: /[^\w\s.,!?;:'"()-]/.test(scene.voiceover),
                            voiceId
                        });
                    }

                    // Retry logic for failed voiceovers
                    const maxRetries = 2;
                    let lastError = null;
                    let success = false;

                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        try {
                            console.log(`🎤 Generating voiceover for scene ${index + 1}/${totalScenes} (attempt ${attempt}/${maxRetries}):`, {
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
                            
                            console.log(`🎤 Voiceover response for scene ${index + 1}/${totalScenes} (attempt ${attempt}):`, response);

                            if (response && (response as any).audioUrl) {
                                voiceoverUrls.push((response as any).audioUrl);
                                success = true;
                                console.log(`✅ Successfully generated voiceover for scene ${index + 1}/${totalScenes}`);
                                break;
                            } else {
                                console.error(`No audio URL returned for scene ${index + 1}/${totalScenes} (attempt ${attempt}):`, response);
                                lastError = new Error(`No audio URL returned for scene ${index + 1}`);
                            }
                        } catch (voiceError) {
                            console.error(`Error generating voiceover for scene ${index + 1}/${totalScenes} (attempt ${attempt}):`, voiceError);
                            lastError = voiceError;
                            
                            // Check if it's a subscription error
                            const errorMessage = voiceError?.message || voiceError?.toString() || '';
                            if (errorMessage.includes('subscription') || errorMessage.includes('payment')) {
                                console.error('ElevenLabs subscription issue detected for scene', index + 1);
                                // Don't retry subscription errors
                                break;
                            }
                            
                            // Wait before retrying
                            if (attempt < maxRetries) {
                                const delay = 2000; // 2 second delay between retries
                                console.log(`⏳ Waiting ${delay}ms before retry for scene ${index + 1}/${totalScenes}...`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                        }
                    }
                    
                    // If all retries failed, log the final error
                    if (!success) {
                        voiceoverUrls.push(null);
                        if (lastError) {
                            const errorMessage = lastError?.message || lastError?.toString() || '';
                            if (errorMessage.includes('subscription') || errorMessage.includes('payment')) {
                                console.error(`Scene ${index + 1}/${totalScenes} failed with subscription issue:`, errorMessage);
                            }
                        }
                    }
                    
                    // Add delay between scenes to avoid rate limiting (except for the last scene)
                    if (index < editedScript.scenes.length - 1) {
                        const delayBetweenScenes = 3000; // 3 second delay between scenes
                        console.log(`⏳ Waiting ${delayBetweenScenes}ms before processing next scene...`);
                        await new Promise(resolve => setTimeout(resolve, delayBetweenScenes));
                    }
                }
                
                console.log(`🎤 Completed sequential voiceover generation. Results: ${voiceoverUrls.filter(url => url !== null).length}/${totalScenes} successful`);
                
                // Clear progress
                setVoiceoverProgress(null);
                
                const validUrls = voiceoverUrls.filter(url => url !== null);
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
                        addToast(`Voiceover updated! ${successCount}/${totalScenes} scenes generated successfully. You can still proceed to the editor.`, 'info');
                    }
                } else {
                    // Still update the voice ID even if voiceovers failed
                    await handleUpdateProject(project.id, { 
                        voiceoverVoiceId: voiceId
                    });
                    addToast('Voiceover generation failed, but you can still proceed to the editor. Voiceovers can be added later.', 'info');
                }
            }
        } catch (error) {
            console.error('Error updating voiceover:', error);
            addToast('Failed to update voiceover', 'error');
            setVoiceoverProgress(null); // Clear progress on error
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
        <div className="text-center py-8 px-6 bg-gray-800/50 rounded-2xl max-w-5xl mx-auto space-y-6 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-white mb-2">Review Your Blueprint</h2>
            <p className="text-gray-400 mb-4 max-w-xl mx-auto">Perfect your content before creating your video.</p>
            
            <div className="space-y-6 text-left">
                {/* Script Hooks - 3 Options */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-lg font-bold text-white">Choose Your Hook</h3>
                            <p className="text-gray-400 text-sm">Select the best hook or regenerate new ones</p>
                        </div>
                        <button
                            onClick={() => regenerateContent('hook')}
                            disabled={isRegenerating === 'hook'}
                            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300"
                        >
                            <SparklesIcon className="w-4 h-4 mr-2" />
                            {isRegenerating === 'hook' ? 'Generating...' : 'New Hooks (1 Credit)'}
                        </button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                        {(editedScript.hooks || []).slice(0, 3).map((hook, index) => (
                            <div key={index} className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 hover:border-indigo-500 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400 font-semibold">Hook {index + 1}</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                const newHooks = [...(editedScript.hooks || [])];
                                                newHooks[index] = prompt('Edit hook:', hook) || hook;
                                                handleScriptChange('hooks', newHooks);
                                            }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newHooks = [...(editedScript.hooks || [])];
                                                newHooks.splice(index, 1);
                                                handleScriptChange('hooks', newHooks);
                                            }}
                                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <p className="text-white text-sm leading-relaxed">{hook}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Video Scenes - Compact View */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-lg font-bold text-white">Video Scenes</h3>
                            <p className="text-gray-400 text-sm">Edit scenes or regenerate all</p>
                        </div>
                        <button
                            onClick={() => regenerateContent('scene')}
                            disabled={isRegenerating === 'scene'}
                            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300"
                        >
                            <SparklesIcon className="w-4 h-4 mr-2" />
                            {isRegenerating === 'scene' ? 'Regenerating...' : 'New Scenes (1 Credit)'}
                        </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {editedScript.scenes?.map((scene, index) => (
                            <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">
                                        {index + 1}
                                    </div>
                                    <h4 className="text-sm font-bold text-white">Scene {index + 1}</h4>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-gray-300 text-xs font-semibold mb-1">Visual</label>
                                        <textarea
                                            value={scene.visual}
                                            onChange={(e) => handleScriptChange('visual', e.target.value, index)}
                                            className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded p-2 focus:outline-none focus:border-indigo-500 resize-none text-sm"
                                            rows={2}
                                            placeholder="Visual description..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-xs font-semibold mb-1">Voiceover</label>
                                        <textarea
                                            value={scene.voiceover}
                                            onChange={(e) => handleScriptChange('voiceover', e.target.value, index)}
                                            className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded p-2 focus:outline-none focus:border-indigo-500 resize-none text-sm"
                                            rows={2}
                                            placeholder="Voiceover text..."
                                        />
                                    </div>
                                    
                                    {scene.storyboardImageUrl && (
                                        <div>
                                            <label className="block text-gray-300 text-xs font-semibold mb-1">Storyboard</label>
                                            <img 
                                                src={scene.storyboardImageUrl} 
                                                alt={`Scene ${index + 1} storyboard`}
                                                className="w-full h-24 object-cover rounded border border-gray-600"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Voiceover Selection - Compact */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white">Choose Voice</h3>
                        {voiceoverProgress && (
                            <div className="text-sm text-indigo-400">
                                Generating voiceover {voiceoverProgress.current}/{voiceoverProgress.total}...
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {voiceOptions.map((voice) => (
                            <div
                                key={voice.id}
                                onClick={() => handleVoiceChange(voice.id)}
                                className={`cursor-pointer p-3 rounded-lg border transition-all ${
                                    selectedVoiceId === voice.id 
                                        ? 'bg-indigo-600 border-indigo-500' 
                                        : 'bg-gray-700/50 border-gray-700 hover:border-gray-600'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                        selectedVoiceId === voice.id 
                                            ? 'bg-indigo-500' 
                                            : 'bg-gray-600'
                                    }`}>
                                        <span className="text-xs">🎵</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white text-xs">{voice.name}</h4>
                                        {selectedVoiceId === voice.id && (
                                            <span className="text-indigo-300 text-xs">✓</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-gray-400 text-xs leading-tight">{voice.preview}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Moodboard - Compact */}
                {project.moodboard && project.moodboard.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h3 className="text-lg font-bold text-white">Moodboard</h3>
                                <p className="text-gray-400 text-sm">Visual style reference</p>
                            </div>
                            <button
                                onClick={() => regenerateContent('moodboard')}
                                disabled={isRegenerating === 'moodboard'}
                                className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300"
                            >
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                {isRegenerating === 'moodboard' ? 'Generating...' : 'New Images (4 Credits)'}
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {project.moodboard.map((imageUrl, index) => (
                                <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-600">
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

            {/* Main Action Button - Compact */}
            <div className="text-center pt-6">
                <button 
                    onClick={handleSaveAndContinue}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    <SparklesIcon className="w-6 h-6 mr-3" />
                    {isSaving ? 'Saving...' : 'Save & Continue to Studio →'}
                </button>
            </div>

            {/* Footer Navigation - Compact */}
            <div className="flex justify-between items-center pt-4">
                <button 
                    onClick={onBack}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300"
                >
                    <span className="mr-2">←</span>
                    Back
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