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

        // 6. Add timeline for visual editing
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
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 gap-4">
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
      <div className="flex items-center justify-center gap-4 p-4 bg-gray-800 rounded-lg">
        <button
          onClick={() => edit?.play()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          disabled={!edit}
        >
          ▶️ Play
        </button>
        <button
          onClick={() => edit?.pause()}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white"
          disabled={!edit}
        >
          ⏸️ Pause
        </button>
        <button
          onClick={() => edit?.stop()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
          disabled={!edit}
        >
          ⏹️ Stop
        </button>
        <button
          onClick={addSampleClip}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
          disabled={!edit}
        >
          ➕ Add Sample Video
        </button>
        <div className="text-sm text-gray-400">
          Status: {isPlaying ? 'Playing' : 'Paused'}
        </div>
      </div>

      {/* Video Canvas */}
      <div className="flex-grow relative min-h-0">
        <div 
          data-shotstack-studio 
          className="w-full h-full bg-black rounded-lg border-2 border-gray-600" 
          style={{ minHeight: '400px' }}
        />
      </div>
      
      {/* Timeline */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Timeline</h3>
        <div 
          data-shotstack-timeline 
          className="w-full bg-gray-900 rounded border-2 border-gray-600" 
          style={{ height: '200px', minHeight: '200px' }}
        />
      </div>
    </div>
  );
};

export default StudioPage;