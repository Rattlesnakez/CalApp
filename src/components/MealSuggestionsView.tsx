import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChefHat,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import type {
  DetectedFoodItem,
  MealCategory,
  MealEntry,
  PantryCategoryFilter,
  SuggestedMeal,
  SuggestionMode,
  UserProfile,
} from '../types';
import {
  GOAL_LABELS,
  MEAL_CATEGORY_META,
  calculateCalorieTarget,
  calculateMacroTargets,
  formatDateLabel,
} from '../utils/nutrition';
import { generateMealSuggestions } from '../services/geminiService';

interface MealSuggestionsViewProps {
  profile: UserProfile;
  selectedDate: string;
  entriesForDay: MealEntry[];
  hasApiKey: boolean;
  onSaveMeal: (entry: MealEntry) => void;
}

const QUICK_INGREDIENTS = [
  'Huevo',
  'Pollo',
  'Atún',
  'Arroz',
  'Aguacate',
  'Avena',
  'Tortillas',
  'Queso panela',
];

function getDefaultCategoryByHour(): MealCategory {
  const hour = new Date().getHours();
  if (hour < 12) return 'desayuno';
  if (hour < 18) return 'comida';
  return 'cena';
}

function parseIngredientTokens(rawText: string): string[] {
  return rawText
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function buildItemsFromSuggestion(meal: SuggestedMeal): DetectedFoodItem[] {
  const list = meal.ingredients.length > 0 ? meal.ingredients : [meal.mealName];
  const count = list.length;
  const baseCal = Math.floor(meal.totalCalories / count);
  const remainderCal = meal.totalCalories - baseCal * count;

  return list.map((ing, idx) => ({
    name: ing,
    portion: '1 porción',
    calories: idx === 0 ? baseCal + remainderCal : baseCal,
    protein: idx === 0 ? Math.max(0, meal.protein - Math.floor(meal.protein / count) * (count - 1)) : Math.floor(meal.protein / count),
    carbs: idx === 0 ? Math.max(0, meal.carbs - Math.floor(meal.carbs / count) * (count - 1)) : Math.floor(meal.carbs / count),
    fat: idx === 0 ? Math.max(0, meal.fat - Math.floor(meal.fat / count) * (count - 1)) : Math.floor(meal.fat / count),
  }));
}

export const MealSuggestionsView: React.FC<MealSuggestionsViewProps> = ({
  profile,
  selectedDate,
  entriesForDay,
  hasApiKey,
  onSaveMeal,
}) => {
  const [mode, setMode] = useState<SuggestionMode>('goal');
  const [targetCategory, setTargetCategory] = useState<MealCategory>(() =>
    getDefaultCategoryByHour()
  );

  // Estado para modo "Con lo que tengo"
  const [ingredientInput, setIngredientInput] = useState<string>('');
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
  const [pantryCategoryFilter, setPantryCategoryFilter] =
    useState<PantryCategoryFilter>('any');
  const [adjustToRemaining, setAdjustToRemaining] = useState<boolean>(true);

  // Resultados separados por modo para no perderlos al alternar pestañas internas
  const [goalMeals, setGoalMeals] = useState<SuggestedMeal[]>([]);
  const [pantryMeals, setPantryMeals] = useState<SuggestedMeal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [variationSeed, setVariationSeed] = useState<number>(0);
  const [registeredMealIds, setRegisteredMealIds] = useState<Record<string, boolean>>({});
  const [savedNotice, setSavedNotice] = useState<string>('');
  const [hasInitializedGoal, setHasInitializedGoal] = useState<boolean>(false);

  const targetCalories = calculateCalorieTarget(profile);
  const macroTargets = calculateMacroTargets(targetCalories, profile.goal);

  const consumed = useMemo(
    () =>
      entriesForDay.reduce(
        (acc, entry) => {
          acc.calories += entry.totalCalories;
          acc.protein += entry.protein;
          acc.carbs += entry.carbs;
          acc.fat += entry.fat;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [entriesForDay]
  );

  const remainingCalories = targetCalories - consumed.calories;
  const remainingMacros = useMemo(
    () => ({
      protein: Math.max(0, macroTargets.protein - consumed.protein),
      carbs: Math.max(0, macroTargets.carbs - consumed.carbs),
      fat: Math.max(0, macroTargets.fat - consumed.fat),
    }),
    [macroTargets, consumed]
  );

  const runGoalSuggestions = useCallback(
    async (categoryToUse: MealCategory, nextSeed: number) => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const suggestions = await generateMealSuggestions({
          mode: 'goal',
          profile,
          remainingCalories,
          remainingMacros,
          targetCategory: categoryToUse,
          variationSeed: nextSeed,
        });
        setGoalMeals(suggestions);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'No se pudieron generar sugerencias en este momento.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [profile, remainingCalories, remainingMacros]
  );

  // Cargar recomendaciones iniciales al entrar en modo "Para mi meta de hoy"
  useEffect(() => {
    if (mode === 'goal' && !hasInitializedGoal) {
      setHasInitializedGoal(true);
      void runGoalSuggestions(targetCategory, 0);
    }
  }, [mode, hasInitializedGoal, runGoalSuggestions, targetCategory]);

  const handleSelectGoalCategory = (cat: MealCategory) => {
    setTargetCategory(cat);
    const nextSeed = variationSeed + 1;
    setVariationSeed(nextSeed);
    void runGoalSuggestions(cat, nextSeed);
  };

  const handleRegenerateGoal = () => {
    const nextSeed = variationSeed + 1;
    setVariationSeed(nextSeed);
    void runGoalSuggestions(targetCategory, nextSeed);
  };

  const addIngredientsList = (tokens: string[]): string[] => {
    const existingNormalized = new Set(
      pantryIngredients.map((i) => i.toLowerCase())
    );
    const nextList = [...pantryIngredients];
    for (const token of tokens) {
      const clean = token.trim();
      if (clean && !existingNormalized.has(clean.toLowerCase())) {
        existingNormalized.add(clean.toLowerCase());
        nextList.push(clean);
      }
    }
    setPantryIngredients(nextList);
    return nextList;
  };

  const handleAddFromInput = () => {
    const tokens = parseIngredientTokens(ingredientInput);
    if (tokens.length === 0) return;
    addIngredientsList(tokens);
    setIngredientInput('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddFromInput();
    }
  };

  const handleQuickIngredient = (name: string) => {
    const exists = pantryIngredients.some(
      (i) => i.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setPantryIngredients((prev) =>
        prev.filter((i) => i.toLowerCase() !== name.toLowerCase())
      );
    } else {
      addIngredientsList([name]);
    }
  };

  const handleGeneratePantryMeals = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const pendingTokens = parseIngredientTokens(ingredientInput);
    const finalIngredients =
      pendingTokens.length > 0
        ? addIngredientsList(pendingTokens)
        : pantryIngredients;
    if (pendingTokens.length > 0) {
      setIngredientInput('');
    }

    if (finalIngredients.length === 0) {
      setErrorMsg('Agrega al menos un ingrediente para buscar ideas de platillos.');
      return;
    }

    const nextSeed = variationSeed + 1;
    setVariationSeed(nextSeed);
    setIsLoading(true);
    setErrorMsg('');

    try {
      const suggestions = await generateMealSuggestions({
        mode: 'pantry',
        profile,
        remainingCalories,
        remainingMacros,
        targetCategory,
        pantryCategoryFilter,
        pantryIngredients: finalIngredients,
        adjustToRemainingCalories: adjustToRemaining,
        variationSeed: nextSeed,
      });
      setPantryMeals(suggestions);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudieron generar platillos con tus ingredientes.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSuggestedMeal = (meal: SuggestedMeal) => {
    const entry: MealEntry = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: selectedDate,
      timestamp: Date.now(),
      category: meal.category,
      mealName: meal.mealName,
      totalCalories: meal.totalCalories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      items: buildItemsFromSuggestion(meal),
      aiTip: meal.preparationTip,
      isDemo: meal.isDemo,
    };

    onSaveMeal(entry);
    setRegisteredMealIds((prev) => ({ ...prev, [meal.id]: true }));
    setSavedNotice(
      `"${meal.mealName}" agregado a ${MEAL_CATEGORY_META[meal.category].label}`
    );
    setTimeout(() => setSavedNotice(''), 3000);
  };

  const activeMeals = mode === 'goal' ? goalMeals : pantryMeals;

  return (
    <div className="space-y-4 pb-28">
      {/* Encabezado limpio */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            Ideas inteligentes • {formatDateLabel(selectedDate)}
          </p>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
              Platillos <span className="text-emerald-600">IA</span>
            </h1>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                hasApiKey ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={hasApiKey ? 'Gemini IA activa' : 'Modo Demo'}
            />
          </div>
        </div>
        <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 shrink-0">
          {GOAL_LABELS[profile.goal].badge}
        </span>
      </div>

      {/* Selector superior de 2 modos */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-200/70 p-1">
        <button
          type="button"
          onClick={() => {
            setErrorMsg('');
            setMode('goal');
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition ${
            mode === 'goal'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Para mi meta de hoy</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setErrorMsg('');
            setMode('pantry');
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition ${
            mode === 'pantry'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5 shrink-0" />
          <span>Con lo que tengo</span>
        </button>
      </div>

      {/* MODO 1: Para mi meta de hoy */}
      {mode === 'goal' && (
        <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Presupuesto restante hoy
              </p>
              <p
                className={`text-xl font-black leading-tight ${
                  remainingCalories < 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {remainingCalories > 0
                  ? `${remainingCalories.toLocaleString('es-MX')} kcal`
                  : remainingCalories === 0
                    ? 'Meta alcanzada'
                    : `+${Math.abs(remainingCalories).toLocaleString('es-MX')} kcal excedidas`}
              </p>
            </div>
            <div className="text-right text-[11px] font-semibold text-slate-500">
              <p>P: {Math.round(remainingMacros.protein)}g • C: {Math.round(remainingMacros.carbs)}g</p>
              <p>G: {Math.round(remainingMacros.fat)}g restantes</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Tiempo de comida
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['desayuno', 'comida', 'cena'] as MealCategory[]).map((cat) => {
                const active = targetCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSelectGoalCategory(cat)}
                    className={`rounded-2xl py-2 text-xs font-bold border transition ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {MEAL_CATEGORY_META[cat].label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleRegenerateGoal}
            className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 active:scale-[0.99] text-white py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Generar nuevas opciones</span>
          </button>
        </div>
      )}

      {/* MODO 2: Con lo que tengo */}
      {mode === 'pantry' && (
        <form
          onSubmit={handleGeneratePantryMeals}
          className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-3.5"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                ¿Qué ingredientes tienes disponibles?
              </label>
              {pantryIngredients.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPantryIngredients([]);
                    setIngredientInput('');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpiar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ej. pollo, arroz, aguacate..."
                className="flex-1 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddFromInput}
                className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white p-2.5 shrink-0 transition"
                aria-label="Agregar ingrediente"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Chips de ingredientes agregados */}
            {pantryIngredients.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {pantryIngredients.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() =>
                        setPantryIngredients((prev) =>
                          prev.filter((x) => x !== item)
                        )
                      }
                      className="text-emerald-600 hover:text-emerald-900"
                      aria-label={`Quitar ${item}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Sugerencias rápidas */}
            <div className="mt-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Toca para agregar rápido
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_INGREDIENTS.map((ing) => {
                  const selected = pantryIngredients.some(
                    (i) => i.toLowerCase() === ing.toLowerCase()
                  );
                  return (
                    <button
                      key={ing}
                      type="button"
                      onClick={() => handleQuickIngredient(ing)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border transition ${
                        selected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {selected ? `✓ ${ing}` : `+ ${ing}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filtro opcional de tiempo de comida */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tiempo de comida (opcional)
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { value: 'any', label: 'Cualquiera' },
                  { value: 'desayuno', label: 'Desayuno' },
                  { value: 'comida', label: 'Comida' },
                  { value: 'cena', label: 'Cena' },
                ] as { value: PantryCategoryFilter; label: string }[]
              ).map((opt) => {
                const active = pantryCategoryFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPantryCategoryFilter(opt.value)}
                    className={`rounded-xl py-1.5 px-1 text-[11px] font-bold border transition truncate ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 px-3 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
            <span>
              Ajustar porciones a mis{' '}
              <strong>
                {Math.max(0, remainingCalories).toLocaleString('es-MX')} kcal
              </strong>{' '}
              restantes
            </span>
            <input
              type="checkbox"
              checked={adjustToRemaining}
              onChange={(e) => setAdjustToRemaining(e.target.checked)}
              className="h-4 w-4 accent-emerald-600 rounded shrink-0"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 active:scale-[0.99] text-white py-3 text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChefHat className="w-4 h-4" />
            )}
            <span>Recomendar con mis ingredientes</span>
          </button>
        </form>
      )}

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
          {errorMsg}
        </div>
      )}

      {savedNotice && (
        <div className="rounded-2xl bg-emerald-900 text-white px-4 py-3 text-xs font-bold flex items-center gap-2 shadow-lg">
          <Check className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Lista de Resultados */}
      {isLoading ? (
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center gap-2.5">
          <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
          <p className="text-sm font-extrabold text-slate-900">
            {mode === 'goal'
              ? 'Buscando platillos ideales para tu meta...'
              : 'Creando recetas con tus ingredientes...'}
          </p>
          <p className="text-xs text-slate-500">
            Calculando porciones, calorías y macronutrientes
          </p>
        </div>
      ) : activeMeals.length > 0 ? (
        <div className="space-y-3">
          {activeMeals.map((meal) => {
            const catMeta = MEAL_CATEGORY_META[meal.category];
            const isRegistered = Boolean(registeredMealIds[meal.id]);
            return (
              <article
                key={meal.id}
                className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${catMeta.accentBg} ${catMeta.accentText} ${catMeta.accentBorder}`}
                      >
                        {catMeta.label}
                      </span>
                      {meal.isDemo && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Sugerencia local
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {meal.mealName}
                    </h2>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-emerald-700 leading-none">
                      {meal.totalCalories}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      kcal
                    </span>
                  </div>
                </div>

                {/* Desglose de Macros */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-sky-50/70 py-1.5 px-2">
                    <span className="block text-[10px] text-slate-500">
                      Proteína
                    </span>
                    <span className="text-xs font-extrabold text-sky-700">
                      {meal.protein} g
                    </span>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 py-1.5 px-2">
                    <span className="block text-[10px] text-slate-500">
                      Carbos
                    </span>
                    <span className="text-xs font-extrabold text-amber-700">
                      {meal.carbs} g
                    </span>
                  </div>
                  <div className="rounded-xl bg-rose-50/70 py-1.5 px-2">
                    <span className="block text-[10px] text-slate-500">
                      Grasas
                    </span>
                    <span className="text-xs font-extrabold text-rose-700">
                      {meal.fat} g
                    </span>
                  </div>
                </div>

                {/* Coincidencia en modo "Con lo que tengo" */}
                {mode === 'pantry' &&
                  ((meal.matchedIngredients &&
                    meal.matchedIngredients.length > 0) ||
                    (meal.extraIngredients &&
                      meal.extraIngredients.length > 0)) && (
                    <div className="space-y-1 text-[11px]">
                      {meal.matchedIngredients &&
                        meal.matchedIngredients.length > 0 && (
                          <p className="text-emerald-800 font-semibold">
                            <span className="font-bold">Usa tuyos:</span>{' '}
                            {meal.matchedIngredients.join(', ')}
                          </p>
                        )}
                      {meal.extraIngredients &&
                        meal.extraIngredients.length > 0 && (
                          <p className="text-slate-500">
                            <span className="font-bold">Extra básico:</span>{' '}
                            {meal.extraIngredients.join(', ')}
                          </p>
                        )}
                    </div>
                  )}

                {/* Ingredientes + Tip de preparación */}
                <div className="rounded-2xl bg-slate-50 p-3 space-y-1.5 text-xs">
                  {meal.ingredients.length > 0 && (
                    <p className="text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">Ingredientes:</strong>{' '}
                      {meal.ingredients.join(' • ')}
                    </p>
                  )}
                  <p className="text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Preparación:</strong>{' '}
                    {meal.preparationTip}
                  </p>
                </div>

                {/* Por qué encaja */}
                <p className="text-[11px] font-medium text-emerald-800 bg-emerald-50/70 border border-emerald-100 rounded-xl px-3 py-2">
                  {meal.fitReason}
                </p>

                {/* Botón de registro directo */}
                <button
                  type="button"
                  onClick={() => handleRegisterSuggestedMeal(meal)}
                  className={`w-full rounded-2xl py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                    isRegistered
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-sm'
                  }`}
                >
                  {isRegistered ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        Registrado en {catMeta.label} (toca para agregar otro)
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Registrar en {catMeta.label}</span>
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        mode === 'pantry' && (
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 text-center space-y-2">
            <div className="mx-auto w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <p className="text-sm font-extrabold text-slate-900">
              Arma tu comida con lo que tienes
            </p>
            <p className="text-xs text-slate-500">
              Escribe tus ingredientes o toca las etiquetas rápidas de arriba y
              presiona <strong>Recomendar con mis ingredientes</strong>.
            </p>
          </div>
        )
      )}
    </div>
  );
};
