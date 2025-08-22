import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";
import { Project, ShotstackClipSelection, ShotstackEditJson } from "../types";
import { supabaseUrl } from "../services/supabaseClient";
import { useAppContext } from "../contexts/AppContext";

// --- URL Proxy Helpers ---
const isProxied = (u: string) => /\/functions\/v1\/asset-proxy\//i.test(u);
const SKIP_PROXY = /(^\/vendor\/)|(^https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com))/i;
const proxyUrl = (url: string, fileHint?: string): string => {
  if (!url || SKIP_PROXY.test(url) || !/^https?:\/\//i.test(url) || !supabaseUrl) {
      return url;
  }
  if (isProxied(url)) {
      return url; // already proxied
  }
  const file = (fileHint || url.split("/").pop() || "asset").replace(/\?.*$/, "");
  return `${supabaseUrl}/functions/v1/asset-proxy/${encodeURIComponent(url)}/${encodeURIComponent(file)}`;
};

// Helper function to build an initial timeline from project data
const buildTimelineFromProject = (project: Project): ShotstackEditJson | null => {
    if (!project.script || !project.script.scenes) {
        console.error("Timeline build failed: Project script or scenes are missing.");
        return null;
    }

    const size =
        project.videoSize === "9:16" ? { width: 720, height: 1280 } :
        project.videoSize === "1:1"  ? { width: 1080, height: 1080 } :
                                       { width: 1280, height: 720 };

    const aRollClips: any[] = [];
    const titleClips: any[] = [];
    const voiceoverClips: any[] = [];
    let currentTime = 0;

    const parseTime = (s: string | undefined): number | null => {
        if (typeof s !== 'string' || s.trim() === '') return null;
        if (s.includes(':')) {
            const parts = s.split(':').map(part => parseFloat(part.replace(/[^0-9.]/g, '')));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return parts[0] * 60 + parts[1];
            }
        }
        const cleanedString = s.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleanedString);
        if (isNaN(num)) {
            console.warn(`[Viralyzer] Could not parse time value from string: "${s}". This scene's timing may be incorrect.`);
            return null;
        }
        return num;
    };

    for (const [index, scene] of project.script.scenes.entries()) {
        const timeParts = scene.timecode ? scene.timecode.split('-') : [];
        const startNum = parseTime(timeParts[0]);
        const endNum = parseTime(timeParts[1]);

        const startTime = startNum ?? currentTime;
        let duration = (endNum != null && endNum > startTime) ? endNum - startTime : 5.0; // Default to 5s
        duration = Math.max(0.1, duration);

        if (isNaN(startTime) || isNaN(duration)) {
            console.error(`Skipping scene ${index} due to invalid timecode:`, scene.timecode);
            continue;
        }

        if (scene.storyboardImageUrl) {
            aRollClips.push({
                asset: { type: 'image', src: scene.storyboardImageUrl },
                start: startTime,
                length: duration,
                transition: { in: 'fade', out: 'fade' }
            });
        }

        if (project.voiceoverUrls?.[index]) {
            voiceoverClips.push({
                asset: { type: 'audio', src: project.voiceoverUrls[index] },
                start: startTime,
                length: duration
            });
        }

        if (scene.onScreenText) {
            titleClips.push({
                asset: { type: 'text', text: scene.onScreenText, style: 'subtitle' },
                start: startTime,
                length: duration
            });
        }
        
        currentTime = startTime + duration;
    }

    return {
        timeline: {
            background: "#000000",
            tracks: [
                { name: 'A-Roll', clips: aRollClips },
                { name: 'Titles', clips: titleClips },
                { name: 'B-Roll', clips: [] },
                { name: 'Overlays', clips: [] },
                { name: 'Music', clips: [] },
                { name: 'Voiceover', clips: voiceoverClips },
                { name: 'SFX', clips: [] }
            ]
        },
        output: {
            format: "mp4",
            size: size
        }
    };
};

function sanitizeTemplate(t: any) {
  if (!t?.timeline?.tracks || !t?.output?.size) return null;
  const tpl = JSON.parse(JSON.stringify(t));
  for (const track of tpl.timeline.tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (clip?.asset?.type === 'title') clip.asset.type = 'text';
      if ('fit' in clip) delete clip.fit;
      if (clip?.transition && 'duration' in clip.transition) delete clip.transition.duration;
    }
  }
  return tpl;
}

async function waitForHosts(ms = 5000) {
  const t0 = Date.now();
  return new Promise<void>((res, rej) => {
    const tick = () => {
      if (document.querySelector('[data-shotstack-studio]') &&
          document.querySelector('[data-shotstack-timeline]')) return res();
      if (Date.now() - t0 > ms) return rej(new Error('Shotstack hosts not found'));
      requestAnimationFrame(tick);
    };
    tick();
  });
}

// --- Types ---
export interface VideoEditorHandles {
  addClip: (type: "video" | "image" | "audio" | "sticker", url: string) => void;
  deleteClip: (trackIndex: number, clipIndex: number) => void;
  updateClip: (trackIndex: number, clipIndex: number, updates: any) => void;
  getEdit: () => any;
  loadEdit: (edit: any) => void;
  getCurrentTime: () => number;
  getTotalDuration: () => number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  undo: () => void;
  redo: () => void;
}
type Props = {
  project: Project;
  onSelectionChange: (s: ShotstackClipSelection | null) => void;
  onPlaybackChange: (isPlaying: boolean) => void;
};


// --- Component ---
const VideoEditor = forwardRef<VideoEditorHandles, Props>(({ project, onSelectionChange, onPlaybackChange }, ref) => {
  const { addToast } = useAppContext();

  const bootedRef = useRef(false);
  const editRef = useRef<Edit | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const controlsRef = useRef<Controls | null>(null);
  const timelineRef = useRef<Timeline | null>(null);

  const handleSelection = useCallback((data: any) => onSelectionChange(data ?? null), [onSelectionChange]);
  const handleUpdate = useCallback((data: any) => onSelectionChange(data?.current ?? null), [onSelectionChange]);
  const handleDeselected = useCallback(() => onSelectionChange(null), [onSelectionChange]);
  const handlePlay = useCallback(() => onPlaybackChange(true), [onPlaybackChange]);
  const handlePause = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);
  const handleStop = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);

  useEffect(() => {
    const hasSaved = !!project?.shotstackEditJson;
    const hasScript = !!project?.script?.scenes?.length;
    if (!hasSaved && !hasScript) return;        // wait for data
    if (bootedRef.current) return;                 // single boot
    bootedRef.current = true;

    let cancelled = false;

    (async () => {
      await waitForHosts();

      let template = project.shotstackEditJson ?? buildTimelineFromProject(project);
      template = sanitizeTemplate(template);
      if (!template) { 
        addToast("Could not build a valid timeline from the project script.", "error");
        bootedRef.current = false; 
        return; 
      }
      
      const size = template.output.size;
      const bg = template.timeline.background ?? '#000000';

      // 1) Edit
      const edit = new Edit(size, bg);
      await edit.load(); if (cancelled) return;

      // 2) Canvas (renders to [data-shotstack-studio])
      const canvas = new Canvas(size, edit);
      await canvas.load(); if (cancelled) return;

      // 3) Load template
      await (edit as any).loadEdit(template, { resolve: proxyUrl }); if (cancelled) return;

      // 4) Controls
      const controls = new Controls(edit);
      await controls.load(); if (cancelled) return;

      // 5) Timeline (renders to [data-shotstack-timeline])
      const timeline = new Timeline(edit, { width: size.width, height: 300 });
      await timeline.load(); if (cancelled) return;

      // Wire up event handlers
      edit.events.on('clip:selected', handleSelection);
      edit.events.on('clip:updated', handleUpdate);
      edit.events.on('clip:deselected', handleDeselected);
      edit.events.on("edit:play", handlePlay);
      edit.events.on("edit:pause", handlePause);
      edit.events.on("edit:stop", handleStop);

      editRef.current = edit;
      canvasRef.current = canvas;
      controlsRef.current = controls;
      timelineRef.current = timeline;
    })().catch(err => {
      console.error('[Shotstack] boot failed:', err);
      console.error('Problematic Template Data:', project?.shotstackEditJson ?? '(built)');
      addToast(`Creative Studio failed to load: ${err.message}`, "error");
      bootedRef.current = false; // allow retry after fixes
    });

    return () => {
      cancelled = true;
      // Per user feedback, manual listener cleanup is not required as dispose() handles it.
      try { (timelineRef.current as any)?.dispose?.(); } catch {}
      try { (canvasRef.current as any)?.dispose?.(); } catch {}
      
      editRef.current = null;
      controlsRef.current = null;
      timelineRef.current = null;
      canvasRef.current = null;
      bootedRef.current = false;
    };
  }, [project?.shotstackEditJson, project?.script?.scenes?.length, addToast, handleSelection, handleUpdate, handleDeselected, handlePlay, handlePause, handleStop]);

  // HMR: guarantee previous instances dispose on hot-reload
  if ((import.meta as any).hot) {
    (import.meta as any).hot.dispose(() => {
      try { (timelineRef.current as any)?.dispose?.(); } catch {}
      try { (canvasRef.current as any)?.dispose?.(); } catch {}
    });
  }

  useImperativeHandle(ref, () => ({
    addClip: (type, url) => {
        const edit = editRef.current;
        if (!edit) return;
        const t = (edit as any).getCurrentTime() || 0;
        const clip: any = { start: Number(t || 0), length: 5 };
        if (type === "audio") {
            clip.asset = { type: "audio", src: proxyUrl(url), volume: 0.8 };
            edit.getTrack(4)?.addClip(clip); // Music track
        } else {
            clip.asset = { type: type === "sticker" ? "image" : type, src: proxyUrl(url) };
            edit.getTrack(2)?.addClip(clip); // B-Roll track
        }
    },
    deleteClip: (trackIndex, clipIndex) => {
        const edit = editRef.current;
        if (edit) {
            const track = edit.getTrack(trackIndex);
            if (track) {
                track.deleteClip(clipIndex);
            }
        }
    },
    updateClip: (trackIndex, clipIndex, updates) => {
        const edit = editRef.current;
        if (!edit) return;
        const clip = edit.getClip(trackIndex, clipIndex);
        if (clip) {
             const newClip = { ...clip };
            Object.keys(updates).forEach(key => {
                const value = updates[key];
                if (typeof value === 'object' && value !== null && !Array.isArray(value) && newClip[key]) {
                    newClip[key] = { ...newClip[key], ...value };
                } else {
                    newClip[key] = value;
                }
            });
            const track = edit.getTrack(trackIndex);
            if (track) {
              track.updateClip(clipIndex, newClip);
            }
            (canvasRef.current as any)?.render();
        }
    },
    getEdit: () => editRef.current?.getEdit(),
    loadEdit: (edit) => (editRef.current as any)?.loadEdit(edit, { resolve: proxyUrl }),
    getCurrentTime: () => (editRef.current as any)?.getCurrentTime() || 0,
    getTotalDuration: () => editRef.current?.totalDuration || 0,
    play: () => editRef.current?.play(),
    pause: () => editRef.current?.pause(),
    stop: () => editRef.current?.stop(),
    undo: () => editRef.current?.undo(),
    redo: () => editRef.current?.redo(),
  }));
  
  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 relative">
      <div className="studio-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div 
          data-shotstack-studio 
          className="w-full bg-black rounded-lg overflow-hidden relative" 
          style={{ flex: '1 1 auto' }}
        />
        <div 
          data-shotstack-timeline 
          className="w-full bg-gray-900 rounded-lg" 
          style={{ flexShrink: 0, height: 300 }}
        />
      </div>
    </div>
  );
});

export default VideoEditor;