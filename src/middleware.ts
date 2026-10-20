// Schermt /cms en /api/cms af: zonder geldige sessie naar login (pagina's) of 401 (API).
// Publieke pagina's zijn prerendered en komen hier niet langs.
import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, verifySession } from './lib/admin/auth';
import { hasAccess } from './lib/admin/users';

const open = ['/cms/login', '/api/cms/google', '/api/cms/google/callback'];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname.replace(/\/$/, '');
  const isPage = path === '/cms' || path.startsWith('/cms/');
  const isApi = path.startsWith('/api/cms/');
  if (context.isPrerendered || (!isPage && !isApi) || open.includes(path)) return next();

  const user = await verifySession(context.cookies.get(SESSION_COOKIE)?.value);
  // Elke keer tegen BEHEER_EMAILS: adres eruit + redeploy = direct geen toegang meer
  if (!user || !hasAccess(user.email)) {
    context.cookies.delete(SESSION_COOKIE, { path: '/' });
    return isApi ? new Response('Niet ingelogd', { status: 401 }) : context.redirect('/cms/login');
  }
  context.locals.user = user;
  return next();
});
