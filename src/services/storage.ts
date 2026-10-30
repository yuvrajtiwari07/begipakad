import { UserProfile } from '../game/types';

const USER_STORAGE_KEY = 'begi_pakad_user_profile';

export function generateUserId(): string {
  const chars = '0123456789ABCDEF';
  let hex = '';
  for (let i = 0; i < 6; i++) {
    hex += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `USR_${hex}`;
}

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load user profile', e);
  }

  // Default initial profile
  const initialProfile: UserProfile = {
    id: generateUserId(),
    name: 'Player 1',
    avatarSeed: 'avatar_1',
    gamesPlayed: 0,
    gamesWon: 0,
    zeroSerAchievements: 0,
    createdAt: Date.now(),
  };

  saveUserProfile(initialProfile);
  return initialProfile;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save user profile', e);
  }
}

const RECORDED_GAME_KEY = 'begi_pakad_last_recorded_game';

export function recordGameResult(isWin: boolean, zeroSerCount: number, gameId?: string): UserProfile {
  const profile = getUserProfile();
  // Reconnecting to a finished game replays its final state; count it only once
  if (gameId) {
    try {
      if (localStorage.getItem(RECORDED_GAME_KEY) === gameId) return profile;
      localStorage.setItem(RECORDED_GAME_KEY, gameId);
    } catch (e) {
      console.error('Failed to read recorded game', e);
    }
  }
  profile.gamesPlayed += 1;
  if (isWin) {
    profile.gamesWon += 1;
  }
  profile.zeroSerAchievements += zeroSerCount;
  saveUserProfile(profile);
  return profile;
}
