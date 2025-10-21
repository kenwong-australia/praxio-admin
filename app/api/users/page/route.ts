import { NextRequest, NextResponse } from 'next/server';
import { getUsers } from '@/app/actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const plan = searchParams.get('plan') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '25');

    const res = await getUsers({ search, role, plan, status, page, pageSize });
    return NextResponse.json({ ok: true, params: { search, role, plan, status, page, pageSize }, total: res.total, count: res.rows.length, rows: res.rows });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}


