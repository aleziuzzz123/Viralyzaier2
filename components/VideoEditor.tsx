import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { customEditorTheme } from '../themes/customEditorTheme';

// A robust, Vite-friendly way to load the SDK module.
// It uses a global promise to ensure the module is only fetched once.
async function getShotstackSDK() {
  if (!(window as any).SHOTSTACK_SDK) {
    (window as any).SHOTSTACK_SDK = import('@shotstack/shotstack-studio');
  }
  return (window as any).SHOTSTACK_SDK;
}

// Define the handles that the component will expose
export interface VideoEditorHandles {
  play: () => void;
  pause: () => void;
  stop: () => void;
  undo: () => void;
  redo: () => void;
  getEditorState: () => any;
  setEditorState: (state: any) => void;
  updateClip: (trackIndex: number, clipIndex: number, newProps: any) => void;
}

interface VideoEditorProps {
  initialState: any; // The initial edit JSON
  onLoad?: (editor: any) => void;
  onStateChange?: (state: any) => void;
  onSelectionChange?: (selection: any | null) => void;
  onIsPlayingChange?: (isPlaying: boolean) => void;
}

const VideoEditor = forwardRef<VideoEditorHandles, VideoEditorProps>((
  { initialState, onLoad, onStateChange, onSelectionChange, onIsPlayingChange }, 
  ref
) => {
  const canvasHost = useRef<HTMLDivElement>(null);
  const timelineHost = useRef<HTMLDivElement>(null); // Host for timeline
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs to hold the SDK instances
  const editRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const timelineRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanupEvents: (() => void) | undefined;

    (async () => {
      try {
        if (!canvasHost.current || !timelineHost.current) {
          // Wait for hosts
          await new Promise(r => requestAnimationFrame(r));
          if (cancelled) return;
        }

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();

        const size = initialState.output.size;
        const bg = initialState.timeline.background ?? '#000';

        const edit = new Edit(size, bg);
        await edit.load(customEditorTheme);
        editRef.current = edit;

        const canvas = new Canvas(size, edit, canvasHost.current!);
        await canvas.load();
        canvasRef.current = canvas;

        const controls = new Controls(edit);
        await controls.load();
        controlsRef.current = controls;

        const timeline = new Timeline(edit, { width: size.width, height: 300 }, timelineHost.current!);
        await timeline.load();
        timelineRef.current = timeline;

        await edit.loadEdit(initialState);
        
        // Event listeners
        const handleStateChange = () => onStateChange?.(edit.getEdit());
        const handleSelection = (selection: any) => onSelectionChange?.(selection);
        const handlePlay = () => onIsPlayingChange?.(true);
        const handlePause = () => onIsPlayingChange?.(false);
        const handleStop = () => onIsPlayingChange?.(false);

        edit.events.on('edit:updated', handleStateChange);
        edit.events.on('clip:selected', handleSelection);
        edit.events.on('clip:deselected', () => handleSelection(null));
        controls.on('play', handlePlay);
        controls.on('pause', handlePause);
        controls.on('stop', handleStop);

        if (!cancelled) {
          onLoad?.(edit);
          setLoading(false);
        }

        cleanupEvents = () => { // Cleanup events
          edit.events.off('edit:updated', handleStateChange);
          edit.events.off('clip:selected', handleSelection);
          edit.events.off('clip:deselected', () => handleSelection(null));
          controls.off('play', handlePlay);
          controls.off('pause', handlePause);
          controls.off('stop', handleStop);
        };

      } catch (e: any) {
        console.error('[Shotstack] boot failed:', e);
        if (!cancelled) {
          setErr(e?.message ?? String(e));
          setLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
      cleanupEvents?.();
      try { timelineRef.current?.dispose?.(); } catch (e) { console.error('Error disposing timeline:', e); }
      try { canvasRef.current?.dispose?.(); } catch (e) { console.error('Error disposing canvas:', e); }
      editRef.current = null;
      canvasRef.current = null;
      timelineRef.current = null;
      controlsRef.current = null;
    };
  }, [initialState, onLoad, onStateChange, onSelectionChange, onIsPlayingChange]);

  // Expose control methods via ref
  useImperativeHandle(ref, () => ({
    play: () => controlsRef.current?.play(),
    pause: () => controlsRef.current?.pause(),
    stop: () => controlsRef.current?.stop(),
    undo: () => editRef.current?.undo(),
    redo: () => editRef.current?.redo(),
    getEditorState: () => editRef.current?.getEdit(),
    setEditorState: (state: any) => editRef.current?.loadEdit(state),
    updateClip: (trackIndex: number, clipIndex: number, newProps: any) => {
        if (editRef.current) {
            editRef.current.updateClip(trackIndex, clipIndex, newProps);
        }
    }
  }), []);

  if (err) {
    return (
      <div className="p-4 text-red-800 bg-red-100 rounded-lg">
        <strong>Creative Studio failed:</strong> {err}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex-grow relative bg-black">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white z-10">Loading Editor...</div>}
        <div ref={canvasHost} data-shotstack-studio className="w-full h-full" />
      </div>
      <div className="flex-shrink-0" style={{ display: loading ? 'none' : 'block' }}>
        <div ref={timelineHost} data-shotstack-timeline className="w-full h-[300px] bg-gray-900" />
      </div>
    </div>
  );
});

export default VideoEditor;