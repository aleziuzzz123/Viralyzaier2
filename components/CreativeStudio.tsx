import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getShotstackSDK, sanitizeShotstackJson, proxyifyEdit, deproxyifyEdit } from '../utils';
import { SparklesIcon } from './Icons';
import { supabaseUrl } from '../services/supabaseClient';

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

export const CreativeStudio: React.FC = () => {
  const { activeProjectDetails, handleUpdateProject, handleRenderProject, session } = useAppContext();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);
  const editRef = useRef<any>(null);
  const startedRef = useRef(false); // Guard against React StrictMode's double mount in dev

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProjectDetails) return;
    
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    // Cleanup function to destroy all SDK instances and remove listeners
    const cleanup = () => {
      cancelled = true;
      try { appRef.current?.destroy?.(); } catch(e) { console.error('App destroy error', e); }
      appRef.current = null;
      editRef.current = null;
    };

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the short-lived authentication token required by the Studio SDK.
        if (!session?.access_token) {
            throw new Error('User is not authenticated. Cannot fetch Studio token.');
        }

        const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/shotstack-studio-token`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
        });
        
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            let errorMessage = `Failed to obtain Studio token: ${tokenResponse.status}.`;
            try {
                const errorJson = JSON.parse(errorText);
                // Prioritize the detailed message from our custom function response
                if (errorJson.detail) {
                    errorMessage = `Error: ${errorJson.detail}`;
                } else if (errorJson.error) {
                    errorMessage += ` ${errorJson.error}`;
                } else {
                    errorMessage += ` ${errorText}`;
                }
            } catch (e) {
                errorMessage += ` ${errorText}`;
            }
            throw new Error(errorMessage);
        }

        const tokenData = await tokenResponse.json();
        if (!tokenData?.token) {
            const detail = tokenData.detail || JSON.stringify(tokenData);
            throw new Error(`Failed to obtain Studio token: The function succeeded but did not return a token. Details: ${detail}`);
        }
        const { token: studioToken } = tokenData;

        await waitUntilVisible(hostRef.current);
        if (cancelled) return;

        const sdk = await getShotstackSDK();
        if (cancelled) return;
        
        const Application = sdk.default;
        const { Edit } = sdk;
        
        if (!Application || !Edit) {
            throw new Error("Shotstack SDK loaded incorrectly. Missing 'default' (Application) or 'Edit' export.");
        }
        
        const template = proxyifyEdit(sanitizeShotstackJson(activeProjectDetails.shotstackEditJson)) || {
            timeline: { background: "#000000", tracks: [] },
            output: { format: 'mp4', size: activeProjectDetails.videoSize === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 }}
        };
        
        if (!studioRef.current || !timelineRef.current || !controlsRef.current) throw new Error('DOM mount points are missing.');

        const app = new Application({
          token: studioToken,
          studio: studioRef.current,
          timeline: timelineRef.current,
          controls: controlsRef.current,
        });
        appRef.current = app;

        const edit = new Edit(app, template);
        editRef.current = edit;
        await app.load(edit);
        if (cancelled) return;
        
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
          let friendlyMessage = e?.message || 'Failed to load the creative studio. Please try refreshing the page.';
          
          // Enhanced error handling to guide the user
          if (friendlyMessage.includes('upstream_sign_failed') || friendlyMessage.includes('upstream_auth_failed') || friendlyMessage.includes('SHOTSTACK_API_KEY')) {
            friendlyMessage = "Authentication with the video service failed. This is usually caused by a missing or incorrect API key.\n\nPlease go to Supabase Dashboard -> Edge Functions -> shotstack-studio-token -> Secrets and ensure the 'SHOTSTACK_API_KEY' is set correctly and has been deployed.";
          }
          setError(friendlyMessage);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return cleanup;
  }, [activeProjectDetails, handleUpdateProject, session]);
      
  const handleRender = () => {
      if (editRef.current && activeProjectDetails) {
        const deproxied = deproxyifyEdit(editRef.current.getEdit());
        handleRenderProject(activeProjectDetails.id, deproxied);
      }
  };

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-red-900/20 text-red-300 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Error Loading Creative Studio</h3>
            <pre className="text-xs text-left font-mono whitespace-pre-wrap">{error}</pre>
        </div>
    );
  }

  return (
    <div ref={hostRef} className="w-full h-full flex flex-col relative bg-black rounded-lg overflow-hidden">
        {loading && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20">
                <div className="text-center">
                    <SparklesIcon className="w-12 h-12 text-indigo-400 animate-pulse mx-auto" />
                    <p className="mt-2 text-white font-semibold">Loading Creative Studio...</p>
                </div>
            </div>
        )}
        <div ref={studioRef} className="flex-grow min-h-0"></div>
        <div ref={timelineRef} className="flex-shrink-0 h-48 border-t-2 border-gray-700"></div>
        <div ref={controlsRef} className="flex-shrink-0 h-12 bg-gray-800"></div>
        <button
            onClick={handleRender}
            className="absolute bottom-52 right-4 z-10 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-sm shadow-lg"
        >
            <SparklesIcon className="w-5 h-5 mr-2" /> Render & Proceed
        </button>
    </div>
  );
};
