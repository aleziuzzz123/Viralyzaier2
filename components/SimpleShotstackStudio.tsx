import React, { useEffect, useRef, useState } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";

interface SimpleShotstackStudioProps {
  project?: any;
}

const SimpleShotstackStudio: React.FC<SimpleShotstackStudioProps> = ({ project }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log('🎬 SimpleShotstackStudio: Component mounted');
    console.log('🎬 SimpleShotstackStudio: Project data:', project);
    
    const initializeEditor = async () => {
      try {
        console.log('🚀 SimpleShotstackStudio: Starting initialization...');
        
        // Wait a bit to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!canvasRef.current || !timelineRef.current) {
          console.error('❌ SimpleShotstackStudio: DOM elements not ready');
          setError('DOM elements not ready');
          return;
        }

        console.log('✅ SimpleShotstackStudio: DOM elements ready');
        console.log('🔧 SimpleShotstackStudio: Shotstack SDK available:', { Edit, Canvas, Controls, Timeline });

        // Create a simple template
        const template = {
          timeline: {
            tracks: [],
            background: '#000000'
          },
          output: {
            size: { width: 1280, height: 720 },
            format: 'mp4'
          }
        };

        // Initialize the edit
        const edit = new Edit(template.output.size, template.timeline.background);
        console.log('✅ SimpleShotstackStudio: Edit created');

        // Initialize canvas
        const canvas = new Canvas(edit, canvasRef.current);
        console.log('✅ SimpleShotstackStudio: Canvas initialized');

        // Initialize timeline
        const timeline = new Timeline(edit, timelineRef.current);
        console.log('✅ SimpleShotstackStudio: Timeline initialized');

        // Initialize controls
        const controls = new Controls(edit);
        console.log('✅ SimpleShotstackStudio: Controls initialized');

        setInitialized(true);
        setIsLoading(false);
        console.log('🎉 SimpleShotstackStudio: Initialization complete!');

      } catch (err) {
        console.error('❌ SimpleShotstackStudio: Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [project]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Video Editor</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Simple Shotstack Studio</h1>
        <p className="text-gray-400">Status: {isLoading ? 'Loading...' : initialized ? 'Ready' : 'Initializing...'}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <div className="bg-gray-800 rounded-lg p-4 h-full">
            <h3 className="text-lg font-semibold mb-4">Canvas</h3>
            <div 
              ref={canvasRef}
              className="w-full h-full bg-black rounded border border-gray-600"
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>

        {/* Timeline Area */}
        <div className="w-1/3 p-4">
          <div className="bg-gray-800 rounded-lg p-4 h-full">
            <h3 className="text-lg font-semibold mb-4">Timeline</h3>
            <div 
              ref={timelineRef}
              className="w-full h-full bg-gray-700 rounded border border-gray-600"
              style={{ minHeight: '200px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleShotstackStudio;
