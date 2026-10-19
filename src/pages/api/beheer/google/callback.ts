// Terug van Google: code inwisselen, e-mailadres checken tegen de gebruikerslijst, sessie starten.
import type { APIRoute } from 'astro';
import { decodeIdToken } from 'arctic';
import { startSession } from '../../../../lib/admin/auth';
import { STATE_COOKIE, VERIFIER_COOKIE, google } from '../../../../lib/admin/google';
import { findUser } from '../../../../lib/admin/users';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = cookies.get(STATE_COOKIE)?.value;
  const verifier = cookies.get(VERIFIER_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: '/' });
  cookies.delete(VERIFIER_COOKIE, { path: '/' });
  if (!code || !state || state !== savedState || !verifier) return redirect('/beheer/login?status=mislukt', 303);

  let email: string | undefined;
  try {
    const tokens = await google(url.origin).validateAuthorizationCode(code, verifier);
    // Token komt rechtstreeks van Google (server-naar-server), dus decoderen zonder extra handtekeningcheck volstaat
    const claims = decodeIdToken(tokens.idToken()) as { email?: string; email_verified?: boolean };
    if (claims.email_verified) email = claims.email;
  } catch {
    return redirect('/beheer/login?status=mislukt', 303);
  }

  const user = email ? await findUser(email) : undefined;
  if (!user) return redirect('/beheer/login?status=geen-toegang', 303);
  await startSession(cookies, user.email);
  return redirect('/beheer', 303);
};
