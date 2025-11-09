# 👥 Create Test Accounts - Step by Step

## 🎯 **Quick Test Account Creation:**

You can create test accounts yourself in 2 minutes!

---

## 🏠 **Create Private Client Account:**

### **Step 1: Sign Up**

1. **Open:** `http://localhost:5174/auth` (or your Netlify URL)

2. **Click** "Sign Up" tab

3. **Enter:**
   ```
   Email: privateclient@test.com
   Password: PrivateTest123!
   ```

4. **Click** "Sign Up"

5. **Success!** Account created

### **Step 2: Complete Private Client Profile**

1. **Go to:** `/private-client-registration`
   ```
   http://localhost:5174/private-client-registration
   ```

2. **Fill form:**
   ```
   Full Name: John Kamau (Test Private Client)
   Phone: +254 712 345 678
   Location: Nairobi
   Property Type: Single Family Home
   Project Type: ☑ New House Construction
   Budget: KSh 1-2.5M
   Timeline: 3-6 months
   Description: Building a 3-bedroom house
   ```

3. **Click** "Complete Registration"

4. **✅ Private Client Ready!**

---

## 🏗️ **Create Professional Builder Account:**

### **Step 1: Sign Up**

1. **Open:** `http://localhost:5174/auth`

2. **Click** "Sign Up" tab

3. **Enter:**
   ```
   Email: builder@test.com
   Password: BuilderTest123!
   ```

4. **Click** "Sign Up"

5. **Success!** Account created

### **Step 2: Complete Professional Builder Profile**

1. **Go to:** `/professional-builder-registration`
   ```
   http://localhost:5174/professional-builder-registration
   ```

2. **Fill form:**
   ```
   Company Name: ABC Construction Ltd
   Contact Person: Peter Mwangi
   Phone: +254 723 456 789
   Email: builder@test.com
   Location: Nairobi
   License Number: BLD-2024-001
   Years in Business: 10
   Specialization: ☑ Residential
                   ☑ Commercial
   ```

3. **Click** "Register"

4. **✅ Professional Builder Ready!**

---

## 📋 **Test Account Credentials:**

### **Account 1: Private Client**
```
Email: privateclient@test.com
Password: PrivateTest123!
Role: Private Client
What they see: "Buy Now" buttons (Green)
```

### **Account 2: Professional Builder**
```
Email: builder@test.com
Password: BuilderTest123!
Role: Professional Builder
What they see: "Request Quote" buttons (Blue)
```

### **Account 3: Your Admin**
```
Email: (your admin email)
Password: (your admin password)
Role: Admin
What they see: Full admin dashboard
```

---

## 🧪 **How to Test Each Account:**

### **Test Private Client:**

1. **Sign out** if logged in
2. **Go to:** `/auth`
3. **Sign in:**
   - Email: `privateclient@test.com`
   - Password: `PrivateTest123!`
4. **Redirected to** `/suppliers`
5. **See materials** with **"Buy Now"** buttons (Green)
6. **Click "Buy Now"**
7. **See:** "✅ Adding to Cart" message
8. **✅ Private client purchase flow works!**

---

### **Test Professional Builder:**

1. **Sign out**
2. **Go to:** `/auth`
3. **Sign in:**
   - Email: `builder@test.com`
   - Password: `BuilderTest123!`
4. **Redirected to** `/suppliers`
5. **See materials** with **"Request Quote"** buttons (Blue)
6. **Click "Request Quote"**
7. **See:** Quote request form
8. **✅ Builder quote flow works!**

---

### **Test Guest (Not Logged In):**

1. **Sign out** (or use incognito)
2. **Go to:** `/suppliers`
3. **See materials** with **"Sign In to Purchase"** buttons (Orange)
4. **Click button**
5. **Redirected to** `/auth`
6. **Sign in**
7. **Redirected BACK to** `/suppliers`
8. **Now see** appropriate button (Buy Now or Request Quote)
9. **✅ Guest → Login → Purchase flow works!**

---

## 🎨 **What Each User Type Sees:**

### **Private Client on Suppliers:**
```
┌──────────────────────┐
│  [Product Image]     │
├──────────────────────┤
│  Bamburi Cement 50kg │
│  KES 850 per bag     │
│  ABC Hardware Ltd    │
├──────────────────────┤
│  [Buy Now] 🟢       │ ← Green button
│  (Direct purchase)   │
└──────────────────────┘
```

### **Professional Builder on Suppliers:**
```
┌──────────────────────┐
│  [Product Image]     │
├──────────────────────┤
│  Bamburi Cement 50kg │
│  KES 850 per bag     │
│  ABC Hardware Ltd    │
├──────────────────────┤
│  [Request Quote] 🔵 │ ← Blue button
│  (Quote comparison)  │
└──────────────────────┘
```

### **Guest (Not Logged In):**
```
┌──────────────────────┐
│  [Product Image]     │
├──────────────────────┤
│  Bamburi Cement 50kg │
│  KES 850 per bag     │
│  ABC Hardware Ltd    │
├──────────────────────┤
│  [Sign In to        │ ← Orange button
│   Purchase] 🟠      │
│  (Must login first)  │
└──────────────────────┘
```

---

## 🚀 **Quick Create Both Accounts:**

### **Open 2 Incognito Windows:**

**Window 1: Private Client**
```
1. Incognito → /auth
2. Sign up: privateclient@test.com / PrivateTest123!
3. Complete profile at /private-client-registration
4. Go to /suppliers
5. See green "Buy Now" buttons ✅
```

**Window 2: Professional Builder**
```
1. New Incognito → /auth
2. Sign up: builder@test.com / BuilderTest123!
3. Complete profile at /professional-builder-registration
4. Go to /suppliers
5. See blue "Request Quote" buttons ✅
```

---

## ✅ **Summary:**

**You Can Create:**
- ✅ Private client accounts (yourself)
- ✅ Professional builder accounts (yourself)
- ✅ As many test accounts as you want

**Just Use:**
- Different emails for each
- Any password you choose (min 8 chars)
- Complete the respective registration forms

**No database access needed!** 🎉

---

**Create these 2 test accounts now and you can test both user flows!** 👥✨

**All changes are in GitHub (commit: 91b551c) - just waiting for Netlify deployment!** 🚀
