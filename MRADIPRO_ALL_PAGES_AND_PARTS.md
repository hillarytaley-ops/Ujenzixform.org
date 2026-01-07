# 📄 MradiPro - Complete List of All Pages and Parts

**Comprehensive directory of every page and component in the application**

---

## 🗺️ COMPLETE PAGE STRUCTURE

### **PUBLIC PAGES (Accessible to Everyone)**

#### **1. Landing/Auth Pages:**

| # | Page Name | URL | Purpose |
|---|-----------|-----|---------|
| 1 | **Auth Page** | `/` or `/auth` | Landing page - Sign In / Sign Up |
| 2 | **Reset Password** | `/reset-password` | Password recovery |
| 3 | **Admin Login** | `/admin-login` | Admin authentication |

---

#### **2. Main Application Pages:**

| # | Page Name | URL | Purpose |
|---|-----------|-----|---------|
| 4 | **Homepage** | `/home` | Main dashboard after login |
| 5 | **Suppliers Marketplace** | `/suppliers` | Browse and purchase from suppliers |
| 6 | **Suppliers Mobile** | `/suppliers-mobile` | Mobile-optimized supplier page |
| 7 | **Builders Directory** | `/builders` | Browse professional builders |
| 8 | **About** | `/about` | About MradiPro |
| 9 | **Contact** | `/contact` | Contact form |
| 10 | **Monitoring** | `/monitoring` | Live construction site cameras |
| 11 | **Tracking** | `/tracking` | Real-time delivery GPS tracking |
| 12 | **Delivery** | `/delivery` | Request and manage deliveries |
| 13 | **Scanners** | `/scanners` | QR code & barcode scanning |
| 14 | **Feedback** | `/feedback` | Submit feedback and reviews |

---

#### **3. Registration Pages:**

| # | Page Name | URL | Purpose |
|---|-----------|-----|---------|
| 15 | **Builder Registration** | `/builder-registration` | Register as builder |
| 16 | **Builder Registration Alt** | `/builders/register` | Alternative builder signup |
| 17 | **Professional Builder** | `/professional-builder-registration` | Professional builder signup |
| 18 | **Private Client** | `/private-client-registration` | Private client signup |
| 19 | **Delivery Provider** | `/delivery/apply` | Apply as delivery driver |

---

#### **4. Protected Pages (Login Required):**

| # | Page Name | URL | Purpose |
|---|-----------|-----|---------|
| 20 | **Builder Portal** | `/portal` | Builder dashboard |
| 21 | **Analytics** | `/analytics` | ML analytics dashboard (Admin) |
| 22 | **Not Found** | `*` (any invalid URL) | 404 error page |

---

## 🧩 MAJOR COMPONENTS & SECTIONS

### **NAVIGATION COMPONENTS:**

```
1. Navigation Bar (Top)
   ├─ Logo (circular, clickable)
   ├─ Menu Items (Home, Builders, Suppliers, etc.)
   ├─ Help Button (User Guide)
   ├─ Sign In/Sign Up Buttons (if not logged in)
   └─ User Menu (if logged in)
       ├─ Welcome message
       └─ Sign Out button

2. Mobile Navigation
   ├─ Logo
   ├─ Hamburger Menu (☰)
   └─ Full-screen Menu Overlay
       ├─ All navigation links
       ├─ Sign In/Sign Up
       └─ Close button (×)

3. Footer (Bottom)
   ├─ Company Info
   ├─ Quick Links
   ├─ Contact Information
   ├─ Social Media Links
   └─ Copyright Notice
```

---

### **HOMEPAGE SECTIONS:**

```
Homepage (/home):
═════════════════

1. Hero Section
   ├─ Main headline
   ├─ Subheading
   ├─ CTA buttons (Get Started, Browse Suppliers)
   └─ Background image

2. Features Section
   ├─ Feature cards (4-6 cards)
   ├─ Icons
   ├─ Descriptions
   └─ Benefits

3. How It Works
   ├─ Step-by-step process
   ├─ Visual guides
   └─ Instructions

4. Statistics
   ├─ Total suppliers
   ├─ Total builders
   ├─ Materials available
   └─ Successful deliveries

5. Testimonials
   ├─ Customer quotes
   ├─ Ratings
   ├─ Photos
   └─ Names

6. Call to Action
   ├─ Sign up prompt
   ├─ CTA button
   └─ Benefits list

7. Footer
   └─ Site-wide footer
```

---

### **AUTH PAGE SECTIONS:**

```
Auth Page (/ or /auth):
════════════════════════

1. Hero Section
   ├─ Welcome message
   ├─ Platform benefits
   └─ Background image

2. Authentication Tabs
   ├─ SIGN UP Tab
   │   ├─ Email field
   │   ├─ Password field
   │   ├─ Confirm password
   │   ├─ Terms checkbox
   │   └─ Sign Up button
   │
   └─ SIGN IN Tab
       ├─ Email field
       ├─ Password field
       ├─ Remember me
       ├─ Forgot password link
       └─ Sign In button

3. OAuth Options
   ├─ Sign in with Google
   └─ Sign in with GitHub

4. Additional Links
   ├─ Admin login link
   └─ Terms & Privacy links
```

---

### **SUPPLIERS PAGE SECTIONS:**

```
Suppliers Page (/suppliers):
════════════════════════════

1. Hero Section
   ├─ Page title
   ├─ Search bar
   └─ Background image

2. Filter Sidebar
   ├─ County filter (47 counties)
   ├─ Material type filter
   ├─ Price range slider
   ├─ Rating filter (⭐⭐⭐⭐⭐)
   └─ Clear filters button

3. Supplier Grid
   ├─ Supplier cards (grid layout)
   │   ├─ Company logo
   │   ├─ Company name
   │   ├─ Rating (stars)
   │   ├─ Location (county)
   │   ├─ Materials offered
   │   ├─ Verified badge
   │   └─ "View More" button
   │
   └─ Pagination

4. Supplier Detail (on click)
   ├─ Full company profile
   ├─ Product catalog
   ├─ Contact information
   ├─ Reviews & ratings
   ├─ Add to cart functionality
   └─ Place order button
```

---

### **BUILDERS PAGE SECTIONS:**

```
Builders Page (/builders):
══════════════════════════

1. Hero Section
   ├─ Page title
   ├─ Search functionality
   └─ Background image

2. Builder Directory
   ├─ Filter options
   │   ├─ Specialization
   │   ├─ County/Location
   │   ├─ Rating
   │   └─ Availability
   │
   └─ Builder Grid
       ├─ Builder cards
       │   ├─ Profile photo
       │   ├─ Name/Company
       │   ├─ Specialization
       │   ├─ Location
       │   ├─ Rating
       │   ├─ Years of experience
       │   └─ Contact button
       │
       └─ Pagination

3. Registration CTA
   ├─ "Register as Builder" button
   └─ Benefits list

4. Builder Profile Modal
   ├─ Full profile details
   ├─ Portfolio
   ├─ Completed projects
   ├─ Reviews
   ├─ Certifications
   └─ Contact form
```

---

### **DELIVERY PAGE SECTIONS:**

```
Delivery Page (/delivery):
══════════════════════════

1. Hero Section
   └─ Page title & description

2. Tabs Navigation
   ├─ Request Delivery
   ├─ Active Deliveries
   ├─ Bulk Delivery
   ├─ Analytics
   ├─ Security
   └─ History

3. Request Delivery Tab
   ├─ Delivery Form
   │   ├─ Material type
   │   ├─ Quantity
   │   ├─ Pickup address
   │   ├─ Delivery address
   │   ├─ Contact info
   │   ├─ Preferred date/time
   │   └─ Special instructions
   │
   └─ Submit button

4. Active Deliveries Tab
   ├─ Delivery cards list
   │   ├─ Order number
   │   ├─ Status badge
   │   ├─ Driver info
   │   ├─ ETA
   │   ├─ Progress bar
   │   └─ Track button
   │
   └─ Refresh button

5. History Tab
   ├─ Past deliveries
   ├─ Filter by date
   └─ Export option
```

---

### **TRACKING PAGE SECTIONS:**

```
Tracking Page (/tracking):
═══════════════════════════

1. Hero Section
   └─ Page title with icon

2. Delivery Tracker Component
   ├─ Live Map
   │   ├─ Driver location marker
   │   ├─ Route line
   │   ├─ Destination marker
   │   └─ Distance/ETA info
   │
   ├─ Delivery Details Card
   │   ├─ Order number
   │   ├─ Driver name & photo
   │   ├─ Driver phone
   │   ├─ Vehicle details
   │   ├─ Status timeline
   │   └─ ETA countdown
   │
   └─ Actions
       ├─ Call driver
       ├─ Message driver
       └─ Share tracking link

3. Delivery Stats (Admin/Builder only)
   ├─ Total deliveries
   ├─ Pending count
   ├─ In transit count
   └─ Completed count

4. Delivery Table (Admin/Builder only)
   ├─ Sortable columns
   ├─ Status filters
   ├─ Search function
   └─ View details button

5. App Tracking Monitor (Admin only)
   └─ Security monitoring dashboard
```

---

### **MONITORING PAGE SECTIONS:**

```
Monitoring Page (/monitoring):
═══════════════════════════════

1. Hero Section
   └─ Page title

2. Camera List (Left Sidebar)
   ├─ Camera cards
   │   ├─ Camera name
   │   ├─ Project site
   │   ├─ Location
   │   ├─ Status (Live/Offline)
   │   ├─ Signal strength
   │   └─ Select button
   │
   └─ Add Camera button

3. Main Video Feed (Center/Right)
   ├─ Live video stream
   ├─ Camera title
   ├─ Recording indicator
   └─ Video controls
       ├─ Play/Pause
       ├─ Screenshot
       ├─ Zoom In/Out
       ├─ Fullscreen
       └─ PTZ controls (if supported)

4. AI Detection Overlay (if enabled)
   ├─ Detected materials list
   ├─ Confidence scores
   └─ Real-time updates

5. Camera Management
   ├─ Add new camera
   ├─ Edit settings
   └─ Remove camera
```

---

### **SCANNERS PAGE SECTIONS:**

```
Scanners Page (/scanners):
═══════════════════════════

1. Scanner Mode Selection
   ├─ Dispatch Scanner (Suppliers)
   ├─ Receiving Scanner (Builders)
   └─ General QR Scanner

2. Camera View
   ├─ Live camera feed
   ├─ Scan frame overlay
   ├─ Targeting guide
   └─ Camera controls
       ├─ Switch camera
       └─ Toggle flash

3. Scan Results
   ├─ QR code data
   ├─ Material information
   ├─ Quantity
   ├─ Order details
   └─ Actions
       ├─ Mark as dispatched
       ├─ Mark as received
       └─ View full details

4. Recent Scans List
   ├─ Scan history (last 10)
   ├─ Timestamps
   └─ Material names

5. Manual Entry Option
   ├─ Type QR code manually
   └─ Submit button
```

---

### **FEEDBACK PAGE SECTIONS:**

```
Feedback Page (/feedback):
═══════════════════════════

1. Hero Section
   ├─ Page title
   ├─ Description
   └─ Background image

2. Why Feedback Matters Section
   ├─ Importance explanation
   └─ Impact description

3. Feedback Form
   ├─ Name field (optional)
   ├─ Email field (required)
   ├─ Category dropdown
   │   ├─ Feature Request
   │   ├─ Bug Report
   │   ├─ General Feedback
   │   ├─ Complaint
   │   └─ Compliment
   ├─ Subject field
   ├─ Message textarea
   ├─ Rating (1-5 stars)
   ├─ GDPR consent checkbox
   ├─ Honeypot field (hidden - spam detection)
   └─ Submit button

4. Security Indicator
   ├─ Security score display
   └─ Safe submission badge

5. Previous Feedback (if logged in)
   ├─ Your submitted feedback list
   └─ Status tracking
```

---

### **ANALYTICS PAGE SECTIONS:**

```
Analytics Page (/analytics) - Admin Only:
═════════════════════════════════════════

1. Dashboard Overview
   ├─ Key Metrics Cards
   │   ├─ Total Revenue
   │   ├─ Total Orders
   │   ├─ Active Users
   │   └─ Conversion Rate
   │
   └─ Time period selector

2. Charts Section
   ├─ Revenue Chart (Line chart)
   ├─ Orders by Category (Pie chart)
   ├─ User Growth (Area chart)
   └─ Delivery Performance (Bar chart)

3. ML Analytics
   ├─ Material Usage Predictions
   ├─ Trend Analysis
   ├─ Cost Forecasting
   ├─ Efficiency Scoring
   └─ Smart Recommendations

4. Data Tables
   ├─ Top Products
   ├─ Recent Orders
   ├─ Best Suppliers
   └─ Active Deliveries

5. Export Options
   ├─ Download PDF report
   ├─ Export to CSV
   └─ Schedule reports
```

---

## 🧩 MAJOR UI COMPONENTS

### **REUSABLE COMPONENTS:**

#### **1. Navigation Components:**

```
Components:
├─ Navigation.tsx - Main navigation bar
├─ Footer.tsx - Site footer
├─ MradiProLogo - Logo component
└─ UserAvatar - User profile picture
```

#### **2. Card Components:**

```
UI Cards:
├─ Card - Base card component
├─ SupplierCard - Supplier listing card
├─ BuilderCard - Builder profile card
├─ DeliveryCard - Delivery status card
├─ MaterialCard - Material/product card
└─ StatsCard - Statistics display card
```

#### **3. Form Components:**

```
Forms:
├─ Input - Text input fields
├─ Textarea - Multi-line text
├─ Select - Dropdown selector
├─ Checkbox - Checkboxes
├─ Radio - Radio buttons
├─ DatePicker - Date selection
├─ FileUpload - File/image upload
└─ SecurePhoneInput - Phone number (Kenyan format)
```

#### **4. Modal/Dialog Components:**

```
Modals:
├─ Dialog - Generic modal
├─ AlertDialog - Confirmation dialogs
├─ ContactBuilderModal - Contact builder form
├─ BuilderProfileModal - Builder details
├─ OrderSummaryModal - Order review
└─ DeliveryDetailsModal - Delivery information
```

#### **5. Data Display Components:**

```
Data Display:
├─ Table - Data tables
├─ Badge - Status badges
├─ Progress - Progress bars
├─ Chart - Analytics charts
├─ Accordion - Expandable sections
├─ Tabs - Tabbed interface
└─ Pagination - Page navigation
```

---

## 📱 PAGE-SPECIFIC SECTIONS

### **SUPPLIERS PAGE - Detailed Breakdown:**

```
Suppliers Page Components:
══════════════════════════

1. Hero Banner
   ├─ Title: "Suppliers Marketplace"
   ├─ Subtitle
   ├─ Search bar (prominent)
   └─ Background gradient

2. Filter Panel (Left Sidebar)
   ├─ Material Type Filter
   │   ├─ Cement
   │   ├─ Steel
   │   ├─ Sand
   │   ├─ Timber
   │   └─ ... (12+ categories)
   │
   ├─ County Filter
   │   ├─ Nairobi
   │   ├─ Mombasa
   │   ├─ Kisumu
   │   └─ ... (all 47 counties)
   │
   ├─ Price Range
   │   └─ Slider (KES 0 - 1,000,000)
   │
   ├─ Rating Filter
   │   ├─ 5 stars
   │   ├─ 4 stars & up
   │   ├─ 3 stars & up
   │   └─ All ratings
   │
   └─ [Clear All Filters] button

3. Supplier Grid (Main Area)
   ├─ Sort Options
   │   ├─ Price: Low to High
   │   ├─ Price: High to Low
   │   ├─ Rating: High to Low
   │   ├─ Name: A-Z
   │   └─ Newest First
   │
   ├─ Results Count
   │   └─ "Showing 24 of 156 suppliers"
   │
   ├─ Supplier Cards (Grid)
   │   Each card shows:
   │   ├─ Logo/Image
   │   ├─ Company Name
   │   ├─ Rating (⭐⭐⭐⭐⭐ 4.8/5)
   │   ├─ Location
   │   ├─ Verified badge (if applicable)
   │   ├─ Materials offered (badges)
   │   ├─ Price range
   │   └─ [View Products] button
   │
   └─ Pagination
       ├─ Previous button
       ├─ Page numbers
       └─ Next button

4. Quick Actions (Floating)
   ├─ Cart button (shows count)
   ├─ Favorites/Saved
   └─ Filter toggle (mobile)
```

---

### **DELIVERY PAGE - Detailed Breakdown:**

```
Delivery Page Components:
══════════════════════════

1. Hero Section
   └─ Page title with delivery truck icon

2. Tab Navigation
   ├─ Request (Create new delivery)
   ├─ Active (Current deliveries)
   ├─ Bulk (Multiple deliveries)
   ├─ Analytics (Delivery stats)
   ├─ Security (Access monitoring)
   └─ History (Past deliveries)

3. Request Delivery Form
   ├─ Material Selection
   │   ├─ Material type dropdown
   │   └─ Quantity input + unit
   │
   ├─ Pickup Information
   │   ├─ Address input
   │   ├─ Contact name
   │   └─ Phone number
   │
   ├─ Delivery Information
   │   ├─ Delivery address
   │   ├─ Contact person
   │   ├─ Phone number
   │   ├─ Preferred date
   │   ├─ Preferred time slot
   │   └─ Special instructions
   │
   ├─ Urgency Level
   │   ├─ ○ Standard
   │   ├─ ○ Urgent
   │   └─ ○ Emergency
   │
   └─ [Submit Request] button

4. Active Deliveries List
   ├─ Delivery Cards
   │   Each shows:
   │   ├─ Order number (PO-2024-XXX)
   │   ├─ Status badge (In Transit, Pending, etc.)
   │   ├─ Material type & quantity
   │   ├─ Pickup location
   │   ├─ Delivery location
   │   ├─ Driver name & phone
   │   ├─ ETA or completion time
   │   ├─ Progress bar
   │   └─ [Track Delivery] button
   │
   └─ Filter by status

5. Analytics Dashboard
   ├─ Delivery statistics
   ├─ Performance metrics
   └─ Cost analysis
```

---

### **TRACKING PAGE - Detailed Breakdown:**

```
Tracking Page Components:
══════════════════════════

1. Hero Section
   └─ "Delivery Tracking" title

2. Main Tracker
   ├─ Live Map Component
   │   ├─ Google Maps/Mapbox
   │   ├─ Driver marker (current location)
   │   ├─ Route polyline
   │   ├─ Destination marker
   │   └─ Distance label
   │
   ├─ Delivery Info Panel
   │   ├─ Order number
   │   ├─ Driver details
   │   │   ├─ Name
   │   │   ├─ Photo
   │   │   ├─ Phone (call button)
   │   │   └─ Vehicle registration
   │   │
   │   ├─ Status Timeline
   │   │   ├─ ✓ Order Placed
   │   │   ├─ ✓ Order Confirmed
   │   │   ├─ ✓ Items Ready
   │   │   ├─ ● In Transit (current)
   │   │   └─ ○ Delivered
   │   │
   │   ├─ ETA Information
   │   │   ├─ Estimated arrival
   │   │   ├─ Distance remaining
   │   │   └─ Current speed
   │   │
   │   └─ Quick Actions
   │       ├─ Call driver
   │       ├─ Message driver
   │       └─ Share location
   │
   └─ Items Being Delivered
       ├─ Item list with quantities
       └─ Total value

3. Delivery Stats (Admin/Builder)
   ├─ Total deliveries counter
   ├─ Pending counter
   ├─ In transit counter
   └─ Completed counter

4. Delivery Table (Admin/Builder)
   ├─ All deliveries list
   ├─ Sortable columns
   ├─ Status filters
   └─ Action buttons
```

---

### **MONITORING PAGE - Detailed Breakdown:**

```
Monitoring Page Components:
════════════════════════════

1. Hero Section
   └─ "Live Site Monitoring" title

2. Camera List (Left Panel)
   ├─ Filter by site
   ├─ Filter by type
   └─ Camera Cards
       Each shows:
       ├─ Camera icon (📷 or 🚁 for drone)
       ├─ Camera name
       ├─ Project site
       ├─ Location
       ├─ Status (● Live or ● Offline)
       ├─ Signal strength bars
       ├─ Recording status
       ├─ Viewer count
       └─ [Select] button

3. Video Player (Main Area)
   ├─ Video Feed Display
   │   ├─ Live stream or "No feed"
   │   ├─ Camera name overlay
   │   └─ Recording indicator
   │
   ├─ Video Controls (Bottom)
   │   ├─ Play/Pause
   │   ├─ Zoom controls
   │   ├─ Screenshot
   │   ├─ Fullscreen
   │   ├─ Volume
   │   └─ PTZ controls (Pan/Tilt/Zoom)
   │
   └─ AI Detection Panel (Optional)
       ├─ Detected materials
       ├─ Confidence scores
       └─ Auto-update status

4. Camera Settings Panel
   ├─ Camera name
   ├─ Connection URL
   ├─ Resolution
   ├─ Frame rate
   ├─ Recording schedule
   └─ AI detection toggle
```

---

### **SCANNERS PAGE - Detailed Breakdown:**

```
Scanners Page Components:
══════════════════════════

1. Scanner Selection
   ├─ Dispatch Scanner (for suppliers)
   ├─ Receiving Scanner (for builders)
   └─ General Scanner (for anyone)

2. Camera Scanner
   ├─ Live camera view
   ├─ Scan area frame
   ├─ Alignment guide
   ├─ Camera controls
   │   ├─ Switch front/back
   │   └─ Toggle flashlight
   │
   └─ Permissions request

3. Scan Result Display
   ├─ QR code content
   ├─ Material identified
   ├─ AI confidence score
   ├─ Material details
   │   ├─ Type
   │   ├─ Quantity
   │   ├─ Order number
   │   └─ Batch/Lot number
   │
   └─ Quality Assessment
       ├─ Condition rating
       ├─ Quality score
       └─ Recommendations

4. Actions Panel
   ├─ Mark as Dispatched (suppliers)
   ├─ Mark as Received (builders)
   ├─ Add notes
   ├─ Take photo
   └─ Generate report

5. Scan History
   ├─ Recent scans (last 10)
   ├─ Material names
   ├─ Timestamps
   └─ Status indicators
```

---

## 🎨 UI SECTIONS BY CATEGORY

### **HEADER/NAVIGATION PARTS:**

```
1. Logo Area
   ├─ MradiPro logo (circular frame)
   └─ Clickable → /home

2. Main Menu (Desktop)
   ├─ Home link
   ├─ Builders link
   ├─ Suppliers link
   ├─ Delivery link
   ├─ Scanners link
   ├─ Tracking link
   ├─ Monitoring link
   ├─ About link
   ├─ Contact link
   └─ Feedback link

3. User Actions
   ├─ Help button (user guide)
   ├─ Theme toggle (light/dark)
   ├─ Language toggle (if enabled)
   └─ User menu
       ├─ Welcome, {email}
       └─ Sign Out

4. Mobile Menu
   ├─ Hamburger icon (☰)
   └─ Slide-out menu
       ├─ All navigation links
       ├─ User info
       └─ Close button (×)
```

---

### **FOOTER PARTS:**

```
Footer Sections:
════════════════

1. Company Info Column
   ├─ MradiPro logo
   ├─ Tagline
   ├─ Brief description
   └─ Social media links

2. Quick Links Column
   ├─ Home
   ├─ About
   ├─ Suppliers
   ├─ Builders
   └─ Contact

3. Services Column
   ├─ Material Supply
   ├─ Delivery Tracking
   ├─ Site Monitoring
   └─ Builder Directory

4. Legal Column
   ├─ Privacy Policy
   ├─ Terms of Service
   ├─ Cookie Policy
   └─ Disclaimer

5. Contact Column
   ├─ Email address
   ├─ Phone number
   ├─ Physical address
   └─ Business hours

6. Bottom Bar
   ├─ Copyright notice
   ├─ Version number
   └─ "Made in Kenya 🇰🇪"
```

---

## 📋 COMPLETE PAGE COUNT

### **Total Pages: 22**

**Public Pages:** 14
- Auth (landing)
- Home
- Suppliers (2 versions)
- Builders
- About
- Contact
- Monitoring
- Tracking
- Delivery
- Scanners
- Feedback
- Reset Password
- Admin Login

**Protected Pages:** 8
- Builder Portal
- Builder Registration (3 variations)
- Professional Builder Registration
- Private Client Registration
- Analytics
- Delivery Provider Application

**Total Unique URLs:** 22+

---

## 🗂️ COMPONENT COUNT

### **By Category:**

```
UI Components:              57 components
Page Components:            22 pages
Builder Components:         30 components
Supplier Components:        15 components
Delivery Components:        20 components
Security Components:        12 components
Chat Components:            5 components
QR/Scanner Components:      8 components
Analytics Components:       10 components

Total Components:           ~179 components
```

---

## 🎯 QUICK REFERENCE

### **Main Pages:**

| Page | URL | Public/Protected |
|------|-----|------------------|
| Auth | `/` or `/auth` | ✅ Public |
| Home | `/home` | ✅ Public |
| Suppliers | `/suppliers` | ✅ Public |
| Builders | `/builders` | ✅ Public |
| Delivery | `/delivery` | ✅ Public |
| Tracking | `/tracking` | ✅ Public |
| Monitoring | `/monitoring` | ✅ Public |
| Scanners | `/scanners` | ✅ Public |
| Feedback | `/feedback` | ✅ Public |
| Analytics | `/analytics` | 🔒 Protected |
| Portal | `/portal` | 🔒 Protected |

---

**📄 Complete page and component listing created!**

---

*Documentation Date: November 23, 2025*  
*Total Pages: 22*  
*Total Components: ~179*  
*Status: Fully Documented ✅*
















