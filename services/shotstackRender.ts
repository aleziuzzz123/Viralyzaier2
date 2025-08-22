// services/shotstackRender.ts
export async function queueRender(edit: any): Promise<string> {
  const r = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edit),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.message || 'Render failed');
  // Shotstack response shape: { response: { id: '...' } }
  return j?.response?.id;
}

export async function checkRender(id: string) {
  const r = await fetch(`/api/render-status?id=${encodeURIComponent(id)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.message || 'Status failed');
  return j; // contains response.status and response.url (when done)
}
