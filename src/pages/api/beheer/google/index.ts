// Start inloggen: door naar Google, met state en PKCE-verifier in kortlevende cookies.
import type { APIRoute } from 'astro';
import { generateCodeVerifier, generateState } from 'arctic';
import { STATE_COOKIE, VERIFIER_COOKIE, google } from '../../../../lib/admin/google';

export const prerender = false;

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const options = { path: '/', httpOnly: true, secure: !import.meta.env.DEV, sameSite: 'lax' as const, maxAge: 10 * 60 };
  cookies.set(STATE_COOKIE, state, options);
  cookies.set(VERIFIER_COOKIE, verifier, options);

  const target = google(url.origin).createAuthorizationURL(state, verifier, ['openid', 'email', 'profile']);
  // Altijd accountkeuze tonen, handig met meerdere Google-accounts
  target.searchParams.set('prompt', 'select_account');
  return redirect(target.toString(), 302);
};
