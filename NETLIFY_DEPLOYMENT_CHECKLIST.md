# Netlify Deployment Checklist - Custom Images Not Showing

## Problem
Custom hero images pushed to GitHub but not showing on Netlify

## Possible Causes & Solutions

### 1. Netlify Build Settings
**Check:** Build command in Netlify dashboard
- Should be: `npm run build`
- Publish directory: `dist`

### 2. Large File Size Issue
**slide-1.jpg is 1MB** - This might be too large!

**Solution:** Compress it
1. Visit https://tinyjpg.com
2. Upload slide-1.jpg
3. Download compressed version (~200KB)
4. Replace the file
5. Commit and push

### 3. Netlify Cache
**Solution:** Clear deploy cache
1. Netlify Dashboard → Site Settings
2. Build & Deploy → Clear cache
3. Trigger deploy → "Clear cache and deploy site"

### 4. File Path Issue
**Verify:** Images are in `public` folder (they are ✅)
**Verify:** Code references `/image-name.jpg` (it does ✅)

### 5. Git LFS Needed for Large Files?
If files >100MB, need Git LFS
Current largest: slide-1.jpg (1MB) - should be fine

### 6. Manual Netlify Deploy
Try manual deploy:
```bash
# Build locally
npm run build

# Then upload dist folder manually to Netlify
# Or use Netlify CLI:
netlify deploy --prod --dir=dist
```

### 7. Check Netlify Deploy Log
1. Go to Netlify Dashboard
2. Click on latest deploy
3. Check deploy log for errors
4. Look for image copy errors

### 8. Verify Files in Dist Folder
After `npm run build`, check:
```bash
ls dist/assets/*.jpg
ls dist/*.jpg
```

Images should be copied to dist folder by Vite.

## Quick Fix Steps

### Step 1: Clear Everything
```bash
# Clear local build
rm -rf dist node_modules/.vite

# Rebuild
npm run build
```

### Step 2: Verify Build Output
Check that images are in dist folder

### Step 3: Force Netlify Redeploy
- Netlify Dashboard
- Trigger deploy
- Clear cache and deploy site

### Step 4: Hard Refresh Browser
- Ctrl+Shift+R (Windows)
- Cmd+Shift+R (Mac)
- Or incognito mode

## Expected Result
After proper deployment + cache clear + hard refresh:
- Home: Shows slide-1.jpg
- Login: Shows kenyan-workers.jpg
- Builders: Shows builders-hero-bg.jpg
- Suppliers: Shows suppliers-hero-bg.jpg
- Delivery: Shows delivery-hero-bg.jpg

## If Still Not Working

### Check if Vite copies images from public folder:
Images in `public` folder should automatically be copied to `dist` root during build.

### Verify in dist after build:
```bash
npm run build
ls dist/*.jpg
```

Should see all 5 images in dist folder.

## Current Status
- ✅ All images in GitHub
- ✅ Code references correct paths
- ✅ Cache busting added
- ⏳ Waiting for Netlify deployment
- ⏳ Need to verify Netlify build log

