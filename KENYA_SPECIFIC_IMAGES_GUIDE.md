# 🇰🇪 Kenya-Specific Construction Material Images Guide

## 📸 How to Get Real Kenyan Brand Images

### Method 1: Official Company Websites (Best & Legal)

#### 1. **Bamburi Cement** (Cement)
- Website: https://www.bamburicement.com
- Products: Bamburi 42.5N, 32.5R, Tembo
- Look for: Product catalog, download center
- Contact: marketing@bamburi.co.ke for image permission

#### 2. **Mabati Rolling Mills** (Roofing & Iron Sheets)
- Website: https://mabati.com
- Products: Mabati Versatile, Box Profile, Corrugated
- Look for: Product gallery, brochures
- Contact: info@mabati.com for image rights

#### 3. **Crown Paints** (Paint)
- Website: https://crownpaints.co.ke
- Products: Crown Emulsion, Gloss, Wood finishes
- Look for: Product catalog section
- Contact: info@crownpaints.co.ke

#### 4. **ARM Cement / Savannah Cement** (Cement)
- Alternative cement brands in Kenya
- Search their product catalogs

#### 5. **Steel & Tubes Kenya** (Steel)
- For rebar, steel bars, mesh
- Look for product images

#### 6. **Tiles & Carpet Centre** (Tiles)
- Kenyan tile distributor
- Product galleries available

---

### Method 2: Search for Free Kenya Construction Images

**Search Terms to Use:**
- "Bamburi cement bag Kenya" + site:unsplash.com
- "Kenyan construction materials" + site:pexels.com
- "Nairobi hardware store products" + site:pixabay.com
- "Mabati iron sheets Kenya"
- "Crown paints Kenya products"

**Recommended Search Sites:**
1. **Unsplash.com** - Search: "construction materials Kenya"
2. **Pexels.com** - Search: "African construction", "cement bags Africa"
3. **Pixabay.com** - Search: "building materials"

---

### Method 3: Take Your Own Photos

**Visit Local Hardware Stores:**
1. Go to Nairobi/your local hardware store
2. Take clear photos of:
   - Bamburi cement bags
   - Mabati iron sheets display
   - Crown Paints shelves
   - Rebar bundles
   - Tile samples
   - Plumbing pipes (Kenpipe)
   - Electrical cables (Nyayo cables)

3. Ask store owner for permission
4. Offer to credit their store

**Photo Tips:**
- Good lighting
- Clean background
- 800x800px minimum
- Show product labels clearly

---

## 🎯 Recommended Free Images (Kenya-Style Construction)

I recommend searching these specific Unsplash/Pexels queries:

### For Each Category:

**Cement:**
- Search: "cement bags construction site Africa"
- Look for: Orange/grey cement bags (similar to Bamburi colors)

**Steel:**
- Search: "steel rebar construction Africa"
- Look for: Deformed steel bars, construction site

**Tiles:**
- Search: "floor tiles Kenya" OR "ceramic tiles Africa"
- Look for: Modern floor tiles

**Paint:**
- Search: "paint buckets hardware store"
- Look for: Paint display in stores

**Roofing:**
- Search: "corrugated iron sheets Africa" OR "metal roofing Kenya"
- Look for: Box profile or corrugated sheets

**Timber:**
- Search: "timber construction Kenya" OR "wood planks Africa"

**Plumbing:**
- Search: "PVC pipes construction"

**Electrical:**
- Search: "electrical cables construction"

**Blocks:**
- Search: "concrete blocks Kenya"

**Aggregates:**
- Search: "construction aggregates ballast Kenya"

---

## 📋 Quick Action Plan

### Step 1: Collect Images (Choose ONE method)

**Option A - Use Unsplash (Fastest - 10 minutes)**
1. Go to Unsplash.com
2. Search for each category with "Kenya" or "Africa"
3. Download high-res images (free license)
4. Note the image URLs

**Option B - Contact Companies (Best Quality - 1-2 weeks)**
1. Email Bamburi, Mabati, Crown Paints
2. Request product images for your platform
3. Offer free advertising in return
4. Wait for permission & images

**Option C - Take Photos (Most Authentic - 1 day)**
1. Visit local hardware stores
2. Take photos with permission
3. Upload to Supabase Storage
4. Use your own URLs

---

### Step 2: Upload Images to Supabase

```bash
# In Supabase Dashboard:
1. Go to Storage
2. Create bucket: "default-category-images"
3. Make bucket PUBLIC
4. Upload images:
   - cement.jpg
   - steel.jpg
   - tiles.jpg
   - paint.jpg
   - timber.jpg
   - hardware.jpg
   - plumbing.jpg
   - electrical.jpg
   - aggregates.jpg
   - roofing.jpg
   - insulation.jpg
   - tools.jpg
   - stone.jpg
   - sand.jpg
   - plywood.jpg
   - doors.jpg
   - wire.jpg
   - iron-sheets.jpg
```

---

### Step 3: Get Supabase URLs

For each uploaded image:
1. Click on the image in Supabase Storage
2. Click "Get URL" or "Copy URL"
3. Copy the public URL

Format will be:
```
https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/default-category-images/cement.jpg
```

---

### Step 4: Update Config File

Open: `src/config/defaultCategoryImages.ts`

Replace URLs like this:

```typescript
export const DEFAULT_CATEGORY_IMAGES: Record<string, CategoryImage> = {
  'Cement': {
    category: 'Cement',
    imageUrl: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/default-category-images/cement.jpg',
    description: 'Bamburi Cement 42.5N - Kenyan premium cement'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/default-category-images/steel.jpg',
    description: 'Y12 Deformed Steel Bars - KEBS approved'
  },
  'Paint': {
    category: 'Paint',
    imageUrl: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/default-category-images/paint.jpg',
    description: 'Crown Paints Kenya - Premium emulsion'
  },
  'Roofing': {
    category: 'Roofing',
    imageUrl: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/default-category-images/roofing.jpg',
    description: 'Mabati Iron Sheets - Made in Kenya'
  },
  // ... etc for all categories
};
```

---

## 🚀 Fastest Solution (Right Now)

Since you want Kenya-specific images immediately, here's what to do:

### Use These Better Unsplash Searches:

1. **Cement:**
   - Search Unsplash: "cement bags construction"
   - Pick one that looks like African/Kenyan style
   - Copy URL with `?w=800&q=80` parameter

2. **Steel:**
   - Search Unsplash: "steel rebar construction site"
   - Pick construction rebar image
   - Copy URL

3. **Roofing:**
   - Search Unsplash: "corrugated metal roof"
   - Pick African-style roofing
   - Copy URL

4. **Paint:**
   - Search Unsplash: "paint cans hardware store"
   - Copy URL

5. **Tiles:**
   - Search Unsplash: "ceramic floor tiles"
   - Copy URL

Then update `src/config/defaultCategoryImages.ts` with these better URLs.

---

## 💡 Recommended Approach

**For MVP / Quick Launch:**
- ✅ Use current Unsplash images (they work!)
- ✅ Update descriptions to mention Kenyan brands
- ✅ Launch your platform

**For Production / Later:**
- 📸 Gradually replace with real Kenyan brand images
- 🤝 Partner with local suppliers for authentic photos
- 📧 Get permission from Bamburi, Mabati, Crown Paints

---

## 📧 Email Template for Kenyan Companies

```
Subject: Partnership Request - Product Images for Construction Platform

Dear [Company Name] Team,

I am developing UjenziPro, a digital platform connecting construction 
material suppliers with builders across Kenya.

We would like to feature your products ([Product Names]) on our platform 
and need high-quality product images for:
- [List specific products]

In return, we will:
✓ Credit your brand on all images
✓ Link to your website
✓ Promote your products to our builder network
✓ Provide free advertising space

Could you provide product images or grant permission to use images 
from your website?

Best regards,
[Your Name]
UjenziPro Platform
[Your Contact]
```

---

## 🎯 Summary

**Right Now (Easiest):**
- Keep current Unsplash images
- Update descriptions to mention Kenyan brands
- Launch and iterate

**Next Week:**
- Email Kenyan companies for images
- Visit hardware stores to take photos
- Replace images gradually

**Best Long-term:**
- Partner with Bamburi, Mabati, Crown Paints
- Get official product images
- Build authentic Kenyan construction marketplace

---

**Need help with any of these steps? Let me know!**

