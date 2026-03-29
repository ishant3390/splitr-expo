#!/bin/bash
# Post-export script for Cloudflare Pages deployment

# 1. Copy index.html to 404.html for SPA fallback routing
cp dist/index.html dist/404.html
echo "Created dist/404.html for SPA fallback"

# 2. Fix font paths — Cloudflare Pages cannot serve files with '@' in directory names.
#    Copy @-prefixed font files to a flat /assets/fonts/ directory and rewrite
#    references in the JS bundle.
FONT_DIR="dist/assets/fonts"
mkdir -p "$FONT_DIR"

# Copy all .ttf files to flat directory
find dist/assets/node_modules -name "*.ttf" -exec cp {} "$FONT_DIR/" \; 2>/dev/null

# Rewrite font paths in JS bundle(s): replace the deep @-prefixed path with /assets/fonts/filename
for jsfile in dist/_expo/static/js/web/entry-*.js; do
  if [ -f "$jsfile" ]; then
    # Replace: /assets/node_modules/@expo-google-fonts/inter/WEIGHT/FILENAME.ttf
    # With:    /assets/fonts/FILENAME.ttf
    sed -i '' 's|/assets/node_modules/@expo-google-fonts/inter/[^/]*/\([^"]*\.ttf\)|/assets/fonts/\1|g' "$jsfile"
    echo "Rewrote font paths in $(basename $jsfile)"
  fi
done

# Also fix paths in CSS if any
for cssfile in dist/_expo/static/css/*.css; do
  if [ -f "$cssfile" ]; then
    sed -i '' 's|/assets/node_modules/@expo-google-fonts/inter/[^)]*\/\([^)]*\.ttf\)|/assets/fonts/\1|g' "$cssfile"
  fi
done

FONT_COUNT=$(ls "$FONT_DIR"/*.ttf 2>/dev/null | wc -l | tr -d ' ')
echo "Copied $FONT_COUNT font files to /assets/fonts/"
