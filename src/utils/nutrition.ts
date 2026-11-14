import type {
  ActivityLevel,
  DailyEvaluation,
  GoalType,
  MealCategory,
  UserProfile,
} from '../types';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<
  ActivityLevel,
  { label: string; description: string }
> = {
  sedentary: {
    label: 'Sedentario',
    description: 'Poco o nada de ejercicio, trabajo de oficina',
  },
  light: {
    label: 'Ligero',
    description: 'Ejercicio ligero o caminatas 1-3 días/semana',
  },
  moderate: {
    label: 'Moderado',
    description: 'Ejercicio moderado o deporte 3-5 días/semana',
  },
  active: {
    label: 'Activo',
    description: 'Entrenamiento intenso 6-7 días/semana',
  },
  very_active: {
    label: 'Muy activo',
    description: 'Doble entrenamiento o trabajo físico diario',
  },
};

export const GOAL_LABELS: Record<
  GoalType,
  { label: string; badge: string; deltaText: string }
> = {
  lose: {
    label: 'Perder grasa',
    badge: 'Déficit',
    deltaText: '-500 kcal sobre tu gasto diario',
  },
  maintain: {
    label: 'Mantener peso',
    badge: 'Equilibrio',
    deltaText: 'Igual a tu gasto energético diario',
  },
  gain: {
    label: 'Ganar músculo',
    badge: 'Superávit',
    deltaText: '+350 kcal sobre tu gasto diario',
  },
};

export const MEAL_CATEGORY_META: Record<
  MealCategory,
  {
    label: string;
    share: number;
    timeHint: string;
    accentBg: string;
    accentText: string;
    accentBorder: string;
  }
> = {
  desayuno: {
    label: 'Desayuno',
    share: 0.3,
    timeHint: 'Mañana • ~30% del día',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200',
  },
  comida: {
    label: 'Comida',
    share: 0.4,
    timeHint: 'Mediodía • ~40% del día',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
  },
  cena: {
    label: 'Cena',
    share: 0.3,
    timeHint: 'Noche • ~30% del día',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200',
  },
};

/**
 * Ecuación Mifflin-St Jeor para Tasa Metabólica Basal (TMB / BMR)
 */
export function calculateBMR(profile: UserProfile): number {
  const base =
    10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return Math.round(profile.gender === 'male' ? base + 5 : base - 161);
}

/**
 * Gasto Energético Diario Total (TDEE)
 */
export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const factor = ACTIVITY_FACTORS[profile.activityLevel] ?? 1.55;
  return Math.round(bmr * factor);
}

/**
 * Meta de calorías diarias requeridas en base a datos personales y objetivo
 */
export function calculateCalorieTarget(profile: UserProfile): number {
  if (
    typeof profile.customCalorieTarget === 'number' &&
    profile.customCalorieTarget >= 800
  ) {
    return Math.round(profile.customCalorieTarget);
  }
  const tdee = calculateTDEE(profile);
  switch (profile.goal) {
    case 'lose':
      return Math.max(1200, Math.round(tdee - 500));
    case 'gain':
      return Math.round(tdee + 350);
    case 'maintain':
    default:
      return tdee;
  }
}

/**
 * Distribución recomendada de macronutrientes (gramos) según objetivo
 */
export function calculateMacroTargets(
  targetCalories: number,
  goal: GoalType
): { protein: number; carbs: number; fat: number } {
  const ratios =
    goal === 'lose'
      ? { protein: 0.32, carbs: 0.38, fat: 0.3 }
      : goal === 'gain'
        ? { protein: 0.28, carbs: 0.47, fat: 0.25 }
        : { protein: 0.28, carbs: 0.44, fat: 0.28 };

  return {
    protein: Math.round((targetCalories * ratios.protein) / 4),
    carbs: Math.round((targetCalories * ratios.carbs) / 4),
    fat: Math.round((targetCalories * ratios.fat) / 9),
  };
}

/**
 * Índice de Masa Corporal (IMC) y su clasificación en español
 */
export function calculateBMI(
  weightKg: number,
  heightCm: number
): { value: number; category: string; colorClass: string } {
  const heightM = heightCm / 100;
  if (heightM <= 0) {
    return { value: 0, category: 'Sin datos', colorClass: 'text-slate-500' };
  }
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  if (bmi < 18.5) {
    return { value: bmi, category: 'Bajo peso', colorClass: 'text-sky-600' };
  }
  if (bmi < 25) {
    return {
      value: bmi,
      category: 'Peso saludable',
      colorClass: 'text-emerald-600',
    };
  }
  if (bmi < 30) {
    return { value: bmi, category: 'Sobrepeso', colorClass: 'text-amber-600' };
  }
  return { value: bmi, category: 'Obesidad', colorClass: 'text-rose-600' };
}

/**
 * Evalúa si el usuario cumplió, no cumplió o excedió las calorías necesarias del día.
 * Rango ideal: entre 90% y 105% de la meta diaria.
 */
export function evaluateDailyStatus(
  consumedCalories: number,
  targetCalories: number
): DailyEvaluation {
  const safeTarget = Math.max(1, Math.round(targetCalories));
  const consumed = Math.max(0, Math.round(consumedCalories));
  const minIdeal = Math.round(safeTarget * 0.9);
  const maxIdeal = Math.round(safeTarget * 1.05);
  const percentage = Math.round((consumed / safeTarget) * 100);

  if (consumed < minIdeal) {
    const missing = safeTarget - consumed;
    return {
      status: 'no_cumplio',
      label: 'No cumplió la meta (Faltan calorías)',
      shortLabel: 'No cumplió',
      description:
        consumed === 0
          ? `Aún no registras comidas hoy. Tu meta es de ${safeTarget} kcal.`
          : `Te faltan ${missing.toLocaleString('es-MX')} kcal para alcanzar tus ${safeTarget.toLocaleString('es-MX')} kcal requeridas.`,
      diff: missing,
      percentage,
      minIdeal,
      maxIdeal,
    };
  }

  if (consumed <= maxIdeal) {
    const delta = consumed - safeTarget;
    const deltaMsg =
      delta === 0
        ? 'Alcanzaste exactamente tu meta.'
        : delta > 0
          ? `Estás apenas +${delta} kcal dentro del margen saludable.`
          : `Estás a solo ${Math.abs(delta)} kcal de tu meta exacta.`;
    return {
      status: 'cumplio',
      label: '¡Cumplió la meta diaria!',
      shortLabel: 'Cumplió',
      description: `Excelente equilibrio: estás dentro de tu rango ideal (${minIdeal.toLocaleString('es-MX')} - ${maxIdeal.toLocaleString('es-MX')} kcal). ${deltaMsg}`,
      diff: delta,
      percentage,
      minIdeal,
      maxIdeal,
    };
  }

  const exceeded = consumed - safeTarget;
  return {
    status: 'excedio',
    label: 'Excedió las calorías necesarias',
    shortLabel: 'Excedió',
    description: `Te pasaste por ${exceeded.toLocaleString('es-MX')} kcal sobre tu meta diaria de ${safeTarget.toLocaleString('es-MX')} kcal.`,
    diff: exceeded,
    percentage,
    minIdeal,
    maxIdeal,
  };
}

/**
 * Helpers de fechas locales en formato YYYY-MM-DD
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + deltaDays);
  return getLocalDateKey(date);
}

export function formatDateLabel(dateKey: string): string {
  const today = getLocalDateKey();
  const yesterday = shiftDateKey(today, -1);
  const tomorrow = shiftDateKey(today, 1);

  if (dateKey === today) return 'Hoy';
  if (dateKey === yesterday) return 'Ayer';
  if (dateKey === tomorrow) return 'Mañana';

  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
