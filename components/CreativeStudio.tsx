// components/CreativeStudio.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { deproxyifyEdit, proxyifyEdit, sanitizeShotstackJson } from '../utils';
import EditorToolbar from './EditorToolbar';
import AssetBrowserModal from './AssetBrowserModal';
import TopInspectorPanel from './TopInspectorPanel';
import type { ShotstackClipSelection } from '../types';
import { invokeEdgeFunction } from '../services/supabaseService';
import { PhotoIcon } from './Icons';
import HelpModal from './HelpModal';

type SdkHandles = { edit: any; };

const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@shotstack/shotstack-studio@1.1.2/dist/shotstack-studio.global.js';
const SCRIPT_ID = 'shotstack-sdk-script';
const CSS_URL = 'https://cdn.jsdelivr.net/npm/@shotstack/shotstack-studio@1.1.2/dist/style.css';
const CSS_ID = 'shotstack-sdk-style';


export const CreativeStudio: React.FC = () => {
  const { 
      activeProjectDetails, 
      handleUpdateProject, 
      handleRenderProject, 
      setActiveProjectId,
      addToast,
      session,
      lockAndExecute,
  } = useAppContext();

  const canvasHostRef = useRef<HTMLDivElement>(null);
  const controlsHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<SdkHandles | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
  const [isAssetBrowserOpen, setIsAssetBrowserOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const saveTimeoutRef = useRef<number | null>(null);

  const debouncedUpdateProject = useCallback((edit: any) => {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);
    saveTimeoutRef.current = window.setTimeout(() => {
      if (activeProjectDetails) {
        const editJson = edit.getEdit();
        const deproxied = deproxyifyEdit(editJson);
        handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxied })
          .finally(() => setIsSaving(false));
      } else {
        setIsSaving(false);
      }
    }, 1500);
  }, [activeProjectDetails, handleUpdateProject]);
  
  // Effect to dynamically load the SDK script and stylesheet
  useEffect(() => {
      // Load CSS
      if (!document.getElementById(CSS_ID)) {
          const link = document.createElement('link');
          link.id = CSS_ID;
          link.rel = 'stylesheet';
          link.href = CSS_URL;
          document.head.appendChild(link);
      }

      // Check if SDK is already loaded
      if ((window as any).shotstack) {
          setSdkStatus('ready');
          return;
      }
      
      // Check if script tag is already present (e.g., from another component instance)
      if (document.getElementById(SCRIPT_ID)) {
          const pollForSdk = setInterval(() => {
              if ((window as any).shotstack) {
                  clearInterval(pollForSdk);
                  setSdkStatus('ready');
              }
          }, 100);
          return () => clearInterval(pollForSdk);
      }

      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;

      const onScriptLoad = () => setSdkStatus('ready');
      const onScriptError = () => {
          setSdkStatus('error');
          setError("Failed to load the Creative Studio SDK from the content delivery network (CDN). This can be caused by a network issue, a firewall, or a browser extension (like an ad blocker). Please check your connection, disable any blockers for this site, and refresh the page.");
      };

      script.addEventListener('load', onScriptLoad);
      script.addEventListener('error', onScriptError);
      document.body.appendChild(script);

      return () => {
          script.removeEventListener('load', onScriptLoad);
          script.removeEventListener('error', onScriptError);
      };
  }, []);

  // Effect to initialize the editor once the SDK is ready
  useEffect(() => {
    if (sdkStatus !== 'ready' || !activeProjectDetails) return;
    
    const { current: canvasHost } = canvasHostRef;
    const { current: timelineHost } = timelineHostRef;
    const { current: controlsHost } = controlsHostRef;
    if (!canvasHost || !timelineHost || !controlsHost) return;

    let cancelled = false;
    setError(null);
    setIsReady(false);
    setSelection(null);

    (async () => {
      try {
        const { Edit, Canvas, Timeline, Controls } = (window as any).shotstack;
        if (!Edit || !Canvas) {
            throw new Error("Shotstack Studio SDK appears to be loaded but is incomplete. Please refresh the page.");
        }
        
        const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
        if (!sanitizedJson) throw new Error("Invalid or missing project timeline data.");
        const template = proxyifyEdit(sanitizedJson);
        const getToken = async (): Promise<string> => {
          const result = await invokeEdgeFunction<{ token: string }>('shotstack-studio-token', {});
          if (!result?.token) throw new Error("Failed to retrieve Shotstack session token.");
          return result.token;
        };
        const edit = new Edit(template.output.size, template.timeline.background);
        await edit.load();
        if (cancelled) return;
        
        const canvas = new Canvas(template.output.size, edit);
        await canvas.load();
        canvasHost.appendChild((canvas as any).view);

        const controls = new Controls(edit);
        await controls.load();
        controlsHost.appendChild((controls as any).view);

        const timeline = new Timeline(edit, { width: timelineHost.clientWidth, height: timelineHost.clientHeight || 250, });
        await timeline.load();
        timelineHost.appendChild((timeline as any).view);
        
        await edit.loadEdit({ ...template, token: getToken, });
        if (cancelled) return;

        sdkRef.current = { edit };

        edit.events.on('clip:selected', (data: any) => setSelection({ clip: data.clip, trackIndex: data.trackIndex, clipIndex: data.clipIndex }));
        edit.events.on('clip:updated', () => debouncedUpdateProject(edit));
        edit.events.on('play', () => setIsPlaying(true));
        edit.events.on('pause', () => setIsPlaying(false));
        edit.events.on('stop', () => setIsPlaying(false));

        setIsReady(true);
      } catch (e: any) {
        if (!cancelled) {
          console.error("Shotstack initialization error:", e);
          setError(e.message || String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      const edit = sdkRef.current?.edit;
      if (edit) {
        edit.events.off('clip:selected');
        edit.events.off('clip:updated');
        edit.events.off('play');
        edit.events.off('pause');
        edit.events.off('stop');
        edit.destroy();
      }
      sdkRef.current = null;
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      if (canvasHost) canvasHost.innerHTML = '';
      if (controlsHost) controlsHost.innerHTML = '';
      if (timelineHost) timelineHost.innerHTML = '';
      setIsReady(false);
      setSelection(null);
    };
  }, [sdkStatus, activeProjectDetails, debouncedUpdateProject]);

  const handleRender = () => {
    lockAndExecute(async () => {
      if (sdkRef.current?.edit && activeProjectDetails) {
        setIsRendering(true);
        const editJson = sdkRef.current.edit.getEdit();
        const deproxied = deproxyifyEdit(editJson);
        await handleRenderProject(activeProjectDetails.id, deproxied);
        setIsRendering(false);
      }
    });
  };

  const handleAddClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
    if (!sdkRef.current?.edit) return;
    const typeMap: Record<string, string> = { video: 'video', image: 'image', sticker: 'image', audio: 'audio' };
    const shotstackType = typeMap[assetType];
    if (!shotstackType) return;
    const proxiedUrl = proxyifyEdit({ timeline: { tracks: [{ clips: [{ asset: { src: url } }] }] } }).timeline.tracks[0].clips[0].asset.src;
    const targetTrack = shotstackType === 'audio' ? 4 : 0;
    sdkRef.current.edit.addClip(targetTrack, { asset: { type: shotstackType, src: proxiedUrl }, length: shotstackType === 'audio' ? 20 : 5, });
  };

  const handleDeleteClip = () => {
    if (sdkRef.current?.edit && selection) {
      sdkRef.current.edit.deleteClip(selection.trackIndex, selection.clipIndex);
      setSelection(null);
    }
  };

  const handleBack = () => {
    if (activeProjectDetails) handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
    else setActiveProjectId(null);
  };

  const handleAiPolish = () => lockAndExecute(async () => {
    if (!sdkRef.current?.edit || !activeProjectDetails?.script) return;
    addToast('AI Polish is analyzing your timeline...', 'info');
    const editJson = sdkRef.current.edit.getEdit();
    const deproxied = deproxyifyEdit(editJson);
    try {
        const result = await invokeEdgeFunction<{ timeline: any }>('ai-polish', {
            timeline: deproxied.timeline,
            script: activeProjectDetails.script,
            projectId: activeProjectDetails.id
        });
        const proxied = proxyifyEdit({ timeline: result.timeline });
        sdkRef.current.edit.setTimeline(proxied.timeline);
        addToast('AI Polish applied!', 'success');
    } catch (e) {
        addToast(`AI Polish failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
      {/* Top Header */}
      <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-black/30">
        <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
          &larr; Back to Blueprint
        </button>
        <div className="text-white font-bold px-4 truncate">{activeProjectDetails?.name}</div>
        <div className="flex items-center gap-4">
          <span className={`text-sm text-gray-400 transition-opacity ${isSaving ? 'opacity-100' : 'opacity-0'}`}>Saving...</span>
        </div>
      </header>

      <div className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">
        {/* Left Column: Inspector */}
        <aside className="col-span-3 h-full overflow-y-auto">
          {selection ? (
            <TopInspectorPanel selection={selection} studio={sdkRef.current?.edit} onDeleteClip={handleDeleteClip} />
          ) : (
            <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center bg-gray-800/50 rounded-lg border border-gray-700">
              Select a clip on the timeline to inspect its properties.
            </div>
          )}
        </aside>

        {/* Right Column: Canvas, Timeline, Controls */}
        <main className="col-span-9 flex flex-col h-full gap-4">
          <div ref={canvasHostRef} className="flex-1 bg-black rounded-lg relative flex items-center justify-center">
             {sdkStatus !== 'ready' ? (
                <div className="text-center text-gray-400 p-8">
                    <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-700"/>
                    {sdkStatus === 'error' ? (
                        <div className="text-red-400 space-y-2">
                            <p className="font-bold">Error Loading Editor</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : 'Loading SDK...'}
                </div>
            ) : !isReady && (
                <div className="text-center text-gray-400 p-8">
                    <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-700"/>
                    {error ? (
                         <div className="text-red-400 space-y-2">
                            <p className="font-bold">Initialization Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : 'Initializing Studio...'}
                </div>
            )}
          </div>
          <div ref={timelineHostRef} className="flex-shrink-0 h-64 bg-gray-800/50 rounded-lg border border-gray-700"></div>
          <div className="flex-shrink-0">
             <EditorToolbar
                isPlaying={isPlaying}
                onPlayPause={() => sdkRef.current?.edit?.togglePlayback()}
                onStop={() => sdkRef.current?.edit?.stop()}
                onUndo={() => sdkRef.current?.edit?.undo()}
                onRedo={() => sdkRef.current?.edit?.redo()}
                onAiPolish={handleAiPolish}
                onRender={handleRender}
                onOpenHelp={() => setIsHelpOpen(true)}
                onAddMedia={() => setIsAssetBrowserOpen(true)}
             />
          </div>
        </main>
      </div>

      <div ref={controlsHostRef} className="absolute -left-[9999px] top-0"></div>

      {isAssetBrowserOpen && (
        <AssetBrowserModal project={activeProjectDetails} session={session} onClose={() => setIsAssetBrowserOpen(false)} onAddClip={handleAddClip} addToast={addToast} lockAndExecute={lockAndExecute} />
      )}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};
