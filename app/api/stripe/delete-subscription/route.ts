import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Delete (cancel) a Stripe subscription
 *
 * Request body:
 * - subscriptionId: Stripe subscription ID (required)
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
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'subscriptionId is required' },
        { status: 400 }
      );
    }

    const stripeResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json().catch(() => null);
      return NextResponse.json(
        {
          success: false,
          error: errorData?.error?.message || 'Failed to cancel subscription',
          stripeError: errorData,
        },
        { status: stripeResponse.status }
      );
    }

    const result = await stripeResponse.json();

    return NextResponse.json({ success: true, subscription: result });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
