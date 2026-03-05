# Quick Icon Generation Guide

I've created a simple farm logo for you at: `public/logo.svg`

## Option 1: Use PWA Builder (Easiest - 2 minutes)

1. **Convert SVG to PNG first:**
   - Open `public/logo.svg` in your browser
   - Right-click → "Save As" or take a screenshot
   - Or use this online converter: https://svgtopng.com
   - Make sure it's at least 512x512px

2. **Generate all icon sizes:**
   - Go to: https://www.pwabuilder.com/imageGenerator
   - Upload your PNG logo
   - Click "Download" to get all icon sizes
   - Extract the zip file
   - Copy all PNG files to your `public/` folder

3. **Done!** Your app is now installable on Android.

## Option 2: Use macOS Preview (Quick)

1. Open `public/logo.svg` in your browser
2. Take a screenshot (Cmd+Shift+4, drag to select the logo)
3. Open the screenshot in Preview
4. Tools → Adjust Size → Set to 512x512 pixels
5. Save as `logo-512.png`
6. Then use PWA Builder (step 2 above)

## Option 3: Online SVG to PNG Converter

1. Visit: https://svgtopng.com or https://cloudconvert.com/svg-to-png
2. Upload `public/logo.svg`
3. Set size to 512x512
4. Download the PNG
5. Use PWA Builder (step 2 from Option 1)

## Option 4: Use Our Node Script

If you want to customize the logo first:

```bash
# Install the canvas package
npm install canvas

# Run the generator
node generate-icons.js
```

## Customize Your Logo

Edit `public/logo.svg` to change:
- **Colors**: Change the hex codes (#16a34a, #22c55e)
- **Text**: Change "NEBULA" and "FRESH PRODUCE" to your farm name
- **Design**: Modify the leaf shapes or add your own elements

Then follow any option above to generate the icon files.

---

**Next Step After Icons Are Generated:**
- Deploy your app to see the install prompt on Android
- Or test locally by visiting from your phone: `http://YOUR_LOCAL_IP:5173`
