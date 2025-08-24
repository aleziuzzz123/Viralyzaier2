import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK } from '../utils';
import { sanitizeShotstackJson } from '../utils';
import { SparklesIcon } from './Icons';

// Helper to wait for an element to be visible and have a minimum size
function waitForVisible(el: HTMLElement, minW = 300, minH = 200): Promise<void> {
  return new Promise((resolve) => {
    const checkVisibility = () => {
      const rect = el.getBoundingClientRect();
      return el.offsetParent !== null && rect.width >= minW && rect.height >= minH;
    };

    if (checkVisibility()) {
      return resolve();
    }

    const observer = new ResizeObserver(() => {
      if (checkVisibility()) {
        observer.disconnect();
        clearInterval(intervalId);
        resolve();
      }
    });
    observer.observe(el);

    const intervalId = setInterval(() => {
      if (checkVisibility()) {
        observer.disconnect();
        clearInterval(intervalId);
        resolve();
      }
    }, 100);
  });
}

const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const editRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProjectDetails) return;
    
    let cancelled = false;
    let edit: any, canvas: any, controls: any, timeline: any;
    let onResize: (() => void) | null = null;

    (async () => {
      try {
        setLoading(true);

        // 1. Wait until the main container is visible and sized
        const wrap = wrapRef.current;
        if (!wrap) return;
        await waitForVisible(wrap);
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

        if (cancelled || !studioRef.current || !timelineRef.current) return;

        canvas = new Canvas(template.output.size, edit, {
          mount: studioRef.current,
        });
        await canvas.load();

        await edit.loadEdit(template);

        controls = new Controls(edit);
        await controls.load();

        timeline = new Timeline(edit, {
          width: template.output.size.width,
          height: 300, // Matches CSS height
          mount: timelineRef.current,
        });
        await timeline.load();

        // 2. Add resize handler
        onResize = () => {
          if (studioRef.current && timelineRef.current) {
            const r = studioRef.current.getBoundingClientRect();
            canvas?.resize?.(Math.floor(r.width), undefined); // keep aspect
            timeline?.resize?.(Math.floor(r.width), undefined);
          }
        };
        onResize();
        window.addEventListener("resize", onResize);

        const onEditUpdated = (newEdit: any) => {
            if(!cancelled) {
                handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: newEdit });
            }
        };
        edit.events.on('edit:updated', onEditUpdated);

        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          console.error('[studio init failed]', e);
          setError(e?.message || 'Failed to load editor');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener("resize", onResize);
      try { timeline?.destroy?.(); } catch(e) { console.error('timeline destroy error', e); }
      try { controls?.destroy?.(); } catch(e) { console.error('controls destroy error', e); }
      try { canvas?.destroy?.(); } catch(e) { console.error('canvas destroy error', e); }
      try { edit?.destroy?.(); } catch(e) { console.error('edit destroy error', e); }
      editRef.current = null;
    };
  }, [activeProjectDetails, handleUpdateProject]);

  const onRender = () => {
      if (editRef.current && activeProjectDetails) {
          const finalJson = editRef.current.getEdit();
          handleRenderProject(activeProjectDetails.id, finalJson);
      }
  }

  return (
    <div ref={wrapRef} className="shotstack-stage3-wrap">
      {error && (
        <div className="shotstack-alert">Error Loading Video Editor: {error}</div>
      )}
      {loading && <div className="shotstack-loading">Loading Editor...</div>}
      
      <div ref={studioRef} data-shotstack-studio />
      <div ref={timelineRef} data-shotstack-timeline />
      
       <div className="text-center mt-4">
           <button 
              onClick={onRender} 
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all disabled:bg-gray-600"
          >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Render & Proceed to Analysis
          </button>
       </div>
    </div>
  );
};

export default CreativeStudio;
