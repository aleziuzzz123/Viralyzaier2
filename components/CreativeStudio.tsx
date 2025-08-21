import React, { useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, MagicWandIcon } from './Icons';
import AssetAndInspectorPanel from './AssetAndInspectorPanel';
import ShotstackStudio from './ShotstackStudio';
import { VideoEditorHandles } from './VideoEditor';
import Loader from './Loader';
import { ShotstackClipSelection } from '../types';
import { invokeEdgeFunction } from '../services/supabaseService';
import { getErrorMessage } from '../utils';

const CreativeStudio: React.FC = () => {
    const { addToast, activeProjectDetails: project, handleUpdateProject } = useAppContext();
    const editorRef = useRef<VideoEditorHandles>(null);
    const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);

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
    
        // Step 7, Part 1: Get the complete edit JSON for API submission
        const editJson = editorRef.current.getEdit();
    
        if (!editJson || !editJson.timeline) {
            addToast("Cannot start render: The timeline is empty or invalid.", "error");
            return;
        }
    
        // Auto-adjust soundtrack length to match the final video duration.
        const totalDurationInSeconds = editorRef.current.getTotalDuration() / 1000;
        if (editJson.timeline?.tracks) {
            const musicTrack = editJson.timeline.tracks.find((t: any) => t.name === 'Music');
            if (musicTrack?.clips?.[0]) {
                musicTrack.clips[0].length = totalDurationInSeconds;
            }
        }
    
        try {
            // First, save the final state of the editor to our database
            await handleUpdateProject(project.id, { shotstackEditJson: editJson });
    
            // Step 7, Part 2: Submit to the Shotstack API for rendering (via our secure proxy)
            const { renderId } = await invokeEdgeFunction<{ renderId: string }>('shotstack-render', {
                edit: editJson,
                projectId: project.id,
            });
    
            if (renderId) {
                // Step 7, Part 3: Save the render ID for status checking (handled by our webhook)
                await handleUpdateProject(project.id, {
                    shotstackRenderId: renderId,
                    status: 'Rendering',
                    workflowStep: 4 // Move to the Analysis step to await completion
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
    
    if (!project) {
        return <div className="min-h-[80vh] flex items-center justify-center"><Loader /></div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
            <div className="lg:col-span-1 h-full min-h-[400px]">
                <AssetAndInspectorPanel 
                    studio={null} 
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
                />
                <div className="flex-shrink-0 flex items-center justify-center gap-4">
                    <button onClick={handleAiPolish} className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition-colors">
                        <MagicWandIcon className="w-5 h-5 mr-2" /> AI Polish
                    </button>
                    <button onClick={handleRender} className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors">
                        <SparklesIcon className="w-5 h-5 mr-2" /> Render Video & Proceed
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreativeStudio;
