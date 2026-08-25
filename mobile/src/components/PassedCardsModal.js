import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Card from './Card.js';

export default function PassedCardsModal({ isOpen, cards, fromPlayer, onClose, autoCloseSeconds = 10 }) {
  const [secondsRemaining, setSecondsRemaining] = useState(autoCloseSeconds);
  const [progressPercent, setProgressPercent] = useState(100);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(autoCloseSeconds);
      setProgressPercent(100);
      return;
    }

    setSecondsRemaining(autoCloseSeconds);
    setProgressPercent(100);

    const startTime = Date.now();
    const durationMs = autoCloseSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, durationMs - elapsed);
      const remainingSecs = Math.ceil(remainingMs / 1000);
      const pct = (remainingMs / durationMs) * 100;

      setSecondsRemaining(remainingSecs);
      setProgressPercent(pct);

      if (remainingMs <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen, autoCloseSeconds, onClose]);

  if (!isOpen || !cards || cards.length === 0) return null;

  const hasBegum = cards.some((c) => c.isBegumHukum);
  const paanCount = cards.filter((c) => c.isPaan).length;

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.box}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>5 Cards Received ✉️</Text>
              <Text style={s.sub}>
                Passed by <Text style={{ color: '#E2E8F0', fontWeight: '900' }}>{fromPlayer ? `${fromPlayer.name} (T${fromPlayer.teamId})` : 'Opponent'}</Text>
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Highlights */}
          {(hasBegum || paanCount > 0) && (
            <View style={s.banner}>
              {hasBegum && <Text style={s.bannerWarn}>⚠️ Begum Hukum (Q♠, 12pts) Received!</Text>}
              {paanCount > 0 && <Text style={s.bannerPaan}>♥ {paanCount} Paan Card{paanCount > 1 ? 's' : ''} Received</Text>}
            </View>
          )}

          {/* 5 Cards Row */}
          <View style={s.cardsRow}>
            {cards.map((c) => (
              <View key={c.id} style={s.cardItem}>
                <Card card={c} size="sm" />
              </View>
            ))}
          </View>

          {/* Progress Bar & Timer */}
          <View style={s.timerSection}>
            <View style={s.timerRow}>
              <Text style={s.timerLabel}>Closing automatically in:</Text>
              <Text style={s.timerSecs}>{secondsRemaining}s</Text>
            </View>
            <View style={s.track}>
              <View style={[s.bar, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity style={s.actionBtn} onPress={onClose}>
            <Text style={s.actionBtnText}>Got It, Start Playing ({secondsRemaining}s)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  box: { width: '100%', maxWidth: 440, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#6366F1', borderRadius: 24, padding: 16, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 8 },
  title: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  sub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 6, backgroundColor: '#0F172A', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  closeBtnText: { color: '#94A3B8', fontWeight: '900', fontSize: 12 },
  banner: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', borderRadius: 12, padding: 8, gap: 2 },
  bannerWarn: { color: '#FCD34D', fontSize: 11, fontWeight: '900' },
  bannerPaan: { color: '#F87171', fontSize: 11, fontWeight: '700' },
  cardsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  cardItem: { transform: [{ scale: 0.95 }] },
  timerSection: { gap: 4 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  timerSecs: { color: '#818CF8', fontSize: 11, fontWeight: '900', fontFamily: 'monospace' },
  track: { height: 6, backgroundColor: '#0F172A', borderRadius: 99, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  bar: { height: '100%', backgroundColor: '#6366F1', borderRadius: 99 },
  actionBtn: { backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  actionBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
});
