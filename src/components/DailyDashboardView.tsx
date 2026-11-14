import React from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Flame,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import type { MealCategory, MealEntry, UserProfile } from '../types';
import {
  MEAL_CATEGORY_META,
  calculateCalorieTarget,
  calculateMacroTargets,
  evaluateDailyStatus,
  formatDateLabel,
  getLocalDateKey,
  shiftDateKey,
} from '../utils/nutrition';

interface DailyDashboardViewProps {
  profile: UserProfile;
  selectedDate: string;
  onChangeDate: (dateKey: string) => void;
  entriesForDay: MealEntry[];
  onOpenScanner: (category: MealCategory) => void;
  onDeleteEntry: (entryId: string) => void;
  hasApiKey: boolean;
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
  onDeleteEntry,
  hasApiKey,
}) => {
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
  const radius = 58;
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
          container:
            'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-100',
          badge: 'bg-emerald-600 text-white',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />,
        }
      : evaluation.status === 'excedio'
        ? {
            container:
              'bg-rose-50 border-rose-300 text-rose-950 shadow-rose-100',
            badge: 'bg-rose-600 text-white',
            icon: <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />,
          }
        : {
            container:
              'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-100',
            badge: 'bg-amber-500 text-white',
            icon: <Clock className="w-6 h-6 text-amber-600 shrink-0" />,
          };

  return (
    <div className="space-y-4 pb-28">
      {/* Header superior con saludo y estado IA */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            Hola, {profile.name}
          </p>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            CalApp <span className="text-emerald-600">IA</span>
          </h1>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border ${
            hasApiKey
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {hasApiKey ? 'Gemini IA' : 'Modo Demo'}
        </span>
      </div>

      {/* Selector de Fecha */}
      <div className="flex items-center justify-between rounded-2xl bg-white px-2 py-2 shadow-sm border border-slate-200/80">
        <button
          type="button"
          onClick={() => onChangeDate(shiftDateKey(selectedDate, -1))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 transition"
          aria-label="Día anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 capitalize">
            {formatDateLabel(selectedDate)}
          </span>
          {!isToday && (
            <button
              type="button"
              onClick={() => onChangeDate(todayKey)}
              className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-200"
            >
              Ir a Hoy
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onChangeDate(shiftDateKey(selectedDate, 1))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 transition"
          aria-label="Día siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Tarjeta Principal: Anillo + Macros */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-5">
          {/* Anillo Circular */}
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 136 136">
              <circle
                cx="68"
                cy="68"
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="12"
              />
              <circle
                cx="68"
                cy="68"
                r={radius}
                fill="none"
                stroke={ringStrokeColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900 leading-none">
                {totals.calories.toLocaleString('es-MX')}
              </span>
              <span className="mt-1 text-[11px] font-semibold text-slate-400">
                de {targetCalories.toLocaleString('es-MX')} kcal
              </span>
            </div>
          </div>

          {/* Métricas Laterales */}
          <div className="flex-1 space-y-2.5">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Meta necesaria
              </p>
              <p className="text-base font-extrabold text-slate-900">
                {targetCalories.toLocaleString('es-MX')} kcal
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {evaluation.status === 'excedio' ? 'Excedente' : 'Restante'}
              </p>
              <p
                className={`text-base font-extrabold ${
                  evaluation.status === 'excedio'
                    ? 'text-rose-600'
                    : evaluation.status === 'cumplio'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                }`}
              >
                {evaluation.status === 'excedio'
                  ? `+${evaluation.diff.toLocaleString('es-MX')} kcal`
                  : `${Math.max(0, targetCalories - totals.calories).toLocaleString('es-MX')} kcal`}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Progreso: <strong>{evaluation.percentage}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Barras de Macronutrientes */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
          {[
            {
              label: 'Proteína',
              current: totals.protein,
              target: macroTargets.protein,
              barColor: 'bg-sky-500',
              textColor: 'text-sky-700',
            },
            {
              label: 'Carbos',
              current: totals.carbs,
              target: macroTargets.carbs,
              barColor: 'bg-amber-500',
              textColor: 'text-amber-700',
            },
            {
              label: 'Grasas',
              current: totals.fat,
              target: macroTargets.fat,
              barColor: 'bg-rose-500',
              textColor: 'text-rose-700',
            },
          ].map((macro) => {
            const pct = Math.min(
              100,
              Math.round((macro.current / Math.max(1, macro.target)) * 100)
            );
            return (
              <div key={macro.label}>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="font-semibold text-slate-600">
                    {macro.label}
                  </span>
                  <span className={`font-bold ${macro.textColor}`}>
                    {Math.round(macro.current)}g
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${macro.barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Meta {macro.target}g
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner Prominente de Veredicto Diario */}
      <div
        data-testid="daily-verdict-banner"
        className={`rounded-3xl border p-4 shadow-sm transition-colors ${verdictStyles.container}`}
      >
        <div className="flex items-start gap-3">
          {verdictStyles.icon}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${verdictStyles.badge}`}
              >
                {evaluation.shortLabel}
              </span>
              <span className="text-xs font-semibold opacity-75">
                Rango ideal: {evaluation.minIdeal.toLocaleString('es-MX')} -{' '}
                {evaluation.maxIdeal.toLocaleString('es-MX')} kcal
              </span>
            </div>
            <p className="mt-1.5 text-sm font-extrabold leading-snug">
              {evaluation.label}
            </p>
            <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
              {evaluation.description}
            </p>
          </div>
        </div>
      </div>

      {/* Las 3 Comidas del Día: Desayuno, Comida, Cena */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Comidas del Día
          </h2>
          <span className="text-xs text-slate-500">
            Desayuno • Comida • Cena
          </span>
        </div>

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
              className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80"
            >
              {/* Encabezado de la Categoría */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${meta.accentBg} ${meta.accentText} ${meta.accentBorder}`}
                  >
                    <CategoryIcon category={category} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {meta.label}
                      </h3>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 rounded-full px-2 py-0.5">
                        {categoryCalories} kcal
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Sugerido ~{suggestedKcal} kcal
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenScanner(category)}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Foto IA</span>
                </button>
              </div>

              {/* Lista de platillos registrados */}
              {categoryEntries.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                  {categoryEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl bg-slate-50 p-3 flex items-start gap-3 border border-slate-100"
                    >
                      {entry.photoDataUrl ? (
                        <img
                          src={entry.photoDataUrl}
                          alt={entry.mealName}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 bg-white"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                          <CategoryIcon category={category} className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                            {entry.mealName}
                          </h4>
                          <button
                            type="button"
                            onClick={() => onDeleteEntry(entry.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition shrink-0"
                            aria-label={`Eliminar ${entry.mealName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-extrabold text-emerald-700">
                            {entry.totalCalories} kcal
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">
                            P {entry.protein}g • C {entry.carbs}g • G {entry.fat}g
                          </span>
                        </div>

                        {entry.items.length > 0 && (
                          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                            {entry.items
                              .map((it) => `${it.name} (${it.calories} kcal)`)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenScanner(category)}
                  className="mt-3 w-full rounded-2xl border border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-400 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/40 flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  Registrar {meta.label.toLowerCase()} con foto o manual
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
