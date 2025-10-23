// ============================================================================
// COPY THIS ENTIRE SECTION INTO src/pages/Index.tsx
// Replace lines 187-211 with this enhanced version
// ============================================================================

{/* Video Section - Complete Platform Demo with Monitoring */}
<section className="py-16 bg-gradient-to-br from-slate-50 to-slate-100">
  <div className="container mx-auto px-4">
    <AnimatedSection animation="fadeInUp">
      <div className="text-center mb-12">
        {/* NEW Badge */}
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1 text-sm font-semibold">
          🚁 NEW: Real-Time Site Monitoring
        </Badge>
        
        {/* Main Heading */}
        <h2 className="text-4xl font-bold text-foreground mb-4">
          See UjenziPro's Complete Platform in Action
        </h2>
        
        {/* Description with Monitoring Emphasis */}
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Watch our comprehensive demo featuring{' '}
          <span className="font-semibold text-primary">
            real-time construction site monitoring with drones and cameras
          </span>
          , builder directory, supplier network, QR material tracking, and secure M-Pesa payments 
          across all 47 counties.
        </p>
        
        {/* Video Metadata */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="text-base">⏱️</span>
            <span>5-6 minutes</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-base">📹</span>
            <span>Full HD</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <span>All Features</span>
          </span>
        </div>
      </div>
    </AnimatedSection>
    
    {/* Video Player */}
    <div className="max-w-5xl mx-auto">
      
      {/* ============================================================ */}
      {/* OPTION 1: Steve.ai Integration (Recommended) */}
      {/* Replace YOUR_STEVE_AI_SHARE_URL_HERE with your actual URL */}
      {/* ============================================================ */}
      <VideoSection 
        steveAiUrl="YOUR_STEVE_AI_SHARE_URL_HERE"
        useSteveAi={true}
        thumbnail="/ujenzipro-demo-thumbnail.svg"
        title="UjenziPro Complete Platform Demo with Monitoring"
        description="Real-time site monitoring, builder network, supplier marketplace, QR tracking, and more"
      />
      
      {/* ============================================================ */}
      {/* OPTION 2: YouTube Integration (Best for SEO) */}
      {/* Uncomment below and replace YOUR_YOUTUBE_VIDEO_ID */}
      {/* ============================================================ */}
      {/* 
      <VideoSection 
        videoId="YOUR_YOUTUBE_VIDEO_ID"
        useYouTube={true}
        thumbnail="/ujenzipro-demo-thumbnail.svg"
        title="UjenziPro Complete Platform Demo with Monitoring"
        description="Real-time site monitoring, builder network, supplier marketplace, QR tracking, and more"
      />
      */}
      
      {/* ============================================================ */}
      {/* OPTION 3: Self-Hosted Video (Full Control) */}
      {/* Uncomment below and place video file in public folder */}
      {/* ============================================================ */}
      {/* 
      <VideoSection 
        videoUrl="/ujenzipro-demo-video.mp4"
        useYouTube={false}
        useSynthesia={false}
        useSteveAi={false}
        thumbnail="/ujenzipro-demo-thumbnail.svg"
        title="UjenziPro Complete Platform Demo with Monitoring"
        description="Real-time site monitoring, builder network, supplier marketplace, QR tracking, and more"
      />
      */}
      
      {/* Key Features Grid - Shows what's covered in video */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Feature 1: Live Monitoring */}
        <div className="text-center p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default">
          <div className="text-3xl mb-2">🚁</div>
          <div className="font-semibold text-sm text-foreground">Live Monitoring</div>
          <div className="text-xs text-muted-foreground mt-1">Drones & Cameras</div>
        </div>
        
        {/* Feature 2: Builders */}
        <div className="text-center p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default">
          <div className="text-3xl mb-2">👷</div>
          <div className="font-semibold text-sm text-foreground">2,500+ Builders</div>
          <div className="text-xs text-muted-foreground mt-1">Verified Professionals</div>
        </div>
        
        {/* Feature 3: Suppliers */}
        <div className="text-center p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default">
          <div className="text-3xl mb-2">🏪</div>
          <div className="font-semibold text-sm text-foreground">850+ Suppliers</div>
          <div className="text-xs text-muted-foreground mt-1">Quality Materials</div>
        </div>
        
        {/* Feature 4: QR Tracking */}
        <div className="text-center p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default">
          <div className="text-3xl mb-2">📦</div>
          <div className="font-semibold text-sm text-foreground">QR Tracking</div>
          <div className="text-xs text-muted-foreground mt-1">Full Traceability</div>
        </div>
        
      </div>
      
      {/* Additional Benefits Callout */}
      <div className="mt-8 bg-gradient-to-r from-primary/5 to-kenyan-green/5 rounded-lg p-6 border border-primary/10">
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground mb-3">
            Everything You Need in One Platform
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2">
              <span className="text-kenyan-green">✓</span>
              <span>M-Pesa Payments</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-kenyan-green">✓</span>
              <span>47 Counties</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-kenyan-green">✓</span>
              <span>KEBS Verified</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-kenyan-green">✓</span>
              <span>Real-time Alerts</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-kenyan-green">✓</span>
              <span>GPS Delivery</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-kenyan-green">✓</span>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</section>

// ============================================================================
// INSTRUCTIONS:
// 1. Copy everything above (lines 7-163)
// 2. Open src/pages/Index.tsx
// 3. Find the "Video Section" around line 187-211
// 4. Replace that entire section with this code
// 5. Choose one of the 3 VideoSection options (Steve.ai, YouTube, or Self-hosted)
// 6. Replace placeholder URLs with your actual video URL
// 7. Save and test!
// ============================================================================

// ============================================================================
// WHAT THIS GIVES YOU:
// ✅ Professional "NEW" badge highlighting monitoring features
// ✅ Comprehensive description emphasizing all features
// ✅ Video metadata (duration, quality, coverage)
// ✅ Support for 3 video hosting options (Steve.ai, YouTube, Self-hosted)
// ✅ Feature cards showing what's covered
// ✅ Benefits callout below video
// ✅ Smooth hover animations
// ✅ Fully responsive design
// ✅ Matches your brand colors
// ============================================================================




