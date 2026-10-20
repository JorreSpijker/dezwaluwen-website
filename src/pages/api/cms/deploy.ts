// Deploystatus van een commit, voor de melding na opslaan.
import type { APIRoute } from 'astro';
import { deployState } from '../../../lib/admin/repo';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const sha = url.searchParams.get('sha') ?? '';
  if (!/^[0-9a-f]{40}$/.test(sha)) return new Response('Ongeldige sha', { status: 400 });
  return Response.json({ state: await deployState(sha) });
};
