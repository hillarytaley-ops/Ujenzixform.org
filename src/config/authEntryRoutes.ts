/**
 * Canonical URLs for onboarding, support, and marketing copy.
 * All paths here remain registered in App.tsx; this module is documentation + a single import for apps/links.
 */
export const AUTH_ENTRY_ROUTES = {
  primary: "/auth",
  /** Same UI as `primary`; use for marketing / QR labels ("Author page"). */
  author: "/author",
  home: "/home",
  unified: "/unified-auth",
  professionalBuilderAuth: "/professional-builder-auth",
  professionalBuilderSignIn: "/professional-builder-signin",
  privateClientAuth: "/private-client-auth",
  privateClientSignIn: "/private-client-signin",
  supplierAuth: "/supplier-auth",
  supplierSignIn: "/supplier-signin",
  deliveryAuth: "/delivery-auth",
  deliverySignIn: "/delivery-signin",
  adminLogin: "/admin-login",
  resetPassword: "/reset-password",
} as const;

export type AuthEntryRouteKey = keyof typeof AUTH_ENTRY_ROUTES;
