import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/admin/auth';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/beheer/login?status=uitgelogd', 303);
};
