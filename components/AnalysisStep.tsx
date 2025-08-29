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
            if (!isMounted || !project.script || analysisResult) return; // Don't re-analyze
            
            try {
                setIsAnalyzing(true);
                setStatusMessage("Analyzing video concept against viral data...");

                // FIX: Corrected function name from analyzeVideoConcept to analyzeScriptVirality
                const result = await geminiService.analyzeScriptVirality(
                    project.script,
                    project.title || project.topic || 'Untitled Video',
                    project.platform
                );
                
                await handleUpdateProject(project.id, { analysis: result });
                if (isMounted) setAnalysisResult(result);

            } catch (e) {
                if (isMounted) {
                    addToast(e instanceof Error ? e.message : 'Analysis failed.', 'error');
                    onReturnToStudio();
                }
            } finally {
                if (isMounted) {
                    setIsAnalyzing(false);
                    setStatusMessage('');
                }
            }
        };

        if (project.status === 'Rendered' && !project.analysis) {
            performAnalysis();
        } else if (project.status === 'Rendering') {
            setStatusMessage('Your video is rendering in the cloud... This page will update automatically when it is complete.');
        } else if (project.status === 'Failed') {
            addToast('Video rendering failed. Please try again from the Creative Studio.', 'error');
            onReturnToStudio();
        } else if (project.analysis) {
            setAnalysisResult(project.analysis);
        }

        return () => {
            isMounted = false;
        };
    }, [project.status, project.analysis, project.id, project.script, project.title, project.topic, project.platform, handleUpdateProject, addToast, onReturnToStudio, analysisResult]);

    // Show loader if rendering or analyzing
    if (project.status === 'Rendering' || isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader />
                <p className="mt-4 text-lg font-semibold text-white">{statusMessage}</p>
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