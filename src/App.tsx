import { useEffect, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { DailyDashboardView } from './components/DailyDashboardView';
import { HistoryView } from './components/HistoryView';
import { MealSuggestionsView } from './components/MealSuggestionsView';
import { OnboardingOrProfileView } from './components/OnboardingOrProfileView';
import { PhotoScannerModal } from './components/PhotoScannerModal';
import type { AppTab, MealCategory, MealEntry, UserProfile } from './types';
import { getLocalDateKey } from './utils/nutrition';
import {
  loadGeminiApiKey,
  loadMealEntries,
  loadUserProfile,
  saveMealEntries,
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
  const [hasApiKey, setHasApiKey] = useState<boolean>(
    () => loadGeminiApiKey().length > 0
  );

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

  const handleSaveMeal = (entry: MealEntry) => {
    setEntries((prev) => [entry, ...prev]);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== entryId));
  };

  const entriesForSelectedDate = entries.filter(
    (entry) => entry.date === selectedDate
  );

  const isOnboarding = !profile.onboardingCompleted;

  return (
    <div className="min-h-dvh bg-slate-100 flex justify-center">
      <div className="w-full max-w-md min-h-dvh bg-slate-50 px-4 pt-safe shadow-xl shadow-slate-200/70">
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
                onDeleteEntry={handleDeleteEntry}
                hasApiKey={hasApiKey}
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
              />
            )}

            {activeTab === 'perfil' && (
              <OnboardingOrProfileView
                profile={profile}
                isInitialOnboarding={false}
                onSaveProfile={handleSaveProfile}
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
                onClose={() => setScannerOpen(false)}
                onSaveMeal={handleSaveMeal}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
