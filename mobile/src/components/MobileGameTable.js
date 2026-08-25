import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { getSocket } from '../networking/socket.js';
import PlayerSeat from './PlayerSeat.js';
import CardHand from './CardHand.js';
import TrickArea from './TrickArea.js';
import PassingPanel from './PassingPanel.js';
import PassedCardsModal from './PassedCardsModal.js';
import { RoundSummaryModal, GameOverModal, ScoreModal, ExitConfirmModal } from './GameModals.js';

const QUICK_MSGS = ['Randi','Lawda','Madarchod','Mauga','chutiya'];

export default function MobileGameTable({ gameState, onPlayCard, onSubmitPass, onAutoPass, onLeaveGame, onReplaceWithBot, onExitAndEndGame, onHostEndGame, onSendQuickMessage, isHost, serverUrl }) {
  const [selectedPassIds, setSelectedPassIds] = useState([]);
  const [showScore, setShowScore] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showMsgMenu, setShowMsgMenu] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [roundSummary, setRoundSummary] = useState(null);
  const [dismissedPassHand, setDismissedPassHand] = useState(null);
  const [toasts, setToasts] = useState({});
  const [turnSecs, setTurnSecs] = useState(20);
  const prevPhase = useRef(null);

  const mySeat = gameState.mySeatIndex;
  const isPassingPhase = gameState.phase === 'PASSING';
  const isTrickFull = gameState.currentTrick.cards.length === 4;
  const isMyTurn = gameState.phase === 'PLAYER_TURN' && gameState.currentTurnSeatIndex === mySeat && !isTrickFull;

  const showPassedModal = Boolean(gameState.lastReceivedPassedCards) && gameState.lastReceivedPassedCards?.handNumber !== dismissedPassHand;
  const passedFromPlayer = gameState.lastReceivedPassedCards ? gameState.players.find(p => p.seatIndex === gameState.lastReceivedPassedCards.fromSeatIndex) : null;

  // Reset pass selection on new hand/phase
  useEffect(() => { setSelectedPassIds([]); }, [gameState.handNumber, gameState.phase]);

  // Show round summary when hand complete
  useEffect(() => {
    if (gameState.phase === 'HAND_COMPLETE' && prevPhase.current !== 'HAND_COMPLETE') {
      const last = gameState.handHistory[gameState.handHistory.length - 1];
      if (last) setRoundSummary(last);
    }
    if (gameState.phase === 'GAME_COMPLETE') setShowGameOver(true);
    prevPhase.current = gameState.phase;
  }, [gameState.phase]);

  // Turn countdown (starts after passed cards modal closes)
  useEffect(() => {
    if (gameState.phase !== 'PLAYER_TURN' || isTrickFull || showPassedModal) {
      if (showPassedModal) setTurnSecs(20);
      return;
    }
    setTurnSecs(20);
    const iv = setInterval(() => setTurnSecs(p => {
      if (p <= 1) { clearInterval(iv); if (isMyTurn && gameState.legalPlayCardIds.length > 0) onPlayCard(gameState.legalPlayCardIds[0]); return 0; }
      return p - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [gameState.phase, gameState.currentTurnSeatIndex, gameState.currentTrickNumber, gameState.handNumber, showPassedModal]);

  // Listen for quick messages from other players
  useEffect(() => {
    const socket = getSocket(serverUrl);
    const handler = ({ senderSeatIndex, text }) => {
      setToasts(t => ({ ...t, [senderSeatIndex]: text }));
      setTimeout(() => setToasts(t => ({ ...t, [senderSeatIndex]: null })), 2000);
    };
    socket.on('game:quickMessageReceived', handler);
    return () => socket.off('game:quickMessageReceived', handler);
  }, [serverUrl]);

  const getPlayerAt = (offset) => gameState.players.find(p => p.seatIndex === (mySeat + offset) % 4);
  const northPlayer = getPlayerAt(2);
  const westPlayer = getPlayerAt(1);
  const eastPlayer = getPlayerAt(3);
  const southPlayer = getPlayerAt(0);

  const validPassIds = selectedPassIds.filter(id => gameState.myHand.some(c => c.id === id));
  const hasPaanInPass = gameState.myHand.filter(c => validPassIds.includes(c.id)).some(c => c.isPaan);
  const recipientPlayer = gameState.players.find(p => p.seatIndex === gameState.passingState.targetRecipientSeatIndex);

  const handleCardClick = (card) => {
    if (isPassingPhase) {
      if (gameState.passingState.hasSubmitted) return;
      if (validPassIds.includes(card.id)) setSelectedPassIds(p => p.filter(id => id !== card.id));
      else if (validPassIds.length < 5) setSelectedPassIds(p => [...p.filter(id => gameState.myHand.some(c => c.id === id)), card.id]);
    } else if (isMyTurn && gameState.legalPlayCardIds.includes(card.id)) {
      onPlayCard(card.id);
    }
  };

  const handleQuickMsg = (msg) => {
    setShowMsgMenu(false);
    if (onSendQuickMessage) onSendQuickMessage(msg);
    setToasts(t => ({ ...t, [mySeat]: msg }));
    setTimeout(() => setToasts(t => ({ ...t, [mySeat]: null })), 2000);
  };

  const team1 = gameState.players.filter(p => p.teamId === 1);
  const team2 = gameState.players.filter(p => p.teamId === 2);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" hidden />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logo}><Text style={s.logoText}>BP</Text></View>
          <View>
            <Text style={s.appName}>Begi Pakad</Text>
            <Text style={s.appMode}>{gameState.roomId ? 'Multiplayer' : 'Local'}</Text>
          </View>
        </View>

        <View style={s.headerCenter}>
          {gameState.roomId ? <Text style={s.statLabel}>Room: <Text style={s.statVal}>{gameState.roomId}</Text></Text> : null}
          <Text style={s.statLabel}>Hand: <Text style={s.statVal}>{String(gameState.handNumber).padStart(2,'0')}/13</Text></Text>
          <Text style={s.statLabel}>Ser: <Text style={[s.statVal,{color:'#34D399'}]}>{String(gameState.currentTrickNumber).padStart(2,'0')}/13</Text></Text>
        </View>

        <View style={s.headerRight}>
          {/* Quick msg */}
          <View style={{position:'relative'}}>
            <TouchableOpacity style={s.iconBtn} onPress={() => setShowMsgMenu(v => !v)}>
              <Text>💬</Text>
            </TouchableOpacity>
            {showMsgMenu && (
              <View style={s.msgMenu}>
                <Text style={s.msgMenuTitle}>SEND TAUNT</Text>
                {QUICK_MSGS.map(msg => (
                  <TouchableOpacity key={msg} style={s.msgItem} onPress={() => handleQuickMsg(msg)}>
                    <Text style={s.msgItemText}>{msg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => setShowScore(true)}><Text>📊</Text></TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn,{borderColor:'#7F1D1D'}]} onPress={() => (onReplaceWithBot || onExitAndEndGame) ? setShowExit(true) : onLeaveGame()}>
            <Text>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── GAME TABLE ── */}
      <View style={s.table}>
        {/* Live score strip */}
        <View style={s.scoreStrip}>
          <Text style={s.scoreStripText}>T1: <Text style={{color:'#818CF8',fontWeight:'900'}}>{team1.reduce((a,p)=>a+p.score,0)}</Text></Text>
          <Text style={s.scoreStripDivider}>|</Text>
          <Text style={s.scoreStripText}>T2: <Text style={{color:'#FCD34D',fontWeight:'900'}}>{team2.reduce((a,p)=>a+p.score,0)}</Text></Text>
        </View>

        {/* NORTH */}
        <View style={s.northRow}>
          {northPlayer && <PlayerSeat player={northPlayer} isCurrentTurn={!isTrickFull && gameState.currentTurnSeatIndex===northPlayer.seatIndex} isSelf={false} cardsCount={gameState.opponentCardCounts[northPlayer.seatIndex]??13} position="top" turnSeconds={gameState.currentTurnSeatIndex===northPlayer.seatIndex?turnSecs:undefined} isTrickWinner={isTrickFull && gameState.currentTrick.winnerSeatIndex===northPlayer.seatIndex} toastMsg={toasts[northPlayer.seatIndex]} />}
        </View>

        {/* MIDDLE ROW */}
        <View style={s.middleRow}>
          {/* WEST */}
          <View style={s.sideCol}>
            {westPlayer && <PlayerSeat player={westPlayer} isCurrentTurn={!isTrickFull && gameState.currentTurnSeatIndex===westPlayer.seatIndex} isSelf={false} cardsCount={gameState.opponentCardCounts[westPlayer.seatIndex]??13} position="left" turnSeconds={gameState.currentTurnSeatIndex===westPlayer.seatIndex?turnSecs:undefined} isTrickWinner={isTrickFull && gameState.currentTrick.winnerSeatIndex===westPlayer.seatIndex} toastMsg={toasts[westPlayer.seatIndex]} />}
          </View>

          {/* CENTER */}
          <View style={s.center}>
            {isPassingPhase && recipientPlayer ? (
              <PassingPanel
                selectedCardIds={validPassIds}
                targetRecipient={recipientPlayer}
                hasSubmitted={gameState.passingState.hasSubmitted}
                timeRemainingSeconds={gameState.passingState.timeRemainingSeconds}
                onPassSubmit={() => validPassIds.length === 5 && onSubmitPass(validPassIds)}
                onAutoSelect={onAutoPass}
                canReceivePaan={gameState.passingState.targetRecipientCanReceivePaan}
                selectedCardsContainPaan={hasPaanInPass}
              />
            ) : (
              <TrickArea
                currentTrick={gameState.currentTrick}
                players={gameState.players}
                mySeatIndex={mySeat}
                lastActionMessage={gameState.lastActionMessage}
                trickNumber={gameState.currentTrickNumber}
              />
            )}
          </View>

          {/* EAST */}
          <View style={s.sideCol}>
            {eastPlayer && <PlayerSeat player={eastPlayer} isCurrentTurn={!isTrickFull && gameState.currentTurnSeatIndex===eastPlayer.seatIndex} isSelf={false} cardsCount={gameState.opponentCardCounts[eastPlayer.seatIndex]??13} position="right" turnSeconds={gameState.currentTurnSeatIndex===eastPlayer.seatIndex?turnSecs:undefined} isTrickWinner={isTrickFull && gameState.currentTrick.winnerSeatIndex===eastPlayer.seatIndex} toastMsg={toasts[eastPlayer.seatIndex]} />}
          </View>
        </View>

        {/* SOUTH + HAND */}
        <View style={s.southRow}>
          {southPlayer && <PlayerSeat player={southPlayer} isCurrentTurn={!isTrickFull && gameState.currentTurnSeatIndex===southPlayer.seatIndex} isSelf={true} cardsCount={gameState.myHand.length} position="bottom" turnSeconds={gameState.currentTurnSeatIndex===southPlayer.seatIndex?turnSecs:undefined} isTrickWinner={isTrickFull && gameState.currentTrick.winnerSeatIndex===southPlayer.seatIndex} toastMsg={toasts[southPlayer.seatIndex]} />}
          <CardHand
            cards={gameState.myHand}
            selectedCardIds={validPassIds}
            legalPlayCardIds={gameState.legalPlayCardIds}
            isMyTurn={isMyTurn}
            isPassingPhase={isPassingPhase}
            onCardClick={handleCardClick}
          />
        </View>
      </View>

      {/* ── MODALS ── */}
      {showPassedModal && gameState.lastReceivedPassedCards && (
        <PassedCardsModal
          isOpen={true}
          cards={gameState.lastReceivedPassedCards.cards}
          fromPlayer={passedFromPlayer}
          onClose={() => setDismissedPassHand(gameState.lastReceivedPassedCards.handNumber)}
          autoCloseSeconds={10}
        />
      )}
      <ScoreModal isOpen={showScore} players={gameState.players} handNumber={gameState.handNumber} trickNumber={gameState.currentTrickNumber} onClose={() => setShowScore(false)} />
      <RoundSummaryModal
        isOpen={Boolean(roundSummary)}
        handResult={roundSummary}
        players={gameState.players}
        isHost={gameState.mySeatIndex === 0}
        hostName={gameState.players.find(p => p.seatIndex === 0)?.name || 'Host'}
        onContinue={() => {
          const socket = getSocket(serverUrl);
          socket.emit('game:nextRound');
          setRoundSummary(null);
        }}
      />
      <GameOverModal isOpen={showGameOver} winnerTeam={gameState.winnerTeam} players={gameState.players} myTeamId={mySeat % 2 === 0 ? 1 : 2} onPlayAgain={() => { setShowGameOver(false); onLeaveGame(); }} onExitToMenu={onLeaveGame} />
      <ExitConfirmModal isOpen={showExit} isHost={isHost} onReplaceBot={onReplaceWithBot ? () => { setShowExit(false); onReplaceWithBot(); onLeaveGame(); } : null} onExitEnd={onExitAndEndGame ? () => { setShowExit(false); onExitAndEndGame(); onLeaveGame(); } : null} onHostEnd={isHost && onHostEndGame ? () => { setShowExit(false); onHostEndGame(); onLeaveGame(); } : null} onLeave={onLeaveGame} onCancel={() => setShowExit(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#0F172A',flexDirection:'column'},
  header:{height:44,backgroundColor:'#1E293B',borderBottomWidth:1,borderBottomColor:'#334155',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:10,zIndex:30},
  headerLeft:{flexDirection:'row',alignItems:'center',gap:8},
  logo:{width:30,height:30,borderRadius:8,backgroundColor:'#6366F1',justifyContent:'center',alignItems:'center'},
  logoText:{color:'#FFF',fontWeight:'900',fontSize:13},
  appName:{color:'#FFF',fontWeight:'900',fontSize:13},
  appMode:{color:'#64748B',fontSize:9},
  headerCenter:{flexDirection:'row',gap:12,alignItems:'center'},
  statLabel:{color:'#64748B',fontSize:9,fontWeight:'600'},
  statVal:{color:'#E2E8F0',fontWeight:'900'},
  headerRight:{flexDirection:'row',gap:6,alignItems:'center'},
  iconBtn:{padding:7,backgroundColor:'#0F172A',borderWidth:1,borderColor:'#334155',borderRadius:10},
  msgMenu:{position:'absolute',right:0,top:36,width:160,backgroundColor:'#1E293B',borderWidth:1,borderColor:'#334155',borderRadius:16,padding:8,gap:4,zIndex:100,shadowColor:'#000',shadowOpacity:0.5,shadowRadius:8,elevation:20},
  msgMenuTitle:{color:'#475569',fontSize:8,fontWeight:'900',textTransform:'uppercase',letterSpacing:1,paddingHorizontal:6,paddingBottom:4,borderBottomWidth:1,borderBottomColor:'#0F172A'},
  msgItem:{paddingHorizontal:10,paddingVertical:8,borderRadius:10},
  msgItemText:{color:'#FCD34D',fontWeight:'700',fontSize:12},
  table:{flex:1,margin:6,borderRadius:16,borderWidth:3,borderColor:'#064E3B',backgroundColor:'#064E3B',flexDirection:'column',justifyContent:'space-between',overflow:'hidden'},
  scoreStrip:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:12,paddingVertical:3,backgroundColor:'rgba(0,0,0,0.4)'},
  scoreStripText:{color:'#94A3B8',fontSize:10,fontWeight:'600'},
  scoreStripDivider:{color:'#334155',fontSize:12},
  northRow:{alignItems:'center',paddingTop:4},
  middleRow:{flexDirection:'row',flex:1,alignItems:'center',paddingHorizontal:6},
  sideCol:{width:64,alignItems:'center',justifyContent:'center'},
  center:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:4},
  southRow:{alignItems:'center',paddingBottom:4,gap:4},
});
