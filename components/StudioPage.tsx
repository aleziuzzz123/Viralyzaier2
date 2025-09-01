import React, { useEffect, useState } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";
import { Project, Script, Scene } from '../types';

const StudioPage: React.FC = () => {
  const [edit, setEdit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [projectData, setProjectData] = useState<Project | null>(null);

  // Listen for project data from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'app:load_project') {
        console.log('📦 Received project data:', event.data.payload);
        setProjectData(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify parent we're ready
    window.parent.postMessage({ type: 'studio:ready' }, '*');
    
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (initialized || !projectData) return;

    const initializeEditor = async () => {
      try {
        console.log('🚀 Starting StudioPage initialization with project:', projectData);
        setIsLoading(true);
        setInitialized(true);

        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create edit configuration from project data
        const editConfig = createEditFromProject(projectData);
        console.log('🔧 Created edit config:', editConfig);

        // 2. Initialize the edit with project dimensions
        console.log('🔧 Creating Edit component...');
        const editInstance = new Edit(editConfig.output.size, editConfig.timeline.background);
        await editInstance.load();
        console.log('✅ Edit component loaded');

        // 3. Create a canvas to display the edit
        console.log('🎨 Creating Canvas component...');
        const canvas = new Canvas(editConfig.output.size, editInstance);
        await canvas.load();
        console.log('✅ Canvas component loaded');

        // 4. Load the project edit
        console.log('📄 Loading project edit...');
        await editInstance.loadEdit(editConfig);
        console.log('✅ Project edit loaded');
        
        // 5. Add keyboard controls
        console.log('⌨️ Creating Controls component...');
        const controls = new Controls(editInstance);
        await controls.load();
        console.log('✅ Controls component loaded');

        // 6. Add timeline for visual editing (separate container)
        console.log('📊 Creating Timeline component...');
        const timeline = new Timeline(editInstance, {
          width: editConfig.output.size.width,
          height: 300
        });
        await timeline.load();
        console.log('✅ Timeline component loaded');

        // Set up event listeners
        editInstance.events.on("clip:selected", (data: any) => {
          console.log("Clip selected:", data);
        });

        editInstance.events.on("clip:updated", (data: any) => {
          console.log("Clip updated:", data);
        });

        editInstance.events.on("play", () => {
          console.log("Play event");
          setIsPlaying(true);
        });

        editInstance.events.on("pause", () => {
          console.log("Pause event");
          setIsPlaying(false);
        });

        setEdit(editInstance);
        console.log('🎉 Studio initialization complete!');
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize video editor:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setInitialized(false);
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [initialized, projectData]);

  // Function to create edit configuration from project data
  const createEditFromProject = (project: Project) => {
    const videoSize = project.videoSize === '16:9' ? { width: 1920, height: 1080 } : 
                     project.videoSize === '9:16' ? { width: 1080, height: 1920 } : 
                     { width: 1080, height: 1080 };

    const baseEdit = {
      output: {
        format: 'mp4',
        size: videoSize,
        fps: 30
      },
      timeline: {
        background: '#000000',
        tracks: []
      }
    };

    if (project.script && project.script.scenes) {
      // Add video tracks from script scenes
      project.script.scenes.forEach((scene: Scene, index: number) => {
        if (scene.storyboardImageUrl) {
          baseEdit.timeline.tracks.push({
            type: 'video',
            clips: [{
              asset: {
                type: 'image',
                src: scene.storyboardImageUrl
              },
              start: parseTimecode(scene.timecode).start,
              length: parseTimecode(scene.timecode).duration,
              fit: 'cover'
            }]
          });
        }
      });

      // Add audio tracks from voiceovers
      if (project.voiceoverUrls) {
        const audioTrack = {
          type: 'audio',
          clips: []
        };

        Object.entries(project.voiceoverUrls).forEach(([sceneIndex, voiceoverUrl]) => {
          const scene = project.script!.scenes[parseInt(sceneIndex)];
          if (scene) {
            audioTrack.clips.push({
              asset: {
                type: 'audio',
                src: voiceoverUrl
              },
              start: parseTimecode(scene.timecode).start,
              length: parseTimecode(scene.timecode).duration
            });
          }
        });

        if (audioTrack.clips.length > 0) {
          baseEdit.timeline.tracks.push(audioTrack);
        }
      }
    }

    return baseEdit;
  };

  // Helper function to parse timecode
  const parseTimecode = (timecode: string) => {
    const [start, end] = timecode.split('-').map(Number);
    return { start, end, duration: end - start };
  };

  const addSampleClip = () => {
    if (!edit) return;
    
    try {
      edit.addClip(0, {
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

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-900/50 border border-red-500/50 text-red-300">
        <strong>Creative Studio failed:</strong> {error}
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white">
      {/* Top Assets & Upload Bar - Compact */}
      <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 border-b border-gray-600/30 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Upload Section - Tiny & Theme-Matching */}
            <div className="flex items-center gap-1">
              <h3 className="text-xs text-gray-400">Import:</h3>
              <button className="flex items-center gap-1 px-2 py-1 bg-gray-800/60 hover:bg-indigo-600/20 text-gray-400 hover:text-indigo-300 text-xs rounded transition-colors border border-gray-700/50 hover:border-indigo-500/30">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Video</span>
              </button>
              <button className="flex items-center gap-1 px-2 py-1 bg-gray-800/60 hover:bg-emerald-600/20 text-gray-400 hover:text-emerald-300 text-xs rounded transition-colors border border-gray-700/50 hover:border-emerald-500/30">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Image</span>
              </button>
              <button className="flex items-center gap-1 px-2 py-1 bg-gray-800/60 hover:bg-purple-600/20 text-gray-400 hover:text-purple-300 text-xs rounded transition-colors border border-gray-700/50 hover:border-purple-500/30">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <span>Audio</span>
              </button>
            </div>
            
            {/* Project Assets */}
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">Assets:</h3>
              <div className="flex gap-2">
                {projectData?.moodboard?.map((imageUrl, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-600/30 rounded-lg hover:bg-gray-600/50 transition-colors cursor-pointer border border-gray-500/30">
                    <img src={imageUrl} alt={`Asset ${index + 1}`} className="w-10 h-8 object-cover rounded" />
                    <span className="text-xs text-gray-300">Scene {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Audio Tracks */}
            {projectData?.voiceoverUrls && Object.keys(projectData.voiceoverUrls).length > 0 && (
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">Audio:</h3>
                <div className="flex gap-2">
                  {Object.entries(projectData.voiceoverUrls).map(([sceneIndex, audioUrl]) => (
                    <div key={sceneIndex} className="flex items-center gap-2 p-2 bg-gray-600/30 rounded-lg hover:bg-gray-600/50 transition-colors cursor-pointer border border-gray-500/30">
                      <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                      <span className="text-xs text-gray-300">V{parseInt(sceneIndex) + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
        )}
      </div>

          {/* Tools */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white">Tools:</h3>
            <div className="flex gap-2">
              <button className="p-2 bg-indigo-600/30 hover:bg-indigo-600/50 rounded-lg transition-colors text-xs text-white border border-indigo-500/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button className="p-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg transition-colors text-xs text-white border border-purple-500/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                </svg>
              </button>
              <button className="p-2 bg-pink-600/30 hover:bg-pink-600/50 rounded-lg transition-colors text-xs text-white border border-pink-500/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded-lg transition-colors text-xs text-white border border-orange-500/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Editor Area - Full Width & Height */}
      <div className="flex-1 flex flex-col p-1 gap-2 min-h-0">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
            <h1 className="text-2xl font-bold mb-4">Starting Creative Studio...</h1>
            <p className="text-gray-400">Loading template...</p>
          </div>
      </div>
      )}
      
      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-6 p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl border border-gray-600/30 backdrop-blur-sm">
        <button
          onClick={() => edit?.play()}
          className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={!edit}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <span>Play</span>
        </button>
        
        <button
          onClick={() => edit?.pause()}
          className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={!edit}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
          <span>Pause</span>
        </button>
        
        <button
          onClick={() => edit?.stop()}
          className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={!edit}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
          <span>Stop</span>
        </button>
        
        <div className="w-px h-8 bg-gray-600"></div>
        
        <button
          onClick={addSampleClip}
          className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={!edit}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Sample Video</span>
        </button>
        
        <div className="w-px h-8 bg-gray-600"></div>
        
        <button
          onClick={() => edit?.undo()}
          className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={!edit}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>Undo</span>
        </button>
        
        <button
          onClick={() => edit?.redo()}
          className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={!edit}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
          <span>Redo</span>
        </button>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-sm font-medium text-gray-300">
            {isPlaying ? 'Playing' : 'Paused'}
          </span>
        </div>
      </div>
      
      {/* Video Canvas */}
      <div className="relative flex-shrink-0">
        <div className="relative">
          <div 
            data-shotstack-studio 
            className="w-full bg-gradient-to-br from-gray-900 to-black rounded-xl border border-indigo-500/30 shadow-lg" 
            style={{ height: '70vh' }}
          />
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-600/50">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>REC</span>
            </div>
          </div>
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-600/50">
            <div className="text-sm text-gray-300">
              <span className="font-mono">1920×1080</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline - Visible & Functional */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 rounded-lg p-2 border border-gray-600/30 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Timeline
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-indigo-500 rounded"></div>
              <span>Video Track</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded"></div>
              <span>Audio Track</span>
            </div>
          </div>
        </div>
        <div 
          data-shotstack-timeline 
          className="w-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-indigo-500/30 shadow-lg" 
          style={{ height: '25vh', minHeight: '200px' }}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4 w-full">
            <span>00:00</span>
            <div className="flex-1 h-px bg-gray-600"></div>
            <span>00:30</span>
            <div className="flex-1 h-px bg-gray-600"></div>
            <span>01:00</span>
            <div className="flex-1 h-px bg-gray-600"></div>
            <span>01:30</span>
            <div className="flex-1 h-px bg-gray-600"></div>
            <span>02:00</span>
            <div className="flex-1 h-px bg-gray-600"></div>
            <span>02:30</span>
            <div className="flex-1 h-px bg-gray-600"></div>
            <span>03:00</span>
            <div className="flex-1 h-px bg-gray-600"></div>
            <span>03:30</span>
            <div className="flex-1 h-px bg-gray-600"></div>
            <span>04:00</span>
          </div>
        </div>
        <div className="mt-1 text-center text-xs text-gray-500">
          Drag clips to edit • Double-click to select • Scroll horizontally for more
        </div>
      </div>
      </div>
    </div>
  );
};

export default StudioPage;