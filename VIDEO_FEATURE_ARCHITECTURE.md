# 🏗️ Builder Video Showcase - System Architecture

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UJENZIPRO PLATFORM                          │
│                      Builder Video Showcase System                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────┐  ┌─────────────────────┐  ┌──────────────┐ │
│  │   Builders Page   │  │  Professional Tab   │  │  Public View │ │
│  │   (/builders)     │  │     (Videos)        │  │   Gallery    │ │
│  └────────┬──────────┘  └──────────┬──────────┘  └──────┬───────┘ │
│           │                        │                     │         │
│           └────────────────────────┴─────────────────────┘         │
│                                    │                               │
│           ┌────────────────────────┴─────────────────────┐         │
│           │                                              │         │
│  ┌────────▼─────────┐  ┌────────────────────┐  ┌───────▼──────┐  │
│  │  VideoUpload.tsx │  │BuilderVideoGallery │  │VideoPlayer   │  │
│  │                  │  │        .tsx        │  │    .tsx      │  │
│  │  - File Upload   │  │  - Grid Display    │  │  - Player    │  │
│  │  - Validation    │  │  - Filtering       │  │  - Comments  │  │
│  │  - Progress Bar  │  │  - Cards           │  │  - Likes     │  │
│  └──────────────────┘  └────────────────────┘  └──────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Supabase Client API
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND LAYER                              │
│                        (Supabase Cloud)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    STORAGE (builder-videos)                   │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  {builder_id}/                                          │ │ │
│  │  │    └── {timestamp}-{title}.mp4                          │ │ │
│  │  │    └── {timestamp}-{title}.webm                         │ │ │
│  │  │  Max Size: 500MB per file                               │ │ │
│  │  │  Public Access: Yes (read-only)                         │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    DATABASE (PostgreSQL)                      │ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────┐    │ │
│  │  │  builder_videos                                      │    │ │
│  │  │  ├── id (PK)                                         │    │ │
│  │  │  ├── builder_id (FK → auth.users)                   │    │ │
│  │  │  ├── title, description                             │    │ │
│  │  │  ├── video_url, thumbnail_url                       │    │ │
│  │  │  ├── project_type, location, duration, cost         │    │ │
│  │  │  ├── views_count, likes_count, comments_count       │    │ │
│  │  │  └── is_featured, is_published                       │    │ │
│  │  └─────────────────────────────────────────────────────┘    │ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────┐    │ │
│  │  │  video_likes                                         │    │ │
│  │  │  ├── id (PK)                                         │    │ │
│  │  │  ├── video_id (FK → builder_videos)                 │    │ │
│  │  │  ├── user_id (FK → auth.users, nullable)            │    │ │
│  │  │  ├── guest_identifier (nullable)                     │    │ │
│  │  │  └── UNIQUE(video_id, user_id)                       │    │ │
│  │  └─────────────────────────────────────────────────────┘    │ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────┐    │ │
│  │  │  video_comments                                      │    │ │
│  │  │  ├── id (PK)                                         │    │ │
│  │  │  ├── video_id (FK → builder_videos)                 │    │ │
│  │  │  ├── user_id (FK → auth.users, nullable)            │    │ │
│  │  │  ├── commenter_name, commenter_email                │    │ │
│  │  │  ├── comment_text                                    │    │ │
│  │  │  ├── parent_comment_id (FK → self, nullable)        │    │ │
│  │  │  └── is_approved                                     │    │ │
│  │  └─────────────────────────────────────────────────────┘    │ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────┐    │ │
│  │  │  video_views                                         │    │ │
│  │  │  ├── id (PK)                                         │    │ │
│  │  │  ├── video_id (FK → builder_videos)                 │    │ │
│  │  │  ├── user_id (FK → auth.users, nullable)            │    │ │
│  │  │  ├── guest_identifier (nullable)                     │    │ │
│  │  │  ├── watch_duration (seconds)                        │    │ │
│  │  │  └── viewed_at                                       │    │ │
│  │  └─────────────────────────────────────────────────────┘    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    ROW LEVEL SECURITY (RLS)                   │ │
│  │  ✓ Public can view published videos                          │ │
│  │  ✓ Builders can CRUD their own videos                        │ │
│  │  ✓ Anyone can like/comment                                   │ │
│  │  ✓ Only owners see analytics                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    DATABASE TRIGGERS                          │ │
│  │  ⚡ Auto-update likes_count on video_likes INSERT/DELETE     │ │
│  │  ⚡ Auto-update comments_count on video_comments INSERT/DEL  │ │
│  │  ⚡ Auto-update updated_at on record UPDATE                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### 1. Video Upload Flow

```
┌──────────────┐
│   Builder    │ Clicks "Upload Video"
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│  VideoUpload Component │
│  - Shows dialog        │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  User Actions:         │
│  1. Select video file  │
│  2. Fill form          │
│  3. Click upload       │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Validation:           │
│  ✓ File type (MP4)     │
│  ✓ File size (<500MB)  │
│  ✓ Required fields     │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Generate filename:    │
│  {builder_id}/         │
│  {timestamp}-{title}   │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Upload to Storage:    │
│  supabase.storage      │
│  .from('builder-videos')│
│  .upload(filename, file)│
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Get public URL        │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Insert to Database:   │
│  builder_videos table  │
│  - title               │
│  - description         │
│  - video_url           │
│  - project details     │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Success!              │
│  - Show toast          │
│  - Refresh gallery     │
└────────────────────────┘
```

---

### 2. Video View Flow

```
┌──────────────┐
│  Public User │ Clicks video card
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│  Fetch video metadata  │
│  from builder_videos   │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Open VideoPlayer      │
│  - Load video from URL │
│  - Show project info   │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Record View:          │
│  INSERT video_views    │
│  - video_id            │
│  - user_id / guest_id  │
│  - viewed_at: NOW()    │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Fetch comments        │
│  from video_comments   │
│  WHERE video_id = X    │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Check like status     │
│  from video_likes      │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Display:              │
│  - Video player        │
│  - Project info        │
│  - Comments            │
│  - Like button         │
└────────────────────────┘
```

---

### 3. Like/Unlike Flow

```
┌──────────────┐
│     User     │ Clicks "Like" button
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│  Check if already liked│
│  Query: video_likes    │
│  WHERE video_id = X    │
│  AND (user_id = Y OR   │
│       guest_id = Z)    │
└──────┬─────────────────┘
       │
       ├─── Already Liked? ───┐
       │                      │
       ▼ NO                   ▼ YES
┌──────────────────┐   ┌──────────────────┐
│  INSERT LIKE:    │   │  DELETE LIKE:    │
│  video_likes     │   │  video_likes     │
│  - video_id      │   │  WHERE id = X    │
│  - user_id/guest │   └──────┬───────────┘
└──────┬───────────┘          │
       │                      │
       └──────────┬───────────┘
                  │
                  ▼
       ┌────────────────────────┐
       │  DATABASE TRIGGER:     │
       │  update_video_counts() │
       │  - Increment/decrement │
       │    likes_count in      │
       │    builder_videos      │
       └──────┬─────────────────┘
              │
              ▼
       ┌────────────────────────┐
       │  Update UI:            │
       │  - Toggle button state │
       │  - Update count display│
       └────────────────────────┘
```

---

### 4. Comment Flow

```
┌──────────────┐
│     User     │ Types comment & clicks "Post"
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│  Validation:           │
│  ✓ Comment not empty   │
│  ✓ Guest: name required│
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  INSERT COMMENT:       │
│  video_comments        │
│  - video_id            │
│  - user_id / NULL      │
│  - commenter_name      │
│  - comment_text        │
│  - parent_comment_id?  │
│  - is_approved: true   │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  DATABASE TRIGGER:     │
│  update_video_counts() │
│  - Increment           │
│    comments_count in   │
│    builder_videos      │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Refresh comments list │
│  - Fetch all comments  │
│  - Organize threaded   │
│  - Display with replies│
└────────────────────────┘
```

---

## 🔒 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: FRONTEND VALIDATION                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ✓ File type check (video/* only)                    │ │
│  │  ✓ File size check (max 500MB)                       │ │
│  │  ✓ Required field validation                         │ │
│  │  ✓ Form sanitization                                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  Layer 2: STORAGE POLICIES                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ✓ Upload: Only authenticated users                  │ │
│  │  ✓ Upload path: Must match auth.uid()                │ │
│  │  ✓ MIME type enforcement                             │ │
│  │  ✓ File size limit: 500MB                            │ │
│  │  ✓ Public read, authenticated write                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  Layer 3: ROW LEVEL SECURITY (RLS)                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  builder_videos:                                      │ │
│  │  • SELECT: Public if published, owner always         │ │
│  │  • INSERT: Authenticated, builder_id = auth.uid()    │ │
│  │  • UPDATE: Owner only (builder_id = auth.uid())      │ │
│  │  • DELETE: Owner only (builder_id = auth.uid())      │ │
│  │                                                       │ │
│  │  video_likes:                                         │ │
│  │  • SELECT: Public (for counts)                       │ │
│  │  • INSERT: Anyone (with validation)                  │ │
│  │  • DELETE: Own likes only                            │ │
│  │                                                       │ │
│  │  video_comments:                                      │ │
│  │  • SELECT: Public if approved                        │ │
│  │  • INSERT: Anyone (guests provide name)              │ │
│  │  • UPDATE: Own comments only                         │ │
│  │  • DELETE: Own comments only                         │ │
│  │                                                       │ │
│  │  video_views:                                         │ │
│  │  • SELECT: Video owner only                          │ │
│  │  • INSERT: Anyone                                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  Layer 4: FOREIGN KEY CONSTRAINTS                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ✓ builder_id → auth.users (CASCADE DELETE)          │ │
│  │  ✓ video_id → builder_videos (CASCADE DELETE)        │ │
│  │  ✓ user_id → auth.users (SET NULL on delete)         │ │
│  │  ✓ parent_comment_id → video_comments (CASCADE)      │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  Layer 5: UNIQUE CONSTRAINTS                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ✓ (video_id, user_id) in video_likes                │ │
│  │  ✓ (video_id, guest_identifier) in video_likes       │ │
│  │  → Prevents duplicate likes                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Relationships

```
┌──────────────────────┐
│     auth.users       │
│     (Supabase)       │
│  ├── id (PK)         │
│  ├── email           │
│  └── ...             │
└─────────┬────────────┘
          │
          │ builder_id (FK)
          │
          ▼
┌──────────────────────────────────────┐
│       builder_videos                 │
│  ├── id (PK)                         │
│  ├── builder_id (FK → auth.users)   │ ◄───────┐
│  ├── title                           │         │
│  ├── description                     │         │
│  ├── video_url                       │         │
│  ├── thumbnail_url                   │         │
│  ├── project_type                    │         │
│  ├── project_location                │         │
│  ├── project_duration                │         │
│  ├── project_cost_range              │         │
│  ├── views_count                     │         │
│  ├── likes_count      ◄─ Auto-updated│         │
│  ├── comments_count   ◄─ Auto-updated│         │
│  ├── is_featured                     │         │
│  ├── is_published                    │         │
│  └── created_at, updated_at          │         │
└─────────┬────────────────────────────┘         │
          │ video_id (FK)                        │
          │                                      │
          ├────────────────┬─────────────────────┤
          │                │                     │
          ▼                ▼                     │
┌──────────────────┐  ┌────────────────────┐   │
│   video_likes    │  │  video_comments    │   │
│ ├── id (PK)      │  │ ├── id (PK)        │   │
│ ├── video_id (FK)│  │ ├── video_id (FK)  │───┘
│ ├── user_id (FK) │  │ ├── user_id (FK)   │
│ ├── guest_id     │  │ ├── commenter_name │
│ └── created_at   │  │ ├── commenter_email│
└──────────────────┘  │ ├── comment_text   │
                      │ ├── is_approved    │
                      │ ├── parent_comment_│
                      │ │   id (FK → self) │─┐
                      │ └── created_at     │ │
                      └────────────────────┘ │
                               ▲              │
                               └──────────────┘
                                  (Replies)

          │
          ▼
┌──────────────────────┐
│    video_views       │
│  ├── id (PK)         │
│  ├── video_id (FK)   │───┘
│  ├── user_id (FK)    │
│  ├── guest_id        │
│  ├── watch_duration  │
│  └── viewed_at       │
└──────────────────────┘
```

---

## 🎨 Component Hierarchy

```
Builders.tsx (Page)
│
├── VideoUpload (Professional Builder Tab)
│   ├── Dialog
│   │   ├── Video File Input
│   │   │   └── Video Preview
│   │   ├── Title Input
│   │   ├── Description Textarea
│   │   ├── Project Type Select
│   │   ├── Location Input
│   │   ├── Duration Input
│   │   ├── Budget Range Select
│   │   ├── Progress Bar
│   │   └── Action Buttons
│   │       ├── Cancel
│   │       └── Upload
│   └── Upload Logic
│       ├── Validation
│       ├── Storage Upload
│       └── Database Insert
│
├── BuilderVideoGallery
│   ├── Header
│   │   ├── Title & Count
│   │   └── Filter Buttons
│   ├── Video Grid
│   │   └── Video Cards []
│   │       ├── Video Thumbnail
│   │       │   ├── Play Overlay
│   │       │   ├── Featured Badge
│   │       │   └── Type Badge
│   │       ├── Card Header
│   │       │   ├── Title
│   │       │   └── Description
│   │       ├── Card Content
│   │       │   ├── Builder Info
│   │       │   ├── Project Details
│   │       │   │   ├── Location
│   │       │   │   ├── Duration
│   │       │   │   └── Budget
│   │       │   └── Stats
│   │       │       ├── Views
│   │       │       ├── Likes
│   │       │       └── Comments
│   │       └── Card Footer (if owner)
│   │           ├── Edit Button
│   │           └── Delete Button
│   └── Delete Confirmation Dialog
│
└── VideoPlayer (Modal)
    ├── Video Section (Left)
    │   └── HTML5 Video Player
    │       └── Controls
    │
    └── Info Section (Right)
        ├── Header
        │   ├── Title
        │   ├── Builder Info
        │   │   ├── Avatar
        │   │   └── Name
        │   ├── Project Details
        │   │   ├── Type Badge
        │   │   ├── Location
        │   │   ├── Duration
        │   │   └── Budget
        │   ├── Description
        │   └── Stats & Actions
        │       ├── Views, Likes, Comments
        │       └── Like Button
        │
        ├── Comments List (Scrollable)
        │   └── Comment []
        │       ├── Avatar
        │       ├── Name & Timestamp
        │       ├── Comment Text
        │       ├── Reply Button
        │       └── Replies []
        │           └── Nested Comment
        │
        └── Comment Input
            ├── Textarea
            ├── Guest Fields (if not logged in)
            │   ├── Name Input
            │   └── Email Input
            └── Post Button
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                    │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────┐
│   HOSTING PLATFORM    │  (Vercel / Netlify / Custom)
│   - React SPA         │
│   - Static Assets     │
│   - CDN Distribution  │
└─────────┬─────────────┘
          │
          │ HTTPS Requests
          │
          ▼
┌───────────────────────┐
│   SUPABASE CLOUD      │
│   ┌─────────────────┐ │
│   │  Auth Service   │ │  Authentication
│   └─────────────────┘ │
│   ┌─────────────────┐ │
│   │  PostgreSQL DB  │ │  Video Metadata
│   └─────────────────┘ │
│   ┌─────────────────┐ │
│   │  Storage        │ │  Video Files (CDN)
│   └─────────────────┘ │
│   ┌─────────────────┐ │
│   │  Edge Functions │ │  (Future: processing)
│   └─────────────────┘ │
└───────────────────────┘

Flow:
1. User accesses app → CDN serves static files
2. App loads → Supabase client initializes
3. Upload video → Storage API (multipart)
4. Save metadata → PostgreSQL (via PostgREST)
5. View video → Storage CDN (direct URL)
6. Interact → Database API (RLS enforced)
```

---

## 📈 Scalability Considerations

```
CURRENT CAPACITY:
├── Storage: Unlimited (Supabase Storage)
├── Database: 500MB free tier, unlimited paid
├── Bandwidth: 2GB free tier, unlimited paid
└── Concurrent Users: Unlimited

OPTIMIZATION STRATEGIES:
├── Videos: CDN delivery (automatic via Supabase)
├── Thumbnails: Auto-generate & cache (future)
├── Queries: Indexed columns for filtering
├── Counts: Database triggers (real-time)
└── Pagination: Implemented in queries (future)

SCALING PATH:
1. Start: Free tier (testing)
2. Growth: Pro plan ($25/mo)
3. Scale: Team plan ($599/mo)
4. Enterprise: Custom pricing
```

---

## 🎯 Performance Metrics

```
TARGET PERFORMANCE:
├── Video Upload: < 30s for 100MB file
├── Gallery Load: < 2s for 50 videos
├── Video Player: < 1s to start playback
├── Like Action: < 500ms round-trip
├── Comment Post: < 1s round-trip
└── Page Load: < 3s (first contentful paint)

OPTIMIZATION TECHNIQUES:
├── Lazy loading: Videos load on scroll
├── Thumbnail previews: First frame extraction
├── CDN delivery: Global edge locations
├── Database indexes: Fast filtering
├── Client caching: LocalStorage for likes
└── Optimistic UI: Instant feedback
```

---

This architecture supports:
- ✅ Thousands of videos
- ✅ Millions of views
- ✅ Real-time interactions
- ✅ Global delivery
- ✅ High availability
- ✅ Automatic scaling

**Production Ready!** 🚀















