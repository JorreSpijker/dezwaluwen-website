// Foto uit de repo, voor het voorbeeld in de nieuws-editor (ook nog niet gedeployde foto's).
import type { APIRoute } from 'astro';
import { canReadImage } from '../../../lib/admin/access';
import { readBytes } from '../../../lib/admin/repo';

export const prerender = false;

const types: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get('path') ?? '';
  if (!canReadImage(path)) return new Response('Geen toegang', { status: 403 });
  const { body } = await readBytes(path);
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': types[path.split('.').pop()!], 'Cache-Control': 'private, max-age=300' },
  });
};
