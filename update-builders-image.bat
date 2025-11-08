@echo off
echo.
echo ================================
echo  Update Builders Hero Image
echo ================================
echo.
echo Current file info:
dir public\builders-hero-new.jpg
echo.
echo After you save your new image to public\builders-hero-new.jpg, press any key to continue...
pause > nul
echo.
echo Checking new file...
dir public\builders-hero-new.jpg
echo.
echo Adding to git...
git add public/builders-hero-new.jpg
echo.
echo Committing...
git commit -m "Update builders hero background with construction workers and blueprints image"
echo.
echo Pushing to GitHub...
git push origin main
echo.
echo ================================
echo  Done! Image updated and pushed!
echo ================================
echo.
pause


