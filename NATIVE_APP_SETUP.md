# MradiPro Native App Setup Guide

This guide explains how to build native iOS and Android apps from the MradiPro web application using Capacitor.

## Prerequisites

### For Android Development:
- [Android Studio](https://developer.android.com/studio) (latest version)
- Java JDK 17 or higher
- Android SDK (API level 33+)
- Gradle

### For iOS Development (Mac only):
- macOS
- [Xcode](https://developer.apple.com/xcode/) (latest version)
- Xcode Command Line Tools
- CocoaPods (`sudo gem install cocoapods`)

### For Both:
- Node.js 18+
- npm or yarn

## Initial Setup

### 1. Install Capacitor Dependencies

```bash
# Install Capacitor core and CLI
npm install @capacitor/core @capacitor/cli

# Install platform-specific packages
npm install @capacitor/android @capacitor/ios

# Install useful plugins
npm install @capacitor/app @capacitor/haptics @capacitor/keyboard
npm install @capacitor/status-bar @capacitor/splash-screen
npm install @capacitor/push-notifications @capacitor/local-notifications
npm install @capacitor/share @capacitor/browser @capacitor/camera
npm install @capacitor/geolocation @capacitor/network
```

### 2. Build the Web App

```bash
npm run build
```

### 3. Initialize Capacitor (if not already done)

```bash
npx cap init MradiPro com.mradipro.app
```

### 4. Add Platforms

```bash
# Add Android platform
npx cap add android

# Add iOS platform (Mac only)
npx cap add ios
```

### 5. Sync Web Assets to Native Projects

```bash
npx cap sync
```

## Building for Android

### 1. Open in Android Studio

```bash
npx cap open android
```

### 2. Configure Signing (for release builds)

1. In Android Studio, go to **Build > Generate Signed Bundle / APK**
2. Create a new keystore or use an existing one
3. Follow the wizard to create a signed APK or App Bundle

### 3. Build APK

For debug APK:
```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

For release APK:
```bash
cd android
./gradlew assembleRelease
```

### 4. Build App Bundle (for Play Store)

```bash
cd android
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Building for iOS

### 1. Open in Xcode

```bash
npx cap open ios
```

### 2. Configure Signing

1. Select the project in the navigator
2. Select the target
3. Go to "Signing & Capabilities"
4. Select your Team and configure Bundle Identifier

### 3. Build Archive

1. Select "Any iOS Device" as the build target
2. Go to **Product > Archive**
3. Once complete, the Organizer window will open

### 4. Distribute

From the Organizer:
- **App Store Connect** - Submit to TestFlight/App Store
- **Ad Hoc** - Distribute to specific devices
- **Development** - Install on your devices

## App Icons and Splash Screens

### Generate Icons

Use a tool like [capacitor-assets](https://github.com/ionic-team/capacitor-assets):

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#1e40af'
```

Place your source icon at:
- `resources/icon.png` (1024x1024)
- `resources/splash.png` (2732x2732)

### Manual Icon Placement

**Android:** `android/app/src/main/res/`
- mipmap-hdpi/ic_launcher.png (72x72)
- mipmap-mdpi/ic_launcher.png (48x48)
- mipmap-xhdpi/ic_launcher.png (96x96)
- mipmap-xxhdpi/ic_launcher.png (144x144)
- mipmap-xxxhdpi/ic_launcher.png (192x192)

**iOS:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Various sizes from 20x20 to 1024x1024

## Push Notifications Setup

### Android (Firebase)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add an Android app with your package name
3. Download `google-services.json`
4. Place it in `android/app/`
5. Update `android/build.gradle` and `android/app/build.gradle` with Firebase dependencies

### iOS (APNs)

1. Enable Push Notifications capability in Xcode
2. Create an APNs key in Apple Developer Portal
3. Configure your backend to send push notifications

## Deep Linking

### Android

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="mradipro.com" />
    <data android:scheme="mradipro" />
</intent-filter>
```

### iOS

Add to `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>mradipro</string>
        </array>
    </dict>
</array>
```

## Development Workflow

### Live Reload

For development with live reload:

1. Update `capacitor.config.ts`:
```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:5173',
  cleartext: true
}
```

2. Start the dev server:
```bash
npm run dev -- --host
```

3. Sync and run:
```bash
npx cap sync
npx cap run android
# or
npx cap run ios
```

### Regular Development

```bash
# Make changes to web code
npm run build
npx cap sync
npx cap open android  # or ios
# Build and run from IDE
```

## Publishing to Stores

### Google Play Store

1. Create a developer account ($25 one-time fee)
2. Create a new app in Play Console
3. Upload your AAB file
4. Fill in store listing, content rating, etc.
5. Submit for review

### Apple App Store

1. Enroll in Apple Developer Program ($99/year)
2. Create an App Store Connect record
3. Upload your build via Xcode
4. Fill in app information
5. Submit for review

## Troubleshooting

### Android Build Issues

```bash
# Clean build
cd android
./gradlew clean
cd ..
npx cap sync android
```

### iOS Build Issues

```bash
# Update pods
cd ios/App
pod install --repo-update
cd ../..
npx cap sync ios
```

### General Issues

```bash
# Reset everything
rm -rf node_modules
rm -rf android
rm -rf ios
npm install
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

## Useful Commands

```bash
# Sync web assets to native
npx cap sync

# Copy web assets only (no native dependency updates)
npx cap copy

# Update native plugins
npx cap update

# Open in IDE
npx cap open android
npx cap open ios

# Run on device/emulator
npx cap run android
npx cap run ios

# Check doctor
npx cap doctor
```

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation)
- [Play Store Publishing Guide](https://support.google.com/googleplay/android-developer/answer/9859152)
- [App Store Publishing Guide](https://developer.apple.com/app-store/submitting/)

