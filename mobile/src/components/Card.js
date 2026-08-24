import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SUIT_SYMBOLS = {
  HUKUM: '♠',
  PAAN: '♥',
  EENT: '♦',
  CHIDI: '♣',
};

const SUIT_COLORS = {
  HUKUM: '#0F172A',
  PAAN: '#DC2626',
  EENT: '#DC2626',
  CHIDI: '#0F172A',
};

export const Card = ({ card, selected, playable, disabled, onPress, size = 'md' }) => {
  if (!card) return null;

  const symbol = SUIT_SYMBOLS[card.suit] || '♠';
  const color = SUIT_COLORS[card.suit] || '#0F172A';

  return (
    <View
      style={[
        styles.cardContainer,
        selected && styles.selectedCard,
        disabled && styles.disabledCard,
        playable && styles.playableCard,
      ]}
      onTouchEnd={disabled ? null : onPress}
    >
      <View style={styles.cornerTop}>
        <Text style={[styles.rankText, { color }]}>{card.rank}</Text>
        <Text style={[styles.suitText, { color }]}>{symbol}</Text>
      </View>

      <View style={styles.centerSuit}>
        <Text style={[styles.largeSuitText, { color }]}>{symbol}</Text>
      </View>

      <View style={styles.cornerBottom}>
        <Text style={[styles.rankText, { color }]}>{card.rank}</Text>
        <Text style={[styles.suitText, { color }]}>{symbol}</Text>
      </View>

      {card.isBegumHukum && (
        <View style={styles.begumBadge}>
          <Text style={styles.begumBadgeText}>Q♠</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 60,
    height: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: 3,
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectedCard: {
    borderColor: '#6366F1',
    borderWidth: 2.5,
    transform: [{ translateY: -12 }],
  },
  playableCard: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  disabledCard: {
    opacity: 0.5,
    backgroundColor: '#F1F5F9',
  },
  cornerTop: {
    alignItems: 'flex-start',
  },
  cornerBottom: {
    alignItems: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  rankText: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 12,
  },
  suitText: {
    fontSize: 10,
    lineHeight: 10,
  },
  centerSuit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeSuitText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  begumBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#4338CA',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  begumBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
