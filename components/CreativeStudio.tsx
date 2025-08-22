import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ShotstackClipSelection } from '../types';
import VideoEditor, { VideoEditorHandles } from './VideoEditor';
import EditorToolbar from './EditorToolbar';
import AssetAndInspectorPanel from './AssetAndInspectorPanel';
import HelpModal from './HelpModal';
import { getErrorMessage } from '../utils';
import { submitRender } from '../services/shotstackService';
import { saveTimelineToCache, loadTimelineFromCache } from '../utils';

const CreativeStudio: React.FC = () => {
    const { activeProjectDetails, handleUpdateProject, addToast, lockAndExecute } = useAppContext();
    const editorRef = useRef<VideoEditorHandles>(null);
    const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [initialEdit, setInitialEdit] = useState<any>(null);

    useEffect(() => {
        const initializeEditorState = async () => {
            if (activeProjectDetails?.shotstackEditJson) {
                setInitialEdit(activeProjectDetails.shotstackEditJson);
            } else if (activeProjectDetails) {
                const cachedTimeline = await loadTimelineFromCache(activeProjectDetails.id);
                if (cachedTimeline) {
                    setInitialEdit(cachedTimeline);
                } else {
                    // Default to a blank canvas if no script-to-timeline logic exists yet.
                    const size = activeProjectDetails.videoSize === '9:16' 
                        ? { width: 576, height: 1024 } 
                        : { width: 1024, height: 576 };

                    const placeholderEdit = {
                        timeline: {
                            background: '#000000',
                            tracks: [
                                { clips: [] }, // Video track
                                { clips: [] }, // Audio track
                            ],
                        },
                        output: {
                            format: 'mp4',
                            size: size,
                        },
                    };
                    setInitialEdit(placeholderEdit);
                }
            }
        };
        initializeEditorState();
    }, [activeProjectDetails]);

    const handleStateChange = useCallback(async (newState: any) => {
        if (activeProjectDetails) {
            await saveTimelineToCache(activeProjectDetails.id, newState);
        }
    }, [activeProjectDetails]);

    const handleAddClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
        addToast(`Adding ${assetType} is not yet implemented.`, 'info');
        console.log('Add clip:', assetType, url);
    };

    const handleDeleteClip = (trackIndex: number, clipIndex: number) => {
        addToast(`Deleting clip is not yet implemented.`, 'info');
        console.log('Delete clip:', trackIndex, clipIndex);
    };

    const handleAiPolish = () => {
        addToast('AI Polish is coming soon!', 'info');
    };

    const handleRender = () => lockAndExecute(async () => {
        if (!editorRef.current || !activeProjectDetails) return;
        const currentEdit = editorRef.current.getEditorState();
        addToast('Starting video render...', 'info');

        try {
            await handleUpdateProject(activeProjectDetails.id, {
                shotstackEditJson: currentEdit,
                status: 'Rendering'
            });

            const { renderId } = await submitRender(currentEdit, activeProjectDetails.id);
            await handleUpdateProject(activeProjectDetails.id, { shotstackRenderId: renderId });
            addToast(`Render submitted! ID: ${renderId}. You'll be notified on completion.`, 'success');

            handleUpdateProject(activeProjectDetails.id, { workflowStep: 4 });

        } catch (e) {
            addToast(`Render submission failed: ${getErrorMessage(e)}`, 'error');
            handleUpdateProject(activeProjectDetails.id, { status: 'Scripting' });
        }
    });

    if (!activeProjectDetails || !initialEdit) {
        return <div className="text-center p-8">Loading Creative Studio...</div>;
    }

    return (
        <div className="h-[calc(100vh-12rem)] flex flex-col gap-4">
            <div className="flex-grow flex gap-4 h-[calc(100%-6rem)]">
                <div className="w-2/3 h-full">
                    {initialEdit && (
                         <VideoEditor
                            ref={editorRef}
                            initialState={initialEdit}
                            onSelectionChange={setSelection}
                            onIsPlayingChange={setIsPlaying}
                            onStateChange={handleStateChange}
                        />
                    )}
                </div>
                <div className="w-1/3 h-full">
                    <AssetAndInspectorPanel
                        studio={editorRef.current}
                        selection={selection}
                        onAddClip={handleAddClip}
                        onDeleteClip={handleDeleteClip}
                    />
                </div>
            </div>
            <div className="flex-shrink-0">
                <EditorToolbar
                    editorRef={editorRef}
                    isPlaying={isPlaying}
                    onAiPolish={handleAiPolish}
                    onRender={handleRender}
                    onOpenHelp={() => setIsHelpOpen(true)}
                />
            </div>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};

export default CreativeStudio;
