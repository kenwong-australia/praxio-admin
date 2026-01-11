import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase';
import { userClient } from '@/lib/supabase';

/**
 * DELETE user account and related data.
 * Expects: { idToken: string } from the signed-in user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';

    const authHeader = request.headers.get('authorization') || '';
    const supabaseToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';

    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'Missing idToken' }, { status: 401 });
    }
    if (!supabaseToken) {
      return NextResponse.json({ ok: false, error: 'Missing Supabase bearer token' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const errors: string[] = [];

    // Delete Supabase user row (RLS-enforced; user token required)
    try {
      const client = userClient(supabaseToken);
      const { error: userDeleteError } = await client.from('user').delete().eq('id', uid);
      if (userDeleteError) throw userDeleteError;
    } catch (supabaseError) {
      console.error('Supabase delete failed', supabaseError);
      errors.push('Failed to delete Supabase user');
    }

    // Delete Firestore user document
    try {
      const db = getAdminDb();
      await db.collection('users').doc(uid).delete();
    } catch (firestoreError) {
      console.error('Firestore delete failed', firestoreError);
      errors.push('Failed to delete Firestore user');
    }

    // Delete Firebase Auth user
    try {
      await adminAuth.deleteUser(uid);
    } catch (authError) {
      console.error('Firebase auth delete failed', authError);
      errors.push('Failed to delete Firebase auth user');
    }

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete account error', error);
    return NextResponse.json({ ok: false, error: 'Unable to delete account' }, { status: 500 });
  }
}

