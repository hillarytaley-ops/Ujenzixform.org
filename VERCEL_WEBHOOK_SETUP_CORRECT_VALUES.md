# ✅ Vercel Webhook Setup - Correct Values

**Issue:** "Branch 'UjenziPro' not found"  
**Cause:** Trying to use project name instead of branch name  
**Solution:** Use correct branch name = `main`  

---

## 📋 **Correct Values to Fill In**

### **What You're Filling Out:**

This is likely in:
- Vercel Dashboard → Settings → Git
- OR Vercel Dashboard → Settings → Deploy Hooks
- OR GitHub Settings → Webhooks

---

## ✅ **Fill These Values:**

### **Name:**
```
Production Deploy Hook
```
OR
```
Main Branch Deploy
```
OR
```
Auto Deploy from Main
```

**→ This can be anything descriptive you want**

---

### **Branch:**
```
main
```

**→ NOT "UjenziPro" (that's your project name, not branch name)**

---

### **Full Example:**

```
┌─────────────────────────────────────┐
│  Create Deploy Hook                 │
├─────────────────────────────────────┤
│                                     │
│  Name:                              │
│  ┌───────────────────────────────┐  │
│  │ Production Deploy Hook        │  │
│  └───────────────────────────────┘  │
│                                     │
│  Branch:                            │
│  ┌───────────────────────────────┐  │
│  │ main                          │  │ ← Use "main" not "UjenziPro"
│  └───────────────────────────────┘  │
│                                     │
│  [Create Hook]                      │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 **Your Git Branches**

Your repository has these branches:
```
✅ main (Your production branch)
○ feature/mobile-suppliers-redirect (Old feature branch)
```

**Use:** `main`

---

## 🔍 **Why the Error Happened**

### **What Vercel is Asking:**

```
Name: [What to call this hook]
  → Can be anything: "Production Deploy Hook"
  
Branch: [Which Git branch to deploy from]
  → Must be a real branch name: "main"
  → NOT the project name: "UjenziPro" ❌
```

### **Common Mistake:**

People often confuse:
- **Project Name:** UjenziPro (repository name)
- **Branch Name:** main (code branch)

**You need:** Branch name = `main`

---

## ✅ **Correct Setup**

### **For Production Deployment:**

```
Name: Production Deploy
Branch: main
Git Repository: hillarytaley-ops/UjenziPro ✅
```

### **For Preview Deployment (Optional):**

```
Name: Feature Preview
Branch: feature/mobile-suppliers-redirect
Git Repository: hillarytaley-ops/UjenziPro ✅
```

---

## 🚀 **After Creating Hook**

### **What You'll Get:**

**A webhook URL:**
```
https://api.vercel.com/v1/integrations/deploy/[unique-id]
```

**How it works:**
```
1. You push to GitHub (main branch)
2. GitHub triggers webhook
3. Vercel receives it
4. Auto-deploys to production
5. https://ujenzi-pro.vercel.app/ updates ✅
```

---

## 📊 **Different Types of Hooks**

Vercel might be asking about:

### **1. Deploy Hook (Manual Trigger)**
```
Name: Manual Deploy Trigger
Branch: main
Purpose: Trigger deployment via URL call
```

### **2. Git Hook (Auto Deployment)**
```
Repository: hillarytaley-ops/UjenziPro
Branch: main
Auto-deploy: Enabled ✅
```

### **3. Webhook (GitHub → Vercel)**
```
This should be automatic when you connect Git
If broken, disconnect and reconnect
```

---

## 🎯 **Recommended Setup**

### **In Vercel Dashboard:**

1. **Settings → Git**
   ```
   Connected Repository: hillarytaley-ops/UjenziPro ✅
   Production Branch: main ✅
   ```

2. **Don't create manual hooks** unless needed
   - Auto-deployment should work
   - Webhook should be automatic

3. **If setting up Deploy Hook:**
   ```
   Name: Production Deploy Hook
   Branch: main
   ```

---

## ✅ **Correct Values Summary**

| Field | Correct Value | Wrong Value |
|-------|---------------|-------------|
| Name | "Production Deploy Hook" | Anything you want |
| Branch | **main** ✅ | ~~UjenziPro~~ ❌ |
| Repository | hillarytaley-ops/UjenziPro | - |

---

## 🔧 **If You're in Settings → Git**

### **Production Branch Setup:**

```
Production Branch: main

Deploy Previews: 
● All Branches
○ Only Production Branch
○ None

Auto Deploy: Enabled ✅
```

---

## 🆘 **Still Getting Error?**

### **Try This:**

1. **Cancel current webhook setup**

2. **Go to Settings → Git**

3. **If Connected:**
   - Click "Disconnect"

4. **Click "Connect Git Repository"**
   - Select: GitHub
   - Repository: hillarytaley-ops/UjenziPro
   - Production Branch: **main**
   - Click "Connect"

5. **Vercel will:**
   - Auto-create webhook in GitHub
   - Set up auto-deployment
   - Use correct branch name

---

## ✅ **Quick Answer**

**What to fill in:**
```
Name: Production Deploy Hook
Branch: main
```

**That's it!**

---

**Use "main" not "UjenziPro" for the branch name!**

**"main" is your Git branch, "UjenziPro" is your project name!**

**MradiPro** 🏗️✨
