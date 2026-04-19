# Deployment Guide

## Environments
| Env | Frontend | Backend | Auth |
|-----|----------|---------|------|
| **Local** | `localhost:8081` | `localhost:8085` | Clerk dev key (`.env.local`) |
| **Dev** | `https://dev.splitr.ai` | `https://api-dev.splitr.ai/api` | Clerk dev key (CF Pages env vars) |
| **Prod** | `https://splitr.ai` (future) | TBD | Clerk prod key |

## Cloudflare Pages (Frontend)
- **Repo**: `splitr-ai/splitr-expo` (GitHub org)
- **Build**: `npm run build:web` → Expo export + `scripts/post-export.sh` (404.html SPA fallback + font flattening)
- **Output**: `dist/`
- **Auto-deploys**: on push to `main`
- **Env vars** (set in CF Pages dashboard, not committed): `NODE_VERSION`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_INVITE_BASE_URL`
- **Invite link env (required per environment)**:
  - Dev deploys: `EXPO_PUBLIC_INVITE_BASE_URL=https://dev.splitr.ai`
  - Prod deploys: `EXPO_PUBLIC_INVITE_BASE_URL=https://splitr.ai`
- **Known constraint**: Cloudflare Pages cannot serve files with `@` in directory paths — post-export script flattens `@expo-google-fonts` to `/assets/fonts/`

## Landing Page
- Separate Vite+React app in `/landing/` directory
- Deployed independently to Cloudflare Pages at `splitr.ai`
- Has its own `package.json`, build system, and wrangler config

## Railway (Backend)
- Spring Boot API at `api-dev.splitr.ai`
- CORS: configured via `CORS_ALLOWED_ORIGINS` env var (includes `dev.splitr.ai` + localhost)
