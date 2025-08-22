import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import { getShotstack } from "@/lib/shotstackSdk";
import { customEditorTheme } from "@/themes/customEditorTheme";
// If your types file exists, keep these; otherwise remove these two imports.
import { Project, ShotstackClipSelection } from "@/types";

// -------- URL Proxy Helpers --------
import { supabaseUrl } from "@/services/supabaseClient";
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

// -------- Helpers --------
type Size = { width: number; height: number };
const sizeFor = (aspect: string | undefined): Size =>
  aspect === "9:16" ? { width: 720, height: 1280 } :
  aspect === "1:1"  ? { width: 1080, height: 1080 } :
                      { width: 1280, height: 720 };

const buildTimelineFromProject = (project: Project) => {
  if (!project?.script) return null;

  const aRoll: any[] = [];
  const titles: any[] = [];
  const voice: any[] = [];
  let t = 0;

  for (const [i, scene] of project.script.scenes.entries()) {
    const [sStr, eStr] = (scene.timecode || "").split("-");
    const start = isNaN(parseFloat(sStr)) ? t : parseFloat(sStr);
    const end = isNaN(parseFloat(eStr)) ? start + 5 : parseFloat(eStr);
    const len = Math.max(0.1, end - start);
    t = end;

    if (scene.storyboardImageUrl) {
      aRoll.push({
        asset: { type: "image", src: proxyUrl(scene.storyboardImageUrl) },
        start, length: len, fit: "cover",
        transition: { in: "fade", out: "fade", duration: 0.5 }
      });
    }

    if (project.voiceoverUrls?.[i]) {
      voice.push({
        asset: { type: "audio", src: proxyUrl(project.voiceoverUrls[i]) },
        start, length: len
      });
    }

    if (scene.onScreenText) {
      titles.push({
        asset: { type: "text", text: scene.onScreenText, color: "#ffffff" },
        start, length: len, position: "center", scale: 1
      });
    }
  }

  return {
    timeline: {
      background: "#000000",
      tracks: [
        { name: "A-Roll",   clips: aRoll },
        { name: "Titles",   clips: titles },
        { name: "B-Roll",   clips: [] },
        { name: "Overlays", clips: [] },
        { name: "Music",    clips: [] },
        { name: "Voice",    clips: voice },
        { name: "SFX",      clips: [] }
      ]
    },
    output: { format: "mp4", size: sizeFor(project.videoSize) }
  };
};

// -------- Imperative Handle --------
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

// -------- Component --------
type Props = {
  project: Project;
  onSelectionChange: (s: ShotstackClipSelection | null) => void;
  onPlaybackChange: (isPlaying: boolean) => void;
};

const VideoEditor = forwardRef<VideoEditorHandles, Props>(
  ({ project, onSelectionChange, onPlaybackChange }, ref) => {
    const canvasHost = useRef<HTMLDivElement>(null);
    const timelineHost = useRef<HTMLDivElement>(null);

    const editRef = useRef<any>(null);
    const canvasRef = useRef<any>(null);
    const timelineRef = useRef<any>(null);
    const controlsRef = useRef<any>(null);

    const [booting, setBooting] = useState(true);
    const bootOnce = useRef(false);

    // Ensure the hosts exist and have size before booting
    const waitForHosts = async () => {
      const ok = () => {
        const c = canvasHost.current;
        const t = timelineHost.current;
        if (!c || !t) return false;
        if (!c.clientWidth || !c.clientHeight) c.style.minHeight = "420px";
        if (!t.clientWidth || !t.clientHeight) t.style.height = "300px";
        return true;
      };
      for (let i = 0; i < 4; i++) {
        await new Promise(r => requestAnimationFrame(r));
      }
      if (!ok()) throw new Error("Shotstack canvas or timeline host missing/zero-sized");
    };

    // Event handlers – use EventEmitter API (on/off), not addEventListener
    const onSel = useCallback((data: any) => onSelectionChange(data ?? null), [onSelectionChange]);
    const onUpd = useCallback((data: any) => onSelectionChange(data?.current ?? null), [onSelectionChange]);
    const onPlay = useCallback(() => onPlaybackChange(true), [onPlaybackChange]);
    const onPause = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);
    const onStop = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);

    useEffect(() => {
      if (bootOnce.current) return;
      bootOnce.current = true;

      (async () => {
        try {
          setBooting(true);
          await waitForHosts();

          const { Edit, Canvas, Controls, Timeline } = await getShotstack();

          const size = sizeFor(project?.videoSize);
          const edit = new Edit(size, "#000000");
          await edit.load();

          const canvas = new Canvas(size, edit);
          await canvas.load(); // auto-mounts into [data-shotstack-studio]

          const template =
            project?.shotstackEditJson && Object.keys(project.shotstackEditJson).length
              ? project.shotstackEditJson
              : buildTimelineFromProject(project);

          if (template) {
            await edit.loadEdit(template);
          }

          const controls = new Controls(edit);
          await controls.load(); // keyboard controls

          const timeline = new Timeline(edit, { width: size.width, height: 300 }, { theme: customEditorTheme });
          await timeline.load(); // auto-mounts into [data-shotstack-timeline]

          // Wire events
          edit.events.on("clip:selected", onSel);
          edit.events.on("clip:updated", onUpd);
          edit.events.on("edit:play", onPlay);
          edit.events.on("edit:pause", onPause);
          edit.events.on("edit:stop", onStop);

          editRef.current = edit;
          canvasRef.current = canvas;
          controlsRef.current = controls;
          timelineRef.current = timeline;

          setBooting(false);
        } catch (e) {
          console.error("[Shotstack] boot failed:", e);
          setBooting(false);
        }
      })();

      return () => {
        const edit = editRef.current;
        try {
          edit?.events?.off?.("clip:selected", onSel);
          edit?.events?.off?.("clip:updated", onUpd);
          edit?.events?.off?.("edit:play", onPlay);
          edit?.events?.off?.("edit:pause", onPause);
          edit?.events?.off?.("edit:stop", onStop);
        } catch {}
        editRef.current = canvasRef.current = timelineRef.current = controlsRef.current = null;
        bootOnce.current = false;
      };
    }, [project, onSel, onUpd, onPlay, onPause, onStop]);

    // Utility: make sure a track index exists
    const ensureTrack = (idx: number) => {
      const edit = editRef.current;
      const e = edit.getEdit();
      while (e.timeline.tracks.length <= idx) {
        e.timeline.tracks.push({ clips: [] });
      }
      return e;
    };

    useImperativeHandle(ref, () => ({
      addClip: (type, url) => {
        const edit = editRef.current;
        if (!edit) return;

        const clip: any = { start: Number(edit.playbackTime || 0) / 1000, length: 5 }; // seconds
        if (type === "audio") {
          clip.asset = { type: "audio", src: proxyUrl(url), volume: 0.8 };
          const e = ensureTrack(4); // Music track index (0-based)
          e.timeline.tracks[4].clips.push(clip);
          edit.loadEdit(e);
        } else {
          clip.asset = { type: type === "sticker" ? "image" : type, src: proxyUrl(url) };
          clip.fit = "cover";
          const e = ensureTrack(2); // B-Roll track index
          e.timeline.tracks[2].clips.push(clip);
          edit.loadEdit(e);
        }
      },
      deleteClip: (ti, ci) => editRef.current?.deleteClip?.(ti, ci),
      updateClip: (ti, ci, updates) => {
        const edit = editRef.current;
        if (!edit) return;
        const e = edit.getEdit();
        const clip = e?.timeline?.tracks?.[ti]?.clips?.[ci];
        if (!clip) return;
        const merged = { ...clip };

        for (const k of Object.keys(updates)) {
          const v = updates[k];
          if (typeof v === "object" && v !== null && !Array.isArray(v) && typeof merged[k] === "object") {
            merged[k] = { ...merged[k], ...v };
          } else {
            merged[k] = v;
          }
        }

        e.timeline.tracks[ti].clips[ci] = merged;
        edit.loadEdit(e);
      },
      getEdit: () => editRef.current?.getEdit(),
      loadEdit: (e: any) => editRef.current?.loadEdit(e),
      getCurrentTime: () => Number(editRef.current?.playbackTime || 0),
      getTotalDuration: () => Number(editRef.current?.totalDuration || 0),
      play: () => editRef.current?.play(),
      pause: () => editRef.current?.pause(),
      stop: () => editRef.current?.stop(),
      undo: () => editRef.current?.undo(),
      redo: () => editRef.current?.redo(),
    }));

    return (
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        {booting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 z-50 rounded-lg">
            <p className="mt-4 text-white font-semibold">Initializing Creative Studio…</p>
          </div>
        )}

        {/* Canvas Host — the SDK auto-mounts here */}
        <div
          ref={canvasHost}
          data-shotstack-studio
          className="w-full bg-black rounded-lg overflow-hidden relative"
          style={{ minHeight: 420 }}
        />

        {/* Timeline Host — the SDK auto-mounts here */}
        <div
          ref={timelineHost}
          data-shotstack-timeline
          className="w-full bg-gray-900 rounded-lg"
          style={{ height: 300 }}
        />
      </div>
    );
  }
);

export default VideoEditor;
