// components/CreativeStudioNew.tsx
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { XCircleIcon } from './Icons';

export const CreativeStudioNew: React.FC<{ testProject?: any }> = ({ testProject }) => {
    const { 
        handleUpdateProject, 
        setActiveProjectId
    } = useAppContext();

    const handleBack = () => {
        setActiveProjectId(null);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center max-w-md mx-auto p-8">
                <div className="bg-yellow-900/50 border border-yellow-500/50 p-4 rounded-full w-fit mx-auto mb-6">
                    <XCircleIcon className="w-16 h-16 text-yellow-400" />
                </div>
                <h1 className="text-3xl font-bold mb-4 text-yellow-400">Creative Studio</h1>
                <p className="text-lg mb-6 text-gray-300">
                    Video editing features are temporarily disabled while we upgrade the system.
                </p>
                <p className="text-sm mb-8 text-gray-400">
                    We're working on integrating a new video editing SDK. This feature will be back soon with improved performance and capabilities.
                </p>
                <div className="flex gap-4 justify-center">
                    <button 
                        onClick={handleBack} 
                        className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};
