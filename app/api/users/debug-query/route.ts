import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase';
import { guardAdminApi } from '@/lib/auth-server';

// Debug endpoint to run the same Firestore filters used by getUsers
// Usage: /api/users/debug-query?search=&role=&plan=&status=&limit=10
export async function GET(request: NextRequest) {
  try {
    const guard = await guardAdminApi(request);
    if (guard) return guard;

    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const plan = searchParams.get('plan') || undefined;
    const status = searchParams.get('status') || undefined;
    const summary = (searchParams.get('summary') || 'false') === 'true';
    const limitParam = Number(searchParams.get('limit') || '10');
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

    const db = getAdminDb();
    const usersRef = db.collection('users');

    if (summary) {
      const snapshot = await usersRef.get();
      const statuses: Record<string, number> = {};
      const freqs: Record<string, number> = {};
      snapshot.forEach((doc: any) => {
        const d = doc.data();
        const s = (d.stripe_subscription_status ?? '').toString();
        const f = (d.selected_frequency ?? '').toString();
        statuses[s] = (statuses[s] || 0) + 1;
        freqs[f] = (freqs[f] || 0) + 1;
      });
      return NextResponse.json({ ok: true, summary: { statuses, frequencies: freqs } });
    }

    const applied: string[] = [];
    let query: any = usersRef;

    if (search) {
      applied.push(`email BETWEEN ${search} AND ${search}\uf8ff`);
      query = query.where('email', '>=', search).where('email', '<=', search + '\uf8ff');
    }
    if (role) {
      applied.push(`role == ${role}`);
      query = query.where('role', '==', role);
    }
    if (plan) {
      const p = plan.trim();
      if (p.toUpperCase() === 'N/A') {
        applied.push(`selected_frequency == '' (from N/A)`);
        query = query.where('selected_frequency', '==', '');
      } else {
        applied.push(`selected_frequency == ${p.toLowerCase()}`);
        query = query.where('selected_frequency', '==', p.toLowerCase());
      }
    }
    if (status) {
      const s = status.trim().toLowerCase();
      applied.push(`stripe_subscription_status == ${s}`);
      query = query.where('stripe_subscription_status', '==', s);
    }

    // Order rules to match server logic and avoid composite indexes
    const hasEqualityFilters = Boolean(role || plan || status);
    if (search) {
      query = query.orderBy('email');
    } else if (!hasEqualityFilters) {
      query = query.orderBy('created_time', 'desc');
    }
    query = query.limit(limit);

    try {
      const snapshot = await query.get();
      const rows = snapshot.docs.map((doc: any) => {
        const d = doc.data();
        return {
          id: doc.id,
          email: d.email,
          role: d.role,
          selected_frequency: d.selected_frequency,
          stripe_subscription_status: d.stripe_subscription_status,
          created_time: d.created_time,
        };
      });

      return NextResponse.json({
        ok: true,
        applied,
        count: rows.length,
        rows,
      });
    } catch (qerr: any) {
      // Return Firestore error details to help identify missing indexes / orderBy constraints
      return NextResponse.json({
        ok: false,
        applied,
        error: qerr?.message || String(qerr),
        code: qerr?.code || undefined,
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}


