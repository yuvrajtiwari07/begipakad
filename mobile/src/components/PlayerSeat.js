import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function PlayerSeat({ player, isCurrentTurn, isSelf, cardsCount, position, turnSeconds, isTrickWinner, toastMsg }) {
  if (!player) return null;
  const isTeam1 = player.teamId === 1;
  const isLowTime = isCurrentTurn && turnSeconds !== undefined && turnSeconds <= 5;
  const initials = player.name.slice(0, 2).toUpperCase();

  const avatarBg = isTrickWinner
    ? '#D97706' : isCurrentTurn
    ? (isLowTime ? '#7F1D1D' : '#3730A3')
    : '#334155';
  const avatarBorder = isTrickWinner
    ? '#FCD34D' : isCurrentTurn
    ? (isLowTime ? '#F87171' : '#818CF8')
    : '#475569';

  const isHorizontal = position === 'left' || position === 'right';

  return (
    <View style={[styles.seat, isHorizontal && styles.seatHoriz]}>
      {/* Toast */}
      {toastMsg ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
          <View style={styles.toastArrow} />
        </View>
      ) : null}

      {/* Avatar */}
      <View style={[styles.avatarWrap, { borderColor: avatarBorder }]}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          {player.isBot
            ? <Text style={styles.avatarEmoji}>🤖</Text>
            : <Text style={styles.avatarText}>{initials}</Text>}
        </View>
        {/* Team badge */}
        <View style={[styles.teamBadge, isTeam1 ? styles.team1 : styles.team2]}>
          <Text style={[styles.teamText, !isTeam1 && { color: '#0F172A' }]}>T{player.teamId}</Text>
        </View>
        {/* Connection dot */}
        <View style={[styles.connDot, { backgroundColor: player.isConnected ? '#10B981' : '#EF4444' }]} />
        {/* Trick winner crown */}
        {isTrickWinner && <View style={styles.crownBadge}><Text style={{ fontSize: 10 }}>👑</Text></View>}
        {/* Turn timer */}
        {isCurrentTurn && !isTrickWinner && turnSeconds !== undefined && (
          <View style={[styles.timerBadge, isLowTime && styles.timerLow]}>
            <Text style={styles.timerText}>{turnSeconds}s</Text>
          </View>
        )}
      </View>

      {/* Info pill */}
      <View style={styles.infoPill}>
        <Text style={styles.infoName} numberOfLines={1}>{player.name}{isSelf ? ' (You)' : ''}</Text>
        <Text style={styles.infoDot}> • </Text>
        <Text style={styles.infoScore}>{player.score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: { alignItems: 'center', gap: 4 },
  seatHoriz: { alignItems: 'center' },
  toast: { position: 'absolute', top: -36, left: '50%', transform: [{ translateX: -50 }], backgroundColor: '#FBBF24', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 99, minWidth: 60, alignItems: 'center' },
  toastText: { color: '#0F172A', fontWeight: '900', fontSize: 11 },
  toastArrow: { position: 'absolute', bottom: -5, left: '50%', width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FBBF24' },
  avatarWrap: { position: 'relative', width: 44, height: 44, borderRadius: 22, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 16 },
  avatarText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  teamBadge: { position: 'absolute', top: -4, left: -4, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6 },
  team1: { backgroundColor: '#6366F1' },
  team2: { backgroundColor: '#F59E0B' },
  teamText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
  connDot: { position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#0F172A' },
  crownBadge: { position: 'absolute', top: -10, left: '50%', transform: [{ translateX: -10 }] },
  timerBadge: { position: 'absolute', bottom: -12, backgroundColor: '#6366F1', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 },
  timerLow: { backgroundColor: '#DC2626' },
  timerText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  infoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, maxWidth: 100 },
  infoName: { color: '#F1F5F9', fontSize: 9, fontWeight: '600', maxWidth: 55 },
  infoDot: { color: '#475569', fontSize: 9 },
  infoScore: { color: '#FCD34D', fontSize: 9, fontWeight: '900' },
});
