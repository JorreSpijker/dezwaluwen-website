// Concept live zetten: alle ongepubliceerde wijzigingen in één keer naar de live branch.
import type { APIRoute } from 'astro';
import { ConflictError, drafts, publish } from '../../../lib/admin/repo';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  if (!drafts) return new Response('Publiceren staat uit', { status: 400 });
  try {
    return Response.json({ commit: await publish(locals.user!.name) });
  } catch (error) {
    if (error instanceof ConflictError) return Response.json({ message: error.message }, { status: 409 });
    throw error;
  }
};
