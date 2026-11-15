import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { MealEntry } from '../types';
import { MEAL_CATEGORY_META } from '../utils/nutrition';

interface DeleteMealConfirmModalProps {
  entry: MealEntry | null;
  onCancel: () => void;
  onConfirm: (entryId: string) => void;
}

/**
 * Modal de confirmación en español antes de eliminar una comida registrada.
 */
export const DeleteMealConfirmModal: React.FC<DeleteMealConfirmModalProps> = ({
  entry,
  onCancel,
  onConfirm,
}) => {
  if (!entry) return null;

  const categoryLabel = MEAL_CATEGORY_META[entry.category].label;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-safe bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-meal-dialog-title"
    >
      <div className="w-full max-w-sm max-h-[86dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2
              id="delete-meal-dialog-title"
              className="text-base font-extrabold text-slate-900 dark:text-slate-100"
            >
              ¿Eliminar comida?
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              ¿Eliminar <strong>{entry.mealName}</strong> (
              <strong>{entry.totalCalories} kcal</strong>) de {categoryLabel}?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(entry.id)}
            className="rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white py-2.5 text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
