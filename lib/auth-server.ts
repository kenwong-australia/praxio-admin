import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from './firebase';

const SESSION_COOKIE_NAME = '__session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SessionUser = {
  uid: string;
  email: string;
  role: string;
};

function parseCookieHeader(header?: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [k, ...rest] = part.trim().split('=');
      return [k, rest.join('=')];
    })
  );
}

function getCookieValue(req?: NextRequest): string | undefined {
  if (req) {
    const fromStore = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (fromStore) return fromStore;
    const header = req.headers.get('cookie');
    return parseCookieHeader(header)[SESSION_COOKIE_NAME];
  }

  const cookieStore = cookies();
  const fromStore = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (fromStore) return fromStore;
  const header = headers().get('cookie');
  return parseCookieHeader(header)[SESSION_COOKIE_NAME];
}

async function fetchUser(uid: string): Promise<SessionUser | null> {
  const db = getAdminDb();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  return {
    uid,
    email: (data?.email || '').toString(),
    role: (data?.role || 'regular').toString(),
  };
}

export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  try {
    const cookie = getCookieValue(req);
    if (!cookie) return null;

    const auth = getAdminAuth();
    const decoded = await auth.verifySessionCookie(cookie, true);
    const user = await fetchUser(decoded.uid);
    return user;
  } catch (err) {
    console.warn('Session verification failed', err);
    return null;
  }
}

export async function assertAdmin(req?: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    throw new Error('FORBIDDEN_ADMIN');
  }
  return user;
}

export async function guardAdminApi(req: NextRequest): Promise<NextResponse | null> {
  try {
    await assertAdmin(req);
    return null;
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export const sessionCookie = {
  name: SESSION_COOKIE_NAME,
  maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
};

