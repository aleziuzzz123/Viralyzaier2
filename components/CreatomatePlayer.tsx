import { useEffect, useRef } from 'react';
import Preview from '@creatomate/preview';
export default function CreatomatePlayer({ source }: { source?: any }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const token = (import.meta as any).env?.VITE_CREATOMATE_PUBLIC_TOKEN || (window as any).ENV?.VITE_CREATOMATE_PUBLIC_TOKEN;
    if (!token) { console.error('Missing VITE_CREATOMATE_PUBLIC_TOKEN'); return; }
    const player = new Preview(ref.current, 'player', token);
    // if (source) player.load(source);
    return () => { try { (player as any)?.destroy?.(); } catch {} };
  }, [source]);
  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}