import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { getShotstackSDK } from "../lib/shotstackSdk";
import { Project, ShotstackClipSelection } from "../types";
import { customEditorTheme } from "../themes/customEditorTheme";
import { supabaseUrl } from "../services/supabaseClient";

declare global {
  interface Window {
    __SHOTSTACK_BOOTED__?: boolean;
  }
}

const isProxied = (u: string) => /\/functions\/v1\/asset-proxy\//i.test(u);
const SKIP_PROXY = /(^\/vendor\/)|(^https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com))/i;

// Always use the PATH form so the URL ends with the real filename.ext
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

export interface VideoEditorHandles {
  addClip: (type: "video" | "image" | "audio" | "sticker", url: string) => void;
  deleteClip: (trackIndex: number, clipIndex: number) => void;
  getEdit: () => any;
  loadEdit: (edit: any) => void;
  getCurrentTime: () => number;
  getTotalDuration: () => number;
}

type Props = {
  project: Project;
  onSelectionChange: (s: ShotstackClipSelection | null) => void;
};

const VideoEditor = forwardRef<VideoEditorHandles, Props>(({ project, onSelectionChange }, ref) => {
  const inst = useRef<{ edit?: any; canvas?: any; controls?: any; timeline?: any }>({});
  const canvasEl = useRef<HTMLDivElement>(null);
  const controlsEl = useRef<HTMLDivElement>(null);
  const timelineEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    // Define a stable handler for the deselection event within the effect's scope
    const handleDeselected = () => onSelectionChange(null);

    (async () => {
      if (window.__SHOTSTACK_BOOTED__) return; // prevent double-boot (StrictMode/HMR)
      window.__SHOTSTACK_BOOTED__ = true;

      const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();

      const size =
        project.videoSize === "9:16" ? { width: 720, height: 1280 } :
        project.videoSize === "1:1"  ? { width: 1080, height: 1080 } :
                                       { width: 1280, height: 720 };

      const edit = new Edit({ size, background: "#000000" });
      await edit.load();

      // Load a minimal, valid edit so Canvas/Timeline always mount
      await edit.loadEdit({
        timeline: { background: "#000000", tracks: [] },
        output: { format: "mp4", size }
      });

      if (cancelled || !canvasEl.current || !controlsEl.current || !timelineEl.current) return;

      const canvas = new Canvas(canvasEl.current, edit, { size, responsive: true });
      await canvas.load();

      const controls = new Controls(controlsEl.current, edit);
      await controls.load();

      const timeline = new Timeline(timelineEl.current, edit, { theme: customEditorTheme });
      await timeline.load();

      if (cancelled) return;
      inst.current = { edit, canvas, controls, timeline };

      if (project.shotstackEditJson && Object.keys(project.shotstackEditJson).length > 0) {
        console.log("Loading saved edit from project...");
        await edit.loadEdit(project.shotstackEditJson);
      } else if (project.script && project.script.scenes.length > 0) {
        console.log("Generating initial timeline from script...");

        // Clear any default tracks
        while(edit.getEdit().timeline.tracks.length) {
          edit.deleteTrack(0);
        }

        edit.addTrack();     // Track 0 (Main Visuals)
        edit.addTrack();  // Track 1 (Subtitles)
        edit.addTrack();     // Track 2 (B-Roll)
        edit.addTrack();        // Track 3 (SFX)
        edit.addTrack();      // Track 4 (Music)
        edit.addTrack();  // Track 5 (Voiceover)

        let currentTime = 0;
        for (const [index, scene] of project.script.scenes.entries()) {
          const timeParts = scene.timecode.split('-').map(t => parseFloat(t.replace('s', '')));
          const startTime = !isNaN(timeParts[0]) ? timeParts[0] : currentTime;
          const endTime = !isNaN(timeParts[1]) ? timeParts[1] : (startTime + 5);
          const duration = Math.max(0.1, endTime - startTime);
          currentTime = endTime;

          if (scene.storyboardImageUrl) {
            edit.addClip(0, {
              asset: { type: 'image', src: proxyUrl(scene.storyboardImageUrl, `scene-${index}-image.jpg`) },
              start: startTime,
              length: duration,
              fit: 'cover',
              transition: { in: 'fade', out: 'fade', duration: 0.5 }
            });
          }

          const voiceoverUrl = project.voiceoverUrls?.[index];
          if (voiceoverUrl) {
            edit.addClip(5, {
              asset: { type: 'audio', src: proxyUrl(voiceoverUrl, `scene-${index}-voiceover.mp3`) },
              start: startTime,
              length: duration,
            });
          }

          if (scene.onScreenText) {
            edit.addClip(1, {
              asset: { type: 'title', text: scene.onScreenText, style: 'subtitle' },
              start: startTime,
              length: duration,
            });
          }
        }
      }

      // Selection events
      edit.events.on("clip:selected", onSelectionChange);
      edit.events.on("clip:deselected", handleDeselected);
    })().catch((e) => {
      console.error("[Shotstack] boot error:", e);
      window.__SHOTSTACK_BOOTED__ = false;
    });

    return () => {
      cancelled = true;
      const { edit, canvas, controls, timeline } = inst.current;
      try {
        edit?.events?.off?.("clip:selected", onSelectionChange);
        edit?.events?.off?.("clip:deselected", handleDeselected);
      } catch {}
      // SDK uses destroy() for Timeline/Controls; Canvas exposes dispose()
      timeline?.destroy(true);
      controls?.destroy(true);
      canvas?.dispose();
      inst.current = {};
      window.__SHOTSTACK_BOOTED__ = false;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    addClip: (type, url) => {
      const edit = inst.current.edit;
      if (!edit) return;
      const t = edit.currentTime || 0;

      const clip: any = { start: Number(t || 0), length: 5 };

      if (type === "audio") {
        clip.asset = { type: "audio", src: proxyUrl(url), volume: 0.8 };
        edit.addClip(4, clip); // Music track
      } else {
        clip.asset = { type: type === "sticker" ? "image" : type, src: proxyUrl(url) };
        clip.fit = "cover";
        edit.addClip(0, clip); // A-Roll
      }
    },
    deleteClip: (ti, ci) => inst.current.edit?.deleteClip(ti, ci),
    getEdit: () => inst.current.edit?.getEdit(),
    loadEdit: (e: any) => inst.current.edit?.loadEdit(e),
    getCurrentTime: () => inst.current.edit?.currentTime || 0,
    getTotalDuration: () => inst.current.edit?.totalDuration || 0,
  }));

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* Must be visible. Canvas renders into this container. */}
      <div ref={canvasEl} data-shotstack-studio style={{ flex: "1 1 auto", minHeight: "420px" }}
           className="w-full bg-black relative rounded-lg overflow-hidden" />
      <div ref={controlsEl} data-shotstack-controls className="w-full flex-shrink-0" />
      <div ref={timelineEl} data-shotstack-timeline style={{ height: "300px", flexShrink: 0 }}
           className="w-full bg-gray-800 rounded-lg" />
    </div>
  );
});

export default VideoEditor;