# 🏗️ UjenziXform — Construction marketplace platform

## 📋 Project overview

**UjenziXform** is a digital platform that connects builders with construction material suppliers across Kenya. The goal is to make sourcing, orders, delivery, and related workflows easier to run in one place.

### Scope and maintenance

This repository covers a **broad surface area** (marketplace, admin, delivery, monitoring, security tooling, and more). That supports a full product vision but increases maintenance cost. For production, **prioritize and harden the flows you actually ship**; not every module is equally mature. See [docs/MAINTENANCE_AND_SCOPE.md](docs/MAINTENANCE_AND_SCOPE.md) for a **module map**, storage/identity notes, and a **release checklist**.

### 🎯 **Mission**
*Kujenga Pamoja* - Building Together Across Kenya

### 🌟 **Vision**
To revolutionize Kenya's construction industry through digital innovation, transparency, and secure business connections.

## 🚀 **Key features** (by audience)

Capabilities exist in code across these areas; depth and polish vary by route and deployment configuration.

### **For builders** 🏗️
- Projects and material sourcing, supplier discovery
- Site monitoring (where cameras and RLS policies are configured)
- Delivery tracking and QR-related flows where enabled
- Budget and PO-related tooling (see app routes for current behavior)

### **For suppliers** 📦
- Orders, catalog/inventory patterns, analytics components
- Contact and approval flows tied to your Supabase policies

### **For administrators** 👨‍💼
- Admin dashboard, registrations, monitoring assignments, and operational tools
- Security-oriented panels and exports (depend on environment variables and backend setup)

## 🛡️ **Security (what the codebase is built for)**

Security is **defense in depth**: client practices, Supabase **Row Level Security (RLS)**, auth, and optional monitoring (e.g. Sentry) must be configured and reviewed for your environment.

- **Client-side**: Utilities for sensitive fields, session handling, CSP-related helpers (verify headers at the edge / host).
- **Database**: RLS policies in `supabase/migrations` — review and test with real roles before production.
- **Roles**: Admin, builder, supplier, and guest-style access are modeled in the app; exact permissions follow your policies and UI gates.
- **Compliance**: Kenya DPA 2019 / GDPR alignment requires **legal and operational** measures (privacy policy, data processing agreements, retention, breach process), not only application code. Treat in-repo security docs as **supporting material**, not a certification.

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development with comprehensive type coverage
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **shadcn/ui**: High-quality, accessible UI components
- **Vite**: Fast build tool and development server

### **Backend**
- **Supabase**: PostgreSQL database with real-time capabilities
- **Edge Functions**: Serverless functions for API endpoints
- **Row Level Security**: Database-level security policies
- **Real-time Subscriptions**: Live data updates and notifications

### **Security & monitoring**
- **Auth**: Supabase JWT; optional OAuth providers when enabled in the project
- **CSP / headers**: Helpers and scripts exist to test headers locally — confirm the same policies on your production host (e.g. Vercel)
- **Error reporting**: Optional Sentry integration when configured

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ and npm
- Git for version control
- Modern web browser

### **Installation**
```bash
# Clone the repository
git clone <YOUR_REPOSITORY_URL>

# Navigate to project directory
cd UjenziXform

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Environment Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Configure your environment variables
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional branding / links:
# VITE_SITE_URL=https://your-production-host
# VITE_SUPPORT_EMAIL=support@your-domain
# VITE_SOCIAL_INSTAGRAM_URL=...
# VITE_SOCIAL_TIKTOK_URL=...
```

## 📊 **Available Scripts**

### **Development**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **Security Testing**
```bash
npm run security:audit    # Run security audit
npm run security:test     # Run security tests
npm run security:headers  # Test security headers
npm run security:full     # Complete security test suite
```

## 🏗️ **Project Structure**

```
UjenziXform/
├── src/
│   ├── components/          # React components
│   │   ├── builders/        # Builder-specific components
│   │   ├── suppliers/       # Supplier-specific components
│   │   ├── security/        # Security components
│   │   └── monitoring/      # Monitoring components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
├── docs/                   # Documentation
│   └── security/           # Security documentation
└── scripts/                # Build and deployment scripts
```

## 🔐 **Security documentation**

In-repo docs describe intended controls and workflows. They are **not** a substitute for your own penetration test, threat model, or legal review.

- `COMPREHENSIVE_SECURITY_RATING_REPORT.md` — historical / narrative assessment (verify claims against current code)
- `DELIVERY_PROVIDER_ACCESS_RESTRICTIONS.md` — delivery access notes
- `BUILDER_MONITORING_ACCESS_GUIDE.md` — monitoring access
- `docs/security/incident-response-plan.md` — incident response draft

## ✅ **Verify quality locally** (reduce “unknowns” before release)

Nothing below replaces **production** monitoring (latency, errors, Core Web Vitals), but it gives a repeatable baseline:

| Check | Command / action |
|--------|------------------|
| Lint | `npm run lint` |
| Unit tests | `npm run test:run` |
| Production build | `npm run build` — catches many TS and bundling issues |
| Security scripts | `npm run security:test` and `npm run security:full` when you rely on them |
| Accessibility | Use browser DevTools / axe / Lighthouse on critical flows after deploy |
| Load / uptime | Measure on your host and Supabase tier; do not infer from this README |

Onboarding polish and per-screen a11y are best validated with **real user sessions** or a short scripted checklist on staging.

**CI:** Pushes and PRs to `main` run lint, unit tests, and production build (`.github/workflows/build-main.yml`).

## 📈 **Performance and analytics**

Latency, uptime, and user satisfaction **depend on hosting, database plan, traffic, and configuration**. Track them with your provider dashboards, Supabase metrics, and (if enabled) Sentry — do not treat marketing figures as guarantees.

## 🤝 **Contributing**

### **Development Guidelines**
- Follow TypeScript best practices
- Implement comprehensive security measures
- Maintain code quality and documentation
- Test all features thoroughly

### **Security Requirements**
- All new features must include security review
- Proper access controls and data protection
- Comprehensive audit logging
- Regular security testing and validation

## 📞 **Support and contact**

Use addresses and numbers that match **your live business and domain**. Some older paths, assets, or integration defaults in the repo may still reference the historical **MradiPro** name or `mradipro.*` hostnames; migrate those as you standardize on UjenziXform.

Example placeholders (replace with production values):

- **Support**: `support@ujenzixform.org`
- **Security**: `security@ujenzixform.org`
- **General**: `info@ujenzixform.org`

## 📄 **License**

This project is proprietary software owned by UjenziXform Ltd. All rights reserved.

## 🎉 **Acknowledgments**

Thanks to everyone contributing to the product and to the wider security and open-source communities whose tools this project builds on.

---

**UjenziXform** — *Kujenga Pamoja* (building together)

---

**Version**: 2.0  
**Last updated**: March 2026  
**Status**: Under active development — validate each release in your own environment before calling it “production ready.”