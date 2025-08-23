import React, { useEffect, useRef, useState } from 'react';
import { getShotstackSDK } from '../lib/shotstackSdk';
import { Project, ShotstackClipSelection } from '../types';
import TopInspectorPanel from './TopInspectorPanel';
import AssetBrowserModal from './AssetBrowserModal';
import EditorToolbar from './EditorToolbar';
import HelpModal from './HelpModal';

type SDK = typeof import("@shotstack/shotstack-studio");

export default function StudioPage() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null); // Actually VideoEditorHandles, but type is in that file
  const controlsRef = useRef<any>(null);
  const executionLock = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  
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
      // aic_addToast('Project saved! Starting render...', 'info');
      // In a real app, you would now call your backend to start the render
  }

  // --- Editor Initialization and Communication ---
  useEffect(() => {
    let disposed = false;
    let canvas: any, timeline: any, controls: any;

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
        for (let i = 0; i < 120; i++) {
          const c = canvasHostRef.current;
          const t = timelineHostRef.current;
          if (c && t && c.clientWidth >= 1) break;
          await new Promise(r => requestAnimationFrame(r));
        }
        if (disposed) return;

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();
        if (disposed) return;

        const initialState = projectData.shotstackEditJson || {
            timeline: { background: "#000000", tracks: [ { clips: [] }, { clips: [] }, { clips: [] } ]},
            output: { format: 'mp4', size: { width: 1280, height: 720 }}
        };
        const size = initialState.output.size;

        const edit = new Edit(size);
        await edit.load();
        editorRef.current = edit;
        if (disposed) return;

        canvas = new Canvas(size, edit);
        await canvas.load(canvasHostRef.current!);
        if (disposed) return;

        await edit.loadEdit(initialState);
        
        controls = new Controls(edit);
        await controls.load();
        controlsRef.current = controls;
        if (disposed) return;

        const tlWidth = timelineHostRef.current?.clientWidth || size.width;
        timeline = new Timeline(edit, { width: tlWidth, height: 300 });
        await timeline.load(timelineHostRef.current!);
        if (disposed) return;

        // Setup event listeners
        if (edit?.events?.on) {
          edit.events.on("clip:selected", (sel: ShotstackClipSelection) => !disposed && setSelection(sel));
          edit.events.on("clip:deselected", () => !disposed && setSelection(null));
          controls.events.on('play', () => !disposed && setIsPlaying(true));
          controls.events.on('pause', () => !disposed && setIsPlaying(false));
          controls.events.on('stop', () => !disposed && setIsPlaying(false));
          // Auto-save on change
          edit.events.on('edit:updated', () => {
              if (!disposed) {
                  postToParent('studio:save_project', edit.getEdit());
              }
          });
        }

        if (!disposed) setIsLoading(false);
      } catch (e: any) {
        if (!disposed) { setErr(e?.message ?? String(e)); setIsLoading(false); }
      }
    };

    return () => {
      disposed = true;
      window.removeEventListener('message', handleMessage);
      try { timeline?.dispose?.(); } catch {}
      try { canvas?.dispose?.(); } catch {}
    };
  }, []);

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

      <div className="flex-shrink-0">
        <EditorToolbar
            isPlaying={isPlaying}
            onPlayPause={() => {
                if (isPlaying) {
                    controlsRef.current?.pause();
                } else {
                    controlsRef.current?.play();
                }
            }}
            onStop={() => controlsRef.current?.stop()}
            onUndo={() => editorRef.current?.undo()}
            onRedo={() => editorRef.current?.redo()}
            onAddMedia={() => setIsAssetModalOpen(true)}
            onAiPolish={() => aic_addToast('AI Polish coming soon!', 'info')}
            onRender={handleRender}
            onOpenHelp={() => setIsHelpModalOpen(true)}
        />
      </div>
      
      <div className="flex-shrink-0 h-72">
        <div ref={timelineHostRef} data-shotstack-timeline className="w-full h-full bg-gray-800/50 rounded-lg" />
      </div>
      
      {isAssetModalOpen && (
        <AssetBrowserModal
          project={project}
          onClose={() => setIsAssetModalOpen(false)}
          onAddClip={addClip}
          addToast={aic_addToast}
          lockAndExecute={aic_lockAndExecute}
        />
      )}
      
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}