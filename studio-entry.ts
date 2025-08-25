// This import is for side-effects only and is critical for audio support.
// It MUST come before any other Shotstack Studio imports.
import '@pixi/sound';
import { Edit, Canvas, Controls, Timeline } from '@shotstack/shotstack-studio';

// Main async function to initialize the editor
(async () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorIndicator = document.getElementById('error-indicator');
  const studioEl = document.querySelector('[data-shotstack-studio]');
  const timelineEl = document.querySelector('[data-shotstack-timeline]');
  
  const showError = (message: string) => {
    if (errorIndicator) {
        errorIndicator.style.display = 'block';
        errorIndicator.textContent = `Failed to load studio: ${message}`;
    }
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    console.error(`Studio Load Error: ${message}`);
  };

  try {
    // 1. Ensure the mount points exist in the DOM
    if (!studioEl || !timelineEl) {
        throw new Error("DOM mount points '[data-shotstack-studio]' or '[data-shotstack-timeline]' not found.");
    }
    
    // 2. Fetch a simple template to load
    const res = await fetch('https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json');
    if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
    const template = await res.json();

    // 3. Create and load the core Edit instance FIRST
    const edit = new Edit(template.output.size, { background: template.timeline.background });
    await edit.load();
    await edit.loadEdit(template);
    
    // 4. Now, create and load the UI components that depend on the Edit instance
    const canvas = new Canvas(edit, studioEl as HTMLElement);
    const controls = new Controls(edit, studioEl as HTMLElement);
    const timeline = new Timeline(edit, timelineEl as HTMLElement);
    
    // 5. Load/mount the components to the DOM
    await Promise.all([
        canvas.load(),
        controls.load(),
        timeline.load(),
    ]);

    // Hide loading indicator on success
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
  }
})();