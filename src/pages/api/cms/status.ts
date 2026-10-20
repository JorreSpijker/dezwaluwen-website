// Staan er wijzigingen klaar die nog niet gepubliceerd zijn? Voor het rondje in de bovenbalk.
import type { APIRoute } from 'astro';
import { drafts, pending } from '../../../lib/admin/repo';

export const prerender = false;

export const GET: APIRoute = async () => Response.json({ pending: drafts && (await pending()).files.length > 0 });
