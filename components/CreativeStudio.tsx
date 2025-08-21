import React, { useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import AssetAndInspectorPanel from './AssetAndInspectorPanel';
import ShotstackStudio from './ShotstackStudio';
import { VideoEditorHandles } from './VideoEditor';
import Loader from './Loader';
import { ShotstackClipSelection } from '../types';
import { invokeEdgeFunction } from '../services/supabaseService';
import { getErrorMessage } from '../utils';
import EditorToolbar from './EditorToolbar';
import HelpModal from './HelpModal';

const CreativeStudio: React.FC = () => {
    const { addToast, activeProjectDetails: project, handleUpdateProject } = useAppContext();
    const editorRef = useRef<VideoEditorHandles>(null);
    const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const handleAiPolish = async () => {
        const currentEdit = editorRef.current?.getEdit();
        if (!currentEdit || !project?.script) {
            addToast("Editor is not ready or script is missing.", "error");
            return;
        }
        addToast("AI is polishing your video...", "info");
        try {
            const { timeline: polishedTimeline } = await invokeEdgeFunction<{ timeline: any }>('ai-polish', {
                timeline: currentEdit.timeline,
                script: project.script,
                projectId: project.id,
            });
            currentEdit.timeline = polishedTimeline;
            editorRef.current?.loadEdit(currentEdit);
            addToast("AI Polish complete!", "success");
        } catch(e) {
            addToast(`AI Polish failed: ${getErrorMessage(e)}`, 'error');
        }
    };

    const handleRender = async () => {
        if (!editorRef.current || !project) {
            addToast("Cannot start render: Editor or project is not available.", "error");
            return;
        }
    
        addToast("Preparing video for rendering...", "info");
    
        const editJson = editorRef.current.getEdit();
    
        if (!editJson || !editJson.timeline) {
            addToast("Cannot start render: The timeline is empty or invalid.", "error");
            return;
        }
    
        const totalDurationInSeconds = editorRef.current.getTotalDuration() / 1000;
        if (editJson.timeline?.tracks) {
            const musicTrack = editJson.timeline.tracks.find((t: any) => t.name === 'Music');
            if (musicTrack?.clips?.[0]) {
                musicTrack.clips[0].length = totalDurationInSeconds;
            }
        }
    
        try {
            await handleUpdateProject(project.id, { shotstackEditJson: editJson });
    
            const { renderId } = await invokeEdgeFunction<{ renderId: string }>('shotstack-render', {
                edit: editJson,
                projectId: project.id,
            });
    
            if (renderId) {
                await handleUpdateProject(project.id, {
                    shotstackRenderId: renderId,
                    status: 'Rendering',
                    workflowStep: 4
                });
                addToast("Render job submitted! We'll notify you when it's done.", "success");
            } else {
                throw new Error("Render submission did not return an ID.");
            }
        } catch (e) {
            addToast(`Render failed: ${getErrorMessage(e)}`, 'error');
        }
    };

    const handleAddClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
        editorRef.current?.addClip(assetType, url);
    };

    const handleDeleteClip = (trackIndex: number, clipIndex: number) => {
        editorRef.current?.deleteClip(trackIndex, clipIndex);
    };

    const handlePlaybackChange = useCallback((playing: boolean) => {
        setIsPlaying(playing);
    }, []);
    
    if (!project) {
        return <div className="min-h-[80vh] flex items-center justify-center"><Loader /></div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
            <div className="lg:col-span-1 h-full min-h-[400px]">
                <AssetAndInspectorPanel 
                    studio={editorRef.current} 
                    selection={selection} 
                    onAddClip={handleAddClip}
                    onDeleteClip={handleDeleteClip}
                />
            </div>
            <div className="lg:col-span-2 flex flex-col h-full gap-4">
                <ShotstackStudio
                    editorRef={editorRef}
                    project={project}
                    onSelectionChange={setSelection}
                    onPlaybackChange={handlePlaybackChange}
                />
                <EditorToolbar 
                    editorRef={editorRef}
                    isPlaying={isPlaying}
                    onAiPolish={handleAiPolish}
                    onRender={handleRender}
                    onOpenHelp={() => setIsHelpModalOpen(true)}
                />
            </div>
            <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
        </div>
    );
};

export default CreativeStudio;