# 🚀 MradiPro: Local Development to Vercel Deployment Guide

**Complete Step-by-Step Guide for Developing Locally and Deploying to Vercel**

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Development Workflow](#development-workflow)
5. [Deploying to Vercel](#deploying-to-vercel)
6. [Continuous Deployment](#continuous-deployment)
7. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### **TL;DR - Get Started in 5 Minutes**

```bash
# 1. Clone the repository
git clone https://github.com/hillarytaley-ops/UjenziPro.git
cd UjenziPro

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:5173

# 5. Make changes, then deploy
npm run build         # Test build
git add .
git commit -m "Your changes"
git push origin main  # Auto-deploys to Vercel
```

---

## 🛠️ Prerequisites

### **What You Need Before Starting**

#### 1. **Software Requirements**

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | 18.x or higher | https://nodejs.org |
| **npm** | 9.x or higher | Comes with Node.js |
| **Git** | Latest | https://git-scm.com |
| **Code Editor** | Any (VS Code recommended) | https://code.visualstudio.com |

**Check your installations:**
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
git --version     # Should show git version 2.x.x
```

#### 2. **Accounts You Need**

- ✅ **GitHub Account** - For code hosting
  - Sign up: https://github.com/signup
  
- ✅ **Vercel Account** - For deployment
  - Sign up: https://vercel.com/signup
  - Link to GitHub during signup
  
- ✅ **Supabase Account** - For backend (already configured)
  - Access: https://app.supabase.com

#### 3. **Environment Variables**

You'll need these values from Supabase:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get them:**
1. Go to https://app.supabase.com
2. Select your MradiPro project
3. Go to Settings → API
4. Copy "Project URL" and "anon public" key

---

## 💻 Local Development Setup

### **Step 1: Clone the Repository**

```bash
# Navigate to where you want to store the project
cd ~/Desktop  # or wherever you prefer

# Clone the repository
git clone https://github.com/hillarytaley-ops/UjenziPro.git

# Navigate into the project
cd UjenziPro

# Verify you're in the right place
ls  # Should see package.json, src/, public/, etc.
```

---

### **Step 2: Install Dependencies**

```bash
# Install all required packages
npm install

# This will take 1-2 minutes
# You'll see a progress bar
```

**What this does:**
- Downloads all dependencies from `package.json`
- Creates `node_modules/` folder (~300MB)
- Installs React, Vite, Supabase, UI libraries, etc.

---

### **Step 3: Set Up Environment Variables**

Create a file named `.env.local` in the root directory:

```bash
# Create the file
touch .env.local

# Or on Windows
type nul > .env.local
```

**Edit `.env.local` and add:**

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: Development flags
VITE_DEV_MODE=true
```

**Important:**
- ✅ `.env.local` is already in `.gitignore` (won't be committed)
- ✅ Never share these keys publicly
- ✅ Use different keys for development/production

---

### **Step 4: Start Development Server**

```bash
# Start the development server
npm run dev
```

**You should see:**
```
  VITE v7.1.9  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.x:5173/
  ➜  press h + enter to show help
```

**Open your browser:** http://localhost:5173

✅ **Success!** You should see MradiPro running locally!

---

## 🔨 Development Workflow

### **Making Changes**

#### **Project Structure**

```
UjenziPro/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Navigation.tsx
│   │   ├── Footer.tsx
│   │   ├── chat/         # Chat components
│   │   └── ui/           # Base UI components
│   │
│   ├── pages/            # Page components
│   │   ├── Index.tsx     # Homepage
│   │   ├── Auth.tsx      # Login/Signup
│   │   ├── Suppliers.tsx # Supplier marketplace
│   │   └── ...
│   │
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   └── App.tsx           # Main app component
│
├── public/               # Static assets
│   ├── assets/          # Images, logos
│   └── manifest.json    # PWA manifest
│
└── index.html           # HTML entry point
```

---

### **Common Development Tasks**

#### **Task 1: Edit a Page**

```bash
# Open the file you want to edit
# Example: Edit the homepage

# File: src/pages/Index.tsx
```

```typescript
import React from 'react';
import Navigation from '@/components/Navigation';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold">
          Welcome to MradiPro! {/* Your change here */}
        </h1>
      </main>
    </div>
  );
};

export default Index;
```

**Save the file** → Changes appear instantly in browser (Hot Module Replacement)

---

#### **Task 2: Add a New Component**

```bash
# Create new component file
# File: src/components/MyNewComponent.tsx
```

```typescript
import React from 'react';

interface MyNewComponentProps {
  title: string;
  description?: string;
}

const MyNewComponent = ({ title, description }: MyNewComponentProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold">{title}</h2>
      {description && <p className="text-gray-600 mt-2">{description}</p>}
    </div>
  );
};

export default MyNewComponent;
```

**Use it in a page:**

```typescript
import MyNewComponent from '@/components/MyNewComponent';

<MyNewComponent 
  title="Test Component" 
  description="This is a test" 
/>
```

---

#### **Task 3: Add a New Page**

```bash
# 1. Create page file
# File: src/pages/NewPage.tsx
```

```typescript
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const NewPage = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold">New Page</h1>
        <p className="text-lg mt-4">This is my new page!</p>
      </main>
      <Footer />
    </div>
  );
};

export default NewPage;
```

```bash
# 2. Add route in App.tsx
# File: src/App.tsx
```

```typescript
// Add import (with lazy loading)
const NewPage = lazy(() => import('./pages/NewPage'));

// Add route inside <Routes>
<Route path="/new-page" element={<NewPage />} />
```

**Test it:** http://localhost:5173/new-page

---

### **Testing Your Changes**

#### **1. Visual Testing**

```bash
# Server is running (npm run dev)
# Open browser: http://localhost:5173

# Test on different screen sizes
# Chrome DevTools → Toggle device toolbar
# Test: Mobile, Tablet, Desktop
```

---

#### **2. Build Testing**

```bash
# Stop dev server (Ctrl + C)

# Test production build
npm run build

# This should complete without errors
# Creates 'dist/' folder with optimized files
```

**Check for errors:**
- ✅ No TypeScript errors
- ✅ No build warnings
- ✅ All imports resolved
- ✅ Build completes successfully

---

#### **3. Preview Production Build**

```bash
# After successful build
npm run preview

# Opens at: http://localhost:4173
```

**Test everything works:**
- ✅ Navigation works
- ✅ Pages load correctly
- ✅ Forms submit
- ✅ Images display
- ✅ No console errors

---

#### **4. Linting**

```bash
# Check code quality
npm run lint

# Fix auto-fixable issues
npm run lint --fix
```

---

### **Git Workflow**

#### **Commit Your Changes**

```bash
# 1. Check what files changed
git status

# 2. Review changes
git diff

# 3. Stage specific files
git add src/pages/NewPage.tsx
git add src/App.tsx

# Or stage all changes
git add .

# 4. Commit with descriptive message
git commit -m "Add new page: User profile with settings"

# 5. Push to GitHub
git push origin main
```

**Good commit messages:**
```
✅ "Add supplier filtering by county and material type"
✅ "Fix mobile menu not closing on navigation"
✅ "Update branding: Change UjenziPro to MradiPro"
✅ "Improve performance: Add lazy loading to images"

❌ "update"
❌ "fix stuff"
❌ "changes"
```

---

## 🚀 Deploying to Vercel

### **Method 1: Automatic Deployment (Recommended)**

This is the easiest and most common method.

#### **Initial Setup (One-Time)**

```
1. Go to https://vercel.com
2. Sign up / Log in with GitHub
3. Click "Add New Project"
4. Import your GitHub repository (UjenziPro)
5. Vercel detects it's a Vite project automatically
6. Configure:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
   - Install Command: npm install
7. Add Environment Variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
8. Click "Deploy"
```

**That's it!** 🎉

#### **Ongoing Deployments**

From now on, every time you push to GitHub:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

**What happens automatically:**

```
1. GitHub receives push (1 second)
2. Webhook triggers Vercel (2-5 seconds)
3. Vercel clones repository (10-15 seconds)
4. Installs dependencies (30-45 seconds)
5. Runs build command (45-60 seconds)
6. Deploys to CDN (10-20 seconds)
7. Live at your URL (30-60 seconds)

Total: 2-3 minutes from push to live! ⚡
```

**Monitor deployment:**
1. Go to https://vercel.com/dashboard
2. See deployment status
3. View build logs
4. Check for errors

---

### **Method 2: Vercel CLI Deployment**

For manual control or testing.

#### **Install Vercel CLI**

```bash
# Install globally
npm install -g vercel

# Verify installation
vercel --version
```

#### **Deploy**

```bash
# First time: Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Vercel CLI will:**
- Ask project name (press Enter for default)
- Detect Vite framework
- Build your project
- Deploy to Vercel
- Give you a live URL

---

### **Method 3: GitHub Actions (Advanced)**

For more control over CI/CD pipeline.

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 🔄 Continuous Deployment

### **Complete Workflow**

```
┌──────────────────────────────────────────────────┐
│  1. LOCAL DEVELOPMENT                            │
│     ├─ npm run dev                              │
│     ├─ Make changes                             │
│     ├─ Test in browser                          │
│     └─ npm run build (verify)                   │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│  2. COMMIT & PUSH                                │
│     ├─ git add .                                │
│     ├─ git commit -m "Description"              │
│     └─ git push origin main                     │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│  3. AUTOMATIC BUILD (Vercel)                     │
│     ├─ Triggered by GitHub push                 │
│     ├─ npm install                              │
│     ├─ npm run build                            │
│     └─ Deploy to CDN                            │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│  4. LIVE PRODUCTION                              │
│     ├─ https://ujenzipro.vercel.app            │
│     ├─ Global CDN                               │
│     └─ SSL/HTTPS automatic                      │
└──────────────────────────────────────────────────┘
```

---

### **Development Best Practices**

#### **1. Branch Strategy**

```bash
# Create feature branch
git checkout -b feature/new-feature

# Work on your feature
# ... make changes ...

# Commit changes
git add .
git commit -m "Add new feature"

# Push feature branch
git push origin feature/new-feature

# Create Pull Request on GitHub
# Vercel will create preview deployment

# After review, merge to main
# Triggers production deployment
```

---

#### **2. Environment-Specific Settings**

**Development (local):**
```env
# .env.local
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev_key
VITE_DEV_MODE=true
```

**Production (Vercel):**
```env
# Set in Vercel Dashboard
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_key
```

---

#### **3. Testing Before Deploy**

**Checklist before pushing:**

```bash
# 1. Lint check
npm run lint
# ✅ No errors

# 2. Build test
npm run build
# ✅ Completes successfully

# 3. Preview test
npm run preview
# ✅ Everything works

# 4. Commit & push
git add .
git commit -m "Description"
git push origin main
# ✅ Auto-deploys
```

---

## 🔧 Troubleshooting

### **Common Issues & Solutions**

#### **Issue 1: Port Already in Use**

**Error:**
```
Port 5173 is already in use
```

**Solution:**
```bash
# Kill process on port 5173
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill -9

# Or let Vite use another port
npm run dev  # Will try 5174, 5175, etc.
```

---

#### **Issue 2: Module Not Found**

**Error:**
```
Cannot find module '@/components/MyComponent'
```

**Solution:**
```bash
# Verify file exists
ls src/components/MyComponent.tsx

# Check import path
# Correct: import MyComponent from '@/components/MyComponent';
# Wrong: import MyComponent from '@/component/MyComponent';

# Restart dev server
# Ctrl + C, then npm run dev
```

---

#### **Issue 3: Build Fails on Vercel**

**Symptoms:**
- Deployment shows "Error"
- Build logs show errors

**Solutions:**

1. **Check Build Locally:**
```bash
npm run build
# Fix any errors shown
```

2. **Check Environment Variables:**
```
Vercel Dashboard → Settings → Environment Variables
Verify all required variables are set
```

3. **Check Dependencies:**
```bash
# Ensure package.json is up to date
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push origin main
```

4. **View Build Logs:**
```
Vercel Dashboard → Deployments → Click deployment → View logs
Look for specific error message
```

---

#### **Issue 4: Changes Not Showing After Deploy**

**Symptoms:**
- Deployed to Vercel
- Old version still showing

**Solutions:**

1. **Hard Refresh Browser:**
```
# Desktop
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Mobile
Settings → Clear cache for site
```

2. **Clear Service Worker:**
```
Browser DevTools → Application → Service Workers
Click "Unregister" → Reload page
```

3. **Check Deployment Status:**
```
Vercel Dashboard → Should show "Ready" with ✓
If "Building", wait a few more seconds
```

4. **Verify Correct Deployment:**
```
Vercel Dashboard → Deployments
Check latest deployment is "Production"
Click to see deployment URL
```

---

#### **Issue 5: Supabase Connection Fails**

**Error:**
```
Failed to fetch from Supabase
```

**Solutions:**

1. **Check Environment Variables:**
```bash
# Local: .env.local file exists and has correct values
# Vercel: Dashboard → Settings → Environment Variables
```

2. **Verify Supabase URL:**
```bash
# Should be format: https://xxxxx.supabase.co
# Not: https://supabase.com/project/xxxxx
```

3. **Check Supabase Status:**
```
Go to: https://status.supabase.com
Verify all services are operational
```

4. **Test Connection:**
```typescript
// Add to your component temporarily
import { supabase } from '@/integrations/supabase/client';

const testConnection = async () => {
  const { data, error } = await supabase.from('test').select('*').limit(1);
  console.log('Supabase test:', data, error);
};
```

---

### **Getting Help**

#### **Resources**

| Resource | Link |
|----------|------|
| **Vercel Docs** | https://vercel.com/docs |
| **Vite Docs** | https://vitejs.dev |
| **React Docs** | https://react.dev |
| **Supabase Docs** | https://supabase.com/docs |
| **GitHub Issues** | Check repository issues |

#### **Support Channels**

- 💬 **Vercel Discord** - https://vercel.com/discord
- 📧 **Email Support** - support@vercel.com
- 📖 **Documentation** - Comprehensive guides
- 🎥 **Video Tutorials** - YouTube channel

---

## 🎯 Quick Reference Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:5173)
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Check code quality

# Git
git status              # Check changes
git add .               # Stage all changes
git commit -m "msg"     # Commit with message
git push origin main    # Push to GitHub (auto-deploys)
git log --oneline -5    # View recent commits

# Vercel CLI
vercel login            # Login to Vercel
vercel                  # Deploy preview
vercel --prod          # Deploy to production
vercel logs            # View deployment logs

# Troubleshooting
npm run build           # Test build locally
npm audit              # Check security issues
rm -rf node_modules    # Delete node_modules
npm install            # Reinstall dependencies
```

---

## 🚀 Summary

**Local Development:**
1. ✅ Clone repository
2. ✅ Install dependencies (`npm install`)
3. ✅ Create `.env.local` with Supabase credentials
4. ✅ Start dev server (`npm run dev`)
5. ✅ Make changes, see live updates

**Deployment to Vercel:**
1. ✅ Connect GitHub to Vercel (one-time)
2. ✅ Configure environment variables
3. ✅ Push to GitHub (`git push origin main`)
4. ✅ Auto-deploys in 2-3 minutes
5. ✅ Live at your Vercel URL

**Continuous Workflow:**
```
Code Locally → Test → Commit → Push → Auto-Deploy → Live! 🎉
```

---

## 📈 Next Steps

Now that you have local development and deployment working:

1. **Explore the codebase** - Understand the structure
2. **Make small changes** - Test your workflow
3. **Create new features** - Build something amazing
4. **Monitor performance** - Use Vercel Analytics
5. **Keep learning** - Check documentation links

---

## 🎉 You're Ready!

You now know how to:
- ✅ Develop MradiPro locally
- ✅ Test changes before deploying
- ✅ Deploy to Vercel automatically
- ✅ Troubleshoot common issues
- ✅ Use best practices

**Happy coding! 🚀**

---

**🇰🇪 MradiPro - Building Kenya's Future, One Line of Code at a Time! 💻**

---

*Last Updated: November 23, 2025*  
*Version: 2.0.0*  
*Status: Production Ready ✅*
















