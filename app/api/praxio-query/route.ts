import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { payload, model } = await req.json();
    const endpoint =
      model === 'Test AI'
        ? 'https://tax-law-api-test.onrender.com/query'
        : 'https://tax-law-api-launch.onrender.com/query';

    const apiResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // avoid any caching
      cache: 'no-store',
    });

    const text = await apiResp.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // leave data as null; return raw text
    }

    if (!apiResp.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: apiResp.status,
          error: data?.error || text || 'Upstream error',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? text });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
