import React, { useEffect, useRef, useState } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";

const MinimalShotstackStudio: React.FC = () => {
  console.log('🎬 MinimalShotstackStudio component loaded!');
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>(null);

  useEffect(() => {
    const initializeStudio = async () => {
      try {
        console.log('🚀 Starting minimal Shotstack Studio initialization...');
        setIsLoading(true);

        // Wait a bit for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // 1. Load template
        console.log('📥 Loading template...');
        const templateUrl = "https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json";
        const response = await fetch(templateUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.status}`);
        }
        
        const template = await response.json();
        console.log('✅ Template loaded:', template);

        // 2. Create edit
        console.log('🔧 Creating Edit...');
        const editInstance = new Edit(template.output.size, template.timeline.background);
        await editInstance.load();
        console.log('✅ Edit created');

        // 3. Create canvas
        console.log('🎨 Creating Canvas...');
        const canvas = new Canvas(template.output.size, editInstance, { responsive: true });
        await canvas.load(canvasRef.current!);
        console.log('✅ Canvas created');

        // 4. Load template into edit
        console.log('📄 Loading template into edit...');
        await editInstance.loadEdit(template);
        console.log('✅ Template loaded into edit');

        // 5. Add controls
        console.log('⌨️ Adding Controls...');
        const controls = new Controls(editInstance);
        await controls.load();
        console.log('✅ Controls added');

        // 6. Add timeline
        console.log('📊 Adding Timeline...');
        const timeline = new Timeline(editInstance, {
          width: template.output.size.width,
          height: 300
        });
        await timeline.load();
        console.log('✅ Timeline added');

        setEdit(editInstance);
        setIsLoading(false);
        console.log('🎉 Minimal Shotstack Studio initialized successfully!');

      } catch (err) {
        console.error('❌ Failed to initialize Shotstack Studio:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    initializeStudio();
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
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
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
          <h1 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Minimal Shotstack Studio
          </h1>
        </div>
        <button
          onClick={() => window.close()}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Close
        </button>
      </div>

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
            ref={canvasRef}
            data-shotstack-studio
            style={{
              width: '100%',
              backgroundColor: '#000',
              borderRadius: '8px',
              minHeight: '60vh',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />

          {/* Timeline */}
          <div
            ref={timelineRef}
            data-shotstack-timeline
            style={{
              width: '100%',
              backgroundColor: '#1f2937',
              borderRadius: '8px',
              height: '300px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />

          {/* Success Message */}
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

export default MinimalShotstackStudio;
