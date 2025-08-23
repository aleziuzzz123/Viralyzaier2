import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { customEditorTheme } from '../themes/customEditorTheme';
import { getShotstackSDK } from '../lib/shotstackSdk';
import { ShotstackClipSelection } from '../types';

export interface VideoEditorHandles {
  play: () => void;
  pause: () => void;
  stop: () => void;
  undo: () => void;
  redo: () => void;
  getEdit: () => any;
  loadEdit: (state: any) => void;
  updateClip: (trackIndex: number, clipIndex: number, newProps: any) => void;
  removeClip: (trackIndex: number, clipIndex: number) => void;
  addClip: (trackIndex: number, clip: any) => void;
  getPlaybackTime: () => number;
}

interface VideoEditorProps {
  initialState: any;
  onLoad?: (editor: any) => void;
  onStateChange?: (state: any) => void;
  onSelectionChange?: (selection: ShotstackClipSelection | null) => void;
  onIsPlayingChange?: (isPlaying: boolean) => void;
}

const VideoEditor = forwardRef<VideoEditorHandles, VideoEditorProps>((
  { initialState, onLoad, onStateChange, onSelectionChange, onIsPlayingChange }, 
  ref
) => {
  const canvasHost = useRef<HTMLDivElement>(null);
  const timelineHost = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const editRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const timelineRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    let canvas: any, timeline: any, controls: any;

    const boot = async () => {
      try {
        for (let i = 0; i < 120; i++) {
          const c = canvasHost.current;
          const t = timelineHost.current;
          if (c && t && c.clientWidth > 0) break;
          await new Promise(r => requestAnimationFrame(r));
        }
        if (disposed) return;

        if (!canvasHost.current!.offsetHeight) canvasHost.current!.style.minHeight = "420px";
        if (!timelineHost.current!.offsetHeight) timelineHost.current!.style.minHeight = "300px";

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();
        if (disposed) return;
        
        const size = initialState.output?.size ?? { width: 1024, height: 576 };
        
        const edit = new Edit(size);
        await edit.load();
        if (disposed) return;
        editRef.current = edit;

        canvas = new Canvas(size, edit);
        await canvas.load(canvasHost.current!);
        if (disposed) return;
        canvasRef.current = canvas;

        await edit.loadEdit(initialState);
        
        controls = new Controls(edit);
        await controls.load();
        if (disposed) return;
        controlsRef.current = controls;
        
        const tlWidth = timelineHost.current?.clientWidth || size.width;
        timeline = new Timeline(edit, { width: tlWidth, height: 300 });
        timeline.setTheme(customEditorTheme);
        await timeline.load(timelineHost.current!);
        if (disposed) return;
        timelineRef.current = timeline;
        
        const handleStateChange = () => { if (!disposed) onStateChange?.(edit.getEdit()); };
        const handleSelection = (selection: any) => { if (!disposed) onSelectionChange?.(selection); };
        const handlePlay = () => { if (!disposed) onIsPlayingChange?.(true); };
        const handlePause = () => { if (!disposed) onIsPlayingChange?.(false); };
        const handleStop = () => { if (!disposed) onIsPlayingChange?.(false); };

        if (edit?.events?.on) {
          edit.events.on('edit:updated', handleStateChange);
          edit.events.on('clip:selected', handleSelection);
          edit.events.on('clip:deselected', () => handleSelection(null));
          controls.events.on('play', handlePlay);
          controls.events.on('pause', handlePause);
          controls.events.on('stop', handleStop);
        }
        
        if (!disposed) {
          onLoad?.(edit);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Shotstack] boot failed:", e);
        if (!disposed) setErr(e?.message ?? String(e));
      }
    };

    boot();

    return () => {
      disposed = true;
      try { timeline?.dispose?.(); } catch {}
      try { canvas?.dispose?.(); } catch {}
    };
  }, [initialState, onLoad, onStateChange, onSelectionChange, onIsPlayingChange]);

  useImperativeHandle(ref, () => ({
    play: () => controlsRef.current?.play(),
    pause: () => controlsRef.current?.pause(),
    stop: () => controlsRef.current?.stop(),
    undo: () => editRef.current?.undo(),
    redo: () => editRef.current?.redo(),
    getEdit: () => editRef.current?.getEdit(),
    loadEdit: (state: any) => editRef.current?.loadEdit(state),
    updateClip: (trackIndex, clipIndex, newProps) => editRef.current?.updateClip(trackIndex, clipIndex, newProps),
    removeClip: (trackIndex, clipIndex) => editRef.current?.removeClip(trackIndex, clipIndex),
    addClip: (trackIndex, clip) => editRef.current?.addClip(trackIndex, clip),
    getPlaybackTime: () => editRef.current?.playbackTime ?? 0,
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
        <div ref={canvasHost} data-shotstack-studio className="w-full h-full" style={{ display: loading ? 'none' : 'block' }}/>
      </div>
      <div className="flex-shrink-0" style={{ display: loading ? 'none' : 'block', minHeight: '300px' }}>
        <div ref={timelineHost} data-shotstack-timeline className="w-full h-full bg-gray-900" />
      </div>
    </div>
  );
});

export default VideoEditor;