import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";
import { Project } from '../types';

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

interface FinalShotstackStudioProps {
  project?: Project;
}

const FinalShotstackStudio: React.FC<FinalShotstackStudioProps> = ({ project }) => {
  console.log('🎬 FinalShotstackStudio component loaded!');
  console.log('🚀 FINAL SHOTSTACK STUDIO V2.0 - THIS IS THE NEW COMPONENT!');
  console.log('⏰ TIMESTAMP: ' + new Date().toISOString());
  console.log('📋 Project data received:', project);
  
  const canvasHost = useRef<HTMLDivElement>(null);
  const timelineHost = useRef<HTMLDivElement>(null);
  
  const editRef = useRef<any>();
  const canvasRef = useRef<any>();
  const timelineRef = useRef<any>();
  const controlsRef = useRef<any>();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [timelineReady, setTimelineReady] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Load project assets into the editor after it's initialized
  const loadProjectAssets = async (edit: any, projectData: Project) => {
    console.log('🎨 Loading ONLY your blueprint assets into editor:', projectData);
    
    try {
      // Create a new edit with your blueprint assets
      console.log('🔧 Creating new edit with your blueprint assets...');
      
      const newEdit = {
        timeline: {
          tracks: []
        },
        output: {
          format: 'mp4',
          resolution: 'hd',
          size: { width: 1280, height: 720 }
        }
      };

      // Add your background video as the main track
      if (projectData.backgroundVideo) {
        console.log('🎥 Adding your background video...');
        newEdit.timeline.tracks.push({
          clips: [{
            asset: {
              type: 'video',
              src: projectData.backgroundVideo
            },
            start: 0,
            length: 10,
            fit: 'cover'
          }]
        });
        console.log('✅ Background video added:', projectData.backgroundVideo);
      }

      // Add your voiceover as audio track
      if (projectData.voiceoverUrl) {
        console.log('🎤 Adding your voiceover...');
        newEdit.timeline.tracks.push({
          clips: [{
            asset: {
              type: 'audio',
              src: projectData.voiceoverUrl
            },
            start: 0,
            length: 10
          }]
        });
        console.log('✅ Voiceover added:', projectData.voiceoverUrl);
      }

      // Add your script as text overlay
      if (projectData.script) {
        console.log('📝 Adding your script as text overlay...');
        newEdit.timeline.tracks.push({
          clips: [{
            asset: {
              type: 'text',
              text: projectData.script,
              font: {
                family: 'Clear Sans',
                size: 48,
                color: '#FFFFFF'
              },
              background: {
                color: '#000000',
                opacity: 0.7,
                borderRadius: 10,
                padding: 10
              },
              alignment: {
                horizontal: 'center',
                vertical: 'bottom'
              }
            },
            start: 0,
            length: 10
          }]
        });
        console.log('✅ Script added as text overlay');
      }

      // Add your moodboards as image assets
      if (projectData.moodboards && Array.isArray(projectData.moodboards)) {
        console.log('🖼️ Adding your moodboards...');
        projectData.moodboards.forEach((moodboard, index) => {
          newEdit.timeline.tracks.push({
            clips: [{
              asset: {
                type: 'image',
                src: moodboard
              },
              start: index * 2, // Stagger them
              length: 2,
              fit: 'cover'
            }]
          });
        });
        console.log('✅ Moodboards added:', projectData.moodboards.length);
      }

      // If no assets found, add a placeholder
      if (!projectData.backgroundVideo && !projectData.voiceoverUrl && !projectData.script && !projectData.moodboards) {
        console.log('⚠️ No blueprint assets found, adding placeholder...');
        newEdit.timeline.tracks.push({
          clips: [{
            asset: {
              type: 'text',
              text: 'Your Blueprint Assets Will Appear Here',
              font: {
                family: 'Clear Sans',
                size: 36,
                color: '#FFFFFF'
              },
              background: {
                color: '#0066CC',
                opacity: 0.8,
                borderRadius: 15,
                padding: 20
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

      // Load the new edit with your assets
      if (newEdit.timeline.tracks.length > 0) {
        console.log('🔄 Loading new edit with your blueprint assets...');
        await edit.loadEdit(newEdit);
        console.log('✅ Editor updated with your blueprint assets!');
      } else {
        console.log('⚠️ No assets to load');
      }

      console.log('🎉 Your blueprint assets loaded successfully!');
    } catch (error) {
      console.error('❌ Error loading your blueprint assets:', error);
    }
  };

  // Wait for DOM elements to be ready - EXACTLY like MinimalWorkingVideoEditor
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

  // Callback refs that trigger when elements are ready - EXACTLY like MinimalWorkingVideoEditor
  const canvasRefCallback = useCallback((node: HTMLDivElement | null) => {
    console.log('🎨 Canvas ref callback called with node:', node);
    if (node) {
      canvasHost.current = node;
      setCanvasReady(true);
      console.log('🎨 Canvas element ready, dimensions:', node.clientWidth, 'x', node.clientHeight);
    }
  }, []);

  const timelineRefCallback = useCallback((node: HTMLDivElement | null) => {
    console.log('📊 Timeline ref callback called with node:', node);
    if (node) {
      timelineHost.current = node;
      setTimelineReady(true);
      console.log('📊 Timeline element ready, dimensions:', node.clientWidth, 'x', node.clientHeight);
    }
  }, []);

  // Initialize when both elements are ready - EXACTLY like MinimalWorkingVideoEditor
  useEffect(() => {
    console.log('🎬 FinalShotstackStudio useEffect triggered:', { 
      initialized, 
      canvasReady,
      timelineReady,
      isLoading
    });
    
    if (canvasReady && timelineReady && isLoading && !initialized) {
      console.log('🎬 Both DOM elements ready, starting initialization...');
      initializeEditor();
    }
  }, [canvasReady, timelineReady, isLoading, initialized]);

  const initializeEditor = async (): Promise<void> => {
    try {
      console.log('🚀 Starting FinalShotstackStudio initialization');
      console.log('🚀 Shotstack SDK available:', { Edit, Canvas, Controls, Timeline });
      
      setIsLoading(true);
      setInitialized(true);
      
      // Wait for DOM elements to be ready - EXACTLY like MinimalWorkingVideoEditor
      console.log('🔧 Waiting for DOM elements to be ready...');
      await waitForHosts();
      console.log('✅ DOM elements ready');

      // 1. Create empty template - will be populated with your blueprint assets
      console.log('🔧 Creating empty template for your blueprint assets...');
      const template: ShotstackEdit = {
        timeline: {
          tracks: [] // Empty - will be filled with your assets
        },
        output: {
          format: 'mp4',
          resolution: 'hd',
          size: { width: 1280, height: 720 }
        }
      };
      console.log('✅ Empty template created - ready for your blueprint assets');

      // 2. Initialize the edit with dimensions and background color - EXACTLY like official docs
      console.log('🔧 Creating Edit component...');
      const edit = new Edit(template.output.size, template.timeline.background);
      await edit.load();
      console.log('✅ Edit component loaded');

      // 3. Create a canvas to display the edit - EXACTLY like MinimalWorkingVideoEditor
      console.log('🎨 Creating Canvas component...');
      const canvas = new Canvas(template.output.size, edit, { responsive: true });
      await canvas.load(canvasHost.current!); // Pass DOM element like working example
      console.log('✅ Canvas component loaded');

      // 4. Load the template - EXACTLY like official docs
      console.log('📄 Loading template into edit...');
      await edit.loadEdit(template);
      console.log('✅ Template loaded into edit');

      // 5. Add keyboard controls - EXACTLY like official docs
      console.log('⌨️ Creating Controls component...');
      const controls = new Controls(edit);
      await controls.load();
      console.log('✅ Controls component loaded');

      // 6. Add timeline for visual editing - EXACTLY like MinimalWorkingVideoEditor
      console.log('📊 Creating Timeline component...');
      console.log('📊 Timeline host element:', timelineHost.current);
      console.log('📊 Timeline host dimensions:', {
        width: timelineHost.current?.clientWidth,
        height: timelineHost.current?.clientHeight,
        offsetWidth: timelineHost.current?.offsetWidth,
        offsetHeight: timelineHost.current?.offsetHeight
      });
      
      const timelineWidth = timelineHost.current?.clientWidth || template.output.size.width;
      console.log('📊 Using timeline width:', timelineWidth);
      
      const timeline = new Timeline(edit, {
        width: timelineWidth,
        height: 300
      });
      
      console.log('📊 Timeline instance created:', timeline);
      console.log('📊 About to load timeline...');
      
      try {
        await timeline.load(); // Renders to [data-shotstack-timeline] element
        console.log('✅ Timeline component loaded successfully');
        console.log('📊 Timeline element after load:', document.querySelector('[data-shotstack-timeline]'));
      } catch (timelineError) {
        console.error('❌ Timeline loading failed:', timelineError);
        console.log('📊 Attempting timeline retry after delay...');
        
        // Retry timeline loading after a short delay
        setTimeout(async () => {
          try {
            console.log('📊 Retrying timeline load...');
            await timeline.load();
            console.log('✅ Timeline component loaded successfully on retry');
          } catch (retryError) {
            console.error('❌ Timeline retry also failed:', retryError);
            // Continue without timeline - canvas should still work
          }
        }, 1000);
      }

      // Set up event listeners - EXACTLY like MinimalWorkingVideoEditor
      edit.events.on("clip:selected", (data: any) => {
        console.log("Clip selected:", data);
      });

      edit.events.on("clip:updated", (data: any) => {
        console.log("Clip updated:", data);
      });

      edit.events.on("play", () => {
        console.log("Play event");
        setIsPlaying(true);
      });

      edit.events.on("pause", () => {
        console.log("Pause event");
        setIsPlaying(false);
      });

      edit.events.on("stop", () => {
        console.log("Stop event");
        setIsPlaying(false);
      });

      // Store references - EXACTLY like MinimalWorkingVideoEditor
      editRef.current = edit;
      canvasRef.current = canvas;
      timelineRef.current = timeline;
      controlsRef.current = controls;

      console.log('🎉 FinalShotstackStudio initialization complete!');
      setIsLoading(false);

      // Load your project assets after editor is ready
      if (project) {
        console.log('📋 Loading your project assets:', project);
        console.log('📋 Project data details:', {
          script: project.script ? 'Available' : 'Missing',
          voiceoverUrl: project.voiceoverUrl ? 'Available' : 'Missing',
          backgroundVideo: project.backgroundVideo ? 'Available' : 'Missing',
          moodboards: project.moodboards ? `${project.moodboards.length} items` : 'Missing'
        });
        await loadProjectAssets(edit, project);
      } else {
        console.log('⚠️ No project data received - cannot load blueprint assets');
      }
    } catch (err) {
      console.error('❌ Failed to initialize video editor:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setInitialized(false);
      setIsLoading(false);
    }
  };

  const addSampleClip = () => {
    if (!editRef.current) return;
    
    try {
      editRef.current.addClip(0, {
        asset: {
          type: 'video',
          src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        },
        start: 0,
        length: 10,
        fit: 'cover'
      });
      console.log('✅ Sample clip added');
    } catch (error) {
      console.error('❌ Failed to add sample clip:', error);
    }
  };

  // Cleanup on unmount - EXACTLY like MinimalWorkingVideoEditor
  useEffect(() => {
    return () => {
      try {
        if (canvasRef.current) {
          canvasRef.current.dispose?.();
        }
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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0b1220',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          background: '#dc2626',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ef4444'
        }}>
          <h2>Error Loading Shotstack Studio</h2>
          <p>{error}</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Make sure you have installed: npm install @shotstack/shotstack-studio
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#0b1220',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Main Editor Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        gap: '20px'
      }}>

      {/* Loading State */}
      {isLoading && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '24px'
          }}></div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
            Loading Shotstack Studio...
          </h2>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)' }}>
            Initializing video editor...
          </p>
        </div>
      )}

      {/* Main Editor - Always render DOM elements, even during loading */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        padding: '40px 20px 20px 20px', // More top padding to clear navigation bar
        gap: '20px',
        marginTop: '10px', // Additional margin for better spacing
        maxWidth: '1200px', // Smaller width to prevent overlap
        margin: '10px auto 0 auto', // Center horizontally with proper margins
        width: '100%' // Ensure it takes available width within maxWidth
      }}>
        {/* Professional Editor Header */}
        {!isLoading && !error && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
          }}>
            {/* Main Controls Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              {/* Left - Playback Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => editRef.current?.play()}
                  style={{
                    background: isPlaying ? '#FF6B35' : '#10B981',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  {isPlaying ? '⏸️' : '▶️'} {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => editRef.current?.stop()}
                  style={{
                    background: '#EF4444',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  ⏹️ Stop
                </button>
                <div style={{
                  width: '1px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.3)',
                  margin: '0 15px'
                }}></div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isPlaying ? '#10B981' : '#6B7280'
                  }}></div>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                    {isPlaying ? 'Playing' : 'Ready'}
                  </span>
                </div>
              </div>

              {/* Right - Blueprint Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {project?.script && (
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.9)', 
                    color: 'white', 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px',
                    fontWeight: '600',
                    backdropFilter: 'blur(10px)'
                  }}>
                    📝 Script Ready
                  </span>
                )}
                {project?.voiceoverUrl && (
                  <span style={{ 
                    background: 'rgba(239, 68, 68, 0.9)', 
                    color: 'white', 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px',
                    fontWeight: '600',
                    backdropFilter: 'blur(10px)'
                  }}>
                    🎤 Voice Ready
                  </span>
                )}
                {project?.backgroundVideo && (
                  <span style={{ 
                    background: 'rgba(59, 130, 246, 0.9)', 
                    color: 'white', 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px',
                    fontWeight: '600',
                    backdropFilter: 'blur(10px)'
                  }}>
                    🎥 Video Ready
                  </span>
                )}
                {project?.moodboards && project.moodboards.length > 0 && (
                  <span style={{ 
                    background: 'rgba(139, 92, 246, 0.9)', 
                    color: 'white', 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px',
                    fontWeight: '600',
                    backdropFilter: 'blur(10px)'
                  }}>
                    🖼️ {project.moodboards.length} Images
                  </span>
                )}
              </div>
            </div>

            {/* Asset Tools Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {/* Basic Assets */}
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
                backdropFilter: 'blur(10px)'
              }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  📝 Basic Assets
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      if (editRef.current) {
                        editRef.current.addClip(2, {
                          asset: {
                            type: 'text',
                            text: 'New Text Overlay',
                            font: { family: 'Clear Sans', size: 36, color: '#FFFFFF' },
                            background: { color: '#000000', opacity: 0.7, borderRadius: 8, padding: 8 },
                            alignment: { horizontal: 'center', vertical: 'center' }
                          },
                          start: 0,
                          length: 5
                        });
                      }
                    }}
                    style={{
                      background: '#10B981',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📝 Text
                  </button>
                  <button
                    onClick={() => {
                      if (editRef.current) {
                        editRef.current.addClip(3, {
                          asset: {
                            type: 'shape',
                            shape: 'rectangle',
                            rectangle: { width: 200, height: 100 },
                            fill: { color: '#3B82F6', opacity: 0.8 }
                          },
                          start: 0,
                          length: 5
                        });
                      }
                    }}
                    style={{
                      background: '#8B5CF6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🔷 Shape
                  </button>
                </div>
              </div>

              {/* AI Generation Tools */}
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
                backdropFilter: 'blur(10px)'
              }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  🤖 AI Generation
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      if (editRef.current) {
                        editRef.current.addClip(4, {
                          asset: {
                            type: 'text-to-speech',
                            text: 'Welcome to your AI-generated voiceover. This text will be converted to speech automatically.',
                            voice: 'Joanna',
                            newscaster: true
                          },
                          start: 0,
                          length: 'auto'
                        });
                      }
                    }}
                    style={{
                      background: '#F59E0B',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🎤 AI Voice
                  </button>
                  <button
                    onClick={() => {
                      if (editRef.current) {
                        editRef.current.addClip(5, {
                          asset: {
                            type: 'text-to-image',
                            prompt: 'Professional business meeting, modern office, high quality, cinematic lighting',
                            width: 1280,
                            height: 720
                          },
                          start: 0,
                          length: 5
                        });
                      }
                    }}
                    style={{
                      background: '#EC4899',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🖼️ AI Image
                  </button>
                  <button
                    onClick={() => {
                      if (editRef.current) {
                        editRef.current.addClip(6, {
                          asset: {
                            type: 'image-to-video',
                            src: 'https://shotstack-assets.s3.amazonaws.com/images/handbag-flower-peaches.jpg',
                            prompt: 'Slowly zoom out and orbit left around the object.'
                          },
                          start: 0,
                          length: 'auto'
                        });
                      }
                    }}
                    style={{
                      background: '#8B5CF6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🎬 AI Video
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
                backdropFilter: 'blur(10px)'
              }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  ⚡ Quick Actions
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={addSampleClip}
                    style={{
                      background: '#06B6D4',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ➕ Sample
                  </button>
                  <button
                    onClick={() => {
                      if (editRef.current) {
                        editRef.current.clearTracks();
                      }
                    }}
                    style={{
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas - Always render for ref callbacks */}
        <div
          ref={canvasRefCallback}
          data-shotstack-studio
          style={{
            width: '100%',
            backgroundColor: '#000',
            borderRadius: '8px',
            minHeight: '70vh',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            opacity: isLoading ? 0.3 : 1,
            transition: 'opacity 0.3s ease'
          }}
        />

        {/* Timeline - Always render for ref callbacks */}
        <div
          ref={timelineRefCallback}
          data-shotstack-timeline
          style={{
            width: '100%',
            backgroundColor: '#1f2937',
            borderRadius: '8px',
            height: '300px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            opacity: isLoading ? 0.3 : 1,
            transition: 'opacity 0.3s ease',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px' // Ensure minimum height
          }}
        >
          {isLoading && (
            <div style={{
              color: 'white',
              fontSize: '14px',
              textAlign: 'center',
              position: 'absolute',
              zIndex: 10
            }}>
              Loading Timeline...
            </div>
          )}
          {!isLoading && !error && (
            <div style={{
              color: '#666',
              fontSize: '12px',
              textAlign: 'center',
              position: 'absolute',
              zIndex: 5
            }}>
              Timeline Ready - Shotstack will render here
            </div>
          )}
        </div>

        {/* Success Message - Only show when loaded */}
        {!isLoading && !error && (
          <div style={{
            background: '#10b981',
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0' }}>✅ Shotstack Studio Loaded Successfully!</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              The video editor is now ready. You can interact with the canvas and timeline above.
            </p>
          </div>
        )}
      </div>


      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FinalShotstackStudio;
