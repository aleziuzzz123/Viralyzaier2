import React, { useEffect, useRef, useState } from 'react';
import { Edit, Canvas, Controls, Timeline, VideoExporter } from "@shotstack/shotstack-studio";
import { Project, ShotstackClipSelection } from '../types';
import TopInspectorPanel from './TopInspectorPanel';
import AssetBrowserModal from './AssetBrowserModal';
import EditorToolbar from './EditorToolbar';
import HelpModal from './HelpModal';
import { supabaseUrl } from '../services/supabaseClient';

export default function StudioPage() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const executionLock = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Parent Window Communication ---
  const postToParent = (type: string, payload?: any) => {
    window.parent.postMessage({ type, payload }, '*');
  };

  const aic_addToast = (message: string, type: 'success' | 'error' | 'info') => {
      postToParent('studio:addToast', { message, type });
  };
  
  const aic_lockAndExecute = async <T,>(asyncFunction: () => Promise<T>): Promise<T | undefined> => {
      if (executionLock.current) {
          aic_addToast('Another AI process is already running. Please wait.', 'info');
          return;
      }
      executionLock.current = true;
      try {
          return await asyncFunction();
      } catch (error) {
          aic_addToast(error instanceof Error ? error.message : 'An AI operation failed', 'error');
      } finally {
          executionLock.current = false;
      }
  };

  // --- Clip Management ---
  const addClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
    if (!editorRef.current) return;
    const edit = editorRef.current;
    const ms = edit.playbackTime ?? 0;
    const startSec = Math.max(0, ms / 1000);
    const defaultLen = (assetType === "audio" || assetType === 'video') ? 10 : 5;

    let trackIndex = 0;
    if (assetType === 'audio') trackIndex = 2;
    if (assetType === 'sticker') trackIndex = 1;

    edit.addClip(trackIndex, {
      asset: { type: assetType, src: url },
      start: startSec,
      length: defaultLen,
      transition: { in: "fade", out: "fade" }
    });
  };

  const deleteClip = (trackIndex: number, clipIndex: number) => {
    if (!editorRef.current) return;
    editorRef.current.removeClip(trackIndex, clipIndex);
    setSelection(null);
  };
  
  const handleRender = () => {
      if (!editorRef.current) return;
      const finalJson = editorRef.current.getEdit();
      postToParent('studio:save_project', finalJson);
  }

  // --- Editor Initialization and Communication ---
  useEffect(() => {
    if (initialized) return; // Prevent double initialization

    const initializeEditor = async () => {
      try {
        setIsLoading(true);
        setInitialized(true);

        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Wait for project data from parent
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'app:load_project') {
            const projectData: Project = event.data.payload;
            if (projectData) {
              setProject(projectData);
              boot(projectData);
            } else {
              setErr("No project data received from the main application.");
            }
          }
        };

        window.addEventListener('message', handleMessage);
        postToParent('studio:ready');

        const boot = async (projectData: Project) => {
          try {
            // Wait for DOM elements to be ready
            for (let i = 0; i < 120; i++) {
              const c = canvasHostRef.current;
              const t = timelineHostRef.current;
              if (c && t && c.clientWidth >= 1) break;
              await new Promise(r => requestAnimationFrame(r));
            }

            const initialState = projectData.shotstackEditJson || {
              timeline: { background: "#000000", tracks: [ { clips: [] }, { clips: [] }, { clips: [] } ]},
              output: { format: 'mp4', size: { width: 1280, height: 720 }}
            };
            const size = initialState.output.size;
            const backgroundColor = initialState.timeline.background || "#000000";

            // 1. Initialize the edit with dimensions and background color (FIXED!)
            const edit = new Edit(size, backgroundColor);
            await edit.load();
            editorRef.current = edit;

            // 2. Create a canvas to display the edit
            const canvas = new Canvas(size, edit);
            await canvas.load(); // Renders to [data-shotstack-studio] element

            // 3. Load the template
            await edit.loadEdit(initialState);
            
            // 4. Add keyboard controls
            const controls = new Controls(edit);
            await controls.load();

            // 5. Add timeline for visual editing
            const timeline = new Timeline(edit, {
              width: size.width,
              height: 300
            });
            await timeline.load(); // Renders to [data-shotstack-timeline] element

            // Setup event listeners
            if (edit?.events?.on) {
              edit.events.on("clip:selected", (sel: ShotstackClipSelection) => setSelection(sel));
              edit.events.on("clip:deselected", () => setSelection(null));
              // Note: Controls events might not be available in this version
              // We'll handle playback through the edit object directly
            }

            setIsLoading(false);
          } catch (e: any) {
            setErr(e?.message ?? String(e));
            setIsLoading(false);
          }
        };

        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } catch (err) {
        console.error('Failed to initialize video editor:', err);
        setErr(err instanceof Error ? err.message : 'Unknown error occurred');
        setInitialized(false); // Reset on error
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [initialized]);

  if (err) {
    return (
      <div className="p-4 rounded-lg bg-red-900/50 border border-red-500/50 text-red-300">
        <strong>Creative Studio failed:</strong> {err}
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 gap-4">
      {isLoading && <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50 text-white">Starting Creative Studio...</div>}
      
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${selection ? 'h-48' : 'h-0'}`}>
        {selection && editorRef.current && (
          <TopInspectorPanel
            selection={selection}
            edit={editorRef.current}
            onDeleteClip={deleteClip}
          />
        )}
      </div>

      <div className="flex-grow relative min-h-0">
        <div ref={canvasHostRef} data-shotstack-studio className="w-full h-full bg-black rounded-lg" />
      </div>

      <div ref={timelineHostRef} data-shotstack-timeline className="w-full h-80 bg-gray-800 rounded-lg" />

      <EditorToolbar 
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (isPlaying) {
            editorRef.current?.pause();
          } else {
            editorRef.current?.play();
          }
        }}
        onStop={() => editorRef.current?.stop()}
        onUndo={() => editorRef.current?.undo()}
        onRedo={() => editorRef.current?.redo()}
        onAddMedia={() => setIsAssetModalOpen(true)}
        onAiPolish={() => aic_addToast('AI Polish coming soon!', 'info')}
        onRender={handleRender}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />

      {isAssetModalOpen && (
        <AssetBrowserModal
          project={project}
          onClose={() => setIsAssetModalOpen(false)}
          onAddClip={addClip}
          addToast={aic_addToast}
          lockAndExecute={aic_lockAndExecute}
        />
      )}

      {isHelpModalOpen && (
        <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
        />
      )}
    </div>
  );
}