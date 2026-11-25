# CHAOS — Multiplayer Social Gaming Platform

> **Friends. Games. Secrets. Absolute Chaos.**

CHAOS is an all-in-one online multiplayer party gaming platform where friends can create private rooms, share an invite link, and play 11+ real-time social games together—including **Classic Truth or Dare**, **King's Truth or Dare**, **Who Said That?** (anonymous confession & identity guessing), **Most Likely To**, **Never Have I Ever**, **Would You Rather**, **Hot Takes**, **Two Truths & A Lie**, **Quick Quiz**, **Random Wheel**, and **Custom Polls**.

## Tech Stack

- **Frontend (`apps/web`)**: Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Zustand, TanStack Query, Socket.IO Client
- **Real-time Backend (`apps/server`)**: Node.js, Express.js, Socket.IO, TypeScript, Zod, Helmet
- **Shared Package (`packages/shared`)**: Shared TypeScript types, Socket.IO event contracts, Zod schemas, game catalog
- **Database (`prisma/`)**: PostgreSQL (Supabase) + Prisma ORM

## Local Setup (Beginner-Friendly)

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Set up environment variables**:
   Copy `.env.example` to `.env` at the root (and optionally `apps/web/.env.local` for frontend overrides).
3. **Generate Prisma Client**:
   ```bash
   pnpm db:generate
   ```
   *(If you have a Supabase/PostgreSQL `DATABASE_URL` configured in `.env`, run `pnpm db:push` and `pnpm db:seed`.)*
4. **Start both frontend and backend**:
   ```bash
   pnpm dev
   ```
   - Frontend: `http://localhost:3000`
   - Real-time Server: `http://localhost:4000`
5. **Run tests & builds**:
   ```bash
   pnpm test
   pnpm build
   ```
