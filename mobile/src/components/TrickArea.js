import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Card from './Card.js';

const SUIT_NAMES = {
  HUKUM:{hi:'Hukum',symbol:'♠',isRed:false},
  PAAN:{hi:'Paan',symbol:'♥',isRed:true},
  EENT:{hi:'Eent',symbol:'♦',isRed:true},
  CHIDI:{hi:'Chidi',symbol:'♣',isRed:false},
};

function getRelPos(seatIndex, mySeat) {
  const d = (seatIndex - mySeat + 4) % 4;
  return ['bottom','right','top','left'][d];
}

export default function TrickArea({ currentTrick, players, mySeatIndex, lastActionMessage, trickNumber }) {
  const isTrickComplete = currentTrick.cards.length === 4 && currentTrick.winnerSeatIndex !== undefined;
  const winnerPlayer = isTrickComplete ? players.find(p => p.seatIndex === currentTrick.winnerSeatIndex) : null;
  const leadSuit = currentTrick.leadSuit ? SUIT_NAMES[currentTrick.leadSuit] : null;

  const cardPositions = {
    bottom: { bottom: 4, alignSelf: 'center' },
    top:    { top: 4,    alignSelf: 'center' },
    left:   { left: 4,  top: '35%' },
    right:  { right: 4, top: '35%' },
  };

  const cardRotations = { bottom: '0deg', top: '-4deg', left: '7deg', right: '-7deg' };

  return (
    <View style={s.container}>
      {/* Ring */}
      <View style={s.ring}>
        {/* Center label */}
        <View style={s.centerLabel}>
          {leadSuit ? (
            <View style={s.leadSuitBox}>
              <Text style={s.leadSuitTitle}>Lead Suit</Text>
              <Text style={[s.leadSuitSymbol, leadSuit.isRed && {color:'#EF4444'}]}>{leadSuit.symbol}</Text>
              <Text style={s.leadSuitHindi}>{leadSuit.hi}</Text>
            </View>
          ) : (
            <View style={s.idleLogo}>
              <Text style={s.idleLogoText}>BEGI PAKAD</Text>
              <Text style={s.idleSerText}>Ser {trickNumber}/13</Text>
            </View>
          )}
        </View>

        {/* Played cards */}
        {currentTrick.cards.map(played => {
          const relPos = getRelPos(played.seatIndex, mySeatIndex);
          const pStyle = cardPositions[relPos] || {};
          const rotation = cardRotations[relPos] || '0deg';
          const pObj = players.find(p => p.seatIndex === played.seatIndex);
          return (
            <View key={`${played.seatIndex}_${played.card.id}`} style={[s.playedCard, pStyle]}>
              <View style={{ transform: [{ rotate: rotation }] }}>
                <Card card={played.card} size="sm" />
              </View>
              <Text style={s.playerLabel}>{pObj?.name || `P${played.seatIndex+1}`}</Text>
            </View>
          );
        })}

        {/* Winner banner */}
        {isTrickComplete && winnerPlayer && (
          <View style={s.winnerBanner}>
            <Text style={s.winnerBannerText}>
              👑 {winnerPlayer.name} wins!
              {currentTrick.pointsAwarded?.totalPoints > 0 ? ` (+${currentTrick.pointsAwarded.totalPoints}pts)` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Action message */}
      {lastActionMessage ? (
        <View style={s.actionMsg}>
          <Text style={s.actionMsgText} numberOfLines={1}>{lastActionMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  ring: { width: 220, height: 140, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 110, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  centerLabel: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  leadSuitBox: { backgroundColor: 'rgba(15,23,42,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  leadSuitTitle: { color: '#64748B', fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  leadSuitSymbol: { color: '#F1F5F9', fontSize: 20, fontWeight: '700' },
  leadSuitHindi: { color: '#94A3B8', fontSize: 9, fontWeight: '600' },
  idleLogo: { alignItems: 'center', opacity: 0.25 },
  idleLogoText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  idleSerText: { color: '#94A3B8', fontSize: 9, fontWeight: '600', marginTop: 2 },
  playedCard: { position: 'absolute', alignItems: 'center', gap: 2 },
  playerLabel: { color: '#E2E8F0', fontSize: 8, fontWeight: '700', backgroundColor: 'rgba(15,23,42,0.9)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99, borderWidth: 1, borderColor: '#334155' },
  winnerBanner: { position: 'absolute', top: -16, left: '50%', transform: [{ translateX: -70 }], backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, zIndex: 50, minWidth: 140, alignItems: 'center' },
  winnerBannerText: { color: '#0F172A', fontWeight: '900', fontSize: 10 },
  actionMsg: { position: 'absolute', bottom: -20, backgroundColor: 'rgba(15,23,42,0.95)', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: '#334155', maxWidth: 250 },
  actionMsgText: { color: '#E2E8F0', fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
