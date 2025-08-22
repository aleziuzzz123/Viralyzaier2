import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window { SHOTSTACK_SDK?: Promise<typeof import('@shotstack/shotstack-studio')>; }
}

async function loadSDK() {
  if (!window.SHOTSTACK_SDK) {
    window.SHOTSTACK_SDK = import('@shotstack/shotstack-studio'); // 1.5.0 in package.json
  }
  return window.SHOTSTACK_SDK;
}

export default function StudioPage() {
  const canvasHost = useRef<HTMLDivElement>(null);
  const timelineHost = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Wait for hosts
        for (let i = 0; i < 120; i++) {
          if (canvasHost.current && timelineHost.current) break;
          await new Promise(r => requestAnimationFrame(r));
        }

        const { Edit, Canvas, Controls, Timeline } = await loadSDK();

        const res = await fetch('https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json');
        if (!res.ok) throw new Error(`template ${res.status}`);
        const template = await res.json();

        const size = template.output.size;
        const bg = template.timeline.background ?? '#000';

        const edit = new Edit(size, bg);
        await edit.load();

        // Renders into [data-shotstack-studio]
        const canvas = new Canvas(size, edit);
        await canvas.load();

        await edit.loadEdit(template);

        const controls = new Controls(edit);
        await controls.load();

        // Renders into [data-shotstack-timeline]
        const timeline = new Timeline(edit, { width: size.width, height: 300 });
        await timeline.load();

        // Correct event API
        edit.events.on('clip:selected', () => {});
        edit.events.on('clip:updated', () => {});
        if (!cancelled) {/* loaded */}
      } catch (e: any) {
        console.error('[Shotstack] boot failed:', e);
        if (!cancelled) setErr(e?.message ?? String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (err) {
    return (
      <div style={{padding:16,color:'#b91c1c',background:'#fee2e2',borderRadius:8}}>
        <strong>Creative Studio failed:</strong> {err}
      </div>
    );
  }

  return (
    <div style={{padding:16}}>
      <div ref={canvasHost} data-shotstack-studio style={{minHeight:420, background:'#000', borderRadius:8}} />
      <div ref={timelineHost} data-shotstack-timeline style={{minHeight:300, background:'#111827', borderRadius:8, marginTop:16}} />
    </div>
  );
}
