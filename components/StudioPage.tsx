import React, { useEffect, useRef, useState } from 'react';
import { Edit, Canvas, Controls, Timeline, VideoExporter } from "@shotstack/shotstack-studio";
import { Project, ShotstackClipSelection } from '../types';
import TopInspectorPanel from './TopInspectorPanel';
import EditorToolbar from './EditorToolbar';
import HelpModal from './HelpModal';

export default function StudioPage() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const executionLock = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [initialized, setInitialized] = useState(false);
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
  
  const aic_lockAndExecute = async <T,>(asyncFunction: () => Promise<T>): Promise<T | undefined> => {
      if (executionLock.current) {
          aic_addToast('Another AI process is already running. Please wait.', 'info');
          return;
      }
      executionLock.current = true;
      try {
          return await asyncFunction();
      } catch (error) {
          aic_addToast(error instanceof Error ? error.message : 'An AI operation failed', 'error');
      } finally {
          executionLock.current = false;
      }
  };

  // --- Clip Management ---
  const addClip = (assetType: 'video' | 'image' | 'audio' | 'sticker', url: string) => {
    if (!editorRef.current) return;
    const edit = editorRef.current;
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
    if (!editorRef.current) return;
    editorRef.current.removeClip(trackIndex, clipIndex);
    setSelection(null);
  };
  
  const handleRender = () => {
      if (!editorRef.current) return;
      const finalJson = editorRef.current.getEdit();
      postToParent('studio:save_project', finalJson);
  }

  // --- Editor Initialization and Communication ---
  useEffect(() => {
    if (initialized) return; // Prevent double initialization

    const initializeEditor = async () => {
      try {
        console.log('🚀 Starting StudioPage initialization...');
        setIsLoading(true);
        setInitialized(true);
        setDebugInfo('Initializing...');

        // Test Shotstack SDK import first
        console.log('🧪 Testing Shotstack SDK import...');
        try {
          console.log('📦 Edit component:', typeof Edit);
          console.log('📦 Canvas component:', typeof Canvas);
          console.log('📦 Controls component:', typeof Controls);
          console.log('📦 Timeline component:', typeof Timeline);
          console.log('📦 VideoExporter component:', typeof VideoExporter);
          
          if (typeof Edit !== 'function') {
            throw new Error('Edit component not available');
          }
          if (typeof Canvas !== 'function') {
            throw new Error('Canvas component not available');
          }
          if (typeof Controls !== 'function') {
            throw new Error('Controls component not available');
          }
          if (typeof Timeline !== 'function') {
            throw new Error('Timeline component not available');
          }
          console.log('✅ Shotstack SDK components loaded successfully');
        } catch (sdkError) {
          console.error('❌ Shotstack SDK import failed:', sdkError);
          throw new Error(`Shotstack SDK not available: ${sdkError.message}`);
        }

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
              setErr("No project data received from the main application.");
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
              shotstackEditJson: {
                timeline: { 
                  background: "#000000", 
                  tracks: [ 
                    { clips: [] }, 
                    { clips: [] }, 
                    { clips: [] } 
                  ]
                },
                output: { 
                  format: 'mp4', 
                  size: { width: 1280, height: 720 }
                }
              },
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
            setDebugInfo('Waiting for DOM elements...');
            
            // Wait for DOM elements to be ready
            for (let i = 0; i < 120; i++) {
              const c = canvasHostRef.current;
              const t = timelineHostRef.current;
              console.log(`🔍 DOM check ${i}: canvas=${!!c}, timeline=${!!t}, canvasWidth=${c?.clientWidth}`);
              if (c && t && c.clientWidth >= 1) break;
              await new Promise(r => requestAnimationFrame(r));
            }

            const c = canvasHostRef.current;
            const t = timelineHostRef.current;
            if (!c || !t) {
              throw new Error(`DOM elements not ready: canvas=${!!c}, timeline=${!!t}`);
            }

            console.log('✅ DOM elements ready, initializing Shotstack...');
            console.log('🔍 Canvas element:', c);
            console.log('🔍 Timeline element:', t);
            console.log('🔍 Canvas data attributes:', c.getAttribute('data-shotstack-studio'));
            console.log('🔍 Timeline data attributes:', t.getAttribute('data-shotstack-timeline'));
            setDebugInfo('Initializing Shotstack SDK...');

            const initialState = projectData.shotstackEditJson || {
              timeline: { background: "#000000", tracks: [ { clips: [] }, { clips: [] }, { clips: [] } ]},
              output: { format: 'mp4', size: { width: 1280, height: 720 }}
            };
            const size = initialState.output.size;
            const backgroundColor = initialState.timeline.background || "#000000";

            console.log('📐 Size:', size, 'Background:', backgroundColor);

            // 1. Initialize the edit with dimensions and background color
            console.log('🔧 Creating Edit component...');
            const edit = new Edit(size, backgroundColor);
            await edit.load();
            editorRef.current = edit;
            console.log('✅ Edit component loaded');

            // 2. Create a canvas to display the edit
            console.log('🎨 Creating Canvas component...');
            const canvas = new Canvas(size, edit);
            await canvas.load(); // Renders to [data-shotstack-studio] element
            console.log('✅ Canvas component loaded');

            // 3. Load the template
            console.log('📄 Loading edit template...');
            await edit.loadEdit(initialState);
            console.log('✅ Edit template loaded');
            
            // 4. Add keyboard controls
            console.log('⌨️ Creating Controls component...');
            const controls = new Controls(edit);
            await controls.load();
            console.log('✅ Controls component loaded');

            // 5. Add timeline for visual editing
            console.log('📊 Creating Timeline component...');
            const timeline = new Timeline(edit, {
              width: size.width,
              height: 300
            });
            await timeline.load(); // Renders to [data-shotstack-timeline] element
            console.log('✅ Timeline component loaded');

            // Setup event listeners
            if (edit?.events?.on) {
              edit.events.on("clip:selected", (sel: ShotstackClipSelection) => {
                console.log('🎯 Clip selected:', sel);
                setSelection(sel);
              });
              edit.events.on("clip:deselected", () => {
                console.log('🎯 Clip deselected');
                setSelection(null);
              });
            }

            // Add a test clip to make the canvas visible
            console.log('🎬 Adding test clip to make canvas visible...');
            try {
              // Use a different test asset that should be accessible
              edit.addClip(0, {
                asset: {
                  type: 'video',
                  src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                },
                start: 0,
                length: 5,
                fit: 'cover'
              });
              console.log('✅ Test clip added successfully');
            } catch (clipError) {
              console.warn('⚠️ Could not add test clip:', clipError);
              // Try with a simple color background instead
              try {
                edit.addClip(0, {
                  asset: {
                    type: 'image',
                    src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMzM2NkZGIi8+Cjx0ZXh0IHg9IjY0MCIgeT0iMzYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VmlkZW8gRWRpdG9yPC90ZXh0Pgo8L3N2Zz4K'
                  },
                  start: 0,
                  length: 10,
                  fit: 'cover'
                });
                console.log('✅ Test color background added successfully');
              } catch (colorError) {
                console.warn('⚠️ Could not add color background:', colorError);
              }
            }

            console.log('🎉 Studio initialization complete!');
            setDebugInfo('Studio ready!');
            setIsLoading(false);
          } catch (e: any) {
            console.error('❌ Boot error:', e);
            setErr(e?.message ?? String(e));
            setDebugInfo(`Error: ${e?.message ?? String(e)}`);
            setIsLoading(false);
          }
        };

        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } catch (err) {
        console.error('Failed to initialize video editor:', err);
        setErr(err instanceof Error ? err.message : 'Unknown error occurred');
        setDebugInfo(`Init error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setInitialized(false); // Reset on error
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [initialized]);

  if (err) {
    return (
      <div className="p-4 rounded-lg bg-red-900/50 border border-red-500/50 text-red-300">
        <strong>Creative Studio failed:</strong> {err}
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
        {selection && editorRef.current && (
          <TopInspectorPanel
            selection={selection}
            edit={editorRef.current}
            onDeleteClip={deleteClip}
          />
        )}
      </div>

      <div className="flex-grow relative min-h-0">
        <div 
          ref={canvasHostRef} 
          data-shotstack-studio 
          className="w-full h-full bg-black rounded-lg" 
          style={{ minHeight: '400px' }}
        />
      </div>

      <div 
        ref={timelineHostRef} 
        data-shotstack-timeline 
        className="w-full h-80 bg-gray-800 rounded-lg" 
        style={{ minHeight: '300px' }}
      />

      <EditorToolbar 
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (isPlaying) {
            editorRef.current?.pause();
          } else {
            editorRef.current?.play();
          }
        }}
        onStop={() => editorRef.current?.stop()}
        onUndo={() => editorRef.current?.undo()}
        onRedo={() => editorRef.current?.redo()}
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