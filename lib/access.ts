export type AppVariant = 'admin' | 'user';

// Path prefixes allowed for the user variant. Admin is allowed everywhere.
const USER_ALLOWLIST = [
  '/', // landing
  '/signin',
  '/signup',
  '/praxio',
  '/settings',
  '/pricing',
  '/success',
];

export function getAppVariant(): AppVariant {
  const v = process.env.APP_VARIANT?.toLowerCase();
  return v === 'user' ? 'user' : 'admin';
}

/**
 * Returns true if the path is allowed for the given variant.
 * Admin is always allowed. User is limited to the allowlist above.
 */
export function isAllowedPathForVariant(pathname: string, variant: AppVariant): boolean {
  if (variant === 'admin') return true;
  return USER_ALLOWLIST.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

