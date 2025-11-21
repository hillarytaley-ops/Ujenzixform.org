# 🎯 Setup Single Production URL - Auto-Updates

**Goal:** Use ONLY `ujenzi-pro.vercel.app` that auto-updates  
**Remove:** Confusing preview/branch URLs  
**Result:** One clean URL that always has latest code  

---

## ✅ Solution: Configure Vercel Settings

### **Step 1: Enable Auto-Promotion to Production**

1. **Go to Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **Click Your Project** (UjenziPro)

3. **Click "Settings"**

4. **Click "Git" in Sidebar**

5. **Find "Production Branch"**
   ```
   Production Branch: main ✅
   ```

6. **Enable Auto-Deploy to Production:**
   - Look for option like "Promote to Production Automatically"
   - OR "Auto-assign to Production"
   - Enable it ✅

7. **Save Settings**

---

### **Step 2: Disable Preview Deployments (Optional)**

If you want to completely hide preview URLs:

1. **Still in Settings → Git**

2. **Find "Deploy Previews" Section**

3. **Options:**
   ```
   ○ All Branches (Creates preview for every branch)
   ○ Only Production Branch (No previews)
   ● None (Disable all preview deployments)
   ```

4. **Select:** "Only Production Branch"
   - This means only `main` branch deploys
   - No extra preview URLs created

5. **Save**

---

### **Step 3: Set Production Domain as Primary**

1. **Settings → Domains**

2. **Your Domains:**
   ```
   ujenzi-pro.vercel.app (Vercel domain)
   [Your custom domain if any]
   ```

3. **Click "..." next to `ujenzi-pro.vercel.app`**

4. **Ensure it's marked as "Production"** ✅

5. **Optional: Add Custom Domain**
   ```
   Examples:
   - mradipro.com
   - app.mradipro.com
   - www.mradipro.com
   ```

---

## 🎯 After Configuration

### **What Happens:**

```
You push to GitHub (main branch)
         ↓
Vercel auto-deploys
         ↓
Auto-promotes to Production ✅
         ↓
ujenzi-pro.vercel.app updates automatically! ✅
         ↓
No preview URLs created
```

**Result:** ONE URL that always has latest code!

---

## 📊 Settings Configuration

### **Recommended Settings:**

```
┌─────────────────────────────────────────────┐
│  GIT SETTINGS                               │
├─────────────────────────────────────────────┤
│  Production Branch: main              ✅    │
│  Auto Deploy: Enabled                 ✅    │
│  Deploy Previews: Production Branch Only ✅ │
│  Comments on PRs: Disabled            ✅    │
│  Automatically expose system env vars: On   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  DOMAIN SETTINGS                            │
├─────────────────────────────────────────────┤
│  Primary Domain: ujenzi-pro.vercel.app ✅   │
│  Type: Production                      ✅   │
│  Auto-update: Enabled                  ✅   │
└─────────────────────────────────────────────┘
```

---

## 🎯 Alternative: Add Custom Domain

### **For Professional Branding:**

Instead of `ujenzi-pro.vercel.app`, use your own domain!

1. **Buy Domain** (if you don't have one):
   ```
   Examples:
   - mradipro.com
   - mradipro.co.ke (Kenya domain)
   - app.mradipro.com
   ```

2. **Add to Vercel:**
   ```
   Settings → Domains → Add Domain
   Enter: mradipro.com
   ```

3. **Update DNS Records:**
   - Vercel gives you DNS records
   - Add them to your domain registrar
   - Wait 24-48 hours for propagation

4. **Set as Production:**
   - Mark your custom domain as Production
   - Now `mradipro.com` is your main URL!
   - Auto-updates with every push

---

## 📝 Configure vercel.json for Single Domain

Update your `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "cleanUrls": true,
  "trailingSlash": false,
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  },
  "github": {
    "enabled": true,
    "autoAlias": false,
    "autoJobCancelation": true,
    "silent": false
  }
}
```

**Key settings:**
- `"autoAlias": false` - Prevents multiple URLs
- `deploymentEnabled` - Only deploy main branch

---

## 🚀 Immediate Fix (Right Now)

### **Make These Changes:**

1. **Vercel Dashboard**
   - Settings → Git
   - Production Branch: `main` ✅
   - Deploy Previews: "Production Branch Only"

2. **Promote Latest Deployment**
   - Deployments → Find commit `6e474ff`
   - Click "..." → "Promote to Production"

3. **Enable Auto-Promotion**
   - Look for auto-promotion setting
   - Enable it

4. **Result:**
   - Only `ujenzi-pro.vercel.app` shows
   - Auto-updates with every push
   - No confusing preview URLs

---

## 📊 Before vs After

### **Before (Confusing):**
```
❌ ujenzi-pro.vercel.app (old code)
❌ ujenzi-pro-git-main-... (latest code)
❌ ujenzi-m33lobh52-... (random deployment)

Problem: Which one to use?
```

### **After (Clean):**
```
✅ ujenzi-pro.vercel.app (ONE URL)
   → Always has latest code
   → Auto-updates on push
   → Simple and clear!

Preview URLs hidden from public
```

---

## 🎯 Additional: Hide Preview Deployments

### **In Vercel Dashboard:**

1. **Settings → General**

2. **Scroll to "Deployment Protection"**

3. **Options:**
   ```
   Protection Bypass for Automation: Enabled
   
   Deployment URL Preview:
   ○ Public (Anyone can access)
   ● Private (Only team members)
   ```

4. **Select "Private"**
   - Preview URLs require login
   - Only main domain is public
   - Clean and professional!

---

## 💡 Pro Setup (Recommended)

### **Configuration:**

```
Production URL: ujenzi-pro.vercel.app
✅ Auto-deploys from main branch
✅ No preview URLs created
✅ Single source of truth
✅ Clean and simple

OR (Even Better):

Custom Domain: mradipro.com
✅ Professional branding
✅ Auto-deploys from main
✅ Your own domain
✅ Better for business
```

---

## 🚀 Quick Action Checklist

Do these in Vercel Dashboard:

- [ ] Settings → Git → Production Branch: `main`
- [ ] Settings → Git → Deploy Previews: "Production Branch Only"
- [ ] Settings → Git → Enable auto-promotion
- [ ] Deployments → Promote latest to production
- [ ] Settings → General → Deployment Protection: Private previews
- [ ] Test: Push to GitHub → Should auto-deploy to production

---

## ✅ Expected Behavior After Fix

```
Step 1: Push code to GitHub
         ↓
Step 2: Vercel auto-deploys ✅
         ↓
Step 3: Auto-promotes to production ✅
         ↓
Step 4: ujenzi-pro.vercel.app updates ✅
         ↓
Step 5: Done! One URL, latest code! ✅

No more:
❌ git-main URLs
❌ Random hash URLs
❌ Multiple confusing links
```

---

## 🎯 Summary

**The Problem:**
- Multiple URLs showing different versions
- Confusing which one has latest code
- Production not auto-updating

**The Fix:**
1. Settings → Git → Deploy Previews: Production only
2. Enable auto-promotion to production
3. Promote current latest deployment
4. Result: ONE URL that auto-updates! ✅

**Your main URL:**
```
✅ ujenzi-pro.vercel.app
   → Will auto-update with every push
   → Only URL you need
   → Share this publicly
```

---

## 🚀 Do This Now

1. **Vercel Dashboard** → Settings → Git
2. **Set:** Production Branch Only
3. **Enable:** Auto-promotion
4. **Promote:** Latest deployment (commit 6e474ff)
5. **Test:** Push to GitHub → Check auto-deploy works

---

**After this setup, you'll have ONE clean URL that auto-updates!**

**Main URL:** `ujenzi-pro.vercel.app` ✅

**MradiPro** 🏗️✨

