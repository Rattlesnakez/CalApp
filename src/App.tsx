import { useEffect, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { DailyDashboardView } from './components/DailyDashboardView';
import { HistoryView } from './components/HistoryView';
import { MealSuggestionsView } from './components/MealSuggestionsView';
import { OnboardingOrProfileView } from './components/OnboardingOrProfileView';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { PhotoScannerModal } from './components/PhotoScannerModal';
import type {
  AppTab,
  MealCategory,
  MealEntry,
  PhotoPreviewData,
  ThemeMode,
  UserProfile,
} from './types';
import { getLocalDateKey } from './utils/nutrition';
import {
  loadGeminiApiKey,
  loadMealEntries,
  loadThemeMode,
  loadUserProfile,
  saveMealEntries,
  saveThemeMode,
  saveUserProfile,
} from './utils/storage';

export function App() {
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [entries, setEntries] = useState<MealEntry[]>(() => loadMealEntries());
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getLocalDateKey()
  );
  const [activeTab, setActiveTab] = useState<AppTab>('hoy');
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [scannerCategory, setScannerCategory] =
    useState<MealCategory>('desayuno');
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(
    () => loadGeminiApiKey().length > 0
  );
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemeMode());
  const [previewPhoto, setPreviewPhoto] = useState<PhotoPreviewData | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemeMode(theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0f172a' : '#059669');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    saveUserProfile(profile);
    setHasApiKey(loadGeminiApiKey().length > 0);
  }, [profile]);

  useEffect(() => {
    saveMealEntries(entries);
  }, [entries]);

  const handleSaveProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    setHasApiKey(loadGeminiApiKey().length > 0);
    if (!profile.onboardingCompleted && nextProfile.onboardingCompleted) {
      setActiveTab('hoy');
    }
  };

  const handleOpenScanner = (category?: MealCategory) => {
    setEditingEntry(null);
    if (category) {
      setScannerCategory(category);
    } else {
      const hour = new Date().getHours();
      setScannerCategory(
        hour < 12 ? 'desayuno' : hour < 18 ? 'comida' : 'cena'
      );
    }
    setScannerOpen(true);
  };

  const handleStartEditEntry = (entry: MealEntry) => {
    setScannerCategory(entry.category);
    setEditingEntry(entry);
    setScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setScannerOpen(false);
    setEditingEntry(null);
  };

  const handleSaveMeal = (entry: MealEntry) => {
    setEntries((prev) => [entry, ...prev]);
  };

  const handleUpdateMeal = (updatedEntry: MealEntry) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
    );
    setEditingEntry(null);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== entryId));
  };

  const entriesForSelectedDate = entries.filter(
    (entry) => entry.date === selectedDate
  );

  const isOnboarding = !profile.onboardingCompleted;

  return (
    <div className="min-h-dvh bg-slate-100 dark:bg-slate-950 flex justify-center transition-colors">
      <div className="w-full max-w-md min-h-dvh bg-slate-50 dark:bg-slate-950 px-4 pt-safe shadow-xl shadow-slate-200/70 dark:shadow-none border-x border-transparent dark:border-slate-800/70 transition-colors">
        {isOnboarding ? (
          <OnboardingOrProfileView
            profile={profile}
            isInitialOnboarding={true}
            onSaveProfile={handleSaveProfile}
          />
        ) : (
          <>
            {activeTab === 'hoy' && (
              <DailyDashboardView
                profile={profile}
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                entriesForDay={entriesForSelectedDate}
                onOpenScanner={handleOpenScanner}
                onEditEntry={handleStartEditEntry}
                onDeleteEntry={handleDeleteEntry}
                hasApiKey={hasApiKey}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                onPreviewPhoto={setPreviewPhoto}
              />
            )}

            {activeTab === 'platillos' && (
              <MealSuggestionsView
                profile={profile}
                selectedDate={selectedDate}
                entriesForDay={entriesForSelectedDate}
                hasApiKey={hasApiKey}
                onSaveMeal={handleSaveMeal}
              />
            )}

            {activeTab === 'historial' && (
              <HistoryView
                profile={profile}
                allEntries={entries}
                onSelectDateInDashboard={(dateKey) => {
                  setSelectedDate(dateKey);
                  setActiveTab('hoy');
                }}
                onEditEntry={handleStartEditEntry}
                onDeleteEntry={handleDeleteEntry}
                onPreviewPhoto={setPreviewPhoto}
              />
            )}

            {activeTab === 'perfil' && (
              <OnboardingOrProfileView
                profile={profile}
                isInitialOnboarding={false}
                onSaveProfile={handleSaveProfile}
                theme={theme}
                onChangeTheme={setTheme}
              />
            )}

            <BottomNav
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onOpenScanner={() => handleOpenScanner()}
            />

            {scannerOpen && (
              <PhotoScannerModal
                isOpen={scannerOpen}
                initialCategory={scannerCategory}
                selectedDate={selectedDate}
                hasApiKey={hasApiKey}
                editingEntry={editingEntry}
                onClose={handleCloseScanner}
                onSaveMeal={handleSaveMeal}
                onUpdateMeal={handleUpdateMeal}
                onPreviewPhoto={setPreviewPhoto}
              />
            )}

            <PhotoPreviewModal
              preview={previewPhoto}
              onClose={() => setPreviewPhoto(null)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
