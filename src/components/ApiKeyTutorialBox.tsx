import React from 'react';
import { ExternalLink, KeyRound } from 'lucide-react';

interface ApiKeyTutorialBoxProps {
  footerNote?: string;
}

export const ApiKeyTutorialBox: React.FC<ApiKeyTutorialBoxProps> = ({
  footerNote,
}) => {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3.5 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
      <div className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-slate-100">
        <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        Cómo conseguir tu API Key gratis en 3 pasos
      </div>

      <ol className="space-y-2 pl-1">
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            1
          </span>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Abre Google AI Studio:
            </span>{' '}
            entra a{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800 dark:hover:text-emerald-300"
            >
              aistudio.google.com/apikey
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            e inicia sesión con tu cuenta de Google.
          </div>
        </li>

        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            2
          </span>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Crea tu clave gratuita:
            </span>{' '}
            toca el botón <strong>"Create API key"</strong> (Crear clave de
            API) y selecciona cualquier proyecto.
          </div>
        </li>

        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            3
          </span>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Copia y pega aquí:
            </span>{' '}
            copia el código (empieza con{' '}
            <code className="rounded bg-slate-200/80 dark:bg-slate-700 px-1 py-0.5 font-mono text-[11px] text-slate-900 dark:text-slate-100">
              AIzaSy...
            </code>
            ) y guárdalo en <strong>Mi Perfil</strong>.
          </div>
        </li>
      </ol>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200/80 dark:border-slate-700 pt-2">
        {footerNote ??
          'Tu clave se guarda únicamente en la memoria local de tu teléfono y el nivel estándar de Google AI Studio es gratuito.'}
      </p>
    </div>
  );
};
