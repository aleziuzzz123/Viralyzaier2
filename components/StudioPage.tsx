import React, { useEffect, useState, useCallback } from 'react';
import { Edit, Canvas, Controls, Timeline } from "@shotstack/shotstack-studio";

const StudioPage: React.FC = () => {
  const [edit, setEdit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    if (initialized) return; // Prevent double initialization

    const initializeEditor = async () => {
      try {
        setIsLoading(true);
        setInitialized(true);

        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // 1. Retrieve an edit from a template
        const templateUrl = "https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json";
        const response = await fetch(templateUrl);
        if (!response.ok) throw new Error(`Failed to fetch template: ${response.statusText}`);
        const template = await response.json();

        // 2. Initialize the edit with dimensions and background color
        const edit = new Edit(template.output.size, template.timeline.background);
        await edit.load();

        // 3. Create a canvas to display the edit
        const canvas = new Canvas(template.output.size, edit);
        await canvas.load(); // Renders to [data-shotstack-studio] element

        // 4. Load the template
        await edit.loadEdit(template);

        // 5. Add keyboard controls
        const controls = new Controls(edit);
        await controls.load();

        // 6. Add timeline for visual editing
        const timeline = new Timeline(edit, {
          width: template.output.size.width,
          height: 300
        });
        await timeline.load(); // Renders to [data-shotstack-timeline] element

        // Set up event listeners
        edit.events.on("clip:selected", (data: any) => {
          console.log("Clip selected:", data);
        });

        edit.events.on("clip:updated", (data: any) => {
          console.log("Clip updated:", data);
        });

        setEdit(edit);
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

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '5px',
          border: '1px solid #f5c6cb'
        }}>
          <h3>Error Loading Video Editor</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{color: 'white', marginBottom: '1rem'}}>Creative Studio</h1>
      
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '50px', color: '#9CA3AF' }}>
          Starting Editor...
        </div>
      )}

      <div data-shotstack-studio style={{minHeight: '420px'}}></div>
      <div data-shotstack-timeline style={{minHeight: '300px'}}></div>
    </div>
  );
};

export default StudioPage;
