import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";
import { Project, ShotstackEditJson } from '../types';
import { invokeEdgeFunction } from '../services/supabaseService';
import { useAppContext } from '../contexts/AppContext';
import KeyboardShortcuts from './KeyboardShortcuts';
import { 
  VideoCameraIcon, 
  FilmIcon, 
  FilmStripIcon, 
  MicrophoneIcon, 
  ImageIcon, 
  DocumentTextIcon, 
  CubeIcon, 
  ArrowDownTrayIcon, 
  Cog6ToothIcon, 
  BeakerIcon,
  AutopilotIcon,
  IdeaIcon,
  ScriptingIcon,
  RenderingIcon,
  ScheduledIcon,
  PublishedIcon,
  FailedIcon,
  PlayIcon,
  PauseIcon,
  StopCircleIcon,
  PlusIcon,
  SearchIcon,
  WandSparklesIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  AdjustmentsHorizontalIcon,
  PhotoIcon,
  PlayCircleIcon
} from './Icons';

// Dashboard Theme Colors - Exact match with your dashboard
const DASHBOARD_COLORS = {
  autopilot: '#4B0082',    // Dark purple
  idea: '#34495E',         // Dark blue
  scripting: '#8B4513',    // Dark orange/brown
  rendering: '#8B008B',    // Dark pink/magenta
  scheduled: '#008B8B',    // Dark blue/teal
  published: '#2F4F4F',    // Dark forest green
  failed: '#8B0000',       // Dark red
  background: '#1A1A2E',   // Main dark background
  card: '#2C2C3E',         // Card background
  text: '#FFFFFF',         // White text
  textSecondary: '#A0A0A0' // Light gray text
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

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

  const { handleUpdateProject, addToast } = useAppContext();
  
  // New state for sidebar management

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  
  // Timeline state
  const [timelineAssets, setTimelineAssets] = useState<any[]>([]);
  const [selectedClip, setSelectedClip] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load blueprint assets into timeline
  const loadBlueprintAssets = useCallback(() => {
    if (!project) return;
    
    const assets: any[] = [];
    let currentTime = 0;

    // Add script scenes as text overlays
    if (project.script?.scenes) {
      project.script.scenes.forEach((scene: any, index: number) => {
        assets.push({
          id: `text-${index}`,
          type: 'text',
          content: scene.text,
          startTime: currentTime,
          duration: 3, // Default 3 seconds per scene
          track: 'text',
          source: 'blueprint'
        });
        currentTime += 3;
      });
    }

    // Add voiceover
    if (project.voiceoverUrls?.main) {
      assets.push({
        id: 'voiceover-main',
        type: 'audio',
        content: 'Main Voiceover',
        url: project.voiceoverUrls.main,
        startTime: 0,
        duration: currentTime,
        track: 'audio',
        source: 'blueprint'
      });
    }

    // Add moodboard images
    if (project.moodboard) {
      project.moodboard.forEach((image: any, index: number) => {
        assets.push({
          id: `image-${index}`,
          type: 'image',
          content: `Moodboard Image ${index + 1}`,
          url: image.url,
          startTime: index * 2,
          duration: 2,
          track: 'video',
          source: 'blueprint'
        });
      });
    }

    setTimelineAssets(assets);
  }, [project]);

  // Load assets when project changes
  useEffect(() => {
    loadBlueprintAssets();
  }, [loadBlueprintAssets]);
  
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
  const [showPropertiesPanel, setShowPropertiesPanel] = useState<boolean>(false);
  const [assetLoadingStatus, setAssetLoadingStatus] = useState<string>('Initializing...');
  const [loadedAssetsCount, setLoadedAssetsCount] = useState<number>(0);
  
  // Performance optimization states
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const [selectedTracks, setSelectedTracks] = useState<Set<number>>(new Set());
  const [timelinePosition, setTimelinePosition] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  
  // Video rendering states
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [renderStatus, setRenderStatus] = useState<string>('');
  const [renderId, setRenderId] = useState<string | null>(null);
  
  // Video rendering function
  const handleVideoRender = useCallback(async () => {
    if (!editRef.current || !project) {
      addToast('No video content to render', 'error');
      return;
    }

    setIsRendering(true);
    setRenderStatus('Preparing video for rendering...');
    setRenderProgress({ current: 0, total: 100 });

    try {
      // Get the current edit state from Shotstack Studio
      const editState = editRef.current.getEdit?.() || editRef.current;
      console.log('🎬 Starting video render with edit state:', editState);

      setRenderStatus('Submitting render job...');
      setRenderProgress({ current: 20, total: 100 });

      // Call the shotstack-render Supabase function
      const renderResponse = await invokeEdgeFunction('shotstack-render', {
        projectId: project.id,
        edit: editState
      });

      if (renderResponse && (renderResponse as any).renderId) {
        const newRenderId = (renderResponse as any).renderId;
        setRenderId(newRenderId);
        setRenderStatus('Video rendering in progress...');
        setRenderProgress({ current: 40, total: 100 });

        // Update project with render ID
        await handleUpdateProject(project.id, {
          shotstackRenderId: newRenderId,
          status: 'Rendering'
        });

        // Start polling for render status
        pollRenderStatus(newRenderId);
      } else {
        throw new Error('Failed to start video rendering');
      }
    } catch (error) {
      console.error('Video rendering error:', error);
      addToast(`Video rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsRendering(false);
      setRenderStatus('');
      setRenderProgress(null);
    }
  }, [project, handleUpdateProject, addToast]);

  // Poll render status
  const pollRenderStatus = useCallback(async (renderId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setRenderStatus('Render timeout - please try again');
        setIsRendering(false);
        setRenderProgress(null);
        return;
      }

      try {
        const statusResponse = await invokeEdgeFunction('shotstack-status', {
          renderId: renderId
        });

        if (statusResponse && (statusResponse as any).status) {
          const status = (statusResponse as any).status;
          const progress = (statusResponse as any).progress || 0;

          setRenderProgress({ current: 40 + (progress * 0.6), total: 100 });
          setRenderStatus(`Rendering... ${Math.round(progress)}%`);

          if (status === 'done') {
            const videoUrl = (statusResponse as any).url;
            if (videoUrl) {
              setRenderStatus('Video rendered successfully!');
              setRenderProgress({ current: 100, total: 100 });
              
              // Update project with final video URL
              await handleUpdateProject(project!.id, {
                finalVideoUrl: videoUrl,
                status: 'Rendered'
              });

              addToast('Video rendered successfully!', 'success');
              
              // Move to analysis step
              setTimeout(() => {
                handleUpdateProject(project!.id, {
                  workflowStep: 5
                });
              }, 2000);
            } else {
              throw new Error('No video URL returned');
            }
            setIsRendering(false);
          } else if (status === 'failed') {
            throw new Error('Video rendering failed');
          } else {
            // Continue polling
            attempts++;
            setTimeout(poll, 5000); // Poll every 5 seconds
          }
        } else {
          throw new Error('Invalid status response');
        }
      } catch (error) {
        console.error('Status polling error:', error);
        setRenderStatus('Render failed - please try again');
        setIsRendering(false);
        setRenderProgress(null);
        addToast('Video rendering failed', 'error');
      }
    };

    poll();
  }, [project, handleUpdateProject, addToast]);

  // Debounced functions for performance
  const debouncedSeek = useCallback(
    debounce((time: number) => {
      if (editRef.current && !isSeeking) {
        setIsSeeking(true);
        editRef.current.seek?.(time);
        setCurrentTime(time);
        setTimeout(() => setIsSeeking(false), 100);
      }
    }, 50),
    [isSeeking]
  );
  
  const debouncedZoom = useCallback(
    debounce((zoom: number) => {
      setTimelineZoom(zoom);
      // Update timeline zoom if Shotstack supports it
      if (timelineRef.current && typeof timelineRef.current.setZoom === 'function') {
        timelineRef.current.setZoom(zoom);
      }
    }, 100),
    []
  );

  // Load project assets into the editor after it's initialized
  const loadProjectAssets = async (edit: any, projectData: Project) => {
    console.log('🎨 ===== STARTING ASSET LOADING PROCESS =====');
    console.log('🎨 Loading ONLY your blueprint assets into editor:', projectData);
    console.log('🎨 Edit instance:', edit);
    
    setAssetLoadingStatus('Analyzing project data...');
    
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
      
      setAssetLoadingStatus('Loading script scenes...');
      
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
      
      setAssetLoadingStatus('Loading voiceover tracks...');
      
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
      
      setAssetLoadingStatus('Loading moodboard images...');
      
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
      
      setAssetLoadingStatus('Loading scene assets...');
      
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
      
      setLoadedAssetsCount(newEdit.timeline.tracks.length);
      setAssetLoadingStatus(`Loaded ${newEdit.timeline.tracks.length} asset tracks`);
      
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
          // Try the primary method first
          if (typeof edit.loadEdit === 'function') {
            await edit.loadEdit(newEdit);
            console.log('✅ Editor updated with your blueprint assets!');
            console.log('✅ Edit loaded successfully into Shotstack');
          } else {
            console.log('⚠️ edit.loadEdit is not a function, trying alternative approach...');
            
            // Alternative approach: try to add clips directly
            newEdit.timeline.tracks.forEach((track, trackIndex) => {
              track.clips.forEach((clip, clipIndex) => {
                try {
                  if (typeof edit.addClip === 'function') {
                    edit.addClip(trackIndex, clip);
                    console.log(`✅ Added clip ${clipIndex} to track ${trackIndex}`);
                  } else {
                    console.log(`⚠️ edit.addClip is not available for track ${trackIndex}, clip ${clipIndex}`);
                  }
                } catch (clipError) {
                  console.error(`❌ Error adding clip ${clipIndex} to track ${trackIndex}:`, clipError);
                }
              });
            });
          }
        } catch (loadError) {
          console.error('❌ Error loading edit into Shotstack:', loadError);
          console.log('🔄 Attempting fallback asset loading...');
          
          // Fallback: try to add assets one by one
          try {
            newEdit.timeline.tracks.forEach((track, trackIndex) => {
              track.clips.forEach((clip, clipIndex) => {
                try {
                  if (typeof edit.addClip === 'function') {
                    edit.addClip(trackIndex, clip);
                    console.log(`🔄 Fallback: Added clip ${clipIndex} to track ${trackIndex}`);
                  }
                } catch (clipError) {
                  console.error(`❌ Fallback failed for clip ${clipIndex} to track ${trackIndex}:`, clipError);
                }
              });
            });
          } catch (fallbackError) {
            console.error('❌ Fallback asset loading also failed:', fallbackError);
            throw loadError; // Throw original error
          }
        }
      } else {
        console.log('⚠️ No assets to load');
      }

      console.log('🎉 ===== ASSET LOADING COMPLETE =====');
      console.log('🎉 Your blueprint assets loaded successfully!');
      
      setAssetLoadingStatus(`✅ Successfully loaded ${loadedAssetsCount} blueprint assets`);
    } catch (error) {
      console.error('❌ ===== ASSET LOADING ERROR =====');
      console.error('❌ Error loading your blueprint assets:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        cause: error.cause
      });
      
      setAssetLoadingStatus(`❌ Error loading assets: ${error.message}`);
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
      const template: ShotstackEditJson = {
        timeline: {
          tracks: [], // Empty - will be filled with your assets
          background: '#000000'
        },
        output: {
          size: { width: 1280, height: 720 },
          format: 'mp4'
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
      const canvas = new Canvas(template.output.size, edit);
      await canvas.load(); // Pass DOM element like working example
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

  // Enhanced keyboard shortcuts with performance optimization
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't interfere with input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
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
          debouncedSeek(newTime);
          break;
        case 'ArrowRight':
          event.preventDefault();
          // Seek forward 1 second
          const forwardTime = Math.min(duration, currentTime + 1);
          debouncedSeek(forwardTime);
          break;
        case 'KeyJ':
          event.preventDefault();
          // Rewind 5 seconds
          const rewindTime = Math.max(0, currentTime - 5);
          debouncedSeek(rewindTime);
          break;
        case 'KeyK':
          event.preventDefault();
          // Toggle play/pause
          if (isPlaying) {
            editRef.current.pause();
          } else {
            editRef.current.play();
          }
          break;
        case 'KeyL':
          event.preventDefault();
          // Fast forward 5 seconds
          const fastForwardTime = Math.min(duration, currentTime + 5);
          debouncedSeek(fastForwardTime);
          break;
        case 'Digit0':
          event.preventDefault();
          // Seek to beginning
          debouncedSeek(0);
          break;
        case 'Digit1':
          event.preventDefault();
          // Seek to 10%
          debouncedSeek(duration * 0.1);
          break;
        case 'Digit2':
          event.preventDefault();
          // Seek to 20%
          debouncedSeek(duration * 0.2);
          break;
        case 'Digit3':
          event.preventDefault();
          // Seek to 30%
          debouncedSeek(duration * 0.3);
          break;
        case 'Digit4':
          event.preventDefault();
          // Seek to 40%
          debouncedSeek(duration * 0.4);
          break;
        case 'Digit5':
          event.preventDefault();
          // Seek to 50%
          debouncedSeek(duration * 0.5);
          break;
        case 'Digit6':
          event.preventDefault();
          // Seek to 60%
          debouncedSeek(duration * 0.6);
          break;
        case 'Digit7':
          event.preventDefault();
          // Seek to 70%
          debouncedSeek(duration * 0.7);
          break;
        case 'Digit8':
          event.preventDefault();
          // Seek to 80%
          debouncedSeek(duration * 0.8);
          break;
        case 'Digit9':
          event.preventDefault();
          // Seek to 90%
          debouncedSeek(duration * 0.9);
          break;
        case 'Equal':
        case 'NumpadAdd':
          event.preventDefault();
          // Zoom in
          debouncedZoom(Math.min(timelineZoom * 1.2, 5));
          break;
        case 'Minus':
        case 'NumpadSubtract':
          event.preventDefault();
          // Zoom out
          debouncedZoom(Math.max(timelineZoom / 1.2, 0.1));
          break;
        case 'Escape':
          event.preventDefault();
          editRef.current.stop();
          setSelectedTracks(new Set());
          setShowPropertiesPanel(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, currentTime, duration, timelineZoom, debouncedSeek, debouncedZoom]);

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
    <div className="w-full h-full flex animate-fade-in-up" style={{ backgroundColor: DASHBOARD_COLORS.background }}>
      <KeyboardShortcuts 
        onPlay={() => {
          if (editRef.current) {
            editRef.current.play?.();
            setIsPlaying(true);
          }
        }}
        onPause={() => {
          if (editRef.current) {
            editRef.current.pause?.();
            setIsPlaying(false);
          }
        }}
        onSave={handleVideoRender}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
          {/* Left Sidebar Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLeftSidebarOpen(true)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Bars3Icon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* Center - Playback Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (editRef.current) {
                  editRef.current.play?.();
                  setIsPlaying(true);
                }
              }}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <PlayIcon className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => {
                if (editRef.current) {
                  editRef.current.pause?.();
                  setIsPlaying(false);
                }
              }}
              className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            >
              <PauseIcon className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => {
                if (editRef.current) {
                  editRef.current.stop?.();
                  setIsPlaying(false);
                }
              }}
              className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            >
              <StopIcon className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Right - Export and Clear */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleVideoRender}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <FilmStripIcon className="w-4 h-4" />
              <span>Export Video</span>
            </button>
            <button
              onClick={() => {
                if (editRef.current) {
                  editRef.current.clear?.();
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
        
        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl">
            <Canvas
              ref={canvasRef}
              edit={edit}
              onReady={() => {
                console.log('✅ Canvas ready');
                setCanvasReady(true);
              }}
              onError={(error) => {
                console.error('❌ Canvas error:', error);
                setCanvasReady(false);
              }}
            />
          </div>
        </div>
        
        {/* Timeline Controls */}
        <div className="h-20 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-6">
          {/* Left - Timeline Navigation */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm font-medium">Timeline:</span>
            <button
              onClick={() => setTimelineZoom(Math.max(0.5, timelineZoom - 0.1))}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MinusIcon className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-gray-300 text-sm">{Math.round(timelineZoom * 100)}%</span>
            <button
              onClick={() => setTimelineZoom(Math.min(2, timelineZoom + 0.1))}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Center - Timeline Position */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">
              {Math.floor(timelinePosition / 60)}:{(timelinePosition % 60).toFixed(1).padStart(4, '0')}
            </span>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-100"
                style={{ width: `${(timelinePosition / duration) * 100}%` }}
              />
            </div>
            <span className="text-gray-300 text-sm">
              {Math.floor(duration / 60)}:{(duration % 60).toFixed(1).padStart(4, '0')}
            </span>
          </div>
          
          {/* Right - Timeline Info */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">
              {timelineAssets.length} assets
            </span>
            <button
              onClick={() => setRightSidebarOpen(true)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center p-6 bg-gray-800 border-t border-gray-700">
        <button
          onClick={() => handleUpdateProject({ currentStep: 3 })}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          <span>Back to Review</span>
        </button>
        
        <button
          onClick={() => handleUpdateProject({ currentStep: 5 })}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>Analyze & Report</span>
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
        {/* Enhanced Timeline Container */}
        <div 
          className="w-full rounded-2xl border-2 shadow-2xl overflow-hidden relative"
          style={{ 
            backgroundColor: DASHBOARD_COLORS.card,
            borderColor: DASHBOARD_COLORS.rendering
          }}
        >
          {/* Timeline Header */}
          <div 
            className="px-6 py-4 border-b-2 flex justify-between items-center"
            style={{ 
              backgroundColor: DASHBOARD_COLORS.background,
              borderColor: DASHBOARD_COLORS.rendering
            }}
          >
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-bold flex items-center space-x-2" style={{ color: DASHBOARD_COLORS.text }}>
                <FilmStripIcon className="w-5 h-5" style={{ color: DASHBOARD_COLORS.rendering }} />
                <span>Timeline</span>
              </h3>
              <div 
                className="px-3 py-1 rounded-lg text-sm font-medium border-2 flex items-center space-x-2"
                style={{ 
                  backgroundColor: DASHBOARD_COLORS.card,
                  color: DASHBOARD_COLORS.text,
                  borderColor: DASHBOARD_COLORS.scripting
                }}
              >
                <span>Zoom:</span>
                <span className="font-semibold" style={{ color: DASHBOARD_COLORS.published }}>{Math.round(timelineZoom * 100)}%</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm" style={{ color: DASHBOARD_COLORS.textSecondary }}>Assets:</span>
              <span 
                className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full border-2"
                style={{ 
                  backgroundColor: DASHBOARD_COLORS.published + '20',
                  color: DASHBOARD_COLORS.published,
                  borderColor: DASHBOARD_COLORS.published + '30'
                }}
              >
                {loadedAssetsCount} loaded
              </span>
            </div>
          </div>
          
          {/* Timeline Ruler */}
          <div 
            className="px-6 py-3 border-b-2 flex items-center space-x-5 font-mono text-xs"
            style={{ 
              backgroundColor: DASHBOARD_COLORS.background,
              borderColor: DASHBOARD_COLORS.rendering,
              color: DASHBOARD_COLORS.textSecondary
            }}
          >
            <span className="font-semibold flex items-center space-x-1" style={{ color: DASHBOARD_COLORS.idea }}>
              <Cog6ToothIcon className="w-3 h-3" />
              <span>Time Ruler:</span>
            </span>
            {[0, 5, 10, 15, 20, 25, 30].map(time => (
              <span 
                key={time} 
                className="px-2 py-1 rounded font-medium"
                style={{
                  color: time === Math.floor(currentTime) ? DASHBOARD_COLORS.published : DASHBOARD_COLORS.textSecondary,
                  backgroundColor: time === Math.floor(currentTime) ? DASHBOARD_COLORS.published + '20' : 'transparent',
                  fontWeight: time === Math.floor(currentTime) ? 'bold' : 'normal'
                }}
              >
                {time}s
              </span>
            ))}
          </div>
          
          {/* Main Timeline Area */}
          <div
            ref={timelineRefCallback}
            data-shotstack-timeline
            className={`w-full h-80 overflow-hidden relative flex items-center justify-center min-h-80 transition-all duration-300 ${
              isLoading ? 'opacity-30' : 'opacity-100'
            }`}
            style={{
              background: `
                linear-gradient(90deg, transparent 0%, transparent 49%, rgba(52, 73, 94, 0.3) 50%, rgba(52, 73, 94, 0.3) 51%, transparent 52%, transparent 100%),
                linear-gradient(0deg, transparent 0%, transparent 49%, rgba(52, 73, 94, 0.3) 50%, rgba(52, 73, 94, 0.3) 51%, transparent 52%, transparent 100%),
                ${DASHBOARD_COLORS.background}
              `,
              backgroundSize: '40px 40px, 40px 40px, 100% 100%'
            }}
          >
            {/* Playhead Indicator */}
            {!isLoading && (
              <div style={{
                position: 'absolute',
                left: `${(currentTime / Math.max(duration, 1)) * 100}%`,
                top: '0',
                bottom: '0',
                width: '2px',
                background: `linear-gradient(to bottom, ${DASHBOARD_COLORS.idea}, ${DASHBOARD_COLORS.scripting})`,
                boxShadow: `0 0 8px ${DASHBOARD_COLORS.idea}60`,
                zIndex: 10,
                transition: 'left 0.1s ease'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-6px',
                  width: '14px',
                  height: '14px',
                  background: DASHBOARD_COLORS.idea,
                  borderRadius: '50%',
                  border: `2px solid ${DASHBOARD_COLORS.background}`,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
                }}></div>
              </div>
            )}
            
            {isLoading && (
              <div style={{
                color: '#F9FAFB',
                fontSize: '16px',
                textAlign: 'center',
                position: 'absolute',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(79, 70, 229, 0.3)',
                  borderTop: '3px solid #4F46E5',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Loading Professional Timeline...</span>
              </div>
            )}
            
            {!isLoading && !error && (
              <div style={{
                color: '#6B7280',
                fontSize: '14px',
                textAlign: 'center',
                position: 'absolute',
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FilmStripIcon className="w-8 h-8" style={{ color: DASHBOARD_COLORS.rendering }} />
                <span style={{ color: DASHBOARD_COLORS.text }}>Professional Timeline Ready</span>
                <span style={{ fontSize: '12px', color: DASHBOARD_COLORS.textSecondary }}>
                  Shotstack Studio will render your assets here
                </span>
              </div>
            )}
          </div>
          
          {/* Timeline Footer */}
          <div 
            className="px-6 py-3 border-t-2 flex justify-between items-center text-xs"
            style={{ 
              backgroundColor: DASHBOARD_COLORS.background,
              borderColor: DASHBOARD_COLORS.rendering,
              color: DASHBOARD_COLORS.textSecondary
            }}
          >
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <MicrophoneIcon className="w-3 h-3" style={{ color: DASHBOARD_COLORS.autopilot }} />
                <span>Audio Tracks</span>
              </span>
              <span className="flex items-center space-x-1">
                <VideoCameraIcon className="w-3 h-3" style={{ color: DASHBOARD_COLORS.rendering }} />
                <span>Video Tracks</span>
              </span>
              <span className="flex items-center space-x-1">
                <DocumentTextIcon className="w-3 h-3" style={{ color: DASHBOARD_COLORS.scripting }} />
                <span>Text Tracks</span>
              </span>
            </div>
            <div className="flex items-center space-x-3 font-mono">
              <span>Duration: {Math.floor(duration / 60)}:{(duration % 60).toFixed(1).padStart(4, '0')}</span>
              <span style={{ color: DASHBOARD_COLORS.textSecondary }}>•</span>
              <span>Position: {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, '0')}</span>
            </div>
          </div>
        </div>
    </div>
  );
};

export default FinalShotstackStudio;
