import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ShotstackClipSelection } from '../types';
import EditorToolbar from './EditorToolbar';
import AssetBrowserModal from './AssetBrowserModal';
import HelpModal from './HelpModal';
import TopInspectorPanel from './TopInspectorPanel'; // The new inspector panel
import { sanitizeShotstackJson } from '../utils';
import { customEditorTheme } from '../themes/customEditorTheme';

// Direct import of the Shotstack SDK components, removing the need for a separate loader.
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";

// Helper to create a default edit object for new projects
const createFallbackEdit = (project: any) => ({
  timeline: { 
    background: "#000000", 
    tracks: [
      { name: 'A-Roll', clips: [] }, 
      { name: 'Overlays', clips: [] }, 
      { name: 'Audio', clips: [] }, 
      { name: 'SFX', clips: [] }, 
      { name: 'Music', clips: [] }
    ]
  },
  output: { 
    format: 'mp4', 
    size: project.videoSize === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 }
  }
});

const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, addToast, handleRenderProject, lockAndExecute } = useAppContext();

  // Refs for SDK instances
  const editRef = useRef<InstanceType<typeof Edit> | null>(null);
  const controlsRef = useRef<InstanceType<typeof Controls> | null>(null);

  // Refs for DOM host elements
  const studioHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let disposed = false;
    let edit: InstanceType<typeof Edit>, canvas: InstanceType<typeof Canvas>, controls: InstanceType<typeof Controls>, timeline: InstanceType<typeof Timeline>;

    const initializeEditor = async () => {
      if (!studioHostRef.current || !timelineHostRef.current || !activeProjectDetails) {
        return;
      }
      setIsLoading(true);

      try {
        await new Promise(r => requestAnimationFrame(r)); // Ensure DOM is painted
        if (disposed) return;
        
        const initialState = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson) || createFallbackEdit(activeProjectDetails);
        
        edit = new Edit(initialState.output.size, initialState.timeline.background);
        await edit.load();
        editRef.current = edit;
        
        canvas = new Canvas(initialState.output.size, edit);
        await canvas.load(studioHostRef.current);
        
        controls = new Controls(edit);
        await controls.load();
        controlsRef.current = controls;

        timeline = new Timeline(edit, { width: timelineHostRef.current.clientWidth, height: 300 });
        timeline.setTheme(customEditorTheme);
        await timeline.load(timelineHostRef.current);
        
        await edit.loadEdit(initialState);
        
        // --- Event Listeners ---
        const handleStateChange = () => { if (!disposed) handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: edit.getEdit() }); };
        const handleSelection = (sel: any) => { if (!disposed) setSelection(sel); };
        const handlePlay = () => { if (!disposed) setIsPlaying(true); };
        const handlePause = () => { if (!disposed) setIsPlaying(false); };
        const handleStop = () => { if (!disposed) setIsPlaying(false); };

        edit.events.on('edit:updated', handleStateChange);
        edit.events.on('clip:selected', handleSelection);
        edit.events.on('clip:deselected', () => handleSelection(null));
        controls.events.on('play', handlePlay);
        controls.events.on('pause', handlePause);
        controls.events.on('stop', handleStop);

        if (!disposed) setIsLoading(false);
      } catch (e) {
        console.error("Failed to initialize Shotstack Studio:", e);
        if (!disposed) addToast(e instanceof Error ? e.message : 'Editor failed to load.', 'error');
      }
    };

    initializeEditor();

    return () => {
      disposed = true;
      try { timeline?.dispose(); } catch {}
      try { canvas?.dispose(); } catch {}
      editRef.current = null;
      controlsRef.current = null;
    };
  }, [activeProjectDetails, addToast, handleUpdateProject]);

  const handleAiPolish = () => lockAndExecute(async () => {
    // This functionality would require a backend function, which is out of scope for the fix.
    // Placeholder for now.
    addToast('AI Polish feature coming soon!', 'info');
  });

  const handleRender = () => {
    if (editRef.current) {
      handleRenderProject(activeProjectDetails!.id, editRef.current.getEdit());
    }
  };
  
  const handleAddClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
    const edit = editRef.current;
    if (!edit) return;
    const startSec = Math.max(0, edit.playbackTime / 1000);
    const defaultLen = (assetType === "audio" || assetType === 'video') ? 10 : 5;

    let trackIndex = 0; // A-Roll
    if (assetType === 'audio') trackIndex = 2; // Audio
    if (assetType === 'sticker' || assetType === 'image' || (assetType as any) === 'title') trackIndex = 1; // Overlays
    
    const newClip = {
      asset: { type: assetType, src: url },
      start: startSec,
      length: defaultLen,
      transition: { in: "fade", out: "fade" }
    };
    edit.addClip(trackIndex, newClip);
  };
  
  const handleDeleteClip = () => {
    if (editRef.current && selection) {
        editRef.current.removeClip(selection.trackIndex, selection.clipIndex);
        setSelection(null);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white gap-2">
       {isLoading && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50 text-white font-semibold text-lg">
              Loading Editor...
          </div>
       )}
       <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${selection ? 'h-56' : 'h-0'}`}>
          {selection && editRef.current && (
             <TopInspectorPanel
                selection={selection}
                studio={editRef.current}
                onDeleteClip={handleDeleteClip}
             />
          )}
       </div>
       <div className="flex-grow relative min-h-0 bg-black rounded-lg">
          <div ref={studioHostRef} data-shotstack-studio className="w-full h-full" />
       </div>
       <div className="flex-shrink-0 min-h-[250px] bg-gray-900">
         <div ref={timelineHostRef} data-shotstack-timeline className="w-full h-full" />
       </div>
       <div className="flex-shrink-0">
          <EditorToolbar
            isPlaying={isPlaying}
            onPlayPause={() => isPlaying ? controlsRef.current?.pause() : controlsRef.current?.play()}
            onStop={() => controlsRef.current?.stop()}
            onUndo={() => editRef.current?.undo()}
            onRedo={() => editRef.current?.redo()}
            onAddMedia={() => setIsAssetModalOpen(true)}
            onAiPolish={handleAiPolish}
            onRender={handleRender}
            onOpenHelp={() => setIsHelpModalOpen(true)}
          />
       </div>
       {isAssetModalOpen && activeProjectDetails && (
         <AssetBrowserModal
            project={activeProjectDetails}
            session={null}
            onClose={() => setIsAssetModalOpen(false)}
            onAddClip={handleAddClip}
            addToast={addToast}
            lockAndExecute={lockAndExecute}
         />
       )}
       <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
};

export default CreativeStudio;
