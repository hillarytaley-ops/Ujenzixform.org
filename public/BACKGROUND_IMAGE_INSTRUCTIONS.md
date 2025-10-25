# Background Image Instructions

## Current Setup
The application now uses a construction site aerial view as the background for all pages.

## Using Your Own Image
To replace the current background with your own construction site image:

1. Save your image in the `public` folder as `construction-site-background.jpg`
2. Update `src/index.css` line 148 to use: `url('/construction-site-background.jpg')`
3. Ensure your image is high resolution (recommended: 1920x1080 or higher)

## Current Background
- Uses a high-quality construction site aerial view from Unsplash
- Applied to all pages via the body element in CSS
- Has a semi-transparent overlay for content readability
- Responsive and works on all device sizes

## Technical Details
- Background is set in `src/index.css` on the `body` element
- Uses `background-attachment: fixed` for a parallax effect
- Overlay opacity can be adjusted in the `body::before` pseudo-element











