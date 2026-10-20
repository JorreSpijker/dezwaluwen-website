// Sessies als getekende JWT in een cookie; geen database nodig.
import type { AstroCookies } from 'astro';
import { AUTH_SECRET } from 'astro:env/server';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from './users';

export const SESSION_COOKIE = 'cms_sessie';
export const SESSION_DAYS = 30;

const key = () => {
  if (!AUTH_SECRET) throw new Error('AUTH_SECRET ontbreekt');
  return new TextEncoder().encode(AUTH_SECRET);
};

const createSession = ({ name, email }: User) =>
  new SignJWT({ name }).setProtectedHeader({ alg: 'HS256' }).setSubject(email).setIssuedAt().setExpirationTime(`${SESSION_DAYS}d`).sign(key());

// Gebruiker uit een geldige sessie, anders undefined
export async function verifySession(token: string | undefined): Promise<User | undefined> {
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (!payload.sub) return;
    return { email: payload.sub, name: typeof payload.name === 'string' ? payload.name : payload.sub };
  } catch {
    return;
  }
}

export async function startSession(cookies: AstroCookies, user: User) {
  cookies.set(SESSION_COOKIE, await createSession(user), {
    path: '/',
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}
