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

        setIsRegenerating(type + (sceneIndex !== undefined ? `_${sceneIndex}` : ''));
        
        try {
            const response = await invokeEdgeFunction('openai-proxy', {
                type: 'generateContent',
                params: {
                    model: 'gpt-4o',
                    contents: `You are a viral video content expert. Based on this project context:
                    
Project Topic: ${project.topic}
Platform: ${project.platform}
Video Size: ${project.videoSize}

Current Script:
${JSON.stringify(editedScript, null, 2)}

Please regenerate the ${type}${sceneIndex !== undefined ? ` for scene ${sceneIndex + 1}` : ''}. Make it more engaging, viral-worthy, and optimized for ${project.platform}.

Requirements:
- Keep it concise and punchy
- Make it highly engaging
- Optimize for viral potential
- Match the platform's style (${project.platform})
- Maintain consistency with the overall script

Return only the ${type} content, no explanations.`,
                    config: {
                        systemInstruction: 'You are a viral video content expert specializing in creating engaging, shareable content optimized for different social media platforms.',
                        responseMimeType: 'application/json'
                    }
                }
            });

            if (response.text) {
                const newContent = JSON.parse(response.text);
                
                if (type === 'title') {
                    handleScriptChange('title', newContent.title || newContent);
                } else if (type === 'hook') {
                    handleScriptChange('hooks', newContent.hooks || [newContent]);
                } else if (type === 'scene' && sceneIndex !== undefined) {
                    handleScriptChange('visual', newContent.visual || newContent, sceneIndex);
                } else if (type === 'moodboard') {
                    // Regenerate moodboard images
                    await regenerateMoodboardImages();
                }
                
                addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} regenerated successfully!`, 'success');
            }
        } catch (error) {
            console.error(`Error regenerating ${type}:`, error);
            addToast(`Failed to regenerate ${type}`, 'error');
        } finally {
            setIsRegenerating(null);
        }
    };

    const regenerateMoodboardImages = async () => {
        if (!editedScript) return;

        try {
            const moodboardPrompts = editedScript.scenes.map((scene, index) => 
                `Create a vibrant, engaging visual for: "${scene.visual}". Style: modern, dynamic, social media optimized, high contrast, eye-catching colors.`
            );

            const imagePromises = moodboardPrompts.map(async (prompt, index) => {
                const response = await invokeEdgeFunction('openai-proxy', {
                    type: 'generateImages',
                    params: {
                        prompt,
                        config: {
                            numberOfImages: 1,
                            aspectRatio: project.videoSize === '16:9' ? '16:9' : 
                                        project.videoSize === '9:16' ? '9:16' : '1:1'
                        }
                    }
                });

                if (response.generatedImages && response.generatedImages[0]) {
                    return {
                        index,
                        imageData: response.generatedImages[0].image.imageBytes
                    };
                }
                return null;
            });

            const results = await Promise.all(imagePromises);
            
            // Upload new images to Supabase storage
            const newMoodboardUrls = await Promise.all(
                results.map(async (result) => {
                    if (!result) return null;
                    
                    const { data, error } = await supabase.storage
                        .from('assets')
                        .upload(
                            `${project.userId}/${project.id}/moodboard_${result.index}_new.jpg`,
                            new Blob([Uint8Array.from(atob(result.imageData))], { type: 'image/jpeg' }),
                            { upsert: true }
                        );

                    if (error) {
                        console.error('Error uploading new moodboard image:', error);
                        return null;
                    }

                    return supabase.storage.from('assets').getPublicUrl(data.path).data.publicUrl;
                })
            );

            // Update project with new moodboard URLs
            const validUrls = newMoodboardUrls.filter(url => url !== null);
            if (validUrls.length > 0) {
                await handleUpdateProject(project.id, { moodboard: validUrls });
                addToast('Moodboard images regenerated successfully!', 'success');
            }
        } catch (error) {
            console.error('Error regenerating moodboard:', error);
            addToast('Failed to regenerate moodboard images', 'error');
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
                        voiceId,
                        text: scene.voiceover,
                        projectId: project.id,
                        sceneIndex: index
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
                workflowStep: 3 // Move to Creative Studio
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
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Review Your Blueprint</h1>
                <p className="text-gray-400">Review and customize your generated content before creating your video</p>
            </div>

            {/* Title Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Video Title</h2>
                    <button
                        onClick={() => regenerateContent('title')}
                        disabled={isRegenerating === 'title'}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        {isRegenerating === 'title' ? 'Regenerating...' : '🔄 Regenerate'}
                    </button>
                </div>
                <textarea
                    value={editedScript.title || ''}
                    onChange={(e) => handleScriptChange('title', e.target.value)}
                    className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder="Enter your video title..."
                />
            </div>

            {/* Hooks Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Hook Options</h2>
                    <button
                        onClick={() => regenerateContent('hook')}
                        disabled={isRegenerating === 'hook'}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        {isRegenerating === 'hook' ? 'Regenerating...' : '🔄 Regenerate All'}
                    </button>
                </div>
                <div className="space-y-3">
                    {(editedScript.hooks || []).map((hook, index) => (
                        <div key={index} className="flex gap-3">
                            <textarea
                                value={hook}
                                onChange={(e) => {
                                    const newHooks = [...(editedScript.hooks || [])];
                                    newHooks[index] = e.target.value;
                                    handleScriptChange('hooks', newHooks);
                                }}
                                className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                rows={2}
                                placeholder={`Hook ${index + 1}...`}
                            />
                            <button
                                onClick={() => regenerateContent('hook')}
                                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                            >
                                🔄
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scenes Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Video Scenes</h2>
                    <button
                        onClick={() => regenerateContent('moodboard')}
                        disabled={isRegenerating === 'moodboard'}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        {isRegenerating === 'moodboard' ? 'Regenerating...' : '🎨 Regenerate Images'}
                    </button>
                </div>
                <div className="space-y-6">
                    {editedScript.scenes.map((scene, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-medium text-white">Scene {index + 1}</h3>
                                <button
                                    onClick={() => regenerateContent('scene', index)}
                                    disabled={isRegenerating === `scene_${index}`}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                                >
                                    {isRegenerating === `scene_${index}` ? 'Regenerating...' : '🔄'}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Visual Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Visual Description</label>
                                    <textarea
                                        value={scene.visual}
                                        onChange={(e) => handleScriptChange('visual', e.target.value, index)}
                                        className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="Describe the visual elements..."
                                    />
                                </div>

                                {/* Voiceover */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Voiceover Script</label>
                                    <textarea
                                        value={scene.voiceover || ''}
                                        onChange={(e) => handleScriptChange('voiceover', e.target.value, index)}
                                        className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="Enter the voiceover text..."
                                    />
                                </div>
                            </div>

                            {/* Moodboard Image */}
                            {project.moodboard && project.moodboard[index] && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Visual Preview</label>
                                    <img
                                        src={project.moodboard[index]}
                                        alt={`Scene ${index + 1} visual`}
                                        className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-600"
                                    />
                                </div>
                            )}

                            {/* Voiceover Preview */}
                            {project.voiceoverUrls && project.voiceoverUrls[index] && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Voiceover Preview</label>
                                    <audio
                                        controls
                                        className="w-full max-w-md"
                                        src={project.voiceoverUrls[index]}
                                    >
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Voiceover Settings */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Voiceover Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {voiceOptions.map((voice) => (
                        <div
                            key={voice.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedVoiceId === voice.id
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            }`}
                            onClick={() => handleVoiceChange(voice.id)}
                        >
                            <h3 className="font-medium text-white mb-2">{voice.name}</h3>
                            <p className="text-sm text-gray-400">{voice.preview}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Call to Action</h2>
                <textarea
                    value={editedScript.cta || ''}
                    onChange={(e) => handleScriptChange('cta', e.target.value)}
                    className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder="Enter your call to action..."
                />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                    ← Back to Blueprint
                </button>
                <button
                    onClick={handleSaveAndContinue}
                    disabled={isSaving}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all font-medium"
                >
                    {isSaving ? 'Saving...' : 'Save & Continue to Studio →'}
                </button>
            </div>
        </div>
    );
};

export default BlueprintReview;