import React from 'react';
import { XCircleIcon, LayersIcon, PhotoIcon, PlayCircleIcon } from './Icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in-up" 
            style={{ animationDuration: '0.3s' }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
        >
            <div 
                className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-lg m-4 p-8 text-left transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                
                <h2 id="help-modal-title" className="text-2xl font-bold text-white mb-4">Creative Studio Guide</h2>
                
                <div className="space-y-4 text-gray-300">
                    <div className="flex items-start gap-4">
                        <PlayCircleIcon className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-white">The Player</h3>
                            <p className="text-sm">This is your live preview. Click on any element like text or images directly in the preview to select it for editing.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <LayersIcon className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-white">The Timeline</h3>
                            <p className="text-sm">The timeline at the bottom shows all the scenes from your script. Click on a scene block to jump to that part of the video and select its main visual.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <PhotoIcon className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-white">The Side Panel</h3>
                            <p className="text-sm">Use the tabs on the right to switch between editing properties (Inspector), finding new visuals (Media), adjusting audio, and applying your brand kit.</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                >
                    Got It!
                </button>
            </div>
        </div>
    );
};

export default HelpModal;