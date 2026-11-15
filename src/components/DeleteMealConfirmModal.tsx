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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-safe bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-meal-dialog-title"
    >
      <div className="w-full max-w-sm max-h-[86dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2
              id="delete-meal-dialog-title"
              className="text-base font-extrabold text-slate-900"
            >
              ¿Eliminar comida?
            </h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              ¿Eliminar <strong>{entry.mealName}</strong> (
              <strong>{entry.totalCalories} kcal</strong>) de {categoryLabel}?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
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
