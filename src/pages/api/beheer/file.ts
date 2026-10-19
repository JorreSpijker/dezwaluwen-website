// Eén bestand lezen (inhoud + sha), alleen als de rol er toegang toe heeft.
import type { APIRoute } from 'astro';
import { canAccess } from '../../../lib/admin/access';
import { readFile } from '../../../lib/admin/repo';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const path = url.searchParams.get('path') ?? '';
  if (!canAccess(locals.user!, path)) return new Response('Geen toegang', { status: 403 });
  return Response.json(await readFile(path));
};
