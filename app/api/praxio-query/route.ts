import { NextResponse } from 'next/server';

const API_TOKEN = process.env.PRAXIO_API_TOKEN;

export async function POST(req: Request) {
  try {
    if (!API_TOKEN) {
      console.error('Missing PRAXIO_API_TOKEN env var for Praxio query proxy');
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: missing PRAXIO_API_TOKEN' },
        { status: 500 }
      );
    }

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
        Authorization: `Bearer ${API_TOKEN}`,
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
      if (apiResp.status === 401) {
        console.warn(`Upstream unauthorized (check PRAXIO_API_TOKEN) for ${endpoint}`);
      }
      return NextResponse.json(
        {
          ok: false,
          status: apiResp.status,
          error: data?.error || text || 'Upstream error',
          upstreamBody: text,
        },
        { status: apiResp.status }
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
