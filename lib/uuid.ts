// lib/uuid.ts
import { v4 as uuidv4 } from 'uuid';

/** Use this everywhere instead of importing 'uuid' directly */
export default function uuid(): string {
  return uuidv4();
}

// If you ever need the named export:
export { uuidv4 };

