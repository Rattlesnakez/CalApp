import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { PhotoPreviewData } from '../types';
import { MEAL_CATEGORY_META } from '../utils/nutrition';

interface PhotoPreviewModalProps {
  preview: PhotoPreviewData | null;
  onClose: () => void;
}

/**
 * Lightbox en pantalla completa para inspeccionar la foto de un platillo.
 */
export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  preview,
  onClose,
}) => {
  useEffect(() => {
    if (!preview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preview, onClose]);

  if (!preview) return null;

  const categoryLabel = MEAL_CATEGORY_META[preview.category].label;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 pt-safe pb-safe"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${preview.mealName}`}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar vista previa"
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-slate-900/80 border border-white/15 text-white hover:bg-slate-800 active:scale-95 flex items-center justify-center shadow-lg transition"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className="w-full max-w-md flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={preview.src}
          alt={preview.mealName}
          className="max-w-full max-h-[75dvh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10 bg-slate-950"
        />

        <div className="mt-3 w-full max-w-sm rounded-2xl bg-slate-900/90 border border-white/10 px-4 py-2.5 text-white flex items-center justify-between gap-3 shadow-xl">
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {categoryLabel}
            </span>
            <p className="text-sm font-extrabold truncate">{preview.mealName}</p>
          </div>
          <span className="text-sm font-black text-emerald-400 shrink-0">
            {preview.totalCalories} kcal
          </span>
        </div>
      </div>
    </div>
  );
};
