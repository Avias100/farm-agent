#!/bin/bash

# Generate PWA icons from a source image
# This creates placeholder icons - replace with your actual farm logo

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install with: brew install imagemagick"
    exit 1
fi

# Create a simple green circle icon as placeholder
cd public

# Generate base SVG
cat > icon.svg << 'EOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#16a34a" rx="80"/>
  <text x="256" y="340" font-size="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">🌿</text>
</svg>
EOF

# Convert SVG to PNG at different sizes
for size in 72 96 128 144 152 192 384 512; do
    convert -background none -resize ${size}x${size} icon.svg icon-${size}.png
    echo "✓ Generated icon-${size}.png"
done

# Create favicon
convert -background none -resize 32x32 icon.svg favicon.ico
echo "✓ Generated favicon.ico"

rm icon.svg
echo ""
echo "✅ All icons generated!"
echo "💡 Replace these placeholder icons with your farm logo for a custom look"
