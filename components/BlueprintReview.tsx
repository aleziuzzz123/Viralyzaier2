import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Project, Script, Scene } from '../types';
import { invokeEdgeFunction } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { SparklesIcon } from './Icons';
import KeyboardShortcuts from './KeyboardShortcuts';

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
    const [selectedHookIndex, setSelectedHookIndex] = useState<number>(0);
    const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
    const [expandedScene, setExpandedScene] = useState<number | null>(null);
    const [selectedMoodboardImage, setSelectedMoodboardImage] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges || !project) return;
    
    try {
      setIsSaving(true);
      await handleUpdateProject(project.id, {
        script: project.script,
        moodboard: project.moodboard,
        voiceoverUrls: project.voiceoverUrls,
        assets: project.assets
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, project, handleUpdateProject]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  // Mark changes when user makes edits
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

    // Available voice options with enhanced descriptions
    const voiceOptions = [
        { 
            id: 'pNInz6obpgDQGcFmaJgB', 
            name: 'Sarah', 
            type: 'Professional Female',
            description: 'Clear, professional female voice perfect for business content, educational videos, and corporate presentations.',
            icon: '👩‍💼',
            color: 'bg-blue-500'
        },
        { 
            id: 'EXAVITQu4vr4xnSDxMaL', 
            name: 'Josh', 
            type: 'Friendly Male',
            description: 'Warm, friendly male voice great for casual content, vlogs, and conversational videos.',
            icon: '👨‍💻',
            color: 'bg-green-500'
        },
        { 
            id: 'VR6AewLTigWG4xSOukaG', 
            name: 'Arnold', 
            type: 'Deep Male',
            description: 'Deep, authoritative male voice perfect for dramatic content, documentaries, and serious topics.',
            icon: '🎭',
            color: 'bg-purple-500'
        },
        { 
            id: 'AZnzlk1XvdvUeBnXmlld', 
            name: 'Domi', 
            type: 'Energetic Female',
            description: 'An energetic, upbeat female voice great for dynamic content, tutorials, and motivational videos.',
            icon: '⚡',
            color: 'bg-yellow-500'
        },
        { 
            id: 'ErXwobaYiN019PkySvjV', 
            name: 'Antoni', 
            type: 'Smooth Male',
            description: 'A smooth, charismatic male voice perfect for lifestyle content, reviews, and entertainment.',
            icon: '🎤',
            color: 'bg-indigo-500'
        }
    ];

    // Voice preview function
    const previewVoice = useCallback(async (voiceId: string) => {
        if (previewingVoice === voiceId) {
            setPreviewingVoice(null);
            return;
        }
        
        setPreviewingVoice(voiceId);
        try {
            const sampleText = "This is a preview of how your voiceover will sound. Listen to the tone and style.";
            const response = await invokeEdgeFunction('elevenlabs-proxy', {
                type: 'tts',
                text: sampleText,
                voiceId
            });
            
            if (response && (response as any).audioUrl) {
                const audio = new Audio((response as any).audioUrl);
                audio.play();
                audio.onended = () => setPreviewingVoice(null);
            }
        } catch (error) {
            console.error('Error previewing voice:', error);
            setPreviewingVoice(null);
        }
    }, [previewingVoice]);

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
                // Regenerate hooks using OpenAI - FREE for users
                const response = await invokeEdgeFunction('openai-proxy', {
                    type: 'generateContent',
                    params: {
                        model: 'gpt-4o',
                        contents: `Generate 5 engaging hooks for a video about "${project.topic}". Each hook should be 1-2 sentences and designed to capture attention immediately. Make them diverse, compelling, and viral-worthy.`,
                        config: {
                            systemInstruction: 'You are a viral video expert. Generate hooks that are attention-grabbing, emotional, and designed to make viewers want to watch more. Each hook should be unique and target different emotional triggers. Return only the hooks, one per line.'
                        }
                    }
                });

                if ((response as any).text) {
                    const newHooks = (response as any).text.split('\n').filter((hook: string) => hook.trim()).slice(0, 5);
                    setEditedScript({ ...editedScript, hooks: newHooks });
                    setSelectedHookIndex(0); // Reset to first hook
                    addToast('New hooks generated successfully! Choose your favorite.', 'success');
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
        <div className="min-h-screen bg-gray-900 py-8 px-6">
            <KeyboardShortcuts 
                onSave={autoSave}
                onNext={onApprove}
                onPrevious={onBack}
            />
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Professional Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
                        <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white">Review Your Blueprint</h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Perfect your content before creating your video. Make it viral-worthy.
                    </p>
                    {/* Auto-save status */}
                    <div className="flex items-center justify-center gap-2 text-sm">
                        {isSaving ? (
                            <span className="text-yellow-400 flex items-center gap-1">
                                <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                Saving...
                            </span>
                        ) : hasUnsavedChanges ? (
                            <span className="text-orange-400">● Unsaved changes</span>
                        ) : lastSaved ? (
                            <span className="text-green-400">✓ Saved {lastSaved.toLocaleTimeString()}</span>
                        ) : null}
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="flex justify-center">
                    <div className="flex items-center space-x-4 bg-gray-800/50 rounded-2xl px-6 py-3 border border-gray-700">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">3</span>
                            </div>
                            <span className="text-white font-semibold">Review & Edit</span>
                        </div>
                        <div className="w-px h-6 bg-gray-600"></div>
                        <div className="flex space-x-1">
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
            
                {/* Professional Hook Selection Section */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">🎯 Choose Your Hook</h2>
                            <p className="text-gray-300">Select the most compelling hook to grab your audience's attention</p>
                        </div>
                        <button
                            onClick={() => regenerateContent('hook')}
                            disabled={isRegenerating === 'hook'}
                            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isRegenerating === 'hook' ? 'Generating...' : 'Generate New Hooks (FREE)'}
                        </button>
                    </div>
                    
                    {/* Hook Selection Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(editedScript.hooks || []).map((hook, index) => (
                            <div 
                                key={index} 
                                className={`relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                                    selectedHookIndex === index 
                                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50'
                                }`}
                                onClick={() => setSelectedHookIndex(index)}
                            >
                                {/* Selection Indicator */}
                                {selectedHookIndex === index && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-gray-300">Hook {index + 1}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newHooks = [...(editedScript.hooks || [])];
                                                newHooks[index] = prompt('Edit hook:', hook) || hook;
                                                handleScriptChange('hooks', newHooks);
                                            }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                                <p className="text-white text-sm leading-relaxed">{hook}</p>
                            </div>
                        ))}
                    </div>
                    
                    {/* Selected Hook Preview */}
                    {editedScript.hooks && editedScript.hooks[selectedHookIndex] && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-indigo-400 font-semibold">Selected Hook:</span>
                                <span className="text-white font-bold">#{selectedHookIndex + 1}</span>
                            </div>
                            <p className="text-white text-lg leading-relaxed">
                                "{editedScript.hooks[selectedHookIndex]}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Professional Video Scenes Section */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">🎬 Video Scenes</h2>
                            <p className="text-gray-300">Review and edit your video scenes. Click storyboard images to regenerate them.</p>
                        </div>
                        <button
                            onClick={() => regenerateContent('scene')}
                            disabled={isRegenerating === 'scene'}
                            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isRegenerating === 'scene' ? 'Regenerating...' : 'Regenerate All Scenes (FREE)'}
                        </button>
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-6">
                        {editedScript.scenes?.map((scene, index) => (
                            <div key={index} className="bg-gray-700/30 rounded-xl p-6 border border-gray-600 hover:border-gray-500 transition-all duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Scene {index + 1}</h3>
                                    </div>
                                    <button
                                        onClick={() => setExpandedScene(expandedScene === index ? null : index)}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        {expandedScene === index ? '▼' : '▶'}
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {/* Storyboard Image - Clickable */}
                                    {scene.storyboardImageUrl && (
                                        <div className="relative group">
                                            <label className="block text-gray-300 text-sm font-semibold mb-2">Storyboard</label>
                                            <div 
                                                className="relative cursor-pointer rounded-lg overflow-hidden border-2 border-gray-600 hover:border-indigo-500 transition-all duration-300 group-hover:shadow-lg"
                                                onClick={() => {
                                                    // Regenerate this specific storyboard image
                                                    regenerateContent('moodboard', index);
                                                }}
                                            >
                                                <img 
                                                    src={scene.storyboardImageUrl} 
                                                    alt={`Scene ${index + 1} storyboard`}
                                                    className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <SparklesIcon className="w-6 h-6 text-white mx-auto mb-1" />
                                                        <span className="text-white text-sm font-semibold">Click to Regenerate</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Visual Description */}
                                    <div>
                                        <label className="block text-gray-300 text-sm font-semibold mb-2">Visual Description</label>
                                        <textarea
                                            value={scene.visual}
                                            onChange={(e) => handleScriptChange('visual', e.target.value, index)}
                                            className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                                            rows={3}
                                            placeholder="Describe what viewers will see..."
                                        />
                                    </div>
                                    
                                    {/* Voiceover Text */}
                                    <div>
                                        <label className="block text-gray-300 text-sm font-semibold mb-2">Voiceover Text</label>
                                        <textarea
                                            value={scene.voiceover}
                                            onChange={(e) => handleScriptChange('voiceover', e.target.value, index)}
                                            className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                                            rows={3}
                                            placeholder="What will be said in this scene..."
                                        />
                                    </div>
                                    
                                    {/* Scene Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => regenerateContent('scene', index)}
                                            disabled={isRegenerating === 'scene'}
                                            className="flex-1 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-medium rounded-lg transition-colors text-sm"
                                        >
                                            Regenerate Scene
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newScenes = [...editedScript.scenes];
                                                newScenes.splice(index, 1);
                                                handleScriptChange('scenes', newScenes);
                                            }}
                                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-lg transition-colors text-sm"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Professional Voice Selection Section */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">🎤 Choose Your Voice</h2>
                            <p className="text-gray-300">Select the perfect voice for your video. Click the play button to preview each voice.</p>
                        </div>
                        {voiceoverProgress && (
                            <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-4 py-2">
                                <div className="text-indigo-400 font-semibold text-sm">
                                    Generating voiceover {voiceoverProgress.current}/{voiceoverProgress.total}...
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {voiceOptions.map((voice) => (
                            <div
                                key={voice.id}
                                className={`relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                                    selectedVoiceId === voice.id 
                                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50'
                                }`}
                                onClick={() => handleVoiceChange(voice.id)}
                            >
                                {/* Selection Indicator */}
                                {selectedVoiceId === voice.id && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${voice.color}`}>
                                        {voice.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white text-lg">{voice.name}</h3>
                                        <p className="text-gray-400 text-sm">{voice.type}</p>
                                    </div>
                                </div>
                                
                                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                    {voice.description}
                                </p>
                                
                                {/* Preview Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        previewVoice(voice.id);
                                    }}
                                    disabled={previewingVoice === voice.id}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 disabled:bg-gray-700/50 text-white font-medium rounded-lg transition-colors"
                                >
                                    {previewingVoice === voice.id ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Playing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>▶️</span>
                                            <span>Preview Voice</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    {/* Selected Voice Info */}
                    {selectedVoiceId && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm">✓</span>
                                </div>
                                <div>
                                    <span className="text-indigo-400 font-semibold">Selected Voice:</span>
                                    <span className="text-white font-bold ml-2">
                                        {voiceOptions.find(v => v.id === selectedVoiceId)?.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Professional Moodboard Section */}
                {project.moodboard && project.moodboard.length > 0 && (
                    <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">🎨 Visual Style Reference</h2>
                                <p className="text-gray-300">Click on any image to regenerate it. These images set the visual tone for your video.</p>
                            </div>
                            <button
                                onClick={() => regenerateContent('moodboard')}
                                disabled={isRegenerating === 'moodboard'}
                                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                            >
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                {isRegenerating === 'moodboard' ? 'Generating...' : 'New Images (4 Credits)'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {project.moodboard.map((imageUrl, index) => (
                                <div 
                                    key={index} 
                                    className="relative group cursor-pointer"
                                    onClick={() => {
                                        setSelectedMoodboardImage(index);
                                        // Regenerate this specific image
                                        regenerateContent('moodboard', index);
                                    }}
                                >
                                    <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-600 hover:border-indigo-500 transition-all duration-300 group-hover:shadow-lg">
                                        <img 
                                            src={imageUrl} 
                                            alt={`Moodboard ${index + 1}`}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <div className="text-center">
                                                <SparklesIcon className="w-6 h-6 text-white mx-auto mb-1" />
                                                <span className="text-white text-sm font-semibold">Click to Regenerate</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border border-gray-600">
                                        <span className="text-gray-300 text-xs font-bold">{index + 1}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-6 p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl border border-pink-500/30">
                            <div className="flex items-center gap-2">
                                <span className="text-pink-400">💡</span>
                                <span className="text-gray-300 text-sm">
                                    <strong>Pro Tip:</strong> These images help AI understand your visual style. Choose images that match your brand and content tone.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Professional Action Section */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                    <div className="text-center space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Ready to Create Your Video?</h2>
                            <p className="text-gray-300">Your blueprint is ready! Click below to proceed to the Creative Studio.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button 
                                onClick={onBack}
                                className="inline-flex items-center justify-center px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                            >
                                <span className="mr-2">←</span>
                                Back to Blueprint
                            </button>
                            
                            <button 
                                onClick={handleSaveAndContinue}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                            >
                                <SparklesIcon className="w-6 h-6 mr-3" />
                                {isSaving ? 'Saving...' : 'Continue to Creative Studio →'}
                            </button>
                        </div>
                        
                        {/* Progress Summary */}
                        <div className="flex justify-center">
                            <div className="flex items-center space-x-4 bg-gray-700/50 rounded-xl px-6 py-3 border border-gray-600">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                    <span className="text-emerald-400 font-semibold text-sm">Blueprint Complete</span>
                                </div>
                                <div className="w-px h-4 bg-gray-600"></div>
                                <div className="text-gray-400 text-sm">
                                    Stage 3 of 6 • Ready for Creative Studio
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlueprintReview;