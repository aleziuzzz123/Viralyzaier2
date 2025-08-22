import React, { useEffect, useRef } from 'react';
import { getShotstack, resetShotstackBootFlag } from '../lib/shotstackSdk';

/** Helper: wait until next animation frame (DOM painted) */
function nextFrame(): Promise<void> {
  return new Promise((res) => requestAnimationFrame(() => res()));
}

/** Helper: wait until element has a measurable size (height/width) */
async function waitForVisible(el: HTMLElement, tries = 40): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const r = el.getBoundingClientRect();
    if (r.width > 10 && r.height > 10 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden') {
      return;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Host element never became visible');
}

export default function VideoEditor() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let edit: any;
    let canvas: any;
    let timeline: any;
    let controls: any;

    async function boot() {
      // Ensure hosts exist in DOM & have size
      await nextFrame();
      const canvasHost = canvasHostRef.current!;
      const timelineHost = timelineHostRef.current!;
      await waitForVisible(canvasHost);
      await waitForVisible(timelineHost);

      // Guard against double init in dev/hydration
      if (window.__SHOTSTACK_BOOTED__) return;
      window.__SHOTSTACK_BOOTED__ = true;

      // Load SDK once
      const { Edit, Canvas, Controls, Timeline } = await getShotstack();

      // 1) Load a starter template
      const templateUrl =
        'https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json';
      const resp = await fetch(templateUrl);
      const template = await resp.json();

      // 2) Create Edit and load
      edit = new Edit(template.output.size, template.timeline.background);
      await edit.load();

      // 3) Mount CANVAS into our host (SDK looks for [data-shotstack-studio])
      // We render the host here and SDK attaches within it.
      // Ensure the data attributes are on our elements:
      canvasHost.setAttribute('data-shotstack-studio', '');
      timelineHost.setAttribute('data-shotstack-timeline', '');

      canvas = new Canvas(template.output.size, edit);
      await canvas.load();      // attaches to [data-shotstack-studio]

      // 4) Load the template’s edit JSON
      await edit.loadEdit(template);

      // 5) Keyboard controls
      controls = new Controls(edit);
      await controls.load();

      // 6) Timeline
      timeline = new Timeline(
        edit,
        { width: template.output.size.width, height: Math.max(240, Math.min(360, Math.round(window.innerHeight * 0.35))) }
      );
      await timeline.load();    // attaches to [data-shotstack-timeline]

      // Optional: fit canvas nicely
      try {
        canvas.centerEdit();
        canvas.zoomToFit();
      } catch {}

      if (disposed) {
        // If the component unmounted mid-boot, clean up
        try { timeline?.dispose?.(); } catch {}
        try { controls?.dispose?.(); } catch {}
        try { canvas?.dispose?.(); } catch {}
        window.__SHOTSTACK_BOOTED__ = false;
      }
    }

    boot().catch((err) => {
      console.error('[Shotstack boot failed]:', err);
      window.__SHOTSTACK_BOOTED__ = false;
    });

    return () => {
      disposed = true;
      // Allow a later re-boot if user navigates away/back
      resetShotstackBootFlag();
    };
  }, []);

  return (
    <div className="editor">
      {/* CANVAS HOST */}
      <div ref={canvasHostRef} />

      {/* TIMELINE HOST */}
      <div ref={timelineHostRef} />
    </div>
  );
}
