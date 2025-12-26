import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Body should match TaxQuery schema; we may get a hint for model selection via __model
    const model = (body?.__model || '').trim();
    const endpoint =
      model === 'Test AI'
        ? 'https://tax-law-api-test.onrender.com/query'
        : 'https://tax-law-api-launch.onrender.com/query';

    const { __model: _m, model: _legacy, ...forwardBody } = body || {};

    const apiResp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Strip the model flag before forwarding
      body: JSON.stringify(forwardBody),
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
          upstreamBody: text,
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
