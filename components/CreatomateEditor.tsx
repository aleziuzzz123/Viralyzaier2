import React, { useEffect, useRef, useState } from 'react';
import type { Editor, EditorOptions } from '@creatomate/editor';

export default function CreatomateEditor({ options }: { options: EditorOptions }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamic import of the Editor class to allow for code splitting
    import('@creatomate/editor')
      .then(({ Editor: CreatomateEditor }) => {
        if (containerRef.current && !editorRef.current) {
          try {
            const editor = new CreatomateEditor(containerRef.current, options);
            editorRef.current = editor;
            // Expose for debugging if needed
            (window as any).__creatomateEditor = editor;
          } catch (e: any) {
            console.error('Creatomate init failed:', e);
            setError('Editor failed to load. Please check network and build logs.');
          }
        }
      })
      .catch((e) => {
        console.error('Failed to load Creatomate editor module:', e);
        setError('Editor module could not be downloaded.');
      });

    // Cleanup function to dispose of the editor instance when the component unmounts
    return () => {
      if (editorRef.current && typeof editorRef.current.dispose === 'function') {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [options]);

  if (error) {
    return (
      <div className="p-4 text-sm text-red-400 bg-red-950/20 rounded-lg h-full flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-testid="creatomate-editor"
    />
  );
}
