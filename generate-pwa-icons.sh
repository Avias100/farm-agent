#!/bin/bash

echo "🎨 PWA Icon Generator for macOS"
echo "================================"
echo ""

cd "$(dirname "$0")/public" || exit 1

# Check if base image exists
BASE_IMAGE=""
if [ -f "logo-512.png" ]; then
    BASE_IMAGE="logo-512.png"
elif [ -f "logo.png" ]; then
    BASE_IMAGE="logo.png"
elif [ -f "icon-512.png" ]; then
    BASE_IMAGE="icon-512.png"
else
    echo "❌ No base PNG image found."
    echo ""
    echo "Please create a PNG image first:"
    echo "  1. Open logo.svg in your browser"
    echo "  2. Take a screenshot (Cmd+Shift+4) or save as PNG"
    echo "  3. Save it as 'public/logo-512.png' (at least 512x512 pixels)"
    echo ""
    echo "Opening logo.svg now..."
    open logo.svg
    echo ""
    echo "After saving the PNG, run this script again."
    exit 1
fi

echo "✓ Found base image: $BASE_IMAGE"
echo ""
echo "Generating icons..."
echo ""

# Icon sizes needed for PWA
SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
    output="icon-${size}.png"
    
    # Use sips to resize
    sips -z $size $size "$BASE_IMAGE" --out "$output" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "  ✓ Created icon-${size}.png"
    else
        echo "  ✗ Failed to create icon-${size}.png"
    fi
done

# Create favicon
echo ""
echo "Creating favicon..."
sips -z 32 32 "$BASE_IMAGE" --out "favicon.ico" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✓ Created favicon.ico"
else
    echo "  ✗ Failed to create favicon.ico"
fi

echo ""
echo "✅ Icon generation complete!"
echo ""
echo "Generated files:"
ls -lh icon-*.png favicon.ico 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "🎉 Your app is now ready to install on Android!"
echo "   Deploy to a hosting service and visit from Android Chrome."
