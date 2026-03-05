// Quick PWA icon generator using Canvas (no external dependencies needed)
// Creates simple placeholder icons with farm theme

const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = './public';

// Create a simple farm-themed icon
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Green background (brand color)
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 0, size, size);

  // Add rounded corners
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  const radius = size * 0.15;
  ctx.moveTo(radius, 0);
  ctx.arcTo(size, 0, size, size, radius);
  ctx.arcTo(size, size, 0, size, radius);
  ctx.arcTo(0, size, 0, 0, radius);
  ctx.arcTo(0, 0, size, 0, radius);
  ctx.closePath();
  ctx.fill();

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';

  // Add leaf emoji centered
  ctx.font = `${size * 0.55}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🌿', size / 2, size / 2);

  return canvas;
}

// Check if canvas module exists
try {
  require.resolve('canvas');
  
  console.log('📱 Generating PWA icons...\n');

  sizes.forEach(size => {
    const canvas = generateIcon(size);
    const filename = `${outputDir}/icon-${size}.png`;
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Generated icon-${size}.png`);
  });

  // Create favicon (32x32)
  const faviconCanvas = generateIcon(32);
  fs.writeFileSync(`${outputDir}/favicon.ico`, faviconCanvas.toBuffer('image/png'));
  console.log('✓ Generated favicon.ico');

  console.log('\n✅ All icons generated successfully!');
  console.log('💡 Replace these with your farm logo for a custom look\n');

} catch (err) {
  console.log('⚠️  Canvas module not available.');
  console.log('\nTo generate icons automatically, install canvas:');
  console.log('  npm install canvas\n');
  console.log('Or use one of these alternatives:');
  console.log('  1. Visit https://www.pwabuilder.com/imageGenerator');
  console.log('  2. Create icons manually (see PWA_SETUP.md)');
  console.log('  3. Install ImageMagick: brew install imagemagick\n');
}
