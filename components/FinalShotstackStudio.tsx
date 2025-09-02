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
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
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
      
      {/* Left Sidebar - Asset Library */}
      <div className={`${leftSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden`}>
        {leftSidebarOpen && (
          <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Bars3Icon className="w-5 h-5 mr-2" style={{ color: DASHBOARD_COLORS.idea }} />
                Asset Library
              </h3>
              <button
                onClick={() => setLeftSidebarOpen(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <XIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            {/* Asset Categories */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Basic Assets */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Basic Assets</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'text',
                        content: 'New Text Overlay',
                        duration: 3
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <DocumentTextIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.scripting }} />
                    <span className="text-xs text-white">Text</span>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'shape',
                        content: 'New Shape',
                        duration: 5
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <CubeIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.idea }} />
                    <span className="text-xs text-white">Shapes</span>
                  </div>
                </div>
              </div>
              
              {/* AI Assets */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">AI Generation</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'audio',
                        content: 'AI Generated Voice',
                        duration: 10,
                        track: 'audio'
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <WandSparklesIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.autopilot }} />
                    <span className="text-xs text-white">AI Voice</span>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'image',
                        content: 'AI Generated Image',
                        duration: 5,
                        track: 'video'
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <PhotoIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.rendering }} />
                    <span className="text-xs text-white">AI Image</span>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'video',
                        content: 'AI Generated Video',
                        duration: 8,
                        track: 'video'
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <VideoCameraIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.published }} />
                    <span className="text-xs text-white">AI Video</span>
                  </div>
                </div>
              </div>
              
              {/* Stock Assets */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Stock Assets</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'image',
                        content: 'Stock Image',
                        duration: 4,
                        track: 'video'
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <SearchIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.scheduled }} />
                    <span className="text-xs text-white">Pixabay Images</span>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'video',
                        content: 'Stock Video',
                        duration: 6,
                        track: 'video'
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <SearchIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.scheduled }} />
                    <span className="text-xs text-white">Pixabay Videos</span>
                  </div>
                </div>
              </div>

              {/* Music & Audio */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Music & Audio</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'music',
                        content: 'Background Music',
                        duration: 30,
                        track: 'music'
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <PlayCircleIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.scheduled }} />
                    <span className="text-xs text-white">Background Music</span>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'audio',
                        content: 'Sound Effect',
                        duration: 2,
                        track: 'audio'
                      }));
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center space-y-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <MicrophoneIcon className="w-6 h-6" style={{ color: DASHBOARD_COLORS.autopilot }} />
                    <span className="text-xs text-white">Sound Effects</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
          {/* Left Sidebar Toggle */}
          <div className="flex items-center space-x-4">
            {!leftSidebarOpen && (
              <button
                onClick={() => setLeftSidebarOpen(true)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Bars3Icon className="w-5 h-5 text-gray-400" />
              </button>
            )}
            
            {/* Playback Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (editRef.current) {
                    editRef.current.play?.();
                    setIsPlaying(true);
                  }
                }}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                style={{ backgroundColor: DASHBOARD_COLORS.idea }}
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
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                style={{ backgroundColor: DASHBOARD_COLORS.scheduled }}
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
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                style={{ backgroundColor: DASHBOARD_COLORS.failed }}
              >
                <StopCircleIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Time Display */}
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <Cog6ToothIcon className="w-4 h-4" />
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Center - Project Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-lg" style={{ backgroundColor: DASHBOARD_COLORS.card }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DASHBOARD_COLORS.published }}></div>
              <span className="text-sm text-white font-medium">Ready</span>
            </div>
          </div>
          
          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleVideoRender}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
              style={{ backgroundColor: DASHBOARD_COLORS.published }}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            {/* Right Sidebar Toggle */}
            {!rightSidebarOpen && (
              <button
                onClick={() => setRightSidebarOpen(true)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
        
        {/* Canvas Area */}
        <div className="flex-1 flex">
          <div className="flex-1 p-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Loading Professional Video Editor</h2>
                  <p className="text-gray-400">Initializing Shotstack Studio...</p>
                </div>
              </div>
            )}

            {/* Video Rendering Progress */}
            {isRendering && (
              <div 
                className="rounded-2xl p-6 backdrop-blur-sm shadow-2xl border-2 mb-6"
                style={{ 
                  backgroundColor: DASHBOARD_COLORS.card,
                  borderColor: DASHBOARD_COLORS.rendering
                }}
              >
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    <RenderingIcon className="w-8 h-8 animate-spin" style={{ color: DASHBOARD_COLORS.rendering }} />
                    <h3 className="text-xl font-bold" style={{ color: DASHBOARD_COLORS.text }}>Rendering Your Video</h3>
                  </div>
                  <p style={{ color: DASHBOARD_COLORS.textSecondary }}>{renderStatus}</p>
                  {renderProgress && (
                    <div className="w-full rounded-full h-3" style={{ backgroundColor: DASHBOARD_COLORS.background }}>
                      <div 
                        className="h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${renderProgress.current}%`,
                          backgroundColor: DASHBOARD_COLORS.rendering
                        }}
                      ></div>
                    </div>
                  )}
                  <p className="text-sm" style={{ color: DASHBOARD_COLORS.textSecondary }}>
                    This may take a few minutes. You can continue editing while your video renders.
                  </p>
                </div>
              </div>
            )}

            {/* Main Editor Content */}
            {!isLoading && !error && (
              <div className="space-y-6">
                {/* Video Canvas */}
                <div 
                  className="rounded-2xl p-6 backdrop-blur-sm shadow-2xl border-2"
                  style={{ 
                    backgroundColor: DASHBOARD_COLORS.card,
                    borderColor: DASHBOARD_COLORS.scripting
                  }}
                >
                  <div className="aspect-video bg-black rounded-xl flex items-center justify-center border-2 border-dashed border-gray-600">
                    <div className="text-center space-y-4">
                      <VideoCameraIcon className="w-16 h-16 mx-auto" style={{ color: DASHBOARD_COLORS.textSecondary }} />
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Video Canvas Ready</h3>
                        <p className="text-gray-400">Drag assets from the sidebar to start building your video</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Timeline */}
                <div 
                  className="rounded-2xl p-6 backdrop-blur-sm shadow-2xl border-2"
                  style={{ 
                    backgroundColor: DASHBOARD_COLORS.card,
                    borderColor: DASHBOARD_COLORS.rendering
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center space-x-2" style={{ color: DASHBOARD_COLORS.text }}>
                      <FilmStripIcon className="w-5 h-5" style={{ color: DASHBOARD_COLORS.rendering }} />
                      <span>Timeline</span>
                    </h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <span>Duration: {formatTime(duration)}</span>
                        <span>•</span>
                        <span>Position: {formatTime(currentTime)}</span>
                      </div>
                      <button
                        onClick={loadBlueprintAssets}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                      >
                        Load Assets
                      </button>
                    </div>
                  </div>

                  {/* Timeline Ruler */}
                  <div className="mb-4">
                    <div className="h-8 bg-gray-800 rounded-lg flex items-center px-4 relative">
                      <div className="flex space-x-8 text-xs text-gray-400">
                        {[0, 5, 10, 15, 20, 25, 30].map(time => (
                          <div key={time} className="flex flex-col items-center">
                            <div className="w-px h-2 bg-gray-600"></div>
                            <span className="mt-1">{time}s</span>
                          </div>
                        ))}
                      </div>
                      {/* Playhead */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ left: `${(currentTime / Math.max(duration, 30)) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Timeline Tracks */}
                  <div className="space-y-2">
                    {/* Video Track */}
                    <div className="flex items-center space-x-4">
                      <div className="w-20 text-sm font-medium text-gray-300 flex items-center">
                        <VideoCameraIcon className="w-4 h-4 mr-2" style={{ color: DASHBOARD_COLORS.published }} />
                        Video
                      </div>
                      <div 
                        className="flex-1 h-16 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 relative overflow-hidden"
                        onDrop={(e) => {
                          e.preventDefault();
                          const assetData = JSON.parse(e.dataTransfer.getData('text/plain'));
                          if (assetData.track === 'video') {
                            const newAsset = {
                              ...assetData,
                              id: `video-${Date.now()}`,
                              startTime: 0,
                              track: 'video'
                            };
                            setTimelineAssets(prev => [...prev, newAsset]);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {/* Video Clips */}
                        {timelineAssets.filter(asset => asset.track === 'video').map((asset, index) => (
                          <div
                            key={asset.id}
                            className={`absolute top-1 bottom-1 rounded border-2 cursor-pointer transition-all ${
                              selectedClip?.id === asset.id ? 'ring-2 ring-blue-400' : ''
                            }`}
                            style={{
                              left: `${(asset.startTime / 30) * 100}%`,
                              width: `${(asset.duration / 30) * 100}%`,
                              backgroundColor: DASHBOARD_COLORS.published,
                              borderColor: DASHBOARD_COLORS.published
                            }}
                            onClick={() => setSelectedClip(asset)}
                          >
                            <div className="p-2 text-white text-xs font-medium truncate">
                              {asset.content}
                            </div>
                            {/* Resize handles */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white opacity-50 cursor-ew-resize"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-50 cursor-ew-resize"></div>
                          </div>
                        ))}
                        {timelineAssets.filter(asset => asset.track === 'video').length === 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                            Drop video assets here
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Audio Track */}
                    <div className="flex items-center space-x-4">
                      <div className="w-20 text-sm font-medium text-gray-300 flex items-center">
                        <MicrophoneIcon className="w-4 h-4 mr-2" style={{ color: DASHBOARD_COLORS.autopilot }} />
                        Audio
                      </div>
                      <div 
                        className="flex-1 h-16 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 relative overflow-hidden"
                        onDrop={(e) => {
                          e.preventDefault();
                          const assetData = JSON.parse(e.dataTransfer.getData('text/plain'));
                          if (assetData.track === 'audio') {
                            const newAsset = {
                              ...assetData,
                              id: `audio-${Date.now()}`,
                              startTime: 0,
                              track: 'audio'
                            };
                            setTimelineAssets(prev => [...prev, newAsset]);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {/* Audio Clips */}
                        {timelineAssets.filter(asset => asset.track === 'audio').map((asset, index) => (
                          <div
                            key={asset.id}
                            className={`absolute top-1 bottom-1 rounded border-2 cursor-pointer transition-all ${
                              selectedClip?.id === asset.id ? 'ring-2 ring-blue-400' : ''
                            }`}
                            style={{
                              left: `${(asset.startTime / 30) * 100}%`,
                              width: `${(asset.duration / 30) * 100}%`,
                              backgroundColor: DASHBOARD_COLORS.autopilot,
                              borderColor: DASHBOARD_COLORS.autopilot
                            }}
                            onClick={() => setSelectedClip(asset)}
                          >
                            <div className="p-2 text-white text-xs font-medium truncate flex items-center">
                              <MicrophoneIcon className="w-3 h-3 mr-1" />
                              {asset.content}
                            </div>
                            {/* Resize handles */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white opacity-50 cursor-ew-resize"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-50 cursor-ew-resize"></div>
                          </div>
                        ))}
                        {timelineAssets.filter(asset => asset.track === 'audio').length === 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                            Drop audio/voiceover here
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Text Track */}
                    <div className="flex items-center space-x-4">
                      <div className="w-20 text-sm font-medium text-gray-300 flex items-center">
                        <DocumentTextIcon className="w-4 h-4 mr-2" style={{ color: DASHBOARD_COLORS.scripting }} />
                        Text
                      </div>
                      <div 
                        className="flex-1 h-16 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 relative overflow-hidden"
                        onDrop={(e) => {
                          e.preventDefault();
                          const assetData = JSON.parse(e.dataTransfer.getData('text/plain'));
                          if (assetData.type === 'text') {
                            const newAsset = {
                              ...assetData,
                              id: `text-${Date.now()}`,
                              startTime: 0,
                              track: 'text'
                            };
                            setTimelineAssets(prev => [...prev, newAsset]);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {/* Text Clips */}
                        {timelineAssets.filter(asset => asset.track === 'text').map((asset, index) => (
                          <div
                            key={asset.id}
                            className={`absolute top-1 bottom-1 rounded border-2 cursor-pointer transition-all ${
                              selectedClip?.id === asset.id ? 'ring-2 ring-blue-400' : ''
                            }`}
                            style={{
                              left: `${(asset.startTime / 30) * 100}%`,
                              width: `${(asset.duration / 30) * 100}%`,
                              backgroundColor: DASHBOARD_COLORS.scripting,
                              borderColor: DASHBOARD_COLORS.scripting
                            }}
                            onClick={() => setSelectedClip(asset)}
                          >
                            <div className="p-2 text-white text-xs font-medium truncate flex items-center">
                              <DocumentTextIcon className="w-3 h-3 mr-1" />
                              {asset.content}
                            </div>
                            {/* Resize handles */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white opacity-50 cursor-ew-resize"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-50 cursor-ew-resize"></div>
                          </div>
                        ))}
                        {timelineAssets.filter(asset => asset.track === 'text').length === 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                            Drop text overlays here
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Music Track */}
                    <div className="flex items-center space-x-4">
                      <div className="w-20 text-sm font-medium text-gray-300 flex items-center">
                        <PlayCircleIcon className="w-4 h-4 mr-2" style={{ color: DASHBOARD_COLORS.scheduled }} />
                        Music
                      </div>
                      <div 
                        className="flex-1 h-16 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 relative overflow-hidden"
                        onDrop={(e) => {
                          e.preventDefault();
                          const assetData = JSON.parse(e.dataTransfer.getData('text/plain'));
                          if (assetData.track === 'music') {
                            const newAsset = {
                              ...assetData,
                              id: `music-${Date.now()}`,
                              startTime: 0,
                              track: 'music'
                            };
                            setTimelineAssets(prev => [...prev, newAsset]);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                          Drop background music here
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Controls */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => {
                          if (selectedClip) {
                            setTimelineAssets(assets => assets.filter(asset => asset.id !== selectedClip.id));
                            setSelectedClip(null);
                          }
                        }}
                        disabled={!selectedClip}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                      >
                        Delete Clip
                      </button>
                      <button
                        onClick={() => {
                          if (selectedClip) {
                            setSelectedAsset(selectedClip);
                            setRightSidebarOpen(true);
                          }
                        }}
                        disabled={!selectedClip}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                      >
                        Edit Clip
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <span>Clips: {timelineAssets.length}</span>
                      <span>•</span>
                      <span>Selected: {selectedClip ? selectedClip.content : 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6">
                  <button
                    onClick={() => {
                      // Navigate to Stage 3
                      if (project) {
                        handleUpdateProject({
                          ...project,
                          workflowStep: 3
                        });
                      }
                    }}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    <span>Back to Review</span>
                  </button>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleVideoRender}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                      style={{ backgroundColor: DASHBOARD_COLORS.published }}
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span>Export Video</span>
                    </button>

                    <button
                      onClick={() => {
                        // Navigate to Stage 5
                        if (project) {
                          handleUpdateProject({
                            ...project,
                            workflowStep: 5
                          });
                        }
                      }}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                      style={{ backgroundColor: DASHBOARD_COLORS.rendering }}
                    >
                      <span>Analyze & Report</span>
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Asset Properties */}
        <div className={`${rightSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden`}>
          {rightSidebarOpen && (
            <div className="h-full bg-gray-800 border-l border-gray-700 flex flex-col">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" style={{ color: DASHBOARD_COLORS.rendering }} />
                  Asset Properties
                </h3>
                <button
                  onClick={() => setRightSidebarOpen(false)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <XIcon className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              {/* Properties Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedAsset ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Asset Type</label>
                      <input
                        type="text"
                        value={selectedAsset.type || 'text'}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                      <textarea
                        value={selectedAsset.content || ''}
                        onChange={(e) => setSelectedAsset({...selectedAsset, content: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Start Time (seconds)</label>
                      <input
                        type="number"
                        value={selectedAsset.startTime || 0}
                        onChange={(e) => setSelectedAsset({...selectedAsset, startTime: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Duration (seconds)</label>
                      <input
                        type="number"
                        value={selectedAsset.duration || 5}
                        onChange={(e) => setSelectedAsset({...selectedAsset, duration: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => {
                          console.log('Applying changes to asset:', selectedAsset);
                          setSelectedAsset(null);
                        }}
                        className="flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors"
                        style={{ backgroundColor: DASHBOARD_COLORS.published }}
                      >
                        Apply Changes
                      </button>
                      <button
                        onClick={() => setSelectedAsset(null)}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AdjustmentsHorizontalIcon className="w-12 h-12 mx-auto mb-4" style={{ color: DASHBOARD_COLORS.textSecondary }} />
                    <p className="text-gray-400">Select an asset to edit its properties</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

        {/* Professional Editor Toolbar - Matching Dashboard Theme */}
        {!isLoading && !error && (
          <div 
            className="rounded-2xl p-6 backdrop-blur-sm shadow-2xl border-2"
            style={{ 
              backgroundColor: DASHBOARD_COLORS.card,
              borderColor: DASHBOARD_COLORS.scripting
            }}
          >
            {/* Top Row - Playback Controls & Status */}
            <div className="flex justify-between items-center mb-6">
              {/* Left - Enhanced Playback Controls */}
              <div className="flex items-center space-x-4">
                {/* Play/Pause Button - Enhanced */}
                <button
                  onClick={() => {
                    if (isPlaying) {
                      editRef.current?.pause();
                    } else {
                      editRef.current?.play();
                    }
                  }}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg min-w-[140px]"
                  style={{ 
                    backgroundColor: isPlaying ? DASHBOARD_COLORS.failed : DASHBOARD_COLORS.idea
                  }}
                >
                  <VideoCameraIcon className="w-5 h-5 mr-2" style={{ color: DASHBOARD_COLORS.text }} />
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                
                {/* Stop Button - Enhanced */}
                <button
                  onClick={() => editRef.current?.stop()}
                  className="inline-flex items-center justify-center px-4 py-3 text-white font-bold rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                  style={{ backgroundColor: DASHBOARD_COLORS.scheduled }}
                >
                  <FilmStripIcon className="w-5 h-5 mr-2" style={{ color: DASHBOARD_COLORS.text }} />
                  Stop
                </button>
                
                {/* Separator */}
                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>
                
                {/* Time Display - Enhanced */}
                <div 
                  className="flex items-center space-x-4 px-4 py-3 rounded-xl border-2"
                  style={{ 
                    backgroundColor: DASHBOARD_COLORS.background,
                    borderColor: DASHBOARD_COLORS.scripting
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: isPlaying ? DASHBOARD_COLORS.published : DASHBOARD_COLORS.textSecondary,
                        animation: isPlaying ? 'pulse 2s infinite' : 'none'
                      }}
                    ></div>
                    <span 
                      className="text-sm font-bold"
                      style={{ color: isPlaying ? DASHBOARD_COLORS.published : DASHBOARD_COLORS.textSecondary }}
                    >
                      {isPlaying ? 'PLAYING' : 'READY'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 font-mono text-sm">
                    <Cog6ToothIcon className="w-4 h-4" style={{ color: DASHBOARD_COLORS.idea }} />
                    <span style={{ color: DASHBOARD_COLORS.text }}>{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, '0')}</span>
                    <span style={{ color: DASHBOARD_COLORS.textSecondary }}>/</span>
                    <span style={{ color: DASHBOARD_COLORS.textSecondary }}>{Math.floor(duration / 60)}:{(duration % 60).toFixed(1).padStart(4, '0')}</span>
                  </div>
                </div>
              </div>

              {/* Right - Blueprint Status */}
              <div className="flex items-center space-x-2">
                {project?.script?.scenes && project.script.scenes.length > 0 && (
                  <span 
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border-2"
                    style={{ 
                      backgroundColor: DASHBOARD_COLORS.scripting,
                      color: DASHBOARD_COLORS.text,
                      borderColor: DASHBOARD_COLORS.scripting
                    }}
                  >
                    <DocumentTextIcon className="w-3 h-3 mr-1" />
                    Script
                  </span>
                )}
                {project?.voiceoverUrls && Object.keys(project.voiceoverUrls).length > 0 && (
                  <span 
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border-2"
                    style={{ 
                      backgroundColor: DASHBOARD_COLORS.autopilot,
                      color: DASHBOARD_COLORS.text,
                      borderColor: DASHBOARD_COLORS.autopilot
                    }}
                  >
                    <MicrophoneIcon className="w-3 h-3 mr-1" />
                    Voice
                  </span>
                )}
                {project?.assets && Object.keys(project.assets).length > 0 && (
                  <span 
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border-2"
                    style={{ 
                      backgroundColor: DASHBOARD_COLORS.rendering,
                      color: DASHBOARD_COLORS.text,
                      borderColor: DASHBOARD_COLORS.rendering
                    }}
                  >
                    <VideoCameraIcon className="w-3 h-3 mr-1" />
                    Assets
                  </span>
                )}
                {project?.moodboard && project.moodboard.length > 0 && (
                  <span 
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border-2"
                    style={{ 
                      backgroundColor: DASHBOARD_COLORS.published,
                      color: DASHBOARD_COLORS.text,
                      borderColor: DASHBOARD_COLORS.published
                    }}
                  >
                    <ImageIcon className="w-3 h-3 mr-1" />
                    {project.moodboard.length} Images
                  </span>
                )}
              </div>
            </div>

            {/* Middle Row - Timeline Controls */}
            <div 
              className="flex justify-between items-center mb-6 p-4 rounded-xl border-2"
              style={{ 
                backgroundColor: DASHBOARD_COLORS.background,
                borderColor: DASHBOARD_COLORS.idea
              }}
            >
              {/* Left - Timeline Navigation */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-300 text-sm font-medium">Timeline:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => debouncedSeek(Math.max(0, currentTime - 5))}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    ⏪ 5s
                  </button>
                  <button
                    onClick={() => debouncedSeek(Math.max(0, currentTime - 1))}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    ⏮️ 1s
                  </button>
                  <button
                    onClick={() => debouncedSeek(Math.min(duration, currentTime + 1))}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    1s ⏭️
                  </button>
                  <button
                    onClick={() => debouncedSeek(Math.min(duration, currentTime + 5))}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    5s ⏩
                  </button>
                </div>
              </div>
              
              {/* Center - Zoom Controls */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-300 text-sm font-medium">Zoom:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => debouncedZoom(Math.max(timelineZoom / 1.2, 0.1))}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    🔍- Out
                  </button>
                  <span className="px-3 py-2 bg-gray-700 text-white text-xs font-bold rounded-lg min-w-[60px] text-center">
                    {Math.round(timelineZoom * 100)}%
                  </span>
                  <button
                    onClick={() => debouncedZoom(Math.min(timelineZoom * 1.2, 5))}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    🔍+ In
                  </button>
                </div>
              </div>
              
              {/* Right - Timeline Info */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-300 text-sm font-medium">Tracks:</span>
                <span className="inline-flex items-center px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm font-semibold rounded-full border border-emerald-500/20">
                  {loadedAssetsCount} loaded
                </span>
              </div>
            </div>

            {/* Bottom Row - Asset Tools */}
            <div className="flex flex-wrap gap-4">
              {/* Basic Assets */}
              <div className="flex items-center space-x-3 px-4 py-3 bg-gray-800 rounded-xl border border-gray-700">
                <span className="text-gray-300 text-sm font-medium">Basic:</span>
                <div className="flex items-center space-x-2">
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
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
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
                            fill: { color: '#4F46E5', opacity: 0.8 }
                          },
                          start: 0,
                          length: 5
                        });
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    🔷 Shape
                  </button>
                </div>
              </div>

              {/* AI Generation */}
              <div className="flex items-center space-x-3 px-4 py-3 bg-gray-800 rounded-xl border border-gray-700">
                <span className="text-gray-300 text-sm font-medium">AI:</span>
                <div className="flex items-center space-x-2">
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    🎤 Voice
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    🖼️ Image
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    🎬 Video
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 px-4 py-3 bg-gray-800 rounded-xl border border-gray-700">
                <span className="text-gray-300 text-sm font-medium">Actions:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={addSampleClip}
                    className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                    style={{ backgroundColor: DASHBOARD_COLORS.scheduled }}
                  >
                    <BeakerIcon className="w-4 h-4 mr-2 inline" />
                    Sample
                  </button>
                  <button
                    onClick={() => {
                      if (editRef.current) {
                        editRef.current.clearTracks();
                      }
                    }}
                    className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                    style={{ backgroundColor: DASHBOARD_COLORS.failed }}
                  >
                    <FailedIcon className="w-4 h-4 mr-2 inline" />
                    Clear
                  </button>
                  <button
                    onClick={handleVideoRender}
                    disabled={isRendering}
                    className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg ${
                      isRendering ? 'cursor-not-allowed' : ''
                    }`}
                    style={{ 
                      backgroundColor: isRendering ? DASHBOARD_COLORS.textSecondary : DASHBOARD_COLORS.published
                    }}
                  >
                    {isRendering ? (
                      <>
                        <RenderingIcon className="w-4 h-4 mr-2 inline animate-spin" />
                        Rendering...
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2 inline" />
                        Export Video
                      </>
                    )}
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
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    ⚙️ Properties
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas - Always render for ref callbacks */}
        <div className="relative">
          <div
            ref={canvasRefCallback}
            data-shotstack-studio
            className={`w-full bg-gray-900 rounded-2xl min-h-[60vh] max-h-[70vh] border-2 border-gray-700 shadow-2xl overflow-hidden transition-all duration-300 ${
              isLoading ? 'opacity-30' : 'opacity-100'
            }`}
            style={{
              background: `
                linear-gradient(90deg, transparent 0%, transparent 49%, rgba(55, 65, 81, 0.1) 50%, rgba(55, 65, 81, 0.1) 51%, transparent 52%, transparent 100%),
                linear-gradient(0deg, transparent 0%, transparent 49%, rgba(55, 65, 81, 0.1) 50%, rgba(55, 65, 81, 0.1) 51%, transparent 52%, transparent 100%),
                #111827
              `,
              backgroundSize: '40px 40px, 40px 40px, 100% 100%'
            }}
          />
          
          {/* Canvas Overlay Info */}
          {!isLoading && (
            <div 
              className="absolute top-4 left-4 backdrop-blur-sm px-4 py-2 rounded-xl border-2"
              style={{ 
                backgroundColor: DASHBOARD_COLORS.card,
                borderColor: DASHBOARD_COLORS.published
              }}
            >
              <div className="flex items-center space-x-2 text-sm" style={{ color: DASHBOARD_COLORS.text }}>
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: DASHBOARD_COLORS.published }}
                ></div>
                <span>Video Canvas Ready</span>
              </div>
            </div>
          )}
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
    </div>
  );
};

export default FinalShotstackStudio;
