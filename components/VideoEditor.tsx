import React, {
  useEffect, useRef, useImperativeHandle, forwardRef,
  useState, useCallback
} from "react";
import { getShotstackSdk } from "../lib/shotstackSdk";
import type { Project, ShotstackClipSelection } from "../types";
import { customEditorTheme } from "../themes/customEditorTheme";
import { supabaseUrl } from "../services/supabaseClient";
import Loader from "./Loader";

// --- URL Proxy Helpers ---
const isProxied = (u: string) => /\/functions\/v1\/asset-proxy\//i.test(u);
const SKIP_PROXY = /(^\/vendor\/)|(^https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com))/i;
const proxyUrl = (url: string, fileHint?: string): string => {
  if (!url || SKIP_PROXY.test(url) || !/^https?:\/\//i.test(url) || !supabaseUrl) return url;
  if (isProxied(url)) return url;
  const file = (fileHint || url.split("/").pop() || "asset").replace(/\?.*$/, "");
  return `${supabaseUrl}/functions/v1/asset-proxy/${encodeURIComponent(url)}/${encodeURIComponent(file)}`;
};

// Build an initial timeline from the project (simple A-roll + VO + titles)
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
    const endTime = parseFloat(endStr) || (startTime + 5);
    const length = Math.max(0.1, endTime - startTime);
    currentTime = endTime;

    if (scene.storyboardImageUrl) {
      aRollClips.push({
        asset: { type: "image", src: proxyUrl(scene.storyboardImageUrl) },
        start: startTime,
        length,
        fit: "cover",
        transition: { in: "fade", out: "fade", duration: 0.5 }
      });
    }

    if (project.voiceoverUrls?.[index]) {
      voiceoverClips.push({
        asset: { type: "audio", src: proxyUrl(project.voiceoverUrls[index]) },
        start: startTime,
        length
      });
    }

    if (scene.onScreenText) {
      titleClips.push({
        asset: { type: "title", text: scene.onScreenText, style: "subtitle" },
        start: startTime,
        length
      });
    }
  }

  return {
    timeline: {
      background: "#000000",
      tracks: [
        { name: "A-Roll", clips: aRollClips },
        { name: "Titles", clips: titleClips },
        { name: "B-Roll", clips: [] },
        { name: "Overlays", clips: [] },
        { name: "Music", clips: [] },
        { name: "Voiceover", clips: voiceoverClips },
        { name: "SFX", clips: [] }
      ]
    },
    output: { format: "mp4", size }
  };
};

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

const VideoEditor = forwardRef<VideoEditorHandles, Props>(
  ({ project, onSelectionChange, onPlaybackChange }, ref) => {
    const canvasHost = useRef<HTMLDivElement>(null);
    const controlsHost = useRef<HTMLDivElement>(null);
    const timelineHost = useRef<HTMLDivElement>(null);

    const editRef = useRef<any>();
    const canvasRef = useRef<any>();
    const controlsRef = useRef<any>();
    const timelineRef = useRef<any>();
    const booted = useRef(false);
    const [isInitializing, setIsInitializing] = useState(true);

    const handleSelection   = useCallback((d: any) => onSelectionChange(d ?? null), [onSelectionChange]);
    const handleUpdate      = useCallback((d: any) => onSelectionChange(d?.current ?? null), [onSelectionChange]);
    const handleDeselected  = useCallback(() => onSelectionChange(null), [onSelectionChange]);
    const handlePlay        = useCallback(() => onPlaybackChange(true), [onPlaybackChange]);
    const handlePauseStop   = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);

    // Wait until hosts exist and have size
    const waitForHosts = async () => {
      const ok = () => {
        const c = canvasHost.current, t = timelineHost.current, k = controlsHost.current;
        const cOK = !!c && c.offsetParent !== null && c.clientWidth > 0 && c.clientHeight > 0;
        const tOK = !!t && t.offsetParent !== null && t.clientWidth > 0 && t.clientHeight > 0;
        const kOK = !!k && k.offsetParent !== null;
        return cOK && tOK && kOK;
      };
      for (let i = 0; i < 120; i++) { // ~2s
        await new Promise(r => requestAnimationFrame(r));
        if (ok()) return;
      }
      throw new Error("Shotstack hosts not ready (canvas/timeline)");
    };

    useEffect(() => {
      if (booted.current) return;
      booted.current = true;

      (async () => {
        setIsInitializing(true);
        await waitForHosts();

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSdk();

        const size =
          project.videoSize === "9:16" ? { width: 720, height: 1280 } :
          project.videoSize === "1:1"  ? { width: 1080, height: 1080 } :
                                         { width: 1280, height: 720 };

        const edit = new Edit(size, "#000000");
        await edit.load();

        const canvas = new Canvas(size, edit, { responsive: true });
        // Let the SDK mount into [data-shotstack-studio] on the element we provide:
        await canvas.load(canvasHost.current!);

        // Load initial edit JSON
        const template =
          (project as any)?.shotstackEditJson && Object.keys((project as any).shotstackEditJson).length > 0
            ? (project as any).shotstackEditJson
            : buildTimelineFromProject(project);

        if (template) await edit.loadEdit(template);

        const controls = new Controls(edit);
        await controls.load(controlsHost.current!);

        // IMPORTANT: With 1.5.x use { theme: ... } and let .load() auto-target [data-shotstack-timeline]
        const width  = Math.max(640, timelineHost.current!.clientWidth || 0);
        const height = timelineHost.current!.clientHeight || 300;

        const timeline = new Timeline(edit, { width, height }, { theme: customEditorTheme });
        await timeline.load(); // no element arg

        // Events
        edit.events.addEventListener("clip:selected",   handleSelection);
        edit.events.addEventListener("clip:updated",    handleUpdate);
        edit.events.addEventListener("clip:deselected", handleDeselected);
        edit.events.addEventListener("edit:play",       handlePlay);
        edit.events.addEventListener("edit:pause",      handlePauseStop);
        edit.events.addEventListener("edit:stop",       handlePauseStop);

        editRef.current = edit;
        canvasRef.current = canvas;
        controlsRef.current = controls;
        timelineRef.current = timeline;

        setIsInitializing(false);
      })().catch(err => {
        console.error("[Shotstack] boot failed:", err);
        booted.current = false;
        setIsInitializing(false);
      });

      return () => {
        try {
          editRef.current?.events?.removeEventListener("clip:selected",   handleSelection);
          editRef.current?.events?.removeEventListener("clip:updated",    handleUpdate);
          editRef.current?.events?.removeEventListener("clip:deselected", handleDeselected);
          editRef.current?.events?.removeEventListener("edit:play",       handlePlay);
          editRef.current?.events?.removeEventListener("edit:pause",      handlePauseStop);
          editRef.current?.events?.removeEventListener("edit:stop",       handlePauseStop);
        } catch {}
        editRef.current = canvasRef.current = controlsRef.current = timelineRef.current = null;
        booted.current = false;
      };
    }, [project, handleSelection, handleUpdate, handleDeselected, handlePlay, handlePauseStop]);

    useImperativeHandle(ref, () => ({
      addClip: (type, url) => {
        const edit = editRef.current;
        if (!edit) return;
        const t = edit.currentTime || 0;
        const clip: any = { start: Number(t || 0), length: 5 };

        if (type === "audio") {
          clip.asset = { type: "audio", src: proxyUrl(url), volume: 0.8 };
          edit.getTrack(4)?.addClip(clip); // Music
        } else {
          clip.asset = { type: type === "sticker" ? "image" : type, src: proxyUrl(url) };
          clip.fit = "cover";
          edit.getTrack(2)?.addClip(clip); // B-Roll
        }
      },
      deleteClip: (ti, ci) => editRef.current?.deleteClip(ti, ci),
      updateClip: (ti, ci, updates) => {
        const edit = editRef.current;
        if (!edit) return;
        const clip = edit.getClip(ti, ci);
        if (!clip) return;

        const newClip = { ...clip };
        Object.keys(updates).forEach(k => {
          const v = (updates as any)[k];
          if (typeof v === "object" && v && !Array.isArray(v) && newClip[k]) {
            newClip[k] = { ...newClip[k], ...v };
          } else {
            (newClip as any)[k] = v;
          }
        });

        const track = edit.getTrack(ti);
        if (track) track.updateClip(ci, newClip);
        canvasRef.current?.render();
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
      <div className="flex-1 flex flex-col min-h-0 gap-4 relative">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-50 rounded-lg">
            <Loader />
            <p className="mt-4 text-white font-semibold">Initializing Creative Studio...</p>
          </div>
        )}

        <div
          ref={canvasHost}
          data-shotstack-studio
          className="w-full bg-black rounded-lg overflow-hidden relative"
          style={{ flex: "1 1 auto", minHeight: 420 }}
        />

        {/* Controls host (keyboard bindings) */}
        <div
          ref={controlsHost}
          data-shotstack-controls
          className="w-full"
          style={{ minHeight: 2, height: 2, visibility: "hidden" }}
        />

        {/* Timeline host — SDK will target [data-shotstack-timeline] */}
        <div
          ref={timelineHost}
          data-shotstack-timeline
          className="w-full bg-gray-900 rounded-lg flex-shrink-0"
          style={{ height: 300 }}
        />
      </div>
    );
  }
);

export default VideoEditor;



