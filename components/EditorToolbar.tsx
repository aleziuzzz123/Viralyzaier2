import React from 'react';
import { PlayIcon, PauseIcon, StopCircleIcon, UndoIcon, RedoIcon, HelpCircleIcon, MagicWandIcon, SparklesIcon, PlusIcon } from './Icons';

interface EditorToolbarProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    onStop: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onAiPolish: () => void;
    onRender: () => void;
    onOpenHelp: () => void;
    onAddMedia: () => void;
}

const ToolbarButton: React.FC<{ onClick?: () => void; children: React.ReactNode; title: string }> = ({ onClick, children, title }) => (
    <button onClick={onClick} title={title} className="p-2 text-gray-300 bg-gray-700/50 rounded-md hover:bg-gray-700 hover:text-white transition-colors">
        {children}
    </button>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({ 
    isPlaying, 
    onPlayPause, 
    onStop, 
    onUndo, 
    onRedo, 
    onAiPolish, 
    onRender, 
    onOpenHelp, 
    onAddMedia 
}) => {
    
    return (
        <div className="flex-shrink-0 bg-gray-800/50 p-2 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
                 <button onClick={onAddMedia} className="inline-flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-colors text-sm">
                    <PlusIcon className="w-5 h-5 mr-2" /> Add Media
                </button>
            </div>
            <div className="flex items-center gap-2">
                <ToolbarButton onClick={onPlayPause} title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </ToolbarButton>
                 <ToolbarButton onClick={onStop} title="Stop (J)">
                    <StopCircleIcon className="w-6 h-6" />
                </ToolbarButton>
            </div>

             <div className="flex items-center gap-2">
                 <ToolbarButton onClick={onUndo} title="Undo (Ctrl+Z)">
                    <UndoIcon className="w-6 h-6" />
                </ToolbarButton>
                <ToolbarButton onClick={onRedo} title="Redo (Ctrl+Y)">
                    <RedoIcon className="w-6 h-6" />
                </ToolbarButton>
                 <ToolbarButton onClick={onOpenHelp} title="Keyboard Shortcuts">
                    <HelpCircleIcon className="w-6 h-6" />
                </ToolbarButton>
            </div>
            
            <div className="flex items-center gap-2">
                 <button onClick={onAiPolish} className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors text-sm">
                    <MagicWandIcon className="w-5 h-5 mr-2" /> AI Polish
                </button>
                <button onClick={onRender} className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm">
                    <SparklesIcon className="w-5 h-5 mr-2" /> Render & Proceed
                </button>
            </div>
        </div>
    );
};

export default EditorToolbar;