import React, { useState, useEffect } from 'react';
import { Project, Analysis } from '../types';
import { useAppContext } from '../contexts/AppContext';
import * as geminiService from '../services/geminiService';
import AnalysisResult from './AnalysisResult';
import Loader from './Loader';

interface AnalysisStepProps {
    project: Project;
    onProceedToLaunchpad: () => void;
    onReturnToStudio: () => void;
}

const AnalysisStep: React.FC<AnalysisStepProps> = ({ project, onProceedToLaunchpad, onReturnToStudio }) => {
    const { handleUpdateProject, addToast } = useAppContext();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<Analysis | null>(project.analysis);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        let isMounted = true;

        const performAnalysis = async () => {
            if (!isMounted || !project.script) return;
            
            try {
                setIsAnalyzing(true);
                setStatusMessage("Analyzing video concept against viral data...");

                // Add timeout to prevent infinite loading
                const analysisPromise = geminiService.analyzeVideoConcept(
                    project.script,
                    project.title || project.topic || 'Untitled Video',
                    project.platform
                );
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Analysis timeout - please try again')), 60000) // 60 second timeout
                );
                
                const result = await Promise.race([analysisPromise, timeoutPromise]) as any;
                
                // Validate result before saving
                if (!result || !result.scores || !result.summary) {
                    throw new Error('Invalid analysis result received');
                }
                
                await handleUpdateProject(project.id, { analysis: result });
                if (isMounted) setAnalysisResult(result);

            } catch (e) {
                console.error('Analysis error:', e);
                if (isMounted) {
                    const errorMessage = e instanceof Error ? e.message : 'Analysis failed. Please try again.';
                    addToast(errorMessage, 'error');
                    // Don't return to studio on error, let user retry
                    setIsAnalyzing(false);
                    setStatusMessage('Analysis failed. Please try again.');
                }
            } finally {
                if (isMounted) {
                    setIsAnalyzing(false);
                    setStatusMessage('');
                }
            }
        };

        // Check if we already have analysis results
        if (project.analysis) {
            setAnalysisResult(project.analysis);
            return;
        }

        // Check project status and run analysis accordingly
        if (project.status === 'Rendering') {
            setStatusMessage('Your video is rendering in the cloud... This page will update automatically when it is complete.');
        } else if (project.status === 'Failed') {
            addToast('Video rendering failed. Please try again from the Creative Studio.', 'error');
            onReturnToStudio();
        } else if (project.status === 'Rendered' || project.script) {
            // Run analysis for rendered projects or any project with a script
            performAnalysis();
        } else {
            // Fallback: if no status but we have a script, run analysis
            if (project.script) {
                performAnalysis();
            }
        }

        return () => {
            isMounted = false;
        };
    }, [project.status, project.analysis, project.id, project.script, project.title, project.topic, project.platform, handleUpdateProject, addToast, onReturnToStudio]);

    // Show loader if rendering or analyzing
    if (project.status === 'Rendering' || isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader />
                <p className="mt-4 text-lg font-semibold text-white">{statusMessage}</p>
            </div>
        );
    }

    // Show retry option if analysis failed
    if (statusMessage.includes('failed')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Analysis Failed</h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        We encountered an issue while analyzing your video. This might be due to high server load or a temporary issue.
                    </p>
                    <button
                        onClick={() => {
                            setStatusMessage('');
                            setIsAnalyzing(false);
                            // Trigger re-analysis by updating a dependency
                            window.location.reload();
                        }}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
                    >
                        🔄 Retry Analysis
                    </button>
                </div>
            </div>
        );
    }
    
    // Show results if analysis is complete
    if (analysisResult) {
        return <AnalysisResult 
                    result={analysisResult} 
                    onReset={onReturnToStudio}
                    videoPreviewUrl={project.finalVideoUrl} 
                    onProceedToLaunchpad={onProceedToLaunchpad}
                />;
    }
    
    // Fallback loader
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader />
            <p className="mt-4 text-lg font-semibold text-white">Preparing analysis results...</p>
        </div>
    );
};

export default AnalysisStep;