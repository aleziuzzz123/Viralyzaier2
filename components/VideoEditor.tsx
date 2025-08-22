// components/VideoEditor.tsx
import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import getShotstackSDK from "../lib/shotstackSdk"; // << default import
import { customEditorTheme } from "../themes/customEditorTheme";
import type { Project, ShotstackClipSelection } from "../types";

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
    const timelineRef = useRef<any>();
    const BOOT = useRef(false);

    const [isInitializing, setIsInitializing] = useState(true);

    // --- tiny helpers ---
    const size =
      project?.videoSize === "9:16"
        ? { width: 720, height: 1280 }
        : project?.videoSize === "1:1"
        ? { width: 1080, height: 1080 }
        : { width: 1280, height: 720 };

    const handleSelection = useCallback(
      (data: any) => onSelectionChange(data ?? null),
      [onSelectionChange]
    );
    const handleUpdate = useCallback(
      (data: any) => onSelectionChange(data?.current ?? null),
      [onSelectionChange]
    );
    const handlePlay = useCallback(() => onPlaybackChange(true), [onPlaybackChange]);
    const handlePause = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);
    const handleStop = useCallback(() => onPlaybackChange(false), [onPlaybackChange]);

    const waitForHosts = async () => {
      const ok = () => {
        const c = canvasHost.current;
        const t = timelineHost.current;
        const k = controlsHost.current;
        const hasSize = (el?: HTMLElement | null) =>
          !!el && el.offsetParent !== null && el.clientWidth > 0 && el.clientHeight > 0;
        return hasSize(c) && !!k && !!t; // timeline can be empty initially; just needs to exist
      };
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        if (ok()) return;
      }
      throw new Error("Editor hosts not ready");
    };

    useEffect(() => {
      if (BOOT.current) return;
      BOOT.current = true;

      (async () => {
        setIsInitializing(true);
        await waitForHosts();

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();

        // 1) EDIT
        const edit = new Edit(size, "#000000");
        await edit.load();

        // 2) CANVAS (mount to our element)
        const canvas = new Canvas(size, edit, { responsive: true });
        await canvas.load(canvasHost.current!);

        // 3) LOAD TEMPLATE (fall back to hello.json so timeline has content)
        const template =
          (project as any)?.shotstackEditJson && Object.keys((project as any).shotstackEditJson).length
            ? (project as any).shotstackEditJson
            : await fetch("/templates/hello.json").then((r) => r.json());
        await edit.loadEdit(template);

        // 4) KEYBOARD CONTROLS
        const controls = new Controls(edit);
        await controls.load(); // NOTE: no element needed

        // 5) TIMELINE  ❗ IMPORTANT CHANGES
        //    - pass the theme as { theme: customEditorTheme }
        //    - call load() with NO argument (it mounts itself to [data-shotstack-timeline])
        const timelineWidth =
          (timelineHost.current?.clientWidth || size.width);
        const timeline = new Timeline(
          edit,
          { width: timelineWidth, height: 300 },
          { theme: customEditorTheme }
        );
        await timeline.load(); // <-- no element argument

        // events
        edit.events.addEventListener("clip:selected", handleSelection);
        edit.events.addEventListener("clip:updated", handleUpdate);
        edit.events.addEventListener("edit:play", handlePlay);
        edit.events.addEventListener("edit:pause", handlePause);
        edit.events.addEventListener("edit:stop", handleStop);

        // refs
        editRef.current = edit;
        canvasRef.current = canvas;
        timelineRef.current = timeline;

        setIsInitializing(false);
      })().catch((e) => {
        console.error("Studio boot failed:", e);
        BOOT.current = false;
        setIsInitializing(false);
      });

      return () => {
        try {
          editRef.current?.events?.removeEventListener("clip:selected", handleSelection);
          editRef.current?.events?.removeEventListener("clip:updated", handleUpdate);
          editRef.current?.events?.removeEventListener("edit:play", handlePlay);
          editRef.current?.events?.removeEventListener("edit:pause", handlePause);
          editRef.current?.events?.removeEventListener("edit:stop", handleStop);
        } catch {}
        editRef.current = canvasRef.current = timelineRef.current = null;
        BOOT.current = false;
      };
    }, [project, handleSelection, handleUpdate, handlePlay, handlePause, handleStop]);

    useImperativeHandle(ref, () => ({
      addClip: (type, url) => {
        const edit = editRef.current;
        if (!edit) return;
        const t = Number(edit.currentTime || 0);
        const clip: any = { start: t, length: 5 };

        if (type === "audio") {
          clip.asset = { type: "audio", src: url, volume: 0.8 };
          edit.getTrack(4)?.addClip(clip); // Music track
        } else {
          clip.asset = { type: type === "sticker" ? "image" : type, src: url };
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
        const newClip = { ...clip, ...updates };
        const track = edit.getTrack(ti);
        track?.updateClip(ci, newClip);
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
      <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto">
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50 rounded-lg">
            <div className="text-white font-semibold">Starting Editor…</div>
          </div>
        )}

        {/* Canvas */}
        <div
          ref={canvasHost}
          data-shotstack-studio
          className="w-full bg-black rounded-lg overflow-hidden"
          style={{ minHeight: 420 }}
        />

        {/* Controls (keyboard only) */}
        <div
          ref={controlsHost}
          data-shotstack-controls
          style={{ height: 2, visibility: "hidden" }}
        />

        {/* Timeline host – the SDK finds this by attribute */}
        <div
          ref={timelineHost}
          data-shotstack-timeline
          className="w-full bg-gray-900 rounded-lg"
          style={{ height: 300, minHeight: 300 }}
        />
      </div>
    );
  }
);

export default VideoEditor;

