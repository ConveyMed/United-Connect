#!/bin/bash
# Generate all app icons from a single source image.
# CRITICAL — also regenerates adaptive icon foreground + splash screens.
# The default Capacitor "X" template icon has gotten apps rejected by Google
# for "Misleading Claims: app icon does not match store listing" (see FieldOrtho, 2026-04-13).
#
# Usage:
#   ./scripts/generate-icons.sh path/to/logo-1024.png [bg_color]
#
# Args:
#   logo-1024.png  — source image, 1024x1024 PNG, logo on final-look background
#   bg_color       — hex color for Android splash + adaptive icon background
#                    (default: #FFFFFF). Use your brand color, e.g. '#001D45'
#
# Requires: ImageMagick (brew install imagemagick)

set -e

SRC="$1"
BG_COLOR="${2:-#FFFFFF}"

if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "Usage: ./scripts/generate-icons.sh path/to/logo-1024.png [bg_color]"
  echo "  Source should be at least 1024x1024 PNG"
  echo "  bg_color (optional, default #FFFFFF) is the Android splash + adaptive bg"
  exit 1
fi

echo "Generating all icons from: $SRC"
echo "Android bg color: $BG_COLOR"

# --- Public / Web ---
echo "  Web icons..."
magick "$SRC" -resize 512x512 public/logo512.png
magick "$SRC" -resize 192x192 public/logo192.png
magick "$SRC" -resize 180x180 public/apple-touch-icon.png
magick "$SRC" -resize 48x48 public/favicon-48.png
magick "$SRC" -resize 32x32 public/favicon-32.png
magick "$SRC" -resize 16x16 public/favicon-16.png

mkdir -p public/icons
magick "$SRC" -resize 72x72 public/icons/icon-72.png
magick "$SRC" -resize 96x96 public/icons/icon-96.png
magick "$SRC" -resize 128x128 public/icons/icon-128.png
magick "$SRC" -resize 144x144 public/icons/icon-144.png
magick "$SRC" -resize 152x152 public/icons/icon-152.png
magick "$SRC" -resize 384x384 public/icons/icon-384.png

# --- Android icons (legacy + adaptive foreground) ---
echo "  Android legacy icons (ic_launcher.png + ic_launcher_round.png)..."
mkdir -p android-icons/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}
magick "$SRC" -resize 512x512 android-icons/playstore-icon.png

# Legacy square + round (pre-Android 8)
for pair in "mdpi 48" "hdpi 72" "xhdpi 96" "xxhdpi 144" "xxxhdpi 192"; do
  DPI=$(echo $pair | awk '{print $1}')
  SZ=$(echo $pair | awk '{print $2}')
  magick "$SRC" -resize "${SZ}x${SZ}" android-icons/mipmap-$DPI/ic_launcher.png
  # Circular mask for round variant
  magick "$SRC" -resize "${SZ}x${SZ}" \
    \( -size "${SZ}x${SZ}" xc:none -fill white -draw "circle $((SZ/2)),$((SZ/2)) $((SZ/2)),0" \) \
    -compose CopyOpacity -composite android-icons/mipmap-$DPI/ic_launcher_round.png
done

# Adaptive icon foreground (Android 8+): logo at ~70% of canvas, transparent bg.
# Target sizes from Android adaptive icon spec (108dp base, ~70% inner = safe zone).
echo "  Android adaptive icon foreground (ic_launcher_foreground.png)..."
for dens in "mdpi:108:76" "hdpi:162:113" "xhdpi:216:151" "xxhdpi:324:227" "xxxhdpi:432:302"; do
  DPI="${dens%%:*}"; rest="${dens#*:}"; SIZE="${rest%%:*}"; INNER="${rest#*:}"
  magick -size "${SIZE}x${SIZE}" xc:none \
    \( "$SRC" -resize "${INNER}x${INNER}" \) -gravity center -composite \
    android-icons/mipmap-$DPI/ic_launcher_foreground.png
done

# Copy into actual android build if it exists
if [ -d "android/app/src/main/res" ]; then
  echo "  Copying Android icons into build..."
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    cp android-icons/mipmap-$density/ic_launcher.png           android/app/src/main/res/mipmap-$density/ic_launcher.png
    cp android-icons/mipmap-$density/ic_launcher_round.png     android/app/src/main/res/mipmap-$density/ic_launcher_round.png
    cp android-icons/mipmap-$density/ic_launcher_foreground.png android/app/src/main/res/mipmap-$density/ic_launcher_foreground.png
  done

  # Update adaptive icon background color
  BG_COLOR_FILE="android/app/src/main/res/values/ic_launcher_background.xml"
  if [ -f "$BG_COLOR_FILE" ]; then
    sed -i '' "s|<color name=\"ic_launcher_background\">#[0-9A-Fa-f]\{6,8\}</color>|<color name=\"ic_launcher_background\">${BG_COLOR}</color>|" "$BG_COLOR_FILE"
    echo "  Set adaptive icon background to $BG_COLOR"
  fi

  # Splash screens (all 11 drawable variants) — logo centered on bg color
  echo "  Android splash screens..."
  declare -a SPLASH=(
    "drawable:480:320"
    "drawable-port-mdpi:320:480" "drawable-port-hdpi:480:800"
    "drawable-port-xhdpi:720:1280" "drawable-port-xxhdpi:960:1600" "drawable-port-xxxhdpi:1280:1920"
    "drawable-land-mdpi:480:320" "drawable-land-hdpi:800:480"
    "drawable-land-xhdpi:1280:720" "drawable-land-xxhdpi:1600:960" "drawable-land-xxxhdpi:1920:1280"
  )
  for entry in "${SPLASH[@]}"; do
    DIR="${entry%%:*}"; rest="${entry#*:}"; W="${rest%%:*}"; H="${rest#*:}"
    MIN=$(( W < H ? W : H ))
    LOGO=$(( MIN * 40 / 100 ))
    OUT_DIR="android/app/src/main/res/$DIR"
    [ -d "$OUT_DIR" ] || continue
    magick -size "${W}x${H}" "xc:${BG_COLOR}" \
      \( "$SRC" -resize "${LOGO}x${LOGO}" \) -gravity center -composite \
      "$OUT_DIR/splash.png"
  done
fi

# --- iOS icons ---
echo "  iOS icons..."
mkdir -p ios-icons/AppIcon.appiconset
magick "$SRC" -resize 1024x1024 ios-icons/AppIcon.appiconset/icon-1024.png
magick "$SRC" -resize 1024x1024 ios-icons/icon-1024.png
magick "$SRC" -resize 180x180 ios-icons/AppIcon.appiconset/icon-180.png
magick "$SRC" -resize 180x180 ios-icons/icon-180.png
magick "$SRC" -resize 167x167 ios-icons/AppIcon.appiconset/icon-167.png
magick "$SRC" -resize 167x167 ios-icons/icon-167.png
magick "$SRC" -resize 152x152 ios-icons/AppIcon.appiconset/icon-152.png
magick "$SRC" -resize 152x152 ios-icons/icon-152.png
magick "$SRC" -resize 120x120 ios-icons/AppIcon.appiconset/icon-120.png
magick "$SRC" -resize 120x120 ios-icons/icon-120.png
magick "$SRC" -resize 120x120 ios-icons/AppIcon.appiconset/icon-120-app.png
magick "$SRC" -resize 87x87 ios-icons/AppIcon.appiconset/icon-87.png
magick "$SRC" -resize 80x80 ios-icons/AppIcon.appiconset/icon-80.png
magick "$SRC" -resize 80x80 ios-icons/icon-80.png
magick "$SRC" -resize 80x80 ios-icons/AppIcon.appiconset/icon-80-ipad.png
magick "$SRC" -resize 76x76 ios-icons/AppIcon.appiconset/icon-76.png
magick "$SRC" -resize 76x76 ios-icons/icon-76.png
magick "$SRC" -resize 60x60 ios-icons/AppIcon.appiconset/icon-60.png
magick "$SRC" -resize 60x60 ios-icons/icon-60.png
magick "$SRC" -resize 58x58 ios-icons/AppIcon.appiconset/icon-58.png
magick "$SRC" -resize 58x58 ios-icons/icon-58.png
magick "$SRC" -resize 58x58 ios-icons/AppIcon.appiconset/icon-58-ipad.png
magick "$SRC" -resize 40x40 ios-icons/AppIcon.appiconset/icon-40.png
magick "$SRC" -resize 40x40 ios-icons/icon-40.png
magick "$SRC" -resize 40x40 ios-icons/AppIcon.appiconset/icon-40-ipad.png
magick "$SRC" -resize 40x40 ios-icons/AppIcon.appiconset/icon-40-spotlight.png
magick "$SRC" -resize 29x29 ios-icons/AppIcon.appiconset/icon-29.png
magick "$SRC" -resize 29x29 ios-icons/icon-29.png
magick "$SRC" -resize 20x20 ios-icons/AppIcon.appiconset/icon-20.png
magick "$SRC" -resize 20x20 ios-icons/icon-20.png

# Copy into actual iOS build if it exists
if [ -d "ios/App/App/Assets.xcassets/AppIcon.appiconset" ]; then
  echo "  Copying to iOS build..."
  cp ios-icons/AppIcon.appiconset/*.png ios/App/App/Assets.xcassets/AppIcon.appiconset/
fi

# --- Store listing ---
echo "  Store listing..."
mkdir -p store-listing/icon store-listing/screenshots store-listing/feature-graphic
cp android-icons/playstore-icon.png store-listing/icon/
cp ios-icons/icon-1024.png store-listing/icon/AppIcon-1024.png

echo ""
echo "Done! All icons + adaptive foreground + splash regenerated."
echo ""
echo "Remaining manual steps:"
echo "  1. Generate feature graphic: see PUBLISH_CHECKLIST.md"
echo "  2. Run screenshots script: node scripts/screenshots.js"
echo "  3. Copy screenshots to store-listing/screenshots/"
