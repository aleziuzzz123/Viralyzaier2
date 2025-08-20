import React, { useEffect, useRef, useState } from 'react';
import { Edit, Controls } from '@shotstack/shotstack-studio';
import { getErrorMessage } from '../utils';
import Loader from './Loader';
import { UndoIcon, RedoIcon, PlayIcon, PauseIcon, HelpCircleIcon } from './Icons';
import HelpModal from './HelpModal';

type Props = {
  editJson?: any;
  theme?: object;
  onReady?: (edit: Edit) => void;
  onError?: (error: Error) => void;
  onChange?: (edit: any) => void;
};

const ShotstackStudio: React.FC<Props> = ({ editJson, theme, onReady, onError, onChange }) => {
    const studioEl = useRef<HTMLDivElement>(null);
    const timelineEl = useRef<HTMLDivElement>(null);
    const instances = useRef<{ edit?: Edit; controls?: Controls }>({});
    const hasInitialized = useRef(false);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    useEffect(() => {
        if (hasInitialized.current || !studioEl.current || !timelineEl.current) {
            return;
        }
        hasInitialized.current = true;
        
        let mounted = true;

        const boot = async () => {
            try {
                const edit = new Edit({
                    element: studioEl.current!,
                    timeline: timelineEl.current!,
                    theme: theme || 'dark',
                    onChange: onChange,
                } as any);

                if (!mounted) { (edit as any).dispose(); return; }

                const controls = new Controls(edit);
                await controls.load();

                // Listen to playback events to sync UI
                edit.events.on('play', () => setIsPlaying(true));
                edit.events.on('pause', () => setIsPlaying(false));
                edit.events.on('stop', () => setIsPlaying(false));
                
                instances.current.edit = edit;
                instances.current.controls = controls;

                onReady?.(edit);
                setStatus('ready');
            } catch (err) {
                const message = getErrorMessage(err);
                console.error('Shotstack Studio init failed:', err);
                setError(message);
                setStatus('error');
                onError?.(err instanceof Error ? err : new Error(message));
            }
        };

        boot();

        return () => {
            mounted = false;
            (instances.current.edit as any)?.dispose();
            (instances.current.controls as any)?.dispose();
            instances.current = {};
            hasInitialized.current = false;
        };
    }, [onReady, onError, onChange, theme]);

    useEffect(() => {
        const loadData = async () => {
            if (status === 'ready' && instances.current.edit && editJson) {
                try {
                    await instances.current.edit.loadEdit(editJson);
                } catch (err) {
                    const message = `Failed to load new edit data: ${getErrorMessage(err)}`;
                    console.error(message, err);
                    setError(message);
                    setStatus('error');
                    onError?.(err instanceof Error ? err : new Error(message));
                }
            }
        };
        loadData();
    }, [editJson, status, onError]);

    const handlePlayPause = () => {
        if (!instances.current.edit) return;
        if (isPlaying) {
            instances.current.edit.pause();
        } else {
            instances.current.edit.play();
        }
    };
    
    const handleUndo = () => instances.current.edit?.undo();
    const handleRedo = () => instances.current.edit?.redo();
    
    return (
        <div className="w-full h-full flex flex-col bg-gray-950 rounded-lg overflow-hidden">
            <div className="flex-1 min-h-[300px] relative">
                <div ref={studioEl} className="w-full h-full" />
                 {(status === 'loading' || status === 'error') && (
                    <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-10 p-4">
                        {status === 'loading' && (
                            <div className="text-center">
                                <Loader />
                                <p className="mt-4 text-lg font-semibold text-white">Loading Editor...</p>
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="bg-red-900/50 border border-red-500/50 p-6 rounded-lg max-w-lg text-center">
                                <h3 className="text-xl font-bold text-red-300">Editor Failed to Initialize</h3>
                                <p className="mt-2 text-red-200 text-sm">{error}</p>
                                <p className="mt-4 text-xs text-gray-400">
                                    This can happen during development with React’s Strict Mode. If the error persists, please check the console for more details.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
             <div className="h-10 flex-shrink-0 bg-gray-800 border-t-2 border-gray-700 flex items-center justify-center gap-4">
                <button onClick={handleUndo} className="p-2 text-gray-300 hover:text-white" title="Undo (Ctrl+Z)"><UndoIcon className="w-5 h-5"/></button>
                <button onClick={handlePlayPause} className="p-2 text-gray-300 hover:text-white" title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
                    {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                </button>
                <button onClick={handleRedo} className="p-2 text-gray-300 hover:text-white" title="Redo (Ctrl+Y)"><RedoIcon className="w-5 h-5"/></button>
                 <button onClick={() => setIsHelpOpen(true)} className="p-2 text-gray-300 hover:text-white absolute right-4" title="Help"><HelpCircleIcon className="w-5 h-5"/></button>
            </div>
            <div className="h-[240px] flex-shrink-0 bg-gray-800 border-t-2 border-gray-700">
                <div ref={timelineEl} className="w-full h-full" />
            </div>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};

export default ShotstackStudio;