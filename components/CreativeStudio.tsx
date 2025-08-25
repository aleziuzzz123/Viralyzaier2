import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK, sanitizeShotstackJson, proxyifyEdit, deproxyifyEdit, ensurePixiSound } from '../utils';
import { SparklesIcon } from './Icons';

// Helper to wait until a DOM element is rendered and has a minimum size.
const waitUntilVisible = (el: HTMLElement | null, minW = 400, minH = 300) =>
  new Promise<void>((resolve) => {
    if (!el) return resolve();
    const isVisible = () => {
      const rect = el.getBoundingClientRect();
      return el.offsetParent !== null && rect.width >= minW && rect.height >= minH;
    };
    if (isVisible()) return resolve();
    const observer = new ResizeObserver(() => isVisible() && (observer.disconnect(), resolve()));
    observer.observe(el);
  });

const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const editRef = useRef<any>(null);
  const startedRef = useRef(false); // Guard against React StrictMode's double mount in dev

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProjectDetails) return;
    
    if (startedRef.current) return;
    startedRef.current = true;

    let edit: any;
    let cancelled = false;

    // Cleanup function to destroy all SDK instances and remove listeners
    const cleanup = () => {
      cancelled = true;
      try { editRef.current?.destroy?.(); } catch(e) { console.error('Edit destroy error', e); }
      editRef.current = null;
    };

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the short-lived authentication token required by the Studio SDK
        const tokenResponse = await fetch('/functions/v1/shotstack-studio-token', { method: 'POST' });
        if (!tokenResponse.ok) {
            const err = await tokenResponse.json();
            throw new Error(`Failed to obtain Studio token: ${err.detail || tokenResponse.statusText}`);
        }
        const { token: studioToken } = await tokenResponse.json();

        await waitUntilVisible(hostRef.current);
        if (cancelled) return;

        // 1. Ensure Pixi Sound is registered before the Studio SDK is even imported.
        await ensurePixiSound();
        if (cancelled) return;

        // 2. Load the Shotstack SDK. This utility now waits for the sound module.
        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();
        if (cancelled) return;
        
        // 3. Prepare the timeline JSON
        const sanitizedJson = sanitizeShotstackJson(activeProjectDetails.shotstackEditJson);
        const proxiedJson = proxyifyEdit(sanitizedJson);
        const template = proxiedJson || {
            timeline: { background: "#000000", tracks: [] },
            output: { format: 'mp4', size: activeProjectDetails.videoSize === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 }}
        };
        
        // 4. Initialize and load the core Edit instance with the token.
        edit = new Edit({ size: template.output.size, background: template.timeline.background, token: studioToken });
        editRef.current = edit;
        await edit.load();
        await edit.loadEdit(template);
        if (cancelled) return;

        // 5. Only after Edit is ready, create and mount the UI components.
        if (!studioRef.current || !timelineRef.current) throw new Error('DOM mount points are missing.');

        const canvas = new Canvas(studioRef.current, edit);
        const controls = new Controls(edit);
        const timeline = new Timeline(timelineRef.current, edit);
        
        await Promise.all([
          canvas.load(),
          controls.load(),
          timeline.load(),
        ]);
        if (cancelled) return;
        
        // 6. Set up event listener for autosaving changes
        const onEditUpdated = (newEdit: any) => {
            if(!cancelled) {
                const deproxiedEdit = deproxyifyEdit(newEdit);
                handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: deproxiedEdit });
            }
        };
        edit.events.on('edit:updated', onEditUpdated);
        
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          console.error('[Studio Init Failed]', e);
          setError(e?.message || 'Failed to load the creative studio. Please try refreshing the page.');
          setLoading(false);
        }
      }
    })();
    
    return cleanup;

  }, [activeProjectDetails, handleUpdateProject]);

  const onRender = () => {
      if (editRef.current && activeProjectDetails) {
          const finalJsonFromEditor = editRef.current.getEdit();
          const finalJsonForRender = deproxyifyEdit(finalJsonFromEditor);
          handleRenderProject(activeProjectDetails.id, finalJsonForRender);
      }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={hostRef} className="shotstack-host flex-grow relative">
        {(loading || error) && (
            <div className="absolute inset-0 grid place-items-center z-10">
                {loading && <div className="text-slate-400 font-semibold">Loading Creative Studio...</div>}
                {error && <div className="bg-red-900/50 text-red-300 border border-red-500 p-4 rounded-lg max-w-md text-center">{error}</div>}
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
