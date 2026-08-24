import { UserProfile } from '../game/types.ts';

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

export function recordGameResult(isWin: boolean, zeroSerCount: number): UserProfile {
  const profile = getUserProfile();
  profile.gamesPlayed += 1;
  if (isWin) {
    profile.gamesWon += 1;
  }
  profile.zeroSerAchievements += zeroSerCount;
  saveUserProfile(profile);
  return profile;
}
