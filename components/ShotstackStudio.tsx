import React, { useEffect, useRef, useState } from 'react';
import { Edit, Canvas, Timeline, Controls } from '@shotstack/shotstack-studio';
import { getErrorMessage } from '../utils';
import Loader from './Loader';

type Props = {
  editJson?: any;
  onReady?: (edit: Edit) => void;
  onError?: (error: Error) => void;
};

// This component is designed to be resilient to React's Strict Mode.
// It initializes the SDK only once and manages its lifecycle carefully.
const ShotstackStudio: React.FC<Props> = ({ editJson, onReady, onError }) => {
  const studioEl = useRef<HTMLDivElement>(null);
  const timelineEl = useRef<HTMLDivElement>(null);
  
  // A single ref to hold all SDK instances. This will persist across Strict Mode re-renders.
  const sdk = useRef<{ edit: Edit; canvas: Canvas; timeline: Timeline; controls: Controls } | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  // This effect handles the one-time initialization and final cleanup of the SDK.
  useEffect(() => {
    // If the SDK has already been initialized, do nothing.
    // This guard prevents re-initialization during Strict Mode's re-renders.
    if (sdk.current) {
      return;
    }

    let isComponentMounted = true;
    
    const init = async () => {
      // Ensure the DOM elements we need to mount to are available.
      if (!studioEl.current || !timelineEl.current) {
        console.error("Shotstack mount points not found in the DOM.");
        if (isComponentMounted) {
            setError("Editor mount points not found.");
            setStatus('error');
        }
        return; 
      }
      
      try {
        const edit = new Edit({ width: 1280, height: 720 }, '#000000');
        await edit.load();
        
        const canvas = new (Canvas as any)(edit, { selector: studioEl.current });
        await canvas.load();

        const timeline = new (Timeline as any)(edit, { selector: timelineEl.current });
        await timeline.load();
        
        const controls = new Controls(edit);
        await controls.load();

        if (isComponentMounted) {
          sdk.current = { edit, canvas, timeline, controls };
          setStatus('ready');
          onReady?.(edit);
        }
      } catch (err) {
        if (isComponentMounted) {
          const message = getErrorMessage(err);
          console.error("Shotstack Studio init failed:", err);
          setError(message);
          setStatus('error');
          onError?.(err instanceof Error ? err : new Error(message));
        }
      }
    };

    init();

    // The cleanup function for when the component TRULY unmounts from the page.
    return () => {
      isComponentMounted = false;
      if (sdk.current) {
        try {
          // Dispose of all SDK components to prevent memory leaks.
          (sdk.current.controls as any)?.dispose();
          (sdk.current.timeline as any)?.dispose();
          (sdk.current.canvas as any)?.dispose();
          (sdk.current.edit as any)?.dispose();
        } catch(e) {
          console.error("Error during Shotstack cleanup:", e);
        }
        sdk.current = null;
      }
    };
  }, [onReady, onError]);

  // A separate effect to react to changes in `editJson` data.
  useEffect(() => {
    if (status === 'ready' && editJson && sdk.current) {
      const { edit, canvas } = sdk.current;
      const loadData = async () => {
        try {
          await edit.loadEdit(editJson);
          canvas.centerEdit();
          canvas.zoomToFit();
        } catch (err) {
          const message = getErrorMessage(err);
          console.error('Failed to load edit JSON:', err);
          setError(message);
          setStatus('error');
          onError?.(err instanceof Error ? err : new Error(message));
        }
      };
      loadData();
    }
  }, [editJson, status, onError]);
  
  return (
    <div className="w-full h-full flex flex-col bg-gray-900 relative">
      <div className="flex-1 min-h-[480px]">
        <div ref={studioEl} data-shotstack-studio className="w-full h-full" />
      </div>
      <div className="h-[240px] flex-shrink-0 bg-gray-800 border-t border-gray-700">
        <div ref={timelineEl} data-shotstack-timeline className="w-full h-full" />
      </div>

      {status !== 'ready' && (
        <div className="absolute z-10 inset-0 bg-gray-900/95 flex items-center justify-center text-center">
            {status === 'loading' && <Loader />}
            {status === 'error' && (
              <div className="bg-red-900/50 border border-red-500 p-6 rounded-lg max-w-lg">
                <h3 className="text-xl font-bold text-red-300 mb-2">Editor Failed to Initialize</h3>
                <p className="text-sm text-red-200 font-mono bg-black/30 p-3 rounded break-words">{error}</p>
                 <p className="text-xs text-gray-400 mt-4">
                    This can happen during development with React's Strict Mode. If the error persists, please check the console for more details.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default ShotstackStudio;
