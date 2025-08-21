import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { getShotstackSDK } from "../lib/shotstackSdk";
import { Project, ShotstackClipSelection } from "../types";
import { customEditorTheme } from "../themes/customEditorTheme";
import { supabaseUrl } from "../services/supabaseClient";

// --- URL Proxy Helpers ---
declare global {
  interface Window {
    __SHOTSTACK_BOOTED__?: boolean;
  }
}
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

// --- Types ---
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

// --- Visibility Helper ---
const waitForVisibleSize = (el: HTMLElement, timeout = 5000) =>
  new Promise<void>((resolve, reject) => {
    if (!el) return reject(new Error("Host element not found for Shotstack SDK"));
    const isVisible = () => el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).display !== "none";
    if (isVisible()) return resolve();
    let timeoutId: number;
    const observer = new ResizeObserver(() => {
      if (isVisible()) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(el);
    timeoutId = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error("Shotstack host element never became visible or has zero size"));
    }, timeout);
  });

// --- Component ---
const VideoEditor = forwardRef<VideoEditorHandles, Props>(({ project, onSelectionChange }, ref) => {
  const inst = useRef<{ edit?: any; canvas?: any; controls?: any; timeline?: any; ro?: ResizeObserver }>({});
  const canvasEl = useRef<HTMLDivElement>(null);
  const controlsEl = useRef<HTMLDivElement>(null);
  const timelineEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const handleDeselected = () => onSelectionChange(null);

    (async () => {
      if (window.__SHOTSTACK_BOOTED__) return;
      window.__SHOTSTACK_BOOTED__ = true;

      const studioHost = canvasEl.current;
      const controlsHost = controlsEl.current;
      const timelineHost = timelineEl.current;

      if (!studioHost || !controlsHost || !timelineHost) {
        console.error("Shotstack hosts missing"); return;
      }
      
      await waitForVisibleSize(timelineHost);
      if (cancelled) return;

      const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();

      const size =
        project.videoSize === "9:16" ? { width: 720, height: 1280 } :
        project.videoSize === "1:1"  ? { width: 1080, height: 1080 } :
                                       { width: 1280, height: 720 };

      const edit = new Edit({ size, background: "#000000" });
      await edit.load();
      if (cancelled) return;

      const canvas = new Canvas(studioHost, edit, { size, responsive: true });
      await canvas.load();
      if (cancelled) return;

      const controls = new Controls(controlsHost, edit);
      await controls.load();
      if (cancelled) return;

      const tlH = Math.max(180, timelineHost.clientHeight || 300);
      const tlW = Math.max(600, timelineHost.clientWidth);
      const timeline = new Timeline(timelineHost, edit, { width: tlW, height: tlH }, { theme: customEditorTheme });
      await timeline.load();
      if (cancelled) return;

      const ro = new ResizeObserver(() => {
        const w = Math.max(600, timelineHost.clientWidth);
        const h = Math.max(180, timelineHost.clientHeight);
        try { timeline.resize(w, h); } catch {}
      });
      ro.observe(timelineHost);

      inst.current = { edit, canvas, controls, timeline, ro };

      if (project.shotstackEditJson && Object.keys(project.shotstackEditJson).length > 0) {
        await edit.loadEdit(project.shotstackEditJson);
      } else if (project.script?.scenes.length) {
        while(edit.getEdit().timeline.tracks.length) { edit.deleteTrack(0); }
        edit.addTrack(); edit.addTrack(); edit.addTrack(); edit.addTrack(); edit.addTrack(); edit.addTrack();
        let currentTime = 0;
        for (const [index, scene] of project.script.scenes.entries()) {
          const [startStr, endStr] = scene.timecode.split('-');
          const startTime = parseFloat(startStr) || currentTime;
          const endTime = parseFloat(endStr) || (startTime + 5);
          const duration = Math.max(0.1, endTime - startTime);
          currentTime = endTime;

          if (scene.storyboardImageUrl) {
            edit.addClip(0, { asset: { type: 'image', src: proxyUrl(scene.storyboardImageUrl) }, start: startTime, length: duration, fit: 'cover', transition: { in: 'fade', out: 'fade', duration: 0.5 } });
          }
          if (project.voiceoverUrls?.[index]) {
            edit.addClip(5, { asset: { type: 'audio', src: proxyUrl(project.voiceoverUrls[index]) }, start: startTime, length: duration });
          }
          if (scene.onScreenText) {
            edit.addClip(1, { asset: { type: 'title', text: scene.onScreenText, style: 'subtitle' }, start: startTime, length: duration });
          }
        }
      }

      edit.events.on("clip:selected", onSelectionChange);
      edit.events.on("clip:deselected", handleDeselected);
    })().catch((e) => {
      console.error("[Shotstack] boot error:", e);
      window.__SHOTSTACK_BOOTED__ = false;
    });

    return () => {
      cancelled = true;
      const { edit, canvas, controls, timeline, ro } = inst.current;
      ro?.disconnect();
      try {
        edit?.events?.off?.("clip:selected", onSelectionChange);
        edit?.events?.off?.("clip:deselected", handleDeselected);
      } catch {}
      timeline?.destroy?.(true);
      controls?.destroy?.(true);
      canvas?.dispose?.();
      inst.current = {};
      window.__SHOTSTACK_BOOTED__ = false;
    };
  }, [project, onSelectionChange]);

  useImperativeHandle(ref, () => ({
    addClip: (type, url) => {
      const edit = inst.current.edit;
      if (!edit) return;
      const t = edit.currentTime || 0;
      const clip: any = { start: Number(t || 0), length: 5 };
      if (type === "audio") {
        clip.asset = { type: "audio", src: proxyUrl(url), volume: 0.8 };
        edit.addClip(4, clip); // Music Track
      } else {
        clip.asset = { type: type === "sticker" ? "image" : type, src: proxyUrl(url) };
        clip.fit = "cover";
        edit.addClip(2, clip); // B-Roll track
      }
    },
    deleteClip: (ti, ci) => inst.current.edit?.deleteClip(ti, ci),
    getEdit: () => inst.current.edit?.getEdit(),
    loadEdit: (e: any) => inst.current.edit?.loadEdit(e),
    getCurrentTime: () => inst.current.edit?.currentTime || 0,
    getTotalDuration: () => inst.current.edit?.totalDuration || 0,
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      <div
        ref={canvasEl}
        data-shotstack-studio
        className="w-full bg-black rounded-lg overflow-hidden relative"
        style={{ flex: '1 1 auto', minHeight: 420 }}
      />
      <div ref={controlsEl} data-shotstack-controls className="w-full flex-shrink-0" />
      <div
        ref={timelineEl}
        data-shotstack-timeline
        className="w-full bg-[#10131a] rounded-lg flex-shrink-0"
        style={{ height: 300, minHeight: 300, display: "block" }}
      />
    </div>
  );
});

export default VideoEditor;