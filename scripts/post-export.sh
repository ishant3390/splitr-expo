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

# Rewrite font paths in JS bundle(s) — cross-platform sed (works on both macOS and Linux)
for jsfile in dist/_expo/static/js/web/entry-*.js; do
  if [ -f "$jsfile" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's|/assets/node_modules/@expo-google-fonts/inter/[^/]*/\([^"]*\.ttf\)|/assets/fonts/\1|g' "$jsfile"
    else
      sed -i 's|/assets/node_modules/@expo-google-fonts/inter/[^/]*/\([^"]*\.ttf\)|/assets/fonts/\1|g' "$jsfile"
    fi
    echo "Rewrote font paths in $(basename "$jsfile")"
  fi
done

# Also fix paths in CSS if any
for cssfile in dist/_expo/static/css/*.css; do
  if [ -f "$cssfile" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's|/assets/node_modules/@expo-google-fonts/inter/[^)]*\/\([^)]*\.ttf\)|/assets/fonts/\1|g' "$cssfile"
    else
      sed -i 's|/assets/node_modules/@expo-google-fonts/inter/[^)]*\/\([^)]*\.ttf\)|/assets/fonts/\1|g' "$cssfile"
    fi
  fi
done

FONT_COUNT=$(find "$FONT_DIR" -name "*.ttf" 2>/dev/null | wc -l | tr -d ' ')
echo "Copied $FONT_COUNT font files to /assets/fonts/"

# 3. Stamp build hash into service worker for cache versioning
BUILD_HASH=$(date +%s)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|__BUILD_HASH__|${BUILD_HASH}|g" dist/service-worker.js
else
  sed -i "s|__BUILD_HASH__|${BUILD_HASH}|g" dist/service-worker.js
fi
echo "Stamped build hash ${BUILD_HASH} into service worker"

# 4. Inject PWA meta tags into index.html
PWA_HEAD='<meta name="theme-color" content="#0d9488"><meta name="description" content="Split expenses with friends — fast, fair, no awkwardness"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Splitr"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.json">'

SW_SCRIPT='<script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/service-worker.js")})}</script>'

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|</head>|${PWA_HEAD}</head>|" dist/index.html
  sed -i '' "s|</body>|${SW_SCRIPT}</body>|" dist/index.html
else
  sed -i "s|</head>|${PWA_HEAD}</head>|" dist/index.html
  sed -i "s|</body>|${SW_SCRIPT}</body>|" dist/index.html
fi
echo "Injected PWA meta tags and service worker registration"

# 5. Re-copy index.html to 404.html (now includes PWA tags)
cp dist/index.html dist/404.html
echo "Updated dist/404.html with PWA tags"
