import React, { useEffect, useRef, useState } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";

interface WorkingShotstackStudioProps {
  project?: any;
}

const WorkingShotstackStudio: React.FC<WorkingShotstackStudioProps> = ({ project }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
  };

  useEffect(() => {
    if (initialized) return; // Prevent double initialization

    const initializeEditor = async () => {
      try {
        addLog('🚀 Starting Shotstack Studio initialization...');
        setIsLoading(true);
        setInitialized(true);
        
        // Wait for DOM elements to be ready with proper dimensions
        addLog('⏳ Waiting for DOM elements...');
        for (let i = 0; i < 50; i++) {
          if (canvasRef.current && timelineRef.current && 
              canvasRef.current.clientWidth > 0 && timelineRef.current.clientWidth > 0) {
            break;
          }
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        
        if (!canvasRef.current || !timelineRef.current) {
          throw new Error('DOM elements not ready');
        }
        
        // Ensure elements have proper dimensions
        if (!canvasRef.current.offsetHeight) {
          canvasRef.current.style.minHeight = "400px";
        }
        if (!timelineRef.current.offsetHeight) {
          timelineRef.current.style.minHeight = "300px";
        }
        
        addLog('✅ DOM elements ready with dimensions');
        
        // Create a valid template following Shotstack format
        const template = {
          timeline: {
            tracks: [
              {
                clips: [
                  {
                    asset: {
                      type: 'text',
                      text: 'Welcome to Shotstack Studio',
                      style: {
                        fontFamily: 'Arial',
                        fontSize: 48,
                        fontWeight: 'bold',
                        color: '#ffffff',
                        textAlign: 'center'
                      }
                    },
                    start: 0,
                    length: 3,
                    position: 'center'
                  }
                ]
              }
            ],
            background: '#000000'
          },
          output: {
            size: { width: 1280, height: 720 },
            format: 'mp4'
          }
        };
        
        addLog('📄 Template created with valid structure');
        
        // 1. Initialize the edit with dimensions and background color (following official docs)
        addLog('🔧 Creating Edit instance...');
        const edit = new Edit(template.output.size, template.timeline.background);
        addLog('✅ Edit instance created');
        
        // 2. Load the edit
        addLog('⏳ Loading Edit...');
        await edit.load();
        addLog('✅ Edit loaded');
        
        // 3. Create a canvas to display the edit (following official docs)
        addLog('🎨 Creating Canvas...');
        const canvas = new Canvas(template.output.size, edit);
        await canvas.load(); // Renders to [data-shotstack-studio] element
        addLog('✅ Canvas created and loaded');
        
        // 4. Load the template
        addLog('📄 Loading template into edit...');
        await edit.loadEdit(template);
        addLog('✅ Template loaded');
        
        // 5. Add keyboard controls
        addLog('⌨️ Creating Controls...');
        const controls = new Controls(edit);
        await controls.load();
        addLog('✅ Controls created and loaded');
        
        // 6. Add timeline for visual editing (following official docs)
        addLog('📊 Creating Timeline...');
        const timeline = new Timeline(edit, {
          width: template.output.size.width,
          height: 300
        });
        await timeline.load(); // Renders to [data-shotstack-timeline] element
        addLog('✅ Timeline created and loaded');
        
        // Set up event listeners
        edit.events.on('clip:selected', (data: any) => {
          addLog(`🎯 Clip selected: ${data.clipIndex} on track ${data.trackIndex}`);
        });
        
        edit.events.on('clip:updated', (data: any) => {
          addLog(`✏️ Clip updated: ${data.clipIndex} on track ${data.trackIndex}`);
        });
        
        addLog('🎉 Shotstack Studio initialization complete!');
        setIsLoading(false);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        addLog(`❌ Initialization failed: ${errorMessage}`);
        console.error('Full error details:', err);
        setError(errorMessage);
        setInitialized(false); // Reset on error
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [initialized]);

  if (error) {
    return (
      <div className="h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-red-400">Shotstack Studio Error</h1>
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Error Details:</h2>
            <p className="text-red-200">{error}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Logs:</h2>
            <div className="bg-black rounded p-4 h-64 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Working Shotstack Studio</h1>
            <p className="text-gray-400">
              Status: {isLoading ? 'Loading...' : initialized ? 'Ready' : 'Initializing...'}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {logs.length > 0 && logs[logs.length - 1]}
          </div>
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
              data-shotstack-studio
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
              data-shotstack-timeline
              className="w-full h-full bg-gray-700 rounded border border-gray-600"
              style={{ minHeight: '200px' }}
            />
          </div>
        </div>
      </div>

      {/* Debug Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <h3 className="text-sm font-semibold mb-2">Recent Logs:</h3>
          <div className="bg-black rounded p-2 h-20 overflow-y-auto font-mono text-xs">
            {logs.slice(-5).map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingShotstackStudio;
