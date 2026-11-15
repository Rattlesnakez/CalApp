export type MealCategory = 'desayuno' | 'comida' | 'cena';

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type GoalType = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  name: string;
  gender: Gender;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: GoalType;
  customCalorieTarget?: number | null;
  onboardingCompleted: boolean;
}

export interface DetectedFoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealAnalysisResult {
  mealName: string;
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: DetectedFoodItem[];
  aiTip: string;
  isDemo?: boolean;
}

export interface MealEntry extends MealAnalysisResult {
  id: string;
  date: string; // YYYY-MM-DD local date
  timestamp: number;
  category: MealCategory;
  photoDataUrl?: string;
}

export type DailyStatus = 'cumplio' | 'no_cumplio' | 'excedio';

export interface DailyEvaluation {
  status: DailyStatus;
  label: string;
  shortLabel: string;
  description: string;
  diff: number;
  percentage: number;
  minIdeal: number;
  maxIdeal: number;
}

export type AppTab = 'hoy' | 'platillos' | 'historial' | 'perfil';

export type SuggestionMode = 'goal' | 'pantry';

export type PantryCategoryFilter = 'any' | MealCategory;

export interface SuggestedMeal {
  id: string;
  mealName: string;
  category: MealCategory;
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  matchedIngredients?: string[];
  extraIngredients?: string[];
  preparationTip: string;
  fitReason: string;
  isDemo?: boolean;
}

export interface MealSuggestionRequest {
  mode: SuggestionMode;
  profile: UserProfile;
  remainingCalories: number;
  remainingMacros: { protein: number; carbs: number; fat: number };
  targetCategory: MealCategory;
  pantryCategoryFilter?: PantryCategoryFilter;
  pantryIngredients?: string[];
  adjustToRemainingCalories?: boolean;
  variationSeed?: number;
}

export type ThemeMode = 'light' | 'dark';

export interface PhotoPreviewData {
  src: string;
  mealName: string;
  category: MealCategory;
  totalCalories: number;
}
