# 🎨 UjenziPro Animation Quick Reference

## 🚀 Quick Start Commands

### Install Framer Motion (Recommended)
```bash
npm install framer-motion
```

### Install React Spring (Alternative)
```bash
npm install @react-spring/web
```

### Install Canvas Confetti (For celebrations)
```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

---

## 📋 Current Animation Components

### 1. AnimatedSection
**File:** `src/components/AnimatedSection.tsx`

```tsx
import AnimatedSection from '@/components/AnimatedSection';

<AnimatedSection animation="fadeInUp" delay={100}>
  <YourComponent />
</AnimatedSection>
```

**Animation Types:**
- `fadeInUp` - Fade in from bottom
- `fadeInLeft` - Fade in from left
- `fadeInRight` - Fade in from right
- `fadeIn` - Simple fade
- `scaleIn` - Scale up

---

### 2. AnimatedCounter
**File:** `src/components/AnimatedCounter.tsx`

```tsx
import AnimatedCounter from '@/components/AnimatedCounter';

<AnimatedCounter 
  end={2500} 
  suffix="+" 
  duration={2000} 
/>
```

---

## 🎯 Quick Implementation Snippets

### Page Transition with Framer Motion

**Update App.tsx:**
```tsx
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

const App = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Routes location={location}>
          {/* Your routes */}
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};
```

---

### Loading Skeleton

**Create:** `src/components/ui/skeleton.tsx`
```tsx
export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const CardSkeleton = () => (
  <div className="space-y-3 p-4">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
  </div>
);
```

**Usage:**
```tsx
{loading ? <CardSkeleton /> : <BuilderCard data={data} />}
```

---

### Button Micro-interactions

**Enhance existing buttons:**
```tsx
<Button className="
  transition-all 
  duration-200 
  hover:scale-105
  hover:shadow-lg
  active:scale-95
">
  Click Me
</Button>
```

---

### Form Validation Animation

**Add shake animation in tailwind.config.ts:**
```typescript
module.exports = {
  theme: {
    extend: {
      animation: {
        shake: 'shake 0.5s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '50%': { transform: 'translateX(10px)' },
          '75%': { transform: 'translateX(-10px)' },
        },
      },
    },
  },
};
```

**Use in form:**
```tsx
<Input 
  className={errors.email ? "animate-shake border-red-500" : ""} 
/>
```

---

### Staggered List Animation

**For Builder/Supplier grids:**
```tsx
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.div 
  variants={container} 
  initial="hidden" 
  animate="show"
  className="grid grid-cols-3 gap-4"
>
  {items.map(item => (
    <motion.div key={item.id} variants={item}>
      <Card>{item.name}</Card>
    </motion.div>
  ))}
</motion.div>
```

---

### Modal Animation

**Enhance Dialog component:**
```tsx
import { DialogContent } from "@/components/ui/dialog";

<DialogContent className="
  animate-in 
  fade-in-0 
  zoom-in-95 
  slide-in-from-bottom-4
  duration-300
">
  {/* Modal content */}
</DialogContent>
```

---

### Success Confetti

**Create:** `src/utils/confetti.ts`
```typescript
import confetti from 'canvas-confetti';

export const fireConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
};

export const fireworksConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  
  frame();
};
```

**Usage:**
```tsx
import { fireConfetti } from '@/utils/confetti';

const handleSuccess = () => {
  fireConfetti();
  toast.success("Quote submitted successfully!");
};
```

---

### Progress Steps

**Create:** `src/components/ui/progress-steps.tsx`
```tsx
import { motion } from "framer-motion";

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressSteps = ({ currentStep, totalSteps }: ProgressStepsProps) => (
  <div className="flex gap-2">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <motion.div
        key={i}
        className={`h-2 flex-1 rounded-full ${
          i <= currentStep ? 'bg-primary' : 'bg-gray-200'
        }`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: i <= currentStep ? 1 : 0.3 }}
        transition={{ duration: 0.3 }}
      />
    ))}
  </div>
);
```

---

### Typing Indicator

**Create:** `src/components/ui/typing-indicator.tsx`
```tsx
export const TypingIndicator = () => (
  <div className="flex space-x-2 p-3">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
  </div>
);
```

---

### Parallax Hero Section

**Update Homepage:**
```tsx
import { useScroll, useTransform, motion } from "framer-motion";

const HeroSection = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative h-screen overflow-hidden">
      <motion.div 
        style={{ y, opacity }}
        className="absolute inset-0"
      >
        <img src="/background.jpg" alt="Hero" className="w-full h-full object-cover" />
      </motion.div>
      
      <div className="relative z-10">
        {/* Hero content */}
      </div>
    </section>
  );
};
```

---

### Pulse Badge

**For live indicators:**
```tsx
<div className="relative">
  <span className="flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
  </span>
  <span className="ml-2">LIVE</span>
</div>
```

---

### Hover Card with Animation

**Enhance BuilderCard:**
```tsx
import { motion } from "framer-motion";

<motion.div
  whileHover={{ 
    scale: 1.05,
    transition: { duration: 0.2 }
  }}
  whileTap={{ scale: 0.95 }}
>
  <Card>
    {/* Card content */}
  </Card>
</motion.div>
```

---

### Toast with Animation

**Using Sonner:**
```tsx
import { toast } from "sonner";

// Success
toast.success("Action completed!", {
  duration: 3000,
  className: "animate-bounce-in"
});

// Error with shake
toast.error("Something went wrong", {
  className: "animate-shake"
});

// Loading
toast.loading("Processing...", {
  duration: Infinity
});

// Dismiss
toast.dismiss(toastId);
```

---

### Route Loading Bar

**Create:** `src/components/ui/loading-bar.tsx`
```tsx
import { motion } from "framer-motion";

export const LoadingBar = () => (
  <motion.div
    className="fixed top-0 left-0 right-0 h-1 bg-primary z-50"
    initial={{ scaleX: 0, originX: 0 }}
    animate={{ scaleX: 1 }}
    exit={{ scaleX: 1, originX: 1 }}
    transition={{ duration: 0.5, ease: "easeInOut" }}
  />
);
```

**Add to App.tsx:**
```tsx
const [loading, setLoading] = useState(false);

useEffect(() => {
  const handleStart = () => setLoading(true);
  const handleComplete = () => setLoading(false);

  // Listen to route changes
  return () => {
    handleComplete();
  };
}, [location]);

return (
  <>
    {loading && <LoadingBar />}
    {/* Rest of app */}
  </>
);
```

---

## 🎨 Custom Tailwind Animations

**Add to `tailwind.config.ts`:**

```typescript
module.exports = {
  theme: {
    extend: {
      animation: {
        // Fade animations
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        
        // Slide animations
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-top': 'slideInTop 0.3s ease-out',
        'slide-in-bottom': 'slideInBottom 0.3s ease-out',
        
        // Scale animations
        'scale-in': 'scaleIn 0.3s ease-out',
        'scale-out': 'scaleOut 0.3s ease-in',
        
        // Bounce animations
        'bounce-in': 'bounceIn 0.5s ease-out',
        'bounce-out': 'bounceOut 0.5s ease-in',
        
        // Special effects
        'shake': 'shake 0.5s ease-in-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        
        // Loading animations
        'shimmer': 'shimmer 2s infinite',
        'progress': 'progress 1s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInTop: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInBottom: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '30%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(0.3)', opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
    },
  },
};
```

---

## 🎯 Page-Specific Animation Checklist

### ✅ Homepage (/)
- [x] Hero text animations (existing)
- [x] Counter animations (existing)
- [ ] CTA button hover effects
- [ ] Trust badges entrance
- [ ] Testimonial carousel
- [ ] Feature card stagger

### ✅ Builders (/builders)
- [ ] Search bar focus animation
- [ ] Filter panel slide-in
- [ ] Card grid stagger
- [ ] Profile modal entrance
- [ ] Star rating animation
- [ ] Contact form success

### ✅ Suppliers (/suppliers)
- [ ] Data source toggle
- [ ] Category tab transitions
- [ ] Product card hover
- [ ] Quote form slide-up
- [ ] Success confetti
- [ ] Catalog modal

### ✅ Delivery (/delivery)
- [ ] Map marker animation
- [ ] Route drawing
- [ ] Status timeline
- [ ] ETA countdown
- [ ] Delivery completion
- [ ] Driver location pulse

### ✅ Monitoring (/monitoring)
- [ ] Camera grid fade-in
- [ ] Feed transitions
- [ ] Alert pulse
- [ ] Recording indicator
- [ ] Drone path animation
- [ ] Live badge pulse

### ✅ Scanners (/scanners)
- [ ] Scanner viewfinder
- [ ] QR detection highlight
- [ ] Scan success checkmark
- [ ] Material card reveal
- [ ] Verification badge
- [ ] Scanning beam effect

---

## 📱 Responsive Animation Considerations

### Disable heavy animations on mobile:
```tsx
import { useMediaQuery } from '@/hooks/use-media-query';

const isMobile = useMediaQuery('(max-width: 768px)');

<motion.div
  animate={isMobile ? {} : { scale: 1.1 }}
>
  {/* Content */}
</motion.div>
```

### Respect reduced motion preference:
```tsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

<motion.div
  animate={{
    x: prefersReducedMotion ? 0 : 100
  }}
>
```

---

## 🚀 Performance Tips

1. **Use GPU-accelerated properties:**
   - ✅ `transform`, `opacity`
   - ❌ `width`, `height`, `margin`, `padding`

2. **Add `will-change` sparingly:**
   ```css
   .animated-element {
     will-change: transform, opacity;
   }
   ```

3. **Use `IntersectionObserver` for scroll animations:**
   - Already implemented in `useScrollAnimation`!

4. **Lazy load heavy animations:**
   ```tsx
   const HeavyAnimation = lazy(() => import('./HeavyAnimation'));
   ```

5. **Reduce animation duration on mobile:**
   ```tsx
   const duration = isMobile ? 200 : 400;
   ```

---

## 🎬 Demo Video Animation Sequence

### Scene 1: Homepage (0:00-0:15)
- Hero text slide-in
- Counter animations trigger
- CTA buttons hover effect
- Scroll to features

### Scene 2: Builder Search (0:15-0:30)
- Search bar focus animation
- Type search query
- Filters slide in
- Grid cards stagger reveal
- Click builder card
- Modal slides up

### Scene 3: Quote Request (0:30-0:45)
- Quote form slides in
- Form fields animate
- Submit button press effect
- Success confetti
- Toast notification

### Scene 4: Delivery Tracking (0:45-1:00)
- Map zooms in
- Vehicle marker appears
- Route line draws
- Status timeline animates
- ETA countdown

### Scene 5: QR Scanner (1:00-1:15)
- Scanner opens
- Viewfinder animation
- QR code detected
- Success checkmark
- Material info reveals

### Scene 6: Monitoring (1:15-1:30)
- Camera grid fades in
- Live badges pulse
- Camera expands
- Alert notification
- Return to grid

---

## 📚 Quick Links

- **Framer Motion Docs:** https://www.framer.com/motion/
- **Tailwind Animations:** https://tailwindcss.com/docs/animation
- **React Spring:** https://www.react-spring.dev/
- **Canvas Confetti:** https://www.npmjs.com/package/canvas-confetti
- **Animation Examples:** https://codepen.io/collection/nMpBQp

---

## 🎉 Ready to Animate!

**Start with these high-impact animations:**
1. Page transitions (Framer Motion)
2. Loading skeletons
3. Button micro-interactions
4. Form validation shake
5. Success confetti

**Then move to:**
- Staggered list reveals
- Modal animations
- Progress indicators
- Parallax effects

---

**Need help? Check the main guide: `UJENZIPRO_APP_PROCESS_AND_ANIMATION_GUIDE.md`**










