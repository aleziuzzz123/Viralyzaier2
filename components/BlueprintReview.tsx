import React, { useState } from 'react';
import { Project, Script, Scene } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { CheckBadgeIcon, ChevronDownIcon, PlayIcon, PauseIcon, SpeakerWaveIcon, PhotoIcon, FilmIcon, SparklesIcon } from './Icons';

interface BlueprintReviewProps {
    project: Project;
}

const BlueprintReview: React.FC<BlueprintReviewProps> = ({ project }) => {
    const { t, handleUpdateProject, addToast } = useAppContext();
    const [isProceeding, setIsProceeding] = useState(false);
    const [playingAudio, setPlayingAudio] = useState<number | null>(null);

    const script = project.script;
    const moodboard = project.moodboard || [];
    const voiceoverUrls = project.voiceoverUrls || {};

    const handleProceedToStudio = async () => {
        setIsProceeding(true);
        try {
            await handleUpdateProject(project.id, { workflowStep: 3 });
            addToast("Proceeding to Creative Studio...", "success");
        } catch (error) {
            addToast("Failed to proceed to Creative Studio", "error");
        } finally {
            setIsProceeding(false);
        }
    };

    const handleGoBack = async () => {
        try {
            await handleUpdateProject(project.id, { workflowStep: 2 });
        } catch (error) {
            addToast("Failed to go back", "error");
        }
    };

    const toggleAudio = (sceneIndex: number) => {
        if (playingAudio === sceneIndex) {
            setPlayingAudio(null);
        } else {
            setPlayingAudio(sceneIndex);
        }
    };

    if (!script) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-white mb-4">No Blueprint Found</h2>
                <p className="text-gray-400">Please generate a blueprint first.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">Review Your Blueprint</h1>
                <p className="text-lg text-gray-400 mb-6">
                    Review your AI-generated script, moodboard, and voiceovers before proceeding to the Creative Studio.
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Script Generated</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Moodboard Created</span>
                    </div>
                    {Object.keys(voiceoverUrls).length > 0 && (
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Voiceovers Ready</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Project Overview */}
            <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-2xl p-6 border border-indigo-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{project.title}</h2>
                        <p className="text-gray-300 mb-4">{project.topic}</p>
                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                            <div className="flex items-center space-x-2">
                                <FilmIcon className="w-4 h-4" />
                                <span>{script.scenes.length} Scenes</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <PhotoIcon className="w-4 h-4" />
                                <span>{moodboard.length} Visual Assets</span>
                            </div>
                            {Object.keys(voiceoverUrls).length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <SpeakerWaveIcon className="w-4 h-4" />
                                    <span>{Object.keys(voiceoverUrls).length} Voiceovers</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-indigo-400 mb-1">
                            {script.scenes.reduce((total, scene) => total + (scene.timecode ? parseInt(scene.timecode) : 0), 0)}s
                        </div>
                        <div className="text-sm text-gray-400">Total Duration</div>
                    </div>
                </div>
            </div>

            {/* Script Review */}
            <div className="bg-gray-900/40 rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-3 text-indigo-400" />
                    Script Review
                </h3>
                
                {/* Hook */}
                {script.hooks && script.hooks.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-lg font-semibold text-indigo-400 mb-3">Opening Hook</h4>
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
                            <p className="text-white font-medium">{script.hooks[script.selectedHookIndex || 0]}</p>
                        </div>
                    </div>
                )}

                {/* Scenes */}
                <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-indigo-400">Scenes</h4>
                    {script.scenes.map((scene: Scene, index: number) => (
                        <div key={index} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h5 className="text-lg font-semibold text-white">
                                    Scene {index + 1} - {scene.timecode}s
                                </h5>
                                {voiceoverUrls[index] && (
                                    <button
                                        onClick={() => toggleAudio(index)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                                    >
                                        {playingAudio === index ? (
                                            <PauseIcon className="w-4 h-4" />
                                        ) : (
                                            <PlayIcon className="w-4 h-4" />
                                        )}
                                        <span className="text-sm">Preview Voice</span>
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Visual Description */}
                                <div>
                                    <h6 className="text-sm font-semibold text-gray-400 mb-2">Visual Description</h6>
                                    <p className="text-gray-300 text-sm leading-relaxed">{scene.visual}</p>
                                    
                                    {/* Storyboard Image */}
                                    {scene.storyboardImageUrl && (
                                        <div className="mt-4">
                                            <img 
                                                src={scene.storyboardImageUrl} 
                                                alt={`Storyboard for scene ${index + 1}`}
                                                className="w-full h-32 object-cover rounded-lg border border-gray-600"
                                            />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Voiceover */}
                                <div>
                                    <h6 className="text-sm font-semibold text-gray-400 mb-2">Voiceover</h6>
                                    <p className="text-gray-300 text-sm leading-relaxed">{scene.voiceover}</p>
                                    
                                    {/* Audio Player */}
                                    {voiceoverUrls[index] && (
                                        <div className="mt-4">
                                            <audio 
                                                src={voiceoverUrls[index]} 
                                                controls 
                                                className="w-full"
                                                onPlay={() => setPlayingAudio(index)}
                                                onPause={() => setPlayingAudio(null)}
                                                onEnded={() => setPlayingAudio(null)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                {script.cta && (
                    <div className="mt-6">
                        <h4 className="text-lg font-semibold text-indigo-400 mb-3">Call to Action</h4>
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                            <p className="text-white font-medium">{script.cta}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Moodboard Gallery */}
            {moodboard.length > 0 && (
                <div className="bg-gray-900/40 rounded-2xl p-6">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <PhotoIcon className="w-6 h-6 mr-3 text-indigo-400" />
                        Visual Moodboard
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {moodboard.map((imageUrl: string, index: number) => (
                            <div key={index} className="relative group">
                                <img 
                                    src={imageUrl} 
                                    alt={`Moodboard image ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-gray-600 group-hover:border-indigo-500 transition-colors"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">Scene {index + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6">
                <button
                    onClick={handleGoBack}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                    <span>←</span>
                    <span>Back to Blueprint</span>
                </button>
                
                <button
                    onClick={handleProceedToStudio}
                    disabled={isProceeding}
                    className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <CheckBadgeIcon className="w-6 h-6" />
                    <span>{isProceeding ? 'Proceeding...' : 'Proceed to Creative Studio'}</span>
                    <span>→</span>
                </button>
            </div>
        </div>
    );
};

export default BlueprintReview;
