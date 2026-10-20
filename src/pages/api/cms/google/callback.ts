// Terug van Google: code inwisselen, e-mailadres checken tegen BEHEER_EMAILS, sessie starten.
import type { APIRoute } from 'astro';
import { decodeIdToken } from 'arctic';
import { startSession } from '../../../../lib/admin/auth';
import { STATE_COOKIE, VERIFIER_COOKIE, google } from '../../../../lib/admin/google';
import { hasAccess, type User } from '../../../../lib/admin/users';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = cookies.get(STATE_COOKIE)?.value;
  const verifier = cookies.get(VERIFIER_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: '/' });
  cookies.delete(VERIFIER_COOKIE, { path: '/' });
  if (!code || !state || state !== savedState || !verifier) return redirect('/cms/login?status=mislukt', 303);

  let user: User | undefined;
  try {
    const tokens = await google(url.origin).validateAuthorizationCode(code, verifier);
    // Token komt rechtstreeks van Google (server-naar-server), dus decoderen zonder extra handtekeningcheck volstaat
    const claims = decodeIdToken(tokens.idToken()) as { email?: string; email_verified?: boolean; name?: string };
    if (claims.email && claims.email_verified) user = { email: claims.email.toLowerCase(), name: claims.name ?? claims.email };
  } catch {
    return redirect('/cms/login?status=mislukt', 303);
  }

  if (!user || !hasAccess(user.email)) return redirect('/cms/login?status=geen-toegang', 303);
  await startSession(cookies, user);
  return redirect('/cms', 303);
};
