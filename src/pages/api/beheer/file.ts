// Eén bestand lezen (inhoud + sha), alleen bestanden die /beheer mag bewerken.
import type { APIRoute } from 'astro';
import { canAccess } from '../../../lib/admin/access';
import { readFile } from '../../../lib/admin/repo';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get('path') ?? '';
  if (!canAccess(path)) return new Response('Geen toegang', { status: 403 });
  return Response.json(await readFile(path));
};
