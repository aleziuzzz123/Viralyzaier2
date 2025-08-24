import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK } from '../utils';
import { sanitizeShotstackJson } from '../utils';
import { SparklesIcon } from './Icons';

const waitUntilVisible = (el: HTMLElement | null, minW = 400, minH = 300) =>
  new Promise<void>((resolve) => {
    if (!el) return resolve();
    const ok = () => {
      const r = el.getBoundingClientRect();
      return el.offsetParent !== null && r.width >= minW && r.height >= minH;
    };
    if (ok()) return resolve();

    const ro = new ResizeObserver(() => ok() && (ro.disconnect(), resolve()));
    ro.observe(el);

    const id = window.setInterval(() => {
      if (ok()) {
        clearInterval(id);
        ro.disconnect();
        resolve();
      }
    }, 100);
  });


const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const editRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProjectDetails) return;
    
    let edit: any, canvas: any, controls: any, timeline: any;
    let onResize: () => void;
    let cancelled = false;

    const cleanup = () => {
      cancelled = true;
      if (onResize) window.removeEventListener("resize", onResize);
      try { timeline?.destroy?.(); } catch(e) { console.error('timeline destroy error', e); }
      try { controls?.destroy?.(); } catch(e) { console.error('controls destroy error', e); }
      try { canvas?.destroy?.(); } catch(e) { console.error('canvas destroy error', e); }
      try { edit?.destroy?.(); } catch(e) { console.error('edit destroy error', e); }
      editRef.current = null;
    };

    (async () => {
      try {
        setLoading(true);
        setError(null);

        await waitUntilVisible(hostRef.current);
        if (cancelled) return;

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();
        if (cancelled) return;
        
        const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);

        const template = sanitizedJson || {
            timeline: { background: "#000000", tracks: [ { name: 'A-Roll', clips: [] }, { name: 'Overlays', clips: [] }, { name: 'Audio', clips: [] }, { name: 'SFX', clips: [] }, { name: 'Music', clips: [] } ]},
            output: { format: 'mp4', size: activeProjectDetails.videoSize === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 }}
        };
        
        edit = new Edit(template.output.size, template.timeline.background);
        editRef.current = edit;
        await edit.load();
        await edit.loadEdit(template);
        if (cancelled) return;

        canvas = new Canvas(template.output.size, edit, {
          mount: studioRef.current!,
        });
        await canvas.load();
        if (cancelled) return;

        controls = new Controls(edit);
        await controls.load();
        if (cancelled) return;

        timeline = new Timeline(edit, {
          mount: timelineRef.current!,
          height: 320,
          width: hostRef.current!.getBoundingClientRect().width,
        });
        await timeline.load();
        if (cancelled) return;

        const onEditUpdated = (newEdit: any) => {
            if(!cancelled) {
                handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: newEdit });
            }
        };
        edit.events.on('edit:updated', onEditUpdated);
        
        onResize = () => {
          if (hostRef.current) {
            const w = Math.floor(hostRef.current.getBoundingClientRect().width);
            canvas?.resize?.(w, undefined);
            timeline?.resize?.(w, undefined);
          }
        };
        onResize();
        window.addEventListener("resize", onResize);
        
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          console.error('[studio init failed]', e);
          setError(e?.message || 'Failed to load editor');
          setLoading(false);
        }
      }
    })();
    
    return cleanup;

  }, [activeProjectDetails, handleUpdateProject]);

  const onRender = () => {
      if (editRef.current && activeProjectDetails) {
          const finalJson = editRef.current.getEdit();
          handleRenderProject(activeProjectDetails.id, finalJson);
      }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={hostRef} className="shotstack-host flex-grow">
        {loading && (
          <div className="shotstack-loading absolute inset-0 grid place-items-center text-slate-400 font-semibold pointer-events-none z-10">
            Loading Editor...
          </div>
        )}
        {error && (
          <div className="shotstack-error bg-red-200 text-red-900 border border-red-300 p-3 rounded-lg m-4 absolute z-10">
            Error: {error}
          </div>
        )}
        <div ref={studioRef} data-shotstack-studio className={loading || error ? 'invisible' : ''} />
        <div ref={timelineRef} data-shotstack-timeline className={loading || error ? 'invisible' : ''} />
      </div>
       {!loading && !error && (
        <div className="text-center py-4 flex-shrink-0">
           <button 
              onClick={onRender} 
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all disabled:bg-gray-600"
          >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Render & Proceed to Analysis
          </button>
       </div>
      )}
    </div>
  );
};

export default CreativeStudio;