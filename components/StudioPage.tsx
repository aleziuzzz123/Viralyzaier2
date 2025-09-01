import React, { useEffect, useState } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";

const StudioPage: React.FC = () => {
  const [edit, setEdit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (initialized) return; // Prevent double initialization

    const initializeEditor = async () => {
      try {
        console.log('🚀 Starting StudioPage initialization...');
        setIsLoading(true);
        setInitialized(true);

        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // 1. Retrieve an edit from a template
        const templateUrl = "https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json";
        console.log('📄 Fetching template from:', templateUrl);
        const response = await fetch(templateUrl);
        const template = await response.json();
        console.log('✅ Template loaded:', template);

        // 2. Initialize the edit with dimensions and background color
        console.log('🔧 Creating Edit component...');
        const editInstance = new Edit(template.output.size, template.timeline.background);
        await editInstance.load();
        console.log('✅ Edit component loaded');

        // 3. Create a canvas to display the edit
        console.log('🎨 Creating Canvas component...');
        const canvas = new Canvas(template.output.size, editInstance);
        await canvas.load(); // Renders to [data-shotstack-studio] element
        console.log('✅ Canvas component loaded');

        // 4. Load the template
        console.log('📄 Loading edit template...');
        await editInstance.loadEdit(template);
        console.log('✅ Edit template loaded');
        
        // 5. Add keyboard controls
        console.log('⌨️ Creating Controls component...');
        const controls = new Controls(editInstance);
        await controls.load();
        console.log('✅ Controls component loaded');

        // 6. Add timeline for visual editing
        console.log('📊 Creating Timeline component...');
        const timeline = new Timeline(editInstance, {
          width: template.output.size.width,
          height: 300
        });
        await timeline.load(); // Renders to [data-shotstack-timeline] element
        console.log('✅ Timeline component loaded');

        // Set up event listeners
        editInstance.events.on("clip:selected", (data: any) => {
          console.log("Clip selected:", data);
        });

        editInstance.events.on("clip:updated", (data: any) => {
          console.log("Clip updated:", data);
        });

        // Add play/pause event listeners
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
        setInitialized(false); // Reset on error
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [initialized]);

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