import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, LightBulbIcon, TargetIcon, BreakoutIcon, PaintBrushIcon } from './Icons';
import { getErrorMessage } from '../utils';
import * as supabase from '../services/supabaseService';
import { Project, BrandIdentity } from '../types';
import CompetitorAnalysis from './CompetitorAnalysis';
import TrendExplorer from './TrendExplorer';

interface ProjectKickoffProps {
    onProjectCreated: (projectId: string) => void;
    onExit: () => void;
}

type KickoffPath = 'Topic' | 'Competitor' | 'Trends' | 'Brand';

const ProjectKickoff: React.FC<ProjectKickoffProps> = ({ onProjectCreated, onExit }) => {
    const { t, addToast, lockAndExecute, user, consumeCredits } = useAppContext();
    const [activePath, setActivePath] = useState<KickoffPath>('Topic');
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [brandIdentities, setBrandIdentities] = useState<BrandIdentity[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

     useEffect(() => {
        if (user) {
            supabase.getBrandIdentitiesForUser(user.id)
                .then(setBrandIdentities)
                .catch(() => addToast("Failed to load brand identities.", "error"));
        }
    }, [user, addToast]);

    const handleCreateProject = useCallback((projectTopic: string, title?: string) => {
        lockAndExecute(async () => {
            if (!projectTopic.trim()) { setError("Please provide a topic for your video."); return; }
            if (!user) { setError("User not found."); return; }

            if (!await consumeCredits(1)) return;

            setIsLoading(true);
            setError('');
            try {
                const finalTitle = title || projectTopic.substring(0, 50) || 'New Project';
                const newProjectData: Omit<Project, 'id' | 'lastUpdated'> = {
                    name: finalTitle,
                    topic: projectTopic,
                    platform: 'youtube_long',
                    videoSize: '16:9',
                    status: 'Idea',
                    workflowStep: 2,
                    title: finalTitle,
                    script: null, analysis: null, competitorAnalysis: null, moodboard: null, assets: {},
                    soundDesign: null, launchPlan: null, performance: null, scheduledDate: null, publishedUrl: null,
                    voiceoverVoiceId: null, lastPerformanceCheck: null
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
    }, [user, addToast, lockAndExecute, consumeCredits, onProjectCreated]);
    
    const renderPathContent = () => {
        switch(activePath) {
            case 'Competitor':
                return (
                    <div className="space-y-4">
                        <p className="text-center text-gray-400">Deconstruct a competitor's success. Paste a YouTube URL to extract their viral formula, keywords, and get upgraded title ideas to inspire your own project.</p>
                        <CompetitorAnalysis project={{id: 'temp-project-for-analysis'} as Project} onApplyTitle={(title) => handleCreateProject(title, title)} />
                    </div>
                );
            case 'Trends':
                return (
                     <div className="space-y-4">
                        <p className="text-center text-gray-400">Discover what's buzzing right now. Enter a niche or topic, and our AI will find and synthesize the latest viral trends into actionable video ideas for you.</p>
                        <TrendExplorer onCreateProject={handleCreateProject} />
                    </div>
                );
            case 'Brand':
                 return (
                    <div className="space-y-4 text-center">
                        <p className="text-gray-400">Generate ideas that are perfectly aligned with your brand. Select a Brand Identity, and our AI will suggest on-brand topics and titles.</p>
                        <select
                            value={selectedBrandId || ''}
                            onChange={(e) => setSelectedBrandId(e.target.value)}
                            className="w-full max-w-sm mx-auto bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"
                        >
                            <option value="">Select a Brand Identity</option>
                            {brandIdentities.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                        </select>
                        <p className="text-sm text-gray-500 mt-4">AI idea generation from brand identity coming soon.</p>
                    </div>
                );
            case 'Topic':
            default:
                return (
                     <div className="space-y-4">
                        <p className="text-center text-gray-400">Have a specific idea in mind? Enter your topic or a detailed prompt below to get started with the AI Blueprint generator.</p>
                        <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder={t('blueprint_modal.topic_placeholder')} rows={4} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="text-center">
                            <button onClick={() => handleCreateProject(topic)} disabled={isLoading} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-gray-600">
                                <SparklesIcon className="w-6 h-6 mr-3" />
                                Continue to Blueprint (1 Credit)
                            </button>
                        </div>
                    </div>
                );
        }
    };
    
    const kickoffPaths: { id: KickoffPath; name: string; icon: React.FC<{className?: string}> }[] = [
        { id: 'Topic', name: 'From a Topic', icon: LightBulbIcon },
        { id: 'Competitor', name: 'Analyze Competitor', icon: TargetIcon },
        { id: 'Trends', name: 'Explore Trends', icon: BreakoutIcon },
        { id: 'Brand', name: 'From Brand', icon: PaintBrushIcon },
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-2xl mx-auto py-12">
                <SparklesIcon className="w-16 h-16 text-indigo-400 animate-pulse" />
                <h2 className="text-2xl font-bold text-white">Creating project spark...</h2>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-8 max-w-5xl mx-auto">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">Let's Create a New Video</h1>
                <p className="mt-2 text-lg text-gray-400">Choose your strategic starting point. How do you want to find your next viral idea?</p>
            </header>
            
            <div className="bg-gray-800/50 p-2 rounded-2xl border border-gray-700">
                <div className="flex items-center justify-center p-2 bg-gray-900/50 rounded-xl mb-4 gap-2">
                    {kickoffPaths.map(path => (
                        <button
                            key={path.id}
                            onClick={() => setActivePath(path.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activePath === path.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-700/50'}`}
                        >
                            <path.icon className="w-5 h-5" />
                            {path.name}
                        </button>
                    ))}
                </div>
                
                <div className="p-6 min-h-[300px] flex flex-col justify-center">
                    {renderPathContent()}
                </div>
            </div>

            {error && <p className="text-red-400 text-center">{error}</p>}
            
            <div className="text-center">
                <button onClick={onExit} className="text-gray-400 hover:text-white text-sm font-semibold">&larr; Back to Dashboard</button>
            </div>
        </div>
    );
};

export default ProjectKickoff;
