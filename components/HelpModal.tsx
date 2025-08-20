import React from 'react';
import { XCircleIcon } from './Icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const Shortcut: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
        <p className="text-gray-300">{description}</p>
        <div className="flex gap-1">
            {keys.map(key => <kbd key={key} className="px-2 py-1 text-xs font-semibold text-indigo-200 bg-gray-900 border border-gray-600 rounded-md">{key}</kbd>)}
        </div>
    </div>
);


const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const shortcuts = [
        { keys: ['Space'], description: 'Play / Pause' },
        { keys: ['L'], description: 'Play' },
        { keys: ['K'], description: 'Pause' },
        { keys: ['J'], description: 'Stop (Return to Start)' },
        { keys: ['←'], description: 'Seek Backward' },
        { keys: ['→'], description: 'Seek Forward' },
        { keys: ['Shift', '←'], description: 'Seek Backward (Large)' },
        { keys: ['Shift', '→'], description: 'Seek Forward (Large)' },
        { keys: [','], description: 'Step Backward 1 Frame' },
        { keys: ['.'], description: 'Step Forward 1 Frame' },
        { keys: ['Ctrl', 'Z'], description: 'Undo' },
        { keys: ['Ctrl', 'Y'], description: 'Redo' },
    ];

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
                className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-md m-4 p-8 text-left transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                
                <h2 id="help-modal-title" className="text-2xl font-bold text-white mb-4">Keyboard Shortcuts</h2>
                
                <div className="space-y-1 text-gray-300">
                    {shortcuts.map(sc => <Shortcut key={sc.description} keys={sc.keys} description={sc.description} />)}
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                >
                    Got It
                </button>
            </div>
        </div>
    );
};

export default HelpModal;