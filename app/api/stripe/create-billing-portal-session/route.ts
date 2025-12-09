import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Create Stripe Billing Portal Session
 *
 * Request body:
 * - customerId: Stripe customer ID (required)
 * - returnUrl: URL to return to after managing billing (required)
 */
export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe configuration missing. Please set STRIPE_SECRET_KEY.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { customerId, returnUrl } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      );
    }

    if (!returnUrl) {
      return NextResponse.json(
        { success: false, error: 'returnUrl is required' },
        { status: 400 }
      );
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: returnUrl,
      }),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json().catch(() => null);
      return NextResponse.json(
        {
          success: false,
          error: errorData?.error?.message || 'Failed to create billing portal session',
          stripeError: errorData,
        },
        { status: stripeResponse.status }
      );
    }

    const session = await stripeResponse.json();

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
