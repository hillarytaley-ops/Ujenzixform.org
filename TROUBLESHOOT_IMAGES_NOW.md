# TROUBLESHOOT: Images Not Showing - Step by Step

## GOOD NEWS!
The code already has logo URLs defined in DEMO_SUPPLIERS! Let's find out why they're not displaying.

## Quick Diagnostic Steps

### Step 1: Check Which Suppliers Are Showing

1. Go to `/suppliers` page
2. Look at the page - do you see ANY supplier names?
3. Are you seeing "Sample Data" or trying to load from database?

### Step 2: Open Browser Console

**Press F12** (or right-click → Inspect)

Look for errors in the Console tab. Common errors:

```
❌ CORS error
❌ Failed to load image
❌ 404 Not Found
❌ Network request failed
❌ ui-avatars.com blocked
```

### Step 3: Check Network Tab

1. Press F12
2. Click "Network" tab
3. Filter by "Img"
4. Refresh page (Ctrl + R)
5. Do you see requests to `ui-avatars.com`?

**If YES but failed:**
- Check status code (should be 200)
- If 0 or failed → CORS/Network issue

**If NO requests:**
- Logos URLs are not being rendered
- Check component rendering

---

## Test Logo URLs Directly

### Try These URLs in Your Browser:

1. **Bamburi Cement (Blue):**
```
https://ui-avatars.com/api/?name=Bamburi+Cement&background=0D8ABC&color=fff&size=128&bold=true
```

2. **Devki Steel (Red):**
```
https://ui-avatars.com/api/?name=Devki+Steel&background=DC2626&color=fff&size=128&bold=true
```

3. **Crown Paints (Yellow):**
```
https://ui-avatars.com/api/?name=Crown+Paints&background=EAB308&color=000&size=128&bold=true
```

**Copy each URL and paste in browser address bar.**

✅ If you see colorful logos → URLs work, problem is in code
❌ If you see nothing → Network/firewall blocking ui-avatars.com

---

## Common Causes & Fixes

### Cause 1: Content Security Policy (CSP) Blocking

**Check console for:**
```
Refused to load image from 'https://ui-avatars.com' because it violates CSP
```

**FIX:** Add to `index.html` in `<head>`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               img-src 'self' data: https: http:; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval';">
```

### Cause 2: Ad Blocker or Firewall

**Symptoms:**
- Network requests to ui-avatars.com blocked
- Status code: 0 or "blocked"

**FIX:**
- Disable ad blocker for localhost
- Try incognito mode
- Check company firewall settings

### Cause 3: Avatar Component Not Rendering

**Check in browser console:**
```javascript
// Run this in console
const avatars = document.querySelectorAll('[class*="avatar"]');
console.log('Found avatars:', avatars.length);
console.log('Avatar elements:', avatars);
```

**If 0 avatars found:**
- Component not rendering
- Check React errors

### Cause 4: Logo URL is Undefined

**Check in browser console:**
```javascript
// Check if suppliers have logo URLs
const supplierElements = document.querySelectorAll('[class*="supplier"], [class*="card"]');
console.log('Supplier cards:', supplierElements.length);
```

---

## React DevTools Check

### Install React DevTools (if not installed):
Chrome/Edge: Search "React Developer Tools" in store

### Use React DevTools:
1. Press F12
2. Click "Components" tab (React icon)
3. Find `SupplierGrid` component
4. Check state:
   - `supplierSource` → should be "sample"
   - Check `demoSuppliers` array
   - Each should have `company_logo_url`

---

## Manual Code Check

### Check SupplierCard Component

1. Open `src/components/suppliers/SupplierCard.tsx`
2. Look for Avatar component:

```tsx
<Avatar className="h-16 w-16">
  <AvatarImage 
    src={supplier.company_logo_url}  // ← Should have URL
    alt={supplier.company_name} 
  />
  <AvatarFallback>
    {initials}  // ← Shows if image fails
  </AvatarFallback>
</Avatar>
```

### Debug in Console:
```javascript
// Check what's being rendered
const imgs = document.querySelectorAll('img');
imgs.forEach(img => {
  console.log('Image src:', img.src);
  console.log('Image complete:', img.complete);
  console.log('Image error:', img.naturalWidth === 0);
});
```

---

## Force Display Sample Suppliers

### Make Sure You're on "Sample Data" Tab

On `/suppliers` page:
1. Look for data source toggle
2. Make sure "Sample Data" or "Demo" is selected
3. NOT "Registered Suppliers"

If using registered suppliers and none exist → no logos because no data!

---

## Emergency Fix: Add CSP Meta Tag

Create or update `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/ujenzipro-favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- ADD THIS LINE -->
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'self'; 
                   img-src 'self' data: https: http: blob:; 
                   script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
                   style-src 'self' 'unsafe-inline';">
    
    <title>UjenziPro</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Test With Simple Image

### Add this to suppliers page temporarily:

```tsx
// Add this at the top of SupplierGrid return statement for testing
<div style={{ padding: '20px', background: 'yellow' }}>
  <h3>Image Test</h3>
  <img 
    src="https://ui-avatars.com/api/?name=Test&background=0D8ABC&color=fff&size=128" 
    alt="test" 
    style={{ width: '64px', height: '64px' }}
  />
  <p>If you see a blue circle with "T", images work!</p>
</div>
```

---

## Check Demo Suppliers Constant

Verify DEMO_SUPPLIERS in `src/components/suppliers/SupplierGrid.tsx`:

```tsx
const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: "demo-1",
    company_name: "Bamburi Cement",
    company_logo_url: "https://ui-avatars.com/api/?name=Bamburi+Cement&background=0D8ABC&color=fff&size=128&bold=true",
    // ... more fields
  },
  // ... more suppliers
];
```

**Check:**
- ✅ company_logo_url exists?
- ✅ URLs are valid HTTPS?
- ✅ No typos in URLs?

---

## Nuclear Option: Force Sample Data

In `src/components/suppliers/SupplierGrid.tsx`, line ~187:

```tsx
// CHANGE THIS LINE:
const [supplierSource, setSupplierSource] = useState<SupplierSource>("sample");

// MAKE SURE IT'S "sample" NOT "registered"
```

Then refresh page with Ctrl + F5

---

## Create Test Page

Create `src/pages/ImageTest.tsx`:

```tsx
const ImageTest = () => {
  return (
    <div style={{ padding: '40px' }}>
      <h1>Image Test Page</h1>
      
      <h2>Direct Image Tags:</h2>
      <img 
        src="https://ui-avatars.com/api/?name=Bamburi+Cement&background=0D8ABC&color=fff&size=128&bold=true" 
        alt="Bamburi"
        style={{ width: '128px', height: '128px', margin: '10px' }}
      />
      <img 
        src="https://ui-avatars.com/api/?name=Devki+Steel&background=DC2626&color=fff&size=128&bold=true" 
        alt="Devki"
        style={{ width: '128px', height: '128px', margin: '10px' }}
      />
      
      <h2>Avatar Component:</h2>
      <Avatar className="h-32 w-32">
        <AvatarImage 
          src="https://ui-avatars.com/api/?name=Test&background=0D8ABC&color=fff&size=128" 
        />
        <AvatarFallback>TC</AvatarFallback>
      </Avatar>
      
      <p>If you see images above, the problem is specific to SupplierCard component.</p>
      <p>If you don't see images, it's a network/CSP issue.</p>
    </div>
  );
};

export default ImageTest;
```

Add route in `App.tsx` and test at `/image-test`

---

## Check netlify.toml

If deployed on Netlify, check `netlify.toml` for CSP headers:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; img-src 'self' data: https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
```

---

## What to Report Back

After trying these steps, please tell me:

1. **Can you open logo URLs directly in browser?**
   - YES/NO

2. **What do you see in browser console?** (F12)
   - Any errors?
   - Screenshot if possible

3. **Network tab shows requests to ui-avatars.com?**
   - YES/NO
   - If yes, what status code?

4. **Are you seeing supplier cards at all?**
   - YES/NO
   - If yes, are they showing initials (fallback)?

5. **Which data source is active?**
   - "Sample Data" or "Registered Suppliers"

6. **React DevTools - SupplierGrid state:**
   - supplierSource: ?
   - demoSuppliers.length: ?
   - demoSuppliers[0].company_logo_url: ?

---

## Most Likely Causes (In Order):

1. **CSP Blocking** (90% probability)
   - Fix: Add CSP meta tag to index.html

2. **Network/Firewall** (5% probability)
   - Fix: Try incognito, different browser, disable firewall

3. **Component Not Rendering** (3% probability)
   - Fix: Check React errors, ensure suppliers exist

4. **Code Issue** (2% probability)  
   - Fix: Verify DEMO_SUPPLIERS has logo URLs

---

## Fastest Test Right Now:

1. Open browser
2. Paste this in address bar:
```
https://ui-avatars.com/api/?name=Test&background=0D8ABC&color=fff&size=128&bold=true
```
3. Press Enter

**Do you see a blue circle with "T"?**
- **YES** → Images work, problem is CSP or component
- **NO** → Network issue, firewall blocking

Let me know what you see!






