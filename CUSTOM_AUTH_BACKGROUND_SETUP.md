# Custom Authentication Background Image Setup

## Your Beautiful Image
The image you provided shows:
- Kenyan construction workers in yellow safety hard hats
- Blue steel structure framework in background
- Professional construction site setting
- Perfect for UjenziPro branding!

## How to Add Your Image

### Step 1: Save the Image

1. **Save the image** you provided (the one with workers in yellow hard hats)
2. **Rename it to:** `kenyan-construction-workers.jpg`
3. **Place it in:** `public/kenyan-construction-workers.jpg`

**Full path should be:**
```
C:\Users\User\OneDrive\Desktop\Cursor3\UjenziPro\public\kenyan-construction-workers.jpg
```

### Step 2: The Code is Already Updated!

I've updated all auth pages to use: `/kenyan-construction-workers.jpg`

The pages will automatically show your image once you save it in the public folder.

## Pages That Will Use This Image

1. ✅ **Login Page** (`/auth`) - Sign In & Sign Up
2. ✅ **Admin Login** (`/admin-login`) - Admin portal
3. ✅ **Password Reset** (`/reset-password`) - Password recovery

## Visual Effects Applied

### Login Page:
- Your construction workers image (full screen)
- Semi-transparent dark overlay (40% opacity)
- White glass-morphism card (95% opacity with blur)
- Professional and welcoming

### Admin Login:
- Same workers image
- Darker overlay with red security tint
- Dark slate card with red accents
- Serious, secure feel

### Password Reset:
- Same workers image
- Consistent styling with login page
- Smooth, cohesive experience

## Fallback

If the image isn't found at `/kenyan-construction-workers.jpg`, the pages will use:
- A professional Unsplash construction site image as fallback
- Same visual design and overlays
- Still looks great!

## After Saving the Image

1. Save your image as `public/kenyan-construction-workers.jpg`
2. Deploy or restart dev server
3. Visit `/auth` page
4. You'll see your beautiful Kenyan construction workers! 🇰🇪

## Technical Details

**Image Specifications:**
- Recommended size: 1920x1080 or higher
- Format: JPG (smaller file size)
- Quality: High (your workers' faces should be clear)
- Aspect: 16:9 or wider

**CSS Applied:**
```css
background-size: cover;
background-position: center;
background-attachment: fixed; /* Parallax effect */
background-repeat: no-repeat;
```

The image will look stunning on all devices! 🎉

