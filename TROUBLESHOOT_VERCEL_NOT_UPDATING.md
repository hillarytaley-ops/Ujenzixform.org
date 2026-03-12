# 🔧 Troubleshoot: Vercel Not Updating from GitHub

## ✅ Quick Checks

### 1. Verify Code is Pushed to GitHub
```bash
git status
git log origin/main..HEAD  # Should be empty (no unpushed commits)
```

If you see commits, push them:
```bash
git push origin main
```

### 2. Check Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Click your project (UjenziPro)
3. Check "Deployments" tab
4. Look for:
   - ✅ Latest commit should match your GitHub commit
   - ✅ Status should be "Building" or "Ready"
   - ❌ If no new deployment, webhook is broken

### 3. Check GitHub Webhook
1. Go to: https://github.com/hillarytaley-ops/Ujenzixform.org/settings/hooks
2. Look for Vercel webhook
3. Check:
   - ✅ Status: Active
   - ✅ Recent deliveries: Should show recent pushes
   - ❌ If failed, webhook is broken

---

## 🚨 Common Issues & Fixes

### Issue 1: Webhook Not Triggering

**Symptoms:**
- Code pushed to GitHub ✅
- No deployment in Vercel ❌

**Fix:**
1. **Vercel Dashboard** → **Settings** → **Git**
2. **Disconnect** the repository
3. **Reconnect** the repository
4. This recreates the webhook

**OR Manual Deploy:**
1. **Vercel Dashboard** → **Deployments**
2. Click **"..."** → **"Redeploy"**
3. Select latest commit
4. Click **"Redeploy"**

---

### Issue 2: Wrong Branch Configured

**Symptoms:**
- Pushing to `main` but Vercel watching `master`

**Fix:**
1. **Vercel Dashboard** → **Settings** → **Git**
2. **Production Branch:** Should be `main`
3. If wrong, change it and save

---

### Issue 3: Build Failing Silently

**Symptoms:**
- Deployment triggered but fails
- No error shown

**Fix:**
1. **Vercel Dashboard** → **Deployments**
2. Click on failed deployment
3. Check **"Build Logs"**
4. Fix the error
5. Push again

---

### Issue 4: Vercel Integration Disconnected

**Symptoms:**
- No deployments at all
- GitHub shows no Vercel app

**Fix:**
1. **Vercel Dashboard** → **Settings** → **Git**
2. If repository shows "Disconnected":
   - Click **"Connect Git Repository"**
   - Select: `hillarytaley-ops/Ujenzixform.org`
   - Authorize Vercel
   - Save

---

## 🚀 Force Manual Deployment

If auto-deploy is broken, deploy manually:

### Option 1: Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Click **"Deployments"** tab
4. Click **"..."** → **"Redeploy"**
5. Select latest commit
6. Click **"Redeploy"**

### Option 2: Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

---

## 🔍 Verify Current Status

Run these commands to check:

```bash
# 1. Check if code is pushed
git log origin/main..HEAD

# 2. Check latest commit
git log -1 --oneline

# 3. Verify remote
git remote -v
```

**Expected:**
- No unpushed commits
- Latest commit matches GitHub
- Remote points to: `https://github.com/hillarytaley-ops/Ujenzixform.org.git`

---

## 📋 Step-by-Step Fix (Right Now)

1. **Verify Push:**
   ```bash
   git push origin main
   ```

2. **Check Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Check if new deployment appears (wait 1-2 minutes)

3. **If No Deployment:**
   - **Settings** → **Git** → **Disconnect** → **Reconnect**
   - OR manually redeploy from Deployments tab

4. **If Deployment Fails:**
   - Check build logs
   - Fix errors
   - Push again

---

## ✅ Success Indicators

After fixing, you should see:
- ✅ New deployment in Vercel (within 1-2 minutes of push)
- ✅ Status: "Building" → "Ready"
- ✅ Latest commit matches your GitHub commit
- ✅ Site updates with new code

---

## 🆘 Still Not Working?

1. **Check Vercel Status:** https://vercel-status.com
2. **Check GitHub Status:** https://www.githubstatus.com
3. **Contact Support:** Vercel Dashboard → Help → Contact Support
