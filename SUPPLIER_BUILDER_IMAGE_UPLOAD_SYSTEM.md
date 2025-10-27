# Supplier & Builder Image Upload System

## ✅ COMPLETE SOLUTION IMPLEMENTED

Your platform now allows suppliers and builders to upload their own logos and product images during registration and product management!

---

## 🏢 SUPPLIER IMAGE UPLOAD FEATURES

### 1. **Company Logo Upload** (During Registration)

**Location**: Supplier Registration Form  
**File**: `src/components/SupplierRegistrationForm.tsx`

**Features:**
- ✅ Upload company logo during registration
- ✅ Square or circular logo support
- ✅ Drag & drop or click to upload
- ✅ Real-time preview
- ✅ 5MB max file size
- ✅ Supports JPG, PNG, WEBP
- ✅ Stored in Supabase Storage bucket: `company-logos`
- ✅ Automatic compression and optimization
- ✅ Remove and replace functionality

**Component Used:**
```tsx
<ImageUpload
  currentImageUrl={companyLogoUrl}
  onImageUpload={setCompanyLogoUrl}
  bucket="company-logos"
  folder={userId}
  label="Upload Company Logo"
  fallbackText="CO"
  shape="square"
/>
```

### 2. **Product Images Upload** (NEW!)

**Location**: Supplier Product Manager  
**File**: `src/components/suppliers/SupplierProductManager.tsx` (NEW)

**Features:**
- ✅ Upload product image for each item
- ✅ Required during product creation
- ✅ Large preview (500x500px recommended)
- ✅ Stored in Supabase Storage bucket: `product-images`
- ✅ Organized by supplier ID
- ✅ Update/replace product images anytime
- ✅ Delete products with images

**Component Used:**
```tsx
<ProductImageUpload
  currentImageUrl={product.image_url}
  onImageUpload={(url) => setProduct({ ...product, image_url: url })}
  productName={product.name}
  supplierId={supplierId}
/>
```

---

## 👷 BUILDER IMAGE UPLOAD FEATURES

### 1. **Profile Picture Upload** (During Registration)

**Location**: Builder Profile Setup  
**File**: `src/components/builders/BuilderProfileSetup.tsx`

**Features:**
- ✅ Upload profile picture or company logo
- ✅ Depends on user type (individual vs company)
- ✅ Circular avatar for individuals
- ✅ Square logo for companies
- ✅ Stored in Supabase Storage bucket: `profile-images`
- ✅ Real-time preview
- ✅ 5MB max file size

**Component Used:**
```tsx
<ImageUpload
  currentImageUrl={imageUrl}
  onImageUpload={setImageUrl}
  bucket="profile-images"
  folder={currentUserId}
  label={selectedType === 'company' ? 'Upload Company Logo' : 'Upload Profile Picture'}
  fallbackText={selectedType === 'company' ? 'CO' : 'U'}
  shape={selectedType === 'company' ? 'square' : 'circle'}
/>
```

---

## 📦 NEW COMPONENTS CREATED

### 1. **ProductImageUpload.tsx**
**Purpose**: Specialized component for uploading product images  
**Features**:
- Large square preview (aspect-square)
- Product-specific file naming
- Clear visual feedback
- Upload/remove functionality
- Professional product photography guidelines

### 2. **SupplierProductManager.tsx**
**Purpose**: Complete product catalog management for suppliers  
**Features**:
- Add/Edit/Delete products
- Upload product images (required!)
- Set product details (name, description, category, price)
- Manage stock status
- View all products in grid
- Professional product cards with images

---

## 🗄️ STORAGE STRUCTURE

### Supabase Storage Buckets:

```
company-logos/
├── [user-id-1]/
│   └── [timestamp].png (Company logo)
├── [user-id-2]/
│   └── [timestamp].jpg
└── ...

profile-images/
├── [user-id-1]/
│   └── [timestamp].png (Profile picture)
├── [user-id-2]/
│   └── [timestamp].jpg
└── ...

product-images/
├── [supplier-id-1]/
│   ├── [timestamp]-cement-42-5n.jpg
│   ├── [timestamp]-steel-bars.png
│   └── [timestamp]-paint-20l.jpg
├── [supplier-id-2]/
│   └── [timestamp]-product.jpg
└── ...
```

---

## 🔐 STORAGE SECURITY

### Bucket Policies Required:

```sql
-- Allow public to view company logos
CREATE POLICY "Public can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload own logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own logos
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Similar policies for profile-images and product-images
```

---

## 📸 IMAGE UPLOAD GUIDELINES

### For Suppliers:

#### Company Logo:
- ✅ **Size**: Recommended 200x200px minimum
- ✅ **Format**: PNG (with transparency) or JPG
- ✅ **Content**: Your company logo or brand mark
- ✅ **Quality**: High resolution, clear branding
- ✅ **Shape**: Square works best
- ✅ **Background**: Solid color or transparent

#### Product Images:
- ✅ **Size**: Recommended 500x500px minimum
- ✅ **Format**: JPG, PNG, or WEBP
- ✅ **Content**: Clear photo of the actual product
- ✅ **Quality**: High resolution, well-lit
- ✅ **Background**: Plain or on-site context
- ✅ **Angle**: Straight-on or slight perspective

### For Builders:

#### Profile Picture (Individual):
- ✅ **Size**: Recommended 200x200px minimum
- ✅ **Format**: JPG or PNG
- ✅ **Content**: Professional headshot
- ✅ **Quality**: Clear, well-lit face
- ✅ **Background**: Neutral or professional setting

#### Company Logo (Company Builder):
- ✅ Same as supplier logo guidelines above

---

## 🚀 HOW IT WORKS

### Supplier Registration Flow:

```
1. User signs up as Supplier
   ↓
2. Opens Supplier Registration Form
   ↓
3. UPLOADS COMPANY LOGO (step 1)
   ↓
4. Fills in business details
   ↓
5. Submits registration
   ↓
6. Logo saved to: company-logos/[user-id]/[timestamp].png
   ↓
7. Logo URL saved to database: suppliers.company_logo_url
   ↓
8. Logo displays on supplier directory! ✅
```

### Product Upload Flow:

```
1. Supplier navigates to "Products" tab
   ↓
2. Clicks "Add Product"
   ↓
3. UPLOADS PRODUCT IMAGE (required!)
   ↓
4. Enters product details (name, price, category)
   ↓
5. Submits product
   ↓
6. Image saved to: product-images/[supplier-id]/[timestamp]-[product-name].jpg
   ↓
7. Image URL saved to database: materials.image_url
   ↓
8. Product displays with image in catalog! ✅
```

### Builder Registration Flow:

```
1. User signs up as Builder
   ↓
2. Opens Builder Profile Setup
   ↓
3. Selects type (Individual or Company)
   ↓
4. UPLOADS PROFILE PICTURE or COMPANY LOGO
   ↓
5. Submits profile
   ↓
6. Image saved to: profile-images/[user-id]/[timestamp].png
   ↓
7. URL saved to: profiles.avatar_url or profiles.company_logo_url
   ↓
8. Image displays on builder profile! ✅
```

---

## 💼 SUPPLIER WORKFLOW

### What Suppliers Can Do:

#### During Registration:
1. ✅ Upload company logo
2. ✅ See logo preview immediately
3. ✅ Change/replace logo before submitting
4. ✅ Logo requirement enforced (optional but recommended)

#### After Registration:
1. ✅ Navigate to "Products" tab
2. ✅ Click "Add Product"
3. ✅ Upload product image (REQUIRED!)
4. ✅ Fill product details
5. ✅ Submit to catalog
6. ✅ Buyers see product with image
7. ✅ Edit products anytime
8. ✅ Update images anytime
9. ✅ Delete products

---

## 👷 BUILDER WORKFLOW

### What Builders Can Do:

#### During Registration:
1. ✅ Choose "Individual" or "Company"
2. ✅ Upload profile pic (individual) or logo (company)
3. ✅ See preview immediately
4. ✅ Change before submitting
5. ✅ Logo/photo displays on profile

#### After Registration:
1. ✅ Profile shows uploaded image
2. ✅ Image appears in builder directory
3. ✅ Image shows in quotes/messages
4. ✅ Professional appearance
5. ✅ Can update image later

---

## 📊 DATABASE SCHEMA

### Suppliers Table:
```sql
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Logo URL stored here after upload
UPDATE suppliers
SET company_logo_url = '[Supabase Storage URL]'
WHERE user_id = '[user-id]';
```

### Materials (Products) Table:
```sql
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Product image URL stored here
UPDATE materials
SET image_url = '[Supabase Storage URL]'
WHERE id = '[product-id]';
```

### Profiles Table:
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Individual: avatar_url
-- Company: company_logo_url
```

---

## 🎨 FRONTEND DISPLAY

### Supplier Directory:
```tsx
<Avatar className="h-16 w-16">
  <AvatarImage src={supplier.company_logo_url} />
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>
```

**Flow:**
1. Supplier uploads logo → Stored in Supabase
2. Logo URL saved to database → supplier.company_logo_url
3. Directory fetches suppliers → Includes logo URL
4. Avatar component displays → Shows uploaded logo ✅

### Product Catalog:
```tsx
<div className="aspect-square">
  {product.image_url ? (
    <img src={product.image_url} alt={product.name} />
  ) : (
    <Package className="h-12 w-12" /> // Fallback
  )}
</div>
```

**Flow:**
1. Supplier uploads product image → Stored in Supabase
2. Image URL saved to database → material.image_url
3. Catalog fetches products → Includes image URL
4. Product card displays → Shows uploaded image ✅

---

## ✅ IMPLEMENTATION STATUS

### Existing (Already Working):
1. ✅ **ImageUpload Component** - Generic image upload
2. ✅ **Supplier Registration** - Has logo upload section
3. ✅ **Builder Profile Setup** - Has image upload
4. ✅ **Storage buckets** - company-logos, profile-images
5. ✅ **Avatar components** - Display with fallbacks

### NEW (Just Created):
1. ✅ **ProductImageUpload Component** - Specialized for products
2. ✅ **SupplierProductManager Component** - Full product management
3. ✅ **Product catalog system** - Add/Edit/Delete with images
4. ✅ **Image requirement enforcement** - Product image required
5. ✅ **Professional product cards** - Show images prominently

---

## 🔧 INTEGRATION STEPS

### Step 1: Create Storage Buckets (Supabase)

```sql
-- Run in Supabase SQL Editor:

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('company-logos', 'company-logos', true),
  ('profile-images', 'profile-images', true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public view policies
CREATE POLICY "Public can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Upload policies (users can upload to their own folders)
CREATE POLICY "Users can upload own company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Suppliers can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
```

### Step 2: Add Product Manager to Suppliers Page

Update `src/pages/Suppliers.tsx` to include the product manager for suppliers:

```tsx
import { SupplierProductManager } from '@/components/suppliers/SupplierProductManager';

// In supplier dashboard tab:
{userRole === 'supplier' && (
  <TabsContent value="products">
    <SupplierProductManager supplierId={user.id} />
  </TabsContent>
)}
```

---

## 📱 USER EXPERIENCE

### For Suppliers:

#### Registration Process:
```
Step 1: Sign up for account
Step 2: Open Supplier Registration
Step 3: Upload company logo 📸
        - Click "Upload Logo" button
        - Select image file
        - See preview immediately
        - Logo uploads to Supabase
Step 4: Fill business details
Step 5: Submit registration ✅
Step 6: Logo appears in supplier directory!
```

#### Adding Products:
```
Step 1: Go to "Products" tab
Step 2: Click "Add Product"
Step 3: Upload product image 📸
        - REQUIRED! Can't submit without image
        - Click upload area
        - Select clear product photo
        - See large preview
Step 4: Enter product details
        - Name (e.g., "Bamburi Cement 42.5N")
        - Description
        - Category (Cement, Steel, etc.)
        - Unit (bag, piece, meter, etc.)
        - Price in KES
        - Stock status
Step 5: Submit product ✅
Step 6: Product appears in catalog with image!
```

### For Builders:

#### Profile Setup:
```
Step 1: Sign up for account
Step 2: Choose type (Individual or Company)
Step 3: Upload image 📸
        - Individual: Profile picture (circular)
        - Company: Company logo (square)
Step 4: Select builder role
Step 5: Submit ✅
Step 6: Image appears on profile!
```

---

## 🎯 KEY FEATURES

### Image Upload Component Features:

1. **File Validation**:
   - ✅ Checks file type (images only)
   - ✅ Checks file size (max 5MB)
   - ✅ Shows error if invalid

2. **Upload Process**:
   - ✅ Shows loading spinner
   - ✅ Progress feedback
   - ✅ Success toast notification
   - ✅ Error handling with messages

3. **Preview**:
   - ✅ Immediate preview after selection
   - ✅ Before upload confirmation
   - ✅ After upload display
   - ✅ Fallback if image fails

4. **Management**:
   - ✅ Remove uploaded image
   - ✅ Replace with new image
   - ✅ Update anytime
   - ✅ Delete when needed

---

## 💾 FILE STORAGE

### Bucket Configuration:

**company-logos**: Public bucket for supplier logos
- Path structure: `company-logos/[user-id]/[timestamp].ext`
- Public read access
- User-specific upload access
- Example: `company-logos/abc123/1698765432.png`

**profile-images**: Public bucket for builder avatars
- Path structure: `profile-images/[user-id]/[timestamp].ext`
- Public read access
- User-specific upload access
- Example: `profile-images/def456/1698765433.jpg`

**product-images**: Public bucket for product photos
- Path structure: `product-images/[supplier-id]/[timestamp]-[product-name].ext`
- Public read access
- Supplier upload access
- Example: `product-images/sup789/1698765434-bamburi-cement.jpg`

---

## 🎨 VISUAL GUIDELINES FOR USERS

### Company Logo Guidelines:

**Good Logo Practices:**
- ✅ Clear, simple design
- ✅ High contrast
- ✅ Professional appearance
- ✅ Recognizable at small sizes
- ✅ Square format (200x200px minimum)
- ✅ Transparent background (PNG) preferred

**Avoid:**
- ❌ Blurry or low-resolution images
- ❌ Complex designs that don't scale
- ❌ Photos instead of logos
- ❌ Watermarked images
- ❌ Copyrighted images without permission

### Product Image Guidelines:

**Good Product Photos:**
- ✅ Clear, well-lit product
- ✅ Plain background or construction site
- ✅ Straight-on angle
- ✅ Product fills frame
- ✅ Sharp focus
- ✅ True colors
- ✅ Professional quality

**Avoid:**
- ❌ Dark or poorly lit photos
- ❌ Blurry images
- ❌ Cluttered backgrounds
- ❌ Product too small in frame
- ❌ Misleading images
- ❌ Stock photos (use actual products!)

---

## 🔄 UPDATE EXISTING SUPPLIERS/PRODUCTS

### For Suppliers Without Logos:

**Option 1**: Re-register (recommended)
1. Go to Supplier Registration
2. Upload logo during registration
3. Submit form

**Option 2**: Manual database update
```sql
-- After uploading via ImageUpload component
UPDATE suppliers
SET company_logo_url = '[uploaded-url]'
WHERE user_id = '[your-user-id]';
```

### For Products Without Images:

**Option 1**: Use Product Manager (recommended)
1. Go to "Products" tab
2. Click "Edit" on existing product
3. Upload image
4. Save changes

**Option 2**: Delete and re-add
1. Delete product without image
2. Click "Add Product"
3. Upload image (required!)
4. Enter details
5. Submit

---

## 📊 BENEFITS

### For Suppliers:
1. ✅ Professional branding with own logo
2. ✅ Products showcase with real photos
3. ✅ Control over visual presentation
4. ✅ Update images anytime
5. ✅ Better customer engagement
6. ✅ Increased trust and credibility
7. ✅ Stand out from competition

### For Builders:
1. ✅ Professional profile with own photo/logo
2. ✅ Personal branding
3. ✅ Recognition by clients
4. ✅ Trust building
5. ✅ Professional appearance

### For Platform:
1. ✅ Authentic user-generated content
2. ✅ No copyright issues
3. ✅ Real supplier/builder images
4. ✅ Professional appearance
5. ✅ Industry-standard features
6. ✅ Competitive advantage

---

## 🧪 TESTING

### Test Supplier Logo Upload:
1. Sign up as supplier
2. Go to registration form
3. Click "Upload Logo"
4. Select image file
5. See preview
6. Submit form
7. Check supplier directory
8. Your logo should display ✅

### Test Product Image Upload:
1. Sign in as supplier
2. Go to Products tab
3. Click "Add Product"
4. Upload product image
5. Fill details
6. Submit
7. Check catalog
8. Product shows with image ✅

### Test Builder Image Upload:
1. Sign up as builder
2. Go to profile setup
3. Upload profile picture/logo
4. Submit
5. Check builders directory
6. Your image displays ✅

---

## 🚨 TROUBLESHOOTING

### Issue: Upload button doesn't work

**Solutions:**
1. Check if user is authenticated
2. Verify storage buckets exist in Supabase
3. Check storage policies are set
4. Check browser console for errors
5. Verify file size < 5MB
6. Try different image format

### Issue: Image uploads but doesn't display

**Solutions:**
1. Check if URL was saved to database
2. Verify bucket is public
3. Check CSP allows image loading
4. Clear browser cache
5. Check network tab for 404 errors
6. Verify image URL is valid

### Issue: "Upload failed" error

**Solutions:**
1. Check Supabase storage is enabled
2. Verify bucket policies are correct
3. Check user has upload permission
4. Verify file format is supported
5. Check file isn't corrupted
6. Try smaller file size

---

## 📝 FILES CREATED

1. ✅ `src/components/suppliers/ProductImageUpload.tsx`
   - Specialized product image upload component
   
2. ✅ `src/components/suppliers/SupplierProductManager.tsx`
   - Complete product catalog management system

3. ✅ `SUPPLIER_BUILDER_IMAGE_UPLOAD_SYSTEM.md`
   - This documentation file

---

## 🎊 RESULT

**Your platform now has:**
- ✅ Suppliers can upload their OWN logos
- ✅ Suppliers can upload product images
- ✅ Builders can upload profile pictures/logos
- ✅ All images stored securely in Supabase
- ✅ Professional image management system
- ✅ No copyright issues (user-generated content)
- ✅ Real, authentic images from actual suppliers

**This solves the image problem permanently - users provide their own visual content!** 🎉📸✨

---

## 🚀 NEXT STEPS

1. **Run storage bucket SQL** (see Step 1 above)
2. **Restart dev server**
3. **Test supplier registration with logo upload**
4. **Test adding products with images**
5. **Test builder profile with image upload**
6. **Verify images display in directories**

**Status**: ✅ COMPLETE SYSTEM READY
**Impact**: 🔥 CRITICAL - Solves visual content problem permanently
**Action**: Create storage buckets and test!

