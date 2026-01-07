# 🎥 Builder Video Showcase System Documentation

## 📋 Overview

The Builder Video Showcase System allows professional builders to upload videos of their successful projects to showcase their work. The public can view these videos, leave comments, and like them. This feature enhances builder credibility and helps potential clients make informed decisions.

---

## 🎯 Key Features

### For Professional Builders:
- ✅ Upload project videos (up to 500MB)
- ✅ Add detailed project information (title, description, location, duration, budget range)
- ✅ Categorize projects (Residential, Commercial, Industrial, etc.)
- ✅ View analytics (views, likes, comments)
- ✅ Manage their video gallery
- ✅ Delete videos they own

### For Public Users:
- ✅ Browse all project videos
- ✅ Filter by project type
- ✅ Watch videos in a full-featured player
- ✅ Like videos (with or without login)
- ✅ Comment on videos (with or without login)
- ✅ Reply to comments
- ✅ View project details and builder information

---

## 📁 File Structure

```
src/
├── components/
│   └── builders/
│       ├── VideoUpload.tsx          # Video upload dialog component
│       ├── BuilderVideoGallery.tsx  # Video gallery display
│       └── VideoPlayer.tsx          # Video player with comments/likes
├── pages/
│   └── Builders.tsx                 # Main builders page (integrated)
└── integrations/
    └── supabase/
        └── types.ts                 # Updated with video tables

supabase/
└── migrations/
    └── 20251126000000_create_builder_videos_system.sql
```

---

## 🗄️ Database Schema

### Tables Created:

#### 1. `builder_videos`
Stores video metadata and project information.

**Columns:**
- `id` (UUID, Primary Key)
- `builder_id` (UUID, Foreign Key to auth.users)
- `title` (TEXT, Required)
- `description` (TEXT, Nullable)
- `video_url` (TEXT, Required) - Supabase Storage URL
- `thumbnail_url` (TEXT, Nullable)
- `project_type` (TEXT, Nullable) - e.g., 'Residential', 'Commercial'
- `project_location` (TEXT, Nullable)
- `project_duration` (TEXT, Nullable)
- `project_cost_range` (TEXT, Nullable)
- `views_count` (INTEGER, Default: 0)
- `likes_count` (INTEGER, Default: 0)
- `comments_count` (INTEGER, Default: 0)
- `is_featured` (BOOLEAN, Default: false)
- `is_published` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 2. `video_likes`
Tracks likes from authenticated and guest users.

**Columns:**
- `id` (UUID, Primary Key)
- `video_id` (UUID, Foreign Key to builder_videos)
- `user_id` (UUID, Foreign Key to auth.users, Nullable)
- `guest_identifier` (TEXT, Nullable) - For guest users
- `created_at` (TIMESTAMPTZ)

**Unique Constraints:**
- `(video_id, user_id)` - One like per user per video
- `(video_id, guest_identifier)` - One like per guest per video

#### 3. `video_comments`
Stores comments with support for threaded replies.

**Columns:**
- `id` (UUID, Primary Key)
- `video_id` (UUID, Foreign Key to builder_videos)
- `user_id` (UUID, Foreign Key to auth.users, Nullable)
- `commenter_name` (TEXT, Required)
- `commenter_email` (TEXT, Nullable)
- `comment_text` (TEXT, Required)
- `is_approved` (BOOLEAN, Default: true) - For moderation
- `parent_comment_id` (UUID, Foreign Key to video_comments, Nullable)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 4. `video_views`
Analytics data for video views and watch duration.

**Columns:**
- `id` (UUID, Primary Key)
- `video_id` (UUID, Foreign Key to builder_videos)
- `user_id` (UUID, Foreign Key to auth.users, Nullable)
- `guest_identifier` (TEXT, Nullable)
- `watch_duration` (INTEGER, Default: 0) - Seconds watched
- `viewed_at` (TIMESTAMPTZ)

---

## 🔐 Security & Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### `builder_videos` Policies:
1. **Public can view published videos** - Anyone can see published videos
2. **Builders can view own videos** - Builders see all their videos (published or not)
3. **Builders can upload videos** - Authenticated builders can insert
4. **Builders can update own videos** - Builders can edit their own videos
5. **Builders can delete own videos** - Builders can remove their own videos

### `video_likes` Policies:
1. **Anyone can view likes** - Public read access for counts
2. **Authenticated users can like** - Logged-in users can like
3. **Public users can like** - Guest users can like (using guest_identifier)
4. **Users can unlike** - Users can remove their own likes

### `video_comments` Policies:
1. **Anyone can view approved comments** - Public read access
2. **Users can view own comments** - See your own comments (even if not approved)
3. **Authenticated users can comment** - Logged-in users can post
4. **Public users can comment** - Guest users can post comments
5. **Users can update own comments** - Edit your own comments
6. **Users can delete own comments** - Remove your own comments

### `video_views` Policies:
1. **Anyone can record views** - Public can insert views
2. **Builder can view own analytics** - Only video owner sees view data

---

## 💾 Storage Configuration

### Storage Bucket: `builder-videos`

**Configuration:**
- **Public Access:** ✅ Yes
- **Max File Size:** 500MB (524,288,000 bytes)
- **Allowed MIME Types:**
  - `video/mp4`
  - `video/webm`
  - `video/quicktime`
  - `video/x-msvideo`
  - `video/mpeg`

**Storage Path Structure:**
```
builder-videos/
└── {builder_id}/
    └── {timestamp}-{sanitized-title}.{ext}
```

**Example:**
```
builder-videos/123e4567-e89b-12d3-a456-426614174000/1732608000000-modern-villa-runda.mp4
```

---

## 🎨 Component Details

### 1. VideoUpload Component

**Location:** `src/components/builders/VideoUpload.tsx`

**Purpose:** Modal dialog for uploading project videos with metadata.

**Props:**
```typescript
interface VideoUploadProps {
  builderId: string;
  onUploadComplete?: () => void;
}
```

**Features:**
- File validation (type and size)
- Video preview before upload
- Progress indicator
- Project details form (title, description, type, location, duration, budget)
- Automatic metadata saving to database

**Form Fields:**
- **Video File*** (required) - MP4, WebM, or MOV up to 500MB
- **Project Title*** (required)
- **Project Description** (optional)
- **Project Type** (dropdown) - Residential, Commercial, Industrial, etc.
- **Location** (text)
- **Duration** (text) - e.g., "6 months"
- **Budget Range** (dropdown) - Various KES ranges

---

### 2. BuilderVideoGallery Component

**Location:** `src/components/builders/BuilderVideoGallery.tsx`

**Purpose:** Display grid of video projects with filtering.

**Props:**
```typescript
interface BuilderVideoGalleryProps {
  builderId?: string;        // Show only this builder's videos
  showUploadButton?: boolean; // Show upload button
  isOwner?: boolean;         // Show edit/delete options
}
```

**Features:**
- Responsive grid layout (1-3 columns)
- Project type filtering
- Featured videos highlight
- Video thumbnail with play overlay
- Project details display (location, duration, budget)
- Stats display (views, likes, comments)
- Owner actions (edit, delete)
- Click to open video player

**Filter Options:**
- All Projects
- Featured
- Residential
- Commercial
- Industrial
- Renovation
- Infrastructure
- Interior Design

---

### 3. VideoPlayer Component

**Location:** `src/components/builders/VideoPlayer.tsx`

**Purpose:** Full-featured video player with comments and likes.

**Props:**
```typescript
interface VideoPlayerProps {
  video: BuilderVideo;
  isOpen: boolean;
  onClose: () => void;
  onVideoUpdate?: () => void;
}
```

**Features:**

**Video Section:**
- Full-screen video player with HTML5 controls
- Auto-play on open
- Watch duration tracking

**Info Section:**
- Video title and description
- Builder profile info with avatar
- Project details (type, location, duration, budget)
- Stats (views, likes, comments)
- Like button (toggleable)

**Comments Section:**
- Scrollable comments list
- Threaded replies support
- Time-ago formatting (e.g., "2 hours ago")
- User avatars
- Reply button

**Comment Input:**
- Textarea for new comments
- Name/email fields for guests
- Reply mode indicator
- Post button

---

## 🚀 How to Use

### For Builders:

#### 1. Access Your Dashboard
Navigate to `/builders` and log in as a professional builder.

#### 2. Upload a Video
```typescript
// In Professional Builder Dashboard
1. Go to "Videos" tab
2. Click "Upload Project Video"
3. Select video file (max 500MB)
4. Fill in project details:
   - Title (required)
   - Description
   - Project type
   - Location
   - Duration
   - Budget range
5. Click "Upload Video"
6. Wait for upload to complete
```

#### 3. Manage Videos
- View all your uploaded videos
- See analytics (views, likes, comments)
- Delete videos you no longer want to showcase

---

### For Public Users:

#### 1. Browse Videos
Visit `/builders` to see the video showcase section.

#### 2. Filter Videos
Use the filter buttons to show:
- All projects
- Featured projects
- Specific project types

#### 3. Watch Videos
Click on any video card to open the player.

#### 4. Like Videos
Click the "Like" button in the video player (no login required).

#### 5. Comment on Videos
```typescript
// For logged-in users:
1. Type your comment
2. Click "Post Comment"

// For guest users:
1. Enter your name (required)
2. Enter email (optional)
3. Type your comment
4. Click "Post Comment"
```

#### 6. Reply to Comments
Click "Reply" on any comment to start a threaded conversation.

---

## 🔧 Technical Implementation

### Video Upload Flow:

```typescript
1. User selects video file
2. Validate file type and size
3. Create preview URL
4. User fills project details
5. Generate unique filename: {builderId}/{timestamp}-{title}.{ext}
6. Upload to Supabase Storage bucket 'builder-videos'
7. Get public URL
8. Save metadata to 'builder_videos' table
9. Show success message
10. Refresh gallery
```

### Like/Unlike Flow:

```typescript
// For authenticated users:
1. Check if already liked (query video_likes table)
2. If liked: DELETE from video_likes
3. If not liked: INSERT into video_likes with user_id
4. Update local state
5. Trigger count update via database trigger

// For guest users:
1. Check localStorage for guest likes
2. If liked: DELETE and update localStorage
3. If not liked: INSERT with guest_identifier and update localStorage
4. Update local state
```

### Comment Flow:

```typescript
1. User enters comment text
2. For guests: require name, optional email
3. INSERT into video_comments table
   - video_id
   - user_id (if logged in) or NULL
   - commenter_name
   - commenter_email (optional)
   - comment_text
   - parent_comment_id (for replies)
4. Trigger count update via database trigger
5. Refresh comments list
```

### View Tracking:

```typescript
1. When video player opens, record view:
   - video_id
   - user_id (if logged in) or NULL
   - guest_identifier (if not logged in)
   - viewed_at: NOW()

2. When video player closes, record watch duration:
   - Calculate seconds watched
   - UPDATE video_views with watch_duration
```

---

## 📊 Database Triggers

### Auto-update Counts:

```sql
-- Function: update_video_counts()
-- Triggered on: INSERT/DELETE in video_likes and video_comments
-- Action: Updates likes_count and comments_count in builder_videos
```

**Trigger 1: update_likes_count**
- ON: video_likes INSERT/DELETE
- Updates: builder_videos.likes_count

**Trigger 2: update_comments_count**
- ON: video_comments INSERT/DELETE
- Updates: builder_videos.comments_count

### Auto-update Timestamps:

```sql
-- Function: update_updated_at_column()
-- Triggered on: UPDATE in builder_videos and video_comments
-- Action: Sets updated_at = NOW()
```

---

## 🎨 UI/UX Features

### Video Cards:
- **Aspect ratio:** 16:9 video preview
- **Hover effect:** Play button scales up
- **Badges:** Featured (yellow), Project Type (blue)
- **Stats:** Eye, heart, comment icons with counts
- **Shadow:** Elevates on hover

### Video Player Modal:
- **Layout:** 2-column (video left, info/comments right)
- **Responsive:** Full-width on mobile
- **Max height:** 95vh with scroll
- **Background:** Black for video, white for info

### Comments:
- **Avatar:** First letter of name in colored circle
- **Time:** Relative time (e.g., "2 hours ago")
- **Replies:** Indented with connecting lines
- **Input:** Auto-expanding textarea

---

## 📱 Responsive Design

### Desktop (lg+):
- 3-column video grid
- 2-column video player (video | info)
- All filter buttons visible

### Tablet (md):
- 2-column video grid
- 2-column video player
- Scrollable filters

### Mobile (sm):
- 1-column video grid
- Stacked video player (video above info)
- Horizontal scroll filters
- Compact stats

---

## 🔄 Integration with Builders Page

### Professional Builder Dashboard:
```typescript
// New "Videos" tab added to professional builder tabs
<TabsTrigger value="videos">
  <Video className="h-4 w-4" />
  Videos
</TabsTrigger>

<TabsContent value="videos">
  <VideoUpload builderId={userProfile.user_id} />
  <BuilderVideoGallery builderId={userProfile.user_id} isOwner={true} />
</TabsContent>
```

### Public Directory:
```typescript
// Video showcase section added below builder grid
<BuilderVideoGallery showUploadButton={false} isOwner={false} />
```

---

## 🚀 Deployment Steps

### 1. Apply Database Migration
```sql
-- Run this in Supabase SQL Editor:
-- File: supabase/migrations/20251126000000_create_builder_videos_system.sql

-- This creates:
-- - Storage bucket 'builder-videos'
-- - Tables: builder_videos, video_likes, video_comments, video_views
-- - RLS policies for all tables
-- - Database triggers for auto-updates
-- - Storage policies for video access
```

### 2. Verify Storage Bucket
```typescript
// In Supabase Dashboard > Storage
// Ensure 'builder-videos' bucket exists with:
- Public: true
- File size limit: 524288000 bytes (500MB)
- Allowed MIME types: video/mp4, video/webm, video/quicktime, etc.
```

### 3. Deploy Frontend
```bash
# Ensure date-fns is installed
npm install date-fns

# Build and deploy
npm run build
# Deploy to your hosting platform (Vercel, Netlify, etc.)
```

### 4. Test Video Upload
```typescript
1. Log in as professional builder
2. Go to Videos tab
3. Upload a test video
4. Verify video appears in gallery
5. Test video player
6. Test like functionality
7. Test comment functionality
```

---

## 🐛 Troubleshooting

### Video upload fails:
- ✅ Check file size (max 500MB)
- ✅ Check file type (MP4, WebM, MOV)
- ✅ Verify storage bucket exists
- ✅ Check storage policies allow uploads

### Videos not showing:
- ✅ Verify `is_published = true`
- ✅ Check RLS policies
- ✅ Ensure videos table has data

### Comments not posting:
- ✅ Verify guest users enter name
- ✅ Check comment text is not empty
- ✅ Review RLS policies on video_comments

### Likes not counting:
- ✅ Check database triggers are active
- ✅ Verify unique constraints on video_likes
- ✅ Review like/unlike logic

---

## 📈 Future Enhancements

### Planned Features:
- [ ] Video thumbnail auto-generation
- [ ] Video editing (trim, add text overlay)
- [ ] Video playlists by builder
- [ ] Video recommendations based on project type
- [ ] Comment moderation dashboard for builders
- [ ] Video sharing to social media
- [ ] Advanced analytics (watch time heatmap, drop-off points)
- [ ] Video quality selection (360p, 720p, 1080p)
- [ ] Picture-in-picture mode
- [ ] Download video option (for owner)
- [ ] Watermark videos with builder logo

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review database migration file
3. Verify RLS policies in Supabase
4. Check browser console for errors
5. Review Supabase logs

---

## 🎉 Success Criteria

✅ **Feature Complete When:**
- Builders can upload videos with project details
- Videos appear in gallery with filtering
- Public users can watch videos
- Public users can like videos (with/without login)
- Public users can comment (with/without login)
- Comments support threaded replies
- View analytics are tracked
- Owner can delete their videos
- All features work on mobile and desktop
- Database migration runs successfully
- No security vulnerabilities

---

**Last Updated:** November 26, 2024  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production















