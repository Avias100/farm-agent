# PWA Android Installation Guide

Your app is now configured as a Progressive Web App (PWA) that can be installed on Android devices!

## What's Been Added:

1. **Web Manifest** (`public/manifest.webmanifest`)
   - Defines app name, colors, and display mode
   - Specifies required icon sizes for Android

2. **Service Worker** (`public/sw.js`)
   - Enables offline functionality
   - Caches essential files for faster loading
   - Auto-registered in `src/main.jsx`

3. **Meta Tags** (in `index.html`)
   - Theme color for Android browser chrome
   - Mobile viewport settings
   - Apple touch icon support

## How Users Install on Android:

### Method 1: Chrome Browser
1. Open your app in Chrome browser
2. Tap the menu button (three dots)
3. Tap "Install app" or "Add to Home screen"
4. Follow the prompts

### Method 2: Automatic Prompt
- After visiting your app 2-3 times, Android will automatically show an install banner

## Next Steps:

### Generate Icons

You need app icons in multiple sizes. Choose one of these options:

#### Option A: Use Online Tool (Easiest)
1. Visit https://www.pwabuilder.com/imageGenerator
2. Upload a 512x512px image of your logo
3. Download the generated icon pack
4. Extract all icons to the `public/` folder

#### Option B: Install ImageMagick
```bash
brew install imagemagick
./generate-icons.sh
```

#### Option C: Manual Creation
Create PNG images with these exact dimensions and save to `public/`:
- icon-72.png (72×72)
- icon-96.png (96×96)
- icon-128.png (128×128)
- icon-144.png (144×144)
- icon-152.png (152×152)
- icon-192.png (192×192) ⭐ Required
- icon-384.png (384×384)
- icon-512.png (512×512) ⭐ Required
- favicon.ico (32×32)

**Minimum requirement**: At least create `icon-192.png` and `icon-512.png`

### Test Installation

1. Deploy your app to a web server (must use HTTPS)
2. Visit from Android Chrome
3. Look for install prompt

### Local Testing

To test locally on your Android device:
1. Find your Mac's local IP: Already shown in terminal
2. On Android, visit: `http://YOUR_IP:5173`
3. Make sure your phone and Mac are on the same WiFi network

## Requirements for PWA Install:

✅ Web Manifest with name and icons  
✅ Service Worker registered  
✅ Served over HTTPS (or localhost)  
✅ At least 192x192 and 512x512 icons  
✅ Valid manifest.json file

## Troubleshooting:

**Install button doesn't appear:**
- Check that icons exist in `public/` folder
- Verify HTTPS is enabled (required for production)
- Clear browser cache and revisit
- Check browser console for errors

**App doesn't work offline:**
- Service worker may need time to cache files
- Try visiting twice, then go offline

## Customization:

Edit `public/manifest.webmanifest` to change:
- `name`: Full app name
- `short_name`: Name shown on home screen
- `theme_color`: Android status bar color
- `background_color`: Splash screen color
- `description`: App description

---

Your farm management app is now ready to be installed like a native Android app! 🎉
