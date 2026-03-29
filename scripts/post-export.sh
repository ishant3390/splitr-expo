#!/bin/bash
# Post-export script: copy index.html to 404.html for Cloudflare Pages SPA routing
# Cloudflare Pages serves 404.html for unknown routes when it exists,
# which acts as SPA fallback while preserving static file serving.
cp dist/index.html dist/404.html
echo "Created dist/404.html for SPA fallback"
