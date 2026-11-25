# CHAOS — System Architecture

## Monorepo Layout

- `apps/web`: Next.js App Router frontend (marketing pages, game library, room lobby, active game views, profiles, dark/light theme).
- `apps/server`: Persistent Node.js + Express + Socket.IO real-time multiplayer backend.
- `packages/shared`: Single source of truth for TypeScript types, Zod validation schemas, Socket.IO event interfaces, and game catalog metadata.
- `prisma/`: Normalized PostgreSQL schema (`schema.prisma`) and seed script (`seed.ts`).

## Real-Time Multiplayer Design

- **Why a separate Socket.IO service?** Standard serverless functions (such as Vercel) are stateless and short-lived, whereas multiplayer rooms, timers, and private game state require persistent WebSocket connections.
- **Modular Game Engine (`GameEngine` interface)**: Every game implements `start`, `getPublicState`, `handleAction`, and optional `handleSubmit`, `handleVote`, and `onPlayerReconnect`.
- **Room Isolation**: Each room is scoped to its Socket.IO room (`socket.join(room.code)`). All broadcasts use `io.to(room.code).emit(...)`.
- **Private State Separation**:
  - In **King's Truth or Dare**, secret assignments are stored only on the server until revealed one-by-one, and `game:kings:private` is emitted exclusively to the individual player's socket ID.
  - In **Who Said That?**, `authorId` is stored in a server-side `InternalStatement` record, submissions are Fisher-Yates shuffled, and `authorId`/`authorName` are omitted from public payloads until the reveal phase (and only included if `revealAuthorsInAnonymous` is enabled).
