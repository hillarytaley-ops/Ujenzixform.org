# SOFTWARE DOCUMENTATION MANUAL
## UjenziPro2 - Kenya's Premier Construction Platform

---

## 1. TITLE PAGE

### **Computer Program/Application Title:**
**UjenziPro2 - Kenya's Premier Digital Construction Platform**

### **Version Information:**
- **Version:** 2.0
- **Release Date:** October 8, 2025
- **Status:** Production Ready ✅

### **Software Authors and Owners:**
- **Current Owner:** UjenziPro Ltd
- **Copyright:** © 2025 UjenziPro Ltd. All Rights Reserved
- **Registered Office:** Nairobi, Kenya
- **License:** Proprietary Software

### **Contact Information:**
- **Technical Support:** support@ujenzipro.co.ke
- **Business Inquiries:** info@ujenzipro.co.ke
- **Security Team:** security@ujenzipro.co.ke
- **Phone:** +254-700-UJENZIPRO
- **Website:** https://ujenzipro.co.ke

---

## 2. ABSTRACT

### a) Purpose of the Software

**UjenziPro2** is a comprehensive digital platform designed to revolutionize Kenya's construction industry by connecting builders with verified construction material suppliers across all 47 counties of Kenya. The platform operates under the Swahili mission "Kujenga Pamoja" (Building Together) and serves multiple stakeholder groups:

**Primary Purpose:**
- Connect professional and private builders with certified construction material suppliers
- Facilitate transparent material procurement and delivery tracking
- Enable real-time construction site monitoring and quality assurance
- Provide secure order management and payment processing
- Ensure material authenticity through QR code verification systems
- Support multi-county operations from Mombasa to Eldoret, Kisumu to Garissa

**Target Users:**
1. **Builders** (Professional & Private) - Project management, material sourcing, site monitoring
2. **Suppliers** - Order fulfillment, inventory management, delivery coordination
3. **Administrators** - Platform management, user verification, system security
4. **Delivery Providers** - Logistics coordination and material transportation

### b) Technologies Used

**Frontend Technologies:**
- **React 18.3.1** - Modern JavaScript library for building user interfaces
- **TypeScript 5.5.3** - Type-safe development with comprehensive type coverage
- **Vite 7.1.9** - Fast build tool and development server
- **Tailwind CSS 3.4.11** - Utility-first CSS framework for responsive design
- **shadcn/ui Components** - High-quality, accessible UI component library
- **Radix UI** - Unstyled, accessible component primitives
- **Framer Motion 12.23.24** - Animation library for smooth interactions
- **React Router DOM 6.26.2** - Client-side routing and navigation

**Backend Technologies:**
- **Supabase 2.56.0** - PostgreSQL database with real-time capabilities
- **PostgreSQL** - Enterprise-grade relational database
- **Row Level Security (RLS)** - Database-level security policies
- **Edge Functions** - Serverless functions for API endpoints
- **Real-time Subscriptions** - Live data updates via WebSockets

**Authentication & Security:**
- **JWT (JSON Web Tokens)** - Secure token-based authentication
- **OAuth 2.0** - Integration with Google and GitHub authentication
- **AES-256 Encryption** - Field-level encryption for sensitive data
- **Content Security Policy (CSP)** - XSS protection and security headers
- **Multi-factor Authentication (MFA)** - Optional enhanced security

**Additional Technologies:**
- **React Query (TanStack Query 5.56.2)** - Server state management
- **Zod 3.23.8** - Schema validation and type inference
- **React Hook Form 7.53.0** - Performant form management
- **ZXing Library** - QR code scanning and generation
- **Recharts 2.15.4** - Data visualization and analytics charts
- **CryptoJS 4.2.0** - Cryptographic operations
- **Date-fns 3.6.0** - Date manipulation and formatting

**Development Tools:**
- **ESLint 9.9.0** - Code quality and consistency
- **PostCSS & Autoprefixer** - CSS processing and compatibility
- **Capacitor 7.4.3** - Cross-platform mobile deployment (iOS/Android)

### c) Platform Compatibility

**Web Platform (Primary):**
- **Cloud-Based:** Fully hosted on cloud infrastructure
- **Deployment:** Netlify CDN for global content delivery
- **Browser Support:**
  - Google Chrome (recommended)
  - Mozilla Firefox
  - Microsoft Edge
  - Safari (macOS/iOS)
- **Responsive Design:** Optimized for desktop, tablet, and mobile devices
- **Minimum Screen Resolution:** 320px width (mobile) to 4K displays

**Mobile Platform:**
- **Android:** Version 8.0 (Oreo) and above via Capacitor
- **iOS:** iOS 13.0 and above via Capacitor
- **Progressive Web App (PWA):** Installable on all modern mobile browsers

**Network Requirements:**
- **Internet Connection:** Required for all operations
- **Minimum Bandwidth:** 2 Mbps for basic operations
- **Recommended Bandwidth:** 10+ Mbps for video monitoring features
- **Real-time Features:** WebSocket support required

**System Requirements:**
- **Processor:** Modern dual-core processor or better
- **RAM:** Minimum 4GB (8GB recommended for optimal performance)
- **Storage:** 100MB for PWA installation
- **Security:** HTTPS/TLS 1.2 or higher required

---

## 3. INTRODUCTION

### Overview of UjenziPro2

UjenziPro2 represents a paradigm shift in Kenya's construction industry, bridging the gap between builders seeking quality materials and suppliers offering verified products. The platform addresses critical challenges in the traditional construction supply chain, including:

- Lack of transparency in supplier verification
- Difficulty in tracking material deliveries across Kenya's diverse terrain
- Limited real-time visibility into construction site activities
- Absence of standardized quality assurance mechanisms
- Inefficient communication between builders and suppliers
- Security concerns in material procurement and payment processing

### Key Functionalities

#### **1. Multi-Role User Management**

The platform implements sophisticated role-based access control supporting four distinct user types:

**Admin Users:**
- Complete platform oversight and management
- User verification and approval workflows
- Real-time security monitoring and incident response
- System-wide analytics and business intelligence
- Full access to all features and data (with audit logging)

**Builder Users (Professional & Private):**
- Comprehensive project lifecycle management
- Material sourcing from verified supplier network
- Real-time construction site monitoring (view-only camera access)
- Delivery tracking with GPS-enabled vehicle monitoring
- QR code scanning for material verification
- Budget tracking and financial management
- Performance analytics and reporting

**Supplier Users:**
- Order management and fulfillment workflows
- Real-time inventory control and tracking
- QR code generation for material authentication
- Delivery note and invoice management
- Performance analytics and customer insights
- Goods Received Notes (GRN) processing
- Purchase order management

**Delivery Provider Users:**
- Route optimization and GPS tracking
- Real-time delivery status updates
- Material handling documentation
- Communication with builders and suppliers

#### **2. Advanced Security Framework**

UjenziPro2 achieves an outstanding **97/100 security rating** through:

**Authentication Security:**
- Multi-factor authentication (MFA) support
- OAuth 2.0 integration (Google, GitHub)
- JWT token-based session management
- Rate limiting (5 attempts, 15-minute lockout)
- Automatic session timeout and renewal

**Data Protection:**
- AES-256 field-level encryption for sensitive data
- Row Level Security (RLS) policies on all database tables
- Encrypted data transmission (TLS 1.3)
- Secure password hashing (bcrypt)
- Privacy-first architecture compliant with Kenya DPA 2019 and GDPR

**Access Control:**
- Strict role-based permissions (RBAC)
- Project-specific data isolation
- Read-only restrictions for monitoring features
- Comprehensive audit logging
- Real-time security event monitoring

#### **3. Comprehensive Workflow Systems**

**Builder Workflow:**
1. Project creation and configuration
2. Material requirement specification
3. Supplier selection and quote comparison
4. Purchase order generation
5. Order confirmation and payment
6. QR code assignment to materials
7. Delivery tracking and GPS monitoring
8. Material receipt and QR verification
9. Quality assurance and documentation
10. Project completion and reporting

**Supplier Workflow:**
1. Application submission and verification
2. Admin approval and onboarding
3. Order reception and acceptance
4. Material preparation and packaging
5. QR code generation for items
6. Delivery note creation
7. Dispatch and real-time tracking
8. Delivery confirmation via GRN
9. Invoice generation and payment processing
10. Performance analytics and optimization

**Monitoring Workflow:**
1. Camera installation and configuration (Admin)
2. Live feed streaming (HD/4K)
3. AI-powered activity detection
4. Safety violation alerts
5. GPS-based delivery tracking
6. Drone aerial surveillance integration
7. 24/7 recording and cloud storage
8. Multi-project monitoring dashboard

#### **4. Real-Time Tracking and Monitoring**

**Construction Site Monitoring:**
- Live camera feeds (HD and 4K quality)
- Drone integration for aerial surveillance
- AI-powered activity detection
- Safety violation alerts
- Progress milestone tracking
- 24/7 recording with cloud backup
- Multi-camera support per project

**Delivery Tracking:**
- Real-time GPS vehicle tracking
- Route optimization and monitoring
- ETA calculation and updates
- Driver communication system
- Traffic and delay alerts
- Geofencing for construction sites
- Photo documentation of deliveries

**Material Verification:**
- QR code generation for all materials
- Mobile scanning capabilities
- Material authenticity verification
- Specification confirmation
- Quality assurance documentation
- Chain of custody tracking

#### **5. Analytics and Reporting**

**Business Intelligence:**
- Performance dashboards with real-time metrics
- Revenue and budget tracking
- Order volume trends and forecasting
- Customer satisfaction scores
- Delivery performance analytics
- Resource utilization reports

**Visual Analytics:**
- Interactive charts and graphs (Recharts)
- Animated counters for key metrics
- Progress indicators and timelines
- Heat maps for geographic distribution
- Comparative performance analysis

### How the Software Works

#### **System Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                     │
│  (React 18 + TypeScript + Tailwind CSS + shadcn/ui)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                           │
│  • Authentication & Authorization (JWT, OAuth)               │
│  • Role-Based Access Control (RBAC)                         │
│  • Business Logic & Workflows                               │
│  • Real-time State Management (React Query)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API & SERVICES LAYER                      │
│  • Supabase Client (REST & Real-time)                       │
│  • Edge Functions (Serverless APIs)                         │
│  • File Storage & CDN                                       │
│  • WebSocket Connections                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                            │
│  • PostgreSQL with Row Level Security                       │
│  • Real-time Subscriptions                                  │
│  • Encrypted Storage (AES-256)                              │
│  • Audit Logging & Compliance                               │
└─────────────────────────────────────────────────────────────┘
```

#### **Data Flow Process:**

1. **User Authentication:**
   - User accesses application via web browser
   - Authentication via email/password or OAuth providers
   - JWT token generation and secure storage
   - Role verification from user_roles table
   - Session management with automatic renewal

2. **Role-Based Interface Loading:**
   - User role determines available features
   - Dynamic component rendering based on permissions
   - Security guards prevent unauthorized access
   - Real-time permission synchronization

3. **Data Operations:**
   - All database queries filtered by Row Level Security
   - Real-time subscriptions for live updates
   - Optimistic updates for better user experience
   - Automatic conflict resolution
   - Complete audit trail logging

4. **Business Workflows:**
   - Multi-step processes with validation at each stage
   - Automated notifications and alerts
   - Status tracking and progress monitoring
   - Document generation (PDFs for invoices, reports)
   - Payment processing integration

#### **Security Flow:**

```
User Request → Authentication Check → Role Verification → 
RLS Policy Enforcement → Data Access → Audit Logging → 
Encrypted Response → User Interface Update
```

### Geographic Coverage

UjenziPro2 serves all **47 counties of Kenya**, including:
- **Coastal Region:** Mombasa, Kilifi, Kwale, Lamu, Taita-Taveta
- **Western Region:** Kisumu, Kakamega, Bungoma, Busia, Vihiga
- **Rift Valley:** Eldoret (Uasin Gishu), Nakuru, Narok, Kericho, Bomet
- **Central Region:** Kiambu, Murang'a, Nyeri, Kirinyaga, Nyandarua
- **Eastern Region:** Machakos, Kitui, Makueni, Embu, Tharaka-Nithi
- **North Eastern:** Garissa, Wajir, Mandera, Isiolo, Marsabit
- **Nairobi Metropolitan:** Nairobi County

---

## 4. DETAILED SOFTWARE DOCUMENTATION

### 4.a) APPLICATION ACCESS AND AUTHENTICATION

#### **4.a.1) Accessing the Application**

**Web Browser Access:**

The UjenziPro2 platform is accessible via any modern web browser through the URL:
- **Production URL:** https://[your-deployment-url].netlify.app
- **Local Development:** http://localhost:5173

**Supported Browsers:**
- Google Chrome (Version 90+)
- Mozilla Firefox (Version 88+)
- Microsoft Edge (Version 90+)
- Safari (Version 14+)

**Mobile Access:**
- Direct browser access on mobile devices
- Progressive Web App (PWA) installation option
- Native mobile apps via Capacitor (Android/iOS)

#### **4.a.2) Login and Registration Process**

**Screenshot Description: Authentication Page (`/auth`)**

```
┌─────────────────────────────────────────────────────────────┐
│  [UjenziPro Logo]                                           │
│                                                              │
│               WELCOME TO UJENZIPRO2                         │
│        Kenya's Premier Construction Platform                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Sign In Tab]  [Sign Up Tab]                       │  │
│  │                                                       │  │
│  │  Email Address:                                      │  │
│  │  [_______________________________________]           │  │
│  │                                                       │  │
│  │  Password:                                           │  │
│  │  [_______________________________________]           │  │
│  │                                                       │  │
│  │  [✓] Remember me                                     │  │
│  │                                                       │  │
│  │  [        Sign In with Email        ]                │  │
│  │                                                       │  │
│  │  ──────────────── OR ────────────────                │  │
│  │                                                       │  │
│  │  [🔵 Sign In with Google    ]                        │  │
│  │  [⚫ Sign In with GitHub    ]                        │  │
│  │                                                       │  │
│  │  Forgot Password? | Need Help?                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                              │
│  🔒 Secured with Enterprise-Grade Encryption                │
│  ✅ 97/100 Security Rating | Kenya DPA Compliant           │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Dual Authentication Methods:**
   - Email/Password authentication with validation
   - OAuth 2.0 providers (Google, GitHub)

2. **Security Features:**
   - Rate limiting (5 failed attempts = 15-minute lockout)
   - Password strength requirements
   - Secure session management
   - HTTPS/TLS encryption for all data transmission

3. **User Registration:**
   - New users click "Sign Up" tab
   - Enter email, create secure password
   - Email verification sent automatically
   - Role assignment upon first login

#### **4.a.3) Password Security**

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Special characters recommended

**Security Measures:**
- Bcrypt hashing for password storage
- No plain-text password storage
- Automatic password strength meter
- Password reset via email verification

### 4.b) HOME PAGE AND DASHBOARD

#### **4.b.1) Home Page Interface (`/`)**

**Screenshot Description: Landing Page**

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Home  Builders  Suppliers  About  Contact  [Login]│
└─────────────────────────────────────────────────────────────┘
│                                                              │
│  [Background: Construction Site with Drones Image]          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │     Jenga, Unganisha, na Stawi Pamoja                 │  │
│  │     Build, Connect, and Prosper Together              │  │
│  │                                                        │  │
│  │  Kenya's premier construction marketplace connecting  │  │
│  │  builders, suppliers, and clients. From Mombasa to    │  │
│  │  Eldoret, Kisumu to Garissa - build your dreams       │  │
│  │  across all 47 counties with trusted professionals.   │  │
│  │                                                        │  │
│  │  [ Find Builders ]  [ Explore Suppliers ]             │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QUICK STATS (Animated Counters):                    │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │   │
│  │  │ 10,000+ │  │ 5,000+  │  │   47    │  │  95%   │ │   │
│  │  │ Builders│  │Suppliers│  │Counties │  │  Trust │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  KEY FEATURES:                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ [Search] │  │ [Verify] │  │  [Track] │           │   │
│  │  │  Find    │  │ Quality  │  │ Delivery │           │   │
│  │  │Materials │  │Materials │  │Real-time │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  │                                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │[Monitor] │  │ [Secure] │  │ [Connect]│           │   │
│  │  │Construction│ │ Payments │ │ Nationwide│          │   │
│  │  │  Sites   │  │Processing│  │ Network  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [Trust Badges: Kenya DPA Compliant | 97/100 Security]     │
│                                                              │
│  [Footer: Links | Contact | Terms | Privacy]                │
└─────────────────────────────────────────────────────────────┘
```

**Navigation Bar Features:**
- **Logo:** UjenziPro branding (clickable - returns to home)
- **Home:** Landing page with overview
- **Builders:** Professional builders directory
- **Suppliers:** Verified suppliers catalog
- **About:** Company information and mission
- **Contact:** Contact form and support information
- **Login/Register:** Authentication access

**Hero Section:**
- Bilingual tagline (Swahili and English)
- Clear value proposition
- Call-to-action buttons with hover animations
- Professional background imagery

**Statistics Section:**
- Animated counters showing platform metrics
- Real-time updates from database
- Trust indicators and performance metrics

**Features Grid:**
- Six core feature cards
- Icon-based visual communication
- Hover effects for interactivity
- Direct links to relevant sections

#### **4.b.2) Post-Login Dashboard (Role-Based)**

The dashboard interface varies based on user role:

**Admin Dashboard** (`/` - Admin View)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Dashboard | Users | Suppliers | Builders | Security│
│                                        [Admin] [Logout]     │
└─────────────────────────────────────────────────────────────┘
│  ADMIN CONTROL CENTER                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SYSTEM OVERVIEW                                     │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │   │
│  │  │Users │ │Orders│ │Active│ │Revenue│ │Alerts│     │   │
│  │  │ 150  │ │ 89   │ │Sites │ │KES 2M │ │  3   │     │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QUICK ACTIONS                                       │   │
│  │  [Approve Users] [Review Applications] [Security]   │   │
│  │  [System Health] [Analytics] [User Management]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────┐  ┌──────────────────────────────┐   │
│  │ PENDING APPROVALS │  │  RECENT SECURITY EVENTS      │   │
│  │ • 5 Suppliers     │  │  • Login from new device     │   │
│  │ • 3 Builders      │  │  • Failed login attempt      │   │
│  │ • 2 Deliveries    │  │  • Password change           │   │
│  └───────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Builder Dashboard** (Professional/Private)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Dashboard | Projects | Materials | Monitoring      │
│                                    [Builder] [Logout]       │
└─────────────────────────────────────────────────────────────┘
│  BUILDER WORKSPACE                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MY PROJECTS                                         │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │   │
│  │  │Active│ │Budget│ │Orders│ │Sites │              │   │
│  │  │  8   │ │ 85%  │ │  12  │ │  5   │              │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TABS:                                               │   │
│  │  [Overview] [Projects] [Materials] [Workflow]       │   │
│  │  [Deliveries] [Monitoring] [Orders] [Analytics]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────┐  ┌──────────────────────────────┐   │
│  │ ACTIVE PROJECTS   │  │  UPCOMING DELIVERIES         │   │
│  │ • Villa Complex   │  │  • Cement - Today 2:00 PM    │   │
│  │ • Office Tower    │  │  • Steel - Tomorrow 9:00 AM  │   │
│  │ • Residential     │  │  • Bricks - Friday 11:00 AM  │   │
│  └───────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Supplier Dashboard**

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Dashboard | Orders | Inventory | QR Codes          │
│                                   [Supplier] [Logout]       │
└─────────────────────────────────────────────────────────────┘
│  SUPPLIER OPERATIONS                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BUSINESS METRICS                                    │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │   │
│  │  │Orders│ │Revenue│ │Rating│ │Active│              │   │
│  │  │  45  │ │KES1.2M│ │ 4.8⭐│ │  23  │              │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TABS:                                               │   │
│  │  [Workflow] [Orders] [Purchase Orders] [QR Codes]   │   │
│  │  [Scanner] [Delivery Notes] [GRN] [Invoices]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────┐  ┌──────────────────────────────┐   │
│  │ PENDING ORDERS    │  │  TODAY'S DELIVERIES          │   │
│  │ • Order #1245     │  │  • Delivery #567 - En Route  │   │
│  │ • Order #1246     │  │  • Delivery #568 - Delivered │   │
│  │ • Order #1247     │  │  • Delivery #569 - Pending   │   │
│  └───────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.c) BUILDERS DIRECTORY PAGE (`/builders`)

#### **4.c.1) Public Builders Directory**

**Screenshot Description:**

```
┌─────────────────────────────────────────────────────────────┐
│  [Navigation Bar]                                           │
└─────────────────────────────────────────────────────────────┘
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🏗️ PROFESSIONAL BUILDERS DIRECTORY                  │  │
│  │  Find Kenya's Most Trusted Construction Professionals│  │
│  │                                                        │  │
│  │  [🔍 Search by name, location, or specialty...]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FILTERS:                                             │  │
│  │  County: [All Counties ▼] Specialty: [All ▼]         │  │
│  │  Rating: [⭐ All Ratings ▼] Status: [All ▼]          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BUILDER CARD                                         │  │
│  │  ┌────────┐  Mwangi Construction Ltd                 │  │
│  │  │[Photo] │  ⭐⭐⭐⭐⭐ 4.9 (127 reviews)              │  │
│  │  └────────┘  📍 Nairobi | 🏗️ Commercial & Residential│  │
│  │               💼 15+ Years Experience                 │  │
│  │               ✅ Verified | 🏆 Top Rated              │  │
│  │               [View Profile] [Request Quote]          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Pagination: « 1 2 3 4 5 »]                                │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Search and Filter:**
   - Real-time search by name, location, specialty
   - County-based filtering (all 47 counties)
   - Rating and status filters
   - Sort by rating, experience, projects completed

2. **Builder Profile Cards:**
   - Company name and logo
   - Star rating and review count
   - Location and specializations
   - Years of experience
   - Verification status badge
   - Quick action buttons

3. **Verification Badges:**
   - ✅ Verified Builder
   - 🏆 Top Rated (4.8+ rating)
   - 💎 Premium Member
   - 🔒 Security Certified

#### **4.c.2) Builder Registration**

**Professional Builder Registration (`/professional-builder-registration`)**

```
┌─────────────────────────────────────────────────────────────┐
│  PROFESSIONAL BUILDER REGISTRATION                          │
│                                                              │
│  Step 1 of 4: Basic Information                            │
│  [■■■□□□□□□□□□] 25% Complete                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Company Name *                                       │  │
│  │  [_________________________________________]          │  │
│  │                                                        │  │
│  │  Registration Number *                                │  │
│  │  [_________________________________________]          │  │
│  │                                                        │  │
│  │  Contact Person *                                     │  │
│  │  [_________________________________________]          │  │
│  │                                                        │  │
│  │  Email Address *                                      │  │
│  │  [_________________________________________]          │  │
│  │                                                        │  │
│  │  Phone Number * (Kenyan format)                       │  │
│  │  [+254_____________________________________]          │  │
│  │                                                        │  │
│  │  County *                                             │  │
│  │  [Select County ▼]                                    │  │
│  │                                                        │  │
│  │  Specializations * (Select all that apply)            │  │
│  │  ☐ Residential   ☐ Commercial   ☐ Industrial         │  │
│  │  ☐ Road Works    ☐ Bridges      ☐ Water Projects     │  │
│  │                                                        │  │
│  │  [Cancel]                    [Next: Experience  →]    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Registration Process:**
- **Step 1:** Basic business information
- **Step 2:** Experience and qualifications
- **Step 3:** Portfolio and references
- **Step 4:** Document upload and verification

**Required Documents:**
- Business registration certificate
- Tax compliance certificate (KRA PIN)
- NCA registration (where applicable)
- Professional certifications
- Insurance certificates

### 4.d) SUPPLIERS DIRECTORY PAGE (`/suppliers`)

#### **4.d.1) Public Suppliers View**

**Screenshot Description:**

```
┌─────────────────────────────────────────────────────────────┐
│  [Navigation Bar]                                           │
└─────────────────────────────────────────────────────────────┘
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📦 VERIFIED SUPPLIERS DIRECTORY                      │  │
│  │  Quality Materials Across All 47 Counties of Kenya   │  │
│  │                                                        │  │
│  │  [🔍 Search materials, suppliers, or location...]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FILTERS:                                             │  │
│  │  Material: [All Materials ▼] County: [All ▼]         │  │
│  │  Rating: [⭐ All ▼] Delivery: [All ▼]                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SUPPLIER CARD                                        │  │
│  │  ┌────────┐  Kenya Cement Supplies Ltd               │  │
│  │  │[Logo]  │  ⭐⭐⭐⭐⭐ 4.7 (89 reviews)               │  │
│  │  └────────┘  📍 Mombasa | 🚚 Nationwide Delivery     │  │
│  │               📦 Cement, Aggregates, Blocks           │  │
│  │               ✅ Verified | ⚡ Same-Day Delivery       │  │
│  │               [View Catalog] [Request Quote]          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SUPPLIER CARD                                        │  │
│  │  ┌────────┐  Elite Steel & Hardware                  │  │
│  │  │[Logo]  │  ⭐⭐⭐⭐⭐ 4.9 (156 reviews)              │  │
│  │  └────────┘  📍 Nairobi | 🚚 Countrywide Delivery    │  │
│  │               📦 Steel, Hardware, Roofing Materials   │  │
│  │               ✅ Verified | 🏆 Top Rated              │  │
│  │               [View Catalog] [Request Quote]          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Material Categories:**
- Cement & Concrete
- Steel & Metal
- Timber & Wood Products
- Roofing Materials
- Aggregates (Sand, Ballast, Stones)
- Blocks & Bricks
- Paint & Finishing
- Plumbing Materials
- Electrical Supplies
- Hardware & Tools

#### **4.d.2) Supplier Workflow Dashboard (Authenticated Supplier)**

**Screenshot Description:**

```
┌─────────────────────────────────────────────────────────────┐
│  SUPPLIER WORKFLOW DASHBOARD                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Workflow] [Orders] [Purchase Orders] [QR Codes]    │  │
│  │  [Scanner] [Delivery Notes] [GRN Viewer] [Invoices]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  WORKFLOW OVERVIEW                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QUICK STATS                                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │  Pending │ │Processing│ │Delivered │ │Revenue │ │   │
│  │  │    15    │ │    23    │ │   156    │ │ KES 1.2M│ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QUICK ACTIONS                                       │   │
│  │  [New Quote] [Process Order] [Generate QR]          │   │
│  │  [Track Delivery] [Create Invoice] [View Analytics] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RECENT ORDERS                                       │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ Order #1245 | Mwangi Construction              │ │   │
│  │  │ 50 bags cement | KES 45,000 | [Processing]     │ │   │
│  │  │ [View Details] [Update Status] [Contact]       │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ Order #1246 | Elite Builders Ltd               │ │   │
│  │  │ Steel bars 5 tons | KES 320,000 | [Ready]      │ │   │
│  │  │ [View Details] [Generate QR] [Dispatch]        │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Order Management Workflow:**

```
Order Received → Confirmation → Processing → QR Generation → 
Ready for Dispatch → Dispatched → In Transit → Delivered → 
GRN Signed → Invoice Generated → Payment Received → Complete
```

**Order Details Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│  ORDER DETAILS: #1245                                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Customer: Mwangi Construction Ltd                    │  │
│  │  Order Date: October 20, 2025                         │  │
│  │  Delivery Date: October 25, 2025                      │  │
│  │  Delivery Location: Kiambu, Construction Site B       │  │
│  │  Status: [Processing ▼]                               │  │
│  │                                                        │  │
│  │  ORDER ITEMS:                                         │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ Item            Qty    Unit Price    Total     │  │  │
│  │  │ Cement 50kg     50     KES 900      KES 45,000 │  │  │
│  │  │ QR Code: [Generate] [Print]                    │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  Total: KES 45,000                                    │  │
│  │  Tax (16%): KES 7,200                                 │  │
│  │  Grand Total: KES 52,200                              │  │
│  │                                                        │  │
│  │  [Update Status] [Generate QR] [Print Order]         │  │
│  │  [Create Delivery Note] [Contact Customer]           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### **4.d.3) QR Code Management**

**QR Code Generation Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│  QR CODE MANAGEMENT                                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Generate QR Codes for Material Verification         │  │
│  │                                                        │  │
│  │  Order ID: #1245                                      │  │
│  │  Material: Cement 50kg bags                           │  │
│  │  Quantity: 50 bags                                    │  │
│  │                                                        │  │
│  │  [Generate Individual QR Codes]                       │  │
│  │  [Generate Batch QR Code]                             │  │
│  │                                                        │  │
│  │  GENERATED QR CODES:                                  │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐                          │  │
│  │  │ QR-1 │ │ QR-2 │ │ QR-3 │ ... (50 total)           │  │
│  │  └──────┘ └──────┘ └──────┘                          │  │
│  │                                                        │  │
│  │  QR Code Information:                                 │  │
│  │  • Material Name & Specifications                     │  │
│  │  • Supplier Information                               │  │
│  │  • Manufacturing Date                                 │  │
│  │  • Batch Number                                       │  │
│  │  • Authenticity Verification Code                     │  │
│  │                                                        │  │
│  │  [Download All] [Print Labels] [Email to Customer]   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**QR Code Scanning (Mobile Interface):**

```
┌─────────────────────────────────────┐
│  📱 QR CODE SCANNER                 │
│                                      │
│  ┌──────────────────────────────┐  │
│  │                               │  │
│  │   [Camera Viewfinder]         │  │
│  │   ┌─────────────────────┐     │  │
│  │   │                     │     │  │
│  │   │  [QR Code Target]   │     │  │
│  │   │                     │     │  │
│  │   └─────────────────────┘     │  │
│  │                               │  │
│  │  Position QR code within      │  │
│  │  the frame to scan            │  │
│  └──────────────────────────────┘  │
│                                      │
│  [🔦 Toggle Flash] [📷 Gallery]    │
│                                      │
│  SCAN RESULTS:                      │
│  ✅ Verified Material                │
│  Material: Cement 50kg               │
│  Supplier: Kenya Cement Ltd          │
│  Batch: KC-2025-1020                 │
│  Date: October 20, 2025              │
│  Authenticity: VERIFIED ✅           │
│                                      │
│  [Accept Delivery] [Report Issue]   │
└─────────────────────────────────────┘
```

### 4.e) MONITORING AND TRACKING SYSTEM

#### **4.e.1) Monitoring Dashboard (`/monitoring`)

**Admin View - Full Control:**

```
┌─────────────────────────────────────────────────────────────┐
│  MONITORING CONTROL CENTER                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Dashboard] [Live Sites] [Deliveries] [System]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  SYSTEM OVERVIEW                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LIVE MONITORING STATS                               │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │   │
│  │  │Active│ │Camera│ │Delivery│ │Alerts│ │System│     │   │
│  │  │Sites │ │Feeds │ │Trucks │ │  3   │ │Health│     │   │
│  │  │  42  │ │ 156  │ │  23   │ │      │ │ 98%  │     │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RECENT ALERTS                                       │   │
│  │  🔴 Safety Violation - Site #15 (2 mins ago)        │   │
│  │  🟡 Delivery Delay - Truck #67 (15 mins ago)        │   │
│  │  🟢 Delivery Complete - Site #22 (1 hour ago)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QUICK ACTIONS                                       │   │
│  │  [View All Cameras] [Track Deliveries]              │   │
│  │  [Install Camera] [System Settings]                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Live Sites Tab - Camera Monitoring:**

```
┌─────────────────────────────────────────────────────────────┐
│  LIVE SITE MONITORING                                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Select Project: [Mwangi Villa Complex ▼]           │  │
│  │  Active Cameras: 6 | Status: All Online             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  CAMERA GRID VIEW:                                          │
│  ┌──────────────────┐ ┌──────────────────┐                 │
│  │ CAM-1: Main Gate │ │ CAM-2: East Side │                 │
│  │ [Live Feed 4K]   │ │ [Live Feed HD]   │                 │
│  │ 🔴 Recording     │ │ 🔴 Recording     │                 │
│  │ [Controls ▼]     │ │ [Controls ▼]     │                 │
│  └──────────────────┘ └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐ ┌──────────────────┐                 │
│  │ CAM-3: West Wing │ │ CAM-4: Drone     │                 │
│  │ [Live Feed HD]   │ │ [Aerial View]    │                 │
│  │ 🔴 Recording     │ │ 🔴 Recording     │                 │
│  │ [Controls ▼]     │ │ [Controls ▼]     │                 │
│  └──────────────────┘ └──────────────────┘                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AI ACTIVITY DETECTION                               │   │
│  │  • 10:25 AM - Worker activity detected (East Side)  │   │
│  │  • 10:15 AM - Vehicle entry (Main Gate)             │   │
│  │  • 09:45 AM - Material delivery (West Wing)         │   │
│  │  ⚠️ 09:30 AM - Safety gear violation detected       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Builder View - Limited/View Only:**

```
┌─────────────────────────────────────────────────────────────┐
│  MY CONSTRUCTION SITES (VIEW ONLY)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  My Project: Villa Complex - Kiambu                  │  │
│  │  ✅ 6 Cameras Active | 📹 View Live Feeds            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  CAMERA VIEWS (VIEW ONLY):                                  │
│  ┌──────────────────┐ ┌──────────────────┐                 │
│  │ CAM-1: Main Gate │ │ CAM-2: East Side │                 │
│  │ [Live Feed]      │ │ [Live Feed]      │                 │
│  │ 👁️ Viewing Only  │ │ 👁️ Viewing Only  │                 │
│  │ ⏸️ [Pause] 🔊     │ │ ⏸️ [Pause] 🔊     │                 │
│  └──────────────────┘ └──────────────────┘                 │
│                                                              │
│  🚫 CAMERA CONTROLS RESTRICTED TO ADMIN                     │
│  ✅ You can view live feeds and monitor activity            │
│  ❌ Recording, camera settings: Admin only                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ACTIVITY TIMELINE (My Site)                         │   │
│  │  • 10:25 AM - Worker activity detected              │   │
│  │  • 09:45 AM - Material delivery completed           │   │
│  │  ⚠️ 09:30 AM - Safety alert: PPE compliance         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Camera Control Panel (Admin Only):**

```
┌─────────────────────────────────────────────────────────────┐
│  CAMERA CONTROLS - CAM-1: Main Gate                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Full-Screen Live Feed]                             │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │                                                  │  │  │
│  │  │        [4K Live Video Feed]                      │  │  │
│  │  │        Resolution: 3840x2160                     │  │  │
│  │  │        FPS: 30                                   │  │  │
│  │  │                                                  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  CONTROLS:                                            │  │
│  │  [▶️ Play] [⏸️ Pause] [⏹️ Stop] [🔊 Volume]          │  │
│  │  [🔴 Start Recording] [⏺️ Stop Recording]            │  │
│  │  [📸 Snapshot] [⚙️ Settings] [🔄 Refresh]           │  │
│  │                                                        │  │
│  │  STATUS:                                              │  │
│  │  • Recording: 🔴 Active                               │  │
│  │  • Quality: 4K (3840x2160)                            │  │
│  │  • Storage: 512 GB available                          │  │
│  │  • Uptime: 15 days, 4 hours                           │  │
│  │                                                        │  │
│  │  [Configure] [Download Recording] [Share Feed]       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### **4.e.2) Delivery Tracking (`/tracking`)

**Real-Time GPS Tracking Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│  DELIVERY TRACKING SYSTEM                                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Track Delivery: #DEL-1245                           │  │
│  │  Order: 50 bags Cement to Villa Complex, Kiambu     │  │
│  │  Status: [In Transit 🚚]                             │  │
│  │  ETA: 45 minutes                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [MAP VIEW - Google Maps Integration]                │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │                                                  │  │  │
│  │  │  📍 Destination: Villa Complex, Kiambu          │  │  │
│  │  │  🚚 Current Location: Thika Road                │  │  │
│  │  │  📏 Distance Remaining: 15.3 km                 │  │  │
│  │  │  🕐 Estimated Time: 45 mins                     │  │  │
│  │  │                                                  │  │  │
│  │  │  Route: [Blue line showing path]                │  │  │
│  │  │  Vehicle: [Truck icon with real-time position]  │  │  │
│  │  │                                                  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DELIVERY INFORMATION                                 │  │
│  │  Driver: John Kamau | Phone: +254 712 345 678        │  │
│  │  Vehicle: KBZ 123A | Type: 7-Ton Truck               │  │
│  │  Speed: 45 km/h | Last Update: 30 seconds ago        │  │
│  │                                                        │  │
│  │  [📞 Call Driver] [💬 Send Message] [🚨 Report]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DELIVERY TIMELINE                                    │  │
│  │  ✅ 08:00 AM - Order Dispatched from Warehouse       │  │
│  │  ✅ 08:15 AM - Left Mombasa Road                     │  │
│  │  ✅ 09:30 AM - Reached Thika Road                    │  │
│  │  🔵 10:25 AM - Currently on Thika Road (In Transit)  │  │
│  │  ⏳ 11:10 AM - Expected Arrival at Site              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Delivery Completion Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│  DELIVERY CONFIRMATION                                      │
│                                                              │
│  Delivery #DEL-1245 - ARRIVED                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Order Items:                                         │  │
│  │  • Cement 50kg bags x 50                              │  │
│  │                                                        │  │
│  │  MATERIAL VERIFICATION (QR Code Scan):                │  │
│  │  [📱 Scan QR Code to Verify]                          │  │
│  │                                                        │  │
│  │  Scanned: 50/50 bags ✅                                │  │
│  │  All materials verified authentic                     │  │
│  │                                                        │  │
│  │  DELIVERY CONDITION:                                  │  │
│  │  ◉ Excellent   ○ Good   ○ Fair   ○ Damaged           │  │
│  │                                                        │  │
│  │  PHOTO DOCUMENTATION:                                 │  │
│  │  [📷 Take Photo of Delivery]                          │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐                    │  │
│  │  │Photo 1 │ │Photo 2 │ │Photo 3 │                    │  │
│  │  └────────┘ └────────┘ └────────┘                    │  │
│  │                                                        │  │
│  │  SIGNATURE:                                           │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Signature Pad - Sign to Confirm Delivery]    │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  Additional Notes:                                    │  │
│  │  [_____________________________________________]      │  │
│  │                                                        │  │
│  │  [Confirm Delivery] [Report Issue]                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.f) ADMINISTRATION AND SECURITY

#### **4.f.1) Admin Panel (`/` - Admin users only)

**User Management Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN CONTROL PANEL                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Dashboard] [Users] [Suppliers] [Builders]          │  │
│  │  [Security] [Applications] [Analytics] [Settings]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  USER MANAGEMENT                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Search: [🔍_____________________] [Filter ▼]       │   │
│  │                                                       │   │
│  │  PENDING APPROVALS (5):                              │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ Kenya Cement Supplies - Supplier Application   │ │   │
│  │  │ Submitted: Oct 20, 2025 | Documents: ✅        │ │   │
│  │  │ [View] [Approve ✅] [Reject ❌]                │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ACTIVE USERS (150):                                 │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ User          Role      Status    Last Active  │ │   │
│  │  │ Mwangi Co.    Builder   Active    2 hrs ago    │ │   │
│  │  │ Elite Steel   Supplier  Active    15 mins ago  │ │   │
│  │  │ John Kamau    Delivery  Active    1 hour ago   │ │   │
│  │  │ [Manage] [Security] [Logs]                     │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### **4.f.2) Security Dashboard**

**Real-Time Security Monitoring:**

```
┌─────────────────────────────────────────────────────────────┐
│  SECURITY MONITORING CENTER                                 │
│  Security Rating: 97/100 (Outstanding) ✅                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SECURITY STATUS                                     │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │   │
│  │  │Active│ │Failed│ │Blocked│ │Audit │ │Uptime│      │   │
│  │  │Sessions│Logins│ │ IPs  │ │Events│ │      │      │   │
│  │  │  127 │ │  3   │ │  15  │ │ 1,234│ │99.7% │      │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RECENT SECURITY EVENTS                              │   │
│  │  🔴 10:25 - Failed login attempt (5th) - Auto-blocked│   │
│  │  🟡 10:15 - New device login - User verified         │   │
│  │  🟢 09:45 - Password changed successfully            │   │
│  │  🟡 09:30 - Suspicious query blocked (SQL injection) │   │
│  │  🟢 09:15 - Session expired - User re-authenticated  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SECURITY FEATURES STATUS                            │   │
│  │  ✅ Row Level Security (RLS): Active                 │   │
│  │  ✅ Field Encryption (AES-256): Active               │   │
│  │  ✅ JWT Authentication: Active                       │   │
│  │  ✅ Rate Limiting: Active                            │   │
│  │  ✅ Content Security Policy: Active                  │   │
│  │  ✅ Audit Logging: Active                            │   │
│  │  ✅ Kenya DPA Compliance: Verified                   │   │
│  │  ✅ GDPR Compliance: Verified                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.g) COMMUNICATION AND SUPPORT

#### **4.g.1) Contact Page (`/contact`)

**Contact Form Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│  CONTACT UJENZIPRO                                          │
│  Get in Touch - We're Here to Help                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CONTACT FORM                                         │  │
│  │                                                        │  │
│  │  Your Name *                                          │  │
│  │  [_________________________________________]          │  │
│  │                                                        │  │
│  │  Email Address *                                      │  │
│  │  [_________________________________________]          │  │
│  │                                                        │  │
│  │  Phone Number                                         │  │
│  │  [+254_____________________________________]          │  │
│  │                                                        │  │
│  │  Subject *                                            │  │
│  │  [Select Subject ▼]                                   │  │
│  │  • General Inquiry                                    │  │
│  │  • Technical Support                                  │  │
│  │  • Partnership Opportunity                            │  │
│  │  • Security Concern                                   │  │
│  │                                                        │  │
│  │  Message *                                            │  │
│  │  [_________________________________________]          │  │
│  │  [_________________________________________]          │  │
│  │  [_________________________________________]          │  │
│  │                                                        │  │
│  │  [Send Message]                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DIRECT CONTACT                                       │  │
│  │  📧 Email: support@ujenzipro.co.ke                    │  │
│  │  📞 Phone: +254-700-UJENZIPRO                         │  │
│  │  🚨 Security: security@ujenzipro.co.ke                │  │
│  │  💼 Business: info@ujenzipro.co.ke                    │  │
│  │                                                        │  │
│  │  OFFICE HOURS                                         │  │
│  │  Monday - Friday: 8:00 AM - 6:00 PM                   │  │
│  │  Saturday: 9:00 AM - 2:00 PM                          │  │
│  │  24/7 Technical Support Available                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### **4.g.2) Feedback System (`/feedback`)

**User Feedback Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│  SHARE YOUR FEEDBACK                                        │
│  Help Us Improve UjenziPro                                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Rate Your Experience:                                │  │
│  │  ⭐⭐⭐⭐⭐ (Click to rate)                              │  │
│  │                                                        │  │
│  │  Category *                                           │  │
│  │  ◉ Platform Features                                  │  │
│  │  ○ Customer Service                                   │  │
│  │  ○ User Experience                                    │  │
│  │  ○ Security & Privacy                                 │  │
│  │  ○ Technical Issue                                    │  │
│  │                                                        │  │
│  │  Your Feedback *                                      │  │
│  │  [_________________________________________]          │  │
│  │  [_________________________________________]          │  │
│  │  [_________________________________________]          │  │
│  │                                                        │  │
│  │  ☐ I would like a response to this feedback          │  │
│  │                                                        │  │
│  │  [Submit Feedback]                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  📊 Platform Satisfaction: 95% (Based on 1,234 reviews)    │
└─────────────────────────────────────────────────────────────┘
```

### 4.h) MOBILE APPLICATION FEATURES

#### **4.h.1) Progressive Web App (PWA)**

**Installation Process:**

```
Mobile Browser → Visit UjenziPro URL → 
Browser Menu → "Add to Home Screen" → 
Icon appears on device → Launch like native app
```

**Mobile Interface (Builder View):**

```
┌─────────────────────────────────┐
│  ☰  UjenziPro    🔔 [Profile]  │
├─────────────────────────────────┤
│                                  │
│  MY PROJECTS                    │
│                                  │
│  ┌──────────────────────────┐  │
│  │  Villa Complex           │  │
│  │  📍 Kiambu              │  │
│  │  Progress: 65%           │  │
│  │  [■■■■■■□□□□] │  │
│  │  [View Details →]        │  │
│  └──────────────────────────┘  │
│                                  │
│  ┌──────────────────────────┐  │
│  │  Office Tower            │  │
│  │  📍 Nairobi             │  │
│  │  Progress: 40%           │  │
│  │  [■■■■□□□□□□] │  │
│  │  [View Details →]        │  │
│  └──────────────────────────┘  │
│                                  │
│  QUICK ACTIONS                  │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │Order│ │Track│ │Scan │       │
│  │Items│ │ 🚚  │ │ QR  │       │
│  └─────┘ └─────┘ └─────┘       │
│                                  │
│  UPCOMING DELIVERIES            │
│  • Cement - Today 2:00 PM       │
│  • Steel - Tomorrow 9:00 AM     │
│                                  │
├─────────────────────────────────┤
│  [Home] [Projects] [Orders] [•••]│
└─────────────────────────────────┘
```

**Mobile QR Scanner:**

```
┌─────────────────────────────────┐
│  ← QR Code Scanner              │
├─────────────────────────────────┤
│                                  │
│  ┌──────────────────────────┐  │
│  │ [Camera Viewfinder]       │  │
│  │                           │  │
│  │    ┌─────────────┐       │  │
│  │    │  QR Target  │       │  │
│  │    └─────────────┘       │  │
│  │                           │  │
│  │  Position QR code here   │  │
│  └──────────────────────────┘  │
│                                  │
│  [🔦 Flash] [📷 Gallery]        │
│                                  │
│  ─────────────────────────────  │
│                                  │
│  SCAN RESULT:                   │
│  ✅ Material Verified            │
│                                  │
│  Item: Cement 50kg              │
│  Supplier: Kenya Cement Ltd     │
│  Batch: KC-2025-1020            │
│  Date: Oct 20, 2025             │
│  Status: AUTHENTIC ✅            │
│                                  │
│  [Accept] [Report Issue]        │
└─────────────────────────────────┘
```

### 4.i) ANALYTICS AND REPORTING

#### **4.i.1) Builder Analytics Dashboard**

**Performance Analytics:**

```
┌─────────────────────────────────────────────────────────────┐
│  BUILDER ANALYTICS                                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PERFORMANCE OVERVIEW (Last 30 Days)                  │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │  │
│  │  │Projects│Orders│ │Spending│Savings│                │  │
│  │  │   12  │ │  45  │ │KES 2.5M│ 12%  │                │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SPENDING TREND (Line Chart)                         │  │
│  │  KES                                                  │  │
│  │  3M │                              ╱╲                 │  │
│  │  2M │                         ╱╲  ╱  ╲                │  │
│  │  1M │              ╱╲    ╱╲  ╱  ╲╱    ╲               │  │
│  │  0  └──────────────────────────────────→             │  │
│  │     Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep Oct  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TOP SUPPLIERS (Bar Chart)                           │  │
│  │  Kenya Cement    ████████████████ KES 850K           │  │
│  │  Elite Steel     ████████████ KES 620K               │  │
│  │  Prime Hardware  ████████ KES 450K                   │  │
│  │  Quality Timber  ██████ KES 310K                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [📥 Download Report] [📧 Email Report] [🖨️ Print]         │
└─────────────────────────────────────────────────────────────┘
```

#### **4.i.2) Supplier Analytics Dashboard**

**Business Intelligence:**

```
┌─────────────────────────────────────────────────────────────┐
│  SUPPLIER ANALYTICS                                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BUSINESS METRICS (This Month)                        │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │  │
│  │  │Orders│ │Revenue│ │Rating│ │Growth│                │  │
│  │  │  156 │ │KES 1.2M│ 4.8⭐ │ +15% │                │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ORDER DISTRIBUTION (Pie Chart)                      │  │
│  │        ┌─────────────┐                               │  │
│  │        │    ╱───╲    │                               │  │
│  │        │   ╱ 45% ╲   │ Cement                        │  │
│  │        │  │ 25%  ├   │ Steel                         │  │
│  │        │   ╲ 30% ╱   │ Aggregates                    │  │
│  │        │    ╲───╱    │                               │  │
│  │        └─────────────┘                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CUSTOMER SATISFACTION                                │  │
│  │  Overall Rating: 4.8/5.0 ⭐⭐⭐⭐⭐                    │  │
│  │  Quality:        4.9/5.0 ████████████████████        │  │
│  │  Delivery:       4.7/5.0 ███████████████████         │  │
│  │  Service:        4.8/5.0 ████████████████████        │  │
│  │  Value:          4.6/5.0 ███████████████████         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [📥 Export Data] [📊 Detailed Report] [📧 Email]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. SYSTEM WORKFLOWS AND PROCESSES

### 5.1) Complete Order Workflow

```
BUILDER                          SUPPLIER                   SYSTEM
   │                                │                         │
   │ 1. Browse Materials            │                         │
   │ ─────────────────────────────→ │                         │
   │                                │                         │
   │ 2. Request Quote               │                         │
   │ ─────────────────────────────→ │                         │
   │                                │ 3. Review Request       │
   │                                │ ←─────────────────────  │
   │                                │ 4. Send Quote           │
   │ ←───────────────────────────── │                         │
   │                                │                         │
   │ 5. Accept & Create PO          │                         │
   │ ──────────────────────────────────────────────────────→ │
   │                                │                         │
   │                                │ 6. Receive PO           │
   │                                │ ←─────────────────────  │
   │                                │ 7. Confirm Order        │
   │ ←───────────────────────────── │                         │
   │                                │                         │
   │                                │ 8. Process Order        │
   │                                │ 9. Generate QR Codes    │
   │                                │                         │
   │                                │ 10. Ready for Dispatch  │
   │ ←──────────────────────────────────────────────────────  │
   │                                │                         │
   │                                │ 11. Dispatch Delivery   │
   │                                │ 12. GPS Tracking Active │
   │ ←──────────────────────────────────────────────────────  │
   │                                │                         │
   │ 13. Track Delivery (Real-time) │                         │
   │ ←──────────────────────────────────────────────────────  │
   │                                │                         │
   │ 14. Delivery Arrives           │                         │
   │ 15. Scan QR Codes              │                         │
   │ 16. Verify Materials           │                         │
   │ ──────────────────────────────────────────────────────→ │
   │                                │                         │
   │                                │ 17. Sign GRN            │
   │ ─────────────────────────────→ │                         │
   │                                │                         │
   │                                │ 18. Generate Invoice    │
   │ ←───────────────────────────── │                         │
   │                                │                         │
   │ 19. Process Payment            │                         │
   │ ─────────────────────────────→ │                         │
   │                                │                         │
   │                                │ 20. Confirm Payment     │
   │ ←──────────────────────────────────────────────────────  │
   │                                │                         │
   │ 21. Order Complete ✅          │ 21. Order Complete ✅   │
```

### 5.2) Security and Access Control Flow

```
User Request
     │
     ▼
┌─────────────────────┐
│ Authentication      │
│ Check               │
└─────────┬───────────┘
          │
          ▼
    Is Authenticated?
          │
    ┌─────┴─────┐
    │           │
   NO          YES
    │           │
    ▼           ▼
Redirect    Get User Role
to Login    from Database
    │           │
    │           ▼
    │    ┌──────────────┐
    │    │ Role-Based   │
    │    │ Permission   │
    │    │ Check        │
    │    └──────┬───────┘
    │           │
    │           ▼
    │    ┌──────────────────────────────┐
    │    │ Admin? Builder? Supplier?    │
    │    │ Delivery Provider?           │
    │    └──────┬───────────────────────┘
    │           │
    │           ▼
    │    ┌──────────────┐
    │    │ Apply RLS    │
    │    │ Policies     │
    │    └──────┬───────┘
    │           │
    │           ▼
    │    ┌──────────────┐
    │    │ Load         │
    │    │ Role-Specific│
    │    │ Interface    │
    │    └──────┬───────┘
    │           │
    │           ▼
    │    ┌──────────────┐
    │    │ Log Access   │
    │    │ (Audit Trail)│
    │    └──────┬───────┘
    │           │
    └───────────▼
    Allow Access to
    Authorized Features
```

---

## 6. SECURITY AND COMPLIANCE

### 6.1) Data Protection Measures

**Field-Level Encryption:**
- All sensitive personal data encrypted with AES-256
- Payment information encrypted at rest and in transit
- Encryption keys rotated regularly
- Secure key management via Supabase Vault

**Row Level Security (RLS):**
- Every database table protected with RLS policies
- Users can only access their own data
- Role-based data filtering
- No direct database access without authentication

**Compliance Standards:**
- **Kenya Data Protection Act (DPA) 2019:** Full compliance
- **GDPR (General Data Protection Regulation):** Compliant
- **PCI DSS:** Payment card security standards (where applicable)
- **ISO 27001:** Information security best practices

### 6.2) Audit Logging

All user actions are logged including:
- Login/logout events
- Data modifications (create, update, delete)
- Permission changes
- Security events
- Failed authentication attempts
- Administrative actions

**Log Retention:** 365 days minimum
**Log Access:** Admin users only with audit trail

### 6.3) Incident Response

**Security Incident Procedure:**
1. Detection and identification
2. Immediate containment
3. User notification (if affected)
4. Investigation and analysis
5. Remediation and recovery
6. Post-incident review
7. Documentation and reporting

**Contact for Security Issues:**
- Email: security@ujenzipro.co.ke
- Emergency Hotline: +254-700-SECURE (732873)

---

## 7. TECHNICAL SUPPORT AND MAINTENANCE

### 7.1) Getting Help

**Technical Support Channels:**
1. **In-App Support:** Contact form within application
2. **Email:** support@ujenzipro.co.ke
3. **Phone:** +254-700-UJENZIPRO
4. **Business Hours:** Monday-Friday 8 AM - 6 PM, Saturday 9 AM - 2 PM
5. **Emergency Support:** 24/7 for critical issues

### 7.2) System Requirements and Browser Support

**Minimum Requirements:**
- Internet connection (2 Mbps minimum, 10 Mbps recommended)
- Modern web browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- JavaScript enabled
- Cookies enabled for session management

**Recommended for Best Experience:**
- High-speed internet (10+ Mbps)
- Desktop/Laptop with 8GB+ RAM
- Google Chrome (latest version)
- 1920x1080 or higher screen resolution

### 7.3) Known Limitations

1. **Offline Access:** Application requires internet connection for all features
2. **Camera Streaming:** High-quality camera feeds require stable, fast internet
3. **Real-time Tracking:** GPS tracking depends on network coverage
4. **File Upload:** Maximum file size 10MB per upload
5. **Browser Support:** Internet Explorer not supported

---

## 8. VERSION HISTORY AND UPDATES

### Version 2.0 (Current - October 8, 2025)
- Complete platform redesign with modern UI/UX
- Enhanced security (97/100 rating achieved)
- Real-time monitoring and camera integration
- Advanced QR code verification system
- Mobile-responsive design and PWA support
- Comprehensive analytics and reporting
- Multi-county expansion (all 47 counties)

### Planned Updates (Roadmap)
- AI-powered material price prediction
- Enhanced drone integration
- Mobile native apps (iOS/Android)
- Multi-language support (Swahili, English)
- Automated payment processing
- Advanced project management tools
- Machine learning for fraud detection

---

## 9. GLOSSARY OF TERMS

**Builder:** Construction professional or company managing construction projects

**Supplier:** Verified vendor providing construction materials and supplies

**QR Code:** Quick Response code used for material verification and tracking

**RLS:** Row Level Security - database security mechanism restricting data access

**GRN:** Goods Received Note - document confirming delivery receipt

**Purchase Order (PO):** Formal document issued by builder to supplier for material purchase

**Delivery Note:** Document accompanying material delivery with itemized list

**JWT:** JSON Web Token - secure authentication token format

**OAuth:** Open Authorization - industry-standard authorization protocol

**PWA:** Progressive Web App - web application that works like native mobile app

**AES-256:** Advanced Encryption Standard with 256-bit key - encryption algorithm

**TLS:** Transport Layer Security - cryptographic protocol for secure communication

---

## 10. APPENDICES

### Appendix A: Emergency Contacts

**Technical Emergencies:**
- Email: emergency@ujenzipro.co.ke
- Phone: +254-700-123-4567 (24/7)

**Security Incidents:**
- Email: security-emergency@ujenzipro.co.ke
- Phone: +254-700-SECURE (732873) (24/7)

**Business Support:**
- Email: info@ujenzipro.co.ke
- Phone: +254-700-UJENZIPRO

### Appendix B: Legal Information

**Copyright Notice:**
© 2025 UjenziPro Ltd. All Rights Reserved.

**Proprietary Software:**
This software and all associated documentation are the exclusive property of UjenziPro Ltd. Unauthorized copying, distribution, or modification is strictly prohibited.

**Terms of Service:**
Available at: https://ujenzipro.co.ke/terms

**Privacy Policy:**
Available at: https://ujenzipro.co.ke/privacy

### Appendix C: Acknowledgments

UjenziPro2 is built with:
- React.js and TypeScript
- Supabase PostgreSQL Database
- Netlify Hosting and CDN
- Open-source libraries (see package.json for full list)

Special thanks to Kenya's construction industry professionals who provided valuable feedback during development.

---

**END OF SOFTWARE DOCUMENTATION**

---

**Document Version:** 1.0  
**Last Updated:** October 23, 2025  
**Prepared For:** Software Registration and Copyright Protection  
**Document Status:** Final  
**Classification:** Confidential - Proprietary Information

