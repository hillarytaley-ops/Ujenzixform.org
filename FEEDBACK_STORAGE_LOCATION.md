# 📍 Feedback Storage Location - Complete Guide

**Where and how feedback is stored in Supabase**

---

## 🎯 QUICK ANSWER

**Feedback is stored in the `public.feedback` table in your Supabase PostgreSQL database.**

---

## 📊 DATABASE LOCATION

### **Table Name:** `public.feedback`

**Full Path:**
```
Supabase Project: wuuyjjpgzgeimiptuuws
├─ Database: PostgreSQL
│  └─ Schema: public
│     └─ Table: feedback ← FEEDBACK STORED HERE
```

**Access:**
- **Supabase Dashboard:** https://app.supabase.com
- **Project:** wuuyjjpgzgeimiptuuws
- **Navigate to:** Table Editor → feedback

---

## 🗂️ TABLE STRUCTURE

### **feedback Table Schema:**

```sql
CREATE TABLE public.feedback (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT NOT NULL,
  
  -- Feedback content
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category TEXT,
  comment TEXT,
  
  -- Related entities (optional)
  delivery_id UUID REFERENCES deliveries(id),
  
  -- Security & tracking metadata
  ip_address INET,
  user_agent TEXT,
  submission_time_ms INTEGER,
  form_interactions INTEGER DEFAULT 0,
  security_score INTEGER DEFAULT 100,
  spam_score INTEGER DEFAULT 0,
  security_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_suspicious BOOLEAN DEFAULT false,
  honeypot_field TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📝 FIELDS EXPLAINED

### **Core Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique feedback ID | `a1b2c3d4-...` |
| `user_id` | UUID | User who submitted (null if not logged in) | `user-uuid` or `null` |
| `name` | TEXT | User's name | `"John Kamau"` |
| `email` | TEXT | User's email | `"john@example.com"` |
| `subject` | TEXT | Feedback subject | `"Great service!"` |
| `message` | TEXT | Feedback message | `"I love the platform..."` |
| `rating` | INTEGER | Star rating (1-5) | `5` |

### **Optional Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `category` | TEXT | Feedback category | `"feature_request"` |
| `comment` | TEXT | Additional comments | `"Keep up good work"` |
| `delivery_id` | UUID | Related delivery (if applicable) | `delivery-uuid` |

### **Security Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `ip_address` | INET | Submitter IP | `192.168.1.1` |
| `user_agent` | TEXT | Browser info | `"Mozilla/5.0..."` |
| `submission_time_ms` | INTEGER | Form fill time (ms) | `45000` |
| `form_interactions` | INTEGER | Number of field edits | `12` |
| `security_score` | INTEGER | Security rating (0-100) | `95` |
| `spam_score` | INTEGER | Spam likelihood (0-100) | `5` |
| `security_flags` | TEXT[] | Security warnings | `["fast_submission"]` |
| `is_suspicious` | BOOLEAN | Flagged for review | `false` |
| `honeypot_field` | TEXT | Bot detection field | Should be empty |

### **Timestamp:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `created_at` | TIMESTAMP | Submission date/time | `2025-11-23 14:30:00` |

---

## 💾 HOW FEEDBACK IS STORED

### **Submission Flow:**

```
USER FILLS FEEDBACK FORM
         │
         ↓
Clicks "Submit Feedback"
         │
         ↓
Frontend (FeedbackForm.tsx):
         │
         ├─ Validates input (Zod schema)
         ├─ Sanitizes data (removes dangerous chars)
         ├─ Checks security score
         └─ Checks rate limits
         │
         ↓
Frontend calls Supabase:
         │
         ↓
supabase.from("feedback").insert({
  user_id: current_user_id,
  name: "John Kamau",
  email: "john@example.com",
  subject: "Great service",
  message: "Love the platform...",
  rating: 5,
  ip_address: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  submission_time_ms: 45000,
  form_interactions: 12,
  security_score: 95
})
         │
         ↓
Supabase PostgreSQL Database:
         │
         ├─ Validates data types
         ├─ Checks constraints
         ├─ Applies RLS policies
         ├─ Runs security checks
         └─ Inserts into feedback table
         │
         ↓
ROW INSERTED ✓
         │
         ├─ ID: auto-generated UUID
         ├─ created_at: auto-generated timestamp
         └─ Security metadata: recorded
         │
         ↓
Success response sent to frontend
         │
         ↓
User sees: "Feedback submitted successfully!" ✅
```

---

## 🔐 SECURITY & ACCESS CONTROL

### **Row Level Security (RLS):**

```sql
-- Policy 1: Anyone can submit feedback
CREATE POLICY "Anyone can submit feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (true);

-- Policy 2: Users can view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy 3: Admins can view all feedback
CREATE POLICY "Admins can view all feedback" 
ON public.feedback 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
```

**Access Control:**
- ✅ **Anyone** can submit feedback (logged in or not)
- ✅ **Users** can view their own submissions
- ✅ **Admins** can view all feedback
- ❌ **Others** cannot see other users' feedback

---

## 📂 ADDITIONAL TABLES

### **feedback_security_log Table:**

Stores security events related to feedback:

```sql
CREATE TABLE public.feedback_security_log (
  id UUID PRIMARY KEY,
  feedback_id UUID REFERENCES feedback(id),
  event_type TEXT,  -- 'submission', 'spam_detected', etc.
  event_details JSONB,
  risk_level TEXT,  -- 'low', 'medium', 'high', 'critical'
  ip_address INET,
  user_agent TEXT,
  action_taken TEXT,
  blocked BOOLEAN,
  created_at TIMESTAMP
);
```

**Purpose:**
- Tracks all feedback-related security events
- Logs spam detection
- Records rate limit violations
- Monitors suspicious activity
- Admin-only access

---

## 🔍 HOW TO VIEW FEEDBACK

### **Method 1: Supabase Dashboard (Recommended)**

1. **Go to:** https://app.supabase.com
2. **Select project:** wuuyjjpgzgeimiptuuws
3. **Click:** Table Editor (left sidebar)
4. **Select table:** feedback
5. **View all feedback entries**

**You can:**
- ✅ View all submissions
- ✅ Filter by date, email, rating
- ✅ Search feedback
- ✅ Export to CSV
- ✅ Edit entries (if needed)
- ✅ Delete spam

---

### **Method 2: SQL Editor**

1. **Go to:** Supabase Dashboard → SQL Editor
2. **Run query:**

```sql
-- View all feedback
SELECT * FROM public.feedback
ORDER BY created_at DESC
LIMIT 50;

-- View recent feedback with ratings
SELECT 
  id,
  name,
  email,
  subject,
  rating,
  created_at
FROM public.feedback
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- View by rating
SELECT * FROM public.feedback
WHERE rating >= 4
ORDER BY created_at DESC;

-- View suspicious feedback
SELECT * FROM public.feedback
WHERE is_suspicious = true
OR spam_score > 70;

-- Count feedback by rating
SELECT 
  rating,
  COUNT(*) as count
FROM public.feedback
GROUP BY rating
ORDER BY rating DESC;
```

---

### **Method 3: API Query (In Your App)**

```typescript
// Admin dashboard - View all feedback
const { data: allFeedback, error } = await supabase
  .from('feedback')
  .select('*')
  .order('created_at', { ascending: false });

// User - View their own feedback
const { data: myFeedback, error } = await supabase
  .from('feedback')
  .select('*')
  .eq('user_id', currentUser.id)
  .order('created_at', { ascending: false });

// Filter by rating
const { data: highRated, error } = await supabase
  .from('feedback')
  .select('*')
  .gte('rating', 4)
  .order('created_at', { ascending: false });

// Search feedback
const { data: searchResults, error } = await supabase
  .from('feedback')
  .select('*')
  .or(`subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
```

---

## 📊 EXAMPLE FEEDBACK ENTRY

### **Sample Data:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "user-uuid-here",
  "name": "John Kamau",
  "email": "john.kamau@example.com",
  "subject": "Excellent platform!",
  "message": "I love how easy it is to find suppliers and place orders. The delivery tracking is amazing!",
  "rating": 5,
  "category": "general_feedback",
  "delivery_id": null,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "submission_time_ms": 45230,
  "form_interactions": 8,
  "security_score": 98,
  "spam_score": 2,
  "security_flags": [],
  "is_suspicious": false,
  "honeypot_field": "",
  "created_at": "2025-11-23T14:30:15.123Z"
}
```

---

## 🔄 DATA FLOW

### **Complete Feedback Journey:**

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Browser)                                     │
├─────────────────────────────────────────────────────────┤
│  User fills form at /feedback page                      │
│  ├─ Name: "John Kamau"                                 │
│  ├─ Email: "john@example.com"                          │
│  ├─ Subject: "Great service"                           │
│  ├─ Message: "Love the platform..."                    │
│  └─ Rating: ⭐⭐⭐⭐⭐ (5 stars)                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│  VALIDATION & SECURITY (Client-side)                    │
├─────────────────────────────────────────────────────────┤
│  ├─ Zod schema validation                              │
│  ├─ Input sanitization (XSS prevention)                │
│  ├─ Rate limit check                                   │
│  ├─ Security score calculation                         │
│  └─ CSRF token validation                              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│  API CALL (Supabase Client)                             │
├─────────────────────────────────────────────────────────┤
│  supabase.from("feedback").insert({                     │
│    user_id, name, email, subject, message, rating,     │
│    ip_address, user_agent, security_metadata          │
│  })                                                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│  SUPABASE (Backend)                                     │
├─────────────────────────────────────────────────────────┤
│  ├─ Authentication check (optional for feedback)       │
│  ├─ RLS policy evaluation                             │
│  ├─ Data type validation                              │
│  ├─ Constraint checking                               │
│  └─ Security functions run                            │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│  POSTGRESQL DATABASE                                    │
├─────────────────────────────────────────────────────────┤
│  Table: public.feedback                                 │
│  ────────────────────                                   │
│  INSERT INTO feedback (                                 │
│    id, user_id, name, email, subject,                  │
│    message, rating, ip_address, ...                    │
│  ) VALUES (                                             │
│    'uuid', 'user-id', 'John', 'john@...',             │
│    'Great', 'Love it...', 5, '192...', ...            │
│  );                                                     │
│                                                         │
│  Row Created ✓                                          │
│  Auto-generated: id, created_at                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│  CONFIRMATION                                           │
├─────────────────────────────────────────────────────────┤
│  Success response → Frontend                            │
│  User sees: "Feedback submitted successfully!" ✅       │
│  Form resets                                            │
│  Ready for next submission                              │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 WHERE TO FIND YOUR FEEDBACK

### **Option 1: Supabase Dashboard (Easiest)**

**Step-by-Step:**

1. **Open:** https://app.supabase.com
2. **Sign in** to your account
3. **Select project:** wuuyjjpgzgeimiptuuws (MradiPro)
4. **Click:** "Table Editor" in left sidebar
5. **Click:** "feedback" table
6. **See all feedback entries!**

**You can:**
- View all submissions in a table
- Sort by any column
- Filter by rating, date, email
- Search feedback content
- Export to CSV/Excel
- Edit entries if needed
- Delete spam

---

### **Option 2: SQL Editor**

**Step-by-Step:**

1. **Open:** Supabase Dashboard
2. **Click:** "SQL Editor" in left sidebar
3. **Click:** "+ New query"
4. **Paste this query:**

```sql
SELECT 
  id,
  name,
  email,
  subject,
  message,
  rating,
  created_at
FROM public.feedback
ORDER BY created_at DESC
LIMIT 50;
```

5. **Click:** "Run" or press Ctrl + Enter
6. **See results** in table below

---

### **Option 3: API Endpoint (In Your App)**

**Create an Admin Dashboard:**

```typescript
// File: src/pages/AdminFeedback.tsx (you could create this)

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AdminFeedback = () => {
  const [feedback, setFeedback] = useState([]);
  
  useEffect(() => {
    fetchFeedback();
  }, []);
  
  const fetchFeedback = async () => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setFeedback(data);
  };
  
  return (
    <div>
      <h1>Feedback Dashboard</h1>
      {feedback.map(item => (
        <div key={item.id}>
          <h3>{item.subject}</h3>
          <p>From: {item.name} ({item.email})</p>
          <p>Rating: {'⭐'.repeat(item.rating)}</p>
          <p>{item.message}</p>
          <small>{new Date(item.created_at).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
};
```

---

## 🔍 USEFUL QUERIES

### **View Recent Feedback:**

```sql
SELECT * FROM public.feedback
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### **View High-Rated Feedback:**

```sql
SELECT * FROM public.feedback
WHERE rating >= 4
ORDER BY rating DESC, created_at DESC;
```

### **View Feedback by Email:**

```sql
SELECT * FROM public.feedback
WHERE email = 'specific@email.com'
ORDER BY created_at DESC;
```

### **Count Feedback by Rating:**

```sql
SELECT 
  rating,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.feedback
GROUP BY rating
ORDER BY rating DESC;
```

### **View Suspicious Feedback:**

```sql
SELECT * FROM public.feedback
WHERE is_suspicious = true
OR spam_score > 70
ORDER BY created_at DESC;
```

### **Average Rating:**

```sql
SELECT 
  COUNT(*) as total_feedback,
  ROUND(AVG(rating), 2) as average_rating,
  MAX(rating) as highest_rating,
  MIN(rating) as lowest_rating
FROM public.feedback;
```

---

## 📊 ANALYTICS QUERIES

### **Feedback Summary:**

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as submissions,
  ROUND(AVG(rating), 2) as avg_rating,
  COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_feedback,
  COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_feedback
FROM public.feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### **Top Subjects:**

```sql
SELECT 
  subject,
  COUNT(*) as frequency,
  ROUND(AVG(rating), 2) as avg_rating
FROM public.feedback
GROUP BY subject
ORDER BY frequency DESC
LIMIT 10;
```

---

## 🔒 SECURITY FEATURES

### **Spam Detection:**

The system automatically:
- ✅ Checks submission time (too fast = suspicious)
- ✅ Validates email format
- ✅ Checks honeypot field (should be empty)
- ✅ Calculates spam score
- ✅ Flags suspicious submissions
- ✅ Logs security events

### **Security Metadata Stored:**

- IP address (for abuse tracking)
- User agent (device/browser info)
- Submission time (how long user filled form)
- Form interactions (how many edits)
- Security score (0-100, higher = safer)
- Spam score (0-100, higher = more spammy)

---

## 📱 INTEGRATION POINTS

### **Frontend:**
- **Component:** `src/components/FeedbackForm.tsx`
- **Page:** `src/pages/Feedback.tsx`
- **Submission:** Line 241 in FeedbackForm.tsx

### **Backend:**
- **Table:** `public.feedback`
- **Security Log:** `public.feedback_security_log`
- **Functions:** Spam detection, security validation

### **Admin:**
- **View:** Supabase Dashboard → Table Editor → feedback
- **Analytics:** Custom SQL queries
- **Export:** CSV download available

---

## 🎯 QUICK REFERENCE

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  FEEDBACK STORAGE QUICK FACTS:                            ║
║  ════════════════════════════                             ║
║                                                           ║
║  📍 Location:      public.feedback table                  ║
║  🗄️  Database:      PostgreSQL (Supabase)                 ║
║  🔐 Access:        RLS policies (secure)                  ║
║  📊 Fields:        15+ fields (core + security)           ║
║  🔍 View:          Supabase Dashboard → Table Editor      ║
║  📈 Analytics:     SQL Editor (custom queries)            ║
║  ✅ Public Submit: Yes (anyone can submit)                ║
║  👤 User View:     Own feedback only                      ║
║  👨‍💼 Admin View:    All feedback                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 📞 SUPPORT

**Need help accessing feedback?**

1. **Dashboard:** https://app.supabase.com
2. **Project:** wuuyjjpgzgeimiptuuws
3. **Table:** feedback
4. **Documentation:** This file

**Questions?**
- Check Table Editor
- Run SQL queries
- View security logs
- Export data as needed

---

**📍 Feedback is safely stored in `public.feedback` table in Supabase! ✅**

---

*Documentation Date: November 23, 2025*  
*Table: public.feedback*  
*Access: Supabase Dashboard*  
*Security: RLS Protected ✅*
















