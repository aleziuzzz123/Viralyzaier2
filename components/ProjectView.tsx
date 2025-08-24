import React from 'react';
import { Project, WorkflowStep } from '../types';
import { useAppContext } from '../contexts/AppContext';
import ScriptGenerator from './ScriptGenerator';
import CreativeStudio from './CreativeStudio';
import Launchpad from './Launchpad';
import TutorialCallout from './TutorialCallout';
import { TranslationKey } from '../translations';
import AnalysisStep from './AnalysisStep';

interface ProjectViewProps {
    project: Project;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ project }) => {
    const { handleUpdateProject, t, dismissedTutorials } = useAppContext();
    
    const isStudioActive = project.workflowStep === 3;

    const handleProceedToLaunchpad = () => {
        handleUpdateProject(project.id, {
            workflowStep: 5,
        });
    };

    const handleReturnToStudio = () => {
        handleUpdateProject(project.id, {
            workflowStep: 3
        });
    };
    
    const handleStepClick = (step: WorkflowStep) => {
        // Allow navigation only to previous or current steps
        if (step <= project.workflowStep) {
            handleUpdateProject(project.id, { workflowStep: step });
        }
    };
    
    const renderContent = () => {
        switch (project.workflowStep) {
            case 2:
                return <ScriptGenerator project={project} />;
            case 3:
                // By keying the component on lastUpdated, we force a full remount when the project data changes,
                // ensuring a clean state for the editor and preventing hangs from stale props.
                return <CreativeStudio key={project.lastUpdated} />;
            case 4:
                return <AnalysisStep project={project} onProceedToLaunchpad={handleProceedToLaunchpad} onReturnToStudio={handleReturnToStudio} />;
            case 5:
                return <Launchpad project={project} />;
            default:
                 // Default to the blueprint step if the project is in an early stage (e.g., step 1)
                return <ScriptGenerator project={project} />;
        }
    };
    
    const steps: { nameKey: TranslationKey, step: WorkflowStep }[] = [
        { nameKey: 'project_view.stepper_spark', step: 1 },
        { nameKey: 'project_view.stepper_blueprint', step: 2 },
        { nameKey: 'project_view.stepper_creative_studio', step: 3 },
        { nameKey: 'project_view.stepper_analysis', step: 4 },
        { nameKey: 'project_view.stepper_launchpad', step: 5 },
    ];

    return (
        <div className={`h-full flex flex-col ${isStudioActive ? 'gap-2' : 'gap-8'}`}>
            <nav className="p-4 bg-gray-800/50 rounded-xl flex-shrink-0">
                <ol className="flex items-center justify-center space-x-2 sm:space-x-4">
                    {steps.map((step, index) => {
                        const isCompleted = project.workflowStep > step.step;
                        const isCurrent = project.workflowStep === step.step;
                        const isClickable = project.workflowStep >= step.step;

                        return (
                            <li key={step.step} className="flex items-center">
                                <button
                                    onClick={() => handleStepClick(step.step)}
                                    disabled={!isClickable}
                                    className={`flex items-center ${isClickable ? 'cursor-pointer group' : 'cursor-default'}`}
                                >
                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold transition-colors ${isCompleted || isCurrent ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'} ${isClickable ? 'group-hover:bg-indigo-500' : ''}`}>
                                        {isCompleted ? '✓' : step.step}
                                    </span>
                                    <span className={`hidden sm:inline ml-3 font-medium transition-colors ${isCompleted || isCurrent ? 'text-white' : 'text-gray-500'} ${isClickable ? 'group-hover:text-indigo-300' : ''}`}>
                                        {t(step.nameKey)}
                                    </span>
                                </button>
                                {index < steps.length - 1 && (
                                    <div className={`hidden sm:block w-8 sm:w-16 h-0.5 transition-colors ${project.workflowStep > step.step ? 'bg-indigo-600' : 'bg-gray-700'} mx-2 sm:mx-4`}></div>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
            
            {project.workflowStep === 2 && !dismissedTutorials.includes('project_view_new') && (
                 <TutorialCallout id="project_view_new">
                    {t('project_view.tutorial_callout_new')}
                </TutorialCallout>
            )}

            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};