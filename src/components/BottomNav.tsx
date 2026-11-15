import React from 'react';
import { BarChart3, Camera, Home, User, Utensils } from 'lucide-react';
import type { AppTab } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenScanner: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenScanner,
}) => {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none"
    >
      <div className="w-full max-w-md pointer-events-auto bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-2 pb-safe shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-5 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelectTab('hoy')}
            className={`min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition ${
              activeTab === 'hoy'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="mt-0.5 text-[10px] sm:text-[11px] font-bold truncate max-w-full">
              Hoy
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('platillos')}
            className={`min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition ${
              activeTab === 'platillos'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Utensils className="w-5 h-5 shrink-0" />
            <span className="mt-0.5 text-[10px] sm:text-[11px] font-bold truncate max-w-full">
              Platillos
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenScanner}
            className="min-w-0 flex flex-col items-center justify-center -mt-6"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/35 flex items-center justify-center active:scale-95 transition ring-4 ring-white">
              <Camera className="w-6 h-6" />
            </div>
            <span className="mt-1 text-[10px] sm:text-[11px] font-extrabold text-emerald-700 truncate max-w-full">
              Foto IA
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('historial')}
            className={`min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition ${
              activeTab === 'historial'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span className="mt-0.5 text-[10px] sm:text-[11px] font-bold truncate max-w-full">
              Historial
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('perfil')}
            className={`min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition ${
              activeTab === 'perfil'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="mt-0.5 text-[10px] sm:text-[11px] font-bold truncate max-w-full">
              Mi Perfil
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};
