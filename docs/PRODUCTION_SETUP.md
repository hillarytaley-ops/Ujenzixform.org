# 🚀 UjenziXform Production Setup Guide

This guide covers everything needed to deploy UjenziXform to production.

---

## 📧 1. Email Service (Resend)

### Setup Steps

1. **Create Resend Account**
   - Go to [https://resend.com](https://resend.com)
   - Sign up with your business email

2. **Verify Your Domain**
   - In Resend dashboard, go to **Domains**
   - Add `ujenzixform.com`
   - Add the DNS records Resend provides:
     ```
     Type: TXT
     Name: resend._domainkey
     Value: [provided by Resend]
     ```

3. **Get API Key**
   - Go to **API Keys** in Resend dashboard
   - Create a new key with "Sending access"
   - Copy the key (starts with `re_`)

4. **Add to Supabase**
   ```bash
   # Install Supabase CLI if not installed
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link to your project
   supabase link --project-ref wuuyjjpgzgeimiptuuws

   # Add the secret
   supabase secrets set RESEND_API_KEY=re_your_api_key_here

   # Deploy the edge function
   supabase functions deploy send-email
   ```

5. **Test Email Sending**
   ```bash
   curl -X POST 'https://wuuyjjpgzgeimiptuuws.supabase.co/functions/v1/send-email' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "to": "test@example.com",
       "subject": "Test Email",
       "html": "<h1>Hello from UjenziXform!</h1>"
     }'
   ```

### Pricing
- **Free tier**: 3,000 emails/month
- **Pro**: $20/month for 50,000 emails

---

## 🗄️ 2. Production Supabase Instance

### Option A: Upgrade Current Project (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Billing**
4. Upgrade to **Pro** plan ($25/month)
   - Includes: 8GB database, 250GB bandwidth, daily backups

### Option B: Create New Production Project

1. Create new project at [supabase.com](https://supabase.com)
2. Run all migrations:
   ```bash
   # Export from dev
   supabase db dump -f dev_backup.sql

   # Import to production
   psql -h YOUR_PROD_HOST -U postgres -d postgres -f dev_backup.sql
   ```

3. Update environment variables:
   ```env
   # .env.production
   VITE_SUPABASE_URL=https://YOUR_PROD_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your_prod_anon_key
   ```

### Database Optimization Checklist

- [ ] Enable connection pooling (Settings → Database → Connection Pooling)
- [ ] Set up read replicas if needed (Pro plan)
- [ ] Configure Point-in-Time Recovery (PITR)
- [ ] Review and optimize RLS policies
- [ ] Add database indexes for frequently queried columns

---

## 🐛 3. Error Monitoring (Sentry)

### Setup Steps

1. **Create Sentry Account**
   - Go to [https://sentry.io](https://sentry.io)
   - Sign up and create a new React project

2. **Install Sentry**
   ```bash
   npm install @sentry/react
   ```

3. **Initialize Sentry** (already added to your project)
   - See `src/lib/sentry.ts`
   - Add your DSN to environment variables

4. **Get Your DSN**
   - In Sentry dashboard, go to **Settings** → **Projects** → **Your Project** → **Client Keys (DSN)**
   - Copy the DSN URL

5. **Add Environment Variable**
   ```env
   VITE_SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456
   ```

### Pricing
- **Free tier**: 5,000 errors/month
- **Team**: $26/month for 50,000 errors

---

## 📊 4. Google Analytics

### Setup Steps

1. **Create GA4 Property**
   - Go to [analytics.google.com](https://analytics.google.com)
   - Create account → Create property
   - Choose "Web" platform
   - Enter `ujenzixform.com`

2. **Get Measurement ID**
   - Format: `G-XXXXXXXXXX`
   - Found in Admin → Data Streams → Your Stream

3. **Add to Environment**
   ```env
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

4. **Already integrated in your project**
   - See `src/lib/analytics.ts`

### Key Events to Track
- User registration (by role)
- Order placement
- Quote requests
- Delivery completion
- Payment success/failure

---

## 💾 5. Automated Backups

### Supabase Built-in Backups (Pro Plan)

1. **Daily Backups** (automatic)
   - Enabled by default on Pro plan
   - 7-day retention

2. **Point-in-Time Recovery**
   - Go to **Settings** → **Database** → **Backups**
   - Enable PITR for up to 7 days recovery

### Manual Backup Script

Create a cron job to run daily:

```bash
#!/bin/bash
# backup.sh - Run daily at 2 AM

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/ujenzipro"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-bucket/backups/

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### Storage Bucket Backup

```bash
# Backup Supabase storage
supabase storage download materials --output ./storage_backup/materials
supabase storage download avatars --output ./storage_backup/avatars
```

---

## 🔥 6. Load Testing

### Using k6 (Recommended)

1. **Install k6**
   ```bash
   # Windows (chocolatey)
   choco install k6

   # Or download from https://k6.io/docs/getting-started/installation/
   ```

2. **Create Test Script** (`load-test.js`)
   ```javascript
   import http from 'k6/http';
   import { check, sleep } from 'k6';

   export const options = {
     stages: [
       { duration: '30s', target: 20 },   // Ramp up to 20 users
       { duration: '1m', target: 50 },    // Ramp up to 50 users
       { duration: '2m', target: 100 },   // Ramp up to 100 users
       { duration: '1m', target: 100 },   // Stay at 100 users
       { duration: '30s', target: 0 },    // Ramp down
     ],
     thresholds: {
       http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
       http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
     },
   };

   const BASE_URL = 'https://ujenzixform.com';

   export default function () {
     // Test homepage
     let res = http.get(`${BASE_URL}/home`);
     check(res, { 'homepage status 200': (r) => r.status === 200 });

     sleep(1);

     // Test materials API
     res = http.get(`${BASE_URL}/api/materials`);
     check(res, { 'materials API status 200': (r) => r.status === 200 });

     sleep(1);

     // Test suppliers page
     res = http.get(`${BASE_URL}/suppliers`);
     check(res, { 'suppliers status 200': (r) => r.status === 200 });

     sleep(Math.random() * 3);
   }
   ```

3. **Run Load Test**
   ```bash
   k6 run load-test.js
   ```

### Expected Results
- ✅ 100 concurrent users with <500ms response time
- ✅ <1% error rate
- ✅ No database connection exhaustion

---

## 📱 7. Mobile App Testing

### Android Testing

1. **Build APK**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

2. **In Android Studio**
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Test on physical device or emulator

3. **Test Checklist**
   - [ ] App opens without crash
   - [ ] Login/registration works
   - [ ] Camera permissions work
   - [ ] QR scanning works
   - [ ] Push notifications work
   - [ ] Offline mode shows indicator
   - [ ] Deep links work

### iOS Testing

1. **Build for iOS**
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   ```

2. **In Xcode**
   - Select your team for signing
   - Build and run on simulator or device

3. **TestFlight Distribution**
   - Archive the app
   - Upload to App Store Connect
   - Add internal testers

---

## 🔐 8. Security Checklist

Before going live, verify:

- [ ] All RLS policies are tested
- [ ] No API keys exposed in frontend code
- [ ] HTTPS enforced everywhere
- [ ] Rate limiting configured
- [ ] Input validation on all forms
- [ ] SQL injection protection (using Supabase client)
- [ ] XSS protection (React handles this)
- [ ] CORS configured correctly
- [ ] Secure password requirements
- [ ] Session timeout configured

---

## 🌐 9. Domain & SSL

### Vercel Deployment (Recommended)

1. **Connect Repository**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Add Custom Domain**
   - In Vercel dashboard → Settings → Domains
   - Add `ujenzixform.com`
   - Update DNS records as instructed

3. **SSL is automatic** with Vercel

### DNS Configuration

```
Type    Name    Value
A       @       76.76.21.21 (Vercel)
CNAME   www     cname.vercel-dns.com
```

---

## 📋 Final Checklist

### Before Launch
- [ ] All environment variables set in production
- [ ] Email service tested and working
- [ ] Payment integration tested (Paystack)
- [ ] Error monitoring active
- [ ] Analytics tracking
- [ ] Backups configured
- [ ] Load testing passed
- [ ] Mobile apps tested
- [ ] Security audit complete
- [ ] Legal pages updated (Privacy, Terms)
- [ ] Support email configured
- [ ] Social media links working

### Day of Launch
- [ ] Monitor error rates in Sentry
- [ ] Watch analytics for user behavior
- [ ] Have support team ready
- [ ] Monitor database performance
- [ ] Check email delivery rates

### Post-Launch (Week 1)
- [ ] Review user feedback
- [ ] Fix any critical bugs
- [ ] Optimize slow queries
- [ ] Adjust rate limits if needed
- [ ] Scale resources if traffic high

---

## 📞 Support Contacts

- **Supabase Support**: support@supabase.io
- **Resend Support**: support@resend.com
- **Sentry Support**: support@sentry.io
- **Paystack Support**: support@paystack.com

---

*Last Updated: January 22, 2026*

