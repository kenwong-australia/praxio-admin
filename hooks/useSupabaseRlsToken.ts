import { useEffect, useState, useCallback } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

type TokenState = {
  accessToken: string | null;
  appRole: string | null;
  expiresIn?: number | null;
};

/**
 * Mint and track a Supabase JWT for the signed-in Firebase user.
 * JWT includes user_id/app_role and is used for RLS-enforced Supabase calls.
 * No Supabase session persistence; we re-mint on Firebase auth changes.
 */
export function useSupabaseRlsToken() {
  const [tokenState, setTokenState] = useState<TokenState>({ accessToken: null, appRole: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mint = useCallback(async (user: User | null) => {
    if (!user) {
      setTokenState({ accessToken: null, appRole: null });
      return;
    }

    const mintUrl = process.env.NEXT_PUBLIC_SUPABASE_MINT_URL;
    if (!mintUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_MINT_URL is not configured');
    }

    // Force refresh Firebase token to maximize Supabase JWT lifetime
    const firebaseToken = await user.getIdToken(true);
    const resp = await fetch(mintUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { token: firebaseToken } }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`mint token failed (${resp.status}): ${text}`);
    }

    const json = await resp.json();
    const data = json?.data;
    const accessToken = data?.access_token as string | undefined;
    const appRole = data?.app_role as string | undefined;
    const expiresIn = data?.expires_in as number | undefined;

    if (!accessToken) {
      throw new Error('mint token response missing access_token');
    }

    setTokenState({ accessToken, appRole: appRole ?? null, expiresIn: expiresIn ?? null });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        setTokenState({ accessToken: null, appRole: null });
        return null;
      }
      await mint(user);
      setError(null);
      return tokenState.accessToken;
    } catch (e: any) {
      const msg = e?.message || 'Unable to refresh Supabase token';
      setError(msg);
      return null;
    }
  }, [mint, tokenState.accessToken]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    setLoading(true);
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setTokenState({ accessToken: null, appRole: null });
          return;
        }
        await mint(user);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Unable to mint Supabase token');
        setTokenState({ accessToken: null, appRole: null });
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [mint]);

  return {
    accessToken: tokenState.accessToken,
    appRole: tokenState.appRole,
    expiresIn: tokenState.expiresIn,
    loading,
    error,
    refresh,
  };
}

