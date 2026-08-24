import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getSocket } from './src/networking/socket.js';
import { MobileGameTable } from './src/components/MobileGameTable.js';

export default function App() {
  const [currentView, setCurrentView] = useState('menu'); // 'menu' | 'game'
  const [playerName, setPlayerName] = useState('Player_' + Math.floor(Math.random() * 1000));
  const [serverUrl, setServerUrl] = useState('http://192.168.1.5:3000');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [gameState, setGameState] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);

  // Home screen allows both portrait and landscape orientation
  // Game screen locks orientation to LANDSCAPE
  useEffect(() => {
    if (currentView === 'game') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      ScreenOrientation.unlockAsync();
    }
  }, [currentView]);

  // Connect socket and listen to events
  const initSocketConnection = () => {
    const socket = getSocket(serverUrl);

    socket.emit('user:init', {
      id: 'USR_' + Math.random().toString(36).substring(2, 8),
      name: playerName,
      avatarSeed: 'avatar_1',
    });

    socket.off('game:started');
    socket.off('game:stateUpdate');
    socket.off('room:updated');
    socket.off('error:message');

    socket.on('room:updated', (room) => {
      setRoomInfo(room);
    });

    socket.on('game:started', (state) => {
      setIsMatchmaking(false);
      setGameState(state);
      setCurrentView('game');
    });

    socket.on('game:stateUpdate', (state) => {
      setGameState(state);
    });

    socket.on('error:message', (msg) => {
      Alert.alert('Error', msg);
    });
  };

  const handleCreateRoom = () => {
    initSocketConnection();
    const socket = getSocket(serverUrl);
    socket.emit('room:create');
    Alert.alert('Room Created', 'Waiting for players to join in lobby or game!');
  };

  const handleJoinRoom = () => {
    if (!joinRoomInput.trim()) return;
    initSocketConnection();
    const socket = getSocket(serverUrl);
    socket.emit('room:join', joinRoomInput.trim().toUpperCase());
    setShowJoinModal(false);
  };

  const handleJoinMatchmaking = () => {
    initSocketConnection();
    const socket = getSocket(serverUrl);
    socket.emit('matchmaking:join');
    setIsMatchmaking(true);
  };

  const handlePlayCard = (cardId) => {
    const socket = getSocket(serverUrl);
    socket.emit('game:playCard', cardId);
  };

  const handleSubmitPass = (cardIds) => {
    const socket = getSocket(serverUrl);
    socket.emit('game:passCards', cardIds);
  };

  const handleExitGame = () => {
    setCurrentView('menu');
    setGameState(null);
  };

  if (currentView === 'game' && gameState) {
    return (
      <MobileGameTable
        gameState={gameState}
        onPlayCard={handlePlayCard}
        onSubmitPass={handleSubmitPass}
        onExitGame={handleExitGame}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.menuBox}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>BEGI PAKAD</Text>
          <Text style={styles.appSubtitle}>Multiplayer 4-Player Card Game</Text>
        </View>

        {/* Server & Player Config */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Player Name:</Text>
          <TextInput
            style={styles.textInput}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Your Name"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.inputLabel}>Backend Server URL:</Text>
          <TextInput
            style={styles.textInput}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.5:3000"
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Buttons */}
        <View style={styles.btnContainer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleJoinMatchmaking}>
            <Text style={styles.primaryBtnText}>
              {isMatchmaking ? 'MATCHMAKING (WAITING...)' : 'RANDOM MULTIPLAYER'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleCreateRoom}>
            <Text style={styles.secondaryBtnText}>CREATE PRIVATE ROOM</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowJoinModal(true)}>
            <Text style={styles.secondaryBtnText}>JOIN ROOM WITH CODE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Join Room Modal */}
      <Modal visible={showJoinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Room Code</Text>
            <TextInput
              style={styles.textInput}
              value={joinRoomInput}
              onChangeText={setJoinRoomInput}
              placeholder="e.g. ROOM12"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleJoinRoom}>
              <Text style={styles.primaryBtnText}>JOIN GAME</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowJoinModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justify: 'center',
  },
  menuBox: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  titleContainer: {
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  inputContainer: {
    width: '100%',
    gap: 8,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
  },
  btnContainer: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#4338CA',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justify: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelBtn: {
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 12,
  },
});
