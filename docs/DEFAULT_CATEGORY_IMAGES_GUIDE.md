# Default Category Images - Setup Guide

## 📋 Overview

Your UjenziPro platform now supports **default category images** for all material categories! This allows suppliers to quickly add products using pre-set images, or upload their own custom product photos.

## 🎯 Features

✅ **18 Material Categories** with default images:
- Cement
- Steel
- Tiles
- Paint
- Timber
- Hardware
- Plumbing
- Electrical
- Aggregates
- Roofing
- Insulation
- Tools
- Stone
- Sand
- Plywood
- Doors
- Wire
- Iron Sheets

✅ **Two Options for Suppliers**:
1. **Use Default Image** - Quick setup with category-appropriate stock photos
2. **Upload Custom Image** - Add their own product-specific photos

✅ **Seamless Experience**:
- Auto-suggests default image based on selected category
- Easy switching between default and custom images
- One-click revert to default after deleting custom images

---

## 🔧 How It Works

### For Suppliers

1. **Select Product Category** (e.g., "Cement")
2. **Choose Image Option**:
   - **Tab 1: "Use Default"** - Shows default cement image, click to use
   - **Tab 2: "Custom Upload"** - Upload their own cement bag photo
3. **Complete Product Details** and submit

### Behind the Scenes

- Default images are stored as URLs in `src/config/defaultCategoryImages.ts`
- Currently using placeholder images from **Unsplash** (free stock photos)
- Custom uploads go to Supabase Storage bucket: `product-images`
- System tracks whether product uses default or custom image

---

## 🌐 Current Image Sources

**All current default images are from Bing Image Search** - using shortened Bing URLs (sl.bing.net).

### Important Notes:
- ✅ Images are sourced via Bing image search
- ⚠️ Verify image licensing before production use
- ⚠️ Images are **placeholders** and can be replaced with better, Kenya-specific photos
- ⚠️ For production, consider using **local Kenyan product photos** with proper licensing
- 💡 Recommended: Replace with images you own or have purchased licenses for

---

## 🔄 How to Replace Default Images with Real Photos

### Option 1: Upload to Supabase Storage (Recommended)

**Step 1: Prepare Your Images**

Download or take photos of actual construction materials. Recommended specifications:
- **Resolution**: 800x800px minimum (square format works best)
- **Format**: JPG or PNG
- **Quality**: High quality, well-lit, clear product photos
- **Background**: Clean, professional backgrounds

**Step 2: Upload to Supabase**

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Create bucket called `default-category-images` (if not exists)
4. Upload your images with clear names:
   - `cement.jpg`
   - `steel.jpg`
   - `tiles.jpg`
   - etc.

5. Set the bucket to **Public** access:
   ```sql
   -- Run this in Supabase SQL Editor
   UPDATE storage.buckets 
   SET public = true 
   WHERE id = 'default-category-images';
   ```

**Step 3: Update Configuration File**

Edit `src/config/defaultCategoryImages.ts`:

```typescript
export const DEFAULT_CATEGORY_IMAGES: Record<string, CategoryImage> = {
  'Cement': {
    category: 'Cement',
    // Replace with your Supabase URL
    imageUrl: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/default-category-images/cement.jpg',
    description: 'Cement bags and powder'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/default-category-images/steel.jpg',
    description: 'Steel bars and reinforcement'
  },
  // ... update all categories
};
```

**Get Supabase Public URLs:**
1. In Supabase Storage, click on uploaded image
2. Click "Get URL" or "Copy URL"
3. Use this full URL in the config file

---

### Option 2: Use External Image Services

You can also use images from:

**Free Stock Photo Sites (Commercial Use Allowed):**
- **Unsplash** (unsplash.com) - Current source, high quality
- **Pexels** (pexels.com) - Great variety
- **Pixabay** (pixabay.com) - Large library

**Paid Stock Photo Sites (Better Quality):**
- **Shutterstock** (shutterstock.com)
- **Getty Images** (gettyimages.com)
- **Adobe Stock** (stock.adobe.com)

**Search Terms for Each Category:**

| Category | Search Terms |
|----------|-------------|
| Cement | "cement bags kenya", "cement powder", "construction cement" |
| Steel | "steel rebar", "steel bars construction", "reinforcement steel" |
| Tiles | "ceramic tiles", "floor tiles kenya", "building tiles" |
| Paint | "paint cans", "paint buckets construction", "wall paint" |
| Timber | "lumber planks", "timber beams", "construction wood" |
| Hardware | "construction hardware", "building tools kenya" |
| Plumbing | "PVC pipes", "plumbing fittings", "water pipes" |
| Electrical | "electrical cables", "construction wires kenya" |
| Aggregates | "construction gravel", "ballast kenya", "aggregates" |
| Roofing | "iron sheets kenya", "roofing materials", "corrugated sheets" |
| Insulation | "building insulation", "insulation materials" |
| Tools | "construction tools", "building equipment" |
| Stone | "building stones kenya", "construction rocks" |
| Sand | "construction sand", "building sand kenya" |
| Plywood | "plywood sheets", "wood panels kenya" |
| Doors | "wooden doors kenya", "building doors" |
| Wire | "construction wire", "binding wire kenya" |
| Iron Sheets | "corrugated iron sheets", "mabati kenya" |

---

### Option 3: Use Kenyan Supplier Photos (Best Option!)

**Partner with local suppliers** to get authentic product photos:

1. **Contact Major Suppliers**:
   - Bamburi Cement
   - Mabati Rolling Mills
   - Crown Paints
   - Athi River Steel Plant
   - Local hardware stores

2. **Request Product Photos**:
   - Explain it's for your construction platform
   - Ask for high-resolution product images
   - Get permission for commercial use
   - Offer free promotion in return!

3. **Take Your Own Photos**:
   - Visit local hardware stores
   - Take professional photos of products
   - Ensure good lighting and clean backgrounds
   - Get store owner's permission

---

## 📁 File Structure

```
src/
├── config/
│   └── defaultCategoryImages.ts       # Configuration file - EDIT HERE
├── components/
│   └── suppliers/
│       ├── CategoryImageSelector.tsx  # Main component for image selection
│       ├── ProductImageUpload.tsx     # Original upload component
│       └── SupplierProductManager.tsx # Product management (uses new system)
docs/
└── DEFAULT_CATEGORY_IMAGES_GUIDE.md   # This file
```

---

## 🎨 Current Image URLs

All current images use Bing shortened URLs with this pattern:
```
https://sl.bing.net/[SHORT_ID]
```

**Example for Cement:**
```typescript
'Cement': {
  category: 'Cement',
  imageUrl: 'https://sl.bing.net/d62tA3E0PXE',
  description: 'Cement bags and powder'
}
```

---

## 🚀 Testing the Feature

### As a Supplier:

1. **Login** to your supplier account
2. Navigate to **Products** tab
3. Click **"Add Product"**
4. **Select a category** (e.g., "Cement")
5. **Notice two tabs** in the image section:
   - **"📦 Use Default"** - Shows default cement image
   - **"📸 Custom Upload"** - Upload your own image
6. **Try both options**:
   - Click "Use This Default Image" on default tab
   - Switch to custom tab and upload your own photo
   - Delete custom image to revert to default
7. **Complete the product** and submit

### Expected Behavior:

✅ Category selection updates available default image  
✅ Default image tab shows category-appropriate photo  
✅ Custom upload tab allows file selection  
✅ Green checkmark shows when using default image  
✅ Can switch between default and custom anytime  
✅ Removing custom image reverts to default  

---

## 🔐 Database & Storage

### Supabase Storage Buckets:

1. **`company-logos`** - Supplier company logos (existing)
2. **`product-images`** - Custom product uploads (existing)
3. **`default-category-images`** - Optional: Store default images here (recommended)

### Database Fields:

**`materials` table:**
- `image_url` (text) - Stores either default URL or custom upload URL
- System doesn't distinguish between default/custom in database
- Frontend determines by comparing with default config

---

## 💡 Best Practices

### For Platform Admins:

1. **Use high-quality images** (800x800px minimum)
2. **Consistent style** - All images should have similar quality/style
3. **Local context** - Use Kenya-specific products when possible
4. **Regular updates** - Replace with better images as you find them
5. **Test on mobile** - Ensure images look good on all devices

### For Suppliers:

1. **Start with defaults** for quick setup
2. **Upload custom images** for better sales
3. **Use clear photos** with good lighting
4. **Show actual product** - no generic stock photos if possible
5. **Professional backgrounds** - clean, uncluttered

---

## 🐛 Troubleshooting

### Image Not Loading

**Problem**: Default image shows broken/blank

**Solutions**:
1. Check if URL is valid (paste in browser)
2. Ensure image URL is HTTPS (not HTTP)
3. Check CORS settings if using external source
4. Verify Supabase bucket is public (if using Supabase)

### Default Image Not Showing for Category

**Problem**: "No default image" message appears

**Solutions**:
1. Check category spelling matches exactly in config file
2. Verify category exists in `PRODUCT_CATEGORIES` array
3. Ensure `imageUrl` is not empty in config

### Custom Upload Not Working

**Problem**: Upload fails or image doesn't save

**Solutions**:
1. Check file size (must be under 5MB)
2. Verify file type is image (JPG, PNG, WEBP)
3. Ensure `product-images` bucket exists in Supabase
4. Check bucket permissions (RLS policies)

---

## 📊 Image URLs Reference

Here are the current placeholder image URLs from Bing:

```javascript
Cement:      https://sl.bing.net/d62tA3E0PXE
Steel:       https://sl.bing.net/kobtIuYbsiW
Tiles:       https://sl.bing.net/k5PNWfszVHo
Paint:       https://sl.bing.net/gEnK82bfXiK
Timber:      https://sl.bing.net/hQaCuQAPwJw
Hardware:    https://sl.bing.net/eN1ACSfGMkS
Plumbing:    https://sl.bing.net/fVaL3oegSho
Electrical:  https://sl.bing.net/bmCmpR8ms5Q
Aggregates:  https://sl.bing.net/jlxtls1ISDk
Roofing:     https://sl.bing.net/eeRYnLyVrDo
Insulation:  https://sl.bing.net/k3GNta7wpA4
Tools:       https://sl.bing.net/dQ7UNR9BfZ6
Stone:       https://sl.bing.net/fZm4AVNM8vA
Sand:        https://sl.bing.net/kpEDIO04WKi
Plywood:     https://sl.bing.net/dZuvpl3tsaa
Doors:       https://sl.bing.net/LCWbUGNhtc
Wire:        https://sl.bing.net/bBIGmanV39g
Iron Sheets: https://sl.bing.net/f6ET2WN4vuK
Blocks:      https://sl.bing.net/i5Z59m7JCxM
Glass:       https://sl.bing.net/hNgomj7rZe0
Windows:     https://sl.bing.net/eGbW5ybZwia
Other:       https://sl.bing.net/f6drwoH9VKK
```

**Note**: Consider replacing with licensed images for production use!

---

## 🎯 Next Steps

### Immediate (You Can Do Now):
1. ✅ Test the feature as a supplier
2. ✅ Review current placeholder images
3. ✅ Make list of better image sources

### Short Term (Within a week):
1. 📸 Source better, Kenya-specific images
2. 📤 Upload to Supabase Storage
3. 🔄 Update `defaultCategoryImages.ts` with new URLs
4. ✅ Test all categories

### Long Term (Ongoing):
1. 🤝 Partner with Kenyan suppliers for authentic photos
2. 📊 Track which products use default vs custom images
3. 💡 Encourage suppliers to upload custom photos
4. 🎨 Maintain consistent image quality standards

---

## 📞 Support

**Questions or Issues?**

1. Check this guide first
2. Review code comments in `src/config/defaultCategoryImages.ts`
3. Test in development environment
4. Check browser console for errors

**Configuration File Location:**
```
src/config/defaultCategoryImages.ts
```

**Main Component:**
```
src/components/suppliers/CategoryImageSelector.tsx
```

---

## 🎉 Benefits

### For Suppliers:
- ⚡ **Faster onboarding** - Can list products immediately
- 🎨 **Professional look** - Default images look good
- 🔄 **Flexibility** - Can upgrade to custom images anytime

### For Platform:
- 📈 **More listings** - Lower barrier to entry
- 🎯 **Consistency** - All products have images
- 💼 **Professional** - No blank product listings

### For Buyers:
- 👀 **Better experience** - Visual product browsing
- ✅ **Trust** - Products look more legitimate
- 🎯 **Easier decisions** - Can see what they're buying

---

**Last Updated**: October 28, 2025  
**Version**: 1.0  
**Platform**: UjenziPro Construction Management System

