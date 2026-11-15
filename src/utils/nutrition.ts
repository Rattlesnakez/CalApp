import type {
  ActivityLevel,
  DailyEvaluation,
  DetectedFoodItem,
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
    accentBg: 'bg-amber-50 dark:bg-amber-950/40',
    accentText: 'text-amber-700 dark:text-amber-400',
    accentBorder: 'border-amber-200 dark:border-amber-800/60',
  },
  comida: {
    label: 'Comida',
    share: 0.4,
    timeHint: 'Mediodía • ~40% del día',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentText: 'text-emerald-700 dark:text-emerald-400',
    accentBorder: 'border-emerald-200 dark:border-emerald-800/60',
  },
  cena: {
    label: 'Cena',
    share: 0.3,
    timeHint: 'Noche • ~30% del día',
    accentBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    accentText: 'text-indigo-700 dark:text-indigo-400',
    accentBorder: 'border-indigo-200 dark:border-indigo-800/60',
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
    return {
      value: 0,
      category: 'Sin datos',
      colorClass: 'text-slate-500 dark:text-slate-400',
    };
  }
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  if (bmi < 18.5) {
    return {
      value: bmi,
      category: 'Bajo peso',
      colorClass: 'text-sky-600 dark:text-sky-400',
    };
  }
  if (bmi < 25) {
    return {
      value: bmi,
      category: 'Peso saludable',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (bmi < 30) {
    return {
      value: bmi,
      category: 'Sobrepeso',
      colorClass: 'text-amber-600 dark:text-amber-400',
    };
  }
  return {
    value: bmi,
    category: 'Obesidad',
    colorClass: 'text-rose-600 dark:text-rose-400',
  };
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

/* ========================================================================== */
/* Utilidades de parseo y escalado de porciones                               */
/* ========================================================================== */

export interface ParsedPortion {
  quantity: number;
  unit: string;
  unitKind: 'mass_volume' | 'countable';
  step: number;
  minQuantity: number;
  gramsInParens?: number;
  gramsInParensUnit?: string;
}

export interface ItemPortionBase {
  baseQuantity: number;
  parsedPortion: ParsedPortion;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 0.33,
  '⅔': 0.67,
};

const WORD_QUANTITIES: Record<string, number> = {
  media: 0.5,
  medio: 0.5,
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
};

const COUNTABLE_UNIT_FORMS: Array<[singular: string, plural: string]> = [
  ['pieza', 'piezas'],
  ['taza', 'tazas'],
  ['rebanada', 'rebanadas'],
  ['cucharada', 'cucharadas'],
  ['cda', 'cdas'],
  ['cucharadita', 'cucharaditas'],
  ['cdita', 'cditas'],
  ['porción', 'porciones'],
  ['porcion', 'porciones'],
  ['lata', 'latas'],
  ['plato', 'platos'],
  ['vaso', 'vasos'],
  ['taco', 'tacos'],
  ['tortilla', 'tortillas'],
  ['huevo', 'huevos'],
  ['clara', 'claras'],
  ['filete', 'filetes'],
  ['bolillo', 'bolillos'],
  ['rodaja', 'rodajas'],
  ['puño', 'puños'],
  ['sobre', 'sobres'],
  ['orden', 'órdenes'],
  ['ordenes', 'órdenes'],
  ['unidad', 'unidades'],
];

const MEASURE_SPLIT_UNITS = new Set([
  'g',
  'gr',
  'gramo',
  'gramos',
  'ml',
  'mililitro',
  'mililitros',
  'taza',
  'tazas',
  'cucharada',
  'cucharadas',
  'cda',
  'cdas',
  'cucharadita',
  'cucharaditas',
  'cdita',
  'cditas',
  'porción',
  'porciones',
  'porcion',
  'rebanada',
  'rebanadas',
  'lata',
  'latas',
  'plato',
  'platos',
  'vaso',
  'vasos',
  'puño',
  'puños',
  'rodaja',
  'rodajas',
  'pieza',
  'piezas',
  'filete',
  'filetes',
  'orden',
  'ordenes',
  'órdenes',
]);

export function formatQuantityNumber(val: number): string {
  if (!Number.isFinite(val)) return '0';
  return Number(Math.max(0, val).toFixed(2)).toString();
}

function normalizeUnitAndKind(rawUnit: string): {
  unit: string;
  unitKind: 'mass_volume' | 'countable';
} {
  const cleaned = rawUnit.replace(/^(?:de|del)\s+/i, '').trim();
  const lower = cleaned.toLowerCase();

  if (/^(g|gr|gramo|gramos)$/i.test(lower)) {
    return { unit: 'g', unitKind: 'mass_volume' };
  }
  if (/^(ml|mililitro|mililitros)$/i.test(lower)) {
    return { unit: 'ml', unitKind: 'mass_volume' };
  }

  return {
    unit: cleaned || 'porción',
    unitKind: 'countable',
  };
}

function extractLeadingQuantity(text: string): {
  quantity: number | null;
  rest: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { quantity: null, rest: '' };

  // Fracción mixta: "1 1/2 taza"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\b\s*(.*)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den > 0) {
      return {
        quantity: Number((whole + num / den).toFixed(2)),
        rest: mixedMatch[4].trim(),
      };
    }
  }

  // Fracción simple: "1/2 pieza", "3/4 taza"
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)\b\s*(.*)$/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (den > 0) {
      return {
        quantity: Number((num / den).toFixed(2)),
        rest: fracMatch[3].trim(),
      };
    }
  }

  // Fracción unicode: "½ aguacate", "¼ taza"
  const unicodeMatch = trimmed.match(/^([½¼¾⅓⅔])\s*(.*)$/);
  if (unicodeMatch) {
    return {
      quantity: UNICODE_FRACTIONS[unicodeMatch[1]] ?? 0.5,
      rest: unicodeMatch[2].trim(),
    };
  }

  // Número decimal o entero: "150 g", "1.5 tazas", "2 piezas"
  const numMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (numMatch) {
    const val = Number(numMatch[1].replace(',', '.'));
    if (Number.isFinite(val)) {
      return {
        quantity: val,
        rest: numMatch[2].trim(),
      };
    }
  }

  // Palabras numéricas comunes: "media taza", "dos tortillas"
  const wordMatch = trimmed.match(
    /^(media|medio|un|una|uno|dos|tres|cuatro|cinco|seis)\b\s*(.*)$/i
  );
  if (wordMatch) {
    const mapped = WORD_QUANTITIES[wordMatch[1].toLowerCase()];
    if (mapped !== undefined) {
      return {
        quantity: mapped,
        rest: wordMatch[2].trim(),
      };
    }
  }

  return { quantity: null, rest: trimmed };
}

export function parsePortionText(portion: string): ParsedPortion {
  let working = portion.trim();
  let gramsInParens: number | undefined;
  let gramsInParensUnit: string | undefined;

  // Extraer equivalencia opcional en gramos/ml entre paréntesis: "2 piezas (110 g)"
  const parenMatch = working.match(
    /\(\s*(\d+(?:[.,]\d+)?)\s*(g|gr|gramos|ml)\s*\)\s*$/i
  );
  if (parenMatch) {
    const parenVal = Number(parenMatch[1].replace(',', '.'));
    if (parenVal > 0) {
      gramsInParens = parenVal;
      gramsInParensUnit = parenMatch[2].toLowerCase().startsWith('ml') ? 'ml' : 'g';
      working = working.slice(0, parenMatch.index).trim();
    }
  }

  const extracted = extractLeadingQuantity(working);
  let quantity = extracted.quantity;
  let unitRaw = extracted.rest;

  if (quantity === null) {
    // Buscar masa/volumen en otra posición si existiera (ej. "porción de 150 g")
    const inlineMass = working.match(
      /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|gr|gramos|ml)\b$/i
    );
    if (inlineMass) {
      quantity = Number(inlineMass[2].replace(',', '.'));
      unitRaw = inlineMass[3];
    } else {
      quantity = 1;
      unitRaw = working || 'porción';
    }
  }

  const { unit, unitKind } = normalizeUnitAndKind(unitRaw);
  const isMassVolume = unitKind === 'mass_volume';

  return {
    quantity: quantity >= 0 ? quantity : 1,
    unit,
    unitKind,
    step: isMassVolume ? 25 : 0.5,
    minQuantity: isMassVolume ? 5 : 0.25,
    gramsInParens,
    gramsInParensUnit,
  };
}

function inflectCountableUnit(unit: string, quantity: number): string {
  const parts = unit.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'porción';

  const first = parts[0];
  const lower = first.toLowerCase();
  const isSingular = Math.abs(quantity - 1) < 0.001;

  for (const [singular, plural] of COUNTABLE_UNIT_FORMS) {
    if (lower === singular || lower === plural) {
      parts[0] = isSingular ? singular : plural;
      return parts.join(' ');
    }
  }

  return unit;
}

export function formatPortionText(quantity: number, parsed: ParsedPortion): string {
  if (parsed.unitKind === 'mass_volume') {
    const safeVal = Math.max(0, Math.round(quantity));
    return `${safeVal} ${parsed.unit}`;
  }

  const safeVal = Math.max(0, Number(quantity.toFixed(2)));
  const qtyText = formatQuantityNumber(safeVal);
  const unitText = inflectCountableUnit(parsed.unit, safeVal);

  if (parsed.gramsInParens && parsed.quantity > 0) {
    const scaledParens = Math.max(
      0,
      Math.round((parsed.gramsInParens / parsed.quantity) * safeVal)
    );
    return `${qtyText} ${unitText} (${scaledParens} ${parsed.gramsInParensUnit || 'g'})`;
  }

  return `${qtyText} ${unitText}`;
}

export function extractItemPortionBase(item: DetectedFoodItem): ItemPortionBase {
  const parsedPortion = parsePortionText(item.portion);
  const baseQuantity = parsedPortion.quantity > 0 ? parsedPortion.quantity : 1;
  return {
    baseQuantity,
    parsedPortion,
    caloriesPerUnit: item.calories / baseQuantity,
    proteinPerUnit: item.protein / baseQuantity,
    carbsPerUnit: item.carbs / baseQuantity,
    fatPerUnit: item.fat / baseQuantity,
  };
}

export function scaleFoodItemByQuantity(
  base: ItemPortionBase,
  currentItem: DetectedFoodItem,
  newQuantity: number
): DetectedFoodItem {
  const safeQty = Math.max(0, newQuantity);
  const effectiveQty =
    base.parsedPortion.unitKind === 'mass_volume'
      ? Math.round(safeQty)
      : Number(safeQty.toFixed(2));

  return {
    ...currentItem,
    portion: formatPortionText(effectiveQty, base.parsedPortion),
    calories: Math.max(0, Math.round(base.caloriesPerUnit * effectiveQty)),
    protein: Math.max(0, Math.round(base.proteinPerUnit * effectiveQty)),
    carbs: Math.max(0, Math.round(base.carbsPerUnit * effectiveQty)),
    fat: Math.max(0, Math.round(base.fatPerUnit * effectiveQty)),
  };
}

function scaleSingleIngredientFragment(fragment: string, multiplier: number): string {
  const trimmed = fragment.trim();
  if (!trimmed || Math.abs(multiplier - 1) < 0.001) return trimmed;

  const extracted = extractLeadingQuantity(trimmed);
  if (extracted.quantity === null) {
    return trimmed;
  }

  const deMatch = extracted.rest.match(/^(.+?)\s+(?:de|del)\s+(.+)$/i);
  if (deMatch) {
    const unitPart = deMatch[1].trim();
    const ingredientPart = deMatch[2].trim();
    const parsed = parsePortionText(`${extracted.quantity} ${unitPart}`);
    const scaled = scaleQuantityForDisplay(parsed.quantity * multiplier, parsed.unitKind);
    return `${formatPortionText(scaled, parsed)} de ${ingredientPart}`;
  }

  // Ej. "1/3 de aguacate" donde rest empieza directamente con "de "
  if (/^(?:de|del)\s+/i.test(extracted.rest)) {
    const scaled = scaleQuantityForDisplay(extracted.quantity * multiplier, 'countable');
    return `${formatQuantityNumber(scaled)} ${extracted.rest}`;
  }

  const parsed = parsePortionText(trimmed);
  const scaled = scaleQuantityForDisplay(parsed.quantity * multiplier, parsed.unitKind);
  return formatPortionText(scaled, parsed);
}

function scaleQuantityForDisplay(
  value: number,
  unitKind: 'mass_volume' | 'countable'
): number {
  if (unitKind === 'mass_volume') {
    return Math.max(5, Math.round(value));
  }
  return Math.max(0.25, Number(value.toFixed(2)));
}

export function scaleIngredientLine(line: string, multiplier: number): string {
  if (Math.abs(multiplier - 1) < 0.001) return line;
  if (line.includes('+')) {
    return line
      .split('+')
      .map((part) => scaleSingleIngredientFragment(part, multiplier))
      .join(' + ');
  }
  return scaleSingleIngredientFragment(line, multiplier);
}

export function splitIngredientLineToPortionAndName(line: string): {
  name: string;
  portion: string;
} {
  const clean = line.trim();
  if (!clean) return { name: 'Ingrediente', portion: '1 porción' };

  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Ingrediente';

  const extracted = extractLeadingQuantity(clean);
  if (extracted.quantity === null) {
    return { name: capitalize(clean), portion: '1 porción' };
  }

  const qtyText = formatQuantityNumber(extracted.quantity);
  const deMatch = extracted.rest.match(/^(.+?)\s+(?:de|del)\s+(.+)$/i);
  if (deMatch) {
    const unitPart = deMatch[1].trim();
    const firstWordLower = unitPart.split(/\s+/)[0]?.toLowerCase() ?? '';
    const foodPart = deMatch[2].trim();

    if (MEASURE_SPLIT_UNITS.has(firstWordLower)) {
      const normalizedUnit = /^(g|gr|gramo|gramos)$/i.test(firstWordLower)
        ? 'g'
        : /^(ml|mililitro|mililitros)$/i.test(firstWordLower)
          ? 'ml'
          : unitPart;
      return {
        name: capitalize(foodPart),
        portion: `${qtyText} ${normalizedUnit}`.trim(),
      };
    }

    return {
      name: capitalize(extracted.rest),
      portion: `${qtyText} ${extracted.quantity === 1 ? 'pieza' : 'piezas'}`,
    };
  }

  if (/^(?:de|del)\s+/i.test(extracted.rest)) {
    const foodPart = extracted.rest.replace(/^(?:de|del)\s+/i, '').trim();
    return {
      name: capitalize(foodPart),
      portion: `${qtyText} ${extracted.quantity === 1 ? 'porción' : 'porciones'}`,
    };
  }

  return {
    name: capitalize(extracted.rest || clean),
    portion: `${qtyText} ${extracted.quantity === 1 ? 'porción' : 'porciones'}`,
  };
}
