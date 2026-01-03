import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const LOOPS_ENDPOINT = 'https://app.loops.so/api/v1/transactional';
const TRANSACTIONAL_ID = 'cmbo8a95k03g1290i63zfz51g';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'Missing idToken' }, { status: 401 });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();

    const firstName = (body?.firstName || '').trim();
    const lastName = (body?.lastName || '').trim();
    const phone = (body?.phone || '').trim();
    const company = (body?.company || '').trim();
    const abn = (body?.abn || '').trim();
    const displayName = (body?.displayName || '').trim();

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email missing from token' }, { status: 400 });
    }

    const trialEnd = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    // Send welcome email
    let welcomeSent = false;
    try {
      const apiKey = process.env.LOOPS_API_KEY;
      if (!apiKey) {
        throw new Error('LOOPS_API_KEY not configured');
      }
      const resp = await fetch(LOOPS_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionalId: TRANSACTIONAL_ID,
          email,
        }),
      });
      const raw = await resp.text();
      let json: any;
      try {
        json = JSON.parse(raw);
      } catch {
        // ignore non-JSON
      }
      if (!resp.ok || json?.success !== true) {
        throw new Error(`Loops API error ${resp.status}`);
      }
      welcomeSent = true;
    } catch (err) {
      console.error('Welcome email failed', err);
    }

    // Provision Firestore user record
    const db = getAdminDb();
    await db
      .collection('users')
      .doc(uid)
      .set(
        {
          email,
          role: 'regular',
          theme_light: true,
          stripe_trial_end_date: trialEnd,
          stripe_subscription_status: 'trialing',
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          phone_number: phone,
          company_name: company,
          abn_num: abn,
          has_received_welcome: welcomeSent,
          show_tutorial: true,
          created_time: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true, welcomeSent });
  } catch (error) {
    console.error('provision error', error);
    return NextResponse.json(
      { ok: false, error: 'Provisioning failed' },
      { status: 500 }
    );
  }
}

