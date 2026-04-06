# Auth, routes, and role guards

**Purpose:** One place to see how **URLs**, **session requirements**, and **`user_roles`** line up. Use this when changing `App.tsx`, `RoleProtectedRoute`, or Supabase RLS so client guards and database policies stay aligned.

**Code sources of truth**

| Concern | Location |
|--------|----------|
| **Recommended entry URLs** (new users / campaigns) | `src/config/authEntryRoutes.ts` (`AUTH_ENTRY_ROUTES`) |
| **Short auth aliases** (`/login`, `/builder/login`, …) | `src/config/authRouteAliases.ts` (`AUTH_ROUTE_ALIASES`) |
| **Legacy auth key string guard** | `npm run check:auth-keys` → `scripts/check-legacy-supabase-auth-key.mjs` |
| Route table | `src/App.tsx` (`<Routes>`) |
| Role-only pages | `RoleProtectedRoute` in `src/components/security/RoleProtectedRoute.tsx` (`allowedRoles`, `DASHBOARDS`) |
| Session required (any role) | `AuthRequired` in `src/components/security/AuthRequired.tsx` |
| Floating widgets hidden on auth UX | `shouldHideFloatingChrome` in `src/config/authChrome.ts` |
| RLS & schema | `supabase/migrations/` |

## Why both `/auth` and role-specific `*-auth` routes exist

- **`/` and `/auth`** — Primary entry; shared sign-in/register UX.
- **`/unified-auth`** — Optional unified entry (lazy-loaded page).
- **`*-auth` (private client, professional builder, supplier, delivery)** — Deep links, onboarding, or marketing can send users straight to a role-flavored screen without changing Supabase Auth itself (same JWT and `user_roles`).

Do not remove alternate auth URLs without a **redirect plan** for saved links and external campaigns.

## Route matrix (snapshot)

Guards: **Public** = no `AuthRequired`; **Session** = `AuthRequired`; **Role** = `RoleProtectedRoute` with listed roles.

| Path (pattern) | Guard | Allowed roles (if role guard) |
|----------------|-------|-------------------------------|
| `/`, `/auth` | Public | — |
| `/unified-auth` | Public | — |
| `/private-client-auth`, `/professional-builder-auth`, `/supplier-auth`, `/delivery-auth` | Public | — |
| `/admin-login` | Public | — |
| `/reset-password` | Public | — |
| `/home`, `/suppliers`, `/suppliers-mobile`, `/supplier-marketplace`, `/builders`, `/builder/:id`, `/about`, `/contact`, `/monitoring`, `/tracking`, `/delivery`, `/scanners`, `/feedback`, `/careers` | Public | — |
| `/privacy-policy`, `/terms-of-service` | Public | — |
| `/portal`, `/builder-registration`, `/delivery/apply` | Session | — |
| `/builders/register`, `/*-registration`, `/*-signin` (see `App.tsx`) | Public | — |
| `/analytics` | Role | `admin`, `super_admin` |
| `/admin-dashboard` | Role | `admin`, `super_admin` |
| `/supplier-dashboard` | Role | `supplier`, `admin` |
| `/delivery-dashboard`, `/delivery-receiving-scanner` | Role | `delivery`, `delivery_provider`, `admin` |
| `/private-client-dashboard` | Role | `private_client`, `admin` |
| `/professional-builder-dashboard` | Role | `professional_builder`, `builder`, `admin` |
| `/supplier-dispatch-scanner` | Role | `supplier`, `admin` |
| `/admin/*` shortcuts | Navigate | → `/admin-dashboard?tab=…` |
| `/builder-dashboard` | Navigate | **Legacy:** `private_client` → `/private-client-dashboard`; others → `/professional-builder-dashboard` (see `App.tsx`) |

When you add a route: update **`App.tsx`**, this table, and **`authChrome.ts`** if the page should hide floating chat/social.

## RLS alignment (release)

Client `RoleProtectedRoute` only improves UX; **authorization must hold in Postgres RLS** (and Edge Functions where used).

1. After migration deploy, sign in as a **non-admin test user** per role and confirm they cannot read/write other tenants’ data (see [OPS_RUNBOOK](./OPS_RUNBOOK.md) § merged checklist).
2. For new tables/RPCs, add policies in the same PR as the UI that calls them.
3. Prefer **SECURITY DEFINER RPCs** with explicit checks when listing cross-tenant data for operational roles (delivery provider, etc.) — review each function’s `auth.uid()` / membership checks.

## Dead code policy

Alternate implementations should not live under `src/` unless imported. Prefer **git history** over `*_NEW` / duplicate components; the canonical delivery notifications UI is `src/components/delivery/DeliveryNotifications.tsx` (barrel: `src/components/delivery/index.ts`).
