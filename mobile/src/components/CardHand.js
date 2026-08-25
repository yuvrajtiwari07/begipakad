import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Card from './Card.js';

const { width: SW } = Dimensions.get('window');

export default function CardHand({ cards, selectedCardIds, legalPlayCardIds, isMyTurn, isPassingPhase, onCardClick }) {
  if (!cards || cards.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card, idx) => {
          const isSelected = selectedCardIds.includes(card.id);
          const isPlayable = isMyTurn && legalPlayCardIds.includes(card.id);
          const isDisabled = isMyTurn && !legalPlayCardIds.includes(card.id) && !isPassingPhase;

          return (
            <View key={card.id} style={[styles.cardWrapper, { zIndex: idx + 1 }]}>
              <Card
                card={card}
                selected={isSelected && isPassingPhase}
                playable={isPlayable}
                disabled={isDisabled}
                size="md"
                onClick={() => onCardClick(card)}
              />
            </View>
          );
        })}
      </ScrollView>

      {isMyTurn && !isPassingPhase && (
        <View style={styles.turnBanner}>
          <Text style={styles.turnBannerText}>⚡ YOUR TURN</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', position: 'relative' },
  scrollContent: { paddingHorizontal: 8, paddingTop: 18, paddingBottom: 6, gap: 4, alignItems: 'flex-end' },
  cardWrapper: { marginHorizontal: -4 },
  turnBanner: {
    position: 'absolute', top: -22, left: '50%', transform: [{ translateX: -55 }],
    backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 3,
    borderRadius: 99, shadowColor: '#6366F1', shadowOpacity: 0.5, shadowRadius: 6, elevation: 6,
  },
  turnBannerText: { color: '#FFF', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
});
