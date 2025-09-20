import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing Firebase connection...');
    
    // Check environment variables
    const envCheck = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      NEXT_PUBLIC_FB_PROJECT_ID: !!process.env.NEXT_PUBLIC_FB_PROJECT_ID,
    };
    
    console.log('Environment variables check:', envCheck);
    
    // Test Firebase connection
    const db = getAdminDb();
    const usersRef = db.collection('users');
    
    // Try to get a count of users
    const snapshot = await usersRef.limit(1).get();
    const userCount = snapshot.size;
    
    // Try to get one user document to see the structure
    let sampleUser = null;
    if (snapshot.docs.length > 0) {
      sampleUser = snapshot.docs[0].data();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Firebase connection successful',
      envCheck,
      userCount,
      sampleUser: sampleUser ? {
        id: snapshot.docs[0].id,
        email: sampleUser.email,
        created_time: sampleUser.created_time,
        // Only show a few fields for security
      } : null,
    });
    
  } catch (error) {
    console.error('Firebase connection error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
