# CHAOS — HTTP API & Socket.IO Events

## HTTP Endpoints (`apps/server`)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `GET` | `/api/games` | Full game catalog metadata |
| `GET` | `/api/rooms/public` | List open, unlocked public rooms |
| `POST` | `/api/auth/guest` | Create a signed guest session |
| `POST` | `/api/auth/register` | Register a new account |
| `POST` | `/api/auth/login` | Sign in with email & password |
| `GET` | `/api/auth/me` | Fetch current authenticated profile |

## Socket.IO Events

### Client → Server
- `room:create` — Create a room and receive `{ room, playerId, sessionToken }`
- `room:join` — Join by room code and optional password
- `room:leave` — Leave current room
- `room:ready` — Toggle ready status in lobby
- `room:profile:update` — Update nickname or avatar
- `room:settings:update` — Host-only room settings update
- `room:host:transfer` — Host-only host transfer
- `room:kick` — Host-only player removal
- `player:reconnect` — Restore session after refresh/disconnect
- `game:select` — Host-only game selection
- `game:start` / `game:end` / `game:return-lobby` — Host-only lifecycle controls
- `game:action` / `game:submit` / `game:vote` — In-game player actions
- `chat:send` / `reaction:send` / `submission:report` — Social & safety events

### Server → Client
- `room:updated`, `room:player:joined`, `room:player:left`, `room:kicked`, `room:error`
- `game:started`, `game:updated`, `game:kings:private`, `game:results`
- `chat:message`, `reaction:received`
