import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import { getShotstackSDK } from "../lib/shotstackSdk";
// If you have real types, swap these any's:
type Project = any;
type ShotstackClipSelection = any;

import { customEditorTheme } from "../themes/customEditorTheme";
import { supabaseUrl } from "../services/supabaseClient";
import Loader from "./Loader";

// ---------------- URL proxy helpers ----------------
const isProxied = (u: string) => /\/functions\/v1\/asset-proxy\//i.test(u);
const SKIP_PROXY = /(^\/vendor\/)|(^https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com))/i;

const proxyUrl = (url: string, fileHint?: string): string => {
  if (!url || SKIP_PROXY.test(url) || !/^https?:\/\//i.test(url) || !supabaseUrl) {
    return url;
  }
  if (isProxied(url)) return url;
  const file = (fileHint || url.split("/").pop() || "asset").replace(/\?.*$/, "");
  return `${supabaseUrl}/functions/v1/asset-proxy/${encodeURIComponent(
    url
  )}/${encodeURIComponent(file)}`;
};

// Build an initial timeline from your project
const buildTimelineFromProject = (project: Project) => {
  if (!project?.script) return null;

  const size =
    project.videoSize === "9:16"
      ? { width: 720, height: 1280 }
      : project.videoSize === "1:1"
      ? { width: 1080, height: 1080 }
      : { width: 1280, height: 720 };

  const aRollClips: any[] = [];
  const titleClips: any[] = [];
  const voiceoverClips: any[] = [];
  let currentTime = 0;

  for (const [index, scene] of project.script.scenes.entries()) {
    const [startStr, endStr] = String(scene.timecode ?? "").split("-");
    const startTime = parseFloat(startStr) || currentTime;
    const endTime = parseFloat(endStr) || startTime + 5;
    const length = Math.max(0.1, endTime - startTime);
    currentTime = endTime;

    if (scene.storyboardImageUrl) {
      aRollClips.push({
        asset: { type: "image", src: proxyUrl(scene.storyboardImageUrl) },
        start: startTime,
        length,
        fit: "cover",
        transition: { in: "fade", out: "fade", duration: 0.5 },
      });
    }

    if (project.voiceoverUrls?.[index]) {
      voiceoverClips.push({
        asset: { type: "audio", src: proxyUrl(project.voiceoverUrls[index]) },
        start: startTime,
        length,
      });
    }

    if (scene.onScreenText) {
      titleClips.push({
        asset: { type: "title", text: scene.onScreenText, style: "subtitle" },
        start: startTime,
        length,
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
    output: {
      format: "mp4",
      size,
    },
  };
};

// ---------------- Types exposed to parent ----------------
export interface VideoEditorHandles {
  addClip: (type: "video" | "image" | "audio" | "sticker", url: string) => void;
  deleteClip: (trackIndex: number, clipIndex: number) => void;
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

// ---------------- Component ----------------
const VideoEditor = forwardRef<VideoEditorHandles, Props>(
  ({ project, onSelectionChange, onPlaybackChange }, ref) => {
    // Explicit hosts the SDK will mount into:
    const canvasHost = useRef<HTMLDivElement>(null);
    const controlsHost = useRef<HTMLDivElement>(null);
    const timelineHost = useRef<HTMLDivElement>(null);

    const editRef = useRef<any>();
    const canvasRef = useRef<any>();
    const controlsRef = useRef<any>();
    const timelineRef = useRef<any>();
    const booted = useRef(false);
    const [isInitializing, setIsInitializing] = useState(true);

    const waitForHosts = async () => {
      const ok = () => {
        const c = canvasHost.current;
        const t = timelineHost.current;
        const k = controlsHost.current;
        const cOK = !!c && c.offsetParent !== null && c.clientWidth > 0 && c.clientHeight > 0;
        const tOK = !!t && t.offsetParent !== null && t.clientWidth > 0 && t.clientHeight > 0;
        const kOK = !!k && k.offsetParent !== null;
        return cOK && tOK && kOK;
      };
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        if (ok()) return;
      }
      throw new Error("Shotstack canvas, controls, or timeline host missing or zero-sized");
    };

    useEffect(() => {
      if (booted.current) return;
      booted.current = true;

      (async () => {
        setIsInitializing(true);
        await waitForHosts();

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();

        const size =
          project?.videoSize === "9:16"
            ? { width: 720, height: 1280 }
            : project?.videoSize === "1:1"
            ? { width: 1080, height: 1080 }
            : { width: 1280, height: 720 };

        const edit = new Edit(size, "#000000");
        await edit.load();

        // Important: mount each part to the specific host we control
        const canvas = new Canvas(size, edit, { responsive: true });
        await canvas.load(canvasHost.current!);

        const controls = new Controls(edit);
        await controls.load(controlsHost.current!);

        const timeline = new Timeline(
          edit,
          {
            width: timelineHost.current!.clientWidth,
            height: timelineHost.current!.clientHeight,
          },
          { theme: customEditorTheme }
        );
        await timeline.load(timelineHost.current!);

        // Events (use .on / .off API)
        const onSelect = (data: any) => onSelectionChange(data ?? null);
        const onUpdate = (data: any) => onSelectionChange(data?.current ?? null);
        const onDeselect = () => onSelectionChange(null);
        const onPlay = () => onPlaybackChange(true);
        const onPause = () => onPlaybackChange(false);
        const onStop = () => onPlaybackChange(false);

        edit.events.on("clip:selected", onSelect);
        edit.events.on("clip:updated", onUpdate);
        edit.events.on("clip:deselected", onDeselect);
        edit.events.on("edit:play", onPlay);
        edit.events.on("edit:pause", onPause);
        edit.events.on("edit:stop", onStop);

        // Ensure there is content so tracks are visible
        let template = buildTimelineFromProject(project);
        if (!template) {
          try {
            const res = await fetch(
              "https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json"
            );
            template = await res.json();
          } catch {}
        }
        if (template) {
          await edit.loadEdit(template);
          canvas.centerEdit();
          canvas.zoomToFit();
        }

        editRef.current = edit;
        canvasRef.current = canvas;
        controlsRef.current = controls;
        timelineRef.current = timeline;

        setIsInitializing(false);
      })().catch((err) => {
        console.error("[Shotstack] boot failed:", err);
        booted.current = false;
        setIsInitializing(false);
      });

      return () => {
        try {
          const edit = editRef.current;
          if (edit?.events?.off) {
            edit.events.off("clip:selected");
            edit.events.off("clip:updated");
            edit.events.off("clip:deselected");
            edit.events.off("edit:play");
            edit.events.off("edit:pause");
            edit.events.off("edit:stop");
          }
          timelineRef.current?.dispose?.();
          canvasRef.current?.dispose?.();
        } catch {}
        editRef.current = canvasRef.current = controlsRef.current = timelineRef.current = null;
        booted.current = false;
      };
    }, [project, onSelectionChange, onPlaybackChange]);

    useImperativeHandle(ref, () => ({
      addClip: (type, url) => {
        const edit = editRef.current;
        if (!edit) return;
        const tSec = Number(edit.playbackTime ?? 0) / 1000;
        const clip: any = { start: tSec, length: 5 };

        if (type === "audio") {
          clip.asset = { type: "audio", src: proxyUrl(url), volume: 0.8 };
          edit.addClip(4, clip); // Music track
        } else {
          clip.asset = { type: type === "sticker" ? "image" : type, src: proxyUrl(url) };
          clip.fit = "cover";
          edit.addClip(2, clip); // B-Roll track
        }
      },
      deleteClip: (ti, ci) => editRef.current?.deleteClip(ti, ci),
      getEdit: () => editRef.current?.getEdit(),
      loadEdit: (e: any) => editRef.current?.loadEdit(e),
      getCurrentTime: () => Number(editRef.current?.playbackTime ?? 0),
      getTotalDuration: () => Number(editRef.current?.totalDuration ?? 0),
      play: () => editRef.current?.play(),
      pause: () => editRef.current?.pause(),
      stop: () => editRef.current?.stop(),
      undo: () => editRef.current?.undo(),
      redo: () => editRef.current?.redo(),
    }));

    return (
      // Make the whole column scrollable if needed
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-4">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-50 rounded-lg">
            <Loader />
            <p className="mt-4 text-white font-semibold">Initializing Creative Studio...</p>
          </div>
        )}

        {/* Canvas host — fixed flex-basis so it doesn't consume all height */}
        <div
          ref={canvasHost}
          data-shotstack-studio
          className="w-full bg-black rounded-lg overflow-hidden relative"
          style={{ flex: "0 0 480px" }}
        />

        {/* Controls host (keyboard listeners) */}
        <div
          ref={controlsHost}
          data-shotstack-controls
          className="w-full"
          style={{ minHeight: 2, height: 2, visibility: "hidden" }}
        />

        {/* Timeline host — visible, fixed height */}
        <div
          ref={timelineHost}
          data-shotstack-timeline
          className="w-full bg-gray-900 rounded-lg flex-shrink-0"
          style={{ height: 320, flex: "0 0 320px" }}
        />
      </div>
    );
  }
);

export default VideoEditor;


