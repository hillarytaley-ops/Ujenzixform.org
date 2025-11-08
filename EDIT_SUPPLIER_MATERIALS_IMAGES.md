# 🖼️ Edit Supplier Materials Images - Quick Guide

## 📁 **Key Files for Editing Product Images:**

### **Main Components:**

1. **`src/components/suppliers/SupplierProductManager.tsx`** ⭐
   - Main product management interface
   - Add/Edit/Delete products
   - Uses CategoryImageSelector for images
   - Lines 318-328: Image upload section

2. **`src/components/suppliers/CategoryImageSelector.tsx`** ⭐
   - Dual image system (Default OR Custom)
   - Upload custom photos
   - Use pre-made category images
   - Complete image management

3. **`src/components/suppliers/ProductImageUpload.tsx`**
   - Simple image uploader (legacy)
   - Basic upload functionality

4. **`src/config/defaultCategoryImages.ts`**
   - Default category image URLs
   - Edit this to change default images

---

## 🎯 **How to Edit Material Images:**

### **Option 1: Change Default Category Images**

**File:** `src/config/defaultCategoryImages.ts`

```typescript
// Current structure:
export const getDefaultCategoryImage = (category: string): string | undefined => {
  const categoryImages: Record<string, string> = {
    'Cement': 'https://sl.bing.net/ga740SqkiSi',
    'Steel': 'https://sl.bing.net/hUMRh1Ij3N6',
    'Paint': 'https://sl.bing.net/d9dp6WvYpTE',
    // etc...
  };
  
  return categoryImages[category];
};
```

**To edit:**
1. Open `src/config/defaultCategoryImages.ts`
2. Find the category you want to change
3. Replace the URL with your new image URL
4. Save and commit

---

### **Option 2: Upload Custom Product Images**

**Component:** `CategoryImageSelector.tsx` (lines 67-131)

**Upload Function:**
```typescript
const handleFileSelect = async (file: File) => {
  // 1. Validate file type (JPG, PNG, WEBP)
  // 2. Validate file size (max 5MB)
  // 3. Create unique filename
  // 4. Upload to Supabase 'product-images' bucket
  // 5. Get public URL
  // 6. Return URL to product
};
```

**Storage Location:**
```
Supabase Storage Bucket: 'product-images'
Path: {supplierId}/{timestamp}-{product-name}.{ext}
Example: abc123/1698765432-bamburi-cement-50kg.jpg
```

---

### **Option 3: Edit in Supplier Dashboard**

**Access via UI:**

1. **Login as Supplier** at `/auth`
2. **Go to Suppliers page**
3. **Navigate to:** Product management section
4. **Click:** "Add Product" or "Edit" on existing product
5. **In the form:**
   - Select category first
   - See image selector with 2 tabs:
     - **📦 Use Default** - Quick category images
     - **📸 Custom Upload** - Your own photos

---

## 🔧 **Code Locations:**

### **Product Form with Image Selector:**

**File:** `src/components/suppliers/SupplierProductManager.tsx`

**Lines 318-328:**
```tsx
{/* Product Image Upload with Category Support */}
<div>
  <Label className="text-lg font-semibold mb-4 block">
    Product Image *
  </Label>
  <CategoryImageSelector
    currentImageUrl={formData.image_url}
    onImageSelect={(url) => setFormData({ ...formData, image_url: url })}
    category={formData.category}
    productName={formData.name || 'product'}
    supplierId={supplierId}
  />
</div>
```

---

### **Image Upload Handler:**

**File:** `src/components/suppliers/CategoryImageSelector.tsx`

**Lines 67-131:**
```typescript
const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  
  // Validate
  if (!file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) return;

  // Create filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${supplierId}/${Date.now()}-${productName}.${fileExt}`;

  // Upload to Supabase
  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file);

  // Get public URL
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  // Save URL
  onImageSelect(data.publicUrl);
};
```

---

## 📝 **To Edit These Files:**

### **Simply open and edit:**

```typescript
// File: src/config/defaultCategoryImages.ts
export const getDefaultCategoryImage = (category: string) => {
  const images = {
    'Cement': 'YOUR_NEW_CEMENT_IMAGE_URL',  // ← Edit this
    'Steel': 'YOUR_NEW_STEEL_IMAGE_URL',    // ← Edit this
    // etc...
  };
  return images[category];
};
```

```typescript
// File: src/components/suppliers/CategoryImageSelector.tsx
// Lines 82-90: Change file size limit
if (file.size > 10 * 1024 * 1024) {  // ← Change to 10MB
  toast({ title: 'File too large' });
  return;
}
```

---

## 🎨 **Image Requirements:**

### **Validation (Current):**
- **File Types:** JPG, PNG, WEBP
- **Max Size:** 5MB
- **Recommended:** 800x800px square
- **Format:** RGB color, high quality

### **Storage:**
- **Bucket:** `product-images` (Supabase Storage)
- **Access:** Public (anyone can view)
- **Retention:** Permanent until deleted

---

## 🚀 **Quick Edits:**

### **Want to change max file size?**
**File:** `CategoryImageSelector.tsx` line 83
```typescript
if (file.size > 10 * 1024 * 1024) {  // Change 5 to 10
```

### **Want to change accepted formats?**
**File:** `CategoryImageSelector.tsx` line 73
```typescript
if (!file.type.match(/image\/(jpeg|jpg|png|webp|gif)/)) {  // Add more types
```

### **Want to change upload path?**
**File:** `CategoryImageSelector.tsx` line 96
```typescript
const fileName = `products/${supplierId}/${Date.now()}.${fileExt}`;  // Change path
```

---

## 📂 **Files You Can Edit:**

```
src/
├── components/suppliers/
│   ├── SupplierProductManager.tsx  ← Main product management
│   ├── CategoryImageSelector.tsx   ← Image upload/selection
│   ├── ProductImageUpload.tsx      ← Simple uploader
│   └── MaterialsGrid.tsx           ← Display products
├── config/
│   └── defaultCategoryImages.ts    ← Default image URLs
└── pages/
    └── Suppliers.tsx                ← Suppliers page
```

---

## ✅ **What You Can Change:**

1. **Default Category Images** - Edit URLs in config file
2. **Upload Size Limit** - Change 5MB to larger
3. **File Types** - Add more formats
4. **Storage Path** - Change folder structure
5. **Validation Rules** - Custom checks
6. **UI Text** - Change labels and messages

---

## 🎯 **Most Common Edits:**

### **1. Change Default Cement Image:**
```
File: src/config/defaultCategoryImages.ts
Find: 'Cement': 'current-url'
Change to: 'Cement': 'new-url'
```

### **2. Increase Upload Size:**
```
File: src/components/suppliers/CategoryImageSelector.tsx
Line 83: Change 5 to 10 (for 10MB)
```

### **3. Change Button Text:**
```
File: src/components/suppliers/CategoryImageSelector.tsx
Line 298: Change "Upload Custom Image" text
```

---

**All files are ready for you to edit! Just open them in your editor and make changes!** 🎨✨

**Would you like me to make specific changes to any of these files?**

