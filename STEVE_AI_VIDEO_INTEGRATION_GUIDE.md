# 🎬 Steve.ai Video Integration Guide for UjenziPro

## Overview
This guide explains how to integrate your Steve.ai video demo into the UjenziPro homepage.

---

## 📋 Step 1: Export Your Video from Steve.ai

Since the link you provided (`https://app.steve.ai/steveai/editproject/Z-IuBZoBZKQRxDAj51nX`) is an **edit page** (requires login), you need to export/publish your video first.

### How to Export from Steve.ai:

1. **Log in to Steve.ai** at [https://app.steve.ai](https://app.steve.ai)
2. **Open your project**: `Z-IuBZoBZKQRxDAj51nX`
3. Click **"Export"** or **"Publish"** button (usually top-right corner)
4. Choose export options:
   - **Format**: MP4 (1920x1080 recommended)
   - **Quality**: HD or Full HD
   - **Duration**: Ensure it matches your script (~5-6 minutes)

5. **Get the shareable link**:
   - After export, Steve.ai provides either:
     - **Download link** (for self-hosting)
     - **Embed code** (iframe with share URL)
     - **Public share URL** (like `https://steve.ai/share/xxxxx`)

---

## 📋 Step 2: Choose Integration Method

You have **3 options** for integrating the video:

### **Option A: Steve.ai Hosted Embed (Recommended)**

**Pros**: 
- Fast loading (CDN)
- No storage needed
- Automatic optimization

**Steps**:
1. In Steve.ai, get the **embed code** or **public share URL**
2. Look for something like: `https://share.steve.ai/xxxxx` or `https://steve.ai/embed/xxxxx`
3. Update your homepage with this URL

**Code to use in `src/pages/Index.tsx`**:
```tsx
<VideoSection 
  steveAiUrl="https://share.steve.ai/YOUR_VIDEO_ID_HERE"
  useSteveAi={true}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo"
  description="See our monitoring system, builder directory, supplier network, and more in action"
/>
```

---

### **Option B: Self-Hosted Video (Full Control)**

**Pros**:
- Complete control
- No third-party dependencies
- Works offline

**Steps**:
1. Download the MP4 file from Steve.ai
2. Upload to your project's `public` folder as `/public/ujenzipro-demo-video.mp4`
3. Or host on a CDN (Cloudflare, AWS S3, etc.)

**Code to use in `src/pages/Index.tsx`**:
```tsx
<VideoSection 
  videoUrl="/ujenzipro-demo-video.mp4"
  useYouTube={false}
  useSynthesia={false}
  useSteveAi={false}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo"
  description="See our monitoring system, builder directory, supplier network, and more in action"
/>
```

---

### **Option C: YouTube Upload (Best for SEO)**

**Pros**:
- Best for SEO and discoverability
- YouTube's robust infrastructure
- Easy sharing

**Steps**:
1. Download video from Steve.ai
2. Upload to YouTube
3. Set as "Public" or "Unlisted"
4. Copy the video ID (from URL: `https://youtube.com/watch?v=VIDEO_ID`)

**Code to use in `src/pages/Index.tsx`**:
```tsx
<VideoSection 
  videoId="YOUR_YOUTUBE_VIDEO_ID"
  useYouTube={true}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo"
  description="See our monitoring system, builder directory, supplier network, and more in action"
/>
```

---

## 📋 Step 3: Update Your Homepage

### Current Code (Line 202-209 in `src/pages/Index.tsx`):

```tsx
<VideoSection 
  synthesiaUrl="https://share.synthesia.io/3bfef3e8-48c7-4b55-ac74-f638ff572705"
  useSynthesia={true}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Platform Demo"
  description="See how easy it is to connect, quote, and build across Kenya - from Nairobi to Mombasa, Kisumu to Eldoret"
/>
```

### Replace with (choose one option):

#### **For Steve.ai Embed**:
```tsx
<VideoSection 
  steveAiUrl="YOUR_STEVE_AI_SHARE_URL_HERE"
  useSteveAi={true}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo"
  description="Complete construction management platform with real-time monitoring, builder directory, supplier network, and more"
/>
```

#### **For Self-Hosted**:
```tsx
<VideoSection 
  videoUrl="/ujenzipro-demo-video.mp4"
  useYouTube={false}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo"
  description="Complete construction management platform with real-time monitoring, builder directory, supplier network, and more"
/>
```

#### **For YouTube**:
```tsx
<VideoSection 
  videoId="YOUR_VIDEO_ID"
  useYouTube={true}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo"
  description="Complete construction management platform with real-time monitoring, builder directory, supplier network, and more"
/>
```

---

## 📋 Step 4: Create a Custom Thumbnail (Optional but Recommended)

Create a compelling thumbnail image to encourage clicks:

### Design Recommendations:
- **Size**: 1920x1080 pixels (16:9 aspect ratio)
- **Format**: JPG or PNG
- **File size**: Under 200KB (optimized)

### Thumbnail Content Ideas:
1. **Split screen**: 
   - Left: Monitoring camera feeds
   - Right: UjenziPro logo + "Complete Demo"

2. **Hero shot**:
   - Kenyan construction site background
   - "See UjenziPro in Action" overlay
   - Play button icon
   - "5-Minute Complete Tour"

3. **Feature showcase**:
   - Grid of 4 screenshots (Monitoring, Builders, Suppliers, Tracking)
   - "Everything You Need to Know" text
   - Duration badge "5:50"

### Save thumbnail as:
- `public/ujenzipro-demo-thumbnail.jpg` or
- `public/ujenzipro-demo-thumbnail.png`

---

## 📋 Step 5: Update Video Section Heading (Optional)

Since your new video includes monitoring features prominently, consider updating the section heading in `src/pages/Index.tsx` (lines 188-210):

### Current:
```tsx
<h2 className="text-3xl font-bold text-foreground mb-4">
  See UjenziPro in Action
</h2>
<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
  Watch how Kenyan builders and suppliers are transforming their businesses with our platform
</p>
```

### Updated (with monitoring emphasis):
```tsx
<h2 className="text-3xl font-bold text-foreground mb-4">
  Complete Platform Tour: From Monitoring to Materials
</h2>
<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
  Watch our 5-minute comprehensive demo featuring real-time site monitoring, 
  builder directory, supplier network, QR tracking, and secure payments
</p>
```

Or:

```tsx
<h2 className="text-3xl font-bold text-foreground mb-4">
  🚁 See UjenziPro in Action: Live Monitoring + Complete Marketplace
</h2>
<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
  Discover how our platform combines powerful site surveillance with 
  Kenya's premier construction marketplace - all in one comprehensive demo
</p>
```

---

## 🔧 Troubleshooting

### Issue 1: "Video not loading"
**Cause**: CSP (Content Security Policy) blocking iframe  
**Solution**: Check `index.html` and ensure Steve.ai domain is allowed:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://steve.ai https://*.steve.ai;
  frame-src 'self' https://steve.ai https://*.steve.ai https://www.youtube.com;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline';
">
```

### Issue 2: "Login required when clicking video"
**Cause**: You're using the edit URL instead of share URL  
**Solution**: Export/publish video first to get public share URL

### Issue 3: "Video quality poor"
**Cause**: Wrong export settings  
**Solution**: Re-export from Steve.ai with HD/Full HD quality

### Issue 4: "Video takes too long to load"
**Cause**: Large file size  
**Solution**: 
- Reduce video quality to 720p
- Or use YouTube hosting
- Or compress with HandBrake/FFmpeg

---

## 📊 Analytics Tracking (Optional)

Track video engagement by adding event listeners:

### In `src/components/VideoSection.tsx`, add:

```tsx
const handlePlayVideo = () => {
  setIsPlaying(true);
  
  // Track video play event
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'video_play', {
      'event_category': 'engagement',
      'event_label': title,
      'value': 1
    });
  }
  
  console.log('Video played:', title);
};
```

---

## ✅ Quick Implementation Checklist

- [ ] Log in to Steve.ai and open your project
- [ ] Export/Publish video from Steve.ai
- [ ] Choose integration method (Embed/Self-host/YouTube)
- [ ] Get the appropriate URL or download video
- [ ] Update `src/pages/Index.tsx` with correct VideoSection props
- [ ] (Optional) Create custom thumbnail
- [ ] (Optional) Update section heading to highlight monitoring
- [ ] Test video loads and plays correctly
- [ ] Test on mobile devices
- [ ] Verify CSP settings if using iframe
- [ ] (Optional) Add analytics tracking

---

## 🎯 Recommended Implementation (Best Practice)

Based on your comprehensive script with monitoring focus, here's the **recommended setup**:

### 1. **Use YouTube** for hosting (SEO benefits)
### 2. **Create eye-catching thumbnail** highlighting monitoring
### 3. **Update section copy** to emphasize monitoring features
### 4. **Add video chapters** in YouTube description:
   - 0:00 - Introduction
   - 0:20 - Platform Overview
   - 1:45 - **Real-Time Monitoring System** ⭐
   - 2:30 - Monitoring Features Deep Dive
   - 3:10 - Monitoring Benefits & ROI
   - 4:05 - QR Tracking
   - 4:25 - Delivery Management
   - 5:10 - Success Stories
   - 5:35 - Get Started

---

## 📱 Example: Complete Implementation

Here's a complete example with all best practices:

### File: `src/pages/Index.tsx` (lines 187-211)

```tsx
{/* Video Section - Complete Platform Demo with Monitoring */}
<section className="py-16 bg-gradient-to-br from-slate-50 to-slate-100">
  <div className="container mx-auto px-4">
    <AnimatedSection animation="fadeInUp">
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1">
          🚁 NEW: Real-Time Site Monitoring
        </Badge>
        <h2 className="text-4xl font-bold text-foreground mb-4">
          Complete Platform Tour: See Everything UjenziPro Offers
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Watch our comprehensive 5-minute demo featuring 
          <span className="font-semibold text-primary"> real-time construction site monitoring with drones and cameras</span>, 
          builder directory, supplier network, QR material tracking, and secure M-Pesa payments.
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            ⏱️ 5:50 minutes
          </span>
          <span className="flex items-center gap-1">
            📹 Full HD
          </span>
          <span className="flex items-center gap-1">
            🎯 All Features Covered
          </span>
        </div>
      </div>
    </AnimatedSection>
    
    <div className="max-w-5xl mx-auto">
      <VideoSection 
        videoId="YOUR_YOUTUBE_VIDEO_ID_HERE"
        useYouTube={true}
        thumbnail="/ujenzipro-complete-demo-thumbnail.jpg"
        title="UjenziPro Complete Platform Demo with Monitoring"
        description="Real-time monitoring, builder network, supplier marketplace, and more"
      />
      
      {/* Key Features Highlighted in Video */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl mb-2">🚁</div>
          <div className="font-semibold text-sm">Live Monitoring</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl mb-2">👷</div>
          <div className="font-semibold text-sm">2,500+ Builders</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl mb-2">🏪</div>
          <div className="font-semibold text-sm">850+ Suppliers</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl mb-2">📦</div>
          <div className="font-semibold text-sm">QR Tracking</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## 🎬 Next Steps After Integration

1. **Test thoroughly**:
   - Desktop (Chrome, Safari, Firefox)
   - Mobile (iOS Safari, Android Chrome)
   - Tablet (iPad, Android tablets)

2. **Monitor performance**:
   - Page load time
   - Video load time
   - Watch completion rate

3. **A/B test thumbnails**:
   - Try different thumbnail designs
   - Track which gets more plays

4. **Promote the video**:
   - Share on social media
   - Email to existing users
   - Feature in marketing materials
   - Add to builder/supplier onboarding

5. **Update regularly**:
   - Refresh video every 6-12 months
   - Add new features as they launch
   - Update statistics and testimonials

---

## 📧 Need Help?

If you need assistance with:
- Getting the Steve.ai share URL
- Video export/optimization
- Integration issues
- Custom thumbnail design

Let me know and I can provide more specific guidance!

---

**Remember**: The edit URL (`https://app.steve.ai/steveai/editproject/...`) won't work for public viewing. You need the **share/embed URL** after publishing!

---

*Last Updated: October 21, 2025*  
*For: UjenziPro Homepage Video Integration*



