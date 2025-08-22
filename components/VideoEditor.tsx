import React, {
  useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback,
} from "react";
import { getShotstackSdk } from "../lib/shotstackSdk";
import { supabaseUrl } from "../services/supabaseClient";
import { customEditorTheme } from "../themes/customEditorTheme";
// If you have these types in your repo keep them, otherwise make them `any`
import type { Project, ShotstackClipSelection } from "../types";
import Loader from "./Loader";

/* ---------------- URL proxy helpers (your existing logic) ---------------- */
const isProxied = (u: string) => /\/functions\/v1\/asset-proxy\//i.test(u);
const SKIP_PROXY = /(^\/vendor\/)|(^https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com))/i;
const proxyUrl = (url: string, fileHint?: string): string => {
  if (!url || SKIP_PROXY.test(url) || !/^https?:\/\//i.test(url) || !supabaseUrl) return url;
  if (isProxied(url)) return url;
  const file = (fileHint || url.split("/").pop() || "asset").replace(/\?.*$/, "");
  return `${supabaseUrl}/functions/v1/asset-proxy/${encodeURIComponent(url)}/${encodeURIComponent(file)}`;
};

/* ---------------- Build simple timeline from your project ---------------- */
const buildTimelineFromProject = (project: Project | any) => {
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
    const duration = Math.max(0.1, endTime - startTime);
    currentTime = endTime;

    if (scene.storyboardImageUrl) {
      aRollClips.push({
        asset: { type: "image", src: proxyUrl(scene.storyboardImageUrl) },
        start: startTime,
        length: duration,
        fit: "cover",
        transition: { in: "fade", out: "fade", duration: 0.5 },
      });
    }

    if (project.voiceoverUrls?.[index]) {
      voiceoverClips.push({
        asset: { type: "audio", src: proxyUrl(project.voiceoverUrls[index]) },
        start: startTime,
        length: duration,
      });
    }

    if (scene.onScreenText) {
      titleClips.push({
        asset: { type: "title", text: scene.onScreenText, style: "subtitle" },
        start: startTime,
        length: duration,
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
        { name: "SFX", clips: [] },
      ],
    },
    output: { format: "mp4", size },
  };
};

/* --------------------------- Component contracts ------------------------- */
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
  project: Project | any;
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
    const BOOT = useRef(false);
    const [isInitializing, setIsInitializing] = useState(true);

    const handleSelection  = useCallback((d: any) => onSelectionChange(d ?? null), [onSelectionChange]);
    const handleUpdate     = useCallback((d: any) => onSelectionChange(d?.current ?? null), [onSelectionChange]);
    const handleDeselected = useCallback(() => onSelectionChange(null), [onSelectionChange]);
    const handlePlay  = useCallback(() => onPlaybackChange(true),  [onPlaybackChange]);
    const handlePause = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);
    const handleStop  = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);

    const waitForHosts = async () => {
      const ok = () => {
        const c = canvasHost.current, t = timelineHost.current, k = controlsHost.current;
        const cOK = !!c && c.offsetParent !== null && c.clientHeight > 0 && c.clientWidth > 0;
        const tOK = !!t && t.offsetParent !== null && t.clientHeight > 0 && t.clientWidth > 0;
        const kOK = !!k && k.offsetParent !== null;
        return cOK && tOK && kOK;
      };
      for (let i = 0; i < 120; i++) { // ~2s
        await new Promise(r => requestAnimationFrame(r));
        if (ok()) return;
      }
      throw new Error("Shotstack hosts missing or zero-sized");
    };

    useEffect(() => {
      if (BOOT.current) return;
      BOOT.current = true;

      (async () => {
        setIsInitializing(true);
        await waitForHosts();

        // 1) Load SDK
        const { Edit, Canvas, Controls, Timeline } = await getShotstackSdk();

        // 2) Decide size
        const size =
          project?.videoSize === "9:16" ? { width: 720, height: 1280 } :
          project?.videoSize === "1:1"  ? { width: 1080, height: 1080 } :
                                          { width: 1280, height: 720 };

        // 3) Create edit + canvas
        const edit = new Edit(size, "#000000");
        await edit.load();

        const canvas = new Canvas(size, edit, { responsive: true });
        await canvas.load(canvasHost.current!);

        // 4) Load template: project JSON -> script -> hello.json fallback
        let template: any = null;

        if (project?.shotstackEditJson && Object.keys(project.shotstackEditJson).length) {
          template = project.shotstackEditJson;
        } else {
          template = buildTimelineFromProject(project);
        }

        if (!template) {
          template = await fetch("/templates/hello.json").then(r => r.json()).catch(() => null);
        }

        if (template) {
          await edit.loadEdit(template);
        }

        // 5) Controls + timeline
        const controls = new Controls(edit);
        await controls.load(controlsHost.current!);

        const w = timelineHost.current!.clientWidth || size.width;
        const h = timelineHost.current!.clientHeight || 300;

        // IMPORTANT: pass { theme: customEditorTheme } as third argument
        const timeline = new Timeline(edit, { width: w, height: h }, { theme: customEditorTheme });
        await timeline.load(timelineHost.current!);

        // 6) Events
        edit.events.addEventListener("clip:selected", handleSelection);
        edit.events.addEventListener("clip:updated", handleUpdate);
        edit.events.addEventListener("clip:deselected", handleDeselected);
        edit.events.addEventListener("edit:play", handlePlay);
        edit.events.addEventListener("edit:pause", handlePause);
        edit.events.addEventListener("edit:stop", handleStop);

        editRef.current = edit;
        canvasRef.current = canvas;
        controlsRef.current = controls;
        timelineRef.current = timeline;

        setIsInitializing(false);
        console.log("[Studio] Loaded ✓");
      })().catch((err) => {
        console.error("[Studio] boot failed:", err);
        BOOT.current = false;
        setIsInitializing(false);
      });

      return () => {
        try {
          editRef.current?.events?.removeEventListener("clip:selected", handleSelection);
          editRef.current?.events?.removeEventListener("clip:updated", handleUpdate);
          editRef.current?.events?.removeEventListener("clip:deselected", handleDeselected);
          editRef.current?.events?.removeEventListener("edit:play", handlePlay);
          editRef.current?.events?.removeEventListener("edit:pause", handlePause);
          editRef.current?.events?.removeEventListener("edit:stop", handleStop);
        } catch {}
        editRef.current = canvasRef.current = controlsRef.current = timelineRef.current = null;
        BOOT.current = false;
      };
    }, [project, handleSelection, handleUpdate, handleDeselected, handlePlay, handlePause, handleStop]);

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
        const next = { ...clip };
        for (const k of Object.keys(updates)) {
          const v = (updates as any)[k];
          if (v && typeof v === "object" && !Array.isArray(v) && next[k]) next[k] = { ...next[k], ...v };
          else next[k] = v;
        }
        edit.getTrack(ti)?.updateClip(ci, next);
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
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-50 rounded-lg">
            <Loader />
            <p className="mt-4 text-white font-semibold">Initializing Creative Studio...</p>
          </div>
        )}

        {/* Canvas host (we give it a visible black bg so you see the box even before load) */}
        <div
          ref={canvasHost}
          data-shotstack-studio
          className="w-full bg-black rounded-lg overflow-hidden relative"
          style={{ flex: "1 1 auto", minHeight: 420 }}
        />

        {/* Controls host (hidden but must exist) */}
        <div
          ref={controlsHost}
          data-shotstack-controls
          className="w-full"
          style={{ minHeight: 2, height: 2, visibility: "hidden" }}
        />

        {/* Timeline host (must have height!) */}
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



