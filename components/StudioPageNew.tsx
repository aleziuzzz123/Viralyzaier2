import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";
import { Project, Script, Scene } from '../types';

interface Size {
  width: number;
  height: number;
}

interface ShotstackEdit {
  output: {
    size: Size;
  };
  timeline: {
    background: string;
    tracks: Array<{
      clips: Array<any>;
    }>;
  };
}

const StudioPageNew: React.FC<{ projectData?: Project }> = ({ projectData: propProjectData }) => {
  console.log('🎬 StudioPageNew component loaded!');
  console.log('🎬 Prop project data:', propProjectData);
  
  const canvasHost = useRef<HTMLDivElement>(null);
  const timelineHost = useRef<HTMLDivElement>(null);
  
  const editRef = useRef<any>();
  const canvasRef = useRef<any>();
  const timelineRef = useRef<any>();
  const controlsRef = useRef<any>();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [timelineReady, setTimelineReady] = useState<boolean>(false);
  const [projectData, setProjectData] = useState<Project | null>(null);

  const size: Size = { width: 1920, height: 1080 };

  const waitForHosts = async (): Promise<void> => {
    const isReady = (): boolean => {
      const canvas = canvasHost.current;
      const timeline = timelineHost.current;
      
      const hasSize = (el?: HTMLElement | null): boolean =>
        !!el && el.offsetParent !== null && el.clientWidth > 0 && el.clientHeight > 0;
        
      return hasSize(canvas) && !!timeline;
    };

    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (isReady()) return;
    }
    throw new Error("Editor hosts not ready");
  };

  // Listen for project data from parent or use prop data
  useEffect(() => {
    console.log('🎬 Setting up message listener in StudioPageNew');
    console.log('🎬 Prop project data:', propProjectData);

    const handleMessage = (event: MessageEvent) => {
        console.log('🎬 StudioPageNew received message:', event.data);
        if (event.data.type === 'app:load_project') {
        console.log('📦 Received project data via message:', event.data.payload);
        setProjectData(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // If we have prop data, use it directly
    if (propProjectData) {
      console.log('📦 Using prop project data:', propProjectData);
      setProjectData(propProjectData);
    }
    
    // Notify parent we're ready
    console.log('🎬 Notifying parent that studio is ready');
    window.parent.postMessage({ type: 'studio:ready' }, '*');
    
    return () => window.removeEventListener('message', handleMessage);
  }, [propProjectData]);

  const addProjectAssetsToEditor = async (editInstance: any, project: Project) => {
    try {
      console.log('🎬 Adding project assets:', project);
      
      if (project.script && project.script.scenes) {
        console.log('🎬 Processing script scenes:', project.script.scenes);
        
        // Clear existing tracks and add our project assets
        project.script.scenes.forEach((scene: Scene, index: number) => {
          console.log(`🎬 Processing scene ${index}:`, {
            timecode: scene.timecode,
            visual: scene.visual,
            voiceover: scene.voiceover,
            storyboardImageUrl: scene.storyboardImageUrl
          });
          
          if (scene.storyboardImageUrl) {
            console.log(`🎬 Adding video clip for scene ${index} with image:`, scene.storyboardImageUrl);
            editInstance.addClip(0, {
              asset: {
                type: 'image',
                src: scene.storyboardImageUrl
              },
              start: parseTimecode(scene.timecode).start,
              length: parseTimecode(scene.timecode).duration,
              fit: 'cover'
            });
          }
        });

        // Add audio tracks from voiceovers
        if (project.voiceoverUrls) {
          console.log('🎬 Processing voiceover URLs:', project.voiceoverUrls);
          
          Object.entries(project.voiceoverUrls).forEach(([sceneIndex, voiceoverUrl]) => {
            const scene = project.script!.scenes[parseInt(sceneIndex)];
            if (scene) {
              console.log(`🎬 Adding audio clip for scene ${sceneIndex}:`, voiceoverUrl);
              editInstance.addClip(1, {
                asset: {
                  type: 'audio',
                  src: voiceoverUrl
                },
                start: parseTimecode(scene.timecode).start,
                length: parseTimecode(scene.timecode).duration
              });
            }
          });
        }
      }
      
      console.log('✅ Project assets added successfully');
    } catch (error) {
      console.error('❌ Error adding project assets:', error);
    }
  };

  // Helper function to parse timecode
  const parseTimecode = (timecode: string | undefined) => {
    if (!timecode) {
      console.warn('Timecode is undefined, using default values');
      return { start: 0, end: 5, duration: 5 };
    }
    
    // Handle different timecode formats
    if (timecode.includes('-')) {
      const [start, end] = timecode.split('-').map(Number);
      return { start: start || 0, end: end || 5, duration: (end || 5) - (start || 0) };
    } else if (timecode.includes('seconds')) {
      // Handle "2 seconds" format
      const duration = parseInt(timecode.replace(/\D/g, '')) || 5;
      return { start: 0, end: duration, duration };
    } else {
      // Handle single number (duration)
      const duration = parseInt(timecode) || 5;
      return { start: 0, end: duration, duration };
    }
  };

  const initializeEditor = async (): Promise<void> => {
    try {
      console.log('🚀 Starting StudioPageNew initialization');
      console.log('🚀 Shotstack SDK available:', { Edit, Canvas, Controls, Timeline });
      setIsLoading(true);
      
      // Wait for DOM elements to be ready
      console.log('🔧 Waiting for DOM elements to be ready...');
      await waitForHosts();
      console.log('✅ DOM elements ready');

      // 1. Retrieve template
      console.log('🔧 Loading base template...');
      const templateUrl = "https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json";
      const response = await fetch(templateUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.status}`);
      }
      
      const template: ShotstackEdit = await response.json();
      console.log('✅ Base template loaded:', template);

      // 2. Initialize the edit
      console.log('🔧 Creating Edit component...');
      const edit = new Edit(template.output.size, template.timeline.background);
      await edit.load();
      console.log('✅ Edit component loaded');

      // 3. Create canvas
      console.log('🎨 Creating Canvas component...');
      const canvas = new Canvas(template.output.size, edit, { responsive: true });
      await canvas.load(canvasHost.current!);
      console.log('✅ Canvas component loaded');

      // 4. Load template
      console.log('📄 Loading base template...');
      await edit.loadEdit(template);
      console.log('✅ Base template loaded');

      // 5. Add keyboard controls
      console.log('⌨️ Creating Controls component...');
      const controls = new Controls(edit);
      await controls.load();
      console.log('✅ Controls component loaded');

      // 6. Initialize timeline
      console.log('📊 Creating Timeline component...');
      const timelineWidth = timelineHost.current?.clientWidth || template.output.size.width;
      const timeline = new Timeline(
        edit,
        { width: timelineWidth, height: 300 }
      );
      await timeline.load();
      console.log('✅ Timeline component loaded');

      // 7. Now add our project assets if we have project data
      if (projectData) {
        console.log('🎬 Adding project assets to editor...');
        await addProjectAssetsToEditor(edit, projectData);
      }

      // Set up event listeners
      edit.events.on("clip:selected", (data: any) => {
        console.log("Clip selected:", data);
      });

      edit.events.on("clip:updated", (data: any) => {
        console.log("Clip updated:", data);
      });

      edit.events.on("edit:play", () => {
        console.log("Playing");
      });

      edit.events.on("edit:pause", () => {
        console.log("Paused");
      });

      edit.events.on("edit:stop", () => {
        console.log("Stopped");
      });

      // Store references
      editRef.current = edit;
      canvasRef.current = canvas;
      timelineRef.current = timeline;
      controlsRef.current = controls;

      console.log('🎉 Studio initialization complete!');
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize video editor:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsLoading(false);
    }
  };

  // Callback refs that trigger initialization when both elements are ready
  const canvasRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setCanvasReady(true);
    }
  }, []);

  const timelineRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setTimelineReady(true);
    }
  }, []);

  // Initialize when both elements are ready
  useEffect(() => {
    console.log('🎬 StudioPageNew useEffect triggered:', { 
      canvasReady,
      timelineReady,
      isLoading
    });
    
    if (canvasReady && timelineReady && isLoading) {
      console.log('🎬 Both DOM elements ready, starting initialization...');
      initializeEditor();
    }
  }, [canvasReady, timelineReady, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (canvasRef.current) {
          canvasRef.current.dispose?.();
        }
        // Clean up event listeners - Shotstack uses .on() so no cleanup needed
        // The edit instance handles cleanup internally
        editRef.current = null;
        canvasRef.current = null;
        timelineRef.current = null;
        controlsRef.current = null;
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '5px',
          border: '1px solid #f5c6cb'
        }}>
          <h3>Error Loading Video Editor</h3>
          <p>{error}</p>
          <p><small>Make sure you have installed: npm install @shotstack/shotstack-studio</small></p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: '#0b1220',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
        zIndex: 10000,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            🎬
          </div>
          <div>
            <h1 style={{ 
              color: 'white', 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: '600' 
            }}>
              Creative Studio - Full Screen
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              margin: 0, 
              fontSize: '12px' 
            }}>
              Stage 4: Professional Video Editor
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => window.close()}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '40px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '32px'
          }}></div>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '24px', 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Loading Shotstack Studio...
          </h2>
          <p style={{ 
            margin: '0', 
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '16px',
            textAlign: 'center'
          }}>
            Initializing video editor...
          </p>
        </div>
      )}

      {/* Main Editor */}
      {!isLoading && !error && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          padding: '20px',
          gap: '20px'
        }}>
          {/* Canvas */}
          <div
            ref={(node) => {
              canvasHost.current = node;
              canvasRefCallback(node);
            }}
            data-shotstack-studio
            style={{
              width: '100%',
              backgroundColor: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              minHeight: '60vh',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />

          {/* Timeline */}
          <div
            ref={(node) => {
              timelineHost.current = node;
              timelineRefCallback(node);
            }}
            data-shotstack-timeline
            style={{
              width: '100%',
              backgroundColor: '#1f2937',
              borderRadius: '8px',
              height: '300px',
              minHeight: '300px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StudioPageNew;
