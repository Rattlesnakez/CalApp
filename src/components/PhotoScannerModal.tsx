import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  HelpCircle,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Scale,
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
import {
  type ItemPortionBase,
  MEAL_CATEGORY_META,
  extractItemPortionBase,
  formatQuantityNumber,
  parsePortionText,
  scaleAnalysisByMultiplier,
  scaleFoodItemByQuantity,
} from '../utils/nutrition';
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
  editingEntry?: MealEntry | null;
  onUpdateMeal?: (entry: MealEntry) => void;
}

type ModalStep = 'choose' | 'camera' | 'manual_input' | 'analyzing' | 'review';

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

const MEAL_MULTIPLIER_CHIPS: Array<{ value: number; label: string }> = [
  { value: 0.5, label: '0.5x Media' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x Normal' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x Doble' },
];

const ITEM_QUICK_QUANTITIES: Array<{ value: number; label: string }> = [
  { value: 0.5, label: '½' },
  { value: 1, label: '1' },
  { value: 1.5, label: '1.5' },
  { value: 2, label: '2' },
];

export const PhotoScannerModal: React.FC<PhotoScannerModalProps> = ({
  isOpen,
  initialCategory,
  selectedDate,
  hasApiKey,
  onClose,
  onSaveMeal,
  editingEntry = null,
  onUpdateMeal,
}) => {
  const [category, setCategory] = useState<MealCategory>(initialCategory);
  const [step, setStep] = useState<ModalStep>('choose');
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [baseAnalysis, setBaseAnalysis] = useState<MealAnalysisResult | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysisResult | null>(null);
  const [mealMultiplier, setMealMultiplier] = useState<number>(1);
  const [itemBases, setItemBases] = useState<ItemPortionBase[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [manualText, setManualText] = useState<string>('');
  const [analyzingLabel, setAnalyzingLabel] = useState<string>(
    'La IA está detectando tus alimentos...'
  );
  const [showDemoTutorial, setShowDemoTutorial] = useState<boolean>(false);
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [expandedMacros, setExpandedMacros] = useState<Record<number, boolean>>({});
  const [editingPortionTextIdx, setEditingPortionTextIdx] = useState<number | null>(null);
  const [portionTextDraft, setPortionTextDraft] = useState<string>('');
  const [reestimatingIdx, setReestimatingIdx] = useState<number | null>(null);

  // Campos para agregar un alimento extra en revisión o entrada manual
  const [newItemName, setNewItemName] = useState('');
  const [newItemPortion, setNewItemPortion] = useState('1 porción');
  const [newItemCalories, setNewItemCalories] = useState('');
  const [isEstimatingExtra, setIsEstimatingExtra] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);

  // Estado y referencias para cámara integrada (WebRTC)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [showNativeFallback, setShowNativeFallback] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestIdRef = useRef<number>(0);

  const stopCameraStream = useCallback(() => {
    cameraRequestIdRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const initializeReviewState = useCallback((result: MealAnalysisResult) => {
    const clonedBase: MealAnalysisResult = {
      ...result,
      items: result.items.map((it) => ({ ...it })),
    };
    setBaseAnalysis(clonedBase);
    setAnalysis({
      ...clonedBase,
      items: clonedBase.items.map((it) => ({ ...it })),
    });
    setMealMultiplier(1);
    setItemBases(clonedBase.items.map(extractItemPortionBase));
    setItemDrafts({});
    setExpandedMacros({});
    setEditingPortionTextIdx(null);
    setPortionTextDraft('');
    setReestimatingIdx(null);
    setStep('review');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }
    setErrorMsg('');
    setShowAddItemForm(false);
    setItemDrafts({});
    if (editingEntry) {
      stopCameraStream();
      setCategory(editingEntry.category);
      setPhotoPreview(editingEntry.photoDataUrl);
      initializeReviewState({
        mealName: editingEntry.mealName,
        totalCalories: editingEntry.totalCalories,
        protein: editingEntry.protein,
        carbs: editingEntry.carbs,
        fat: editingEntry.fat,
        items: editingEntry.items.map((it) => ({ ...it })),
        aiTip: editingEntry.aiTip,
        isDemo: editingEntry.isDemo,
      });
    } else {
      setCategory(initialCategory);
      setPhotoPreview(undefined);
      setBaseAnalysis(null);
      setAnalysis(null);
      setMealMultiplier(1);
      setItemBases([]);
      setExpandedMacros({});
      setEditingPortionTextIdx(null);
      setPortionTextDraft('');
      setManualText('');
      setStep('choose');
    }
  }, [isOpen, editingEntry, initialCategory, stopCameraStream, initializeReviewState]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    if (step === 'camera' && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.play().catch(() => {});
    }
  }, [step, facingMode]);

  if (!isOpen) return null;

  const isEditing = Boolean(editingEntry && onUpdateMeal);

  const handleCloseModal = () => {
    stopCameraStream();
    onClose();
  };

  const handleResetToChoose = () => {
    stopCameraStream();
    setStep('choose');
    setPhotoPreview(undefined);
    setBaseAnalysis(null);
    setAnalysis(null);
    setMealMultiplier(1);
    setItemBases([]);
    setExpandedMacros({});
    setEditingPortionTextIdx(null);
    setPortionTextDraft('');
    setReestimatingIdx(null);
    setErrorMsg('');
    setShowAddItemForm(false);
    setShowNativeFallback(false);
    setItemDrafts({});
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    const requestId = ++cameraRequestIdRef.current;
    setErrorMsg('');
    setShowNativeFallback(false);
    setFacingMode(mode);
    setStep('camera');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStep('choose');
      setShowNativeFallback(true);
      setErrorMsg(
        'Tu navegador no permite abrir la cámara integrada aquí. Usa "Subir Foto" o la cámara del teléfono como respaldo.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      if (requestId !== cameraRequestIdRef.current) return;
      stopCameraStream();
      setStep('choose');
      setShowNativeFallback(true);
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      const isNotFound =
        err instanceof DOMException && err.name === 'NotFoundError';
      setErrorMsg(
        isDenied
          ? 'Permiso de cámara denegado. Actívalo en tu navegador o usa la cámara del teléfono como respaldo.'
          : isNotFound
            ? 'No se detectó cámara disponible en el dispositivo.'
            : 'No se pudo abrir la cámara integrada. Puedes usar la cámara del teléfono como respaldo.'
      );
    }
  };

  const handleToggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    void startCamera(nextMode);
  };

  const handleCaptureFromVideo = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const maxDim = 1024;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    const base64 = dataUrl.split(',')[1] ?? '';

    stopCameraStream();
    setErrorMsg('');
    setPhotoPreview(dataUrl);
    setAnalyzingLabel('La IA está detectando tus alimentos...');
    setStep('analyzing');

    try {
      const result = await analyzeFoodPhoto({
        base64,
        mimeType: 'image/jpeg',
        category,
      });

      initializeReviewState(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al analizar la foto.';
      setErrorMsg(message);
      setStep('choose');
    }
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

      initializeReviewState(result);
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
      initializeReviewState(result);
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
      initializeReviewState(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo calcular la comida manual.';
      setErrorMsg(message);
      setStep('manual_input');
    }
  };

  const getDraftValue = (key: string, numericValue: number): string =>
    key in itemDrafts ? itemDrafts[key] : String(numericValue);

  const parseNumericInput = (raw: string): number =>
    raw.trim() === ''
      ? 0
      : Math.max(0, Math.round(Number(raw.replace(',', '.')) || 0));

  const parseDecimalInput = (raw: string): number => {
    if (raw.trim() === '') return 0;
    const parsed = Number(raw.replace(',', '.'));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const syncCustomBase = (nextAnalysis: MealAnalysisResult) => {
    setBaseAnalysis({
      ...nextAnalysis,
      items: nextAnalysis.items.map((it) => ({ ...it })),
    });
    if (mealMultiplier !== 1) {
      setMealMultiplier(1);
    }
  };

  const handleApplyMealMultiplier = (rawMultiplier: number) => {
    if (!baseAnalysis) return;
    const clamped = Math.min(5, Math.max(0.25, Number(rawMultiplier.toFixed(2))));
    const scaled = scaleAnalysisByMultiplier(baseAnalysis, clamped);
    setMealMultiplier(clamped);
    setAnalysis(scaled);
    setItemDrafts({});
    setEditingPortionTextIdx(null);
  };

  const applyItemQuantityChange = (
    index: number,
    newQty: number,
    draftQtyOverride?: string
  ) => {
    if (!analysis) return;
    const targetItem = analysis.items[index];
    if (!targetItem) return;

    const base = itemBases[index] ?? extractItemPortionBase(targetItem);
    const updatedItem = scaleFoodItemByQuantity(base, targetItem, newQty);
    const nextItems = analysis.items.map((item, idx) =>
      idx === index ? updatedItem : item
    );
    const totals = recalculateTotalsFromItems(nextItems);
    const nextAnalysis: MealAnalysisResult = {
      ...analysis,
      items: nextItems,
      ...totals,
    };

    setAnalysis(nextAnalysis);
    setItemDrafts((prev) => {
      const next = { ...prev };
      delete next[`${index}_calories`];
      delete next[`${index}_protein`];
      delete next[`${index}_carbs`];
      delete next[`${index}_fat`];
      if (draftQtyOverride !== undefined) {
        next[`${index}_qty`] = draftQtyOverride;
      } else {
        delete next[`${index}_qty`];
      }
      return next;
    });
    syncCustomBase(nextAnalysis);
  };

  const handleStepItemQuantity = (index: number, delta: number) => {
    if (!analysis) return;
    const item = analysis.items[index];
    if (!item) return;

    const base = itemBases[index] ?? extractItemPortionBase(item);
    const currentQty = parsePortionText(item.portion).quantity;
    const nextQty = Math.max(
      base.parsedPortion.minQuantity,
      Number((currentQty + delta).toFixed(2))
    );

    applyItemQuantityChange(index, nextQty);
  };

  const handleSetItemQuantity = (index: number, nextQty: number) => {
    applyItemQuantityChange(index, nextQty);
  };

  const handleUpdateItemQuantityInput = (index: number, rawValue: string) => {
    const parsedQty = parseDecimalInput(rawValue);
    applyItemQuantityChange(index, parsedQty, rawValue);
  };

  const handleStartEditPortionText = (index: number) => {
    if (!analysis || !analysis.items[index]) return;
    setEditingPortionTextIdx(index);
    setPortionTextDraft(analysis.items[index].portion);
  };

  const handleCancelPortionTextEdit = () => {
    setEditingPortionTextIdx(null);
    setPortionTextDraft('');
  };

  const handleCommitPortionTextEdit = async (index: number) => {
    if (!analysis || editingPortionTextIdx !== index) return;
    const targetItem = analysis.items[index];
    if (!targetItem) {
      handleCancelPortionTextEdit();
      return;
    }

    const nextPortionText = portionTextDraft.trim();
    if (!nextPortionText || nextPortionText === targetItem.portion) {
      handleCancelPortionTextEdit();
      return;
    }

    const oldParsed = parsePortionText(targetItem.portion);
    const newParsed = parsePortionText(nextPortionText);

    // Si mantiene la misma unidad, escala proporcionalmente al instante
    if (
      oldParsed.unit.toLowerCase() === newParsed.unit.toLowerCase() &&
      oldParsed.unitKind === newParsed.unitKind
    ) {
      handleCancelPortionTextEdit();
      applyItemQuantityChange(index, newParsed.quantity);
      return;
    }

    // Si cambió la unidad completa (ej. "1 pieza" -> "120 g"), recalcular con estimateSingleFoodItem
    setReestimatingIdx(index);
    try {
      const estimated = await estimateSingleFoodItem(
        targetItem.name,
        nextPortionText
      );
      const updatedItem: DetectedFoodItem = {
        ...estimated,
        name: targetItem.name || estimated.name,
        portion: nextPortionText,
      };
      const nextItems = analysis.items.map((it, idx) =>
        idx === index ? updatedItem : it
      );
      const totals = recalculateTotalsFromItems(nextItems);
      const nextAnalysis: MealAnalysisResult = {
        ...analysis,
        items: nextItems,
        ...totals,
      };
      const nextBases = nextItems.map((it, idx) =>
        idx === index
          ? extractItemPortionBase(updatedItem)
          : itemBases[idx] ?? extractItemPortionBase(it)
      );

      setItemBases(nextBases);
      setAnalysis(nextAnalysis);
      setItemDrafts((prev) => {
        const next = { ...prev };
        delete next[`${index}_qty`];
        delete next[`${index}_calories`];
        delete next[`${index}_protein`];
        delete next[`${index}_carbs`];
        delete next[`${index}_fat`];
        return next;
      });
      syncCustomBase(nextAnalysis);
    } finally {
      setReestimatingIdx(null);
      setEditingPortionTextIdx(null);
      setPortionTextDraft('');
    }
  };

  const handleUpdateItemCalories = (index: number, rawValue: string) => {
    if (!analysis) return;
    setItemDrafts((prev) => ({ ...prev, [`${index}_calories`]: rawValue }));
    const safeCal = parseNumericInput(rawValue);
    const nextItems = analysis.items.map((item, idx) =>
      idx === index ? { ...item, calories: safeCal } : item
    );
    const totals = recalculateTotalsFromItems(nextItems);
    const nextAnalysis: MealAnalysisResult = {
      ...analysis,
      items: nextItems,
      ...totals,
    };

    setAnalysis(nextAnalysis);
    setItemBases((prev) =>
      nextItems.map((it, idx) =>
        idx === index
          ? extractItemPortionBase(it)
          : prev[idx] ?? extractItemPortionBase(it)
      )
    );
    syncCustomBase(nextAnalysis);
  };

  const handleUpdateItemMacro = (
    index: number,
    field: 'protein' | 'carbs' | 'fat',
    rawValue: string
  ) => {
    if (!analysis) return;
    setItemDrafts((prev) => ({ ...prev, [`${index}_${field}`]: rawValue }));
    const safeVal = parseNumericInput(rawValue);
    const nextItems = analysis.items.map((item, idx) =>
      idx === index ? { ...item, [field]: safeVal } : item
    );
    const totals = recalculateTotalsFromItems(nextItems);
    const nextAnalysis: MealAnalysisResult = {
      ...analysis,
      items: nextItems,
      ...totals,
    };

    setAnalysis(nextAnalysis);
    setItemBases((prev) =>
      nextItems.map((it, idx) =>
        idx === index
          ? extractItemPortionBase(it)
          : prev[idx] ?? extractItemPortionBase(it)
      )
    );
    syncCustomBase(nextAnalysis);
  };

  const handleUpdateItemName = (index: number, value: string) => {
    if (!analysis) return;
    const nextItems = analysis.items.map((item, idx) =>
      idx === index ? { ...item, name: value } : item
    );
    setAnalysis({ ...analysis, items: nextItems });
    if (baseAnalysis) {
      setBaseAnalysis({
        ...baseAnalysis,
        items: baseAnalysis.items.map((item, idx) =>
          idx === index ? { ...item, name: value } : item
        ),
      });
    }
  };

  const handleUpdateMealName = (value: string) => {
    if (!analysis) return;
    setAnalysis({ ...analysis, mealName: value });
    if (baseAnalysis) {
      setBaseAnalysis({ ...baseAnalysis, mealName: value });
    }
  };

  const handleUpdateDirectTotal = (
    field: 'totalCalories' | 'protein' | 'carbs' | 'fat',
    rawValue: string
  ) => {
    if (!analysis) return;
    setItemDrafts((prev) => ({ ...prev, [`total_${field}`]: rawValue }));
    const nextAnalysis: MealAnalysisResult = {
      ...analysis,
      [field]: parseNumericInput(rawValue),
    };
    setAnalysis(nextAnalysis);
    syncCustomBase(nextAnalysis);
  };

  const handleDeleteItem = (index: number) => {
    if (!analysis) return;
    const nextItems = analysis.items.filter((_, idx) => idx !== index);
    const totals = recalculateTotalsFromItems(nextItems);
    const nextAnalysis: MealAnalysisResult = {
      ...analysis,
      items: nextItems,
      ...totals,
    };
    setItemDrafts({});
    setExpandedMacros({});
    setEditingPortionTextIdx(null);
    setItemBases(nextItems.map(extractItemPortionBase));
    setAnalysis(nextAnalysis);
    syncCustomBase(nextAnalysis);
  };

  const handleAddExtraItem = async () => {
    if (!analysis || !newItemName.trim()) return;
    const rawCal = newItemCalories.trim();
    const parsedCal = rawCal
      ? Math.max(0, Math.round(Number(rawCal.replace(',', '.')) || 0))
      : 0;

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
    const nextAnalysis: MealAnalysisResult = {
      ...analysis,
      items: nextItems,
      ...totals,
    };
    setItemDrafts({});
    setItemBases((prev) => [...prev, extractItemPortionBase(added)]);
    setAnalysis(nextAnalysis);
    syncCustomBase(nextAnalysis);
    setNewItemName('');
    setNewItemPortion('1 porción');
    setNewItemCalories('');
    setShowAddItemForm(false);
  };

  const handleConfirmSave = () => {
    if (!analysis) return;
    const entry: MealEntry = {
      id:
        editingEntry?.id ??
        `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: editingEntry?.date ?? selectedDate,
      timestamp: editingEntry?.timestamp ?? Date.now(),
      category,
      mealName:
        analysis.mealName.trim() || MEAL_CATEGORY_META[category].label,
      photoDataUrl: photoPreview ?? editingEntry?.photoDataUrl,
      totalCalories: analysis.totalCalories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      items: analysis.items,
      aiTip: analysis.aiTip,
      isDemo: analysis.isDemo,
    };
    if (isEditing && onUpdateMeal) {
      onUpdateMeal(entry);
    } else {
      onSaveMeal(entry);
    }
    handleCloseModal();
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
                {isEditing
                  ? 'Editar Comida Registrada'
                  : 'Escáner de Calorías IA'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEditing
                  ? 'Modifica platillo, comida, porciones o macros'
                  : hasApiKey
                    ? 'Visión Gemini activa'
                    : 'Modo Demo (sin API Key requerida)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 pb-safe space-y-4">
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
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 space-y-2">
              <p>{errorMsg}</p>
              {showNativeFallback && (
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100/60"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Abrir cámara del teléfono (respaldo)
                </button>
              )}
            </div>
          )}

          {/* Input oculto de respaldo para cámara nativa */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />

          {/* PASO 1: Elegir fuente de imagen */}
          {step === 'choose' && (
            <div className="space-y-4">
              {/* Input oculto para galería */}
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
                  onClick={() => void startCamera('environment')}
                  className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white p-5 shadow-lg shadow-emerald-600/25 transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-center leading-tight">
                    Tomar Foto
                    <span className="block text-[11px] font-normal text-emerald-100 mt-0.5">
                      Cámara integrada
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
                <div className="rounded-2xl bg-amber-50/90 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900 space-y-2">
                  <p>
                    <strong>Modo Demo activo:</strong> conecta tu API Key en{' '}
                    <strong>Mi Perfil</strong> para análisis real con Gemini.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDemoTutorial((v) => !v)}
                      className="inline-flex items-center gap-1 font-bold text-emerald-800 underline hover:text-emerald-900"
                    >
                      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                      {showDemoTutorial
                        ? 'Ocultar guía de API Key'
                        : 'Ver cómo obtener API Key'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleRunDemoTemplate(DEMO_MEAL_TEMPLATES[0].id)
                      }
                      className="inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-amber-950"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      Probar 1 ejemplo rápido
                    </button>
                  </div>
                  {showDemoTutorial && <ApiKeyTutorialBox />}
                </div>
              )}

              <button
                type="button"
                onClick={handleStartManualEntry}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-3.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                Escribir comida manualmente (cálculo automático)
              </button>
            </div>
          )}

          {/* PASO 1A: Cámara Integrada en Vivo */}
          {step === 'camera' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setErrorMsg('');
                    setStep('choose');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleToggleCameraFacing}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Cambiar cámara
                </button>
              </div>

              <div className="relative w-full aspect-square max-h-[45dvh] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => setIsCameraReady(true)}
                  onCanPlay={() => setIsCameraReady(true)}
                  className="w-full h-full object-cover"
                />

                {/* Guías visuales para encuadrar el plato */}
                <div className="pointer-events-none absolute inset-4">
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-xl" />
                </div>

                {!isCameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-white">
                    <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                    <span className="text-xs font-semibold text-slate-200">
                      Iniciando cámara...
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!isCameraReady}
                onClick={() => void handleCaptureFromVideo()}
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.99] text-white py-3.5 text-sm font-extrabold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
              >
                <Camera className="w-5 h-5" />
                Capturar platillo
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

              {/* Nombre del platillo + multiplicador de porción + resumen */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                    Nombre del platillo
                  </label>
                  <input
                    type="text"
                    value={analysis.mealName}
                    onChange={(e) => handleUpdateMealName(e.target.value)}
                    placeholder="Ej. Chilaquiles verdes con pollo"
                    className="w-full rounded-xl bg-white border border-emerald-200 px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Selector táctil de Tamaño de porción del platillo */}
                <div className="rounded-xl bg-white/85 border border-emerald-200/80 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                      <Scale className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Tamaño de porción del platillo
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApplyMealMultiplier(mealMultiplier - 0.25)}
                        disabled={mealMultiplier <= 0.25}
                        aria-label="Reducir porción del platillo"
                        className="w-6 h-6 rounded-lg border border-emerald-200 bg-white text-emerald-800 disabled:opacity-40 flex items-center justify-center hover:bg-emerald-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="min-w-[2.75rem] text-center text-xs font-black text-emerald-900">
                        {formatQuantityNumber(mealMultiplier)}x
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyMealMultiplier(mealMultiplier + 0.25)}
                        disabled={mealMultiplier >= 5}
                        aria-label="Aumentar porción del platillo"
                        className="w-6 h-6 rounded-lg border border-emerald-200 bg-white text-emerald-800 disabled:opacity-40 flex items-center justify-center hover:bg-emerald-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MEAL_MULTIPLIER_CHIPS.map((chip) => {
                      const active = Math.abs(mealMultiplier - chip.value) < 0.01;
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => handleApplyMealMultiplier(chip.value)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {analysis.items.length === 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-emerald-800 font-semibold">
                        Totales del platillo (sin desglose)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min={0}
                          value={getDraftValue('total_totalCalories', analysis.totalCalories)}
                          onChange={(e) =>
                            handleUpdateDirectTotal('totalCalories', e.target.value)
                          }
                          placeholder="0"
                          aria-label="Calorías totales"
                          className="w-24 rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-base font-black text-right text-emerald-950 focus:border-emerald-600 focus:outline-none"
                        />
                        <span className="text-xs font-bold text-emerald-900">kcal</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="rounded-xl bg-white border border-emerald-200 px-2.5 py-1.5 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Proteína (g)
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min={0}
                          value={getDraftValue('total_protein', analysis.protein)}
                          onChange={(e) =>
                            handleUpdateDirectTotal('protein', e.target.value)
                          }
                          placeholder="0"
                          className="w-full text-xs font-extrabold text-slate-900 bg-transparent focus:outline-none"
                        />
                      </label>
                      <label className="rounded-xl bg-white border border-emerald-200 px-2.5 py-1.5 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Carbos (g)
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min={0}
                          value={getDraftValue('total_carbs', analysis.carbs)}
                          onChange={(e) =>
                            handleUpdateDirectTotal('carbs', e.target.value)
                          }
                          placeholder="0"
                          className="w-full text-xs font-extrabold text-slate-900 bg-transparent focus:outline-none"
                        />
                      </label>
                      <label className="rounded-xl bg-white border border-emerald-200 px-2.5 py-1.5 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Grasas (g)
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min={0}
                          value={getDraftValue('total_fat', analysis.fat)}
                          onChange={(e) =>
                            handleUpdateDirectTotal('fat', e.target.value)
                          }
                          placeholder="0"
                          className="w-full text-xs font-extrabold text-slate-900 bg-transparent focus:outline-none"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-0.5">
                    <div>
                      <span className="text-xs text-emerald-800 font-semibold">
                        {isEditing ? 'Total del platillo' : 'Total detectado'}
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
                )}
              </div>

              {analysis.aiTip && (
                <p className="rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 leading-relaxed">
                  <strong>Consejo IA:</strong> {analysis.aiTip}
                </p>
              )}

              {/* Lista de ingredientes editables */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isEditing ? 'Ingredientes / alimentos' : 'Alimentos detectados'} ({analysis.items.length})
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
                        inputMode="decimal"
                        step="any"
                        min={0}
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

                {analysis.items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 px-3.5 py-3 text-xs text-slate-500 text-center">
                    No hay ingredientes individuales. Puedes editar los totales arriba o añadir un ingrediente.
                  </p>
                ) : (
                  analysis.items.map((item, idx) => {
                    const base = itemBases[idx] ?? extractItemPortionBase(item);
                    const currentParsed = parsePortionText(item.portion);
                    const isMacrosOpen = Boolean(expandedMacros[idx]);
                    const isEditingUnit = editingPortionTextIdx === idx;
                    const isReestimating = reestimatingIdx === idx;

                    return (
                      <div
                        key={`item_${idx}`}
                        className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5"
                      >
                        {/* Fila 1: Nombre del alimento + calorías resultantes + eliminar */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateItemName(idx, e.target.value)
                            }
                            placeholder="Nombre del alimento"
                            className="flex-1 min-w-0 text-xs font-extrabold text-slate-900 bg-transparent border-b border-transparent focus:border-emerald-400 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              min={0}
                              value={getDraftValue(`${idx}_calories`, item.calories)}
                              placeholder="0"
                              onChange={(e) =>
                                handleUpdateItemCalories(idx, e.target.value)
                              }
                              aria-label={`Calorías de ${item.name || 'ingrediente'}`}
                              className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-extrabold text-right text-slate-900 focus:border-emerald-500 focus:outline-none"
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

                        {/* Fila 2: Control táctil de porción (- [cantidad unidad] +) */}
                        {isEditingUnit ? (
                          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={portionTextDraft}
                                onChange={(e) => setPortionTextDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleCommitPortionTextEdit(idx);
                                  } else if (e.key === 'Escape') {
                                    handleCancelPortionTextEdit();
                                  }
                                }}
                                placeholder="Ej. 120 g, 1.5 tazas, 2 piezas"
                                autoFocus
                                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={isReestimating}
                                onClick={() => void handleCommitPortionTextEdit(idx)}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 shrink-0"
                              >
                                {isReestimating ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Recalcular
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelPortionTextEdit}
                                aria-label="Cancelar cambio de porción"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Cambia la unidad (ej. &quot;1 pieza&quot; a &quot;120 g&quot;) para recalcular calorías automáticamente.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="inline-flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200 p-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStepItemQuantity(idx, -base.parsedPortion.step)
                                  }
                                  aria-label={`Disminuir cantidad de ${item.name || 'ingrediente'}`}
                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center transition"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  min={0}
                                  value={getDraftValue(`${idx}_qty`, currentParsed.quantity)}
                                  onChange={(e) =>
                                    handleUpdateItemQuantityInput(idx, e.target.value)
                                  }
                                  aria-label={`Cantidad de ${item.name || 'ingrediente'}`}
                                  className="w-12 rounded-lg bg-white border border-slate-200 px-1 py-1 text-xs font-extrabold text-center text-slate-900 focus:border-emerald-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPortionText(idx)}
                                  title="Toca para cambiar unidad o texto de porción"
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-white hover:text-emerald-700 transition max-w-[8.5rem] truncate"
                                >
                                  <span className="truncate">{currentParsed.unit}</span>
                                  <Edit3 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStepItemQuantity(idx, base.parsedPortion.step)
                                  }
                                  aria-label={`Aumentar cantidad de ${item.name || 'ingrediente'}`}
                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center transition"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {currentParsed.gramsInParens && (
                                <span className="text-[11px] font-medium text-slate-400">
                                  ~{Math.round(currentParsed.gramsInParens)}{' '}
                                  {currentParsed.gramsInParensUnit || 'g'}
                                </span>
                              )}
                            </div>

                            {/* Chips rápidos cuando la unidad es contable */}
                            {base.parsedPortion.unitKind === 'countable' && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {ITEM_QUICK_QUANTITIES.map((q) => {
                                  const active =
                                    Math.abs(currentParsed.quantity - q.value) < 0.01;
                                  return (
                                    <button
                                      key={q.label}
                                      type="button"
                                      onClick={() => handleSetItemQuantity(idx, q.value)}
                                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition ${
                                        active
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                      }`}
                                    >
                                      {q.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Fila 3: Resumen limpio + desplegable de macros manuales */}
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                          <span className="text-[11px] font-medium text-slate-500">
                            P: {item.protein}g • C: {item.carbs}g • G: {item.fat}g
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMacros((prev) => ({
                                ...prev,
                                [idx]: !prev[idx],
                              }))
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 shrink-0"
                          >
                            <span>
                              {isMacrosOpen
                                ? 'Ocultar macros'
                                : 'Ajustar macros manualmente'}
                            </span>
                            {isMacrosOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {isMacrosOpen && (
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <label className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-[11px]">
                              <span className="font-bold text-slate-500">P</span>
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  min={0}
                                  value={getDraftValue(`${idx}_protein`, item.protein)}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleUpdateItemMacro(idx, 'protein', e.target.value)
                                  }
                                  aria-label={`Proteína de ${item.name || 'ingrediente'}`}
                                  className="w-10 text-right font-bold text-slate-800 bg-transparent focus:outline-none"
                                />
                                <span className="text-slate-400">g</span>
                              </div>
                            </label>
                            <label className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-[11px]">
                              <span className="font-bold text-slate-500">C</span>
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  min={0}
                                  value={getDraftValue(`${idx}_carbs`, item.carbs)}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleUpdateItemMacro(idx, 'carbs', e.target.value)
                                  }
                                  aria-label={`Carbohidratos de ${item.name || 'ingrediente'}`}
                                  className="w-10 text-right font-bold text-slate-800 bg-transparent focus:outline-none"
                                />
                                <span className="text-slate-400">g</span>
                              </div>
                            </label>
                            <label className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-[11px]">
                              <span className="font-bold text-slate-500">G</span>
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  min={0}
                                  value={getDraftValue(`${idx}_fat`, item.fat)}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleUpdateItemMacro(idx, 'fat', e.target.value)
                                  }
                                  aria-label={`Grasas de ${item.name || 'ingrediente'}`}
                                  className="w-10 text-right font-bold text-slate-800 bg-transparent focus:outline-none"
                                />
                                <span className="text-slate-400">g</span>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Botones finales */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={isEditing ? handleCloseModal : handleResetToChoose}
                  className="rounded-2xl border border-slate-200 px-4 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  {isEditing ? 'Cancelar' : photoPreview ? 'Cambiar foto' : 'Volver'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3.5 text-sm font-extrabold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
                >
                  <Check className="w-4 h-4" />
                  {isEditing
                    ? `Guardar cambios en ${MEAL_CATEGORY_META[category].label}`
                    : `Guardar en ${MEAL_CATEGORY_META[category].label}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
