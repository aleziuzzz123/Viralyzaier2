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
  
  // COMPREHENSIVE PROJECT DATA DEBUGGING
  if (project) {
    console.log('🔍 DETAILED PROJECT DATA ANALYSIS:');
    console.log('📊 Project ID:', project.id);
    console.log('📊 Project Name:', project.name);
    console.log('📊 Workflow Step:', project.workflowStep);
    console.log('📊 Project Status:', project.status);
    
    // Script Analysis
    console.log('📝 SCRIPT ANALYSIS:');
    console.log('📝 Script exists:', !!project.script);
    if (project.script) {
      console.log('📝 Script scenes count:', project.script.scenes?.length || 0);
      console.log('📝 Script scenes:', project.script.scenes);
      console.log('📝 Script hooks:', project.script.hooks);
      console.log('📝 Script CTA:', project.script.cta);
    }
    
    // Voiceover Analysis
    console.log('🎤 VOICEOVER ANALYSIS:');
    console.log('🎤 Voiceover URLs exist:', !!project.voiceoverUrls);
    if (project.voiceoverUrls) {
      console.log('🎤 Voiceover URLs count:', Object.keys(project.voiceoverUrls).length);
      console.log('🎤 Voiceover URLs:', project.voiceoverUrls);
    }
    
    // Moodboard Analysis
    console.log('🖼️ MOODBOARD ANALYSIS:');
    console.log('🖼️ Moodboard exists:', !!project.moodboard);
    if (project.moodboard) {
      console.log('🖼️ Moodboard count:', project.moodboard.length);
      console.log('🖼️ Moodboard URLs:', project.moodboard);
    }
    
    // Assets Analysis
    console.log('🎬 ASSETS ANALYSIS:');
    console.log('🎬 Assets exist:', !!project.assets);
    if (project.assets) {
      console.log('🎬 Assets keys:', Object.keys(project.assets));
      console.log('🎬 Assets count:', Object.keys(project.assets).length);
      Object.entries(project.assets).forEach(([key, sceneAssets], index) => {
        console.log(`🎬 Scene ${index + 1} (${key}):`, sceneAssets);
        console.log(`🎬 Scene ${index + 1} visualUrl:`, sceneAssets.visualUrl);
        console.log(`🎬 Scene ${index + 1} voiceoverUrl:`, sceneAssets.voiceoverUrl);
      });
    }
    
    // Other Project Data
    console.log('📊 OTHER PROJECT DATA:');
    console.log('📊 Title:', project.title);
    console.log('📊 Platform:', project.platform);
    console.log('📊 Video Size:', project.videoSize);
    console.log('📊 Analysis:', project.analysis);
    console.log('📊 Competitor Analysis:', project.competitorAnalysis);
    console.log('📊 Sound Design:', project.soundDesign);
    console.log('📊 Launch Plan:', project.launchPlan);
  } else {
    console.log('⚠️ NO PROJECT DATA RECEIVED!');
  }
  
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
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState<boolean>(false);

  // Load project assets into the editor after it's initialized
  const loadProjectAssets = async (edit: any, projectData: Project) => {
    console.log('🎨 ===== STARTING ASSET LOADING PROCESS =====');
    console.log('🎨 Loading ONLY your blueprint assets into editor:', projectData);
    console.log('🎨 Edit instance:', edit);
    
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
      
      console.log('🔧 New edit structure created:', newEdit);

      // Add your script as text overlay
      console.log('📝 ===== SCRIPT LOADING SECTION =====');
      console.log('📝 Script exists:', !!projectData.script);
      console.log('📝 Script scenes exist:', !!(projectData.script && projectData.script.scenes));
      console.log('📝 Script scenes length:', projectData.script?.scenes?.length || 0);
      
      if (projectData.script && projectData.script.scenes && projectData.script.scenes.length > 0) {
        console.log('📝 Adding your script scenes as text overlays...');
        let scriptTracksAdded = 0;
        
        projectData.script.scenes.forEach((scene, index) => {
          console.log(`📝 Processing scene ${index + 1}:`, scene);
          console.log(`📝 Scene visual:`, scene.visual);
          console.log(`📝 Scene onScreenText:`, scene.onScreenText);
          console.log(`📝 Scene voiceover:`, scene.voiceover);
          
          if (scene.visual || scene.onScreenText) {
            const textContent = scene.onScreenText || scene.visual;
            console.log(`📝 Adding text track for scene ${index + 1} with content:`, textContent);
            
            newEdit.timeline.tracks.push({
              clips: [{
                asset: {
                  type: 'text',
                  text: textContent,
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
                start: index * 3,
                length: 3
              }]
            });
            scriptTracksAdded++;
            console.log(`📝 ✅ Script track ${scriptTracksAdded} added for scene ${index + 1}`);
          } else {
            console.log(`📝 ⚠️ Scene ${index + 1} has no visual or onScreenText, skipping`);
          }
        });
        console.log(`📝 ✅ Total script tracks added: ${scriptTracksAdded}`);
      } else {
        console.log('📝 ⚠️ No script scenes found to add');
      }

      // Add your voiceover as audio track
      console.log('🎤 ===== VOICEOVER LOADING SECTION =====');
      console.log('🎤 Voiceover URLs exist:', !!projectData.voiceoverUrls);
      console.log('🎤 Voiceover URLs:', projectData.voiceoverUrls);
      
      if (projectData.voiceoverUrls && Object.keys(projectData.voiceoverUrls).length > 0) {
        console.log('🎤 Adding your voiceover...');
        const voiceoverEntries = Object.entries(projectData.voiceoverUrls);
        console.log('🎤 Voiceover entries:', voiceoverEntries);
        
        voiceoverEntries.forEach(([key, url], index) => {
          console.log(`🎤 Processing voiceover ${index + 1} (${key}):`, url);
          
          if (url && typeof url === 'string') {
            newEdit.timeline.tracks.push({
              clips: [{
                asset: {
                  type: 'audio',
                  src: url
                },
                start: index * 10, // Stagger voiceovers
                length: 10
              }]
            });
            console.log(`🎤 ✅ Voiceover track ${index + 1} added:`, url);
          } else {
            console.log(`🎤 ⚠️ Invalid voiceover URL for ${key}:`, url);
          }
        });
        console.log(`🎤 ✅ Total voiceover tracks added: ${voiceoverEntries.length}`);
      } else {
        console.log('🎤 ⚠️ No voiceover URLs found to add');
      }

      // Add your moodboards as image assets
      console.log('🖼️ ===== MOODBOARD LOADING SECTION =====');
      console.log('🖼️ Moodboard exists:', !!projectData.moodboard);
      console.log('🖼️ Moodboard is array:', Array.isArray(projectData.moodboard));
      console.log('🖼️ Moodboard length:', projectData.moodboard?.length || 0);
      console.log('🖼️ Moodboard content:', projectData.moodboard);
      
      if (projectData.moodboard && Array.isArray(projectData.moodboard)) {
        console.log('🖼️ Adding your moodboards...');
        let moodboardTracksAdded = 0;
        
        projectData.moodboard.forEach((moodboard, index) => {
          console.log(`🖼️ Processing moodboard ${index + 1}:`, moodboard);
          
          if (moodboard && typeof moodboard === 'string') {
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
            moodboardTracksAdded++;
            console.log(`🖼️ ✅ Moodboard track ${moodboardTracksAdded} added:`, moodboard);
          } else {
            console.log(`🖼️ ⚠️ Invalid moodboard URL at index ${index}:`, moodboard);
          }
        });
        console.log(`🖼️ ✅ Total moodboard tracks added: ${moodboardTracksAdded}`);
      } else {
        console.log('🖼️ ⚠️ No moodboard found to add');
      }

      // Add assets from the assets object
      console.log('🎬 ===== SCENE ASSETS LOADING SECTION =====');
      console.log('🎬 Assets exist:', !!projectData.assets);
      console.log('🎬 Assets keys:', projectData.assets ? Object.keys(projectData.assets) : 'None');
      console.log('🎬 Assets count:', projectData.assets ? Object.keys(projectData.assets).length : 0);
      console.log('🎬 Assets content:', projectData.assets);
      
      if (projectData.assets && Object.keys(projectData.assets).length > 0) {
        console.log('🎬 Adding scene assets...');
        let sceneAssetsTracksAdded = 0;
        
        Object.entries(projectData.assets).forEach(([key, sceneAssets], index) => {
          console.log(`🎬 Processing scene assets ${index + 1} (${key}):`, sceneAssets);
          console.log(`🎬 Scene visualUrl:`, sceneAssets.visualUrl);
          console.log(`🎬 Scene voiceoverUrl:`, sceneAssets.voiceoverUrl);
          
          if (sceneAssets.visualUrl && typeof sceneAssets.visualUrl === 'string') {
            newEdit.timeline.tracks.push({
              clips: [{
                asset: {
                  type: 'image',
                  src: sceneAssets.visualUrl
                },
                start: index * 5,
                length: 5,
                fit: 'cover'
              }]
            });
            sceneAssetsTracksAdded++;
            console.log(`🎬 ✅ Visual track ${sceneAssetsTracksAdded} added:`, sceneAssets.visualUrl);
          } else {
            console.log(`🎬 ⚠️ Invalid visualUrl for scene ${key}:`, sceneAssets.visualUrl);
          }
          
          if (sceneAssets.voiceoverUrl && typeof sceneAssets.voiceoverUrl === 'string') {
            newEdit.timeline.tracks.push({
              clips: [{
                asset: {
                  type: 'audio',
                  src: sceneAssets.voiceoverUrl
                },
                start: index * 5,
                length: 5
              }]
            });
            sceneAssetsTracksAdded++;
            console.log(`🎬 ✅ Audio track ${sceneAssetsTracksAdded} added:`, sceneAssets.voiceoverUrl);
          } else {
            console.log(`🎬 ⚠️ Invalid voiceoverUrl for scene ${key}:`, sceneAssets.voiceoverUrl);
          }
        });
        console.log(`🎬 ✅ Total scene asset tracks added: ${sceneAssetsTracksAdded}`);
      } else {
        console.log('🎬 ⚠️ No scene assets found to add');
      }

      // Check if we have any assets loaded
      console.log('🔍 ===== ASSET LOADING SUMMARY =====');
      console.log('🔍 Total tracks created:', newEdit.timeline.tracks.length);
      console.log('🔍 Tracks structure:', newEdit.timeline.tracks);
      
      // If no assets found, add a placeholder
      if (newEdit.timeline.tracks.length === 0) {
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
        console.log('⚠️ Placeholder track added');
      }

      // Load the new edit with your assets
      console.log('🔄 ===== LOADING EDIT INTO SHOTSTACK =====');
      console.log('🔄 Final edit structure:', newEdit);
      console.log('🔄 Edit instance:', edit);
      console.log('🔄 Edit.loadEdit method exists:', typeof edit.loadEdit === 'function');
      
      if (newEdit.timeline.tracks.length > 0) {
        console.log('🔄 Loading new edit with your blueprint assets...');
        try {
          await edit.loadEdit(newEdit);
          console.log('✅ Editor updated with your blueprint assets!');
          console.log('✅ Edit loaded successfully into Shotstack');
        } catch (loadError) {
          console.error('❌ Error loading edit into Shotstack:', loadError);
          throw loadError;
        }
      } else {
        console.log('⚠️ No assets to load');
      }

      console.log('🎉 ===== ASSET LOADING COMPLETE =====');
      console.log('🎉 Your blueprint assets loaded successfully!');
    } catch (error) {
      console.error('❌ ===== ASSET LOADING ERROR =====');
      console.error('❌ Error loading your blueprint assets:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        cause: error.cause
      });
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
      console.log('📋 ===== PROJECT ASSET LOADING INITIATION =====');
      if (project) {
        console.log('📋 Loading your project assets:', project);
        console.log('📋 Project data details:', {
          script: project.script?.scenes ? `${project.script.scenes.length} scenes` : 'Missing',
          voiceoverUrls: project.voiceoverUrls ? `${Object.keys(project.voiceoverUrls).length} files` : 'Missing',
          moodboard: project.moodboard ? `${project.moodboard.length} items` : 'Missing',
          assets: project.assets ? `${Object.keys(project.assets).length} scenes` : 'Missing',
          title: project.title || 'Missing'
        });
        
        console.log('📋 About to call loadProjectAssets...');
        try {
          await loadProjectAssets(edit, project);
          console.log('📋 ✅ loadProjectAssets completed successfully');
        } catch (assetError) {
          console.error('📋 ❌ loadProjectAssets failed:', assetError);
        }
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!editRef.current) return;
      
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (isPlaying) {
            editRef.current.pause();
          } else {
            editRef.current.play();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          // Seek backward 1 second
          const newTime = Math.max(0, currentTime - 1);
          editRef.current.seek?.(newTime);
          setCurrentTime(newTime);
          break;
        case 'ArrowRight':
          event.preventDefault();
          // Seek forward 1 second
          const forwardTime = Math.min(duration, currentTime + 1);
          editRef.current.seek?.(forwardTime);
          setCurrentTime(forwardTime);
          break;
        case 'Escape':
          event.preventDefault();
          editRef.current.stop();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, currentTime, duration]);

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
        width: '100%',
        maxWidth: '100%', // Use full available width
        display: 'flex', 
        flexDirection: 'column',
        padding: '0', // Remove padding to prevent overlap
        gap: '20px',
        margin: '0' // Remove margins to prevent overlap
      }}>
        {/* Professional Editor Toolbar - Matching App Theme */}
        {!isLoading && !error && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)', // bg-black/30 like header
            border: '1px solid rgba(55, 65, 81, 0.5)', // border-gray-700/50
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            backdropFilter: 'blur(8px)'
          }}>
            {/* Top Row - Playback Controls & Status */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              {/* Left - Playback Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => editRef.current?.play()}
                  style={{
                    background: isPlaying ? '#4B5563' : '#4F46E5', // gray-600 : indigo-600
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isPlaying ? '⏸️' : '▶️'} {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => editRef.current?.stop()}
                  style={{
                    background: '#374151', // gray-700
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ⏹️ Stop
                </button>
                <div style={{
                  width: '1px',
                  height: '24px',
                  background: '#4B5563', // gray-600
                  margin: '0 12px'
                }}></div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#D1D5DB', // gray-300
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isPlaying ? '#10B981' : '#6B7280' // emerald-500 : gray-500
                  }}></div>
                  <span>{isPlaying ? 'Playing' : 'Ready'}</span>
                  <span style={{ color: '#9CA3AF' }}>•</span>
                  <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toFixed(1).padStart(4, '0')}</span>
                </div>
              </div>

              {/* Right - Blueprint Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {project?.script?.scenes && project.script.scenes.length > 0 && (
                  <span style={{ 
                    background: '#374151', // gray-700
                    color: '#D1D5DB', // gray-300
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    fontWeight: '500',
                    border: '1px solid #4B5563' // gray-600
                  }}>
                    Script
                  </span>
                )}
                {project?.voiceoverUrls && Object.keys(project.voiceoverUrls).length > 0 && (
                  <span style={{ 
                    background: '#374151', // gray-700
                    color: '#D1D5DB', // gray-300
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    fontWeight: '500',
                    border: '1px solid #4B5563' // gray-600
                  }}>
                    Voice
                  </span>
                )}
                {project?.assets && Object.keys(project.assets).length > 0 && (
                  <span style={{ 
                    background: '#374151', // gray-700
                    color: '#D1D5DB', // gray-300
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    fontWeight: '500',
                    border: '1px solid #4B5563' // gray-600
                  }}>
                    Assets
                  </span>
                )}
                {project?.moodboard && project.moodboard.length > 0 && (
                  <span style={{ 
                    background: '#374151', // gray-700
                    color: '#D1D5DB', // gray-300
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    fontWeight: '500',
                    border: '1px solid #4B5563' // gray-600
                  }}>
                    {project.moodboard.length} Images
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Row - Asset Tools */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Basic Assets */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#1F2937', // gray-800
                borderRadius: '6px',
                border: '1px solid #374151' // gray-700
              }}>
                <span style={{ color: '#D1D5DB', fontSize: '12px', fontWeight: '500' }}>Basic:</span>
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
                    background: '#4F46E5', // indigo-600
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Text
                </button>
                <button
                  onClick={() => {
                    if (editRef.current) {
                      editRef.current.addClip(3, {
                        asset: {
                          type: 'shape',
                          shape: 'rectangle',
                          rectangle: { width: 200, height: 100 },
                          fill: { color: '#4F46E5', opacity: 0.8 }
                        },
                        start: 0,
                        length: 5
                      });
                    }
                  }}
                  style={{
                    background: '#4F46E5', // indigo-600
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Shape
                </button>
              </div>

              {/* AI Generation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#1F2937', // gray-800
                borderRadius: '6px',
                border: '1px solid #374151' // gray-700
              }}>
                <span style={{ color: '#D1D5DB', fontSize: '12px', fontWeight: '500' }}>AI:</span>
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
                    background: '#10B981', // emerald-500
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Voice
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
                    background: '#10B981', // emerald-500
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Image
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
                    background: '#10B981', // emerald-500
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Video
                </button>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#1F2937', // gray-800
                borderRadius: '6px',
                border: '1px solid #374151' // gray-700
              }}>
                <button
                  onClick={addSampleClip}
                  style={{
                    background: '#4B5563', // gray-600
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Sample
                </button>
                <button
                  onClick={() => {
                    if (editRef.current) {
                      editRef.current.clearTracks();
                    }
                  }}
                  style={{
                    background: '#EF4444', // red-500
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (editRef.current) {
                      console.log('🎬 Exporting video...');
                      // Get the current edit state
                      const editState = editRef.current.getEdit?.() || editRef.current;
                      console.log('📋 Current edit state:', editState);
                      
                      // Create a download link for the video
                      // This would normally call the Shotstack API to render the video
                      alert('Export functionality will render your video using Shotstack API. Check console for edit data.');
                    }
                  }}
                  style={{
                    background: '#10B981', // emerald-500
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Export
                </button>
                <button
                  onClick={() => {
                    // Open properties panel with a sample asset
                    setSelectedAsset({
                      type: 'text',
                      text: 'Sample Text',
                      font: { size: 36, color: '#FFFFFF' },
                      start: 0,
                      length: 5
                    });
                    setShowPropertiesPanel(true);
                  }}
                  style={{
                    background: '#4F46E5', // indigo-600
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Properties
                </button>
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
            backgroundColor: '#111827', // gray-900
            borderRadius: '8px',
            minHeight: '60vh',
            maxHeight: '70vh',
            border: '1px solid #374151', // gray-700
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            opacity: isLoading ? 0.3 : 1,
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            position: 'relative'
          }}
        />

        {/* Timeline - Always render for ref callbacks */}
        <div
          ref={timelineRefCallback}
          data-shotstack-timeline
          style={{
            width: '100%',
            backgroundColor: '#1F2937', // gray-800
            borderRadius: '8px',
            height: '250px',
            border: '1px solid #374151', // gray-700
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            opacity: isLoading ? 0.3 : 1,
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '250px' // Ensure minimum height
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

        {/* Properties Panel - Right Sidebar */}
        {showPropertiesPanel && selectedAsset && (
          <div style={{
            position: 'fixed',
            top: '80px', // Below header
            right: '20px',
            width: '320px',
            height: 'calc(100vh - 100px)',
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '20px',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '1px solid #374151'
            }}>
              <h3 style={{
                color: '#F9FAFB',
                fontSize: '16px',
                fontWeight: '600',
                margin: 0
              }}>
                Asset Properties
              </h3>
              <button
                onClick={() => setShowPropertiesPanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ color: '#D1D5DB', fontSize: '14px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Asset Type
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: '#374151',
                  borderRadius: '4px',
                  border: '1px solid #4B5563'
                }}>
                  {selectedAsset.type || 'Unknown'}
                </div>
              </div>

              {selectedAsset.type === 'text' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Text Content
                    </label>
                    <textarea
                      value={selectedAsset.text || ''}
                      onChange={(e) => {
                        setSelectedAsset({...selectedAsset, text: e.target.value});
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#374151',
                        border: '1px solid #4B5563',
                        borderRadius: '4px',
                        color: '#F9FAFB',
                        fontSize: '14px',
                        resize: 'vertical',
                        minHeight: '60px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Font Size
                    </label>
                    <input
                      type="number"
                      value={selectedAsset.font?.size || 36}
                      onChange={(e) => {
                        setSelectedAsset({
                          ...selectedAsset,
                          font: {...selectedAsset.font, size: parseInt(e.target.value)}
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#374151',
                        border: '1px solid #4B5563',
                        borderRadius: '4px',
                        color: '#F9FAFB',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={selectedAsset.font?.color || '#FFFFFF'}
                      onChange={(e) => {
                        setSelectedAsset({
                          ...selectedAsset,
                          font: {...selectedAsset.font, color: e.target.value}
                        });
                      }}
                      style={{
                        width: '100%',
                        height: '40px',
                        background: '#374151',
                        border: '1px solid #4B5563',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Start Time (seconds)
                </label>
                <input
                  type="number"
                  value={selectedAsset.start || 0}
                  onChange={(e) => {
                    setSelectedAsset({...selectedAsset, start: parseFloat(e.target.value)});
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#374151',
                    border: '1px solid #4B5563',
                    borderRadius: '4px',
                    color: '#F9FAFB',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={selectedAsset.length || 5}
                  onChange={(e) => {
                    setSelectedAsset({...selectedAsset, length: parseFloat(e.target.value)});
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#374151',
                    border: '1px solid #4B5563',
                    borderRadius: '4px',
                    color: '#F9FAFB',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    // Apply changes to the selected asset
                    console.log('Applying changes to asset:', selectedAsset);
                    setShowPropertiesPanel(false);
                  }}
                  style={{
                    flex: 1,
                    background: '#4F46E5',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Apply Changes
                </button>
                <button
                  onClick={() => setShowPropertiesPanel(false)}
                  style={{
                    flex: 1,
                    background: '#374151',
                    color: '#D1D5DB',
                    border: '1px solid #4B5563',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
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
