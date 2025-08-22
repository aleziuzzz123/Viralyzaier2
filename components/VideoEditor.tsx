// components/VideoEditor.tsx
import React, {
  useEffect, useRef, useImperativeHandle,
  forwardRef, useState, useCallback
} from "react";
import { getShotstackSDK } from "../lib/shotstackSdk";
import { Project, ShotstackClipSelection } from "../types";
import { customEditorTheme } from "../themes/customEditorTheme";
import { supabaseUrl } from "../services/supabaseClient";
import Loader from "./Loader";

// -------- URL Proxy Helpers --------
const isProxied = (u: string) => /\/functions\/v1\/asset-proxy\//i.test(u);
const SKIP_PROXY = /(^\/vendor\/)|(^https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com))/i;
const proxyUrl = (url: string, fileHint?: string): string => {
  if (!url || SKIP_PROXY.test(url) || !/^https?:\/\//i.test(url) || !supabaseUrl) return url;
  if (isProxied(url)) return url;
  const file = (fileHint || url.split("/").pop() || "asset").replace(/\?.*$/, "");
  return `${supabaseUrl}/functions/v1/asset-proxy/${encodeURIComponent(url)}/${encodeURIComponent(file)}`;
};

// -------- Build a basic timeline from your Project --------
const buildTimelineFromProject = (project: Project) => {
  if (!project?.script) return null;

  const size =
    project.videoSize === "9:16" ? { width: 720, height: 1280 } :
    project.videoSize === "1:1"  ? { width: 1080, height: 1080 } :
                                   { width: 1280, height: 720 };

  const aRollClips: any[] = [];
  const titleClips: any[] = [];
  const voiceoverClips: any[] = [];
  let currentTime = 0;

  for (const [index, scene] of project.script.scenes.entries()) {
    const [startStr, endStr] = (scene.timecode || "").split("-");
    const startTime = parseFloat(startStr) || currentTime;
    const endTime   = parseFloat(endStr)   || (startTime + 5);
    const duration  = Math.max(0.1, endTime - startTime);
    currentTime = endTime;

    if (scene.storyboardImageUrl) {
      aRollClips.push({
        asset: { type: "image", src: proxyUrl(scene.storyboardImageUrl) },
        start: startTime,
        length: duration,
        fit: "cover",
        transition: { in: "fade", out: "fade", duration: 0.5 }
      });
    }
    if (project.voiceoverUrls?.[index]) {
      voiceoverClips.push({
        asset: { type: "audio", src: proxyUrl(project.voiceoverUrls[index]) },
        start: startTime,
        length: duration
      });
    }
    if (scene.onScreenText) {
      titleClips.push({
        asset: { type: "title", text: scene.onScreenText, style: "subtitle" },
        start: startTime,
        length: duration
      });
    }
  }

  return {
    timeline: {
      background: "#000000",
      tracks: [
        { name: "A-Roll",     clips: aRollClips     },
        { name: "Titles",     clips: titleClips     },
        { name: "B-Roll",     clips: []             },
        { name: "Overlays",   clips: []             },
        { name: "Music",      clips: []             },
        { name: "Voiceover",  clips: voiceoverClips },
        { name: "SFX",        clips: []             }
      ]
    },
    output: {
      format: "mp4",
      size
    }
  };
};

// -------- Types for parent handles --------
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

const VideoEditor = forwardRef<VideoEditorHandles, Props>(
({ project, onSelectionChange, onPlaybackChange }, ref) => {
  const canvasHost   = useRef<HTMLDivElement>(null);
  const controlsHost = useRef<HTMLDivElement>(null);
  const timelineHost = useRef<HTMLDivElement>(null);

  const editRef     = useRef<any>();
  const canvasRef   = useRef<any>();
  const controlsRef = useRef<any>();
  const timelineRef = useRef<any>();
  const BOOT        = useRef(false);

  const [isInitializing, setIsInitializing] = useState(true);

  // Shotstack emits via an internal event emitter: use .on/.off
  const onSelect = useCallback((data: any) => onSelectionChange(data ?? null), [onSelectionChange]);
  const onUpdate = useCallback((data: any) => onSelectionChange(data?.current ?? null), [onSelectionChange]);
  const onDeselect = useCallback(() => onSelectionChange(null), [onSelectionChange]);
  const onPlay  = useCallback(() => onPlaybackChange(true),  [onPlaybackChange]);
  const onPause = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);
  const onStop  = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);

  // Ensure hosts exist & are visible before boot
  const waitForHosts = async () => {
    const ok = () => {
      const c = canvasHost.current, t = timelineHost.current, k = controlsHost.current;
      const sized = (el?: HTMLElement|null) => !!el && el.offsetParent !== null && el.clientWidth > 0 && el.clientHeight > 0;
      return sized(c) && sized(t) && !!k;
    };
    for (let i = 0; i < 60; i++) { // ~1s
      await new Promise(r => requestAnimationFrame(r));
      if (ok()) return;
    }
    throw new Error("Shotstack canvas, controls, or timeline host missing/zero-sized");
  };

  useEffect(() => {
    if (BOOT.current) return;
    BOOT.current = true;

    (async () => {
      setIsInitializing(true);
      await waitForHosts();

      const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();

      const size =
        project.videoSize === "9:16" ? { width: 720, height: 1280 } :
        project.videoSize === "1:1"  ? { width: 1080, height: 1080 } :
                                       { width: 1280, height: 720 };

      const edit = new Edit(size, "#000000");
      await edit.load();

      // According to docs, .load() auto-mounts to [data-shotstack-*] hosts
      const canvas   = new Canvas(size, edit);
      await canvas.load();

      const controls = new Controls(edit);
      await controls.load();

      const timelineSize = {
        width:  timelineHost.current!.clientWidth || 1280,
        height: timelineHost.current!.clientHeight || 300,
      };
      const timeline = new Timeline(edit, timelineSize, { theme: customEditorTheme });
      await timeline.load();

      const template =
        project.shotstackEditJson && Object.keys(project.shotstackEditJson).length > 0
          ? project.shotstackEditJson
          : buildTimelineFromProject(project);
      if (template) {
        await edit.loadEdit(template);
      }

      // hook events
      edit.events.on("clip:selected", onSelect);
      edit.events.on("clip:updated",  onUpdate);
      edit.events.on("clip:deselected", onDeselect);
      edit.events.on("edit:play",  onPlay);
      edit.events.on("edit:pause", onPause);
      edit.events.on("edit:stop",  onStop);

      editRef.current     = edit;
      canvasRef.current   = canvas;
      controlsRef.current = controls;
      timelineRef.current = timeline;

      setIsInitializing(false);
    })().catch(err => {
      console.error("[Shotstack] boot failed:", err);
      BOOT.current = false;
      setIsInitializing(false);
    });

    return () => {
      try {
        const edit = editRef.current;
        edit?.events?.off?.("clip:selected", onSelect);
        edit?.events?.off?.("clip:updated",  onUpdate);
        edit?.events?.off?.("clip:deselected", onDeselect);
        edit?.events?.off?.("edit:play",  onPlay);
        edit?.events?.off?.("edit:pause", onPause);
        edit?.events?.off?.("edit:stop",  onStop);
      } catch {}
      editRef.current = canvasRef.current = controlsRef.current = timelineRef.current = null;
      BOOT.current = false;
    };
  }, [project, onSelect, onUpdate, onDeselect, onPlay, onPause, onStop]);

  useImperativeHandle(ref, () => ({
    addClip: (type, url) => {
      const edit = editRef.current;
      if (!edit) return;
      const t = Number(edit.currentTime || 0);
      const clip: any = { start: t, length: 5 };

      if (type === "audio") {
        clip.asset = { type: "audio", src: proxyUrl(url), volume: 0.8 };
        edit.getTrack(4)?.addClip(clip);      // Music track
      } else {
        clip.asset = { type: type === "sticker" ? "image" : type, src: proxyUrl(url) };
        clip.fit = "cover";
        edit.getTrack(2)?.addClip(clip);      // B-Roll track
      }
    },
    deleteClip: (ti, ci) => editRef.current?.deleteClip(ti, ci),
    updateClip: (ti, ci, updates) => {
      const edit = editRef.current;
      if (!edit) return;
      const clip = edit.getClip(ti, ci);
      if (!clip) return;

      const newClip = { ...clip };
      Object.keys(updates).forEach((k) => {
        const v = (updates as any)[k];
        if (typeof v === "object" && v && !Array.isArray(v) && newClip[k]) {
          newClip[k] = { ...newClip[k], ...v };
        } else {
          newClip[k] = v;
        }
      });

      const track = edit.getTrack(ti);
      track?.updateClip(ci, newClip);
      canvasRef.current?.render?.();
    },
    getEdit: () => editRef.current?.getEdit(),
    loadEdit: (e: any) => editRef.current?.loadEdit(e),
    getCurrentTime: () => editRef.current?.currentTime || 0,
    getTotalDuration: () => editRef.current?.totalDuration || 0,
    play: () => editRef.current?.play(),
    pause: () => editRef.current?.pause(),
    stop: () => editRef.current?.stop(),
    undo: () => editRef.current?.undo(),
    redo: () => editRef.current?.redo(),
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-50 rounded-lg">
          <Loader />
          <p className="mt-4 text-white font-semibold">Initializing Creative Studio...</p>
        </div>
      )}

      {/* Canvas host */}
      <div
        ref={canvasHost}
        data-shotstack-studio
        className="w-full bg-black rounded-lg overflow-hidden relative"
        style={{ flex: "1 1 auto", minHeight: 420 }}
      />

      {/* Controls host (keyboard listeners) */}
      <div
        ref={controlsHost}
        data-shotstack-controls
        className="w-full"
        style={{ minHeight: 2, height: 2, visibility: "hidden" }}
      />

      {/* Timeline host */}
      <div
        ref={timelineHost}
        data-shotstack-timeline
        className="w-full bg-gray-900 rounded-lg flex-shrink-0"
        style={{ height: 300 }}
      />
    </div>
  );
});

export default VideoEditor;
