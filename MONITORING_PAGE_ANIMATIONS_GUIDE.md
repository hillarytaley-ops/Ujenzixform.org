# UjenziPro Monitoring Page Animations Guide

## 📋 Overview

This guide provides comprehensive documentation for implementing animations on the UjenziPro Monitoring page. The animation system includes CSS animations, React hooks, and pre-built components designed specifically for surveillance and monitoring dashboards.

## 📁 Files Created

### 1. CSS Animations
- **File**: `src/styles/monitoring-animations.css`
- **Purpose**: Pure CSS animations for various monitoring elements
- **Size**: 700+ lines of production-ready CSS

### 2. React Hooks
- **File**: `src/hooks/useMonitoringAnimations.ts`
- **Purpose**: Custom React hooks for animation logic
- **Hooks**: 20+ specialized animation hooks

### 3. React Components
- **File**: `src/components/monitoring/MonitoringAnimations.tsx`
- **Purpose**: Reusable animated components
- **Components**: 15+ pre-built animated components

---

## 🎨 CSS Animations Reference

### Camera Feed Animations

#### Live Camera Pulse
```css
.camera-live-pulse
```
**Usage**: Apply to live camera cards to show active status
```tsx
<div className="camera-live-pulse">
  Live Camera Feed
</div>
```

#### Recording Indicator
```css
.recording-indicator
```
**Usage**: Blinking red dot for recording cameras
```tsx
<div className="recording-indicator">
  <Video className="h-4 w-4" />
</div>
```

#### Camera Card Hover
```css
.camera-card
```
**Usage**: Smooth lift effect on hover
```tsx
<div className="camera-card">
  Camera Information
</div>
```

#### Video Feed Loading
```css
.video-feed-loading
```
**Usage**: Shimmer effect while video loads
```tsx
<div className="video-feed-loading aspect-video" />
```

### Drone Animations

#### Drone Float
```css
.drone-icon-float
```
**Usage**: Floating animation for drone icons
```tsx
<Plane className="drone-icon-float" />
```

#### Drone Propeller Spin
```css
.drone-spinning
```
**Usage**: Rotating animation for active drones
```tsx
<div className="drone-spinning">
  <Plane />
</div>
```

#### Aerial Badge Shimmer
```css
.aerial-badge-shimmer
```
**Usage**: Shimmering effect for aerial view badges
```tsx
<Badge className="aerial-badge-shimmer">Aerial</Badge>
```

### Status Indicators

#### Online Status
```css
.status-online
```
**Usage**: Pulsing green indicator
```tsx
<div className="status-online">
  <CheckCircle />
</div>
```

#### Offline Status
```css
.status-offline
```
**Usage**: Pulsing red indicator
```tsx
<div className="status-offline">
  <AlertTriangle />
</div>
```

#### Maintenance Status
```css
.status-maintenance
```
**Usage**: Rotating settings icon
```tsx
<Settings className="status-maintenance" />
```

### Signal & Battery

#### Signal Bars
```css
.signal-bar-1
.signal-bar-2
.signal-bar-3
.signal-bar-4
```
**Usage**: Animated signal strength bars
```tsx
<div className="flex gap-1">
  <div className="signal-bar-1 w-1 h-2 bg-green-500" />
  <div className="signal-bar-2 w-1 h-3 bg-green-500" />
  <div className="signal-bar-3 w-1 h-4 bg-green-500" />
  <div className="signal-bar-4 w-1 h-5 bg-green-500" />
</div>
```

#### Battery Charging
```css
.battery-charging
```
**Usage**: Animated battery fill
```tsx
<div className="battery-charging" />
```

#### Low Battery Warning
```css
.battery-low
```
**Usage**: Flashing low battery indicator
```tsx
<Battery className="battery-low" />
```

### Monitoring Stats

#### Stats Counter
```css
.stat-counter
```
**Usage**: Fade-in animation for numbers
```tsx
<div className="stat-counter">
  {projectCount}
</div>
```

#### Stats Card Reveal
```css
.stats-card
```
**Usage**: Staggered reveal for stat cards
```tsx
<div className="stats-card">
  Card Content
</div>
```

### Alerts & Notifications

#### Alert Pulse
```css
.alert-pulse
```
**Usage**: Pulsing alert badge
```tsx
<Badge className="alert-pulse">
  3 Alerts
</Badge>
```

#### Notification Slide
```css
.notification-slide
```
**Usage**: Slide-in notification
```tsx
<div className="notification-slide">
  New notification
</div>
```

#### Critical Alert Shake
```css
.critical-alert
```
**Usage**: Shaking animation for critical alerts
```tsx
<Alert className="critical-alert">
  Critical Issue!
</Alert>
```

---

## 🪝 React Hooks Usage

### 1. Camera Pulse Hook
```tsx
import { useCameraPulse } from '@/hooks/useMonitoringAnimations';

const CameraCard = ({ camera }) => {
  const isPulsing = useCameraPulse(camera.isLive, 2000);
  
  return (
    <div className={isPulsing ? 'ring-4 ring-blue-500' : ''}>
      {camera.name}
    </div>
  );
};
```

### 2. Recording Blink Hook
```tsx
import { useRecordingBlink } from '@/hooks/useMonitoringAnimations';

const RecordingIndicator = ({ isRecording }) => {
  const blinkState = useRecordingBlink(isRecording);
  
  return (
    <div className={blinkState ? 'opacity-100' : 'opacity-30'}>
      ● REC
    </div>
  );
};
```

### 3. Count Up Animation Hook
```tsx
import { useCountUp } from '@/hooks/useMonitoringAnimations';

const StatsCounter = ({ value }) => {
  const count = useCountUp(value, 2000);
  
  return (
    <div className="text-4xl font-bold">
      {count}
    </div>
  );
};
```

### 4. Progress Animation Hook
```tsx
import { useProgressAnimation } from '@/hooks/useMonitoringAnimations';

const ProjectProgress = ({ progress }) => {
  const animatedProgress = useProgressAnimation(progress, 1500);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-500 h-2 rounded-full"
        style={{ width: `${animatedProgress}%` }}
      />
    </div>
  );
};
```

### 5. Signal Animation Hook
```tsx
import { useSignalAnimation } from '@/hooks/useMonitoringAnimations';

const SignalIndicator = ({ strength }) => {
  const animatedBars = useSignalAnimation(strength);
  
  return (
    <div className="flex gap-1">
      {animatedBars.map((isActive, i) => (
        <div
          key={i}
          className={`w-1 h-${i + 2} ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
        />
      ))}
    </div>
  );
};
```

### 6. Battery Animation Hook
```tsx
import { useBatteryAnimation } from '@/hooks/useMonitoringAnimations';

const BatteryIndicator = ({ level }) => {
  const { isWarning, isCritical } = useBatteryAnimation(level);
  
  return (
    <Battery className={
      isCritical ? 'text-red-500 animate-pulse' :
      isWarning ? 'text-yellow-500' : 'text-green-500'
    } />
  );
};
```

### 7. Staggered Animation Hook
```tsx
import { useStaggeredAnimation } from '@/hooks/useMonitoringAnimations';

const CameraList = ({ cameras }) => {
  const visibleItems = useStaggeredAnimation(cameras.length, 100);
  
  return (
    <div>
      {cameras.map((camera, i) => (
        <div
          key={camera.id}
          className={visibleItems.includes(i) ? 'opacity-100' : 'opacity-0'}
        >
          {camera.name}
        </div>
      ))}
    </div>
  );
};
```

### 8. Alert Pulse Hook
```tsx
import { useAlertPulse } from '@/hooks/useMonitoringAnimations';

const AlertBadge = ({ hasAlert, severity }) => {
  const pulseIntensity = useAlertPulse(hasAlert, severity);
  
  return (
    <Badge 
      className={`pulse-intensity-${pulseIntensity}`}
    >
      Alert
    </Badge>
  );
};
```

### 9. Drone Float Hook
```tsx
import { useDroneFloat } from '@/hooks/useMonitoringAnimations';

const DroneIcon = ({ isActive }) => {
  const position = useDroneFloat(isActive);
  
  return (
    <Plane 
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
    />
  );
};
```

### 10. Refresh Animation Hook
```tsx
import { useRefreshAnimation } from '@/hooks/useMonitoringAnimations';

const RefreshButton = () => {
  const { isRefreshing, triggerRefresh } = useRefreshAnimation();
  
  const handleRefresh = async () => {
    await triggerRefresh(async () => {
      // Your refresh logic here
      await fetchLatestData();
    });
  };
  
  return (
    <Button onClick={handleRefresh}>
      <RefreshCw className={isRefreshing ? 'animate-spin' : ''} />
    </Button>
  );
};
```

---

## 🧩 Pre-built Components

### 1. Live Camera Indicator
```tsx
import { LiveCameraIndicator } from '@/components/monitoring/MonitoringAnimations';

<LiveCameraIndicator 
  isLive={camera.status === 'online'}
  isRecording={camera.isRecording}
/>
```

### 2. Signal Strength Component
```tsx
import { SignalStrength } from '@/components/monitoring/MonitoringAnimations';

<SignalStrength strength={camera.signalStrength} />
```

### 3. Battery Level Component
```tsx
import { BatteryLevel } from '@/components/monitoring/MonitoringAnimations';

<BatteryLevel 
  level={drone.batteryLevel}
  isCharging={false}
/>
```

### 4. Drone Indicator
```tsx
import { DroneIndicator } from '@/components/monitoring/MonitoringAnimations';

<DroneIndicator isActive={drone.status === 'flying'} />
```

### 5. Alert Badge
```tsx
import { AlertBadge } from '@/components/monitoring/MonitoringAnimations';

<AlertBadge 
  count={project.alerts}
  severity="critical"
/>
```

### 6. Animated Counter
```tsx
import { AnimatedCounter } from '@/components/monitoring/MonitoringAnimations';

<AnimatedCounter 
  value={totalCameras}
  duration={2000}
/>
```

### 7. Progress Ring
```tsx
import { ProgressRing } from '@/components/monitoring/MonitoringAnimations';

<ProgressRing 
  progress={project.progress}
  size={120}
  color="#3b82f6"
/>
```

### 8. Loading Spinner
```tsx
import { LoadingSpinner } from '@/components/monitoring/MonitoringAnimations';

<LoadingSpinner size="lg" />
```

### 9. Video Feed Placeholder
```tsx
import { VideoFeedPlaceholder } from '@/components/monitoring/MonitoringAnimations';

<VideoFeedPlaceholder 
  isLoading={isBuffering}
  isDrone={camera.type === 'drone'}
/>
```

### 10. Stats Card
```tsx
import { StatsCard } from '@/components/monitoring/MonitoringAnimations';

<StatsCard 
  title="Active Cameras"
  value={activeCameraCount}
  icon={<Camera />}
  trend="up"
  delay={0.2}
/>
```

### 11. Location Marker
```tsx
import { LocationMarker } from '@/components/monitoring/MonitoringAnimations';

<LocationMarker isActive={true} />
```

---

## 🎯 Implementation Examples

### Example 1: Camera Card with Full Animations

```tsx
import React from 'react';
import { 
  LiveCameraIndicator, 
  SignalStrength, 
  BatteryLevel,
  DroneIndicator 
} from '@/components/monitoring/MonitoringAnimations';
import { useCameraPulse } from '@/hooks/useMonitoringAnimations';

const CameraCard = ({ camera }) => {
  const isPulsing = useCameraPulse(camera.isLive);
  const isDrone = camera.id.startsWith('drone-');
  
  return (
    <div className={`camera-card p-4 border rounded-lg ${isPulsing ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Header with live indicator */}
      <div className="flex justify-between items-center mb-2">
        <LiveCameraIndicator 
          isLive={camera.status === 'online'}
          isRecording={camera.isRecording}
        />
        {isDrone && <DroneIndicator isActive={camera.status === 'online'} />}
      </div>
      
      {/* Camera name */}
      <h3 className="font-semibold mb-2">{camera.name}</h3>
      <p className="text-sm text-gray-600 mb-3">{camera.location}</p>
      
      {/* Stats row */}
      <div className="flex justify-between items-center">
        <SignalStrength strength={camera.signalStrength} />
        {camera.batteryLevel && (
          <BatteryLevel level={camera.batteryLevel} />
        )}
      </div>
    </div>
  );
};
```

### Example 2: Monitoring Dashboard Stats

```tsx
import React from 'react';
import { StatsCard } from '@/components/monitoring/MonitoringAnimations';
import { Camera, Activity, AlertTriangle, Monitor } from 'lucide-react';

const MonitoringStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatsCard 
        title="Active Projects"
        value={stats.activeProjects}
        icon={<Monitor />}
        trend="up"
        delay={0.1}
      />
      <StatsCard 
        title="Live Cameras"
        value={stats.liveCameras}
        icon={<Camera />}
        trend="up"
        delay={0.2}
      />
      <StatsCard 
        title="System Uptime"
        value="99.2%"
        icon={<Activity />}
        trend="neutral"
        delay={0.3}
      />
      <StatsCard 
        title="Active Alerts"
        value={stats.alerts}
        icon={<AlertTriangle />}
        trend={stats.alerts > 0 ? 'down' : 'neutral'}
        delay={0.4}
      />
    </div>
  );
};
```

### Example 3: Video Feed with Loading State

```tsx
import React from 'react';
import { VideoFeedPlaceholder } from '@/components/monitoring/MonitoringAnimations';
import { useVideoLoadingShimmer } from '@/hooks/useMonitoringAnimations';

const VideoFeed = ({ camera, isLoading }) => {
  const shimmerPosition = useVideoLoadingShimmer(isLoading);
  
  if (isLoading || !camera.streamUrl) {
    return (
      <VideoFeedPlaceholder 
        isLoading={isLoading}
        isDrone={camera.type === 'drone'}
      />
    );
  }
  
  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video 
        src={camera.streamUrl}
        autoPlay
        className="w-full h-full object-cover"
      />
      {/* Video controls overlay */}
      <div className="video-controls absolute bottom-0 left-0 right-0 p-4">
        {/* Controls here */}
      </div>
    </div>
  );
};
```

### Example 4: Project Progress Card

```tsx
import React from 'react';
import { ProgressRing, AlertBadge } from '@/components/monitoring/MonitoringAnimations';
import { useProgressAnimation } from '@/hooks/useMonitoringAnimations';

const ProjectCard = ({ project }) => {
  const animatedProgress = useProgressAnimation(project.progress);
  
  return (
    <div className="stats-card p-6 bg-white rounded-lg border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg">{project.name}</h3>
          <p className="text-sm text-gray-600">{project.location}</p>
        </div>
        {project.alerts > 0 && (
          <AlertBadge 
            count={project.alerts}
            severity={project.alerts > 5 ? 'critical' : 'medium'}
          />
        )}
      </div>
      
      <div className="flex justify-center my-6">
        <ProgressRing 
          progress={animatedProgress}
          size={120}
          strokeWidth={10}
          color={project.status === 'active' ? '#22c55e' : '#f59e0b'}
        />
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="font-semibold">{project.cameras}</div>
          <div className="text-gray-600">Cameras</div>
        </div>
        <div>
          <div className="font-semibold">{project.activeCameras}</div>
          <div className="text-gray-600">Active</div>
        </div>
        <div>
          <div className="font-semibold">{Math.round(animatedProgress)}%</div>
          <div className="text-gray-600">Complete</div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🚀 Quick Start Implementation

### Step 1: Import CSS
Add to your main CSS file or component:

```tsx
import '@/styles/monitoring-animations.css';
```

### Step 2: Install Dependencies (if using framer-motion)
```bash
npm install framer-motion
# or
bun add framer-motion
```

### Step 3: Use in Your Component

```tsx
import React from 'react';
import '@/styles/monitoring-animations.css';
import { 
  LiveCameraIndicator,
  SignalStrength,
  StatsCard 
} from '@/components/monitoring/MonitoringAnimations';
import { useCameraPulse, useCountUp } from '@/hooks/useMonitoringAnimations';

const MonitoringPage = () => {
  const cameraCount = useCountUp(15, 2000);
  
  return (
    <div className="p-6">
      {/* Stats Section */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard 
          title="Active Cameras"
          value={cameraCount}
          icon={<Camera />}
          delay={0.1}
        />
        {/* More stats cards... */}
      </div>
      
      {/* Camera feeds... */}
    </div>
  );
};
```

---

## 🎨 Customization Guide

### Changing Animation Duration

**CSS:**
```css
.camera-live-pulse {
  animation: cameraPulse 3s ease-in-out infinite; /* Changed from 2s to 3s */
}
```

**React Hook:**
```tsx
const isPulsing = useCameraPulse(isLive, 3000); // Changed from default 2000
```

### Changing Colors

**CSS:**
```css
.status-online {
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); /* Change RGB values */
}
```

**Component:**
```tsx
<ProgressRing 
  progress={75}
  color="#ff0000" // Custom color
/>
```

### Disabling Animations for Accessibility

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .camera-live-pulse {
    animation: none !important;
  }
}
```

---

## 📊 Performance Tips

1. **Use CSS animations** for simple effects (better performance)
2. **Use React hooks** for complex state-dependent animations
3. **Lazy load** animation components on large lists
4. **Debounce** rapid state changes
5. **Use `will-change`** sparingly for GPU acceleration

```css
.camera-card {
  will-change: transform;
}
```

---

## 🐛 Troubleshooting

### Animations not working?

1. **Check CSS import**: Ensure `monitoring-animations.css` is imported
2. **Check class names**: Verify exact spelling of animation classes
3. **Check dependencies**: Ensure framer-motion is installed for React components
4. **Check browser support**: Some animations require modern browsers

### Performance issues?

1. **Reduce animation count**: Don't animate too many elements simultaneously
2. **Use CSS instead of JS**: For simple animations
3. **Optimize re-renders**: Use React.memo for animated components
4. **Check animation duration**: Very long animations can impact UX

---

## 📚 Additional Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [CSS Animation Performance](https://web.dev/animations/)
- [React Animation Best Practices](https://react.dev/learn/adding-interactivity)

---

## ✅ Checklist for Implementation

- [ ] Import `monitoring-animations.css`
- [ ] Install framer-motion (if using React components)
- [ ] Copy hook files to `src/hooks/`
- [ ] Copy component files to `src/components/monitoring/`
- [ ] Test animations in development
- [ ] Test performance with multiple cameras
- [ ] Test accessibility (keyboard navigation, reduced motion)
- [ ] Verify mobile responsiveness
- [ ] Test on different browsers

---

## 🎯 Common Use Cases

### Use Case 1: Show camera is actively recording
```tsx
<LiveCameraIndicator isLive={true} isRecording={true} />
```

### Use Case 2: Display low battery warning
```tsx
<BatteryLevel level={15} /> {/* Auto shows warning below 20% */}
```

### Use Case 3: Animated stats on page load
```tsx
<AnimatedCounter value={cameras.length} duration={2000} />
```

### Use Case 4: Pulsing alert for critical issues
```tsx
<AlertBadge count={3} severity="critical" />
```

### Use Case 5: Loading video feed
```tsx
<VideoFeedPlaceholder isLoading={true} isDrone={false} />
```

---

## 🔧 Maintenance

To modify or extend animations:

1. **CSS Animations**: Edit `src/styles/monitoring-animations.css`
2. **React Hooks**: Edit `src/hooks/useMonitoringAnimations.ts`
3. **Components**: Edit `src/components/monitoring/MonitoringAnimations.tsx`

Always test changes across:
- Different screen sizes
- Various browsers
- With reduced motion enabled
- With multiple simultaneous animations

---

**Created for UjenziPro - Kenya's Premier Construction Management Platform** 🇰🇪





