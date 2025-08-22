// components/VideoEditor.tsx
import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import { getShotstackSDK } from "../lib/shotstackSdk";
import { Project, ShotstackClipSelection } from "../types";
import { supabaseUrl } from "../services/supabaseClient";
import Loader from "./Loader";

/* ---------- URL proxy helpers ---------- */
const isProxied = (u: string) => /\/functions\/v1\/asset-proxy\//i.test(u);
const SKIP_PROXY = /(^\/vendor\/)|(^https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com))/i;

const proxyUrl = (url: string, fileHint?: string): string => {
  if (!url || SKIP_PROXY.test(url) || !/^https?:\/\//i.test(url) || !supabaseUrl) {
    return url;
  }
  if (isProxied(url)) return url;
  const file = (fileHint || url.split("/").pop() || "asset").replace(/\?.*$/, "");
  return `${supabaseUrl}/functions/v1/asset-proxy/${encodeURIComponent(url)}/${encodeURIComponent(file)}`;
};

/* ---------- Build initial timeline from your Project ---------- */
const buildTimelineFromProject = (project: Project) => {
  if (!project?.script) return {
    timeline: { background: "#000000", tracks: [{ clips: [] }, { clips: [] }] },
    output: { format: "mp4", size: { width: 1280, height: 720 } },
  };

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

/* ---------- Types ---------- */
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

/* ---------- Component ---------- */
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

    /* Callbacks */
    const handleSelection   = useCallback((d: any) => onSelectionChange(d ?? null), [onSelectionChange]);
    const handleUpdate      = useCallback((d: any) => onSelectionChange(d?.current ?? null), [onSelectionChange]);
    const handleDeselected  = useCallback(() => onSelectionChange(null), [onSelectionChange]);
    const handlePlay        = useCallback(() => onPlaybackChange(true), [onPlaybackChange]);
    const handlePause       = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);
    const handleStop        = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);

    /* Make sure hosts are on-screen with non-zero size before boot */
    const waitForHosts = async () => {
      const ok = () => {
        const c = canvasHost.current, t = timelineHost.current, k = controlsHost.current;
        const cOK = !!c && c.offsetParent !== null && c.clientHeight > 0 && c.clientWidth > 0;
        const tOK = !!t && t.offsetParent !== null && t.clientHeight > 0 && t.clientWidth > 0;
        const kOK = !!k && k.offsetParent !== null;
        return cOK && tOK && kOK;
      };
      for (let i = 0; i < 90; i++) {
        await new Promise(r => requestAnimationFrame(r));
        if (ok()) return;
      }
      throw new Error("Shotstack hosts missing or zero-sized");
    };

    useEffect(() => {
      if (booted.current) return;
      booted.current = true;

      (async () => {
        setIsInitializing(true);
        await waitForHosts();

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();

        const size =
          project.videoSize === "9:16" ? { width: 720, height: 1280 } :
          project.videoSize === "1:1"  ? { width: 1080, height: 1080 } :
                                         { width: 1280, height: 720 };

        // 1) Edit
        const edit = new Edit(size, "#000000");
        await edit.load();

        // 2) Canvas
        const canvas = new Canvas(size, edit, { responsive: true });
        await canvas.load(canvasHost.current!);

        // 3) Template / initial timeline
        const template =
          project.shotstackEditJson && Object.keys(project.shotstackEditJson).length > 0
            ? project.shotstackEditJson
            : buildTimelineFromProject(project);
        if (template) {
          await edit.loadEdit(template);
        }

        // 4) Controls (keyboard)
        const controls = new Controls(edit);
        await controls.load(controlsHost.current!);

        // 5) Timeline – IMPORTANT: do NOT pass a DOM node to load() on v1.5.x
        const tw = Math.max(640, timelineHost.current!.clientWidth || size.width);
        const th = timelineHost.current!.clientHeight || 300;
        const timeline = new Timeline(edit, { width: tw, height: th });
        await timeline.load(); // renders into [data-shotstack-timeline]

        // Events
        edit.events.addEventListener("clip:selected",   handleSelection);
        edit.events.addEventListener("clip:updated",    handleUpdate);
        edit.events.addEventListener("clip:deselected", handleDeselected);
        edit.events.addEventListener("edit:play",       handlePlay);
        edit.events.addEventListener("edit:pause",      handlePause);
        edit.events.addEventListener("edit:stop",       handleStop);

        // Store refs
        editRef.current = edit;
        canvasRef.current = canvas;
        controlsRef.current = controls;
        timelineRef.current = timeline;

        // Sanity log: confirm timeline DOM was populated
        const root = document.querySelector("[data-shotstack-timeline]");
        console.log("[Shotstack] timeline children:", root?.children?.length);

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
          editRef.current?.events?.removeEventListener("edit:pause",      handlePause);
          editRef.current?.events?.removeEventListener("edit:stop",       handleStop);
        } catch {}
        editRef.current = canvasRef.current = controlsRef.current = timelineRef.current = null;
        booted.current = false;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project]);

    useImperativeHandle(ref, () => ({
      addClip: (type, url) => {
        const edit = editRef.current;
        if (!edit) return;
        const t = Number(edit.currentTime || 0);
        const clip: any = { start: t, length: 5 };
        if (type === "audio") {
          clip.asset = { type: "audio", src: proxyUrl(url), volume: 0.8 };
          edit.getTrack(4)?.addClip(clip); // Music track
        } else {
          clip.asset = { type: type === "sticker" ? "image" : type, src: proxyUrl(url) };
          clip.fit = "cover";
          edit.getTrack(2)?.addClip(clip); // B-Roll track
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
          next[k] = (typeof v === "object" && v && !Array.isArray(v) && next[k])
            ? { ...next[k], ...v }
            : v;
        }
        const track = edit.getTrack(ti);
        track?.updateClip(ci, next);
        canvasRef.current?.render();
      },
      getEdit: () => editRef.current?.getEdit(),
      loadEdit: (e: any) => editRef.current?.loadEdit(e),
      getCurrentTime: () => Number(editRef.current?.currentTime || 0),
      getTotalDuration: () => Number(editRef.current?.totalDuration || 0),
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

        {/* Timeline host — give it a definite height */}
        <div
          ref={timelineHost}
          data-shotstack-timeline
          className="w-full bg-gray-900 rounded-lg flex-shrink-0"
          style={{ height: 300, minHeight: 300 }}
        />
      </div>
    );
  }
);

export default VideoEditor;



