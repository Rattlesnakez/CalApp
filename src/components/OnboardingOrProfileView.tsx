import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  KeyRound,
  Scale,
  Sparkles,
  Target,
  User,
} from 'lucide-react';
import { ApiKeyTutorialBox } from './ApiKeyTutorialBox';
import type { ActivityLevel, Gender, GoalType, UserProfile } from '../types';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  calculateBMI,
  calculateBMR,
  calculateCalorieTarget,
  calculateMacroTargets,
  calculateTDEE,
} from '../utils/nutrition';
import { loadGeminiApiKey, saveGeminiApiKey } from '../utils/storage';

interface OnboardingOrProfileViewProps {
  profile: UserProfile;
  isInitialOnboarding: boolean;
  onSaveProfile: (nextProfile: UserProfile) => void;
}

export const OnboardingOrProfileView: React.FC<OnboardingOrProfileViewProps> = ({
  profile,
  isInitialOnboarding,
  onSaveProfile,
}) => {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [useCustomTarget, setUseCustomTarget] = useState<boolean>(
    Boolean(profile.customCalorieTarget)
  );
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => loadGeminiApiKey());
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showApiTutorial, setShowApiTutorial] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string>('');

  useEffect(() => {
    setDraft(profile);
    setUseCustomTarget(Boolean(profile.customCalorieTarget));
  }, [profile]);

  const effectiveProfile: UserProfile = {
    ...draft,
    age: Math.max(12, Math.min(100, Number(draft.age) || 25)),
    weightKg: Math.max(30, Math.min(250, Number(draft.weightKg) || 70)),
    heightCm: Math.max(110, Math.min(230, Number(draft.heightCm) || 170)),
    customCalorieTarget: useCustomTarget
      ? Math.max(800, Number(draft.customCalorieTarget) || 2000)
      : null,
  };

  const bmr = calculateBMR(effectiveProfile);
  const tdee = calculateTDEE(effectiveProfile);
  const targetCalories = calculateCalorieTarget(effectiveProfile);
  const macros = calculateMacroTargets(targetCalories, effectiveProfile.goal);
  const bmi = calculateBMI(effectiveProfile.weightKg, effectiveProfile.heightCm);
  const minIdeal = Math.round(targetCalories * 0.9);
  const maxIdeal = Math.round(targetCalories * 1.05);

  const hasApiKey = apiKeyInput.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveGeminiApiKey(apiKeyInput);
    onSaveProfile({
      ...effectiveProfile,
      name: draft.name.trim() || 'Usuario',
      onboardingCompleted: true,
    });
    if (!isInitialOnboarding) {
      setSavedToast('Perfil y análisis calórico actualizados');
      setTimeout(() => setSavedToast(''), 2600);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      {/* Encabezado */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-600/20">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          {isInitialOnboarding
            ? 'Configuración Inicial • CalApp IA'
            : 'Análisis Corporal y Metas'}
        </div>
        <h1 className="mt-1 text-xl font-bold leading-tight">
          {isInitialOnboarding
            ? 'Calcula tus calorías necesarias'
            : `Perfil nutricional de ${effectiveProfile.name}`}
        </h1>
        <p className="mt-1 text-sm text-emerald-50/90">
          Usamos tus datos personales para calcular exactamente cuántas calorías
          necesitas al día y evaluar si cumples o te excedes.
        </p>
      </div>

      {/* Tarjeta de Análisis Nutricional en Vivo */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">
                Calorías diarias requeridas
              </p>
              <p className="text-2xl font-extrabold text-slate-900">
                {targetCalories.toLocaleString('es-MX')}{' '}
                <span className="text-sm font-semibold text-slate-500">
                  kcal/día
                </span>
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            {GOAL_LABELS[effectiveProfile.goal].badge}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-slate-50 p-2.5">
            <p className="text-[11px] text-slate-500">Basal (TMB)</p>
            <p className="text-sm font-bold text-slate-800">{bmr} kcal</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-2.5">
            <p className="text-[11px] text-slate-500">Gasto (TDEE)</p>
            <p className="text-sm font-bold text-slate-800">{tdee} kcal</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-2.5">
            <p className="text-[11px] text-slate-500">IMC ({bmi.value})</p>
            <p className={`text-xs font-bold mt-0.5 ${bmi.colorClass}`}>
              {bmi.category}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3">
          <div className="flex items-center justify-between text-xs text-emerald-900 font-medium">
            <span>Rango para cumplir hoy:</span>
            <span className="font-bold">
              {minIdeal.toLocaleString('es-MX')} –{' '}
              {maxIdeal.toLocaleString('es-MX')} kcal
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/80 py-1.5 px-2">
              <span className="block text-[10px] text-slate-500">Proteínas</span>
              <span className="text-xs font-bold text-sky-700">
                {macros.protein} g
              </span>
            </div>
            <div className="rounded-xl bg-white/80 py-1.5 px-2">
              <span className="block text-[10px] text-slate-500">
                Carbohidratos
              </span>
              <span className="text-xs font-bold text-amber-700">
                {macros.carbs} g
              </span>
            </div>
            <div className="rounded-xl bg-white/80 py-1.5 px-2">
              <span className="block text-[10px] text-slate-500">Grasas</span>
              <span className="text-xs font-bold text-rose-700">
                {macros.fat} g
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Datos Personales */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <User className="w-4 h-4 text-emerald-600" />
          Datos Personales
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Nombre o apodo
          </label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Ej. Carlos"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Sexo biológico (para cálculo metabólico)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'male', label: 'Hombre' },
                { value: 'female', label: 'Mujer' },
              ] as { value: Gender; label: string }[]
            ).map((opt) => {
              const active = draft.gender === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft({ ...draft, gender: opt.value })}
                  className={`rounded-2xl py-2.5 text-sm font-semibold border transition ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Edad (años)
            </label>
            <input
              type="number"
              min={12}
              max={100}
              value={draft.age}
              onChange={(e) =>
                setDraft({ ...draft, age: Number(e.target.value) })
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 text-center focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Peso (kg)
            </label>
            <input
              type="number"
              min={30}
              max={250}
              step="0.5"
              value={draft.weightKg}
              onChange={(e) =>
                setDraft({ ...draft, weightKg: Number(e.target.value) })
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 text-center focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Altura (cm)
            </label>
            <input
              type="number"
              min={110}
              max={230}
              value={draft.heightCm}
              onChange={(e) =>
                setDraft({ ...draft, heightCm: Number(e.target.value) })
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 text-center focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Actividad Física */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-2.5">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Activity className="w-4 h-4 text-emerald-600" />
          Nivel de Actividad Física
        </div>
        <div className="space-y-2">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((lvl) => {
            const info = ACTIVITY_LABELS[lvl];
            const active = draft.activityLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setDraft({ ...draft, activityLevel: lvl })}
                className={`w-full text-left rounded-2xl p-3 border transition flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-bold ${
                      active ? 'text-emerald-900' : 'text-slate-800'
                    }`}
                  >
                    {info.label}
                  </p>
                  <p className="text-xs text-slate-500">{info.description}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    active
                      ? 'border-emerald-600 bg-emerald-600'
                      : 'border-slate-300'
                  }`}
                >
                  {active && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Objetivo */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Target className="w-4 h-4 text-emerald-600" />
          Tu Objetivo
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(GOAL_LABELS) as GoalType[]).map((goalKey) => {
            const info = GOAL_LABELS[goalKey];
            const active = draft.goal === goalKey;
            return (
              <button
                key={goalKey}
                type="button"
                onClick={() => setDraft({ ...draft, goal: goalKey })}
                className={`rounded-2xl p-2.5 border text-center transition ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <p className="text-xs font-bold leading-tight">{info.label}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    active ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {info.badge}
                </p>
              </button>
            );
          })}
        </div>

        {/* Meta manual opcional */}
        <div className="pt-2 border-t border-slate-100">
          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-500" />
              Fijar meta manual de calorías
            </span>
            <input
              type="checkbox"
              checked={useCustomTarget}
              onChange={(e) => {
                const checked = e.target.checked;
                setUseCustomTarget(checked);
                if (checked && !draft.customCalorieTarget) {
                  setDraft({ ...draft, customCalorieTarget: targetCalories });
                }
              }}
              className="h-4 w-4 accent-emerald-600 rounded"
            />
          </label>
          {useCustomTarget && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={800}
                max={6000}
                step={50}
                value={draft.customCalorieTarget ?? targetCalories}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    customCalorieTarget: Number(e.target.value),
                  })
                }
                className="w-full rounded-2xl border border-emerald-300 bg-emerald-50/40 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
              <span className="text-xs font-semibold text-slate-500 shrink-0">
                kcal/día
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Configuración de Gemini API */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            IA de Visión (Google Gemini)
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              hasApiKey
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {hasApiKey ? 'IA Gemini Activa' : 'Modo Demo Activo'}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Conecta tu clave de Google AI Studio para analizar fotos reales con{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700">
            gemini-4-hydrogen
          </code>
          . Si la dejas vacía, la app usará el <strong>Modo Demo</strong> para
          probar sin costo.
        </p>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AIzaSy... (Opcional)"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-3.5 pr-11 py-2.5 text-sm font-mono text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowApiKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
            aria-label={showApiKey ? 'Ocultar clave' : 'Mostrar clave'}
          >
            {showApiKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {hasApiKey && (
          <button
            type="button"
            onClick={() => {
              setApiKeyInput('');
              saveGeminiApiKey('');
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            Quitar API Key y usar Modo Demo
          </button>
        )}

        <div className="pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowApiTutorial((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {showApiTutorial
              ? 'Ocultar tutorial'
              : '¿Cómo conseguir mi API Key gratis? (Ver tutorial)'}
          </button>
          {showApiTutorial && (
            <div className="mt-2.5">
              <ApiKeyTutorialBox footerNote="La clave se guarda únicamente en este dispositivo (localStorage) y el nivel estándar de Google AI Studio es gratuito para uso personal." />
            </div>
          )}
        </div>
      </div>

      {savedToast && (
        <div className="rounded-2xl bg-emerald-900 text-white px-4 py-3 text-sm font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          {savedToast}
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-4 text-base shadow-lg shadow-emerald-600/25 transition"
      >
        {isInitialOnboarding
          ? 'Comenzar a contar calorías'
          : 'Guardar perfil y recalcular meta'}
      </button>
    </form>
  );
};
