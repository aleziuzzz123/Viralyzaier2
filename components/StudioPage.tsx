import React, { useEffect, useRef, useState } from 'react';
import { Project, ShotstackClipSelection } from '../types';
import VideoEditor, { VideoEditorHandles } from './VideoEditor';
import TopInspectorPanel from './TopInspectorPanel';
import AssetBrowserModal from './AssetBrowserModal';
import EditorToolbar from './EditorToolbar';
import HelpModal from './HelpModal';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../services/supabaseClient';
import { invokeEdgeFunction } from '../services/supabaseService';

// This Supabase client instance is scoped to the iframe and will be authenticated
// once the session is received from the parent window.
let supabase: any = null;

export default function StudioPage() {
  const editorRef = useRef<VideoEditorHandles>(null);
  const executionLock = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [session, setSession] = useState<any | null>(null);
  
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
    const editor = editorRef.current;
    const startSec = Math.max(0, (editor.getPlaybackTime() || 0) / 1000);
    const defaultLen = (assetType === "audio" || assetType === 'video') ? 10 : 5;

    let trackIndex = 0; // A-Roll
    if (assetType === 'audio') trackIndex = 2; // Audio
    if (assetType === 'sticker') trackIndex = 1; // Overlays

    const newClip = {
      asset: { type: assetType, src: url },
      start: startSec,
      length: defaultLen,
      transition: { in: "fade", out: "fade" }
    };

    // The component's addClip method needs the track index and the clip object
    // but the SDK method it calls might be different. Let's assume the handle is correct.
    (editor as any).addClip(trackIndex, newClip);
  };

  const deleteClip = () => {
    if (!editorRef.current || !selection) return;
    editorRef.current.removeClip(selection.trackIndex, selection.clipIndex);
    setSelection(null);
  };
  
  const handleRender = () => {
      if (!editorRef.current) return;
      const finalJson = editorRef.current.getEdit();
      postToParent('studio:request_render', finalJson);
  }
  
  const handleAiPolish = () => aic_lockAndExecute(async () => {
      if (!editorRef.current || !project || !supabase) {
          aic_addToast("Cannot perform AI Polish: editor, project, or authenticated session is missing.", "error");
          return;
      }
      aic_addToast('Applying AI Polish... this may take a moment.', 'info');
      try {
        const currentEdit = editorRef.current.getEdit();
        // Use the authenticated `invokeEdgeFunction` for secure calls
        const { timeline: newTimeline } = await invokeEdgeFunction<{timeline: any}>('ai-polish', {
            timeline: currentEdit.timeline,
            script: project.script,
            projectId: project.id,
        });
        editorRef.current.loadEdit({ ...currentEdit, timeline: newTimeline });
        aic_addToast('AI Polish complete!', 'success');
      } catch (e) {
        aic_addToast(e instanceof Error ? e.message : 'AI Polish failed.', 'error');
      }
  });

  // --- Editor Initialization and Authentication ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        if (type === 'app:load_project') {
            const { project: projectData, session: sessionData } = payload;
            if (projectData && sessionData) {
                setProject(projectData);
                setSession(sessionData);

                // **AUTHENTICATION BRIDGE: CRITICAL FIX**
                // Create a new Supabase client for this iframe instance and set the session.
                // This makes all subsequent `invokeEdgeFunction` calls within this iframe authenticated.
                supabase = createClient(supabaseUrl, supabaseAnonKey);
                supabase.auth.setSession(sessionData).then(({ error }: { error: any }) => {
                    if (error) {
                        setErr(`Iframe authentication failed: ${error.message}`);
                        aic_addToast(`Iframe authentication failed: ${error.message}`, 'error');
                    } else {
                       setIsLoading(false); // Authentication successful, ready to render the editor
                    }
                });

            } else {
                setErr("No project or session data received from the main application.");
                setIsLoading(false);
            }
        }
    };
    window.addEventListener('message', handleMessage);
    // Signal to the parent window that the iframe is ready to receive data
    postToParent('studio:ready');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (err) {
    return (
      <div className="p-4 rounded-lg bg-red-900/50 border border-red-500/50 text-red-300 h-full flex items-center justify-center">
        <strong>Creative Studio failed to load:</strong> {err}
      </div>
    );
  }

  if (isLoading || !project) {
      return <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50 text-white">Authenticating & Loading Editor...</div>
  }

  // Define the initial state for the editor, with a fallback for new projects
  const initialState = project.shotstackEditJson || {
      timeline: { background: "#000000", tracks: [ { name: 'A-Roll', clips: [] }, { name: 'Overlays', clips: [] }, { name: 'Audio', clips: [] }, { name: 'SFX', clips: [] }, { name: 'Music', clips: [] } ]},
      output: { format: 'mp4', size: project.videoSize === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 }}
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 gap-4">
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${selection ? 'h-48' : 'h-0'}`}>
        {selection && editorRef.current && (
          <TopInspectorPanel
            selection={selection}
            edit={editorRef.current as any}
            onDeleteClip={deleteClip}
          />
        )}
      </div>

      <div className="flex-grow relative min-h-0">
         <VideoEditor 
            ref={editorRef}
            initialState={initialState}
            onStateChange={(newState) => postToParent('studio:save_project', newState)}
            onSelectionChange={setSelection}
            onIsPlayingChange={setIsPlaying}
        />
      </div>

      <div className="flex-shrink-0">
        <EditorToolbar
            isPlaying={isPlaying}
            onPlayPause={() => isPlaying ? editorRef.current?.pause() : editorRef.current?.play()}
            onStop={() => editorRef.current?.stop()}
            onUndo={() => editorRef.current?.undo()}
            onRedo={() => editorRef.current?.redo()}
            onAddMedia={() => setIsAssetModalOpen(true)}
            onAiPolish={handleAiPolish}
            onRender={handleRender}
            onOpenHelp={() => setIsHelpModalOpen(true)}
        />
      </div>
      
      {isAssetModalOpen && (
        <AssetBrowserModal
          project={project}
          session={session}
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