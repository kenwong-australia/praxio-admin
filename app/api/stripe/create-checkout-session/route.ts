import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Create Stripe Checkout Session
 * 
 * This endpoint creates a Stripe checkout session for subscription
 * 
 * Environment variable required: STRIPE_SECRET_KEY
 * 
 * Request body:
 * - customer: Stripe customer ID
 * - price: Stripe price ID (for monthly or yearly plan)
 * - successUrl: URL to redirect after successful payment
 * - cancelUrl: URL to redirect if user cancels
 */
export async function POST(request: NextRequest) {
  try {
    // Get Stripe secret key from environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stripe configuration is missing. Please set STRIPE_SECRET_KEY environment variable.' 
        },
        { status: 500 }
      );
    }

    // Get request body
    const body = await request.json();
    const { customer, price, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'customer (Stripe customer ID) is required' },
        { status: 400 }
      );
    }

    if (!price) {
      return NextResponse.json(
        { success: false, error: 'price (Stripe price ID) is required' },
        { status: 400 }
      );
    }

    // Default URLs if not provided
    // Note: In production, NEXT_PUBLIC_BASE_URL should be set
    // Client always provides URLs, so defaults are fallback only
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const defaultSuccessUrl = baseUrl ? `${baseUrl}/pricing?success=true` : '/pricing?success=true';
    const defaultCancelUrl = baseUrl ? `${baseUrl}/pricing?canceled=true` : '/pricing?canceled=true';

    const taxRateId = process.env.STRIPE_TAX_RATE_ID || 'txr_1RfyRgEVF5RQT3bLUK69hQnP';

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        success_url: successUrl || defaultSuccessUrl,
        cancel_url: cancelUrl || defaultCancelUrl,
        'line_items[0][price]': price,
        'line_items[0][quantity]': '1',
        customer: customer,
        'automatic_tax[enabled]': 'false',
        'allow_promotion_codes': 'true',
        'subscription_data[default_tax_rates][0]': taxRateId,
      }),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      console.error('Stripe API error:', errorData);
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error?.message || 'Failed to create checkout session',
          stripeError: errorData,
        },
        { status: stripeResponse.status }
      );
    }

    const checkoutSession = await stripeResponse.json();

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      message: 'Checkout session created successfully',
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

