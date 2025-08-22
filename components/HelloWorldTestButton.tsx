// components/HelloWorldTestButton.tsx
import React, { useState } from 'react';
import { queueRender, checkRender } from '../services/shotstackRender';

export default function HelloWorldTestButton() {
  const [status, setStatus] = useState<string>('idle');

  async function run() {
    try {
      setStatus('Queuing…');
      const tpl = await (await fetch('/templates/hello.json')).json();
      const id = await queueRender(tpl);
      setStatus(`Queued: ${id}`);

      // simple poll
      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await checkRender(id);
        const st = s?.response?.status;
        if (st) setStatus(st);
        if (st === 'done' || st === 'failed') {
          done = true;
          if (st === 'done') {
            const url = s?.response?.url;
            setStatus(`done → ${url}`);
            window.open(url, '_blank');
          }
        }
      }
    } catch (e: any) {
      setStatus(`error: ${e?.message || e}`);
    }
  }

  return (
    <button
      onClick={run}
      className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
      title="Queue a Hello World render with Shotstack"
    >
      Render Hello World
      <span className="ml-2 text-xs opacity-80">({status})</span>
    </button>
  );
}
