# Begi Pakad — project context

Begi Pakad is a 4-player, 2-team trick-taking card game (Indian rules, Hearts-like: you want to *avoid* points). It ships as:

- **Web app / PWA** (React 19 + Vite + Tailwind v4) in `src/`
- **Node server** (Express + Socket.IO v4) in `server.ts` + `server/src/`, which also serves the built web app and `public/BegiPakad.apk`
- **Android/iOS app** (Expo SDK 57, React Native, plain JS) in `mobile/`, a separate npm project that talks to the same server

The game engine in `src/game/` is shared: the server imports it for online games, and the web client runs it directly for offline "Play with Bots" games. The mobile app does **not** import it (separate project); it only renders `ClientGameState` objects sent by the server.

## Commands

| What | Command |
|---|---|
| Dev server (Express + Vite middleware, port 3000) | `npm run dev` |
| Engine unit tests | `npm test` (runs `src/game/tests/runTests.ts` with tsx) |
| Type-check | `npm run lint` (`tsc --noEmit`) |
| Responsive screenshots | see the header of `scripts/responsive-check.mjs` (dev server + headless Chrome) |
| Production build (web to `dist/`, server to `dist/server.cjs`) | `npm run build`, then `npm start` |
| Mobile | `cd mobile && npx expo start` (or `expo run:android`) |

Before writing mobile code, read `mobile/AGENTS.md`: Expo has changed, so use the SDK 57 docs at https://docs.expo.dev/versions/v57.0.0/. Add native modules with `npx expo install <pkg>` so the version matches the SDK. Any new native module needs a new APK build.

## Game rules (source of truth is the code)

- **Teams:** seats 0 & 2 are Team 1, seats 1 & 3 are Team 2 (`getTeamForSeat`). Turn order is `seat + 1 mod 4`. The UI draws it anti-clockwise: offset 1 = East/right, 2 = North/partner, 3 = West/left (`GameTable.getPlayerAtOffset`).
- **Suits** use Hindi names in code: `HUKUM` ♠, `PAAN` ♥, `EENT` ♦, `CHIDI` ♣. A Q♠ is "Begum Hukum" (`isBegumHukum`). A trick is a "Ser". A hand is a "Round" in the UI; the code still says `hand` (`handNumber`, `handHistory`).
- **Each round:** 13 cards each. Everyone passes 5 cards to `seat + 1` at the same time (`passing.ts`). There are 120s to pass: the engine keeps a passing deadline and sends the seconds left in `passingState.timeRemainingSeconds`; clients count down from that and auto-pass at 0, and the server auto-passes at the same deadline. Then 13 Ser are played. Round 1 is led by seat 0; round N+1 is led by `handNumber % 4`.
- **Legal plays** (`rules.ts`, `getLegalCardsToPlay`):
  - Follow suit if you can.
  - If ♠ is led and A♠ or K♠ has already been played, a holder of Q♠ must play Q♠.
  - **Ser 1:**
    - Nobody may lead or discard ♠/♥ while holding ♣/♦.
    - Priority is ♣/♦, then ♠ (not Q), then ♥, then Q♠.
    - Q♠ can't be played voluntarily while following ♠.
  - **Ser 2 onwards:** if you can't follow suit and hold Q♠, you must play Q♠; otherwise any card.
- **Scoring** (`scoring.ts`, points are bad):
  - Each ♥ is +1. Q♠ is +12, or +0 if the winner had 75 or more **at the start of the round**. Crossing 75 during a round doesn't protect the player until the next round. The engine stores this as `Player.roundStartScore` (set in `startNewHand`) and passes it to `calculateTrickPoints`; bots (`Bot.chooseCardToPlay`) and the "Hukum Protected" badge (`getScoreZone(score, roundStartScore)`) use it too.
  - Winning 0 Ser in a full round gives **-5** ("Zero Ser"). Scores can go negative.
  - A player at 90 or more can't receive ♥ in the pass.
  - The game ends as soon as any player reaches 100 or more; that player's team loses (`checkGameLoss`).

## Architecture

### Engine (`src/game/GameEngine.ts`)
- Holds the authoritative `FullGameState`. `getClientView(seat)` builds the per-player `ClientGameState`: own hand only, opponents as card counts, plus `legalPlayCardIds`.
- Phases actually used: `PASSING` → `PLAYER_TURN` → (`HAND_COMPLETE` | `GAME_COMPLETE`). The other `GamePhase` values in `types.ts` are unused.
- `playCard()` puts the 4th card on the table and scores the trick, but **does not advance** the turn. The trick stays on the table, and the last player still "has the turn", until `finalizeCompletedTrick()` is called (the server waits 1.4s for the sweep animation). Invariants:
  - `playCard` rejects any card while `currentTrick.cards.length >= 4`. Without this, a double tap became a 5th card and the round could never finish.
  - `finalizeCompletedTrick` is idempotent. It handles Ser 13 (round end, Zero-Ser -5) **before** the 100-point check, so the -5 still applies when the game ends on the last Ser.
  - When the game ends mid-round, it still pushes a `HandScoreResult` with `isPartial: true`, so `handHistory` always adds up to the final scores. The round-wise scorecard depends on this.
- The round change for a player is `finalScores[s] - startScores[s]` (it includes the -5). `trickPointsGained` excludes the -5; don't show it as "round points".

### Server (`server.ts`, `server/src/`)
- `RoomManager` handles lobby rooms (`BGP` + 3 chars). `MatchmakingService` is a simple FIFO queue that starts a game at 4 humans; it doesn't fill with bots. `GameManager` holds active games, bot turns, timers, and broadcasting.
- **Identity:** a user is a stable `profile.id` (`USR_xxxxxx`) stored on the client, not a socket. Clients send it in the Socket.IO **handshake** (`auth: { profile }`), so it is known before any queued event is handled. `user:init` is still accepted, for older mobile builds and for profile edits. Events that arrive before the user is known are held (`socket.use` middleware) and replayed after init.
- **Per-player channel:** every socket of a user joins `player:<id>` (`playerChannel()`). All per-player emits go there, never to a stored socket id, so refreshes, reconnects and late disconnects of old sockets can't strand a player. A user counts as disconnected only when their channel is empty (`isPlayerOnline`).
- **Reconnect:** on (re)connect, `initUser` re-sends the lobby (only for not-yet-started rooms) and, for an active game, `game:started` + `game:stateUpdate`.
- **Session end** (`GameManager.endSession`): removes the game, its timers and its room, and makes all sockets leave the room. All timers check `isActive(engine)` so late bot or trick timers can't push a dead game back to clients. `findSessionByPlayerId` / `getRoomByPlayerId` ignore seats the user handed to a bot ("Replace myself with bot").
- **Host and next round:** online client views carry `hostPlayerId` (may end the game for everyone) and `nextRoundSeatIndex`. That is the seat that may press "Proceed to next round": the host while they're a connected human, otherwise the first connected human (`GameManager.getNextRoundSeat`). `handleNextRound` enforces the same rule. Clients must use these fields, not "seat 0" or the lobby room, which is gone after a refresh. Disconnects and reconnects re-broadcast state so this stays current.
- Matchmaking re-join is refused if the user already has an active game. Clients re-join the queue automatically after a reconnect.
- Heartbeat is `pingInterval`/`pingTimeout` 10s/10s, so dead mobile connections are detected in about 20s.

### Socket events
Typed in `src/game/types.ts` (`ClientToServerEvents` / `ServerToClientEvents`). Main flow:
- **Lobby:** `room:create|join|leave|addBot|removeBot|start`, `matchmaking:join|leave`. Server sends `room:created|joined|updated|error` and `matchmaking:status`.
- **Game:** `game:submitPass`, `game:playCard`, `game:nextRound` (host / seat 0 only), `game:replaceWithBot`, `game:exitAndEnd`, `game:hostEndGame`, `game:sendQuickMessage`. Server sends `game:started`, `game:stateUpdate` (the full client view every time; clients just replace their state), `game:trickCompleted`, `game:ended`, `game:abandoned`, `game:quickMessageReceived`, `error:message`.

### Web client (`src/`)
- `App.tsx` is the view router (`menu | local_bots | room_lobby | online_game`) and owns the socket listeners. `networking/socket.ts` is a singleton socket whose `auth` reads the profile from `localStorage` (`services/storage.ts`) on every connect.
- `components/GameTable.tsx` is used for both online and offline games:
  - It owns the 20s turn timer, which **runs client-side** and auto-plays the first legal card.
  - It has a per-turn action lock (`acquireActionLock` / `playCardOnce`), so rapid taps or the auto-play timer send one action per turn.
- `LocalBotGame.tsx` drives a local `GameEngine` with bots (`game/Bot.ts`) for offline play.
- Scores: `ScoreTable.tsx` is the round-by-round table with Total and Team rows (used by `ScoreBoard` and `GameOverModal`). It exports `getRoundDelta` / `formatDelta`. `RoundSummaryModal` shows the per-round recap.
- `recordGameResult(isWin, zeroSer, gameId)` dedupes by gameId, because reconnecting to a finished game replays its final state.
- Styling: Tailwind v4 via `@tailwindcss/vite`, configured only in `src/index.css`:
  - `@theme` defines the custom `xs:` breakpoint (400px).
  - Safe-area utilities `pt-safe`/`pb-safe`/`px-safe`, and `no-scrollbar`.
  - A small stand-in for the `tw-animate-css` enter classes (`animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-*`). That package isn't installed, so only those listed variants exist.
- Layout: the app root is `h-dvh` and views fill it with `flex-1 min-h-0`. Don't add `h-screen`, which leaves the bottom of the table under mobile browser bars. Fixed-height bars that also take safe-area padding use `box-content`.
- **Responsive web (any device).** Widths use the normal breakpoints (`xs` 400, `sm`, `md`, `xl`). Heights use custom variants from `index.css`:
  - `short:` means max-height 560px, i.e. phones in landscape.
  - `compact:` means max-height 820px *and* landscape, i.e. laptops and landscape phones. It's landscape-only so portrait phones keep the stacked layout.
  - `tall:` means min-height 900px, used for the desktop score HUD.
- The game table is a column:
  - header, north seat, middle row (`flex-1 min-h-0`), south row.
  - `TrickArea` takes `h-full` with `max-h-*` caps, so the trick oval shrinks into whatever height is left.
  - On `compact`, your seat sits beside the hand instead of above it, and the footer and the lead-suit/target panel hide. On `short`, cards, header, felt frame and avatars shrink.
  - Taunt sits top-right, because at the bottom it covered cards.
- Check layout changes with `scripts/responsive-check.mjs` across phone portrait (320x568, 390x844), phone landscape (568x320, 740x360, 932x430), tablet (768x1024) and desktop (1280x720, 1366x768, 1920x1080). The script reports anything outside the viewport; look at the screenshots too, for overlaps.
- Modals are `fixed inset-0 z-50` overlays. Give the card `max-h-full overflow-y-auto` so buttons stay reachable on landscape phones (~360px tall).
- Callbacks passed into countdown components (`PassingPanel.onAutoSelect`, `PassedCardsModal.onClose`) must keep a stable identity (`useCallback` + ref), because those effects restart their timers when the callback changes.

### Mobile client (`mobile/`)
- `App.js` (menu, lobby, view routing, socket listeners) and `src/components/MobileGameTable.js` mirror the web UI in React Native. The game screen is locked to landscape (`expo-screen-orientation`).
- The profile `{ id, name, serverUrl }` is persisted with `@react-native-async-storage/async-storage` (`src/storage/profile.js`). The socket connects at launch with that profile in the handshake, so reopening the app restores the room or game.
- The default server URL is `https://begipakad.bom1.is.cool` (`App.js`); it can be changed in Settings.
- Safe areas: `App` wraps everything in `SafeAreaProvider`; screens use `SafeAreaView` from `react-native-safe-area-context`. React Native's own `SafeAreaView` is iOS-only, and Android draws edge-to-edge.
- iOS shows only one RN `<Modal>` at a time, so `MobileGameTable` renders a single `topModal` by priority (game over, then round recap, then received cards, then exit, then score); game events close the score and exit sheets. Keep new game-screen modals in that list.
- Menu modals with text inputs (`App.js` Join Room, Settings) sit in a `KeyboardAvoidingView` (`padding` on iOS, no `behavior` on Android, per the Expo keyboard guide) plus a `ScrollView`.
- Every `<Modal>` needs `onRequestClose` (Android back button). Modals shown on the landscape game screen need `supportedOrientations` and must scroll (`GameModals.js` uses a `ScrollView` box), since the screen is only ~360dp tall.
- The round recap closes for everyone when the phase leaves `HAND_COMPLETE`, not only for the player who pressed Continue.
- "Play with Bots" is a placeholder on mobile.

## Gotchas
- `GameEngine` and the rules are shared by the server and the offline web game. A rule change affects both, and the mobile app gets it from the server for free.
- Never key per-player server emits by socket id. Use `playerChannel(id)`.
- Any new server timer must check `isActive(engine)` before touching state or broadcasting.
- Turn timeout: clients run a 20s countdown. The server enforces an authoritative fallback turn timeout (22s online, 32s on trick 1 lead with modal, 8s if disconnected) via `checkAndExecuteTurn`, auto-playing a legal card using `BotAI` if the client does not play.
- `src/` and `mobile/` duplicate UI logic (round recap, score table, action lock). When fixing one, check the other.
- **Known UI gap (mobile app only):** the native `MobileGameTable` in landscape (~740x360dp) is taller than the screen, so the trick centre and hand overlap or get clipped. It needs `useWindowDimensions`-based sizing like the web's `short`/`compact` layout, checked on a device.
- `@google/genai` and `GEMINI_API_KEY` come from the AI Studio template and are unused. `README.md` is still the template README.
- No network in some sandboxes: `npm ci` needs registry access. Without it, a cached `tsx`/`esbuild` may exist under `~/.npm/_npx/*/node_modules/.bin/` for running tests or syntax-checking, but no type-check or Tailwind build.

## Deploying a change
1. Server + web: `npm run build` and redeploy the Node server. Server-side fixes reach mobile users without an app update.
2. Mobile: changes in `mobile/` need a new APK. Put it in `public/BegiPakad.apk`, which the server serves at `/BegiPakad.apk` and the menu links to.
