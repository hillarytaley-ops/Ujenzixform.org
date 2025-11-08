@echo off
echo.
echo ========================================
echo   UjenziPro - Add Scanners Hero Image
echo ========================================
echo.
echo Checking for image file...
if exist "public\scanners-hero-new.jpg" (
    echo ✅ Found: public\scanners-hero-new.jpg
    dir public\scanners-hero-new.jpg
    echo.
    echo Adding to git...
    git add public/scanners-hero-new.jpg
    echo.
    echo Committing...
    git commit -m "Add new QR scanner mobile app interface hero background image"
    echo.
    echo Pushing to GitHub...
    git push origin main
    echo.
    echo ========================================
    echo   ✅ Done! Image uploaded and pushed!
    echo ========================================
    echo.
    echo Netlify will auto-deploy in 3-5 minutes.
    echo Then visit your site/scanners page!
    echo.
) else (
    echo.
    echo ❌ ERROR: scanners-hero-new.jpg not found!
    echo.
    echo Please save the QR scanner image as:
    echo   public\scanners-hero-new.jpg
    echo.
    echo Then run this script again.
    echo.
)
pause


