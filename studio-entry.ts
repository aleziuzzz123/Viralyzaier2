import { Edit, Canvas, Controls, Timeline } from '@shotstack/shotstack-studio';
// This import is for side-effects only and is critical for audio support.
import '@pixi/sound';

(async () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorEl = document.getElementById('error-indicator');
  
  try {
    const res = await fetch('https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json');
    if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
    const template = await res.json();

    const edit = new Edit(template.output.size);
    await edit.load();
    
    // Corrected Canvas initialization
    const canvas = new Canvas(document.querySelector('[data-shotstack-studio]')!, edit);
    await canvas.load();

    await edit.loadEdit(template);

    const controls = new Controls(edit);
    await controls.load();

    // Corrected Timeline initialization
    const timeline = new Timeline(document.querySelector('[data-shotstack-timeline]')!, edit);
    await timeline.load();

    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

  } catch (e) {
    if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = `Failed to load studio: ${e instanceof Error ? e.message : String(e)}`;
    }
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
  }
})();
