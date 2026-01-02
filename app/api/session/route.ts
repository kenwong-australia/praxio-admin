import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase';
import { sessionCookie } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 });
    }

    const auth = getAdminAuth();
    // Ensure token is valid and not revoked
    const decoded = await auth.verifyIdToken(idToken, true);
    if (!decoded?.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const expiresIn = sessionCookie.maxAgeSeconds * 1000;
    const cookieValue = await auth.createSessionCookie(idToken, { expiresIn });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookie.name, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: sessionCookie.maxAgeSeconds,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('Session creation failed', err);
    return NextResponse.json({ error: 'Unable to create session' }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie.name, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return res;
}

