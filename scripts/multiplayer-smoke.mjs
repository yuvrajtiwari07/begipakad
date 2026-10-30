// Multiplayer smoke test against a running server (npm run dev, or npm start after a build).
// Drives 4 Socket.IO clients through a full online round plus the failure cases fixed before:
// refresh mid-game, late disconnect of an old socket, double-tapping the 4th card, legacy
// clients that emit actions before user:init, next-round control, replace-with-bot, leaving,
// and matchmaking.
//
//   node scripts/multiplayer-smoke.mjs [http://localhost:3000]
import { io } from 'socket.io-client';

const URL = process.argv[2] || 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};
const waitFor = async (pred, msg, timeout = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (pred()) return true;
    await sleep(25);
  }
  check(false, `timed out: ${msg}`);
  return false;
};

const runId = Date.now().toString(36).toUpperCase();
const clients = [];

// legacy = behaves like older app builds: no handshake identity, user:init sent on connect
function makeClient(name, { legacy = false } = {}) {
  const c = { name, legacy, profile: { id: `USR_${name}${runId}`, name, avatarSeed: 'avatar_1' }, state: null, room: null, mm: null, started: 0, errors: [], abandoned: false };
  c.connect = () => {
    const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false, ...(legacy ? {} : { auth: { profile: c.profile } }) });
    if (legacy) s.on('connect', () => s.emit('user:init', c.profile));
    s.on('game:started', (st) => { c.state = st; c.started++; });
    s.on('game:stateUpdate', (st) => { c.state = st; });
    for (const ev of ['room:created', 'room:joined', 'room:updated']) s.on(ev, (r) => { c.room = r; });
    s.on('matchmaking:status', (st) => { c.mm = st; });
    s.on('error:message', (m) => c.errors.push(m));
    s.on('room:error', (m) => c.errors.push(m));
    s.on('game:abandoned', () => { c.abandoned = true; });
    c.socket = s;
    return s;
  };
  clients.push(c);
  return c;
}

const allPhase = (cs, phase) => cs.every((c) => c.state?.phase === phase);

// ---------- Room setup ----------
const A = makeClient('A');
const B = makeClient('B');
const C = makeClient('C');
const D = makeClient('D', { legacy: true });
A.connect();
await waitFor(() => A.socket.connected, 'A connects');
A.socket.emit('room:create');
await waitFor(() => A.room, 'room created');
const roomId = A.room.roomId;
B.connect(); B.socket.emit('room:join', roomId);
C.connect(); C.socket.emit('room:join', roomId);
// Legacy client: room:join is buffered and sent BEFORE user:init (old mobile first-tap bug)
D.connect(); D.socket.emit('room:join', roomId);
await waitFor(() => A.room?.players.length === 4, '4 players in the lobby');
check(Boolean(D.room), 'legacy client that joined before user:init ends up in the room');

A.socket.emit('room:start');
const players = [A, B, C, D];
await waitFor(() => allPhase(players, 'PASSING'), 'all clients receive the game in PASSING');
check(players.every((c) => c.state.hostPlayerId === A.profile.id), 'client views carry hostPlayerId');
check(players.every((c) => c.state.nextRoundSeatIndex === A.state.mySeatIndex), 'host controls the next round');
check(B.state.passingState.timeRemainingSeconds <= 120 && B.state.passingState.timeRemainingSeconds > 100, 'passing countdown comes from the server deadline');
const lowestRound1StartScore = Math.min(...A.state.players.map((p) => p.roundStartScore ?? -1));
check(lowestRound1StartScore === 0, 'players carry roundStartScore');

// ---------- Passing ----------
for (const c of players) c.socket.emit('game:submitPass', c.state.myHand.slice(0, 5).map((card) => card.id));
await waitFor(() => allPhase(players, 'PLAYER_TURN'), 'all passed, play starts');

// ---------- Play a full round ----------
const bySeat = () => Object.fromEntries(players.map((c) => [c.state.mySeatIndex, c]));
let doubleTapChecked = false;
let refreshChecked = false;
let lateDisconnectChecked = false;
for (let play = 0; play < 52; play++) {
  const ref = A.state;
  if (ref.phase !== 'PLAYER_TURN') break;
  const turn = bySeat()[ref.currentTurnSeatIndex];
  await waitFor(() => turn.state.currentTurnSeatIndex === turn.state.mySeatIndex && turn.state.legalPlayCardIds.length > 0 && turn.state.currentTrick.cards.length < 4, `${turn.name} gets the turn`);
  const st = turn.state;
  const handBefore = st.myHand.length;
  const trickBefore = st.currentTrick.cards.length;
  const cardId = st.legalPlayCardIds[0];
  turn.socket.emit('game:playCard', cardId);
  if (trickBefore === 3 && !doubleTapChecked) {
    // Rapid double tap on the 4th card: second card must be rejected, not added as a 5th
    const extra = st.myHand.find((card) => card.id !== cardId);
    turn.errors.length = 0;
    turn.socket.emit('game:playCard', extra.id);
    await waitFor(() => turn.errors.length > 0, 'double tap rejected');
    await waitFor(() => turn.state.myHand.length === handBefore - 1, 'only one card left the hand');
    check(turn.state.myHand.length === handBefore - 1 && turn.state.currentTrick.cards.length <= 4, 'double tap on the 4th card plays exactly one card');
    doubleTapChecked = true;
  }
  await waitFor(() => turn.state.myHand.length === handBefore - 1, `${turn.name}'s card is accepted`);
  if (trickBefore === 3) {
    await waitFor(() => A.state.currentTrick.cards.length === 0 || A.state.phase !== 'PLAYER_TURN', 'trick is collected', 4000);
  }

  // After the 3rd Ser: B refreshes the page (new socket, same profile)
  if (!refreshChecked && A.state.currentTrickNumber === 4 && A.state.currentTrick.cards.length === 0) {
    const startedBefore = B.started;
    B.socket.disconnect();
    await sleep(100);
    B.connect();
    await waitFor(() => B.started > startedBefore, 'refreshed client gets game:started');
    check(B.state.myHand.length === 10 && B.state.currentTrickNumber === 4, 'refreshed client is back in the same game state');
    refreshChecked = true;
  }
  // After the 6th Ser: C's new socket connects before the old one's disconnect arrives
  if (!lateDisconnectChecked && A.state.currentTrickNumber === 7 && A.state.currentTrick.cards.length === 0) {
    const old = C.socket;
    C.connect();
    await waitFor(() => C.socket.connected && C.started > 0, 'second socket connects');
    old.disconnect();
    await sleep(300);
    lateDisconnectChecked = true;
    const before = C.state.currentTrick.cards.length;
    // the next play must still reach C
    const next = bySeat()[A.state.currentTurnSeatIndex];
    next.socket.emit('game:playCard', next.state.legalPlayCardIds[0]);
    await waitFor(() => C.state.currentTrick.cards.length === before + 1, 'C still receives updates after the old socket disconnects');
    check(A.state.players.find((p) => p.id === C.profile.id)?.isConnected !== false, 'C is not marked disconnected');
  }
}
check(doubleTapChecked && refreshChecked && lateDisconnectChecked, 'refresh, late disconnect and double tap scenarios ran');

await waitFor(() => allPhase(players, 'HAND_COMPLETE') || allPhase(players, 'GAME_COMPLETE'), 'round 1 completes', 15000);
const hand = A.state.handHistory[0];
check(Boolean(hand), 'round 1 is recorded');
if (hand) {
  const gained = Object.values(hand.trickPointsGained).reduce((a, b) => a + b, 0);
  check(gained === 25, `round 1 trick points add up to 25 (13 Paan + 12 Q♠), got ${gained}`);
  const deltasMatch = A.state.players.every((p) => hand.finalScores[p.seatIndex] - hand.startScores[p.seatIndex] === (hand.trickPointsGained[p.seatIndex] + (hand.zeroTrickBonusAwarded[p.seatIndex] ? -5 : 0)));
  check(deltasMatch, 'round change = trick points + Zero-Ser bonus for every player');
  check(A.state.players.every((p) => p.score === hand.finalScores[p.seatIndex]), 'player scores match the recorded round');
}

if (A.state.phase === 'HAND_COMPLETE') {
  // A non-controller can't start the next round
  B.socket.emit('game:nextRound');
  await sleep(400);
  check(A.state.phase === 'HAND_COMPLETE', 'non-host cannot start the next round');

  // Host hands their seat to a bot: someone else must be able to continue
  A.socket.emit('game:replaceWithBot');
  await waitFor(() => B.state.nextRoundSeatIndex !== undefined && B.state.nextRoundSeatIndex !== A.state.mySeatIndex, 'next-round control moves to a human');
  const controller = [B, C, D].find((c) => c.state.mySeatIndex === B.state.nextRoundSeatIndex);
  check(Boolean(controller), 'a remaining human controls the next round');
  controller?.socket.emit('game:nextRound');
  await waitFor(() => [B, C, D].every((c) => c.state.phase === 'PASSING' && c.state.handNumber === 2), 'round 2 starts');
  check([B, C, D].every((c) => c.state.players.every((p) => p.roundStartScore === p.score)), 'round 2 roundStartScore = scores at round start');

  // A leaving player ends the game for everyone
  B.socket.emit('game:exitAndEnd');
  await waitFor(() => C.abandoned && D.abandoned, 'others are told the game ended');
  check(!A.abandoned, 'player replaced by a bot no longer gets events from that game');
}

// ---------- Matchmaking (two legacy clients tap before identifying) ----------
const M = [makeClient('M1'), makeClient('M2', { legacy: true }), makeClient('M3'), makeClient('M4', { legacy: true })];
for (const c of M) { c.connect(); c.socket.emit('matchmaking:join'); await sleep(150); }
await waitFor(() => M.every((c) => c.state?.phase === 'PASSING'), 'matchmaking starts a game for all 4 (incl. legacy clients)');
check(new Set(M.map((c) => c.state?.gameId)).size === 1, 'matched players are in the same game');

for (const c of clients) c.socket?.disconnect();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nALL MULTIPLAYER CHECKS PASSED');
process.exit(failures ? 1 : 0);
