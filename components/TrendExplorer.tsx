import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { exploreViralTrends } from '../services/geminiService';
import { ViralTrendSuggestion } from '../types';
import { SearchIcon, SparklesIcon, TopTopicsIcon } from './Icons';

interface TrendExplorerProps {
    onCreateProject: (topic: string, title?: string) => void;
}

const TrendExplorer: React.FC<TrendExplorerProps> = ({ onCreateProject }) => {
    const { t, addToast, lockAndExecute } = useAppContext();
    const [niche, setNiche] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<ViralTrendSuggestion[]>([]);
    const [sources, setSources] = useState<{uri: string, title: string}[]>([]);

    const handleSearch = () => lockAndExecute(async () => {
        if (!niche.trim()) {
            addToast("Please enter a niche to explore.", 'error');
            return;
        }
        setIsLoading(true);
        setResults([]);
        setSources([]);
        try {
            const { trends, sources } = await exploreViralTrends(niche);
            setResults(trends);
            setSources(sources);
        } catch(e) {
            addToast(e instanceof Error ? e.message : 'Failed to explore trends.', 'error');
        } finally {
            setIsLoading(false);
        }
    });

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter a niche, e.g., 'AI Productivity Tools'"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={handleSearch} disabled={isLoading} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:bg-gray-600">
                    <SearchIcon className="w-6 h-6" />
                </button>
            </div>

            {isLoading && (
                 <div className="flex flex-col items-center justify-center space-y-4 text-center mt-8">
                    <SparklesIcon className="w-12 h-12 text-pink-500 animate-pulse" />
                    <p className="text-lg text-gray-200 font-semibold">Discovering Viral Trends...</p>
                </div>
            )}
            
            {results.length > 0 && (
                <div className="space-y-4 animate-fade-in-up">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><TopTopicsIcon className="w-6 h-6 text-indigo-400" /> Top 3 Breakout Ideas</h3>
                    {results.map((trend, i) => (
                        <div key={i} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                            <h4 className="font-bold text-indigo-300">{trend.suggestedTitle}</h4>
                            <p className="text-sm text-gray-400 mt-1 italic"><strong>Angle:</strong> {trend.angle}</p>
                            <p className="text-sm text-gray-400 mt-2"><strong>Hook:</strong> "{trend.hook}"</p>
                            <button onClick={() => onCreateProject(trend.topic, trend.suggestedTitle)} className="w-full mt-4 text-center py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                                Create Project From This Idea
                            </button>
                        </div>
                    ))}
                     {sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-sm font-semibold text-indigo-400 mb-2">Sources:</p>
                            <ul className="space-y-1">
                            {sources.map((source, i) => (
                                <li key={i} className="text-xs text-gray-500 truncate">
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-300 hover:underline">
                                    {i+1}. {source.title}
                                </a>
                                </li>
                            ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrendExplorer;
