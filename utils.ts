// A robust utility to extract a readable message from any error type.
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
 * Normalizes a URL by trimming whitespace and decoding any accidental proxy wrapping.
 * Ensures that only clean, direct URLs are used in the application.
 */
export const normalizeUrl = (u: string | null | undefined): string => {
    if (!u) return '';
    const trimmed = u.trim();
    // Use regex to robustly find and decode the URL from a proxy wrapper.
    if (trimmed.includes('/asset-proxy?url=')) {
        try {
            return decodeURIComponent(trimmed.replace(/^.*\/asset-proxy\?url=/, ''));
        } catch (e) {
            console.error('Failed to decode proxied URL:', trimmed, e);
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
// Helper functions to sanitize Shotstack edit JSON before loading into the studio,
// preventing crashes due to schema mismatches (ZodErrors).

const isObj = (v: any): v is Record<string, any> => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Normalizes a clip's asset object to conform to the strict Shotstack SDK schema.
 * It rebuilds the asset from scratch, only including valid properties for its type.
 * This is the core fix for the ZodError crashes.
 * @param asset The potentially malformed asset object.
 * @returns A clean, valid asset object or undefined if the asset is unsalvageable.
 */
function normalizeAsset(asset: any): Record<string, any> | undefined {
  if (!isObj(asset)) return undefined;

  const out: Record<string, any> = {};

  // 1. Determine and validate the asset type
  let type = asset.type;
  if (type === 'title') type = 'text'; // Correct legacy type

  if (typeof type !== 'string') {
    if (typeof asset.text === 'string') type = 'text';
    else if (typeof asset.html === 'string') type = 'html';
    else if (typeof asset.src === 'string' && (asset.src.includes('.mp3') || asset.src.includes('/audio'))) type = 'audio';
    else if (typeof asset.src === 'string' && (asset.src.includes('.mp4') || asset.src.includes('/video'))) type = 'video';
    else if (typeof asset.src === 'string') type = 'image';
    else if (asset.shape) type = 'shape';
    else return undefined; // Cannot determine type, discard asset
  }
  out.type = type;

  // 2. Build the new, clean asset object based on the determined type
  switch (type) {
    case 'text':
      out.text = String(asset.text ?? '');
      if (asset.color && typeof asset.color === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(asset.color)) {
        out.color = asset.color;
      }
      // **CRITICAL FIX**: background must be an object with a valid color and opacity.
      if (asset.background) {
        let bgColor: string | undefined;
        if (typeof asset.background === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(asset.background)) {
          bgColor = asset.background;
        } else if (isObj(asset.background) && typeof asset.background.color === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(asset.background.color)) {
          bgColor = asset.background.color;
        }
        
        if (bgColor) {
            out.background = {
                color: bgColor,
                opacity: typeof asset.background.opacity === 'number' ? asset.background.opacity : 1,
            };
        }
      }
      break;

    case 'image':
    case 'video':
    case 'audio':
    case 'luma':
      if (typeof asset.src !== 'string' || !asset.src.trim()) return undefined;
      out.src = asset.src;
      if (typeof asset.volume === 'number' && (type === 'audio' || type === 'video')) {
        out.volume = asset.volume;
      }
      break;

    case 'shape':
      if (!['rectangle', 'circle', 'line'].includes(asset.shape)) return undefined;
      out.shape = asset.shape;
      // Shapes require a background color to be visible
      let shapeBgColor = '#FFFFFF'; // Default color
      if (asset.background) {
         if (typeof asset.background === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(asset.background)) {
          shapeBgColor = asset.background;
        } else if (isObj(asset.background) && typeof asset.background.color === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(asset.background.color)) {
          shapeBgColor = asset.background.color;
        }
      }
      out.background = { color: shapeBgColor, opacity: 1 };
      break;

    case 'html':
      out.html = String(asset.html ?? '<div></div>');
      out.css = String(asset.css ?? '');
      break;

    default:
      return undefined; // Unknown type, discard the asset
  }

  return out;
}

function normalizeEffect(effect: any): string | undefined {
    if (effect == null) return undefined;
    if (typeof effect === "string" && effect.trim()) return effect;
    if (isObj(effect) && typeof effect.value === "string") return effect.value;
    return undefined; // Discard other complex object formats
}

export function sanitizeShotstackJson(project: any): any | null {
  if (!project || typeof project !== 'object') return null;

  const copy = JSON.parse(JSON.stringify(project));

  if (!isObj(copy.timeline) || !Array.isArray(copy.timeline.tracks)) {
    return copy;
  }

  copy.timeline.tracks = copy.timeline.tracks.map((track: any) => {
    if (!isObj(track) || !Array.isArray(track.clips)) {
      return { ...track, clips: [] };
    }
    const clips = track.clips
      .map((clip: any) => {
        if (!isObj(clip)) return null;
        
        const c: Record<string, any> = { ...clip };
        
        const normalizedEffect = normalizeEffect(c.effect);
        if (normalizedEffect) {
            c.effect = normalizedEffect;
        } else {
            delete c.effect;
        }

        c.asset = normalizeAsset(c.asset);
        
        if (!c.asset) return null; // Drop clip if asset becomes invalid
        
        c.start = typeof c.start === 'number' ? c.start : 0;
        c.length = typeof c.length === 'number' && c.length > 0 ? c.length : 5;

        return c;
      })
      .filter(Boolean);

    return { ...track, clips };
  });

  return copy;
}