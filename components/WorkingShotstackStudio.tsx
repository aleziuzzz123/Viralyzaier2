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
    const initializeEditor = async () => {
      try {
        addLog('🚀 Starting Shotstack Studio initialization...');
        
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!canvasRef.current || !timelineRef.current) {
          throw new Error('DOM elements not ready');
        }
        
        addLog('✅ DOM elements ready');
        
        // Create a simple template
        const template = {
          timeline: {
            tracks: [
              {
                clips: [
                  {
                    asset: {
                      type: 'title',
                      text: 'Welcome to Shotstack Studio',
                      style: 'future',
                      color: '#ffffff',
                      size: 'large'
                    },
                    start: 0,
                    length: 3
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
        
        addLog('📄 Template created');
        
        // Create Edit instance
        addLog('🔧 Creating Edit instance...');
        const edit = new Edit(template.output.size, template.timeline.background);
        addLog('✅ Edit instance created');
        
        // Load the edit
        addLog('⏳ Loading Edit...');
        await edit.load();
        addLog('✅ Edit loaded');
        
        // Load template into edit
        addLog('📄 Loading template into edit...');
        await edit.loadEdit(template);
        addLog('✅ Template loaded');
        
        // Create Canvas
        addLog('🎨 Creating Canvas...');
        const canvas = new Canvas(edit, canvasRef.current);
        await canvas.load();
        addLog('✅ Canvas created and loaded');
        
        // Create Timeline
        addLog('📊 Creating Timeline...');
        const timeline = new Timeline(edit, timelineRef.current);
        await timeline.load();
        addLog('✅ Timeline created and loaded');
        
        // Create Controls
        addLog('⌨️ Creating Controls...');
        const controls = new Controls(edit);
        await controls.load();
        addLog('✅ Controls created and loaded');
        
        // Set up event listeners
        edit.events.on('play', () => {
          addLog('▶️ Play event');
        });
        
        edit.events.on('pause', () => {
          addLog('⏸️ Pause event');
        });
        
        edit.events.on('stop', () => {
          addLog('⏹️ Stop event');
        });
        
        addLog('🎉 Shotstack Studio initialization complete!');
        setInitialized(true);
        setIsLoading(false);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        addLog(`❌ Initialization failed: ${errorMessage}`);
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [project]);

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
