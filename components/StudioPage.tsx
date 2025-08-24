import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Project, ShotstackClipSelection } from '../types';
import AssetBrowserModal from './AssetBrowserModal';
import EditorToolbar from './EditorToolbar';
import HelpModal from './HelpModal';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../services/supabaseClient';
import { invokeEdgeFunction } from '../services/supabaseService';
import { sanitizeShotstackJson } from '../utils';
import { getShotstackSDK } from '../lib/shotstackSdk';
import TopInspectorPanel from './TopInspectorPanel';
import { customEditorTheme } from '../themes/customEditorTheme';

// This Supabase client is scoped to the iframe and authenticated via postMessage
let supabase: any = null;

export default function StudioPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<any>(null);
  const executionLock = useRef(false);

  const [status, setStatus] = useState('Authenticating...');
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

  // --- SDK Initialization and Event Handling ---
  useEffect(() => {
    let studioInstance: any = null;
    let isDisposed = false;

    const initStudio = async (projectData: Project) => {
      if (!hostRef.current) return;
      setStatus('Initializing Editor...');

      try {
        const { Studio } = await getShotstackSDK();
        if (isDisposed) return;

        studioInstance = new Studio({
          auth: { url: `${supabaseUrl}/functions/v1/shotstack-studio-token` },
          theme: customEditorTheme,
          assets: { proxy: `${supabaseUrl}/functions/v1/asset-proxy` },
        });
        studioRef.current = studioInstance;

        await studioInstance.load(hostRef.current);
        if (isDisposed) return;
        
        setStatus('Loading Project...');
        const sanitizedJson = sanitizeShotstackJson(projectData.shotstackEditJson);
        const initialState = sanitizedJson || {
            timeline: { background: "#000000", tracks: [ { name: 'A-Roll', clips: [] }, { name: 'Overlays', clips: [] }, { name: 'Audio', clips: [] }, { name: 'SFX', clips: [] }, { name: 'Music', clips: [] } ]},
            output: { format: 'mp4', size: projectData.videoSize === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 }}
        };
        await studioInstance.edit.loadEdit(initialState);
        if (isDisposed) return;
        
        studioInstance.edit.events.on('edit:updated', (edit: any) => postToParent('studio:save_project', edit));
        studioInstance.edit.events.on('clip:selected', (sel: any) => setSelection(sel));
        studioInstance.edit.events.on('clip:deselected', () => setSelection(null));
        studioInstance.controls.events.on('play', () => setIsPlaying(true));
        studioInstance.controls.events.on('pause', () => setIsPlaying(false));
        studioInstance.controls.events.on('stop', () => setIsPlaying(false));

        setStatus('');
      } catch (e: any) {
        setErr(e.message || 'Failed to load Studio');
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'app:load_project') {
        const { project: projectData, session: sessionData } = payload;
        if (projectData && sessionData) {
          setProject(projectData);
          setSession(sessionData);
          supabase = createClient(supabaseUrl, supabaseAnonKey);
          supabase.auth.setSession(sessionData).then(({ error }: { error: any }) => {
            if (error) {
              setErr(`Iframe authentication failed: ${error.message}`);
            } else {
              initStudio(projectData);
            }
          });
        } else {
          setErr("No project or session data received.");
        }
      }
    };

    window.addEventListener('message', handleMessage);
    postToParent('studio:ready');

    return () => {
      isDisposed = true;
      window.removeEventListener('message', handleMessage);
      studioInstance?.dispose();
    };
  }, []);

  // --- Toolbar Actions ---
  const handleRender = () => {
    if (!studioRef.current) return;
    const finalJson = studioRef.current.edit.getEdit();
    postToParent('studio:request_render', finalJson);
  };
  
  const handleAiPolish = () => aic_lockAndExecute(async () => {
    if (!studioRef.current || !project || !supabase) return;
    aic_addToast('Applying AI Polish... this may take a moment.', 'info');
    try {
      const currentEdit = studioRef.current.edit.getEdit();
      const { timeline: newTimeline } = await invokeEdgeFunction<{timeline: any}>('ai-polish', {
        timeline: currentEdit.timeline,
        script: project.script,
        projectId: project.id,
      });
      studioRef.current.edit.loadEdit({ ...currentEdit, timeline: newTimeline });
      aic_addToast('AI Polish complete!', 'success');
    } catch (e) {
      aic_addToast(e instanceof Error ? e.message : 'AI Polish failed.', 'error');
    }
  });

  const addClip = useCallback((assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
    if (!studioRef.current) return;
    const { edit, controls } = studioRef.current;
    const startSec = (controls.getTime() || 0) / 1000;
    const defaultLen = (assetType === "audio" || assetType === 'video') ? 10 : 5;

    let trackIndex = 0;
    if (assetType === 'audio') trackIndex = 2;
    if (assetType === 'sticker') trackIndex = 1;

    const newClip = {
      asset: { type: assetType, src: url },
      start: startSec,
      length: defaultLen,
      transition: { in: "fade", out: "fade" }
    };
    edit.addClip(trackIndex, newClip);
  }, []);

  const deleteClip = useCallback(() => {
    if (!studioRef.current || !selection) return;
    studioRef.current.edit.removeClip(selection.trackIndex, selection.clipIndex);
    setSelection(null);
  }, [selection]);

  if (status || err) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white p-4">
        <div className="text-center">
            {err ? (
                <>
                    <h2 className="text-2xl font-bold text-red-400">Editor Failed to Load</h2>
                    <p className="mt-2 text-gray-300">This is often due to missing or incorrect API keys in your Supabase function secrets.</p>
                    <pre className="mt-4 p-4 text-left bg-gray-800 text-red-300 rounded-md text-sm whitespace-pre-wrap">{err}</pre>
                </>
            ) : (
                <p className="text-lg font-semibold">{status}</p>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-2 md:p-4 gap-4">
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${selection ? 'h-48' : 'h-0'}`}>
        {selection && studioRef.current && (
          <TopInspectorPanel
            selection={selection}
            studio={studioRef.current.edit}
            onDeleteClip={deleteClip}
          />
        )}
      </div>
      
      <div ref={hostRef} className="flex-grow min-h-0" />
      
      <EditorToolbar
        isPlaying={isPlaying}
        onPlayPause={() => isPlaying ? studioRef.current?.controls.pause() : studioRef.current?.controls.play()}
        onStop={() => studioRef.current?.controls.stop()}
        onUndo={() => studioRef.current?.edit.undo()}
        onRedo={() => studioRef.current?.edit.redo()}
        onAddMedia={() => setIsAssetModalOpen(true)}
        onAiPolish={handleAiPolish}
        onRender={handleRender}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />
      
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