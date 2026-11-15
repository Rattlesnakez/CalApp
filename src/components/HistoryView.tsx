import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Pencil,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { MealEntry, UserProfile } from '../types';
import {
  MEAL_CATEGORY_META,
  calculateCalorieTarget,
  evaluateDailyStatus,
  formatDateLabel,
  getLocalDateKey,
  shiftDateKey,
} from '../utils/nutrition';
import { DeleteMealConfirmModal } from './DeleteMealConfirmModal';

interface HistoryViewProps {
  profile: UserProfile;
  allEntries: MealEntry[];
  onSelectDateInDashboard: (dateKey: string) => void;
  onEditEntry: (entry: MealEntry) => void;
  onDeleteEntry: (entryId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  profile,
  allEntries,
  onSelectDateInDashboard,
  onEditEntry,
  onDeleteEntry,
}) => {
  const targetCalories = calculateCalorieTarget(profile);
  const todayKey = getLocalDateKey();
  const [focusedDate, setFocusedDate] = useState<string>(todayKey);
  const [entryPendingDelete, setEntryPendingDelete] =
    useState<MealEntry | null>(null);

  const last7Days = useMemo(() => {
    const days = [];
    for (let offset = -6; offset <= 0; offset++) {
      const dateKey = shiftDateKey(todayKey, offset);
      const dayEntries = allEntries.filter((e) => e.date === dateKey);
      const calories = dayEntries.reduce((sum, e) => sum + e.totalCalories, 0);
      const evaluation = evaluateDailyStatus(calories, targetCalories);
      const [y, m, d] = dateKey.split('-').map(Number);
      const jsDate = new Date(y, (m || 1) - 1, d || 1);
      const weekdayShort = jsDate
        .toLocaleDateString('es-MX', { weekday: 'short' })
        .replace('.', '')
        .slice(0, 3);

      days.push({
        dateKey,
        weekdayShort,
        dayNum: d,
        calories,
        entries: dayEntries,
        evaluation,
      });
    }
    return days;
  }, [allEntries, targetCalories, todayKey]);

  const maxChartCalories = Math.max(
    targetCalories * 1.15,
    ...last7Days.map((d) => d.calories),
    1000
  );

  const daysMetCount = last7Days.filter(
    (d) => d.evaluation.status === 'cumplio'
  ).length;

  const activeDays = last7Days.filter((d) => d.calories > 0);
  const averageCalories =
    activeDays.length > 0
      ? Math.round(
          activeDays.reduce((sum, d) => sum + d.calories, 0) / activeDays.length
        )
      : 0;

  const focusedDayData =
    last7Days.find((d) => d.dateKey === focusedDate) ??
    last7Days[last7Days.length - 1];

  return (
    <div className="space-y-4 pb-28">
      {/* Encabezado */}
      <div className="pt-1">
        <p className="text-xs font-semibold text-slate-500">
          Resumen semanal de cumplimiento
        </p>
        <h1 className="text-xl font-extrabold text-slate-900">
          Historial de Calorías
        </h1>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            Días cumplidos
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {daysMetCount}{' '}
            <span className="text-sm font-semibold text-slate-400">/ 7 días</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Dentro de tu rango ideal
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
            <TrendingUp className="w-4 h-4" />
            Promedio diario
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {averageCalories.toLocaleString('es-MX')}{' '}
            <span className="text-sm font-semibold text-slate-400">kcal</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Meta: {targetCalories.toLocaleString('es-MX')} kcal
          </p>
        </div>
      </div>

      {/* Gráfico de Barras 7 Días */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            Últimos 7 días
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">
            Toca un día para ver detalle
          </span>
        </div>

        <div className="relative h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-1">
          {/* Línea punteada de Meta Diaria */}
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-slate-300 pointer-events-none flex justify-end"
            style={{
              bottom: `${Math.min(
                95,
                Math.round((targetCalories / maxChartCalories) * 100)
              )}%`,
            }}
          >
            <span className="-mt-4 bg-white px-1.5 text-[10px] font-bold text-slate-500">
              Meta {targetCalories}
            </span>
          </div>

          {last7Days.map((day) => {
            const heightPct =
              day.calories === 0
                ? 4
                : Math.max(
                    8,
                    Math.min(100, Math.round((day.calories / maxChartCalories) * 100))
                  );
            const barColor =
              day.calories === 0
                ? 'bg-slate-200'
                : day.evaluation.status === 'cumplio'
                  ? 'bg-emerald-500'
                  : day.evaluation.status === 'excedio'
                    ? 'bg-rose-500'
                    : 'bg-amber-400';

            const isFocused = day.dateKey === focusedDate;

            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => setFocusedDate(day.dateKey)}
                className="flex-1 h-full flex flex-col items-center justify-end group"
              >
                <span className="text-[10px] font-bold text-slate-500 mb-1">
                  {day.calories > 0 ? day.calories : '-'}
                </span>
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[32px] rounded-t-xl transition-all ${barColor} ${
                      isFocused ? 'ring-2 ring-slate-900 ring-offset-2' : 'opacity-90'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span
                  className={`mt-2 text-[11px] capitalize ${
                    isFocused
                      ? 'font-extrabold text-slate-900'
                      : 'font-medium text-slate-500'
                  }`}
                >
                  {day.weekdayShort}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Cumplió
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            No cumplió
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Excedió
          </span>
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold capitalize">
              {formatDateLabel(focusedDayData.dateKey)} ({focusedDayData.dateKey})
            </p>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-600" />
              {focusedDayData.calories.toLocaleString('es-MX')} kcal consumidas
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectDateInDashboard(focusedDayData.dateKey)}
            className="rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold"
          >
            Abrir día
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs">
          {focusedDayData.evaluation.status === 'cumplio' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : focusedDayData.evaluation.status === 'excedio' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span className="font-semibold text-slate-700">
            {focusedDayData.evaluation.label}
          </span>
        </div>

        {focusedDayData.entries.length > 0 ? (
          <div className="space-y-2">
            {focusedDayData.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 px-3 py-2.5 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-block text-[10px] font-bold uppercase text-emerald-700">
                    {MEAL_CATEGORY_META[entry.category].label}
                  </span>
                  <p className="font-bold text-slate-800 truncate">
                    {entry.mealName}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-extrabold text-slate-900 mr-1">
                    {entry.totalCalories} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditEntry(entry)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 transition"
                    aria-label={`Editar ${entry.mealName}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryPendingDelete(entry)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                    aria-label={`Eliminar ${entry.mealName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2">
            No hubo comidas registradas en esta fecha.
          </p>
        )}
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
