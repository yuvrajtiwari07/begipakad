import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput,
  Modal, ScrollView, StatusBar, ActivityIndicator,
  Animated, Dimensions, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
// react-native's own SafeAreaView is iOS-only; Android (edge-to-edge) needs this one
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getSocket, setSocketProfile } from './src/networking/socket.js';
import { loadProfile, saveProfile } from './src/storage/profile.js';
import MobileGameTable from './src/components/MobileGameTable.js';

const { width: SW } = Dimensions.get('window');

const DEFAULT_SERVER_URL = 'https://begipakad.bom1.is.cool';

// Expo keyboard guide: 'padding' works best on iOS; on Android the view alone keeps inputs visible
const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : undefined;

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [view, setView] = useState('menu'); // menu | room_lobby | game
  const [profile, setProfile] = useState(null); // { id, name, serverUrl } persisted on device
  const [draftName, setDraftName] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [gameState, setGameState] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [mmCount, setMmCount] = useState(1);
  const [joinInput, setJoinInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const errorTimerRef = useRef(null);
  const isMatchmakingRef = useRef(false);
  isMatchmakingRef.current = isMatchmaking;

  const playerName = profile ? profile.name : '';
  const serverUrl = (profile && profile.serverUrl) || DEFAULT_SERVER_URL;

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  useEffect(() => {
    if (view === 'game') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    } else {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
  }, [view]);

  const showError = (msg) => {
    setErrorMsg(msg);
    // A newer error gets its full 4s instead of being cleared by the older timer
    clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 4000);
  };

  // Connect as soon as the profile is known, so the server can put us back into
  // our room or game right after the app is (re)opened.
  useEffect(() => {
    if (!profile) return;
    setSocketProfile(profile);
    const socket = getSocket(serverUrl);
    const myId = profile.id;

    const onConnect = () => {
      setIsConnected(true);
      // The server drops us from the queue when the connection is lost (e.g. app
      // backgrounded); rejoin so matchmaking keeps going after a reconnect.
      if (isMatchmakingRef.current) socket.emit('matchmaking:join');
    };
    const onDisconnect = () => setIsConnected(false);
    const onRoom = (room) => { setRoomInfo(room); setIsHost(room.hostPlayerId === myId); setView('room_lobby'); };
    const onRoomUpdated = (room) => { setRoomInfo(room); setIsHost(room.hostPlayerId === myId); };
    const onRoomClosed = (msg) => { showError(msg); setRoomInfo(null); setGameState(null); setView('menu'); };
    const onMatchmakingStatus = (st) => { setIsMatchmaking(st.inQueue); setMmCount(st.playersCount); };
    const onGameStarted = (state) => { setIsMatchmaking(false); setGameState(state); setView('game'); };
    const onStateUpdate = (state) => { setGameState(state); setView(v => v === 'room_lobby' ? 'game' : v); };
    const onAbandoned = (p) => { showError(p.message); setGameState(null); setRoomInfo(null); setIsHost(false); setView('menu'); };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:created', onRoom);
    socket.on('room:joined', onRoom);
    socket.on('room:updated', onRoomUpdated);
    socket.on('room:closed', onRoomClosed);
    socket.on('room:error', showError);
    socket.on('matchmaking:status', onMatchmakingStatus);
    socket.on('game:started', onGameStarted);
    socket.on('game:stateUpdate', onStateUpdate);
    socket.on('game:abandoned', onAbandoned);
    socket.on('error:message', showError);

    // Already connected (e.g. name changed in settings): push the new profile
    if (socket.connected) {
      socket.emit('user:init', { id: profile.id, name: profile.name, avatarSeed: 'avatar_1' });
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:created', onRoom);
      socket.off('room:joined', onRoom);
      socket.off('room:updated', onRoomUpdated);
      socket.off('room:closed', onRoomClosed);
      socket.off('room:error', showError);
      socket.off('matchmaking:status', onMatchmakingStatus);
      socket.off('game:started', onGameStarted);
      socket.off('game:stateUpdate', onStateUpdate);
      socket.off('game:abandoned', onAbandoned);
      socket.off('error:message', showError);
    };
  }, [profile, serverUrl]);

  const openSettings = () => {
    setDraftName(playerName);
    setDraftUrl(serverUrl);
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    const name = draftName.trim() || playerName;
    const url = draftUrl.trim() || DEFAULT_SERVER_URL;
    const updated = { ...profile, name, serverUrl: url === DEFAULT_SERVER_URL ? null : url };
    setProfile(updated);
    saveProfile(updated);
    setShowSettings(false);
  };

  const handleCreateRoom = () => { const s = getSocket(serverUrl); s.emit('room:create'); };
  const handleJoinRoom = () => {
    if (!joinInput.trim()) return;
    const s = getSocket(serverUrl); s.emit('room:join', joinInput.trim().toUpperCase());
    setShowJoinModal(false); setJoinInput('');
  };
  const handleMatchmaking = () => { const s = getSocket(serverUrl); s.emit('matchmaking:join'); setIsMatchmaking(true); };
  const handleCancelMM = () => { const s = getSocket(serverUrl); s.emit('matchmaking:leave'); setIsMatchmaking(false); };
  const handleLeaveRoom = () => { const s = getSocket(serverUrl); s.emit('room:leave'); setRoomInfo(null); setView('menu'); };
  const handleAddBot = (seat) => { const s = getSocket(serverUrl); s.emit('room:addBot', seat, 'medium'); };
  const handleRemoveBot = (seat) => { const s = getSocket(serverUrl); s.emit('room:removeBot', seat); };
  const handleStartGame = () => { const s = getSocket(serverUrl); s.emit('room:start'); };
  const handlePlayCard = (id) => { const s = getSocket(serverUrl); s.emit('game:playCard', id); };
  const handleSubmitPass = (ids) => { const s = getSocket(serverUrl); s.emit('game:submitPass', ids); };
  const handleAutoPass = () => {
    if (!gameState) return;
    const recSeat = (gameState.mySeatIndex + 1) % 4;
    const rec = gameState.players.find(p => p.seatIndex === recSeat);
    const eligible = rec && rec.score >= 90 ? gameState.myHand.filter(c => !c.isPaan) : [...gameState.myHand];
    const sorted = eligible.sort((a, b) => b.rankValue - a.rankValue);
    handleSubmitPass(sorted.slice(0, 5).map(c => c.id));
  };
  const handleReplaceBot = () => { const s = getSocket(serverUrl); s.emit('game:replaceWithBot'); };
  const handleExitEnd = () => { const s = getSocket(serverUrl); s.emit('game:exitAndEnd'); };
  const handleHostEnd = () => { const s = getSocket(serverUrl); s.emit('game:hostEndGame'); };
  const handleQuickMsg = (text) => { const s = getSocket(serverUrl); s.emit('game:sendQuickMessage', text); };
  const handleExitToMenu = () => {
    const s = getSocket(serverUrl);
    s.emit('room:leave');
    s.emit('matchmaking:leave');
    setView('menu'); setGameState(null); setRoomInfo(null); setIsMatchmaking(false); setIsHost(false);
  };

  if (!profile) {
    return (
      <SafeAreaView style={[s.bg, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  const errorBanner = errorMsg && (
    <View style={s.errorBanner} pointerEvents="none"><Text style={s.errorText}>{errorMsg}</Text></View>
  );

  const reconnectBanner = !isConnected && view !== 'menu' && (
    <View style={s.reconnectBanner} pointerEvents="none">
      <Text style={s.reconnectText}>Connection lost. Reconnecting…</Text>
    </View>
  );

  if (view === 'game' && gameState) {
    return (
      <View style={{ flex: 1 }}>
      <MobileGameTable
        gameState={gameState}
        onPlayCard={handlePlayCard}
        onSubmitPass={handleSubmitPass}
        onAutoPass={handleAutoPass}
        onLeaveGame={handleExitToMenu}
        onReplaceWithBot={handleReplaceBot}
        onExitAndEndGame={handleExitEnd}
        onHostEndGame={handleHostEnd}
        onSendQuickMessage={handleQuickMsg}
        isHost={gameState.hostPlayerId ? gameState.hostPlayerId === profile.id : isHost}
        serverUrl={serverUrl}
      />
      {errorBanner}
      {reconnectBanner}
      </View>
    );
  }

  if (view === 'room_lobby' && roomInfo) {
    return (
      <View style={{ flex: 1 }}>
        <RoomLobby room={roomInfo} currentUserId={profile.id} isHost={isHost}
          onLeave={handleLeaveRoom} onAddBot={handleAddBot} onRemoveBot={handleRemoveBot}
          onStart={handleStartGame} errorMsg={errorMsg} />
        {reconnectBanner}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {errorMsg && <View style={s.errorBanner}><Text style={s.errorText}>{errorMsg}</Text></View>}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.topBar}>
          <View style={s.profilePill}>
            <View style={s.avatar}><Text style={s.avatarText}>{playerName.slice(0,2).toUpperCase()}</Text></View>
            <Text style={s.profileName} numberOfLines={1}>{playerName}</Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={openSettings}>
            <Text style={s.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Branding */}
        <View style={s.hero}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>BP</Text>
            <View style={s.crownBadge}><Text style={{fontSize:10}}>👑</Text></View>
          </View>
          <Text style={s.heroTitle}>Begi Pakad</Text>
          <Text style={s.heroSub}>Standard 4-player team card game. Avoid Begum Hukum (Q♠) and Paan (♥)!</Text>
        </View>

        {/* Action Buttons */}
        <View style={s.actions}>
          {/* Play With Bots - info banner */}
          <View style={s.botCard}>
            <TouchableOpacity style={s.primaryBtn} onPress={() => {}}>
              <Text style={s.primaryBtnLeft}>🤖  PLAY WITH BOTS</Text>
              <Text style={s.arrowText}>▶</Text>
            </TouchableOpacity>
            <Text style={s.botNote}>Coming soon on mobile — play on web now!</Text>
          </View>

          {/* Create Room */}
          <TouchableOpacity style={s.menuBtn} onPress={handleCreateRoom}>
            <View style={s.menuBtnLeft}>
              <View style={[s.menuIcon, {backgroundColor:'rgba(99,102,241,0.2)'}]}><Text>➕</Text></View>
              <Text style={s.menuBtnText}>Create Private Room</Text>
            </View>
            <Text style={s.menuBtnBadge}>BGP Code</Text>
          </TouchableOpacity>

          {/* Join Room */}
          <TouchableOpacity style={s.menuBtn} onPress={() => { setJoinInput(''); setShowJoinModal(true); }}>
            <View style={s.menuBtnLeft}>
              <View style={[s.menuIcon, {backgroundColor:'rgba(16,185,129,0.2)'}]}><Text>🚪</Text></View>
              <Text style={s.menuBtnText}>Join Room</Text>
            </View>
            <Text style={s.arrowText}>▶</Text>
          </TouchableOpacity>

          {/* Random Match */}
          <TouchableOpacity style={s.menuBtn} onPress={isMatchmaking ? handleCancelMM : handleMatchmaking}>
            <View style={s.menuBtnLeft}>
              <View style={[s.menuIcon, {backgroundColor:'rgba(245,158,11,0.2)'}]}><Text>🔀</Text></View>
              <View>
                <Text style={s.menuBtnText}>Random Matchmaking</Text>
                {isMatchmaking && <Text style={s.matchNote}>{mmCount}/4 Players in queue...</Text>}
              </View>
            </View>
            {isMatchmaking
              ? <ActivityIndicator size="small" color="#F59E0B" />
              : <Text style={s.mmBadge}>Queue</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>© 2026 Begi Pakad • Cross-Platform Multiplayer</Text>
      </ScrollView>

      {/* Join Room Modal */}
      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <KeyboardAvoidingView style={s.keyboardAvoid} behavior={KEYBOARD_BEHAVIOR}>
        <ScrollView contentContainerStyle={s.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Join Private Room</Text>
            <Text style={s.modalSub}>Enter 6-character Room ID</Text>
            <TextInput
              style={s.codeInput} value={joinInput}
              onChangeText={t => setJoinInput(t.toUpperCase())}
              placeholder="e.g. BGP482" placeholderTextColor="#475569"
              autoCapitalize="characters" maxLength={8}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowJoinModal(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.joinBtn, !joinInput.trim() && {opacity:0.5}]} onPress={handleJoinRoom} disabled={!joinInput.trim()}>
                <Text style={s.joinBtnText}>Join Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <KeyboardAvoidingView style={s.keyboardAvoid} behavior={KEYBOARD_BEHAVIOR}>
        <ScrollView contentContainerStyle={s.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Settings</Text>
            <Text style={s.inputLabel}>Your Name</Text>
            <TextInput style={s.textInput} value={draftName} onChangeText={setDraftName} placeholder="Your name" placeholderTextColor="#475569" />
            <Text style={s.inputLabel}>Backend Server URL</Text>
            <TextInput style={s.textInput} value={draftUrl} onChangeText={setDraftUrl} placeholder="https://..." placeholderTextColor="#475569" autoCapitalize="none" />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowSettings(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.joinBtn} onPress={handleSaveSettings}>
                <Text style={s.joinBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function RoomLobby({ room, currentUserId, isHost, onLeave, onAddBot, onRemoveBot, onStart, errorMsg }) {
  const shareRoomId = () => {
    Share.share({ message: `Join my Begi Pakad room: ${room.roomId}` }).catch(() => {});
  };
  const isFull = room.players.length === 4;
  const seatSlots = [0,1,2,3].map(i => ({ seat: i, player: room.players.find(p => p.seatIndex === i), team: i%2===0?1:2 }));

  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {errorMsg && <View style={s.errorBanner}><Text style={s.errorText}>{errorMsg}</Text></View>}
      <ScrollView contentContainerStyle={{padding:16, gap:12}}>
        {/* Header */}
        <View style={s.lobbyHeader}>
          <TouchableOpacity style={s.backBtn} onPress={onLeave}>
            <Text style={s.backBtnText}>◀ Leave Room</Text>
          </TouchableOpacity>
          <View style={s.playerCountBadge}>
            <Text style={s.playerCountText}>👥 {room.players.length}/4</Text>
          </View>
        </View>

        {/* Room Code */}
        <View style={s.roomCodeCard}>
          <Text style={s.roomCodeLabel}>Share this Room ID with friends</Text>
          <View style={{flexDirection:'row', alignItems:'center', gap:12, marginTop:6}}>
            <Text style={s.roomCode}>{room.roomId}</Text>
            <TouchableOpacity style={s.copyBtn} onPress={shareRoomId}>
              <Text style={s.copyBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seats */}
        <Text style={s.sectionLabel}>Player Seating & Teams</Text>
        {seatSlots.map(({ seat, player, team }) => (
          <View key={seat} style={[s.seatRow, player?.id === currentUserId && s.seatRowMe]}>
            <View style={[s.seatAvatar, team===1 ? s.team1Avatar : s.team2Avatar]}>
              <Text style={s.seatAvatarText}>{player ? (player.isBot ? '🤖' : player.name.slice(0,2).toUpperCase()) : `P${seat+1}`}</Text>
            </View>
            <View style={{flex:1}}>
              <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                <Text style={s.seatName}>{player ? player.name : `Seat ${seat+1}`}</Text>
                <View style={[s.teamBadge, team===1 ? s.team1Badge : s.team2Badge]}>
                  <Text style={[s.teamBadgeText, team===2 && {color:'#0F172A'}]}>Team {team}</Text>
                </View>
              </View>
              <Text style={s.seatStatus}>{player ? (player.id===room.hostPlayerId ? '👑 Room Host' : player.isBot ? '🤖 AI Bot' : 'Connected') : 'Waiting...'}</Text>
            </View>
            {!player && isHost && (
              <TouchableOpacity style={s.addBotBtn} onPress={() => onAddBot(seat)}>
                <Text style={s.addBotText}>+ Bot</Text>
              </TouchableOpacity>
            )}
            {player?.isBot && isHost && (
              <TouchableOpacity onPress={() => onRemoveBot(seat)}>
                <Text style={{color:'#F87171', fontSize:18}}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Start / Waiting */}
        {isHost ? (
          <TouchableOpacity
            style={[s.startBtn, !isFull && s.startBtnDisabled]}
            onPress={isFull ? onStart : null}
            disabled={!isFull}
          >
            <Text style={s.startBtnText}>{isFull ? '▶  START MATCH NOW' : 'WAITING FOR 4 PLAYERS...'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.waitingBox}>
            <Text style={s.waitingText}>Waiting for host to start the match...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex:1, backgroundColor:'#0F172A' },
  scroll: { padding:20, gap:20, flexGrow:1 },
  errorBanner: { position:'absolute', top:60, left:16, right:16, zIndex:100, backgroundColor:'#DC2626', padding:12, borderRadius:12, borderWidth:1, borderColor:'#F87171' },
  errorText: { color:'#FFF', fontSize:12, fontWeight:'bold', textAlign:'center' },
  reconnectBanner: { position:'absolute', top:12, alignSelf:'center', zIndex:100, backgroundColor:'rgba(69,26,3,0.92)', paddingHorizontal:14, paddingVertical:8, borderRadius:999, borderWidth:1, borderColor:'rgba(245,158,11,0.5)' },
  reconnectText: { color:'#FDE68A', fontSize:12, fontWeight:'bold' },
  topBar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  profilePill: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', borderRadius:999, paddingHorizontal:12, paddingVertical:6 },
  avatar: { width:24, height:24, borderRadius:12, backgroundColor:'#6366F1', justifyContent:'center', alignItems:'center' },
  avatarText: { color:'#FFF', fontSize:10, fontWeight:'900' },
  profileName: { color:'#CBD5E1', fontSize:12, fontWeight:'600', maxWidth:100 },
  iconBtn: { padding:8, backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', borderRadius:12 },
  iconBtnText: { fontSize:16 },
  hero: { alignItems:'center', gap:8 },
  logoBox: { width:64, height:64, borderRadius:16, backgroundColor:'#6366F1', justifyContent:'center', alignItems:'center', shadowColor:'#6366F1', shadowOpacity:0.4, shadowRadius:12, elevation:8, position:'relative' },
  logoText: { color:'#FFF', fontSize:22, fontWeight:'900', letterSpacing:-1 },
  crownBadge: { position:'absolute', bottom:-4, right:-4, width:22, height:22, borderRadius:11, backgroundColor:'#F59E0B', justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:'#0F172A' },
  heroTitle: { color:'#FFF', fontSize:32, fontWeight:'900', letterSpacing:-0.5, marginTop:4 },
  heroSub: { color:'#64748B', fontSize:12, textAlign:'center', maxWidth:280, lineHeight:18 },
  actions: { gap:10, width:'100%' },
  botCard: { backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', borderRadius:20, padding:14, gap:8 },
  primaryBtn: { backgroundColor:'#6366F1', borderRadius:14, paddingVertical:14, paddingHorizontal:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center', shadowColor:'#6366F1', shadowOpacity:0.4, shadowRadius:8, elevation:6 },
  primaryBtnLeft: { color:'#FFF', fontWeight:'900', fontSize:14 },
  arrowText: { color:'#FFF', fontSize:12 },
  botNote: { color:'#64748B', fontSize:11, textAlign:'center' },
  menuBtn: { backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', borderRadius:20, paddingVertical:14, paddingHorizontal:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  menuBtnLeft: { flexDirection:'row', alignItems:'center', gap:10, flex:1 },
  menuIcon: { width:32, height:32, borderRadius:8, justifyContent:'center', alignItems:'center' },
  menuBtnText: { color:'#FFF', fontWeight:'700', fontSize:14 },
  menuBtnBadge: { color:'#A5B4FC', fontSize:10, fontWeight:'600', backgroundColor:'rgba(99,102,241,0.15)', paddingHorizontal:8, paddingVertical:2, borderRadius:6, borderWidth:1, borderColor:'rgba(99,102,241,0.3)' },
  matchNote: { color:'#F59E0B', fontSize:10, marginTop:2 },
  mmBadge: { color:'#FCD34D', fontSize:10, fontWeight:'600', backgroundColor:'rgba(245,158,11,0.15)', paddingHorizontal:8, paddingVertical:2, borderRadius:6, borderWidth:1, borderColor:'rgba(245,158,11,0.3)' },
  footer: { color:'#334155', fontSize:10, textAlign:'center', marginTop:8 },
  // Modal
  keyboardAvoid: { flex:1, backgroundColor:'rgba(0,0,0,0.8)' },
  modalOverlay: { flexGrow:1, justifyContent:'center', alignItems:'center', padding:20 },
  modalBox: { width:'100%', maxWidth:360, backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', borderRadius:24, padding:24, gap:12 },
  modalTitle: { color:'#FFF', fontSize:18, fontWeight:'900' },
  modalSub: { color:'#64748B', fontSize:12, marginTop:-6 },
  codeInput: { backgroundColor:'#0F172A', borderWidth:1, borderColor:'#334155', borderRadius:16, paddingVertical:14, paddingHorizontal:16, color:'#818CF8', fontSize:22, fontWeight:'900', textAlign:'center', letterSpacing:8 },
  textInput: { backgroundColor:'#0F172A', borderWidth:1, borderColor:'#334155', borderRadius:12, paddingVertical:12, paddingHorizontal:16, color:'#FFF', fontSize:14 },
  inputLabel: { color:'#94A3B8', fontSize:12, fontWeight:'700' },
  modalBtns: { flexDirection:'row', gap:8, marginTop:4 },
  cancelBtn: { flex:1, paddingVertical:12, backgroundColor:'#0F172A', borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#334155' },
  cancelBtnText: { color:'#94A3B8', fontWeight:'700', fontSize:13 },
  joinBtn: { flex:1, paddingVertical:12, backgroundColor:'#6366F1', borderRadius:12, alignItems:'center', shadowColor:'#6366F1', shadowOpacity:0.4, shadowRadius:6, elevation:5 },
  joinBtnText: { color:'#FFF', fontWeight:'900', fontSize:13 },
  // Lobby
  lobbyHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  backBtn: { backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', borderRadius:10, paddingHorizontal:12, paddingVertical:8 },
  backBtnText: { color:'#CBD5E1', fontSize:12, fontWeight:'700' },
  playerCountBadge: { backgroundColor:'rgba(99,102,241,0.2)', borderWidth:1, borderColor:'rgba(99,102,241,0.4)', borderRadius:99, paddingHorizontal:12, paddingVertical:4 },
  playerCountText: { color:'#A5B4FC', fontSize:12, fontWeight:'700' },
  roomCodeCard: { backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', borderRadius:16, padding:16, alignItems:'center' },
  roomCodeLabel: { color:'#64748B', fontSize:12 },
  roomCode: { color:'#818CF8', fontSize:28, fontWeight:'900', fontFamily:'monospace', letterSpacing:4 },
  copyBtn: { backgroundColor:'#6366F1', paddingHorizontal:14, paddingVertical:8, borderRadius:10 },
  copyBtnText: { color:'#FFF', fontWeight:'700', fontSize:12 },
  sectionLabel: { color:'#64748B', fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:1 },
  seatRow: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', borderRadius:14, padding:12 },
  seatRowMe: { borderColor:'#6366F1', shadowColor:'#6366F1', shadowOpacity:0.2, shadowRadius:6, elevation:4 },
  seatAvatar: { width:40, height:40, borderRadius:20, justifyContent:'center', alignItems:'center' },
  team1Avatar: { backgroundColor:'#6366F1' },
  team2Avatar: { backgroundColor:'#D97706' },
  seatAvatarText: { color:'#FFF', fontWeight:'900', fontSize:12 },
  seatName: { color:'#FFF', fontWeight:'700', fontSize:13 },
  teamBadge: { paddingHorizontal:6, paddingVertical:2, borderRadius:4 },
  team1Badge: { backgroundColor:'#1E1B4B' },
  team2Badge: { backgroundColor:'#78350F' },
  teamBadgeText: { color:'#A5B4FC', fontSize:9, fontWeight:'700' },
  seatStatus: { color:'#64748B', fontSize:11, marginTop:2 },
  addBotBtn: { backgroundColor:'rgba(99,102,241,0.2)', borderWidth:1, borderColor:'rgba(99,102,241,0.5)', paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  addBotText: { color:'#A5B4FC', fontWeight:'700', fontSize:11 },
  startBtn: { backgroundColor:'#6366F1', borderRadius:16, paddingVertical:16, alignItems:'center', marginTop:4, shadowColor:'#6366F1', shadowOpacity:0.5, shadowRadius:10, elevation:8 },
  startBtnDisabled: { backgroundColor:'#1E293B', borderWidth:1, borderColor:'#334155', shadowOpacity:0 },
  startBtnText: { color:'#FFF', fontWeight:'900', fontSize:14 },
  waitingBox: { backgroundColor:'#1E293B', borderRadius:14, padding:16, alignItems:'center', borderWidth:1, borderColor:'#334155' },
  waitingText: { color:'#64748B', fontSize:13, fontWeight:'600' },
});
