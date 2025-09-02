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
    console.log('🎬 SimpleShotstackStudio: Window object:', typeof window);
    console.log('🎬 SimpleShotstackStudio: Document object:', typeof document);
    
    const initializeEditor = async () => {
      try {
        console.log('🚀 SimpleShotstackStudio: Starting initialization...');
        console.log('🔧 SimpleShotstackStudio: Checking Shotstack SDK availability...');
        
        // Check if Shotstack SDK is available
        if (typeof Edit === 'undefined') {
          console.error('❌ SimpleShotstackStudio: Edit class not available');
          setError('Shotstack SDK Edit class not available');
          return;
        }
        
        if (typeof Canvas === 'undefined') {
          console.error('❌ SimpleShotstackStudio: Canvas class not available');
          setError('Shotstack SDK Canvas class not available');
          return;
        }
        
        if (typeof Timeline === 'undefined') {
          console.error('❌ SimpleShotstackStudio: Timeline class not available');
          setError('Shotstack SDK Timeline class not available');
          return;
        }
        
        console.log('✅ SimpleShotstackStudio: All Shotstack SDK classes available');
        
        // Wait a bit to ensure DOM is ready
        console.log('⏳ SimpleShotstackStudio: Waiting for DOM elements...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!canvasRef.current) {
          console.error('❌ SimpleShotstackStudio: Canvas DOM element not ready');
          setError('Canvas DOM element not ready');
          return;
        }
        
        if (!timelineRef.current) {
          console.error('❌ SimpleShotstackStudio: Timeline DOM element not ready');
          setError('Timeline DOM element not ready');
          return;
        }

        console.log('✅ SimpleShotstackStudio: DOM elements ready');
        console.log('📊 SimpleShotstackStudio: Canvas element:', canvasRef.current);
        console.log('📊 SimpleShotstackStudio: Timeline element:', timelineRef.current);
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
        console.log('🔧 SimpleShotstackStudio: Creating Edit instance...');
        const edit = new Edit(template.output.size, template.timeline.background);
        console.log('✅ SimpleShotstackStudio: Edit created:', edit);

        // Load the edit
        console.log('🔧 SimpleShotstackStudio: Loading Edit...');
        await edit.load();
        console.log('✅ SimpleShotstackStudio: Edit loaded');

        // Initialize canvas
        console.log('🔧 SimpleShotstackStudio: Creating Canvas instance...');
        const canvas = new Canvas(edit, canvasRef.current);
        console.log('✅ SimpleShotstackStudio: Canvas created:', canvas);
        
        console.log('🔧 SimpleShotstackStudio: Loading Canvas...');
        await canvas.load();
        console.log('✅ SimpleShotstackStudio: Canvas loaded');

        // Initialize timeline
        console.log('🔧 SimpleShotstackStudio: Creating Timeline instance...');
        const timeline = new Timeline(edit, timelineRef.current);
        console.log('✅ SimpleShotstackStudio: Timeline created:', timeline);
        
        console.log('🔧 SimpleShotstackStudio: Loading Timeline...');
        await timeline.load();
        console.log('✅ SimpleShotstackStudio: Timeline loaded');

        // Initialize controls
        console.log('🔧 SimpleShotstackStudio: Creating Controls instance...');
        const controls = new Controls(edit);
        console.log('✅ SimpleShotstackStudio: Controls created:', controls);
        
        console.log('🔧 SimpleShotstackStudio: Loading Controls...');
        await controls.load();
        console.log('✅ SimpleShotstackStudio: Controls loaded');

        setInitialized(true);
        setIsLoading(false);
        console.log('🎉 SimpleShotstackStudio: Initialization complete!');

      } catch (err) {
        console.error('❌ SimpleShotstackStudio: Initialization failed:', err);
        console.error('❌ SimpleShotstackStudio: Error details:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : 'No stack trace',
          type: typeof err
        });
        
        // Try fallback initialization
        console.log('🔄 SimpleShotstackStudio: Attempting fallback initialization...');
        try {
          await fallbackInitialization();
        } catch (fallbackErr) {
          console.error('❌ SimpleShotstackStudio: Fallback also failed:', fallbackErr);
          setError(`Initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}. Fallback also failed: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'}`);
        }
        setIsLoading(false);
      }
    };

    const fallbackInitialization = async () => {
      console.log('🔄 SimpleShotstackStudio: Fallback - Creating minimal edit...');
      const edit = new Edit({ width: 1280, height: 720 }, '#000000');
      await edit.load();
      console.log('✅ SimpleShotstackStudio: Fallback - Edit created and loaded');
      
      setInitialized(true);
      setIsLoading(false);
      console.log('🎉 SimpleShotstackStudio: Fallback initialization complete!');
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
        <div className="mt-2 space-y-1">
          <p className="text-gray-400">Status: {isLoading ? 'Loading...' : initialized ? 'Ready' : 'Initializing...'}</p>
          <p className="text-sm text-gray-500">SDK: {typeof Edit !== 'undefined' ? '✅ Available' : '❌ Missing'}</p>
          <p className="text-sm text-gray-500">Canvas: {canvasRef.current ? '✅ Ready' : '⏳ Loading'}</p>
          <p className="text-sm text-gray-500">Timeline: {timelineRef.current ? '✅ Ready' : '⏳ Loading'}</p>
        </div>
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
