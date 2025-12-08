import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'Missing idToken' }, { status: 400 });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();

    // Double check auth record is actually verified
    const authUser = await auth.getUser(uid);
    if (!authUser.emailVerified) {
      return NextResponse.json({ ok: false, error: 'Email not verified in Auth' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('users').doc(uid).set(
      {
        email_verified: true,
        email,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('mark-email-verified error', error);
    return NextResponse.json({ ok: false, error: 'Failed to update verification' }, { status: 500 });
  }
}
