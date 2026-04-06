import { AUTH_ENTRY_ROUTES } from "./authEntryRoutes";

export type AuthRouteAlias = { readonly path: string; readonly to: string };

/**
 * Friendly shortcuts → existing canonical routes. Does not remove any URL; adds entry points
 * for campaigns and muscle memory (/login, /builder/login, etc.).
 */
export const AUTH_ROUTE_ALIASES: readonly AuthRouteAlias[] = [
  { path: "/login", to: AUTH_ENTRY_ROUTES.primary },
  { path: "/signin", to: AUTH_ENTRY_ROUTES.primary },
  { path: "/sign-in", to: AUTH_ENTRY_ROUTES.primary },
  { path: "/signup", to: AUTH_ENTRY_ROUTES.primary },
  { path: "/register", to: AUTH_ENTRY_ROUTES.primary },
  { path: "/account", to: AUTH_ENTRY_ROUTES.primary },
  { path: "/builder/login", to: AUTH_ENTRY_ROUTES.professionalBuilderSignIn },
  { path: "/builder/signin", to: AUTH_ENTRY_ROUTES.professionalBuilderSignIn },
  { path: "/client/login", to: AUTH_ENTRY_ROUTES.privateClientSignIn },
  { path: "/supplier/login", to: AUTH_ENTRY_ROUTES.supplierSignIn },
  { path: "/delivery/login", to: AUTH_ENTRY_ROUTES.deliverySignIn },
];

/** Paths that all render the same `Suppliers` page (keeps old links working). */
export const SUPPLIERS_PAGE_PATHS = [
  "/suppliers",
  "/suppliers-mobile",
  "/supplier-marketplace",
] as const;

/** `sign-in` vs `signin` typos → canonical paths (single loop in App.tsx). */
export const AUTH_SIGNIN_HYPHEN_REDIRECTS: readonly AuthRouteAlias[] = [
  { path: "/supplier-sign-in", to: "/supplier-signin" },
  { path: "/builder-sign-in", to: "/builder-signin" },
  { path: "/delivery-sign-in", to: "/delivery-signin" },
  { path: "/private-client-sign-in", to: "/private-client-signin" },
  { path: "/professional-builder-sign-in", to: "/professional-builder-signin" },
] as const;

/** All `<Navigate replace />` auth-related shortcuts in one array for `App.tsx`. */
export const ALL_PUBLIC_AUTH_REDIRECTS: readonly AuthRouteAlias[] = [
  ...AUTH_ROUTE_ALIASES,
  ...AUTH_SIGNIN_HYPHEN_REDIRECTS,
];
