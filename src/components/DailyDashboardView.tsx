import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
} from 'lucide-react';
import type {
  MealCategory,
  MealEntry,
  PhotoPreviewData,
  ThemeMode,
  UserProfile,
} from '../types';
import {
  MEAL_CATEGORY_META,
  calculateCalorieTarget,
  calculateMacroTargets,
  evaluateDailyStatus,
  formatDateLabel,
  getLocalDateKey,
  shiftDateKey,
} from '../utils/nutrition';
import { DeleteMealConfirmModal } from './DeleteMealConfirmModal';

interface DailyDashboardViewProps {
  profile: UserProfile;
  selectedDate: string;
  onChangeDate: (dateKey: string) => void;
  entriesForDay: MealEntry[];
  onOpenScanner: (category: MealCategory) => void;
  onEditEntry: (entry: MealEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  hasApiKey: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onPreviewPhoto: (data: PhotoPreviewData) => void;
}

const CATEGORY_ORDER: MealCategory[] = ['desayuno', 'comida', 'cena'];

const CategoryIcon: React.FC<{ category: MealCategory; className?: string }> = ({
  category,
  className = 'w-5 h-5',
}) => {
  if (category === 'desayuno') return <Coffee className={className} />;
  if (category === 'comida') return <Sun className={className} />;
  return <Moon className={className} />;
};

export const DailyDashboardView: React.FC<DailyDashboardViewProps> = ({
  profile,
  selectedDate,
  onChangeDate,
  entriesForDay,
  onOpenScanner,
  onEditEntry,
  onDeleteEntry,
  hasApiKey,
  theme,
  onToggleTheme,
  onPreviewPhoto,
}) => {
  const [entryPendingDelete, setEntryPendingDelete] =
    useState<MealEntry | null>(null);
  const targetCalories = calculateCalorieTarget(profile);
  const macroTargets = calculateMacroTargets(targetCalories, profile.goal);

  const totals = entriesForDay.reduce(
    (acc, entry) => {
      acc.calories += entry.totalCalories;
      acc.protein += entry.protein;
      acc.carbs += entry.carbs;
      acc.fat += entry.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const evaluation = evaluateDailyStatus(totals.calories, targetCalories);
  const todayKey = getLocalDateKey();
  const isToday = selectedDate === todayKey;

  // Parámetros del anillo SVG
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, totals.calories / Math.max(1, targetCalories));
  const strokeDashoffset = circumference * (1 - progressRatio);

  const ringStrokeColor =
    evaluation.status === 'cumplio'
      ? '#10b981'
      : evaluation.status === 'excedio'
        ? '#f43f5e'
        : '#f59e0b';

  const verdictStyles =
    evaluation.status === 'cumplio'
      ? {
          strip:
            'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200',
          badge: 'bg-emerald-600 text-white',
          headline: 'text-emerald-600 dark:text-emerald-400',
          icon: (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ),
        }
      : evaluation.status === 'excedio'
        ? {
            strip:
              'bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 text-rose-900 dark:text-rose-200',
            badge: 'bg-rose-600 text-white',
            headline: 'text-rose-600 dark:text-rose-400',
            icon: (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ),
          }
        : {
            strip:
              'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200',
            badge: 'bg-amber-500 text-white',
            headline: 'text-slate-900 dark:text-slate-100',
            icon: (
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ),
          };

  const remainingCalories = Math.max(0, targetCalories - totals.calories);

  return (
    <div className="space-y-4 pb-28">
      {/* Header + Selector de Fecha + Botón de Tema */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            Hola, {profile.name}
          </p>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              CalApp{' '}
              <span className="text-emerald-600 dark:text-emerald-400">IA</span>
            </h1>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                hasApiKey ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              title={hasApiKey ? 'Gemini IA activa' : 'Modo Demo'}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isToday && (
            <button
              type="button"
              onClick={() => onChangeDate(todayKey)}
              className="rounded-full bg-emerald-100 dark:bg-emerald-950/70 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition"
            >
              Ir a Hoy
            </button>
          )}
          <div className="inline-flex items-center rounded-full bg-white dark:bg-slate-900 px-1 py-1 shadow-xs border border-slate-200/90 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onChangeDate(shiftDateKey(selectedDate, -1))}
              className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-100 capitalize whitespace-nowrap">
              {formatDateLabel(selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => onChangeDate(shiftDateKey(selectedDate, 1))}
              className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark'
                ? 'Cambiar a modo claro'
                : 'Cambiar a modo oscuro'
            }
            title={
              theme === 'dark'
                ? 'Cambiar a modo claro'
                : 'Cambiar a modo oscuro'
            }
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 flex items-center justify-center transition"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Tarjeta Unificada: Anillo + Veredicto + Macros */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-4">
          {/* Anillo Circular */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="10"
                className="stroke-slate-100 dark:stroke-slate-800"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={ringStrokeColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {totals.calories.toLocaleString('es-MX')}
              </span>
              <span className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                de {targetCalories.toLocaleString('es-MX')} kcal
              </span>
            </div>
          </div>

          {/* Estado principal sin repetición */}
          <div className="flex-1 min-w-0">
            <p className={`text-lg font-extrabold leading-tight ${verdictStyles.headline}`}>
              {evaluation.status === 'excedio'
                ? `+${evaluation.diff.toLocaleString('es-MX')} kcal sobre tu meta`
                : evaluation.status === 'cumplio'
                  ? '¡Meta cumplida!'
                  : `Faltan ${remainingCalories.toLocaleString('es-MX')} kcal`}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Consumido:{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                {evaluation.percentage}%
              </strong>{' '}
              de tu meta
            </p>
          </div>
        </div>

        {/* Franja compacta de Veredicto */}
        <div
          data-testid="daily-verdict-banner"
          className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs ${verdictStyles.strip}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {verdictStyles.icon}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${verdictStyles.badge}`}
            >
              {evaluation.shortLabel}
            </span>
          </div>
          <span className="text-[11px] font-semibold opacity-80 truncate">
            Ideal: {evaluation.minIdeal.toLocaleString('es-MX')}–
            {evaluation.maxIdeal.toLocaleString('es-MX')} kcal
          </span>
        </div>

        {/* Barras de Macronutrientes */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3">
          {[
            {
              label: 'Proteína',
              current: totals.protein,
              target: macroTargets.protein,
              barColor: 'bg-sky-500',
              textColor: 'text-sky-700 dark:text-sky-400',
            },
            {
              label: 'Carbos',
              current: totals.carbs,
              target: macroTargets.carbs,
              barColor: 'bg-amber-500',
              textColor: 'text-amber-700 dark:text-amber-400',
            },
            {
              label: 'Grasas',
              current: totals.fat,
              target: macroTargets.fat,
              barColor: 'bg-rose-500',
              textColor: 'text-rose-700 dark:text-rose-400',
            },
          ].map((macro) => {
            const pct = Math.min(
              100,
              Math.round((macro.current / Math.max(1, macro.target)) * 100)
            );
            return (
              <div key={macro.label}>
                <div className="flex items-baseline justify-between gap-1 text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {macro.label}
                  </span>
                  <span className={`font-bold ${macro.textColor} truncate`}>
                    {Math.round(macro.current)}/{macro.target}g
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${macro.barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Las 3 Comidas del Día: Desayuno, Comida, Cena */}
      <div className="space-y-2.5">
        {CATEGORY_ORDER.map((category) => {
          const meta = MEAL_CATEGORY_META[category];
          const categoryEntries = entriesForDay.filter(
            (e) => e.category === category
          );
          const categoryCalories = categoryEntries.reduce(
            (sum, e) => sum + e.totalCalories,
            0
          );
          const suggestedKcal = Math.round(targetCalories * meta.share);

          return (
            <section
              key={category}
              className="rounded-3xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200/80 dark:border-slate-800"
            >
              {/* Encabezado limpio con un único botón + Agregar */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${meta.accentBg} ${meta.accentText} ${meta.accentBorder}`}
                  >
                    <CategoryIcon category={category} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                      {meta.label}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {categoryCalories}
                      </span>{' '}
                      / ~{suggestedKcal} kcal
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenScanner(category)}
                  className="inline-flex items-center gap-1 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 active:scale-95 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 px-3 py-1.5 text-xs font-bold transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>

              {/* Lista compacta de platillos registrados */}
              {categoryEntries.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {categoryEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 flex items-center gap-3 border border-slate-100 dark:border-slate-800"
                    >
                      {entry.photoDataUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewPhoto({
                              src: entry.photoDataUrl!,
                              mealName: entry.mealName,
                              category: entry.category,
                              totalCalories: entry.totalCalories,
                            });
                          }}
                          aria-label={`Ver foto de ${entry.mealName}`}
                          className="relative group shrink-0 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <img
                            src={entry.photoDataUrl}
                            alt={entry.mealName}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:scale-105 transition-transform"
                          />
                        </button>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-400 dark:text-slate-500">
                          <CategoryIcon category={category} className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {entry.mealName}
                          </h4>
                          <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 shrink-0">
                            {entry.totalCalories} kcal
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          P {entry.protein}g • C {entry.carbs}g • G {entry.fat}g
                        </p>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditEntry(entry)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                          aria-label={`Editar ${entry.mealName}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEntryPendingDelete(entry)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          aria-label={`Eliminar ${entry.mealName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <DeleteMealConfirmModal
        entry={entryPendingDelete}
        onCancel={() => setEntryPendingDelete(null)}
        onConfirm={(entryId) => {
          onDeleteEntry(entryId);
          setEntryPendingDelete(null);
        }}
      />
    </div>
  );
};
