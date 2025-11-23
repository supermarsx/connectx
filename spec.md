# ConnectX – Cross‑Platform Game & System Specification

---

## 1. High‑Level Overview

**Elevator pitch:**  
ConnectX is a modern, cross‑platform reimagining of Connect 4 that supports extended win conditions (Connect 4, 5, or 6), up to 4 players in a match, and two core board modes (Classic and Full‑Board). It runs as a browser‑first web app, packaged for Android and iOS, with online multiplayer via an authoritative server stack and optional offline/local play with bots.

**Platforms:**
- Web browser (desktop & mobile)
- Android (via PWA wrapper or Capacitor / WebView container)
- iOS (via PWA wrapper or Capacitor / WebView container)

**Key features:**
- Configurable win condition: **Connect 4 / 5 / 6**
- **Up to 4 players per room** (online or local pass‑and‑play)
- Two board modes:
  - **Classic Mode:** Board resets after each round.
  - **Full‑Board Mode:** Previously occupied slots are blacked out (unusable) in the next round but you can still stack pieces on top.
- **Online matchmaking** with:
  - Discovery / announce server
  - Lobby & matchmaking service
  - Bot server (auto‑spawns AI players)
  - Leaderboard server
  - Game core server (authoritative logic, anti‑cheat)
- **Offline modes:**
  - Single player vs. bot
  - Local multiplayer (2–4 players, pass‑and‑play) fully on client
- **Cosmetics:** Custom colored pieces per player with server‑side enforcement that all colours in a match are distinct.
- Player safety & fairness: authoritative server, minimal client trust, optional safe chat/emotes only, reporting/blocking.

---

## 2. Game Design

### 2.1 Core Mechanics

1. **Board:**
   - Default size: 7 columns × 6 rows (classic Connect 4 board).
   - Optionally configurable sizes in future (keep engine flexible).

2. **Win condition (Connect N):**
   - N ∈ {4, 5, 6}, chosen at match creation or by matchmaker defaults.
   - Winner: first player to align N pieces horizontally, vertically, or diagonally.

3. **Players per match:**
   - 2–4 players.
   - Turn order:
     - Default: fixed rotation based on join order.
     - Optional: randomized at match start for fairness.

4. **Turns:**
   - On a turn, a player selects a column to drop a piece.
   - Piece occupies the lowest available non‑blocked slot in that column.
   - Invalid moves (e.g., full column) are rejected.

5. **Rounds vs. Match:**
   - A **match** is a sequence of **rounds**.
   - In each round, players play until:
     - Someone wins (Connect N achieved), or
     - Board reaches a draw (no more valid moves).
   - Match scoring:
     - 1 win = 1 round point.
     - Optional: bonus for streaks or multi‑alignments.
     - Match length: configurable (e.g., first to 3 wins or best of N rounds).

### 2.2 Board Modes

#### 2.2.1 Classic Mode
- At the end of each round, the board **fully resets**.
- Next round starts with an empty grid.
- Turn order can:
  - Rotate from previous round (e.g., last player starts next), or
  - Use a fairness rule (e.g., the player with fewest wins starts).

#### 2.2.2 Full‑Board Mode
- At the end of each round:
  - All **occupied slots** from the just‑finished round become **blacked out / disabled**.
  - Players **cannot** place new pieces in blacked‑out slots.
  - However, existing columns remain usable **above** the blackout:
    - New pieces fall until they hit either a blacked‑out slot or the bottom of the board.
- Over successive rounds, the board becomes increasingly constrained.
- Potential variant rule (optional): after X rounds, the board fully resets.

### 2.3 Piece Colors & Player Identity

- Each player picks a **custom color** for their pieces.
- Rules:
  - No two players in the same match may share the same color.
  - Color conflict resolution:
    - On join, server checks requested color.
    - If taken, server returns a list of available colors or picks a default.
- Accessibility:
  - Option for **high‑contrast palette** for colorblind players.
  - Optional shape/pattern overlays on the pieces for non‑color cues.

### 2.4 Bots & Difficulty Levels

- Bot AI runs both on:
  - **Client:** offline mode (single player / local matches).
  - **Bot server:** online matches that auto‑spawn bots to fill slots.
- Difficulty tiers (expandable):
  - Easy: random with basic heuristics (avoid immediate loss).
  - Medium: simple rule‑based + look‑ahead 1–2 moves.
  - Hard: minimax / heuristic search with pruning.
- Bot identity:
  - Distinct name (e.g., **Bot‑X**), unique piece color.
  - Visible indicator in UI that a player is a bot.

### 2.5 Match Types

1. **Quick Play:**
   - Auto‑match players with similar skill rating.
   - Fill missing slots with bots if queue is slow or player toggles “Allow bots.”

2. **Custom Room:**
   - Player defines:
     - Player count (2–4).
     - Mode (Classic / Full‑Board).
     - Win condition (4/5/6).
     - Public or private (with invite code).
   - Room is announced to discovery service if public.

3. **Local Play (Client‑only):**
   - Pass‑and‑play on same device.
   - Supports 2–4 human players and/or local bots.
   - No server interaction; all logic executes on client.

---

## 3. Client Application

### 3.1 Technology Stack (suggested)

- **Frontend framework:** React (or similar) + TypeScript.
- **Rendering:** HTML5 Canvas or WebGL for the board, standard UI for menus.
- **State management:** Redux / Zustand / or similar.
- **Networking:** WebSockets for real‑time gameplay, REST/GraphQL for metadata & auth.
- **Packaging:**
  - Web: as standard SPA/PWA.
  - Android/iOS: via Capacitor or similar wrapper.

### 3.2 Client Responsibilities

- UI/UX rendering for menus, boards, and animations.
- Local game engine implementation (mirrors server logic) for:
  - Offline matches.
  - Predictive rendering in online matches (optimistic updates optional).
- Input handling and turn submission.
- Receiving and applying authoritative updates from the game core server.
- Managing local settings:
  - Preferred colors, audio, difficulty vs bot.
  - Accessibility options.
- Session handling:
  - Authentication tokens.
  - Reconnection logic (if connection drops during a match).

### 3.3 Sample UI Flows

1. **Main Menu:**
   - Play Online
   - Play Local
   - Practice vs Bot
   - Leaderboards
   - Settings / Profile

2. **Play Online → Quick Play:**
   - Show game mode preferences (Classic/Full‑Board, Connect N, allow bots).
   - User hits **Start** → client contacts matchmaking service.
   - Display “Searching for players…” with spinning loader and estimated wait.
   - Once matched → transition to match lobby → then to game board.

3. **Play Online → Custom Room:**
   - Create room (2–4 players, options, private/public).
   - Share room code / invite link.
   - As players join, they choose colors.
   - Host starts match.

4. **Play Local:**
   - Configure number of human players and bots.
   - Select mode & win condition.
   - Game runs entirely on client.

---

## 4. Server Architecture

### 4.1 High‑Level Components

1. **API Gateway / Edge:**
   - Entry point for HTTP(S) & WebSocket connections.
   - Auth, rate limiting, routing to internal services.

2. **Discovery / Announce Server:**
   - Registers public rooms and their metadata.
   - Allows clients to fetch a list of joinable rooms.
   - Optionally region‑aware (e.g., EU/US servers).

3. **Matchmaker / Lobby Service:**
   - Queues players for quick play based on:
     - Desired game options (mode, Connect N).
     - Skill rating / MMR.
   - When enough players are found or a timeout occurs:
     - Creates a lobby/match instance in the Game Core.
     - Requests Bot Server to fill missing slots if needed.

4. **Game Core Server (Authoritative):**
   - Holds authoritative game state for all online matches.
   - Validates every move:
     - Turn order.
     - Column validity.
     - Win/draw detection.
   - Broadcasts updated game state to all clients.
   - Handles disconnects, timeouts, and resignations.
   - Maintains round & match logic (Classic vs Full‑Board mode rules).

5. **Bot Server:**
   - Manages AI instances for online matches.
   - Exposes an API to:
     - Join a match as a bot player.
     - Receive board state & turn notifications.
     - Return chosen moves to Game Core.

6. **Leaderboard Server:**
   - Stores player stats:
     - Wins, losses, draws.
     - Rating/Mu/Sigma (Elo, Glicko, etc.).
   - Aggregates seasonal and all‑time leaderboards.
   - Exposes read APIs to clients.

7. **Authentication & Player Profile Service:**
   - Account registration/login (email/pass, third‑party auth optional).
   - Stores persistent profile data and cosmetics:
     - Username, avatar, preferred colors.
     - Unlockable themes/cosmetics.

8. **Player Safety & Moderation Service (optional phase 2):**
   - Constructs report/ban/block workflows.
   - Integrates with minimal chat or emote system if implemented.

### 4.2 Data Storage

- **Relational DB** (e.g., PostgreSQL) for:
  - Users, profiles, permissions.
  - Leaderboards & stats.
  - Match history.
- **In‑memory store** (e.g., Redis) for:
  - Active matches & lobbies.
  - Player queues.
  - Session tokens & presence.

---

## 5. Game Core Logic (Authoritative)

### 5.1 Server‑Side Rules Engine

- Game Core implements a deterministic engine with the following inputs:
  - Current board state (per round).
  - Round index.
  - Match configuration:
    - Mode (Classic / Full‑Board).
    - Connect N value.
    - Player list and turn order.
- For each move:
  - Validate player token & match membership.
  - Validate it is the player’s turn.
  - Validate target column (not fully blocked).
  - Compute new board state and check for:
    - Win condition.
    - Draw state.
  - If round ended:
    - Update scores.
    - Compute next round’s board:
      - Classic: reset board.
      - Full‑Board: black out occupied slots, keep others.
  - Broadcast state diff or full state to all clients.

### 5.2 Anti‑Cheat Considerations

- Client never decides legality of moves for online games:
  - Clients propose moves, server authoritatively accepts/rejects.
- Timeouts & AFK detection:
  - If player is idle beyond threshold, server can:
    - Auto‑skip, auto‑resign, or replace with a bot.
- Consistency checks:
  - Move rate limiting.
  - Basic anomaly detection (impossible input sequences).

---

## 6. Matchmaking & Room Flows

### 6.1 Quick Play Flow

1. Client sends **JoinQueue** request with preferred options.
2. Matchmaker assigns player to a queue.
3. When enough players are available:
   - Create match in Game Core.
   - If needed, request bots from Bot Server.
4. Clients receive **MatchFound** event with match details.
5. Clients connect to match channel via WebSocket.
6. Match starts after all players confirm or a countdown expires.

### 6.2 Custom Room Flow

1. Host sends **CreateRoom** with configuration:
   - Player count, mode, Connect N, public/private.
2. Discovery server registers room if public.
3. Other players join room via:
   - Room list (for public).
   - Room code / link (for private).
4. Lobby UI shows connected players and color selections.
5. Host starts match → Game Core initializes game.

### 6.3 Local Offline Match Flow

1. Client enters Local Play.
2. All configuration happens on the device.
3. Game engine runs fully on client (no network calls).
4. Results not submitted to leaderboards by default (to prevent stat manipulation).

---

## 7. Networking Protocol (Conceptual)

### 7.1 WebSocket Events (Examples)

- **Client → Server:**
  - `join_queue` (quick play)
  - `create_room`, `join_room`, `leave_room`
  - `start_match` (host only for custom room)
  - `submit_move` (column index)
  - `request_rematch`

- **Server → Client:**
  - `queue_joined`, `queue_update`, `match_found`
  - `room_created`, `room_update` (player list, colors)
  - `match_started` (initial board, turn order)
  - `state_update` (board state + scores)
  - `round_end`, `match_end`
  - `error` (e.g., invalid move, room full)

### 7.2 REST/HTTP Endpoints (Examples)

- `POST /auth/register`, `POST /auth/login`
- `GET /profile/me`, `PUT /profile/me`
- `GET /leaderboard/global`, `GET /leaderboard/friends`
- `GET /rooms/public` (from discovery)

---

## 8. Player Safety & UX

### 8.1 Safety Features

- Minimal or no free‑text chat in MVP.
- Optional quick emotes or canned messages.
- Report/Block system for abusive behavior (phase 2).
- Strong anti‑cheat through authoritative server.

### 8.2 Fairness & UX

- In multi‑round matches, rotate starting player to balance advantage.
- Rematch flow with option to re‑randomize turn order.
- Visual clarity around:
  - Whose turn it is.
  - Mode (Classic vs Full‑Board) and current round.
  - Blacked out slots vs valid slots.

---

## 9. Analytics & Telemetry (Optional but Recommended)

- Track:
  - Match completion rates, average duration.
  - Mode popularity (Classic vs Full‑Board, N value, 2 vs 4 player).
  - Bot usage frequency.
- Use metrics to tune matchmaking and bot difficulty.

---

## 10. Roadmap Phases

**Phase 1 – Core MVP:**
- Single board layout, Connect 4 only.
- 2‑player online matches.
- Classic mode only.
- Basic quick play matchmaking.
- Local vs bot.

**Phase 2 – Full Feature Release:**
- Connect 5 and 6 options.
- Full‑Board mode.
- Up to 4 players per match.
- Custom colors and accessibility improvements.
- Leaderboards & basic stats.

**Phase 3 – Polish & Expansion:**
- Seasonal rankings & cosmetic unlocks.
- Advanced bot AI.
- Social features (friends list, invites, parties).
- Tournaments or events.

---

This specification is designed to be expanded as needed, but it captures the core architecture, game rules, online services, and client capabilities for the novelty ConnectX game described.

