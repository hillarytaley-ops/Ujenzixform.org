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
