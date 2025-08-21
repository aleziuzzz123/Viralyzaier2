import React from 'react';
import { VideoEditorHandles } from './VideoEditor';
import { PlayIcon, PauseIcon, StopCircleIcon, UndoIcon, RedoIcon, HelpCircleIcon, MagicWandIcon, SparklesIcon } from './Icons';

interface EditorToolbarProps {
    editorRef: React.RefObject<VideoEditorHandles>;
    isPlaying: boolean;
    onAiPolish: () => void;
    onRender: () => void;
    onOpenHelp: () => void;
}

const ToolbarButton: React.FC<{ onClick?: () => void; children: React.ReactNode; title: string }> = ({ onClick, children, title }) => (
    <button onClick={onClick} title={title} className="p-2 text-gray-300 bg-gray-700/50 rounded-md hover:bg-gray-700 hover:text-white transition-colors">
        {children}
    </button>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editorRef, isPlaying, onAiPolish, onRender, onOpenHelp }) => {
    
    const handlePlayPause = () => {
        if (isPlaying) {
            editorRef.current?.pause();
        } else {
            editorRef.current?.play();
        }
    };
    
    return (
        <div className="flex-shrink-0 bg-gray-800/50 p-2 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
                <ToolbarButton onClick={handlePlayPause} title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </ToolbarButton>
                 <ToolbarButton onClick={() => editorRef.current?.stop()} title="Stop (J)">
                    <StopCircleIcon className="w-6 h-6" />
                </ToolbarButton>
            </div>

             <div className="flex items-center gap-2">
                 <ToolbarButton onClick={() => editorRef.current?.undo()} title="Undo (Ctrl+Z)">
                    <UndoIcon className="w-6 h-6" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editorRef.current?.redo()} title="Redo (Ctrl+Y)">
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