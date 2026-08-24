import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Card } from './Card.js';
import { getSocket } from '../networking/socket.js';

const QUICK_MESSAGES = ['Randi', 'Lawda', 'Madarchod', 'Mauga', 'chutiya'];

export const MobileGameTable = ({ gameState, onPlayCard, onSubmitPass, onExitGame }) => {
  const [selectedCards, setSelectedCards] = useState([]);
  const [activeToasts, setActiveToasts] = useState({});
  const [showTauntsModal, setShowTauntsModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

  const mySeat = gameState.mySeatIndex || 0;
  const isMyTurn = gameState.currentTurnSeatIndex === mySeat;
  const isPassingPhase = gameState.phase === 'PASSING';

  // Seat relative positions in landscape layout
  // 0: Bottom (Me), 1: Right, 2: Top (Partner), 3: Left
  const getPlayerByRelativePosition = (posIndex) => {
    const seatIndex = (mySeat + posIndex) % 4;
    return gameState.players.find((p) => p.seatIndex === seatIndex);
  };

  const bottomPlayer = getPlayerByRelativePosition(0);
  const rightPlayer = getPlayerByRelativePosition(1);
  const topPlayer = getPlayerByRelativePosition(2);
  const leftPlayer = getPlayerByRelativePosition(3);

  const handleCardPress = (card) => {
    if (isPassingPhase) {
      if (selectedCards.includes(card.id)) {
        setSelectedCards(selectedCards.filter((id) => id !== card.id));
      } else if (selectedCards.length < 5) {
        setSelectedCards([...selectedCards, card.id]);
      }
    } else if (isMyTurn) {
      onPlayCard(card.id);
    }
  };

  const handlePassSubmit = () => {
    if (selectedCards.length === 5) {
      onSubmitPass(selectedCards);
      setSelectedCards([]);
    }
  };

  const handleSendTaunt = (msg) => {
    setShowTauntsModal(false);
    const socket = getSocket();
    socket.emit('game:sendQuickMessage', msg);
    triggerToast(mySeat, msg);
  };

  const triggerToast = (seatIndex, text) => {
    setActiveToasts((prev) => ({ ...prev, [seatIndex]: text }));
    setTimeout(() => {
      setActiveToasts((prev) => ({ ...prev, [seatIndex]: null }));
    }, 2000);
  };

  const renderSeatAvatar = (player, positionLabel) => {
    if (!player) return null;
    const isTurn = gameState.currentTurnSeatIndex === player.seatIndex;
    const toastMsg = activeToasts[player.seatIndex];

    return (
      <View style={styles.seatContainer}>
        {toastMsg && (
          <View style={styles.toastBubble}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}

        <View
          style={[
            styles.avatarCircle,
            isTurn && styles.turnAvatar,
            player.teamId === 1 ? styles.team1Border : styles.team2Border,
          ]}
        >
          <Text style={styles.avatarText}>{player.name.slice(0, 2).toUpperCase()}</Text>
        </View>

        <Text style={styles.playerName} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={styles.playerScore}>
          {player.score} pts • {player.tricksWonThisHand} Ser
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onExitGame}>
          <Text style={styles.headerBtnText}>Exit</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>BEGI PAKAD</Text>
          <Text style={styles.headerSubtitle}>
            Hand #{gameState.handNumber} • Ser {gameState.currentTrickNumber}/13
          </Text>
        </View>

        <View style={styles.headerRightBtns}>
          <TouchableOpacity style={styles.tauntBtn} onPress={() => setShowTauntsModal(true)}>
            <Text style={styles.tauntBtnText}>💬 Taunt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowScoreModal(true)}>
            <Text style={styles.headerBtnText}>📊 Scores</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Game Felt Board */}
      <View style={styles.feltBoard}>
        {/* Top Seat (Partner) */}
        <View style={styles.topSeatArea}>{renderSeatAvatar(topPlayer, 'Top')}</View>

        {/* Left & Right Seats */}
        <View style={styles.middleRow}>
          <View style={styles.sideSeatArea}>{renderSeatAvatar(leftPlayer, 'Left')}</View>

          {/* Center Trick Area */}
          <View style={styles.trickCenterArea}>
            {gameState.currentTrick?.cards?.map((pc) => (
              <View key={pc.card.id} style={styles.playedCardWrapper}>
                <Card card={pc.card} size="sm" />
                <Text style={styles.playedCardOwner}>{gameState.players[pc.seatIndex]?.name}</Text>
              </View>
            ))}

            {gameState.currentTrick?.cards?.length === 0 && (
              <Text style={styles.trickPlaceholderText}>
                {isMyTurn ? 'YOUR TURN TO LEAD' : 'Waiting for lead...'}
              </Text>
            )}
          </View>

          <View style={styles.sideSeatArea}>{renderSeatAvatar(rightPlayer, 'Right')}</View>
        </View>

        {/* Bottom Seat (Player) */}
        <View style={styles.bottomSeatArea}>{renderSeatAvatar(bottomPlayer, 'Me')}</View>
      </View>

      {/* Cards Container */}
      <View style={styles.cardsFooter}>
        {isPassingPhase && (
          <TouchableOpacity
            style={[styles.passBtn, selectedCards.length !== 5 && styles.passBtnDisabled]}
            onPress={handlePassSubmit}
            disabled={selectedCards.length !== 5}
          >
            <Text style={styles.passBtnText}>PASS 5 CARDS ({selectedCards.length}/5)</Text>
          </TouchableOpacity>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsScroll}
        >
          {gameState.myHand?.map((c) => {
            const isSelected = selectedCards.includes(c.id);
            return (
              <View key={c.id} style={styles.cardMargin}>
                <Card
                  card={c}
                  selected={isSelected}
                  playable={isMyTurn && !isPassingPhase}
                  onPress={() => handleCardPress(c)}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Taunts Preset Popup Modal */}
      <Modal visible={showTauntsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.tauntsModalBox}>
            <Text style={styles.modalTitle}>SEND QUICK TAUNT</Text>
            {QUICK_MESSAGES.map((msg) => (
              <TouchableOpacity
                key={msg}
                style={styles.tauntOption}
                onPress={() => handleSendTaunt(msg)}
              >
                <Text style={styles.tauntOptionText}>"{msg}"</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowTauntsModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scores Recap Modal */}
      <Modal visible={showScoreModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.scoreModalBox}>
            <Text style={styles.modalTitle}>SCOREBOARD</Text>
            {gameState.players?.map((p) => (
              <View key={p.id} style={styles.scoreRow}>
                <Text style={styles.scoreName}>{p.name}</Text>
                <Text style={styles.scoreValue}>{p.score} pts</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowScoreModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    height: 44,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerRightBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  tauntBtn: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tauntBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 9,
  },
  feltBoard: {
    flex: 1,
    backgroundColor: '#064E3B',
    borderRadius: 16,
    margin: 6,
    padding: 6,
    borderWidth: 3,
    borderColor: '#047857',
    justify: 'space-between',
  },
  topSeatArea: {
    alignItems: 'center',
  },
  middleRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sideSeatArea: {
    width: 80,
    alignItems: 'center',
  },
  bottomSeatArea: {
    alignItems: 'center',
  },
  trickCenterArea: {
    flex: 1,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 8,
  },
  trickPlaceholderText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  playedCardWrapper: {
    alignItems: 'center',
  },
  playedCardOwner: {
    color: '#FFF',
    fontSize: 8,
    marginTop: 2,
  },
  seatContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justify: 'center',
    borderWidth: 2,
  },
  turnAvatar: {
    borderColor: '#F59E0B',
    borderWidth: 3,
  },
  team1Border: {
    borderColor: '#6366F1',
  },
  team2Border: {
    borderColor: '#F59E0B',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  playerScore: {
    color: '#94A3B8',
    fontSize: 8,
  },
  toastBubble: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#4338CA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 10,
  },
  toastText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardsFooter: {
    height: 110,
    backgroundColor: '#0F172A',
    paddingVertical: 6,
  },
  cardsScroll: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cardMargin: {
    marginRight: -16,
  },
  passBtn: {
    backgroundColor: '#4338CA',
    paddingVertical: 6,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 4,
    borderRadius: 8,
  },
  passBtnDisabled: {
    backgroundColor: '#334155',
  },
  passBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justify: 'center',
    padding: 20,
  },
  tauntsModalBox: {
    width: '80%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tauntOption: {
    width: '100%',
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tauntOptionText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    marginTop: 8,
  },
  closeModalBtnText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  scoreModalBox: {
    width: '85%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justify: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  scoreName: {
    color: '#FFF',
    fontSize: 12,
  },
  scoreValue: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
