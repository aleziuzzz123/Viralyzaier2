import React, { useEffect, useState, useCallback } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";
import { Project, ShotstackClipSelection } from '../types';
import TopInspectorPanel from './TopInspectorPanel';
import EditorToolbar from './EditorToolbar';
import HelpModal from './HelpModal';

export default function StudioPage() {
  const [edit, setEdit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [project, setProject] = useState<Project | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selection, setSelection] = useState<ShotstackClipSelection | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Parent Window Communication ---
  const postToParent = (type: string, payload?: any) => {
    console.log('📤 Posting to parent:', type, payload);
    if (window.parent !== window) {
      window.parent.postMessage({ type, payload }, '*');
    }
  };

  const aic_addToast = (message: string, type: 'success' | 'error' | 'info') => {
      postToParent('studio:addToast', { message, type });
  };

  // --- Clip Management ---
  const addClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
    if (!edit) return;
    const ms = edit.playbackTime ?? 0;
    const startSec = Math.max(0, ms / 1000);
    const defaultLen = (assetType === "audio" || assetType === 'video') ? 10 : 5;

    let trackIndex = 0;
    if (assetType === 'audio') trackIndex = 2;
    if (assetType === 'sticker') trackIndex = 1;

    edit.addClip(trackIndex, {
      asset: { type: assetType, src: url },
      start: startSec,
      length: defaultLen,
      transition: { in: "fade", out: "fade" }
    });
  };

  const deleteClip = (trackIndex: number, clipIndex: number) => {
    if (!edit) return;
    edit.deleteClip(trackIndex, clipIndex);
    setSelection(null);
  };
  
  const handleRender = () => {
      if (!edit) return;
      const finalJson = edit.getEdit();
      postToParent('studio:save_project', finalJson);
  }

  // --- Editor Initialization ---
  useEffect(() => {
    if (initialized) return; // Prevent double initialization

    const initializeEditor = async () => {
      try {
        console.log('🚀 Starting StudioPage initialization...');
        setIsLoading(true);
        setInitialized(true);
        setDebugInfo('Initializing...');

        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Wait for project data from parent with timeout
        let messageReceived = false;
        const handleMessage = (event: MessageEvent) => {
          console.log('📨 Received message:', event.data);
          if (event.data.type === 'app:load_project') {
            messageReceived = true;
            const projectData: Project = event.data.payload;
            console.log('📦 Project data received:', projectData);
            if (projectData) {
              setProject(projectData);
              setDebugInfo('Project loaded, booting editor...');
              boot(projectData);
            } else {
              setError("No project data received from the main application.");
              setDebugInfo('No project data');
            }
          }
        };

        window.addEventListener('message', handleMessage);
        console.log('📤 Sending studio:ready message');
        postToParent('studio:ready');

        // Fallback: if no message received within 5 seconds, create a test project
        setTimeout(() => {
          if (!messageReceived) {
            console.log('⏰ No project data received, creating test project...');
            const testProject: Project = {
              id: 'test-project',
              name: 'Test Project',
              userId: 'test-user',
              created_at: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              workflowStep: 3,
              shotstackEditJson: null, // Will use template instead
              script: null,
              title: 'Test Video',
              topic: 'Test video for debugging',
              platform: 'youtube_long',
              videoSize: '16:9',
              status: 'Idea',
              analysis: null,
              competitorAnalysis: null,
              moodboard: null,
              assets: {},
              soundDesign: null,
              launchPlan: null,
              performance: null,
              scheduledDate: null,
              publishedUrl: null,
              voiceoverVoiceId: null,
              lastPerformanceCheck: null
            };
            setProject(testProject);
            setDebugInfo('Test project created, booting editor...');
            boot(testProject);
          }
        }, 5000);

        const boot = async (projectData: Project) => {
          try {
            console.log('🔧 Booting editor with project:', projectData);
            setDebugInfo('Loading template...');

            // 1. Retrieve an edit from a template (following official docs)
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
              setSelection(data);
            });

            editInstance.events.on("clip:updated", (data: any) => {
              console.log("Clip updated:", data);
            });

            setEdit(editInstance);
            console.log('🎉 Studio initialization complete!');
            setDebugInfo('Studio ready!');
            setIsLoading(false);
          } catch (e: any) {
            console.error('❌ Boot error:', e);
            setError(e?.message ?? String(e));
            setDebugInfo(`Error: ${e?.message ?? String(e)}`);
            setIsLoading(false);
          }
        };

        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } catch (err) {
        console.error('Failed to initialize video editor:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setDebugInfo(`Init error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setInitialized(false); // Reset on error
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [initialized]);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-900/50 border border-red-500/50 text-red-300">
        <strong>Creative Studio failed:</strong> {error}
        {debugInfo && <div className="mt-2 text-sm text-red-400">Debug: {debugInfo}</div>}
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
            <p className="text-gray-400">{debugInfo}</p>
          </div>
        </div>
      )}
      
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${selection ? 'h-48' : 'h-0'}`}>
        {selection && edit && (
          <TopInspectorPanel
            selection={selection}
            edit={edit}
            onDeleteClip={deleteClip}
          />
        )}
      </div>

      <div className="flex-grow relative min-h-0">
        <div 
          data-shotstack-studio 
          className="w-full h-full bg-black rounded-lg" 
          style={{ minHeight: '400px' }}
        />
      </div>

      <div 
        data-shotstack-timeline 
        className="w-full h-80 bg-gray-800 rounded-lg" 
        style={{ minHeight: '300px' }}
      />

      <EditorToolbar 
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (isPlaying) {
            edit?.pause();
          } else {
            edit?.play();
          }
        }}
        onStop={() => edit?.stop()}
        onUndo={() => edit?.undo()}
        onRedo={() => edit?.redo()}
        onAddMedia={() => setIsAssetModalOpen(true)}
        onAiPolish={() => aic_addToast('AI Polish coming soon!', 'info')}
        onRender={handleRender}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />

      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Add Media</h2>
              <button 
                onClick={() => setIsAssetModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Sample Assets</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      addClip('video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
                      setIsAssetModalOpen(false);
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                  >
                    Sample Video
                  </button>
                  <button
                    onClick={() => {
                      addClip('image', 'https://picsum.photos/1280/720');
                      setIsAssetModalOpen(false);
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                  >
                    Sample Image
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Upload Files</h3>
                <input
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      const type = file.type.startsWith('image/') ? 'image' : 
                                  file.type.startsWith('video/') ? 'video' : 'audio';
                      addClip(type, url);
                      setIsAssetModalOpen(false);
                    }
                  }}
                  className="w-full p-2 bg-gray-700 rounded text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isHelpModalOpen && (
        <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
        />
      )}
    </div>
  );
}