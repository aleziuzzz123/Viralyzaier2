// A robust utility to extract a readable message from any error type.
import { supabaseUrl } from './services/supabaseClient';

export const getErrorMessage = (error: unknown): string => {
    // Default fallback message
    const fallbackMessage = 'An unknown error occurred. Please check the console for details.';

    if (!error) {
        return fallbackMessage;
    }

    // Handle Supabase/Postgrest errors (which are objects, not Error instances)
    if (typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        const err = error as { message: string; details?: string; hint?: string };
        let fullMessage = err.message;
        if (err.details) {
            fullMessage += ` Details: ${err.details}`;
        }
        if (err.hint) {
            fullMessage += ` Hint: ${err.hint}`;
        }
        return fullMessage;
    }

    // Handle standard JavaScript Error objects
    if (error instanceof Error) {
        return error.message;
    }

    // Handle strings
    if (typeof error === 'string' && error.length > 0) {
        return error;
    }
    
    // As a last resort, try to stringify the object
    try {
        const str = JSON.stringify(error);
        if (str !== '{}') {
            return str;
        }
    } catch {
        // Fall through to the default fallback if stringify fails
    }

    return fallbackMessage;
};

// Converts a base64 string to a Blob object, which is safer for uploads.
export const base64ToBlob = (base64: string, contentType: string = ''): Blob => {
    // Handle data URL format (e.g., "data:image/jpeg;base64,...")
    if (base64.includes(',')) {
        const parts = base64.split(',');
        const mimeType = parts[0].match(/:(.*?);/)?.[1];
        base64 = parts[1];
        if (mimeType && !contentType) {
            contentType = mimeType;
        }
    }
    
    try {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    } catch (e) {
        console.error("Failed to decode base64 string. It might be corrupted or not properly formatted.", e);
        throw new Error("Invalid base64 string provided for blob conversion.");
    }
};

// --- URL Hygiene ---
/**
 * Creates a proxied URL for an external asset to bypass CORS issues.
 * This version uses a query parameter-based structure for cleaner parsing on the server.
 * @param url The direct URL to the asset.
 * @returns An absolute URL that routes through the `asset-proxy` edge function.
 */
export const createAssetProxyUrl = (url?: string | null): string => {
  if (!url || !/^https?:\/\//i.test(url)) return url || '';
  if (url.includes('/functions/v1/asset-proxy')) return url; // Idempotent
  
  // If the asset is already hosted on our own Supabase storage, don't proxy it.
  // This assumes the bucket is public with correct CORS settings.
  if (supabaseUrl && url.startsWith(supabaseUrl)) {
      return url;
  }

  const base = `${supabaseUrl}/functions/v1/asset-proxy`;
  let file = 'file';
  try {
    file = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'file');
  } catch {}
  // Use QUERY shape to avoid double filename bugs and simplify server parsing
  return `${base}?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(file)}`;
};


/**
 * Normalizes a URL by trimming whitespace and decoding any proxy wrapping.
 * This is the reverse of `createAssetProxyUrl`.
 */
export const normalizeUrl = (u: string | null | undefined): string => {
    if (!u) return '';
    const trimmed = u.trim();

    // New query-based proxy format
    if (trimmed.includes('/functions/v1/asset-proxy?')) {
        try {
            const urlObj = new URL(trimmed);
            const targetUrl = urlObj.searchParams.get('url');
            if (targetUrl) return decodeURIComponent(targetUrl);
        } catch (e) {
            console.error('Failed to parse proxied URL query:', trimmed, e);
            return '';
        }
    }
    
    // Legacy path-based proxy format for backward compatibility
    const proxyPrefix = '/asset-proxy/';
    const proxyIndex = trimmed.indexOf(proxyPrefix);
    if (proxyIndex > -1) {
        try {
            const encodedPart = trimmed.substring(proxyIndex + proxyPrefix.length);
            const encodedUrl = encodedPart.split('/')[0];
            return decodeURIComponent(encodedUrl);
        } catch (e) {
            console.error('Failed to decode legacy proxied URL path:', trimmed, e);
            return '';
        }
    }

    return trimmed;
};


// --- IndexedDB Cache Utilities ---

const DB_NAME = 'ViralyzerDB';
const DB_VERSION = 1;
const STORE_NAME = 'timelineCache';

let db: IDBDatabase | null = null;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error("Failed to open IndexedDB."));
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveTimelineToCache = async (projectId: string, timeline: any): Promise<void> => {
  try {
    const dbInstance = await getDB();
    const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(JSON.parse(JSON.stringify(timeline)), projectId); // Ensure data is cloneable
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Failed to save timeline to cache.'));
    });
  } catch (error) {
    console.error("IndexedDB save error:", error);
  }
};

export const loadTimelineFromCache = async (projectId: string): Promise<any | null> => {
  try {
    const dbInstance = await getDB();
    const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(projectId);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
            console.error("IndexedDB load error:", request.error);
            reject(new Error('Failed to load timeline from cache.'));
        };
    });
  } catch (error) {
    console.error("IndexedDB setup error:", error);
    return null;
  }
};

// --- Shotstack Studio JSON Sanitizer ---
const isObj = (v: any): v is Record<string, any> => v && typeof v === 'object' && !Array.isArray(v);

function anyColorToHex(v: any): string | null {
  if (typeof v === 'string') {
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim())) return v.trim().toUpperCase();
    return null;
  }
  if (isObj(v)) {
    if (typeof v.hex === 'string') return anyColorToHex(v.hex);
    if (typeof v.r === 'number' && typeof v.g === 'number' && typeof v.b === 'number') {
      const toHexPart = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
      return `#${toHexPart(v.r)}${toHexPart(v.g)}${toHexPart(v.b)}`.toUpperCase();
    }
  }
  return null;
}

function normalizeAsset(asset: any): Record<string, any> | undefined {
  if (!isObj(asset)) return undefined;

  const out: Record<string, any> = { ...asset };
  let type = asset.type;
  if (type === 'title') type = 'text';

  if (typeof type !== 'string') {
    if (typeof asset.text === 'string') type = 'text';
    else if (typeof asset.html === 'string') type = 'html';
    else if (typeof asset.src === 'string' && (asset.src.includes('.mp3') || asset.src.includes('/audio'))) type = 'audio';
    else if (typeof asset.src === 'string' && (asset.src.includes('.mp4') || asset.src.includes('/video'))) type = 'video';
    else if (typeof asset.src === 'string') type = 'image';
    else if (asset.shape) type = 'shape';
    else return undefined;
  }
  out.type = type;

  switch (type) {
    case 'text':
      out.text = String(asset.text ?? '');
      if (asset.color) {
        out.color = anyColorToHex(asset.color) || '#FFFFFF';
      }
      if ('background' in out) {
        const bgColor = anyColorToHex(out.background);
        if (bgColor) {
           out.background = bgColor;
        } else {
           delete out.background;
        }
      }
      break;
    case 'image': case 'video': case 'audio': case 'luma':
      if (typeof asset.src !== 'string' || !asset.src.trim()) return undefined;
      out.src = asset.src;
      if (typeof asset.volume === 'number' && (type === 'audio' || type === 'video')) {
        out.volume = asset.volume;
      }
      break;
    case 'shape':
      if (!['rectangle', 'circle', 'line'].includes(asset.shape)) return undefined;
      out.shape = asset.shape;
      let shapeBgColor = anyColorToHex(asset.background) || '#FFFFFF';
      out.background = { color: shapeBgColor, opacity: 1 };
      break;
    case 'html':
      out.html = String(asset.html ?? '<div></div>');
      out.css = String(asset.css ?? '');
      break;
    default: return undefined;
  }
  return out;
}

function normalizeEffect(effect: any): string | undefined {
    if (effect == null) return undefined;
    if (typeof effect === "string" && effect.trim()) return effect;
    if (isObj(effect) && typeof effect.value === "string") return effect.value;
    return undefined;
}

export function sanitizeShotstackJson(project: any): any | null {
  if (!project || typeof project !== 'object') return null;
  const copy = JSON.parse(JSON.stringify(project));
  if (!isObj(copy.timeline)) {
    copy.timeline = {};
  }
  
  copy.timeline.background = anyColorToHex(copy.timeline.background) || '#000000';

  if (!Array.isArray(copy.timeline.tracks)) {
    copy.timeline.tracks = [];
    return copy;
  }

  copy.timeline.tracks = copy.timeline.tracks.map((track: any) => {
    if (!isObj(track) || !Array.isArray(track.clips)) return { ...track, clips: [] };
    const clips = track.clips.map((clip: any) => {
        if (!isObj(clip)) return null;
        const c: Record<string, any> = { ...clip };
        const normalizedEffect = normalizeEffect(c.effect);
        if (normalizedEffect) c.effect = normalizedEffect; else delete c.effect;
        c.asset = normalizeAsset(c.asset);
        if (!c.asset) return null;
        c.start = typeof c.start === 'number' ? c.start : 0;
        c.length = typeof c.length === 'number' && c.length > 0 ? c.length : 5;
        return c;
      }).filter(Boolean);
    return { ...track, clips };
  });
  
  if (isObj(copy.output) && isObj(copy.output.size)) {
    copy.output.size.width = Number(copy.output.size.width) || 1080;
    copy.output.size.height = Number(copy.output.size.height) || 1920;
  } else {
    copy.output = { ...(copy.output || {}), size: { width: 1080, height: 1920 } };
  }
  
  return copy;
}

export function proxyifyEdit(editJson: any): any {
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

/**
 * Reverts proxied URLs in an edit JSON back to their original, direct URLs.
 * This is crucial before sending the JSON to the Shotstack Render API.
 */
export function deproxyifyEdit(editJson: any): any {
    if (!editJson || typeof editJson !== 'object') return editJson;
    
    const newEditJson = JSON.parse(JSON.stringify(editJson));
    const tracks = newEditJson?.timeline?.tracks || [];

    for (const track of tracks) {
        if (!track.clips || !Array.isArray(track.clips)) continue;
        for (const clip of track.clips) {
            if (clip?.asset?.src) {
                // Use the universal normalizeUrl function which handles all proxy formats
                clip.asset.src = normalizeUrl(clip.asset.src);
            }
        }
    }
    return newEditJson;
}