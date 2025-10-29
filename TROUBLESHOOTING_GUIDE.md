# 🔧 Troubleshooting: Default Images Not Showing

## ❌ Problem
You've implemented default category images but they're not showing in the catalog.

## ✅ Solutions (Try these in order)

### 1. **Clear Browser Cache & Hard Refresh**

**Chrome/Edge:**
- Press `Ctrl + Shift + R` (Windows)
- Press `Cmd + Shift + R` (Mac)

**Firefox:**
- Press `Ctrl + F5` (Windows)
- Press `Cmd + Shift + R` (Mac)

**Or manually:**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

---

### 2. **Restart Development Server**

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

### 3. **Test Image URLs Directly**

Open this test file in your browser:
```
file:///path/to/UjenziPro/TEST_DEFAULT_IMAGES.html
```

Or paste these URLs in your browser to check if they load:

**Cement:** https://sl.bing.net/d62tA3E0PXE  
**Steel:** https://sl.bing.net/kobtIuYbsiW  
**Tiles:** https://sl.bing.net/k5PNWfszVHo  

If they don't load → CORS or Bing URL issue  
If they load → Browser cache issue

---

### 4. **Check Browser Console for Errors**

1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Look for errors like:
   - ❌ `CORS policy blocked`
   - ❌ `Failed to load resource`
   - ❌ `404 Not Found`

**If you see CORS errors**, the Bing short URLs might not allow embedding. You'll need to:
- Upload images to Supabase Storage
- Or use direct Unsplash/Pexels URLs
- Or use data URIs

---

### 5. **Verify Code is Actually Updated**

Open DevTools → Sources tab → Find `SupplierCatalogModal.tsx`

Search for: `// image removed - will use default`

**If you DON'T see these comments**, your browser is using cached code!

---

### 6. **Check Network Tab**

1. Open DevTools (F12)
2. Go to **Network** tab
3. Open a supplier catalog
4. Filter by "Img"
5. Look for requests to `sl.bing.net`

**If you see:**
- ✅ Green 200 status → Images loading successfully
- ❌ Red errors → CORS or URL issue
- ❌ No requests at all → Code not updated

---

### 7. **Test with Simple HTML**

Open `TEST_DEFAULT_IMAGES.html` in browser and check:
- ✅ All 18 images load → Code issue in React app
- ❌ Images don't load → Bing URL/CORS issue

---

### 8. **Alternative: Use Direct Unsplash URLs**

If Bing URLs are blocked, replace in `src/config/defaultCategoryImages.ts`:

```typescript
'Cement': {
  category: 'Cement',
  imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80',
  description: 'Cement bags and powder'
},
```

These are CORS-friendly and will work immediately.

---

### 9. **Verify in Incognito/Private Window**

Open your app in an incognito/private window to bypass all cache.

**If it works in incognito** → Clear your browser cache  
**If it still doesn't work** → Code or URL issue

---

### 10. **Check the Actual Code Running**

In browser console, type:

```javascript
// Check if config is loaded
import { getDefaultCategoryImage } from '@/config/defaultCategoryImages';
console.log(getDefaultCategoryImage('Cement'));
```

Should output: `https://sl.bing.net/d62tA3E0PXE`

---

## 🎯 Quick Test

**Right now, do this:**

1. Open: http://localhost:5173 (or your dev URL)
2. Press `Ctrl + Shift + R` (hard refresh)
3. Click "View Catalog" on any supplier
4. Press `F12` → Console tab
5. Type: `document.querySelector('img').src`
6. Send me the output!

---

## 🔍 Common Issues

### Issue: "Bing URLs don't load"
**Solution**: Bing short URLs might not support CORS. Use Unsplash or upload to Supabase.

### Issue: "Still seeing old Unsplash images"
**Solution**: Browser cache. Clear cache + hard refresh.

### Issue: "No images at all, just placeholders"
**Solution**: Category names don't match. Check spelling in demo data.

### Issue: "Works locally but not deployed"
**Solution**: Re-deploy or clear CDN cache.

---

## 🚀 Fastest Fix

**Replace Bing URLs with Unsplash:**

1. Open `src/config/defaultCategoryImages.ts`
2. Replace all `sl.bing.net` URLs with `images.unsplash.com` URLs
3. Save
4. Hard refresh browser

**These Unsplash URLs are guaranteed to work:**
- Cement: `https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80`
- Steel: `https://images.unsplash.com/photo-1565620843922-434f8c65e939?w=800&q=80`
- Tiles: `https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=800&q=80`

---

## 📞 What to Check RIGHT NOW

1. ✅ Is dev server running? (`npm run dev`)
2. ✅ Did you hard refresh? (Ctrl+Shift+R)
3. ✅ Open DevTools console - any errors?
4. ✅ Open TEST_DEFAULT_IMAGES.html - do images load?

**Send me the answers to these 4 questions!**

