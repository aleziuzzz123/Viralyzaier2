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

type SdkHandles = { edit: any; };

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

  // Refs for Shotstack containers
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const controlsHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);

  // References to SDK instances
  const sdkRef = useRef<SdkHandles | null>(null);

  // Local UI state
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
  const [isAssetBrowserOpen, setIsAssetBrowserOpen] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  // Debounced save (runs 1.5s after last change)
  const debouncedUpdateProject = useCallback((edit: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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

  // Initialize Shotstack editor when a project is selected
  useEffect(() => {
    if (!activeProjectDetails) return;
    if (!canvasHostRef.current || !timelineHostRef.current || !controlsHostRef.current) return;

    let cancelled = false;
    setError(null);
    setIsReady(false);
    setSelection(null);

    (async () => {
      try {
        // Load Shotstack modules (SDK loaded via import; pixi/sound was pre-loaded in index.tsx)
        // FIX: Import `Application` as a named export, not a default export.
        const { Application, Edit } = await import('@shotstack/shotstack-studio');

        // Sanitize and proxy the saved template JSON
        const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
        if (!sanitizedJson) throw new Error("Invalid or missing project timeline data.");
        const template = proxyifyEdit(sanitizedJson);

        // Fetch token via secure Supabase function
        const getToken = async (): Promise<string> => {
          // Use our Supabase Edge Function to get a short-lived token
          const result = await invokeEdgeFunction<{ token: string }>('shotstack-studio-token', {});
          if (!result?.token) {
            throw new Error("Failed to retrieve Shotstack session token.");
          }
          return result.token;
        };

        // Create the Application instance with DOM refs and token callback
        const app = new Application({
          studio: canvasHostRef.current,
          timeline: timelineHostRef.current,
          controls: controlsHostRef.current,
          token: getToken,
        });

        // Create the Edit instance from the template data
        const edit = new Edit(app, template);

        // Load the application (loads edit, canvas, controls, timeline into the DOM)
        await app.load(edit);
        if (cancelled) return;

        // Save edit reference
        sdkRef.current = { edit };

        // Attach event listeners
        edit.events.on('clip:selected', (data: any) => {
          setSelection({ clip: data.clip, trackIndex: data.trackIndex, clipIndex: data.clipIndex });
        });
        // If the user clears selection by other means, you may want to handle a deselect event here.
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
      // Cleanup event listeners and destroy editor
      const edit = sdkRef.current?.edit;
      if (edit) {
        edit.events.off('clip:selected');
        edit.events.off('clip:updated');
        edit.events.off('play');
        edit.events.off('pause');
        edit.events.off('stop');
        edit.destroy();  // Clean up Shotstack edit instance
      }
      sdkRef.current = null;
      // Clear any pending save timeout
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      // Clear the DOM containers
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';
      if (controlsHostRef.current) controlsHostRef.current.innerHTML = '';
      if (timelineHostRef.current) timelineHostRef.current.innerHTML = '';
      setIsReady(false);
      setSelection(null);
    };
  }, [activeProjectDetails, debouncedUpdateProject]);

  // Render project (trigger Shotstack API render via backend)
  const handleRender = () => {
    if (sdkRef.current?.edit && activeProjectDetails) {
      setIsRendering(true);
      const editJson = sdkRef.current.edit.getEdit();
      const deproxied = deproxyifyEdit(editJson);
      handleRenderProject(activeProjectDetails.id, deproxied)
        .finally(() => setIsRendering(false));
    }
  };

  // Asset browser: adding a new clip
  const handleAddClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
    if (!sdkRef.current?.edit) return;
    const typeMap: Record<string, string> = { video: 'video', image: 'image', sticker: 'image', audio: 'audio' };
    const shotstackType = typeMap[assetType];
    if (!shotstackType) return;

    // Proxy the asset URL through our proxy to avoid CORS issues
    const proxiedUrl = proxyifyEdit({ timeline: { tracks: [{ clips: [{ asset: { src: url } }] }] } })
      .timeline.tracks[0].clips[0].asset.src;

    // Default track: audio goes to track 4, others to track 0
    const targetTrack = shotstackType === 'audio' ? 4 : 0;
    sdkRef.current.edit.addClip(targetTrack, {
      asset: { type: shotstackType, src: proxiedUrl },
      length: shotstackType === 'audio' ? 20 : 5,
    });
  };

  // Delete selected clip
  const handleDeleteClip = () => {
    if (sdkRef.current?.edit && selection) {
      sdkRef.current.edit.deleteClip(selection.trackIndex, selection.clipIndex);
      setSelection(null);
    }
  };

  // Navigate back
  const handleBack = () => {
    if (activeProjectDetails) {
      handleUpdateProject(activeProjectDetails.id, { workflowStep: 2 });
    } else {
      setActiveProjectId(null);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 z-10">
      {/* Top Header */}
      <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-black/30">
        <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800">
          Back to Blueprint
        </button>
        <div className="text-white font-bold px-4 truncate">{activeProjectDetails?.name}</div>
        <div className="flex items-center gap-4">
          <span className={`text-sm text-gray-400 transition-opacity ${isSaving ? 'opacity-100' : 'opacity-0'}`}>
            Saving...
          </span>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 grid grid-cols-[1fr_350px] gap-4 p-4 overflow-hidden">
        <main className="flex flex-col gap-4 overflow-hidden">
          {/* Shotstack Canvas */}
          <div
            ref={canvasHostRef}
            data-shotstack-studio
            className="flex-1 bg-black rounded-lg flex items-center justify-center"
          >
            {!isReady && <p className="text-gray-400">Initializing Creative Studio...</p>}
          </div>

          {/* Shotstack Controls (for keyboard shortcuts, no visible UI) */}
          <div ref={controlsHostRef} data-shotstack-controls className="h-0"></div>

          {/* Shotstack Timeline */}
          <div ref={timelineHostRef} data-shotstack-timeline className="h-[250px] bg-gray-800 rounded-lg"></div>

          {/* Custom Toolbar */}
          <EditorToolbar
            isPlaying={isPlaying}
            onPlayPause={() => isPlaying ? sdkRef.current?.edit.pause() : sdkRef.current?.edit.play()}
            onStop={() => sdkRef.current?.edit.stop()}
            onUndo={() => sdkRef.current?.edit.undo()}
            onRedo={() => sdkRef.current?.edit.redo()}
            onAiPolish={() => addToast("AI Polish coming soon!", "info")}
            onRender={handleRender}
            onOpenHelp={() => {}}
            onAddMedia={() => setIsAssetBrowserOpen(true)}
          />
        </main>

        {/* Inspector / Sidebar */}
        <aside className="bg-gray-800/50 rounded-lg overflow-y-auto">
          {selection ? (
            <TopInspectorPanel
              selection={selection}
              studio={sdkRef.current?.edit}
              onDeleteClip={handleDeleteClip}
            />
          ) : (
            <div className="p-4 text-center text-gray-500 space-y-4 pt-10">
              <PhotoIcon className="w-12 h-12 mx-auto text-gray-600"/>
              <h3 className="font-bold text-gray-300">Inspector Panel</h3>
              <p className="text-sm">Select a clip on the timeline to inspect and edit its properties.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Asset Browser Modal */}
      {isAssetBrowserOpen && (
        <AssetBrowserModal
          project={activeProjectDetails}
          session={session}
          onClose={() => setIsAssetBrowserOpen(false)}
          onAddClip={handleAddClip}
          addToast={addToast}
          lockAndExecute={lockAndExecute}
        />
      )}

      {/* Error Notification */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 p-4 bg-red-800 text-white rounded-lg shadow-2xl z-50">
          <strong>Error: Error during editor initialization:</strong> {error}
        </div>
      )}
    </div>
  );
};
