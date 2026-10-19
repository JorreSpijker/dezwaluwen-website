// Sessies als getekende JWT in een cookie; geen database nodig.
import type { AstroCookies } from 'astro';
import { AUTH_SECRET } from 'astro:env/server';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'beheer_sessie';
export const SESSION_DAYS = 30;

const key = () => {
  if (!AUTH_SECRET) throw new Error('AUTH_SECRET ontbreekt');
  return new TextEncoder().encode(AUTH_SECRET);
};

const createSession = (email: string) =>
  new SignJWT().setProtectedHeader({ alg: 'HS256' }).setSubject(email).setIssuedAt().setExpirationTime(`${SESSION_DAYS}d`).sign(key());

// E-mailadres uit een geldige sessie, anders undefined
export async function verifySession(token: string | undefined) {
  if (!token) return;
  try {
    return (await jwtVerify(token, key(), { algorithms: ['HS256'] })).payload.sub;
  } catch {
    return;
  }
}

export async function startSession(cookies: AstroCookies, email: string) {
  cookies.set(SESSION_COOKIE, await createSession(email), {
    path: '/',
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}
