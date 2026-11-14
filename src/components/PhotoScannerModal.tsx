import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Edit3,
  HelpCircle,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DetectedFoodItem,
  MealAnalysisResult,
  MealCategory,
  MealEntry,
} from '../types';
import { MEAL_CATEGORY_META } from '../utils/nutrition';
import {
  DEMO_MEAL_TEMPLATES,
  analyzeFoodDescription,
  analyzeFoodPhoto,
  compressImageToDataUrl,
  estimateSingleFoodItem,
  recalculateTotalsFromItems,
} from '../services/geminiService';
import { ApiKeyTutorialBox } from './ApiKeyTutorialBox';

interface PhotoScannerModalProps {
  isOpen: boolean;
  initialCategory: MealCategory;
  selectedDate: string;
  hasApiKey: boolean;
  onClose: () => void;
  onSaveMeal: (entry: MealEntry) => void;
}

type ModalStep = 'choose' | 'manual_input' | 'analyzing' | 'review';

const MANUAL_EXAMPLES: Record<MealCategory, string[]> = {
  desayuno: [
    '2 huevos revueltos con jamón, 2 tortillas de maíz y 1 taza de café con leche',
    '1 taza de avena con leche, 1 plátano y 1 cucharada de crema de cacahuate',
  ],
  comida: [
    '150g de pechuga de pollo, 1 taza de arroz, frijoles y ensalada',
    '3 tacos de carne asada con aguacate y agua fresca',
  ],
  cena: [
    '2 quesadillas con queso panela y 1 manzana',
    '1 lata de atún con aguacate y 2 rebanadas de pan tostado',
  ],
};

export const PhotoScannerModal: React.FC<PhotoScannerModalProps> = ({
  isOpen,
  initialCategory,
  selectedDate,
  hasApiKey,
  onClose,
  onSaveMeal,
}) => {
  const [category, setCategory] = useState<MealCategory>(initialCategory);
  const [step, setStep] = useState<ModalStep>('choose');
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [analysis, setAnalysis] = useState<MealAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [manualText, setManualText] = useState<string>('');
  const [analyzingLabel, setAnalyzingLabel] = useState<string>(
    'La IA está detectando tus alimentos...'
  );
  const [showDemoTutorial, setShowDemoTutorial] = useState<boolean>(false);

  // Campos para agregar un alimento extra en revisión o entrada manual
  const [newItemName, setNewItemName] = useState('');
  const [newItemPortion, setNewItemPortion] = useState('1 porción');
  const [newItemCalories, setNewItemCalories] = useState('');
  const [isEstimatingExtra, setIsEstimatingExtra] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleResetToChoose = () => {
    setStep('choose');
    setPhotoPreview(undefined);
    setAnalysis(null);
    setErrorMsg('');
    setShowAddItemForm(false);
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg('');
    setAnalyzingLabel('La IA está detectando tus alimentos...');
    setStep('analyzing');

    try {
      const compressed = await compressImageToDataUrl(file);
      setPhotoPreview(compressed.dataUrl);

      const result = await analyzeFoodPhoto({
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        category,
      });

      setAnalysis(result);
      setStep('review');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al analizar la foto.';
      setErrorMsg(message);
      setStep('choose');
    }
  };

  const handleRunDemoTemplate = async (templateId: string) => {
    const template = DEMO_MEAL_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setCategory(template.category);
    setErrorMsg('');
    setPhotoPreview(template.svgDataUrl);
    setAnalyzingLabel('La IA está detectando tus alimentos...');
    setStep('analyzing');

    try {
      const result = await analyzeFoodPhoto({
        base64: '',
        mimeType: 'image/jpeg',
        category: template.category,
        forceDemo: true,
        demoTemplateId: template.id,
      });
      setAnalysis(result);
      setStep('review');
    } catch {
      setErrorMsg('No se pudo cargar la simulación.');
      setStep('choose');
    }
  };

  const handleStartManualEntry = () => {
    setPhotoPreview(undefined);
    setErrorMsg('');
    setStep('manual_input');
  };

  const handleAnalyzeManualText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualText.trim()) {
      setErrorMsg('Escribe qué alimentos comiste para calcular sus calorías.');
      return;
    }

    setErrorMsg('');
    setPhotoPreview(undefined);
    setAnalyzingLabel('Calculando calorías y nutrientes de tu comida...');
    setStep('analyzing');

    try {
      const result = await analyzeFoodDescription({
        description: manualText,
        category,
      });
      setAnalysis(result);
      setStep('review');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo calcular la comida manual.';
      setErrorMsg(message);
      setStep('manual_input');
    }
  };

  const handleUpdateItemCalories = (index: number, nextCalories: number) => {
    if (!analysis) return;
    const safeCal = Math.max(0, Math.round(nextCalories || 0));
    const nextItems = analysis.items.map((item, idx) => {
      if (idx !== index) return item;
      const ratio = item.calories > 0 ? safeCal / item.calories : 1;
      return {
        ...item,
        calories: safeCal,
        protein: Math.round(item.protein * ratio),
        carbs: Math.round(item.carbs * ratio),
        fat: Math.round(item.fat * ratio),
      };
    });
    const totals = recalculateTotalsFromItems(nextItems);
    setAnalysis({ ...analysis, items: nextItems, ...totals });
  };

  const handleUpdateItemName = (index: number, nextName: string) => {
    if (!analysis) return;
    const nextItems = analysis.items.map((item, idx) =>
      idx === index ? { ...item, name: nextName } : item
    );
    setAnalysis({ ...analysis, items: nextItems });
  };

  const handleDeleteItem = (index: number) => {
    if (!analysis) return;
    const nextItems = analysis.items.filter((_, idx) => idx !== index);
    const totals = recalculateTotalsFromItems(nextItems);
    setAnalysis({ ...analysis, items: nextItems, ...totals });
  };

  const handleAddExtraItem = async () => {
    if (!analysis || !newItemName.trim()) return;
    const rawCal = newItemCalories.trim();
    const parsedCal = rawCal ? Math.max(0, Math.round(Number(rawCal) || 0)) : 0;

    let added: DetectedFoodItem;
    if (parsedCal > 0) {
      added = {
        name: newItemName.trim(),
        portion: newItemPortion.trim() || '1 porción',
        calories: parsedCal,
        protein: Math.round((parsedCal * 0.2) / 4),
        carbs: Math.round((parsedCal * 0.5) / 4),
        fat: Math.round((parsedCal * 0.3) / 9),
      };
    } else {
      setIsEstimatingExtra(true);
      try {
        added = await estimateSingleFoodItem(
          newItemName.trim(),
          newItemPortion.trim()
        );
      } finally {
        setIsEstimatingExtra(false);
      }
    }

    const nextItems = [...analysis.items, added];
    const totals = recalculateTotalsFromItems(nextItems);
    setAnalysis({ ...analysis, items: nextItems, ...totals });
    setNewItemName('');
    setNewItemPortion('1 porción');
    setNewItemCalories('');
    setShowAddItemForm(false);
  };

  const handleConfirmSave = () => {
    if (!analysis) return;
    const entry: MealEntry = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: selectedDate,
      timestamp: Date.now(),
      category,
      mealName:
        analysis.mealName.trim() || MEAL_CATEGORY_META[category].label,
      photoDataUrl: photoPreview,
      totalCalories: analysis.totalCalories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      items: analysis.items,
      aiTip: analysis.aiTip,
      isDemo: analysis.isDemo,
    };
    onSaveMeal(entry);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md max-h-[86dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col">
        {/* Cabecera Modal */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Escáner de Calorías IA
              </h2>
              <p className="text-[11px] text-slate-500">
                {hasApiKey
                  ? 'Visión Gemini activa'
                  : 'Modo Demo (sin API Key requerida)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Selector de Tiempo de Comida */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              ¿Qué comida vas a registrar?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['desayuno', 'comida', 'cena'] as MealCategory[]).map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={step === 'analyzing'}
                    onClick={() => setCategory(cat)}
                    className={`rounded-2xl py-2.5 text-xs font-bold border transition ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {MEAL_CATEGORY_META[cat].label}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* PASO 1: Elegir fuente de imagen */}
          {step === 'choose' && (
            <div className="space-y-4">
              {/* Inputs ocultos para cámara y galería */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelected}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white p-5 shadow-lg shadow-emerald-600/25 transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-center leading-tight">
                    Tomar Foto
                    <span className="block text-[11px] font-normal text-emerald-100 mt-0.5">
                      Usar cámara
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white p-5 shadow-lg shadow-slate-900/15 transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <ImagePlus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-center leading-tight">
                    Subir Foto
                    <span className="block text-[11px] font-normal text-slate-300 mt-0.5">
                      Desde galería
                    </span>
                  </span>
                </button>
              </div>

              {!hasApiKey && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900 space-y-2">
                  <div>
                    <strong>Modo Demo activo:</strong> si tomas o subes una
                    foto sin API Key de Gemini, se mostrará un análisis de
                    ejemplo editable. Puedes conectar tu clave real en{' '}
                    <strong>Mi Perfil</strong>.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDemoTutorial((v) => !v)}
                    className="inline-flex items-center gap-1 font-bold text-emerald-800 underline hover:text-emerald-900"
                  >
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    {showDemoTutorial
                      ? 'Ocultar guía de API Key'
                      : 'Ver cómo obtener mi API Key gratis'}
                  </button>
                  {showDemoTutorial && <ApiKeyTutorialBox />}
                </div>
              )}

              {/* Fotos Demo de Prueba Rápida */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Probar Foto Demo IA al instante
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_MEAL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleRunDemoTemplate(tpl.id)}
                      className="text-left rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 p-2.5 transition"
                    >
                      <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100 mb-1">
                        {MEAL_CATEGORY_META[tpl.category].label}
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {tpl.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {tpl.subtitle}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartManualEntry}
                className="w-full rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                Escribir comida manualmente (cálculo automático)
              </button>
            </div>
          )}

          {/* PASO 1B: Entrada Manual Inteligente */}
          {step === 'manual_input' && (
            <form onSubmit={handleAnalyzeManualText} className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setStep('choose');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver a cámara
                </button>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                  Detección automática
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Describe lo que comiste en{' '}
                  {MEAL_CATEGORY_META[category].label.toLowerCase()}
                </label>
                <textarea
                  rows={3}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Ej. 2 huevos revueltos con jamón, 2 tortillas de maíz y 1 taza de café con leche"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {hasApiKey
                    ? 'Gemini IA desglosará cada alimento y calculará sus calorías y macros automáticamente.'
                    : 'Calcularemos automáticamente calorías y macros según cantidades y porciones (o conecta tu API Key para análisis IA completo).'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Ejemplos rápidos (toca para llenar)
                </p>
                <div className="space-y-1.5">
                  {MANUAL_EXAMPLES[category].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setManualText(example)}
                      className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 px-3 py-2 text-xs text-slate-700 transition"
                    >
                      “{example}”
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3.5 text-sm font-extrabold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
              >
                <Sparkles className="w-4 h-4" />
                Calcular calorías automáticamente
              </button>
            </form>
          )}

          {/* PASO 2: Analizando foto o texto con animación */}
          {step === 'analyzing' && (
            <div className="py-4 space-y-4 text-center">
              {photoPreview ? (
                <div className="relative mx-auto w-full h-56 rounded-3xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={photoPreview}
                    alt="Analizando comida"
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_18px_4px_rgba(16,185,129,0.9)] animate-scan-beam" />
                </div>
              ) : (
                <div className="mx-auto w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Sparkles className="w-9 h-9 animate-pulse" />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                <p className="text-sm font-extrabold text-slate-900">
                  {analyzingLabel}
                </p>
                <p className="text-xs text-slate-500">
                  Calculando porciones, calorías y macronutrientes
                </p>
              </div>
            </div>
          )}

          {/* PASO 3: Resultados editables */}
          {step === 'review' && analysis && (
            <div className="space-y-4">
              {photoPreview && (
                <div className="relative h-40 w-full rounded-2xl overflow-hidden border border-slate-200">
                  <img
                    src={photoPreview}
                    alt={analysis.mealName}
                    className="w-full h-full object-cover"
                  />
                  {analysis.isDemo && (
                    <span className="absolute top-2.5 left-2.5 rounded-full bg-slate-900/80 text-white px-2.5 py-0.5 text-[10px] font-bold">
                      Análisis Demo Editable
                    </span>
                  )}
                </div>
              )}

              {/* Nombre del platillo + resumen */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-2">
                <label className="block text-[11px] font-bold text-emerald-800 uppercase">
                  Nombre del platillo
                </label>
                <input
                  type="text"
                  value={analysis.mealName}
                  onChange={(e) =>
                    setAnalysis({ ...analysis, mealName: e.target.value })
                  }
                  className="w-full rounded-xl bg-white border border-emerald-200 px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-emerald-800 font-semibold">
                      Total detectado
                    </span>
                    <p className="text-2xl font-black text-emerald-950">
                      {analysis.totalCalories} kcal
                    </p>
                  </div>
                  <div className="text-right text-xs font-semibold text-emerald-900 space-y-0.5">
                    <p>Proteína: {analysis.protein} g</p>
                    <p>Carbos: {analysis.carbs} g</p>
                    <p>Grasas: {analysis.fat} g</p>
                  </div>
                </div>
              </div>

              {analysis.aiTip && (
                <p className="rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 leading-relaxed">
                  <strong>Consejo IA:</strong> {analysis.aiTip}
                </p>
              )}

              {/* Lista de ingredientes editables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Alimentos detectados ({analysis.items.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddItemForm((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir ingrediente
                  </button>
                </div>

                {showAddItemForm && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Alimento (ej. Manzana)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold"
                      />
                      <input
                        type="number"
                        placeholder="Kcal (opcional: auto)"
                        value={newItemCalories}
                        onChange={(e) => setNewItemCalories(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Porción (ej. 1 pieza o 150g)"
                        value={newItemPortion}
                        onChange={(e) => setNewItemPortion(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={isEstimatingExtra || !newItemName.trim()}
                        onClick={handleAddExtraItem}
                        className="rounded-xl bg-emerald-600 disabled:opacity-50 text-white px-3 py-2 text-xs font-bold inline-flex items-center gap-1"
                      >
                        {isEstimatingExtra ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {newItemCalories.trim() ? 'Añadir' : 'Auto kcal'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Si dejas calorías vacío, las calculamos automáticamente según el alimento y porción.
                    </p>
                  </div>
                )}

                {analysis.items.map((item, idx) => (
                  <div
                    key={`${item.name}_${idx}`}
                    className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleUpdateItemName(idx, e.target.value)
                        }
                        className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none focus:underline"
                      />
                      <p className="text-[11px] text-slate-400">
                        {item.portion} • P:{item.protein}g C:{item.carbs}g G:
                        {item.fat}g
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        value={item.calories}
                        onChange={(e) =>
                          handleUpdateItemCalories(idx, Number(e.target.value))
                        }
                        className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-extrabold text-right text-slate-900"
                      />
                      <span className="text-[11px] font-semibold text-slate-500">
                        kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        aria-label="Quitar alimento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones finales */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleResetToChoose}
                  className="rounded-2xl border border-slate-200 px-4 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  {photoPreview ? 'Cambiar foto' : 'Volver'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3.5 text-sm font-extrabold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
                >
                  <Check className="w-4 h-4" />
                  Guardar en {MEAL_CATEGORY_META[category].label}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
