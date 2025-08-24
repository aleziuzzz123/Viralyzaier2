import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK } from '../utils';
import { sanitizeShotstackJson } from '../utils';
import { SparklesIcon } from './Icons';

const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject } = useAppContext();
  const studioRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const editRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProjectDetails) return;
    
    let cancelled = false;
    let edit: any, canvas: any, controls: any, timeline: any;

    (async () => {
      try {
        setLoading(true);

        // Wait for DOM containers to exist
        await new Promise(r => requestAnimationFrame(() => r(null)));
        if (cancelled || !studioRef.current || !timelineRef.current) return;

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

        canvas = new Canvas(template.output.size, edit, {
          mount: studioRef.current!,
        });
        await canvas.load();

        await edit.loadEdit(template);

        controls = new Controls(edit);
        await controls.load();

        timeline = new Timeline(edit, {
          width: template.output.size.width,
          height: 288,
          mount: timelineRef.current!,
        });
        await timeline.load();

        const onEditUpdated = (newEdit: any) => {
            if(!cancelled) {
                // Debounce this in a real app if performance is an issue
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

  if (error) {
    return (
      <div style={{padding:'20px'}}>
        <div style={{background:'#fce8e6',color:'#b3261e',padding:12,borderRadius:8}}>
          Creative Studio failed: {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full gap-4">
      {loading && (
        <div className="flex-grow flex items-center justify-center">
            <div className="text-center text-lg font-semibold">Loading Editor...</div>
        </div>
      )}
       <div className={`flex-grow min-h-0 ${loading ? 'hidden' : ''}`} ref={studioRef} data-shotstack-studio />
       <div className={`flex-shrink-0 h-72 ${loading ? 'hidden' : ''}`} ref={timelineRef} data-shotstack-timeline />
       <div className={`text-center flex-shrink-0 ${loading ? 'hidden' : ''}`}>
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