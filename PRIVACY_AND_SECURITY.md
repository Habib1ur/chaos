# CHAOS — Privacy, Safety & Security

## Anonymity Model
- In **Who Said That?**, author identities are hidden from all other players in the room during submission and guessing.
- Submission order is randomized with `crypto.randomInt` Fisher-Yates shuffling so timing/order never leaks authorship.
- As stated in the UI, anonymity is from other players in the room—not from server-side moderation or safety systems.

## Private State Isolation
- In **King's Truth or Dare**, secret assignments are stored in server memory and never broadcast in public state until revealed one-by-one.
- Private player numbers and King draft slots are sent only to the specific player's socket via `game:kings:private`.

## Content Safety & Consent
- All user-submitted text (prompts, confessions, chat) is sanitized and checked against safety filters blocking self-harm, doxxing, and harassment.
- Every player can Skip, Pass, Leave a room, or Report inappropriate submissions at any time.

## Authentication & Sessions
- Guest sessions and room reconnection tokens are signed with HMAC-SHA256 (`SESSION_SECRET`).
- Registered user passwords are salted and hashed with `crypto.scryptSync`.
- Server secrets (`DATABASE_URL`, `SESSION_SECRET`) are never exposed to `NEXT_PUBLIC_*` variables.
