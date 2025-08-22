import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { customEditorTheme } from '../themes/customEditorTheme';
import { getShotstackSDK } from '../lib/shotstackSdk';

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
    let edit: any;
    let canvas: any;
    let controls: any;
    let timeline: any;
    let cleanupEvents: (() => void) | undefined;

    const boot = async () => {
      try {
        if (!canvasHost.current || !timelineHost.current) {
          await new Promise(r => requestAnimationFrame(r));
          if (cancelled) return;
        }
        
        if (!canvasHost.current!.offsetHeight) canvasHost.current!.style.minHeight = "420px";
        if (!timelineHost.current!.offsetHeight) timelineHost.current!.style.minHeight = "300px";

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();
        if (cancelled) return;
        
        const size = initialState.output?.size ?? { width: 1280, height: 720 };
        const bg = initialState.timeline?.background ?? "#000000";

        edit = new Edit({ width: size.width, height: size.height, background: bg });
        await edit.load(customEditorTheme);
        if (cancelled) return;
        editRef.current = edit;

        canvas = new Canvas(edit, { size, host: canvasHost.current!, responsive: true });
        await canvas.load();
        if (cancelled) return;
        canvasRef.current = canvas;

        await edit.loadEdit(initialState);
        
        controls = new Controls(edit);
        await controls.load();
        if (cancelled) return;
        controlsRef.current = controls;
        
        timeline = new Timeline(edit, { host: timelineHost.current!, width: size.width, height: 300 });
        await timeline.load();
        if (cancelled) return;
        timelineRef.current = timeline;
        
        const handleStateChange = () => { if (!cancelled) onStateChange?.(edit.getEdit()); };
        const handleSelection = (selection: any) => { if (!cancelled) onSelectionChange?.(selection); };
        const handlePlay = () => { if (!cancelled) onIsPlayingChange?.(true); };
        const handlePause = () => { if (!cancelled) onIsPlayingChange?.(false); };
        const handleStop = () => { if (!cancelled) onIsPlayingChange?.(false); };

        if (edit?.events?.on && typeof edit.events.on === 'function') {
          edit.events.on('edit:updated', handleStateChange);
          edit.events.on('clip:selected', handleSelection);
          edit.events.on('clip:deselected', () => handleSelection(null));
        } else {
          console.warn("Edit events API missing; skipping .on handlers");
        }
        
        if (controls?.events?.on && typeof controls.events.on === 'function') {
          controls.events.on('play', handlePlay);
          controls.events.on('pause', handlePause);
          controls.events.on('stop', handleStop);
        } else {
            console.warn("Controls events API missing; skipping .on handlers");
        }
        
        cleanupEvents = () => {
            if (edit?.events?.off) {
                edit.events.off('edit:updated', handleStateChange);
                edit.events.off('clip:selected', handleSelection);
                edit.events.off('clip:deselected', () => handleSelection(null));
            }
            if(controls?.events?.off) {
                controls.events.off('play', handlePlay);
                controls.events.off('pause', handlePause);
                controls.events.off('stop', handleStop);
            }
        };

        if (!cancelled) {
          onLoad?.(edit);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Shotstack] boot failed:", e);
        if (!cancelled) {
          setErr(e?.message ?? String(e));
          setLoading(false);
        }
      }
    };

    boot();

    return () => {
      cancelled = true;
      cleanupEvents?.();
      try { timeline?.dispose?.(); } catch (e) { console.error('Error disposing timeline:', e); }
      try { canvas?.dispose?.(); } catch (e) { console.error('Error disposing canvas:', e); }
      editRef.current = null;
      canvasRef.current = null;
      timelineRef.current = null;
      controlsRef.current = null;
    };
  }, [initialState, onLoad, onStateChange, onSelectionChange, onIsPlayingChange]);

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
      <div className="p-4 rounded-lg bg-red-900/50 border border-red-500/50 text-red-300">
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