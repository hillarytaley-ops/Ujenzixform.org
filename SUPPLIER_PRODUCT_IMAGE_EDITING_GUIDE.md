# 📸 Supplier Product Image Editing - Complete Guide

## 📋 **Overview**

UjenziPro provides suppliers with TWO ways to manage product images:
1. **Use Default Category Images** - Quick and easy
2. **Upload Custom Images** - Your own product photos

---

## 🎯 **Key Components**

### **1. CategoryImageSelector.tsx** ⭐ (Recommended)
**Location:** `src/components/suppliers/CategoryImageSelector.tsx`

**Features:**
- ✅ **Dual Options:** Default category images OR custom uploads
- ✅ **Tabbed Interface:** Easy switching between default and custom
- ✅ **Auto-Selection:** Automatically uses default when category selected
- ✅ **Smart Upload:** Validates file type and size
- ✅ **Image Management:** Upload, change, and remove images
- ✅ **Preview:** Live preview before saving

**Used in:** `SupplierProductManager.tsx` (Product add/edit forms)

---

### **2. ProductImageUpload.tsx** (Legacy)
**Location:** `src/components/suppliers/ProductImageUpload.tsx`

**Features:**
- ✅ **Simple Upload:** Basic image upload functionality
- ✅ **Validation:** File type and size checks
- ✅ **Preview:** Shows uploaded image
- ✅ **Remove:** Delete uploaded images

**Note:** Use `CategoryImageSelector` instead for better UX

---

### **3. SupplierProductManager.tsx** (Main Interface)
**Location:** `src/components/suppliers/SupplierProductManager.tsx`

**Features:**
- ✅ **Product Management:** Add, edit, delete products
- ✅ **Image Integration:** Uses CategoryImageSelector
- ✅ **Form Handling:** Complete product form
- ✅ **Database:** Saves to Supabase

---

## 🔧 **How to Use (For Suppliers)**

### **Adding a New Product with Image:**

1. **Login as Supplier**
2. **Go to:** Suppliers page → Workflow tab
3. **Click:** "Add New Product" button
4. **Fill Product Details:**
   - Product name
   - **Select Category** ← IMPORTANT! Do this first!
   - Description
   - Unit price
   - Unit type

5. **Choose Image Option:**
   
   **Option A: Use Default Image (Easy)**
   - Click "📦 Use Default" tab
   - See default image for your category
   - Click "Use This Default Image"
   - ✅ Done!

   **Option B: Upload Custom Image**
   - Click "📸 Custom Upload" tab
   - Click "Upload Custom Image"
   - Select your product photo (JPG, PNG, WEBP)
   - Wait for upload
   - ✅ Done!

6. **Save Product**

---

### **Editing Product Images:**

1. **Find Your Product** in the product list
2. **Click Edit** button (pencil icon)
3. **In the form:**
   - Scroll to "Product Image" section
   - See current image
   
4. **Change Image:**
   
   **Switch to Default:**
   - Click "📦 Use Default" tab
   - Click "Use This Default Image"
   - Old custom image deleted automatically
   
   **Upload New Custom Image:**
   - Click "📸 Custom Upload" tab
   - Click "Change Custom Image"
   - Select new photo
   - Old image replaced automatically

5. **Save Changes**

---

## 💻 **Code Implementation**

### **Basic Usage:**

```tsx
import { CategoryImageSelector } from '@/components/suppliers/CategoryImageSelector';

// In your product form:
<CategoryImageSelector
  currentImageUrl={product.image_url}
  onImageSelect={(url) => setFormData({ ...formData, image_url: url })}
  category={formData.category}
  productName={formData.name}
  supplierId={supplierId}
/>
```

### **Props:**

| Prop | Type | Description |
|------|------|-------------|
| `currentImageUrl` | string | Current image URL (optional) |
| `onImageSelect` | function | Callback when image is selected |
| `category` | string | Product category (e.g., "Cement") |
| `productName` | string | Product name for filename |
| `supplierId` | string | Supplier ID for folder structure |

---

## 📦 **Supabase Storage Structure**

### **Bucket:** `product-images`

### **Folder Structure:**
```
product-images/
├── {supplierId}/
│   ├── 1234567890-cement-50kg.jpg
│   ├── 1234567891-steel-y12.png
│   └── 1234567892-paint-20l.webp
```

### **Filename Format:**
```
{supplierId}/{timestamp}-{product-name-slug}.{extension}
```

**Example:**
```
abc123/1698765432-bamburi-cement-50kg.jpg
```

---

## ✅ **Image Validation**

### **File Type:**
- ✅ JPG/JPEG
- ✅ PNG
- ✅ WEBP
- ❌ GIF, SVG, BMP not recommended

### **File Size:**
- **Maximum:** 5MB
- **Recommended:** 500KB - 1MB
- **Optimal:** 200-500KB (compressed)

### **Dimensions:**
- **Recommended:** 800x800px (square)
- **Minimum:** 500x500px
- **Maximum:** 2000x2000px

---

## 🎨 **Image Best Practices**

### **For Best Results:**

1. **Clear Product Photo**
   - Good lighting
   - Clean background (white/neutral)
   - Product centered
   - Multiple angles if needed

2. **Professional Quality**
   - High resolution
   - No blur
   - Clear text on packaging
   - Brand logos visible

3. **Optimize Before Upload**
   - Compress to under 500KB
   - Use tools like: tinyjpg.com
   - Maintain quality while reducing size

4. **Consistent Style**
   - Same background for all products
   - Similar lighting
   - Same aspect ratio (square preferred)

---

## 🔄 **Default vs Custom Images**

### **Default Category Images:**

**Pros:**
- ✅ Instant setup (1 click)
- ✅ Professional quality
- ✅ Consistent look
- ✅ No upload needed
- ✅ Pre-optimized

**Cons:**
- ❌ Generic (not your specific product)
- ❌ Same as other suppliers
- ❌ May not match your brand

**Best For:**
- Quick product setup
- Standard materials
- Bulk uploads
- Getting started fast

---

### **Custom Uploaded Images:**

**Pros:**
- ✅ Your exact product
- ✅ Shows your brand
- ✅ Unique and distinctive
- ✅ Better customer trust
- ✅ Higher conversion rates

**Cons:**
- ❌ Requires photo taking
- ❌ Upload time
- ❌ Need good quality photos

**Best For:**
- Branded products
- Unique items
- Premium products
- Building brand identity

---

## 🛠️ **Technical Details**

### **Upload Function:**

```typescript
const handleFileSelect = async (file: File) => {
  // 1. Validate file
  if (!file.type.startsWith('image/')) {
    // Show error
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    // File too large
    return;
  }

  // 2. Create unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${supplierId}/${Date.now()}-${productName}.${fileExt}`;

  // 3. Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file);

  // 4. Get public URL
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  // 5. Save URL to product
  onImageSelect(data.publicUrl);
};
```

### **Delete Function:**

```typescript
const handleRemove = async (imageUrl: string) => {
  // 1. Extract file path from URL
  const filePath = extractPathFromUrl(imageUrl);

  // 2. Delete from storage
  await supabase.storage
    .from('product-images')
    .remove([filePath]);

  // 3. Update product
  onImageSelect(''); // or revert to default
};
```

---

## 📱 **Access the Feature**

### **As a Supplier:**

1. **Login:** Go to `/auth` and login with supplier credentials
2. **Navigate:** Click "Suppliers" in menu
3. **Open Dashboard:** You'll see supplier workflow tabs
4. **Go to Products Tab:** (or similar)
5. **Add/Edit Product:** Image selector will appear in the form

---

## 🎯 **Quick Reference**

### **Files to Edit:**

| File | Purpose |
|------|---------|
| `CategoryImageSelector.tsx` | Main image selector component |
| `ProductImageUpload.tsx` | Legacy simple uploader |
| `SupplierProductManager.tsx` | Product management interface |

### **Database:**

| Table | Column | Type |
|-------|--------|------|
| `products` | `image_url` | TEXT |
| `products` | `category` | TEXT |
| `products` | `supplier_id` | UUID |

### **Storage:**

| Bucket | Path | Access |
|--------|------|--------|
| `product-images` | `{supplierId}/{filename}` | Public |

---

## 🚀 **Example Workflow**

### **Supplier adds Cement product:**

```typescript
// 1. Fill form
formData = {
  name: "Bamburi Cement 50kg",
  category: "Cement",  // ← Triggers default image
  description: "High quality...",
  unit_price: 850,
  unit: "bag",
  image_url: ""  // Will be filled by image selector
}

// 2. Image selector automatically shows:
// - Default tab: Default cement image
// - Custom tab: Upload button

// 3. Supplier chooses:
// Option A: Click "Use Default Image"
//   → image_url = "https://...default-cement.jpg"
// Option B: Upload custom photo
//   → image_url = "https://...storage.../abc123/1234-bamburi-cement.jpg"

// 4. Save product
await supabase.from('products').insert(formData);
```

---

## 📞 **Support**

### **For Suppliers:**
- **Help Docs:** See supplier dashboard
- **Support:** support@ujenzipro.co.ke
- **Phone:** +254-700-UJENZIPRO

### **For Developers:**
- **Components:** Check `src/components/suppliers/`
- **Storage:** Check Supabase bucket: `product-images`
- **Database:** Check `products` table schema

---

## ✨ **Summary**

### **What Suppliers Can Do:**

✅ **Upload** custom product photos  
✅ **Edit** existing product images  
✅ **Delete** custom images  
✅ **Switch** between default and custom  
✅ **Preview** images before saving  
✅ **Manage** all product images  

### **Components:**
- **CategoryImageSelector.tsx** - Main image management ⭐
- **ProductImageUpload.tsx** - Simple uploader (legacy)
- **SupplierProductManager.tsx** - Product CRUD with images

**All code is ready and functional!** 📸✨

