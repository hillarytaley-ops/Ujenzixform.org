# MradiPro Authentication Flow Documentation

## Overview
This document explains how authentication works in MradiPro, including registration, sign-in, and access to different parts of the application.

---

## User Types & Roles

### 1. **Professional Builders**
- Role: `professional_builder`
- Registration: `/professional-builder-registration`
- Sign In: `/builder-signin` or `/signin`
- Access: Supplier marketplace, quote requests, project management

### 2. **Private Clients** (Individual Homeowners)
- Role: `private_client`
- Registration: `/private-client-registration`
- Sign In: `/builder-signin` or `/signin`
- Access: Supplier marketplace, material shopping, project tracking

### 3. **Suppliers** (Material Suppliers)
- Role: `supplier`
- Registration: Via admin or supplier registration form
- Sign In: `/auth`
- Access: Supplier dashboard, inventory management, order management

### 4. **Administrators**
- Role: `admin`
- Sign In: `/admin-login` (requires staff code)
- Access: Full system access, analytics, user management

### 5. **Delivery Providers**
- Role: `delivery_provider`
- Application: `/delivery/apply`
- Sign In: `/auth`
- Access: Delivery dashboard, route management

---

## Registration Process

### Professional Builder Registration
**Route:** `/professional-builder-registration`

**Process:**
1. User provides email and creates password
2. User fills in:
   - Full name
   - Phone number
   - Company name
   - Location (County)
   - Specialties (e.g., Residential, Commercial)
   - Years of experience
   - Professional details (license, insurance, portfolio)
3. System creates:
   - Supabase auth account (email + password)
   - Profile record in `profiles` table
   - Role record in `user_roles` table (`professional_builder`)
4. User is redirected to `/suppliers` to start shopping

**Key Features:**
- ✅ Creates password during registration
- ✅ Can sign in with email + password
- ✅ Immediate access to supplier marketplace
- ✅ Can request quotes from suppliers

---

### Private Client Registration
**Route:** `/private-client-registration`

**Process:**
1. User provides email and creates password
2. User fills in:
   - Full name
   - Phone number
   - Location (County)
   - Project types (e.g., New Build, Renovation)
   - Budget range
   - Project timeline
   - Property type
3. System creates:
   - Supabase auth account (email + password)
   - Profile record in `profiles` table
   - Role record in `user_roles` table (`private_client`)
4. User is redirected to `/suppliers` to start shopping

**Key Features:**
- ✅ Creates password during registration
- ✅ Can sign in with email + password
- ✅ Immediate access to supplier marketplace
- ✅ Simplified shopping experience for homeowners

---

## Sign-In Process

### Builder/Client Sign-In
**Route:** `/builder-signin` or `/signin`

**Who can use this:**
- Professional Builders
- Private Clients

**Process:**
1. User selects their type (Professional Builder or Private Client)
2. User enters email and password
3. System authenticates via Supabase
4. System checks user role in `user_roles` table
5. If role is `professional_builder` or `private_client`:
   - ✅ Sign in successful
   - Redirect to `/suppliers` or saved redirect URL
6. If role is different (admin, supplier, etc.):
   - ❌ Sign in denied
   - Message: "Use the appropriate portal for your account type"

**Features:**
- Two tabs: Professional Builder and Private Client
- Password visibility toggle
- Forgot password link
- Direct links to registration pages
- Redirect preservation (e.g., `?redirect=/suppliers`)

---

### General Authentication (Suppliers, Others)
**Route:** `/auth`

**Who can use this:**
- Suppliers
- Delivery Providers
- General users

**Process:**
- Standard email/password authentication
- OAuth options (Google, GitHub)
- Role-based redirection after sign-in

---

### Admin Authentication
**Route:** `/admin-login`

**Who can use this:**
- System administrators only

**Process:**
1. Enter work email
2. Enter staff code (UJPRO-YYYY-XXXX format)
3. Two-factor verification
4. Role verification (must have `admin` role)
5. Security event logging

**Security Features:**
- Rate limiting (max 5 attempts)
- Account lockout (5 minutes after failed attempts)
- Security event logging
- IP tracking
- Staff code validation

---

## Access Control Matrix

| User Role | Suppliers Page | Builder Portal | Admin Panel | Delivery Dashboard |
|-----------|---------------|----------------|-------------|-------------------|
| **Professional Builder** | ✅ Full Access | ✅ Full Access | ❌ Denied | ❌ Denied |
| **Private Client** | ✅ Full Access | ✅ Limited Access | ❌ Denied | ❌ Denied |
| **Supplier** | ✅ View Only | ❌ Denied | ❌ Denied | ❌ Denied |
| **Admin** | ✅ Full Access | ✅ Full Access | ✅ Full Access | ✅ Full Access |
| **Delivery Provider** | ✅ View Only | ❌ Denied | ❌ Denied | ✅ Full Access |
| **Unauthenticated** | ✅ Browse Only | ❌ Denied | ❌ Denied | ❌ Denied |

---

## Key Authentication Features

### 1. **Password Reset**
- Available on all sign-in pages
- Click "Forgot password?"
- Enter email
- Receive reset link
- Set new password

### 2. **Session Management**
- Supabase handles session tokens
- Automatic session refresh
- Secure HttpOnly cookies
- 1-hour session timeout with refresh

### 3. **Role-Based Redirection**
After successful sign-in, users are redirected based on their role:
- `professional_builder` → `/suppliers`
- `private_client` → `/suppliers`
- `supplier` → `/supplier-dashboard` (if exists)
- `admin` → `/` (homepage with admin access)
- `delivery_provider` → `/delivery`

### 4. **Protected Routes**
Some routes require authentication:
- `/portal` - Builder dashboard (requires `professional_builder` or `private_client` role)
- `/analytics` - Analytics dashboard (requires `admin` role)
- `/delivery/apply` - Delivery provider application (requires authentication)

### 5. **Public Routes**
These pages are accessible without authentication:
- `/` - Homepage
- `/suppliers` - Browse suppliers (limited features without login)
- `/builders` - Browse builders
- `/about` - About page
- `/contact` - Contact page
- `/monitoring` - Monitoring services info
- `/tracking` - Package tracking
- `/feedback` - Submit feedback

---

## Common User Flows

### New Professional Builder
1. Visit `/professional-builder-registration`
2. Fill in details and create password
3. Submit registration
4. Automatically redirected to `/suppliers`
5. Browse materials and request quotes
6. Later, sign in via `/builder-signin`

### New Private Client
1. Visit `/private-client-registration`
2. Fill in project details and create password
3. Submit registration
4. Automatically redirected to `/suppliers`
5. Shop for materials
6. Later, sign in via `/builder-signin`

### Returning Builder/Client
1. Visit `/builder-signin`
2. Select user type (Professional or Private)
3. Enter email and password
4. Click "Sign In"
5. Redirected to suppliers marketplace

### Forgotten Password
1. Go to any sign-in page
2. Click "Forgot password?"
3. Enter email
4. Check email for reset link
5. Click link and set new password
6. Sign in with new password

---

## Database Schema

### `profiles` Table
```sql
- user_id (uuid, FK to auth.users)
- full_name (text)
- phone (text)
- company_name (text, nullable)
- location (text)
- builder_category ('professional' | 'private')
- specialties (text[], for professional builders)
- project_types (text[], for private clients)
- years_experience (integer)
- ... other fields
```

### `user_roles` Table
```sql
- user_id (uuid, FK to auth.users, PRIMARY KEY)
- role (text)
  Options: 'admin', 'professional_builder', 'private_client', 
          'supplier', 'delivery_provider', 'builder'
- created_at (timestamp)
```

### `auth.users` Table (Supabase)
```sql
- id (uuid, PRIMARY KEY)
- email (text, UNIQUE)
- encrypted_password (text)
- email_confirmed_at (timestamp)
- created_at (timestamp)
- ... Supabase auth fields
```

---

## Security Considerations

### Password Requirements
- Minimum 8 characters
- Enforced by Supabase Auth
- Password reset available
- Secure password hashing (bcrypt)

### Row Level Security (RLS)
- All tables have RLS policies
- Users can only see their own data
- Admins have elevated access
- Suppliers can only see relevant orders

### Authentication Tokens
- JWT tokens for API requests
- Automatic token refresh
- Secure storage in HttpOnly cookies
- XSS protection

### CORS & API Security
- CORS policies configured
- API rate limiting
- Request validation
- SQL injection prevention

---

## Troubleshooting

### "Invalid login credentials"
**Issue:** Email or password is incorrect  
**Solution:** 
1. Check email for typos
2. Verify password (case-sensitive)
3. Use "Forgot password?" if needed

### "Email not confirmed"
**Issue:** User hasn't verified email  
**Solution:**
1. Check spam folder for verification email
2. Resend verification email
3. Or disable email confirmation in Supabase (development only)

### "Access Denied"
**Issue:** User doesn't have the required role  
**Solution:**
1. Verify you're using the correct sign-in page
2. Builders/Clients → `/builder-signin`
3. Admins → `/admin-login`
4. Check role in database `user_roles` table

### Can't access Suppliers page after registration
**Issue:** Registration completed but can't see full features  
**Solution:**
1. Ensure you're signed in (check for user menu in nav)
2. Check browser console for errors
3. Verify role was created in `user_roles` table
4. Try signing out and signing back in

---

## Development Notes

### Test Accounts
**Admin:**
- Email: `hillarytaley@gmail.com`
- Password: `Admin123456`
- Staff Code: `UJPRO-2024-0001`

**Test Builder:** (Create via registration)
- Use `/professional-builder-registration`
- Any valid email
- Password of your choice

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase Configuration
1. **Email Confirmation:** Currently disabled for instant access
2. **OAuth Providers:** Configured for Google and GitHub
3. **RLS:** Enabled on all tables
4. **API Keys:** Public anon key used for client-side

---

## Future Enhancements

### Planned Features
- [ ] Two-factor authentication (2FA) for all users
- [ ] Social login for builders/clients
- [ ] Phone number verification
- [ ] Session management dashboard
- [ ] Account activity log
- [ ] Biometric authentication (mobile app)
- [ ] Single Sign-On (SSO) for enterprise builders

### Security Improvements
- [ ] Advanced rate limiting
- [ ] Suspicious activity detection
- [ ] Geolocation-based access control
- [ ] Device fingerprinting
- [ ] Failed login notifications

---

## Support

For authentication issues, contact:
- **Email:** support@mradipro.com
- **Phone:** +254 XXX XXXXXX
- **Developer:** Check Supabase dashboard for user details

---

## Last Updated
December 1, 2025

**Version:** 2.0.0









