import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase';

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
      FIREBASE_PRIVATE_KEY_STARTS_WITH: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 20) || 'NOT_SET',
      FIREBASE_PRIVATE_KEY_ENDS_WITH: process.env.FIREBASE_PRIVATE_KEY?.substring(-20) || 'NOT_SET',
      FIREBASE_PRIVATE_KEY_CONTAINS_NEWLINES: process.env.FIREBASE_PRIVATE_KEY?.includes('\n') || false,
      FIREBASE_PRIVATE_KEY_CONTAINS_ESCAPED_NEWLINES: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n') || false,
    };
    
    // Test actual Firebase connection
    let firebaseTest = {
      connected: false,
      error: null as string | null,
      userCount: 0,
      sampleUser: null as any,
    };
    
    try {
      console.log('Testing Firebase connection in production...');
      const db = getAdminDb();
      const usersRef = db.collection('users');
      
      // Try to get a count of users
      const snapshot = await usersRef.limit(1).get();
      firebaseTest.connected = true;
      firebaseTest.userCount = snapshot.size;
      
      // Try to get one user document to see the structure
      if (snapshot.docs.length > 0) {
        const userData = snapshot.docs[0].data();
        firebaseTest.sampleUser = {
          id: snapshot.docs[0].id,
          email: userData.email,
          created_time: userData.created_time,
          // Only show a few fields for security
        };
      }
      
      console.log('Firebase test successful:', firebaseTest);
    } catch (firebaseError) {
      console.error('Firebase connection error:', firebaseError);
      firebaseTest.error = firebaseError instanceof Error ? firebaseError.message : 'Unknown Firebase error';
    }
    
    return NextResponse.json({
      success: true,
      message: 'Environment variables and Firebase connection check',
      envCheck,
      envValues,
      firebaseTest,
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
