// This import is for side-effects only and is critical for audio support.
// It MUST come before any other Shotstack Studio imports.
import '@pixi/sound';

import { Edit, Canvas, Controls, Timeline } from '@shotstack/shotstack-studio';

// --- Asset Proxying Logic ---
// This is necessary to avoid CORS errors when loading assets from external domains.
const supabaseUrl = (window as any).ENV?.VITE_SUPABASE_URL;

const createAssetProxyUrl = (url?: string | null): string => {
  if (!url || !/^https?:\/\//i.test(url) || !supabaseUrl) return url || '';
  // Avoid re-proxying an already proxied URL
  if (url.includes('/functions/v1/asset-proxy')) return url;

  const base = `${supabaseUrl}/functions/v1/asset-proxy`;
  let file = 'file';
  try {
    // Extract a clean filename for the Content-Disposition header
    file = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'file');
  } catch {}
  
  // Use a query parameter-based proxy to simplify server parsing
  return `${base}?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(file)}`;
};

function proxyifyEdit(editJson: any): any {
    if (!editJson || typeof editJson !== 'object') return editJson;
    const newEditJson = JSON.parse(JSON.stringify(editJson));
    const tracks = newEditJson?.timeline?.tracks || [];
    for (const track of tracks) {
        if (!track.clips || !Array.isArray(track.clips)) continue;
        for (const clip of track.clips) {
            const asset = clip?.asset;
            if (asset?.src && typeof asset.src === 'string') {
                asset.src = createAssetProxyUrl(asset.src);
            }
        }
    }
    return newEditJson;
}


// --- Main async function to initialize the editor ---
(async () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorIndicator = document.getElementById('error-indicator');
  const studioEl = document.querySelector<HTMLElement>('[data-shotstack-studio]');
  const timelineEl = document.querySelector<HTMLElement>('[data-shotstack-timeline]');
  const controlsEl = document.querySelector<HTMLElement>('[data-shotstack-controls]');
  
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
    if (!studioEl || !timelineEl || !controlsEl) {
        throw new Error("DOM mount points '[data-shotstack-studio]', '[data-shotstack-timeline]', or '[data-shotstack-controls]' not found.");
    }
    
    // 2. Fetch a simple template to load
    const res = await fetch('https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json');
    if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
    const rawTemplate = await res.json();
    
    // 3. Proxy all asset URLs within the template to avoid CORS issues
    const template = proxyifyEdit(rawTemplate);

    // 4. Create and load the core Edit instance and other components
    const edit = new Edit(template.output.size, template.timeline.background);
    await edit.load();
    
    const canvas = new Canvas(template.output.size, edit);
    await canvas.load();
    studioEl.appendChild((canvas as any).view);

    await edit.loadEdit(template);

    const controls = new Controls(edit);
    await controls.load();
    controlsEl.appendChild((controls as any).view);

    const timeline = new Timeline(edit, { 
        width: timelineEl.clientWidth, 
        height: timelineEl.clientHeight || 300 
    });
    await timeline.load();
    timelineEl.appendChild((timeline as any).view);
    
    // Hide loading indicator on success
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
  }
})();
