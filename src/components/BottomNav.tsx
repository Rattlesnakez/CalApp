import React from 'react';
import { BarChart3, Camera, Home, User } from 'lucide-react';
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
      <div className="w-full max-w-md pointer-events-auto bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 pt-2 pb-safe shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-4 items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectTab('hoy')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
              activeTab === 'hoy'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="mt-0.5 text-[11px] font-bold">Hoy</span>
          </button>

          <button
            type="button"
            onClick={onOpenScanner}
            className="flex flex-col items-center justify-center -mt-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/35 flex items-center justify-center active:scale-95 transition ring-4 ring-white">
              <Camera className="w-6 h-6" />
            </div>
            <span className="mt-1 text-[11px] font-extrabold text-emerald-700">
              Foto IA
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('historial')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
              activeTab === 'historial'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="mt-0.5 text-[11px] font-bold">Historial</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('perfil')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
              activeTab === 'perfil'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="mt-0.5 text-[11px] font-bold">Mi Perfil</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
