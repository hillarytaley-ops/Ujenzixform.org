/**
 * Paths where floating chrome (e.g. live chat, social sidebar) should not appear.
 * Keeps one definition so auth entry points do not drift from `App.tsx` routes.
 *
 * Inventory of routes, guards, and roles: docs/AUTH_AND_ROUTES_MATRIX.md
 */

const EXACT_AUTH_ENTRY_PATHS = new Set<string>([
  '/',
  '/auth',
  '/unified-auth',
  '/admin-login',
  '/reset-password',
  '/builder-signin',
  '/supplier-signin',
  '/delivery-signin',
  '/professional-builder-signin',
  '/private-client-signin',
]);

/**
 * True for sign-in, registration, and role-specific auth screens.
 */
export function shouldHideFloatingChrome(pathname: string): boolean {
  if (EXACT_AUTH_ENTRY_PATHS.has(pathname)) return true;
  if (pathname.includes('-registration')) return true;
  if (pathname.includes('-signin')) return true;
  // e.g. /private-client-auth, /supplier-auth, /delivery-auth
  if (pathname.endsWith('-auth')) return true;
  return false;
}
