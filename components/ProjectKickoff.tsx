import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon } from './Icons';
import { getErrorMessage } from '../utils';
import * as supabase from '../services/supabaseService';
import { Project } from '../types';

interface ProjectKickoffProps {
    onProjectCreated: (projectId: string) => void;
    onExit: () => void;
}

const ProjectKickoff: React.FC<ProjectKickoffProps> = ({ onProjectCreated, onExit }) => {
    const { t, addToast, lockAndExecute, user, consumeCredits } = useAppContext();
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [smartDefaults, setSmartDefaults] = useState<any>(null);

    // Simple topic analysis for smart defaults
    const analyzeTopic = (topic: string) => {
        const lowerTopic = topic.toLowerCase();
        
        // Determine platform based on topic
        const isEducational = lowerTopic.includes('how to') || lowerTopic.includes('tutorial') || lowerTopic.includes('learn') || lowerTopic.includes('guide');
        const isEntertainment = lowerTopic.includes('funny') || lowerTopic.includes('meme') || lowerTopic.includes('joke') || lowerTopic.includes('comedy');
        const isNews = lowerTopic.includes('breaking') || lowerTopic.includes('news') || lowerTopic.includes('update') || lowerTopic.includes('latest');
        
        const platform = isEducational ? 'youtube_long' : 'youtube_short';
        const style = isEducational ? 'Clean & Corporate' : isEntertainment ? 'High-Energy Viral' : 'Modern & Clean';
        const length = isEducational ? '90-120 seconds' : '60-90 seconds';
        
        return {
            platform,
            style,
            length,
            isEducational,
            isEntertainment,
            isNews
        };
    };

    const handleTopicChange = (newTopic: string) => {
        setTopic(newTopic);
        if (newTopic.trim().length > 10) {
            const defaults = analyzeTopic(newTopic);
            setSmartDefaults(defaults);
        } else {
            setSmartDefaults(null);
        }
    };

    const handleContinue = () => lockAndExecute(async () => {
        if (!topic.trim()) { setError("Please provide a topic for your video."); return; }
        if (!user) { setError("User not found."); return; }

        if (!await consumeCredits(1)) {
            return; // consumeCredits handles showing the upgrade modal
        }

        setIsLoading(true);
        setError('');
        try {
            // Use smart defaults if available, otherwise use sensible defaults
            const defaults = smartDefaults || {
                platform: 'youtube_long',
                style: 'High-Energy Viral',
                length: '60-90 seconds'
            };

            const newProjectData: Omit<Project, 'id' | 'lastUpdated'> = {
                name: topic.substring(0, 40) || 'New Project',
                topic: topic,
                platform: defaults.platform,
                videoSize: defaults.platform === 'youtube_long' ? '16:9' : '9:16',
                status: 'Idea',
                workflowStep: 2,
                title: topic.substring(0, 40) || 'New Project',
                script: null,
                analysis: null,
                competitorAnalysis: null,
                moodboard: null,
                assets: {},
                soundDesign: null,
                launchPlan: null,
                performance: null,
                scheduledDate: null,
                publishedUrl: null,
                voiceoverVoiceId: 'pNInz6obpgDQGcFmaJgB', // Best performing voice
                lastPerformanceCheck: null
            };
            
            const createdProject = await supabase.createProject(newProjectData, user.id);
            
            addToast("Project idea captured! Now, let's build the blueprint.", 'success');
            onProjectCreated(createdProject.id);

        } catch (e) {
            const errorMessage = getErrorMessage(e);
            setError(errorMessage); addToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    });
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-2xl mx-auto py-12">
                <SparklesIcon className="w-16 h-16 text-indigo-400 animate-pulse" />
                <h2 className="text-2xl font-bold text-white">Creating project spark...</h2>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-8 max-w-4xl mx-auto">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">Let's Create a New Video</h1>
                <p className="mt-2 text-lg text-gray-400">What is the core idea or topic for your new video? This is your creative spark.</p>
            </header>
            <div className="space-y-6 bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
                <div>
                    <h3 className="text-xl font-bold text-white mb-3">The Spark</h3>
                    <textarea 
                        value={topic} 
                        onChange={e => handleTopicChange(e.target.value)} 
                        placeholder="e.g., How to make the perfect coffee, Top 5 productivity hacks, Why cats are amazing..." 
                        rows={3} 
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                    {smartDefaults && (
                        <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                            <h4 className="text-sm font-semibold text-indigo-300 mb-2 flex items-center">
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                AI-Powered Smart Defaults
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-400">Platform:</span>
                                    <span className="text-white ml-2 font-medium">
                                        {smartDefaults.platform === 'youtube_long' ? 'YouTube Long-form' : 'YouTube Shorts'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Style:</span>
                                    <span className="text-white ml-2 font-medium">{smartDefaults.style}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Length:</span>
                                    <span className="text-white ml-2 font-medium">{smartDefaults.length}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-center pt-6 border-t border-gray-700">
                    <button onClick={handleContinue} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                        <SparklesIcon className="w-6 h-6 mr-3" />
                        Continue to Blueprint (1 Credit)
                    </button>
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                </div>
            </div>
            <div className="text-center">
                <button onClick={onExit} className="text-gray-400 hover:text-white text-sm font-semibold">&larr; Back to Dashboard</button>
            </div>
        </div>
    );
};

export default ProjectKickoff;