# 🚀 Quick Setup Guide - Builder Video Showcase

## ⚡ Fast Setup (5 Minutes)

### Step 1: Apply Database Migration
```sql
-- Go to Supabase Dashboard > SQL Editor
-- Paste and run the contents of:
supabase/migrations/20251126000000_create_builder_videos_system.sql
```

**What this does:**
- ✅ Creates storage bucket `builder-videos`
- ✅ Creates 4 tables: builder_videos, video_likes, video_comments, video_views
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Creates database triggers for auto-updating counts
- ✅ Configures storage policies

### Step 2: Verify Installation
```bash
# Check if date-fns is installed (should already be installed)
npm list date-fns

# If not installed, run:
npm install date-fns
```

### Step 3: Test the Feature

#### As a Professional Builder:
1. Go to `http://localhost:5173/builders` (or your deployed URL)
2. Log in as a professional builder
3. Click the **"Videos"** tab
4. Click **"Upload Project Video"**
5. Select a video file (MP4, max 500MB recommended for testing)
6. Fill in the form:
   - Title: "Test Project Video"
   - Description: "This is a test"
   - Project Type: Select any
7. Click **"Upload Video"**
8. Wait for upload to complete
9. See your video in the gallery!

#### As a Public User:
1. Go to `http://localhost:5173/builders` (without logging in)
2. Scroll down to see **"Project Showcase"** section
3. Click on any video to watch
4. Try liking the video
5. Try adding a comment (enter your name as a guest)

### Step 4: Deploy (Optional)
```bash
# Build the project
npm run build

# Deploy to your hosting platform
# The feature is already integrated!
```

---

## 📍 Where to Find It

### For Builders:
- **Path:** `/builders` → Log in → **Videos** tab
- **Action:** Upload and manage project videos

### For Public:
- **Path:** `/builders` → Scroll down → **Project Showcase** section
- **Action:** Browse, watch, like, and comment on videos

---

## 🎯 What You Can Do Now

### As a Professional Builder:
✅ Upload project showcase videos  
✅ Add detailed project information  
✅ Categorize by project type  
✅ View video analytics (views, likes, comments)  
✅ Delete videos  

### As a Public Visitor:
✅ Browse all project videos  
✅ Filter by project type  
✅ Watch videos in full player  
✅ Like videos (no login needed)  
✅ Comment on videos (no login needed)  
✅ Reply to comments  

---

## 🔥 Quick Test Checklist

- [ ] Database migration applied successfully
- [ ] Storage bucket 'builder-videos' exists in Supabase
- [ ] Professional builder can see "Videos" tab
- [ ] Video upload dialog opens
- [ ] Can select and upload a video file
- [ ] Video appears in gallery after upload
- [ ] Public users can see videos in builders page
- [ ] Video player opens when clicking a video
- [ ] Like button works (toggles on/off)
- [ ] Can post comments as guest (with name)
- [ ] Can post comments as logged-in user
- [ ] Can reply to comments
- [ ] Video stats update (views, likes, comments)

---

## 📦 Files Created/Modified

### New Files:
```
✨ src/components/builders/VideoUpload.tsx
✨ src/components/builders/BuilderVideoGallery.tsx
✨ src/components/builders/VideoPlayer.tsx
✨ supabase/migrations/20251126000000_create_builder_videos_system.sql
✨ BUILDER_VIDEO_SHOWCASE_DOCUMENTATION.md
✨ QUICK_SETUP_VIDEO_FEATURE.md (this file)
```

### Modified Files:
```
📝 src/pages/Builders.tsx (added video gallery integration)
📝 src/integrations/supabase/types.ts (added video table types)
```

---

## 🐛 Common Issues & Solutions

### Issue: "Storage bucket not found"
**Solution:** Run the migration SQL again. Ensure you have the correct Supabase project selected.

### Issue: "Cannot upload video"
**Solution:** 
1. Check file size (max 500MB)
2. Check file type (MP4, WebM, MOV)
3. Verify you're logged in as a builder

### Issue: "Videos not showing"
**Solution:**
1. Refresh the page
2. Check if videos are published (`is_published = true`)
3. Verify RLS policies are applied

### Issue: "Comments not posting"
**Solution:**
1. Ensure you entered a name (for guests)
2. Check comment text is not empty
3. Try refreshing the page

---

## 📚 Full Documentation

For detailed information, see:
**BUILDER_VIDEO_SHOWCASE_DOCUMENTATION.md**

---

## 🎉 You're Ready!

The video showcase feature is fully integrated and ready to use. Professional builders can now showcase their work through videos, and potential clients can engage with content through likes and comments!

**Happy Building! 🏗️**















