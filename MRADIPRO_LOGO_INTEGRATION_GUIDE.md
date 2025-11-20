# MradiPro Logo Integration Guide

## 🎯 Logo Setup Instructions

### Step 1: Save the Logo File

**IMPORTANT:** Save your MradiPro circular logo image as:
```
public/mradipro-logo.png
```

**Recommended Specifications:**
- **File name:** `mradipro-logo.png`
- **Size:** 512x512 pixels (minimum)
- **Format:** PNG with transparent background (or white background)
- **File size:** < 200KB (optimize for web)

### Step 2: Logo Files Created

The following components have been created for you:

```
src/components/common/ProfilePicture.tsx
```

This file includes:
- ✅ `ProfilePicture` - Generic profile picture component
- ✅ `MradiProLogo` - Company branding logo component
- ✅ `UserAvatar` - User profile avatar with fallback initials

---

## 📋 Usage Examples

### 1. MradiPro Company Logo

Use this for branding, headers, and official company representation:

```typescript
import { MradiProLogo } from '@/components/common/ProfilePicture';

// Simple logo only
<MradiProLogo size="lg" />

// Logo with text
<MradiProLogo size="md" showText={true} />

// Custom styling
<MradiProLogo 
  size="xl" 
  showText={true} 
  className="hover:scale-105 transition-transform" 
/>
```

**Sizes Available:**
- `xs` - 24x24px (w-6 h-6)
- `sm` - 32x32px (w-8 h-8)
- `md` - 48x48px (w-12 h-12) - Default
- `lg` - 64x64px (w-16 h-16)
- `xl` - 96x96px (w-24 h-24)
- `2xl` - 128x128px (w-32 h-32)

### 2. User Profile Avatar

Use this for user profiles throughout the app:

```typescript
import { UserAvatar } from '@/components/common/ProfilePicture';

const user = {
  avatar_url: 'https://...', // User's uploaded avatar
  full_name: 'John Kamau',
  email: 'john@example.com'
};

// Avatar only
<UserAvatar user={user} size="md" />

// Avatar with name
<UserAvatar user={user} size="lg" showName={true} />

// Fallback to initials if no avatar
<UserAvatar 
  user={{ full_name: 'Jane Wanjiku', email: 'jane@example.com' }}
  size="md"
/>
```

### 3. Generic Profile Picture

Use this for any circular image display:

```typescript
import { ProfilePicture } from '@/components/common/ProfilePicture';

<ProfilePicture 
  src="/path/to/image.jpg"
  alt="Description"
  size="md"
  defaultImage="logo" // or "user"
/>
```

---

## 🎨 Integration Points

### Navigation Bar

**File:** `src/components/layout/Navigation.tsx`

```typescript
import { MradiProLogo } from '@/components/common/ProfilePicture';

// In your navigation component
<nav className="bg-white shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between h-16">
      {/* Logo */}
      <div className="flex items-center">
        <Link to="/" className="flex items-center">
          <MradiProLogo size="md" showText={true} />
        </Link>
      </div>
      
      {/* User profile */}
      <div className="flex items-center">
        <UserAvatar user={currentUser} size="sm" />
      </div>
    </div>
  </div>
</nav>
```

### Dashboard Header

```typescript
// Client Dashboard
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
      <p className="text-gray-600">Jenga na MradiPro</p>
    </div>
    <MradiProLogo size="xl" />
  </div>
</div>
```

### User Dropdown Menu

```typescript
// User menu in navigation
<Menu as="div" className="relative">
  <Menu.Button className="flex items-center">
    <UserAvatar user={currentUser} size="sm" />
  </Menu.Button>
  
  <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg">
    <div className="px-4 py-3 border-b">
      <UserAvatar user={currentUser} size="md" showName={true} />
    </div>
    <Menu.Item>
      {({ active }) => (
        <Link to="/profile" className={...}>
          Profile Settings
        </Link>
      )}
    </Menu.Item>
  </Menu.Items>
</Menu>
```

### Loading Screen

```typescript
// Loading component
<div className="flex flex-col items-center justify-center min-h-screen">
  <MradiProLogo size="2xl" />
  <div className="mt-4 animate-pulse">
    <p className="text-lg font-semibold text-[#0F2C59]">Loading...</p>
    <p className="text-sm text-[#4A9FD8]">Jenga na MradiPro</p>
  </div>
</div>
```

### Email Templates

```typescript
// Email header
<div style="text-align: center; padding: 20px;">
  <img 
    src="https://yourdomain.com/mradipro-logo.png" 
    alt="MradiPro" 
    style="width: 80px; height: 80px; border-radius: 50%;"
  />
  <h1 style="color: #0F2C59; margin-top: 10px;">MRADIPRO</h1>
  <p style="color: #4A9FD8; font-size: 14px;">Jenga na MradiPro</p>
</div>
```

### Mobile App Splash Screen

```typescript
// Splash screen component
<div className="fixed inset-0 bg-gradient-to-br from-[#0F2C59] to-[#4A9FD8] flex items-center justify-center">
  <div className="text-center">
    <div className="bg-white rounded-full p-4 mb-4 inline-block shadow-xl">
      <MradiProLogo size="2xl" />
    </div>
    <h1 className="text-3xl font-bold text-white">MRADIPRO</h1>
    <p className="text-white/90 mt-2">Jenga na MradiPro</p>
  </div>
</div>
```

### Order Confirmation/Receipts

```typescript
// Receipt header
<div className="text-center mb-6">
  <MradiProLogo size="lg" showText={true} />
  <p className="text-sm text-gray-600 mt-2">
    Order #{orderId}
  </p>
</div>
```

---

## 🎨 Brand Colors

Use these colors throughout the app for consistency:

```typescript
// tailwind.config.js or direct usage
const mradiproColors = {
  navy: '#0F2C59',      // Primary brand color
  blue: '#4A9FD8',      // Secondary/accent color
  lightGray: '#F5F5F5', // Background
  white: '#FFFFFF',     // Cards/surfaces
};
```

**CSS Variables:**
```css
:root {
  --mradipro-navy: #0F2C59;
  --mradipro-blue: #4A9FD8;
  --mradipro-light-gray: #F5F5F5;
}
```

---

## 📱 Responsive Sizing

Recommended logo sizes for different breakpoints:

```typescript
// Mobile (< 640px)
<MradiProLogo size="sm" />

// Tablet (640px - 1024px)
<MradiProLogo size="md" />

// Desktop (> 1024px)
<MradiProLogo size="lg" />

// Responsive example
<div className="flex items-center">
  <div className="block sm:hidden">
    <MradiProLogo size="sm" />
  </div>
  <div className="hidden sm:block md:hidden">
    <MradiProLogo size="md" />
  </div>
  <div className="hidden md:block">
    <MradiProLogo size="lg" showText={true} />
  </div>
</div>
```

---

## 🔄 Migration from UjenziPro

Find and replace old logo references:

```bash
# Search for old logo references
grep -r "ujenzipro-logo" src/
grep -r "UjenziPro" src/

# Replace with MradiPro
# Old: ujenzipro-logo.png
# New: mradipro-logo.png
```

---

## ✅ Checklist

Before deploying, ensure:

- [ ] Logo file saved as `public/mradipro-logo.png`
- [ ] Logo is 512x512 pixels or larger
- [ ] Logo has good visibility on white background
- [ ] `ProfilePicture.tsx` component created
- [ ] Navigation updated with new logo
- [ ] Dashboard headers updated
- [ ] User avatars working properly
- [ ] Mobile responsive sizes tested
- [ ] Loading screens updated
- [ ] Email templates updated (if applicable)
- [ ] Favicon updated
- [ ] manifest.json updated
- [ ] All pages checked for old logo references

---

## 🚀 Deployment

Once all changes are made:

```bash
# Add changes
git add .

# Commit
git commit -m "feat: Add MradiPro logo and profile picture components"

# Push to trigger Vercel deployment
git push origin main
```

---

## 📞 Support

If you encounter any issues:

1. **Logo not showing:** Check file path is `/mradipro-logo.png` in public folder
2. **Size issues:** Use different size prop (xs, sm, md, lg, xl, 2xl)
3. **Circular shape not working:** Component automatically applies `rounded-full`
4. **Image quality:** Ensure source image is high resolution (min 512x512px)

---

**MradiPro - Jenga na MradiPro** 🏗️✨

