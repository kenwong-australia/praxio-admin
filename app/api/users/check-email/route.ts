import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase';

/**
 * POST /api/users/check-email
 * Body: { email: string }
 * Returns: { ok: boolean; exists: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailRaw = typeof body?.email === 'string' ? body.email : '';
    const email = emailRaw.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, exists: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    const exists = !snapshot.empty;

    return NextResponse.json({ ok: true, exists });
  } catch (error) {
    console.error('check-email lookup failed:', error);
    return NextResponse.json(
      { ok: false, exists: false, error: 'Unable to check email at this time' },
      { status: 500 }
    );
  }
}

