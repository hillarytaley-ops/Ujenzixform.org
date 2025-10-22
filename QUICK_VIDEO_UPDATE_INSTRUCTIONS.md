# 🚀 Quick Video Integration - Copy & Paste Instructions

## ⚡ 3-Step Quick Start

### Step 1: Get Your Steve.ai Share URL

1. Go to [Steve.ai](https://app.steve.ai)
2. Open your project: `Z-IuBZoBZKQRxDAj51nX`
3. Click **"Export"** or **"Publish"**
4. After publishing, click **"Share"** to get the public URL
5. Copy the share URL (should look like: `https://share.steve.ai/XXXXX`)

**Important**: The edit URL you provided won't work - you need the **share URL**!

---

### Step 2: Update Your Homepage

Open `src/pages/Index.tsx` and find lines 202-209.

**Replace this:**
```tsx
<VideoSection 
  synthesiaUrl="https://share.synthesia.io/3bfef3e8-48c7-4b55-ac74-f638ff572705"
  useSynthesia={true}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Platform Demo"
  description="See how easy it is to connect, quote, and build across Kenya - from Nairobi to Mombasa, Kisumu to Eldoret"
/>
```

**With this:**
```tsx
<VideoSection 
  steveAiUrl="YOUR_STEVE_AI_SHARE_URL_HERE"
  useSteveAi={true}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo with Monitoring"
  description="See our real-time monitoring system, builder network, supplier marketplace, QR tracking, and secure payments in action"
/>
```

**Note**: Replace `YOUR_STEVE_AI_SHARE_URL_HERE` with your actual Steve.ai share URL from Step 1.

---

### Step 3: Test It!

1. Save the file
2. The app should automatically reload
3. Scroll to the video section
4. Click play to test

---

## 🎨 Bonus: Enhanced Version (Recommended)

For a more professional look with monitoring emphasis, replace lines 187-211 with:

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
          See UjenziPro's Complete Platform in Action
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Watch our comprehensive demo featuring 
          <span className="font-semibold text-primary"> real-time construction site monitoring with drones and cameras</span>, 
          builder directory, supplier network, QR material tracking, and secure M-Pesa payments across all 47 counties.
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            ⏱️ <span>5-6 minutes</span>
          </span>
          <span className="flex items-center gap-2">
            📹 <span>Full HD</span>
          </span>
          <span className="flex items-center gap-2">
            🎯 <span>All Features</span>
          </span>
        </div>
      </div>
    </AnimatedSection>
    
    <div className="max-w-5xl mx-auto">
      <VideoSection 
        steveAiUrl="YOUR_STEVE_AI_SHARE_URL_HERE"
        useSteveAi={true}
        thumbnail="/ujenzipro-demo-thumbnail.svg"
        title="UjenziPro Complete Platform Demo with Monitoring"
        description="Real-time site monitoring, builder network, supplier marketplace, QR tracking, and more"
      />
      
      {/* Key Features Highlighted in Video */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">🚁</div>
          <div className="font-semibold text-sm text-foreground">Live Monitoring</div>
          <div className="text-xs text-muted-foreground mt-1">Drones & Cameras</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">👷</div>
          <div className="font-semibold text-sm text-foreground">2,500+ Builders</div>
          <div className="text-xs text-muted-foreground mt-1">Verified Professionals</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">🏪</div>
          <div className="font-semibold text-sm text-foreground">850+ Suppliers</div>
          <div className="text-xs text-muted-foreground mt-1">Quality Materials</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">📦</div>
          <div className="font-semibold text-sm text-foreground">QR Tracking</div>
          <div className="text-xs text-muted-foreground mt-1">Full Traceability</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## ❓ Common Issues & Solutions

### "I don't have a Steve.ai share URL yet"

**Solution**: Use a placeholder for now:

```tsx
<VideoSection 
  videoUrl="/placeholder-video.mp4"
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo - Coming Soon"
  description="Our comprehensive demo video is being finalized. Check back soon!"
/>
```

---

### "I want to use YouTube instead"

1. Download video from Steve.ai
2. Upload to YouTube
3. Get video ID from URL: `youtube.com/watch?v=VIDEO_ID`
4. Use this code:

```tsx
<VideoSection 
  videoId="YOUR_YOUTUBE_VIDEO_ID"
  useYouTube={true}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo with Monitoring"
  description="Real-time monitoring, builder network, and comprehensive marketplace"
/>
```

---

### "I want to self-host the video"

1. Download MP4 from Steve.ai
2. Place in `public` folder as `ujenzipro-demo.mp4`
3. Use this code:

```tsx
<VideoSection 
  videoUrl="/ujenzipro-demo.mp4"
  useYouTube={false}
  useSynthesia={false}
  useSteveAi={false}
  thumbnail="/ujenzipro-demo-thumbnail.svg"
  title="UjenziPro Complete Platform Demo with Monitoring"
  description="Real-time monitoring, builder network, and comprehensive marketplace"
/>
```

---

## 📸 Creating a Custom Thumbnail (Optional)

If you want a professional thumbnail instead of the default:

### Option 1: Use Canva (Easiest)
1. Go to [Canva.com](https://canva.com)
2. Create "YouTube Thumbnail" (1280x720)
3. Design with:
   - UjenziPro logo
   - "Complete Demo" text
   - Screenshots of monitoring page
   - "5 Minutes" badge
   - Play button icon
4. Download as JPG
5. Save as `public/ujenzipro-demo-thumbnail.jpg`
6. Update code: `thumbnail="/ujenzipro-demo-thumbnail.jpg"`

### Option 2: Use Screenshot
1. Take screenshot of your monitoring page
2. Add text overlay: "See UjenziPro in Action"
3. Add play button icon
4. Resize to 1920x1080
5. Save as `public/ujenzipro-demo-thumbnail.jpg`

---

## ✅ Final Checklist

- [ ] Got Steve.ai share URL (not edit URL)
- [ ] Updated `src/pages/Index.tsx` with new VideoSection code
- [ ] Replaced `YOUR_STEVE_AI_SHARE_URL_HERE` with actual URL
- [ ] Saved file and tested in browser
- [ ] Video loads and plays correctly
- [ ] Tested on mobile device
- [ ] (Optional) Created custom thumbnail
- [ ] (Optional) Added feature badges below video

---

## 🎯 What You'll Have

After following these steps, your homepage will have:

✅ Professional video section with monitoring emphasis  
✅ Eye-catching presentation with "NEW" badge  
✅ Clear description highlighting all features  
✅ Feature cards showing what's in the video  
✅ Smooth animations and responsive design  
✅ Works on all devices (desktop, tablet, mobile)  

---

## 📞 Still Need Help?

**Issue**: Can't get Steve.ai share URL  
**Solution**: See full guide in `STEVE_AI_VIDEO_INTEGRATION_GUIDE.md`

**Issue**: Video not loading  
**Solution**: Check browser console for errors, verify URL is correct

**Issue**: Want to customize further  
**Solution**: Check `UJENZIPRO_COMPLETE_DEMO_VIDEO_SCRIPT_WITH_MONITORING.md` for full video details

---

**That's it! You're ready to showcase your comprehensive UjenziPro demo with monitoring features! 🎉**



