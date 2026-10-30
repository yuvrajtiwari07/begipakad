import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'begi_pakad_profile';

function genId() { return 'USR_' + Math.random().toString(36).substring(2, 8).toUpperCase(); }
function genName() { return 'Player' + Math.floor(Math.random() * 9000 + 1000); }

// The id must survive app restarts: the server uses it to put the player back
// into their room or game after the app is closed or killed.
export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored && stored.id) return stored;
    }
  } catch (e) {
    console.warn('Failed to load profile', e);
  }
  const profile = { id: genId(), name: genName(), serverUrl: null };
  await saveProfile(profile);
  return profile;
}

export async function saveProfile(profile) {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save profile', e);
  }
}
