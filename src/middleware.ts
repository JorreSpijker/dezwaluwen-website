// Schermt /beheer en /api/beheer af: zonder geldige sessie naar login (pagina's) of 401 (API).
// Publieke pagina's zijn prerendered en komen hier niet langs.
import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, verifySession } from './lib/admin/auth';
import { findUser } from './lib/admin/users';

const open = ['/beheer/login', '/api/beheer/google', '/api/beheer/google/callback'];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname.replace(/\/$/, '');
  const isPage = path === '/beheer' || path.startsWith('/beheer/');
  const isApi = path.startsWith('/api/beheer/');
  if (context.isPrerendered || (!isPage && !isApi) || open.includes(path)) return next();

  const email = await verifySession(context.cookies.get(SESSION_COOKIE)?.value);
  // Opnieuw opzoeken: verwijderde gebruiker of gewijzigde rol werkt direct
  const user = email ? await findUser(email) : undefined;
  if (!user) {
    context.cookies.delete(SESSION_COOKIE, { path: '/' });
    return isApi ? new Response('Niet ingelogd', { status: 401 }) : context.redirect('/beheer/login');
  }
  context.locals.user = user;
  return next();
});
