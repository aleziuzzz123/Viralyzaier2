import React, { useEffect, useRef, useState } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";
import { SparklesIcon } from './Icons';

interface WorkingShotstackStudioProps {
  project?: any;
  onProceedToAnalysis?: () => void;
}

const WorkingShotstackStudio: React.FC<WorkingShotstackStudioProps> = ({ project, onProceedToAnalysis }) => {
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

  // Function to load blueprint assets into the editor
  const loadBlueprintAssets = async (edit: any, project: any) => {
    try {
      addLog('🎬 Starting blueprint asset loading...');
      
      const tracks: any[] = [];
      let currentTime = 0;
      
      // Add script scenes as video tracks with storyboard images
      if (project.script?.scenes) {
        addLog(`📝 Processing ${project.script.scenes.length} script scenes...`);
        
        project.script.scenes.forEach((scene: any, index: number) => {
          if (scene.storyboardImageUrl) {
            addLog(`🖼️ Adding scene ${index + 1} with image: ${scene.storyboardImageUrl}`);
            
            // Add video track with storyboard image
            tracks.push({
              clips: [{
                asset: {
                  type: "image",
                  src: scene.storyboardImageUrl
                },
                start: currentTime,
                length: 3, // 3 seconds per scene
                fit: "cover"
              }]
            });
          }
          
          // Add text overlay for scene content
          if (scene.voiceover || scene.visual) {
            tracks.push({
              clips: [{
                asset: {
                  type: "text",
                  text: scene.voiceover || scene.visual || `Scene ${index + 1}`,
                  font: {
                    family: 'Arial',
                    size: 24,
                    weight: 600,
                    color: '#ffffff'
                  },
                  alignment: {
                    horizontal: 'center',
                    vertical: 'center'
                  }
                },
                start: currentTime,
                length: 3
              }]
            });
          }
          
          currentTime += 3;
        });
      }
      
      // Add moodboard images as additional video tracks
      if (project.moodboard && project.moodboard.length > 0) {
        addLog(`🎨 Adding ${project.moodboard.length} moodboard images...`);
        
        project.moodboard.forEach((imageUrl: string, index: number) => {
          tracks.push({
            clips: [{
              asset: {
                type: "image",
                src: imageUrl
              },
              start: index * 2, // Stagger moodboard images
              length: 2,
              fit: "cover"
            }]
          });
        });
      }
      
      // Add voiceover audio tracks
      if (project.voiceoverUrls) {
        addLog(`🎵 Processing voiceover URLs...`);
        
        Object.entries(project.voiceoverUrls).forEach(([sceneIndex, voiceoverUrl]) => {
          if (voiceoverUrl) {
            addLog(`🎤 Adding voiceover for scene ${sceneIndex}: ${voiceoverUrl}`);
            
            tracks.push({
              clips: [{
                asset: {
                  type: "audio",
                  src: voiceoverUrl
                },
                start: parseInt(sceneIndex) * 3,
                length: 3
              }]
            });
          }
        });
      }
      
      // If no assets found, create a placeholder
      if (tracks.length === 0) {
        addLog('⚠️ No blueprint assets found, creating placeholder...');
        tracks.push({
          clips: [{
            asset: {
              type: "text",
              text: 'No assets available - Generate a blueprint first',
              font: {
                family: 'Arial',
                size: 32,
                weight: 600,
                color: '#ffffff'
              },
              alignment: {
                horizontal: 'center',
                vertical: 'center'
              }
            },
            start: 0,
            length: 5
          }]
        });
      }
      
      // Load the edit with our blueprint assets
      await edit.loadEdit({
        timeline: {
          tracks: tracks,
          background: '#000000'
        },
        output: {
          size: { width: 1280, height: 720 },
          format: 'mp4'
        }
      });
      
      addLog(`✅ Successfully loaded ${tracks.length} tracks with blueprint assets`);
      
    } catch (error) {
      addLog(`❌ Error loading blueprint assets: ${error}`);
      console.error('Blueprint asset loading error:', error);
    }
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
        
        // Create an empty template - we'll load blueprint assets instead
        const template = {
          timeline: {
            tracks: [], // Start with empty tracks
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

        // 5. Load blueprint assets if project data is available
        if (project) {
          addLog('🎬 Loading blueprint assets...');
          await loadBlueprintAssets(edit, project);
          addLog('✅ Blueprint assets loaded');
        } else {
          addLog('⚠️ No project data - using default template only');
        }
        
        // 6. Add keyboard controls
        addLog('⌨️ Creating Controls...');
        const controls = new Controls(edit);
        await controls.load();
        addLog('✅ Controls created and loaded');
        
        // 7. Add timeline for visual editing (following official docs)
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

  // Effect to reload assets when project changes
  useEffect(() => {
    if (initialized && project) {
      const reloadAssets = async () => {
        try {
          addLog('🔄 Project changed - reloading assets...');
          
          // Get the existing edit instance from the canvas
          const canvasElement = canvasRef.current?.querySelector('[data-shotstack-studio]');
          if (canvasElement && (canvasElement as any).__shotstackEdit) {
            const edit = (canvasElement as any).__shotstackEdit;
            await loadBlueprintAssets(edit, project);
            addLog('✅ Assets reloaded successfully');
          } else {
            addLog('⚠️ Edit instance not found - assets will load on next initialization');
          }
        } catch (error) {
          addLog(`❌ Error reloading assets: ${error}`);
          console.error('Asset reload error:', error);
        }
      };
      
      reloadAssets();
    }
  }, [project, initialized]);

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
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Shotstack Studio</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${initialized ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
              <span className="text-sm text-gray-300">
                {isLoading ? 'Loading...' : initialized ? 'Ready' : 'Initializing...'}
              </span>
            </div>
          </div>
          {logs.length > 0 && (
            <div className="text-xs text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-600">
              {logs[logs.length - 1]}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Area - Centered and Clean */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl mx-auto">
            <div 
              ref={canvasRef}
              data-shotstack-studio
              className="w-full aspect-video bg-black rounded-xl border border-gray-600 shadow-2xl"
              style={{ minHeight: '500px' }}
            />
          </div>
        </div>

        {/* Timeline Area - Fixed Height */}
        <div className="h-64 border-t border-gray-700 bg-gray-800/50">
          <div className="h-full p-4">
            <div 
              ref={timelineRef}
              data-shotstack-timeline
              className="w-full h-full bg-gray-900 rounded-lg border border-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Proceed Button */}
      {onProceedToAnalysis && (
        <div className="bg-gray-900 border-t border-gray-700 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-center">
              <button 
                onClick={onProceedToAnalysis}
                className="inline-flex items-center justify-center px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
              >
                <SparklesIcon className="w-6 h-6 mr-3" />
                Proceed to Analysis & Report →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-900 border-t border-gray-700 p-6">
          <h3 className="text-sm font-semibold mb-3 text-white">Recent Logs:</h3>
          <div className="bg-gray-800 rounded-lg p-4 h-24 overflow-y-auto font-mono text-xs border border-gray-700">
            {logs.slice(-5).map((log, index) => (
              <div key={index} className="mb-1 text-gray-300">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingShotstackStudio;
