'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const DEFAULT_TIMEOUT_HOURS = 2;
const STORAGE_KEY = 'inactivity_timeout_hours';
const COUNTDOWN_WARNING_SECONDS = 300; // Show warning 5 minutes before logout

export function useInactivityTimeout() {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutDurationRef = useRef<number>(DEFAULT_TIMEOUT_HOURS * 60 * 60 * 1000);

  // Get timeout duration from localStorage
  const getTimeoutDuration = useCallback((): number => {
    if (typeof window === 'undefined') return DEFAULT_TIMEOUT_HOURS * 60 * 60 * 1000;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const hours = parseFloat(stored);
      if (!isNaN(hours) && hours > 0) {
        return hours * 60 * 60 * 1000;
      }
    }
    return DEFAULT_TIMEOUT_HOURS * 60 * 60 * 1000;
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    // Clear all timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      toast.info('Session expired due to inactivity', {
        description: 'You have been logged out for security reasons',
        duration: 5000,
      });
      router.replace('/signin?reason=timeout');
    } catch (error) {
      console.error('Error signing out:', error);
      router.replace('/signin?reason=timeout');
    }
  }, [router]);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    timeoutDurationRef.current = getTimeoutDuration();
    
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutDurationRef.current);

    // Start countdown interval
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeoutDurationRef.current - elapsed;
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsWarning(true);
        return;
      }

      setTimeRemaining(remaining);
      setIsWarning(remaining <= COUNTDOWN_WARNING_SECONDS * 1000);
    }, 1000);
  }, [getTimeoutDuration, handleLogout]);

  // Listen for storage changes (when user updates preference in settings)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        resetTimer();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    const handleCustomStorageChange = () => {
      resetTimer();
    };
    
    window.addEventListener('timeoutPreferenceChanged', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('timeoutPreferenceChanged', handleCustomStorageChange);
    };
  }, [resetTimer]);

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [resetTimer]);

  // Format time remaining as HH:MM:SS
  const formatTimeRemaining = useCallback((ms: number): string => {
    if (ms <= 0) return '00:00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  return {
    timeRemaining,
    isWarning,
    formatTimeRemaining,
    resetTimer,
  };
}
