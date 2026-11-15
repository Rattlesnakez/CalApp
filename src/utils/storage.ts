import type { MealEntry, ThemeMode, UserProfile } from '../types';

const PROFILE_STORAGE_KEY = 'calapp_user_profile_v1';
const MEALS_STORAGE_KEY = 'calapp_meal_entries_v1';
const API_KEY_STORAGE_KEY = 'calapp_gemini_api_key';
const THEME_STORAGE_KEY = 'calapp_theme_v1';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Usuario',
  gender: 'male',
  age: 28,
  weightKg: 74,
  heightCm: 174,
  activityLevel: 'moderate',
  goal: 'maintain',
  customCalorieTarget: null,
  onboardingCompleted: false,
};

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      ...DEFAULT_USER_PROFILE,
      ...parsed,
    };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Error guardando perfil en localStorage:', err);
  }
}

export function loadMealEntries(): MealEntry[] {
  try {
    const raw = localStorage.getItem(MEALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MealEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveMealEntries(entries: MealEntry[]): void {
  try {
    localStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    // Si se llena la cuota por muchas fotos, reintentar recortando fotos antiguas
    console.warn('Cuota de localStorage alcanzada, optimizando fotos antiguas...', err);
    try {
      const compacted = entries.map((entry, idx) =>
        idx > 12 ? { ...entry, photoDataUrl: undefined } : entry
      );
      localStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(compacted));
    } catch {
      const stripped = entries.map((entry) => ({
        ...entry,
        photoDataUrl: undefined,
      }));
      localStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(stripped));
    }
  }
}

export function loadGeminiApiKey(): string {
  try {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() ?? '';
    if (stored) return stored;
    const envKey = (import.meta.env?.VITE_GEMINI_API_KEY as string | undefined)?.trim();
    return envKey ?? '';
  } catch {
    return '';
  }
}

export function saveGeminiApiKey(apiKey: string): void {
  try {
    const clean = apiKey.trim();
    if (!clean) {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } else {
      localStorage.setItem(API_KEY_STORAGE_KEY, clean);
    }
  } catch (err) {
    console.error('Error guardando API Key:', err);
  }
}

export function loadThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // Fallback
  }
  return 'light';
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (err) {
    console.error('Error guardando tema:', err);
  }
}
