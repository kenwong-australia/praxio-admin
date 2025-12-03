import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase';

/**
 * API Route: Create or retrieve Stripe customer
 * 
 * This endpoint:
 * 1. Checks if user has stripe_cust_id in Firestore
 * 2. If not, creates a Stripe customer using Stripe API
 * 3. Updates Firestore with the new customer ID
 * 
 * Environment variable required: STRIPE_SECRET_KEY
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

    // Get user ID from request body
    const body = await request.json();
    const { uid, email } = body;

    if (!uid || !email) {
      return NextResponse.json(
        { success: false, error: 'uid and email are required' },
        { status: 400 }
      );
    }

    // Get user data from Firestore
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const existingCustomerId = userData?.stripe_cust_id;
    const businessName = userData?.business_name || userData?.company_name || ''; // Support both field names

    // If customer ID already exists, return it
    if (existingCustomerId && typeof existingCustomerId === 'string' && existingCustomerId.trim()) {
      return NextResponse.json({
        success: true,
        customerId: existingCustomerId,
        message: 'Customer ID already exists',
      });
    }

    // Create Stripe customer
    const stripeResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: email,
        name: businessName || email, // Use business name if available, otherwise email
        metadata: JSON.stringify({
          firebase_uid: uid,
          business_name: businessName || '',
        }),
      }),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      console.error('Stripe API error:', errorData);
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error?.message || 'Failed to create Stripe customer',
          stripeError: errorData,
        },
        { status: stripeResponse.status }
      );
    }

    const stripeCustomer = await stripeResponse.json();
    const customerId = stripeCustomer.id;

    // Update Firestore with the new customer ID
    await db.collection('users').doc(uid).update({
      stripe_cust_id: customerId,
    });

    return NextResponse.json({
      success: true,
      customerId: customerId,
      message: 'Stripe customer created successfully',
    });

  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

