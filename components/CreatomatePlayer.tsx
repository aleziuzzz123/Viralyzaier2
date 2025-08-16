
import { useEffect, useRef } from 'react';

type PreviewConstructor = new (container: HTMLElement, mode: string, token: string) => any;

export default function CreatomatePlayer({ sourceId }: { sourceId?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let player: any;

    const initializePlayer = async () => {
        if (!ref.current) return;

        const token = (import.meta as any).env?.VITE_CREATOMATE_PUBLIC_TOKEN || (window as any).ENV?.VITE_CREATOMATE_PUBLIC_TOKEN;
        if (!token) { 
          console.error('Missing VITE_CREATOMATE_PUBLIC_TOKEN');
          ref.current.innerHTML = `<div style="color:red; padding:1rem;">Error: Missing VITE_CREATOMATE_PUBLIC_TOKEN. Check Vercel environment variables.</div>`;
          return; 
        }

        try {
          // The Creatomate module uses a named export 'Preview' for the constructor.
          const { Preview } = await import('@creatomate/preview');
          const PreviewConstructor = Preview;
          
          if (typeof PreviewConstructor !== 'function') {
            throw new Error('The imported Creatomate Preview module does not have a valid constructor.');
          }

          player = new PreviewConstructor(ref.current, 'player', token);

          if (sourceId) {
            // Wait for the player to be fully initialized before trying to load a source into it.
            player.onReady = async () => {
              try {
                await player.setSource(sourceId);
              } catch (e) {
                console.error(`Failed to load Creatomate source '${sourceId}':`, e);
                 if (ref.current) {
                  ref.current.innerHTML = `<div style="color:red; padding:1rem;">Error: Failed to load video source. The template may be misconfigured.</div>`;
                }
              }
            };
          }

        } catch (e) {
          console.error("Failed to initialize Creatomate player:", e);
          if (ref.current) {
            ref.current.innerHTML = `<div style="color:red; padding:1rem;">Failed to load player. Check the browser console for details.</div>`;
          }
        }
    };
    
    initializePlayer();
    
    return () => { 
      if (player && typeof player.destroy === 'function') {
        try { player.destroy(); } catch (e) { console.error("Error destroying Creatomate player:", e); }
      }
    };
  }, [sourceId]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
