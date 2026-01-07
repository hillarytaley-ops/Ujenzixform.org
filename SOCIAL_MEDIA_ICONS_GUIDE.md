# Social Media Icons - Complete Guide

## ✅ What Was Created

Three comprehensive social media components with **TikTok included**:

1. **SocialMediaIcons.tsx** - Individual icon components (SVG)
2. **SocialMediaLinks.tsx** - Reusable links component with multiple variants
3. **FloatingSocialSidebar.tsx** - Floating sidebar with all icons (updated with TikTok)

---

## 📱 Social Media Platforms Included

| # | Platform | Icon | URL Template | Color |
|---|----------|------|-------------|-------|
| 1 | Facebook | 📘 | `facebook.com/mradipro` | Blue (#1877F2) |
| 2 | Twitter/X | 🐦 | `twitter.com/mradipro` | Black |
| 3 | Instagram | 📸 | `instagram.com/mradipro` | Pink/Purple Gradient |
| 4 | **TikTok** | ⭐ | `tiktok.com/@mradipro` | **Black** |
| 5 | LinkedIn | 💼 | `linkedin.com/company/mradipro` | Blue (#0A66C2) |
| 6 | WhatsApp | 💬 | `wa.me/254712345678` | Green (#25D366) |
| 7 | YouTube | ▶️ | `youtube.com/@mradipro` | Red (#FF0000) |
| 8 | Telegram | ✈️ | `t.me/mradipro` | Blue (#0088cc) |
| 9 | Email | 📧 | `support@mradipro.co.ke` | Red (hover) |
| 10 | Phone | ☎️ | `+254 712 345 678` | Green (hover) |

---

## 🎨 Component Variants

### 1. Default Variant (With Labels)
Shows icons with platform names next to them.

```tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

<SocialMediaLinks variant="default" iconSize={24} />
```

**Appearance:**
- White background cards
- Icon + Text label
- Border and shadow
- Hover effects

**Best for:**
- Contact pages
- About pages
- Main content areas

---

### 2. Footer Variant (Icon Grid)
Compact icon-only grid for footers.

```tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

<SocialMediaLinks variant="footer" iconSize={20} />
```

**Appearance:**
- Icon-only (no labels)
- Glass effect background
- Border styling
- Scale on hover

**Best for:**
- Page footers
- Compact spaces
- Mobile layouts

---

### 3. Minimal Variant (Simple Icons)
Clean icons with minimal styling.

```tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

<SocialMediaLinks variant="minimal" iconSize={20} />
```

**Appearance:**
- Icons only
- No background
- Simple hover color change
- First 5 platforms only

**Best for:**
- Navigation bars
- Header areas
- Minimal designs

---

## 🎯 Floating Social Sidebar

A fixed sidebar that follows the page scroll.

### Features:
- ✅ Fixed position on left side
- ✅ Visible on desktop only (hidden on mobile)
- ✅ Hover effects with tooltips
- ✅ Scale animations
- ✅ Glass effect backgrounds
- ✅ **Includes TikTok!**

### Usage:
```tsx
import { FloatingSocialSidebar } from '@/components/FloatingSocialSidebar';

// In your page component:
<div>
  <FloatingSocialSidebar />
  {/* Your page content */}
</div>
```

### Where to Use:
- ✅ Homepage (Index.tsx)
- ✅ About page
- ✅ Contact page
- ✅ Main landing pages

---

## 🔗 TikTok Implementation

### Icon Component:
```tsx
export const TikTokIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);
```

### In FloatingSocialSidebar:
```tsx
{/* TikTok */}
<a
  href="https://tiktok.com/@mradipro"
  target="_blank"
  rel="noopener noreferrer"
  className="group relative"
  title="Follow us on TikTok"
>
  <div className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-black hover:border-gray-700 transition-all duration-300 hover:scale-110 shadow-lg">
    <TikTokIcon size={18} className="text-white" />
  </div>
  <span className="tooltip">TikTok</span>
</a>
```

### TikTok URL:
- Format: `https://tiktok.com/@mradipro`
- Replace `@mradipro` with your actual TikTok username
- Opens in new tab
- Secure (noopener noreferrer)

---

## 📋 How to Add to Your Pages

### Footer Integration:
```tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <h3 className="text-lg font-semibold mb-4">Connect With Us</h3>
        <SocialMediaLinks variant="footer" iconSize={24} />
      </div>
    </footer>
  );
};
```

### Contact Page:
```tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

const Contact = () => {
  return (
    <section>
      <h2>Follow Us on Social Media</h2>
      <SocialMediaLinks variant="default" iconSize={28} />
    </section>
  );
};
```

### Navigation Bar:
```tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

const Navigation = () => {
  return (
    <nav>
      {/* Other nav items */}
      <SocialMediaLinks variant="minimal" iconSize={20} />
    </nav>
  );
};
```

---

## 🎨 Customization Options

### Props Available:

**SocialMediaLinks Component:**
```typescript
interface SocialMediaLinksProps {
  variant?: 'default' | 'footer' | 'minimal';
  className?: string;
  iconSize?: number;
}
```

**Usage Examples:**
```tsx
// Large footer icons
<SocialMediaLinks variant="footer" iconSize={32} />

// Small navigation icons
<SocialMediaLinks variant="minimal" iconSize={18} />

// With custom styling
<SocialMediaLinks 
  variant="footer" 
  iconSize={24} 
  className="justify-center mt-8"
/>
```

---

## 🔧 Individual Icon Usage

You can also use individual icons:

```tsx
import { TikTokIcon, FacebookIcon, InstagramIcon } from '@/components/SocialMediaIcons';

// Use individually
<TikTokIcon size={32} className="text-black" />
<FacebookIcon size={32} className="text-blue-600" />
<InstagramIcon size={32} className="text-pink-600" />
```

---

## 🌐 Update Social Media URLs

To update the URLs, edit the files:

### For FloatingSocialSidebar:
**File:** `src/components/FloatingSocialSidebar.tsx`

Change:
```tsx
href="https://tiktok.com/@mradipro"  // Update @mradipro to your username
href="https://facebook.com/mradipro" // Update to your page
href="https://wa.me/254712345678"    // Update to your WhatsApp number
```

### For SocialMediaLinks:
**File:** `src/components/SocialMediaLinks.tsx`

Update the `socialLinks` array:
```tsx
{
  name: 'TikTok',
  url: 'https://tiktok.com/@YOUR_USERNAME',  // Change here
  icon: TikTokIcon,
  color: 'hover:text-black',
  bgColor: 'hover:bg-black'
}
```

---

## 📊 Social Media Strategy for MradiPro

### Content Ideas for Each Platform:

**TikTok** (NEW! 🎉)
- Short construction tips and tricks
- Before/after building transformations
- Material quality tests
- Builder testimonials
- Quick how-to videos
- Behind-the-scenes supplier visits
- Kenyan construction trends

**Facebook**
- Company updates
- Project showcases
- Supplier spotlights
- Builder success stories
- Community engagement

**Instagram**
- Construction project photos
- Material close-ups
- Supplier stories
- Builder portfolios
- Kenyan construction inspiration

**YouTube**
- Full project documentaries
- Material comparison videos
- Tutorial videos
- Supplier interviews
- Builder testimonials

**LinkedIn**
- Professional updates
- Industry insights
- Business partnerships
- Recruitment
- Company milestones

**WhatsApp**
- Customer support
- Quote requests
- Quick consultations
- Order updates
- Direct communication

**Twitter/X**
- Quick updates
- Industry news
- Tips and tricks
- Customer service
- Announcements

**Telegram**
- Community channel
- Group discussions
- News and updates
- Support channel

---

## 🎯 Recommended Placement

### Homepage (Index.tsx):
```tsx
import { FloatingSocialSidebar } from '@/components/FloatingSocialSidebar';

<div className="min-h-screen">
  <FloatingSocialSidebar />
  {/* Page content */}
</div>
```

### Footer (Footer.tsx):
```tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

<footer>
  <div className="py-8">
    <h3 className="text-center mb-4">Follow Us</h3>
    <SocialMediaLinks variant="footer" iconSize={24} />
  </div>
</footer>
```

### Contact Page:
```tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

<section>
  <h2>Connect on Social Media</h2>
  <p>Follow us for updates, tips, and construction inspiration!</p>
  <SocialMediaLinks variant="default" iconSize={28} />
</section>
```

---

## 🎨 Color Schemes

### TikTok:
- **Primary:** Black
- **Hover:** Black background with white icon
- **Effect:** Scale animation on hover

### Other Platforms:
- **Facebook:** #1877F2 (Blue)
- **Twitter/X:** Black
- **Instagram:** Purple to Pink gradient
- **LinkedIn:** #0A66C2 (Blue)
- **WhatsApp:** #25D366 (Green)
- **YouTube:** #FF0000 (Red)
- **Telegram:** #0088cc (Blue)

---

## 🚀 Testing

### Check Icons Display:
1. Add to any page:
   ```tsx
   <SocialMediaLinks variant="footer" />
   ```
2. Refresh browser
3. Verify all 8 icons appear (including TikTok)
4. Hover over each icon
5. Click to test links

### Check Floating Sidebar:
1. Add to Index.tsx or About.tsx
2. View on desktop (hidden on mobile)
3. Hover over icons to see tooltips
4. Verify TikTok icon appears
5. Click to test

---

## 📱 Mobile Responsive

### FloatingSocialSidebar:
- **Desktop:** Visible on left side
- **Tablet:** Hidden (< 1024px)
- **Mobile:** Hidden

### SocialMediaLinks:
- **All Devices:** Responsive grid
- **Wraps:** Icons wrap on smaller screens
- **Touch-friendly:** Adequate spacing

---

## 🔐 Security Features

All social links include:
- ✅ `target="_blank"` - Opens in new tab
- ✅ `rel="noopener noreferrer"` - Security headers
- ✅ `aria-label` - Accessibility
- ✅ `title` - Hover tooltips

---

## 🎯 Quick Implementation

### Add to Homepage:
```tsx
// In src/pages/Index.tsx
import { FloatingSocialSidebar } from '@/components/FloatingSocialSidebar';

const Index = () => {
  return (
    <div className="min-h-screen">
      <FloatingSocialSidebar />
      <Navigation />
      {/* Rest of homepage */}
    </div>
  );
};
```

### Add to Footer:
```tsx
// In src/components/Footer.tsx
import { SocialMediaLinks } from '@/components/SocialMediaLinks';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold mb-4">Connect With MradiPro</h3>
          <p className="text-gray-400 mb-6">
            Follow us for construction tips, industry news, and project inspiration
          </p>
          <SocialMediaLinks variant="footer" iconSize={24} />
        </div>
      </div>
    </footer>
  );
};
```

---

## 💡 Advanced Usage

### Custom Icon Array:
```tsx
import { TikTokIcon, FacebookIcon, InstagramIcon } from '@/components/SocialMediaIcons';

const socialPlatforms = [
  { name: 'TikTok', icon: TikTokIcon, url: 'https://tiktok.com/@mradipro' },
  { name: 'Facebook', icon: FacebookIcon, url: 'https://facebook.com/mradipro' },
  { name: 'Instagram', icon: InstagramIcon, url: 'https://instagram.com/mradipro' }
];

return (
  <div className="flex gap-4">
    {socialPlatforms.map((platform) => (
      <a key={platform.name} href={platform.url} target="_blank">
        <platform.icon size={32} />
      </a>
    ))}
  </div>
);
```

### Styled Individual Icons:
```tsx
import { TikTokIcon } from '@/components/SocialMediaIcons';

// Large TikTok button
<a 
  href="https://tiktok.com/@mradipro" 
  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full hover:scale-105 transition"
>
  <TikTokIcon size={24} />
  Follow us on TikTok
</a>
```

---

## 📊 Analytics Integration (Future)

Track social media clicks:
```tsx
const handleSocialClick = (platform: string) => {
  // Track in analytics
  console.log(`User clicked: ${platform}`);
  
  // Send to analytics service
  // analytics.track('social_media_click', { platform });
};

<a 
  href={url} 
  onClick={() => handleSocialClick('TikTok')}
>
  <TikTokIcon />
</a>
```

---

## 🎨 Customization Examples

### Different Icon Sizes:
```tsx
// Small icons (navigation)
<SocialMediaLinks variant="minimal" iconSize={18} />

// Medium icons (footer)
<SocialMediaLinks variant="footer" iconSize={24} />

// Large icons (contact page)
<SocialMediaLinks variant="default" iconSize={32} />
```

### Custom Colors:
```tsx
import { TikTokIcon } from '@/components/SocialMediaIcons';

// Custom colored TikTok icon
<TikTokIcon size={32} className="text-purple-600 hover:text-purple-800" />
```

### Custom Layout:
```tsx
<div className="grid grid-cols-4 gap-4">
  {socialLinks.map((social) => (
    <a key={social.name} href={social.url}>
      <social.icon size={40} />
    </a>
  ))}
</div>
```

---

## 🔧 Configuration

### Update URLs:
Edit `src/components/SocialMediaLinks.tsx`:

```tsx
const socialLinks = [
  {
    name: 'TikTok',
    url: 'https://tiktok.com/@YOUR_ACTUAL_USERNAME',  // ← Change this
    icon: TikTokIcon,
    color: 'hover:text-black',
    bgColor: 'hover:bg-black'
  },
  // ... other platforms
];
```

### Update WhatsApp Number:
```tsx
{
  name: 'WhatsApp',
  url: 'https://wa.me/254XXXXXXXXX',  // ← Your actual number
  icon: WhatsAppIcon,
  color: 'hover:text-[#25D366]',
  bgColor: 'hover:bg-[#25D366]'
}
```

### Update Email:
Edit `src/components/FloatingSocialSidebar.tsx`:
```tsx
<a href="mailto:YOUR_EMAIL@mradipro.co.ke">
  <EmailIcon />
</a>
```

---

## 📱 Where Icons Currently Appear

### Existing Usage:
- ✅ FloatingSocialSidebar (floating left sidebar)
  - Now includes TikTok!
  - Appears on pages where it's imported

### Recommended Addition:
Add to these pages:
1. **Homepage** (src/pages/Index.tsx)
2. **About page** (src/pages/About.tsx)
3. **Contact page** (src/pages/Contact.tsx)
4. **Footer component** (src/components/Footer.tsx)

---

## 🎯 Implementation Checklist

- [x] Create TikTok icon SVG
- [x] Add TikTok to SocialMediaIcons.tsx
- [x] Add TikTok to SocialMediaLinks.tsx
- [x] Add TikTok to FloatingSocialSidebar.tsx
- [x] Create multiple variants (default, footer, minimal)
- [x] Add hover effects
- [x] Add tooltips
- [x] Make responsive
- [x] Add accessibility (aria-labels)
- [x] Include all major platforms
- [ ] Add to Footer component (optional)
- [ ] Add to Homepage (optional)
- [ ] Update URLs with real accounts (when ready)

---

## 🎨 Design Features

### Hover Effects:
- ✅ Scale animation (1.1x)
- ✅ Background color change to brand color
- ✅ Smooth transitions (300ms)
- ✅ Shadow effects

### Tooltips:
- ✅ Appear on hover
- ✅ Platform name displayed
- ✅ Smooth fade in/out
- ✅ Positioned to the right

### Accessibility:
- ✅ `aria-label` for screen readers
- ✅ `title` attribute for tooltips
- ✅ Keyboard navigation support
- ✅ Focus states

---

## 📚 Files Structure

```
src/components/
  ├── SocialMediaIcons.tsx      (10 icon components)
  ├── SocialMediaLinks.tsx      (Reusable links component)
  └── FloatingSocialSidebar.tsx (Floating sidebar with all icons)
```

---

## 🚀 Next Steps

### To Activate:
1. ✅ Icons are created
2. ✅ TikTok is included
3. ✅ Components are ready to use
4. Import and add to your pages
5. Update URLs with your actual social media accounts

### Example - Add to Homepage:
```tsx
// src/pages/Index.tsx
import { FloatingSocialSidebar } from '@/components/FloatingSocialSidebar';

const Index = () => {
  return (
    <>
      <FloatingSocialSidebar />
      {/* Rest of your homepage */}
    </>
  );
};
```

---

## ✅ Summary

**Created:**
- ✅ 10 social media icons (including TikTok!)
- ✅ 3 reusable components
- ✅ 3 display variants
- ✅ Fully responsive
- ✅ Accessible
- ✅ Beautiful hover effects

**TikTok Features:**
- ✅ Custom SVG icon
- ✅ Black color scheme
- ✅ In FloatingSocialSidebar
- ✅ In SocialMediaLinks
- ✅ URL: tiktok.com/@mradipro
- ✅ Hover tooltip
- ✅ Scale animation

**Status:** ✅ Ready to Use!

---

**Created:** December 1, 2025  
**Version:** 2.0.0  
**TikTok:** ✅ Included









