import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SUIT_NAMES = {
  HUKUM: { en: 'Spades', hi: 'Hukum', symbol: '♠', isRed: false },
  PAAN: { en: 'Hearts', hi: 'Paan', symbol: '♥', isRed: true },
  EENT: { en: 'Diamonds', hi: 'Eent', symbol: '♦', isRed: true },
  CHIDI: { en: 'Clubs', hi: 'Chidi', symbol: '♣', isRed: false },
};

const CARD_SIZES = {
  sm: { width: 44, height: 62, borderRadius: 6, fontSize: 10, centerSize: 14, rankSize: 9 },
  md: { width: 56, height: 80, borderRadius: 8, fontSize: 13, centerSize: 18, rankSize: 11 },
  lg: { width: 70, height: 100, borderRadius: 10, fontSize: 16, centerSize: 22, rankSize: 14 },
};

export default function Card({
  card,
  isBack = false,
  selected = false,
  disabled = false,
  playable = false,
  onClick,
  size = 'md',
}) {
  const dims = CARD_SIZES[size] || CARD_SIZES.md;

  // ── Card Back ──────────────────────────────────────────
  if (isBack || !card) {
    return (
      <View style={[styles.cardBack, { width: dims.width, height: dims.height, borderRadius: dims.borderRadius }]}>
        <View style={styles.cardBackInner}>
          <Text style={[styles.cardBackText, { fontSize: dims.rankSize }]}>BP</Text>
        </View>
      </View>
    );
  }

  const suitInfo = SUIT_NAMES[card.suit];
  const isRed = suitInfo.isRed;
  const textColor = disabled ? '#94A3B8' : isRed ? '#DC2626' : '#0F172A';
  const cardBg = disabled ? '#CBD5E1' : '#FFFFFF';

  const borderStyle = selected
    ? { borderColor: '#6366F1', borderWidth: 2 }
    : playable
    ? { borderColor: '#10B981', borderWidth: 1.5 }
    : disabled
    ? { borderColor: '#94A3B8', borderWidth: 1 }
    : { borderColor: '#CBD5E1', borderWidth: 1 };

  const shadowStyle = selected
    ? { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 10 }
    : playable
    ? { shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 6 }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 };

  const liftStyle = selected ? { transform: [{ translateY: -14 }] } : {};

  const cardContent = (
    <View
      style={[
        styles.cardFace,
        borderStyle,
        shadowStyle,
        liftStyle,
        {
          width: dims.width,
          height: dims.height,
          borderRadius: dims.borderRadius,
          backgroundColor: cardBg,
          opacity: disabled ? 0.65 : 1,
        },
        card.isBegumHukum && !selected && styles.begumHukumRing,
      ]}
    >
      {/* Selected checkmark */}
      {selected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓</Text>
        </View>
      )}

      {/* Begum Hukum crown badge */}
      {!selected && card.isBegumHukum && (
        <View style={styles.crownBadge}>
          <Text style={{ fontSize: 8 }}>👑</Text>
        </View>
      )}

      {/* Paan heart badge */}
      {!selected && card.isPaan && (
        <View style={styles.heartBadge}>
          <Text style={{ fontSize: 7, color: '#FFF' }}>♥</Text>
        </View>
      )}

      {/* Top-left: rank + symbol */}
      <View style={styles.cardCorner}>
        <Text style={[styles.rankText, { color: textColor, fontSize: dims.rankSize }]}>{card.rank}</Text>
        <Text style={[styles.suitText, { color: textColor, fontSize: dims.rankSize }]}>{suitInfo.symbol}</Text>
      </View>

      {/* Center: big suit symbol + hindi name */}
      <View style={styles.cardCenter}>
        <Text style={[styles.centerSymbol, { color: textColor, fontSize: dims.centerSize }]}>
          {suitInfo.symbol}
        </Text>
        <Text style={[styles.centerHindi, { color: textColor, fontSize: dims.rankSize - 3 }]}>
          {suitInfo.hi}
        </Text>
      </View>

      {/* Bottom-right: inverted rank + symbol */}
      <View style={[styles.cardCorner, styles.cardCornerBottom]}>
        <Text style={[styles.rankText, { color: textColor, fontSize: dims.rankSize, transform: [{ rotate: '180deg' }] }]}>{card.rank}</Text>
        <Text style={[styles.suitText, { color: textColor, fontSize: dims.rankSize, transform: [{ rotate: '180deg' }] }]}>{suitInfo.symbol}</Text>
      </View>
    </View>
  );

  if (onClick && !disabled) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onClick}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  cardBack: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cardBackInner: {
    width: '88%',
    height: '88%',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  cardBackText: {
    color: 'rgba(99,102,241,0.7)',
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardFace: {
    position: 'relative',
    justifyContent: 'space-between',
    padding: 4,
  },
  begumHukumRing: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 10,
    shadowColor: '#6366F1',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 8,
  },
  selectedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  crownBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    zIndex: 10,
  },
  heartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardCorner: {
    alignItems: 'flex-start',
  },
  cardCornerBottom: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },
  rankText: {
    fontWeight: '900',
    lineHeight: 14,
  },
  suitText: {
    lineHeight: 14,
    marginTop: 1,
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSymbol: {
    fontWeight: '700',
    lineHeight: 28,
  },
  centerHindi: {
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
