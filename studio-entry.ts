import { Edit, Canvas, Controls, Timeline } from '@shotstack/shotstack-studio';

(async () => {
  try {
    const res = await fetch('https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json');
    const template = await res.json();

    const edit = new Edit(template.output.size, template.timeline.background);
    await edit.load();

    const canvas = new Canvas(edit, { mount: document.querySelector('[data-shotstack-studio]')! });
    await canvas.load();

    await edit.loadEdit(template);

    const controls = new Controls(edit);
    await controls.load();

    const timeline = new Timeline(edit, { width: template.output.size.width, height: 300 });
    await timeline.load();
    timeline.mount(document.querySelector('[data-shotstack-timeline]')!);

    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

  } catch (e) {
    const errorEl = document.getElementById('error-indicator');
    if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = `Failed to load studio: ${e instanceof Error ? e.message : String(e)}`;
    }
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
  }
})();
