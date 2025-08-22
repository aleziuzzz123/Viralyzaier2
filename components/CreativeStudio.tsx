import React from 'react';
import { SparklesIcon } from './Icons';

const CreativeStudio: React.FC = () => {
    
    const openEditor = () => {
        const url = '/studio.html';     // relative path served by Vite
        if (window.top && window.top !== window) {
          // Break out of the AI Studio preview iframe
          (window.top as Window).location.href = url;
        } else {
          window.location.href = url;
        }
    };

    return (
        <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700 min-h-[60vh] flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-white mb-3">Creative Studio</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Your script and assets are ready. Click below to open the video editor in a dedicated workspace.
            </p>
            <button
                onClick={openEditor}
                className="inline-flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
            >
                <SparklesIcon className="w-6 h-6 mr-3" />
                Open Creative Studio
            </button>
        </div>
    );
};

export default CreativeStudio;