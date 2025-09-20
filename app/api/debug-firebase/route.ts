import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      NEXT_PUBLIC_FB_PROJECT_ID: !!process.env.NEXT_PUBLIC_FB_PROJECT_ID,
      NEXT_PUBLIC_FB_API_KEY: !!process.env.NEXT_PUBLIC_FB_API_KEY,
      NEXT_PUBLIC_FB_AUTH_DOMAIN: !!process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
    };
    
    // Show partial values for debugging (not full keys for security)
    const envValues = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'NOT_SET',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || 'NOT_SET',
      NEXT_PUBLIC_FB_PROJECT_ID: process.env.NEXT_PUBLIC_FB_PROJECT_ID || 'NOT_SET',
      NEXT_PUBLIC_FB_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN || 'NOT_SET',
      FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      NEXT_PUBLIC_FB_API_KEY_LENGTH: process.env.NEXT_PUBLIC_FB_API_KEY?.length || 0,
    };
    
    return NextResponse.json({
      success: true,
      message: 'Environment variables check',
      envCheck,
      envValues,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Debug Firebase error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
