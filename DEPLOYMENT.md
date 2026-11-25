# CHAOS — Beginner-Friendly Deployment Guide

## Recommended Free/Low-Cost Stack

1. **Database**: Supabase (PostgreSQL)
2. **Real-Time Backend**: Render (Persistent Web Service)
3. **Frontend**: Vercel (Next.js)
4. **Source Control & CI**: GitHub + GitHub Actions

---

## Step 1: Supabase PostgreSQL

1. Create a free project on [Supabase](https://supabase.com).
2. Go to **Project Settings → Database** and copy the PostgreSQL connection string (`DATABASE_URL`).
3. Locally, put `DATABASE_URL` in `.env` and run:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

## Step 2: Deploy Backend (`apps/server`) on Render

1. Push this repository to GitHub.
2. In [Render](https://render.com), create a **New Web Service** connected to your GitHub repo.
3. Configure:
   - **Root Directory**: Leave blank (monorepo root so `@chaos/shared` is accessible).
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @chaos/shared build && pnpm --filter @chaos/server build`
   - **Start Command**: `node apps/server/dist/index.js`
4. Add Environment Variables on Render:
   - `NODE_ENV=production`
   - `PORT=4000`
   - `FRONTEND_URL=https://your-vercel-domain.vercel.app`
   - `DATABASE_URL=<your-supabase-url>`
   - `SESSION_SECRET=<random-32-plus-char-secret>`
5. Verify `/health` returns `{ "ok": true }`.

## Step 3: Deploy Frontend (`apps/web`) on Vercel

1. In [Vercel](https://vercel.com), import the same GitHub repository.
2. Set **Root Directory** to `apps/web`.
3. Add Environment Variables on Vercel:
   - `NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app`
   - `NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com`
   - `NEXT_PUBLIC_SOCKET_URL=https://your-render-service.onrender.com`
4. Deploy and test creating a room, joining from a second browser/phone, and playing a round!
