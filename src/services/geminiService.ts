import { GoogleGenAI } from '@google/genai';
import type {
  DetectedFoodItem,
  MealAnalysisResult,
  MealCategory,
} from '../types';
import { loadGeminiApiKey } from '../utils/storage';

export interface CompressedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
}

const mealAnalysisJsonSchema = {
  type: 'object',
  properties: {
    mealName: {
      type: 'string',
      description: 'Nombre descriptivo y corto del platillo principal en español.',
    },
    totalCalories: {
      type: 'integer',
      description: 'Suma total estimada de calorías (kcal) de todo el platillo.',
    },
    protein: {
      type: 'number',
      description: 'Total estimado de proteínas en gramos.',
    },
    carbs: {
      type: 'number',
      description: 'Total estimado de carbohidratos en gramos.',
    },
    fat: {
      type: 'number',
      description: 'Total estimado de grasas en gramos.',
    },
    aiTip: {
      type: 'string',
      description:
        'Consejo nutricional breve y útil en español sobre este platillo.',
    },
    items: {
      type: 'array',
      description: 'Lista detallada de cada alimento detectado en la imagen.',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre del alimento en español.',
          },
          portion: {
            type: 'string',
            description: 'Porción estimada (ej. "150 g", "2 piezas", "1 taza").',
          },
          calories: {
            type: 'integer',
            description: 'Calorías estimadas de este alimento en kcal.',
          },
          protein: {
            type: 'number',
            description: 'Proteínas en gramos.',
          },
          carbs: {
            type: 'number',
            description: 'Carbohidratos en gramos.',
          },
          fat: {
            type: 'number',
            description: 'Grasas en gramos.',
          },
        },
        required: ['name', 'portion', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
  },
  required: [
    'mealName',
    'totalCalories',
    'protein',
    'carbs',
    'fat',
    'aiTip',
    'items',
  ],
};

/**
 * Comprime una imagen tomada con cámara o galería para que ocupe pocos KB
 * en localStorage y se envíe rápido a Gemini.
 */
export function compressImageToDataUrl(
  file: File,
  maxWidth = 800,
  quality = 0.78
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetWidth = Math.max(1, Math.round(img.width * scale));
        const targetHeight = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el procesador de imagen.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({ dataUrl, base64, mimeType });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export interface DemoMealTemplate {
  id: string;
  category: MealCategory;
  title: string;
  subtitle: string;
  svgDataUrl: string;
  analysis: MealAnalysisResult;
}

function makePlateSvgDataUrl(
  bg1: string,
  bg2: string,
  label: string,
  accent: string,
  emojiText: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="280" fill="url(#g)"/>
    <circle cx="200" cy="140" r="96" fill="#ffffff" fill-opacity="0.95"/>
    <circle cx="200" cy="140" r="76" fill="${accent}" fill-opacity="0.16" stroke="${accent}" stroke-width="3" stroke-dasharray="8 6"/>
    <text x="200" y="132" text-anchor="middle" font-size="44" font-family="sans-serif">${emojiText}</text>
    <text x="200" y="176" text-anchor="middle" font-size="16" font-weight="700" fill="#1e293b" font-family="sans-serif">${label}</text>
    <rect x="16" y="16" width="118" height="28" rx="14" fill="#0f172a" fill-opacity="0.72"/>
    <text x="75" y="34" text-anchor="middle" font-size="12" font-weight="600" fill="#ffffff" font-family="sans-serif">FOTO DEMO IA</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEMO_MEAL_TEMPLATES: DemoMealTemplate[] = [
  {
    id: 'demo-desayuno-huevos',
    category: 'desayuno',
    title: 'Huevos revueltos con aguacate',
    subtitle: '~485 kcal • Proteína y grasas buenas',
    svgDataUrl: makePlateSvgDataUrl('#fef3c7', '#fde68a', 'Huevos + Aguacate + Pan', '#d97706', '🍳🥑🍞'),
    analysis: {
      mealName: 'Huevos revueltos con aguacate y pan integral',
      totalCalories: 485,
      protein: 24,
      carbs: 34,
      fat: 28,
      aiTip:
        'Excelente combinación de proteína y grasas saludables para mantener la saciedad durante la mañana.',
      isDemo: true,
      items: [
        {
          name: 'Huevos revueltos',
          portion: '2 piezas (110 g)',
          calories: 175,
          protein: 13,
          carbs: 1,
          fat: 13,
        },
        {
          name: 'Aguacate en rebanadas',
          portion: '1/2 pieza (75 g)',
          calories: 120,
          protein: 2,
          carbs: 6,
          fat: 11,
        },
        {
          name: 'Pan integral tostado',
          portion: '2 rebanadas (60 g)',
          calories: 150,
          protein: 7,
          carbs: 26,
          fat: 2,
        },
        {
          name: 'Café con leche descremada',
          portion: '1 taza (200 ml)',
          calories: 40,
          protein: 2,
          carbs: 1,
          fat: 2,
        },
      ],
    },
  },
  {
    id: 'demo-comida-pollo',
    category: 'comida',
    title: 'Pechuga a la plancha con arroz y ensalada',
    subtitle: '~640 kcal • Plato balanceado completo',
    svgDataUrl: makePlateSvgDataUrl('#d1fae5', '#a7f3d0', 'Pollo + Arroz + Ensalada', '#059669', '🍗🍚🥗'),
    analysis: {
      mealName: 'Pechuga de pollo a la plancha con arroz y ensalada',
      totalCalories: 640,
      protein: 48,
      carbs: 62,
      fat: 19,
      aiTip:
        'Buen aporte proteico para recuperación muscular. Si buscas reducir calorías, modera el aderezo de la ensalada.',
      isDemo: true,
      items: [
        {
          name: 'Pechuga de pollo a la plancha',
          portion: '180 g',
          calories: 295,
          protein: 42,
          carbs: 0,
          fat: 12,
        },
        {
          name: 'Arroz cocido',
          portion: '1 taza (160 g)',
          calories: 210,
          protein: 4,
          carbs: 45,
          fat: 1,
        },
        {
          name: 'Ensalada fresca con aceite de oliva',
          portion: '1 plato (150 g)',
          calories: 95,
          protein: 2,
          carbs: 7,
          fat: 6,
        },
        {
          name: 'Tortilla de maíz',
          portion: '1 pieza (25 g)',
          calories: 40,
          protein: 0,
          carbs: 10,
          fat: 0,
        },
      ],
    },
  },
  {
    id: 'demo-comida-tacos',
    category: 'comida',
    title: 'Tacos de carne asada con guacamole',
    subtitle: '~780 kcal • Comida abundante',
    svgDataUrl: makePlateSvgDataUrl('#ffedd5', '#fed7aa', 'Tacos de Asada + Guacamole', '#ea580c', '🌮🥩🥑'),
    analysis: {
      mealName: 'Orden de 4 tacos de carne asada con guacamole',
      totalCalories: 780,
      protein: 42,
      carbs: 58,
      fat: 41,
      aiTip:
        'Platillo alto en energía y proteínas. Acompáñalo con verduras asadas o nopales para sumar fibra.',
      isDemo: true,
      items: [
        {
          name: 'Carne asada de res',
          portion: '180 g',
          calories: 380,
          protein: 36,
          carbs: 0,
          fat: 26,
        },
        {
          name: 'Tortillas de maíz',
          portion: '4 piezas (100 g)',
          calories: 220,
          protein: 5,
          carbs: 46,
          fat: 2,
        },
        {
          name: 'Guacamole casero',
          portion: '3 cucharadas (70 g)',
          calories: 140,
          protein: 1,
          carbs: 5,
          fat: 13,
        },
        {
          name: 'Salsa roja, cebolla y cilantro',
          portion: '60 g',
          calories: 40,
          protein: 0,
          carbs: 7,
          fat: 0,
        },
      ],
    },
  },
  {
    id: 'demo-cena-salmon',
    category: 'cena',
    title: 'Salmón al horno con verduras',
    subtitle: '~460 kcal • Cena ligera rica en Omega-3',
    svgDataUrl: makePlateSvgDataUrl('#e0e7ff', '#c7d2fe', 'Salmón + Verduras Asadas', '#4f46e5', '🐟🥦🥕'),
    analysis: {
      mealName: 'Filete de salmón al horno con brócoli y zanahoria',
      totalCalories: 460,
      protein: 36,
      carbs: 22,
      fat: 25,
      aiTip:
        'Cena ligera, fácil de digerir y rica en ácidos grasos Omega-3 ideal para cerrar el día sin pesadez.',
      isDemo: true,
      items: [
        {
          name: 'Filete de salmón al horno',
          portion: '160 g',
          calories: 330,
          protein: 32,
          carbs: 0,
          fat: 22,
        },
        {
          name: 'Brócoli y zanahoria al vapor',
          portion: '180 g',
          calories: 85,
          protein: 4,
          carbs: 18,
          fat: 0,
        },
        {
          name: 'Aderezo de limón y oliva',
          portion: '1 cucharadita (5 ml)',
          calories: 45,
          protein: 0,
          carbs: 4,
          fat: 3,
        },
      ],
    },
  },
];

export function recalculateTotalsFromItems(
  items: DetectedFoodItem[]
): Pick<MealAnalysisResult, 'totalCalories' | 'protein' | 'carbs' | 'fat'> {
  const totals = items.reduce(
    (acc, item) => {
      acc.totalCalories += Number(item.calories) || 0;
      acc.protein += Number(item.protein) || 0;
      acc.carbs += Number(item.carbs) || 0;
      acc.fat += Number(item.fat) || 0;
      return acc;
    },
    { totalCalories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    totalCalories: Math.round(totals.totalCalories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };
}

function getDemoFallbackForCategory(category: MealCategory): MealAnalysisResult {
  const match =
    DEMO_MEAL_TEMPLATES.find((t) => t.category === category) ??
    DEMO_MEAL_TEMPLATES[0];
  return {
    ...match.analysis,
    items: match.analysis.items.map((item) => ({ ...item })),
    isDemo: true,
  };
}

/**
 * Analiza una fotografía de comida usando Gemini Vision (`gemini-4-hydrogen`)
 * o ejecuta un análisis simulado realista cuando está activo el Modo Demo.
 */
export async function analyzeFoodPhoto(params: {
  base64: string;
  mimeType: string;
  category: MealCategory;
  forceDemo?: boolean;
  demoTemplateId?: string;
}): Promise<MealAnalysisResult> {
  const { base64, mimeType, category, forceDemo, demoTemplateId } = params;

  if (demoTemplateId) {
    const template = DEMO_MEAL_TEMPLATES.find((t) => t.id === demoTemplateId);
    if (template) {
      await new Promise((r) => setTimeout(r, 1100));
      return {
        ...template.analysis,
        items: template.analysis.items.map((i) => ({ ...i })),
        isDemo: true,
      };
    }
  }

  const apiKey = loadGeminiApiKey();

  if (forceDemo || !apiKey) {
    await new Promise((r) => setTimeout(r, 1200));
    return getDemoFallbackForCategory(category);
  }

  const ai = new GoogleGenAI({ apiKey });

  const categoryLabel =
    category === 'desayuno'
      ? 'Desayuno'
      : category === 'comida'
        ? 'Comida'
        : 'Cena';

  const interaction = await ai.interactions.create({
    model: 'gemini-4-hydrogen',
    input: [
      {
        type: 'text',
        text: `Analiza esta imagen de comida (registrada como ${categoryLabel}). Identifica cada alimento visible, estima su porción en gramos o unidades caseras, sus calorías (kcal) y macronutrientes (proteínas, carbohidratos y grasas en gramos). Devuelve el resultado en español siguiendo exactamente el esquema JSON.`,
      },
      {
        type: 'image',
        data: base64,
        mime_type: mimeType,
      },
    ],
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: mealAnalysisJsonSchema,
    },
  });

  const rawText = interaction.output_text;
  if (!rawText) {
    throw new Error('La IA no devolvió información de la imagen.');
  }

  const parsed = JSON.parse(rawText) as Partial<MealAnalysisResult>;
  const items: DetectedFoodItem[] = Array.isArray(parsed.items)
    ? parsed.items.map((item) => ({
        name: String(item.name || 'Alimento detectado'),
        portion: String(item.portion || '1 porción'),
        calories: Math.max(0, Math.round(Number(item.calories) || 0)),
        protein: Math.max(0, Math.round(Number(item.protein) || 0)),
        carbs: Math.max(0, Math.round(Number(item.carbs) || 0)),
        fat: Math.max(0, Math.round(Number(item.fat) || 0)),
      }))
    : [];

  const recalculated =
    items.length > 0
      ? recalculateTotalsFromItems(items)
      : {
          totalCalories: Math.max(0, Math.round(Number(parsed.totalCalories) || 0)),
          protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
          carbs: Math.max(0, Math.round(Number(parsed.carbs) || 0)),
          fat: Math.max(0, Math.round(Number(parsed.fat) || 0)),
        };

  return {
    mealName: String(parsed.mealName || `${categoryLabel} analizado con IA`),
    totalCalories: recalculated.totalCalories,
    protein: recalculated.protein,
    carbs: recalculated.carbs,
    fat: recalculated.fat,
    items,
    aiTip: String(
      parsed.aiTip ||
        'Puedes ajustar cualquier ingrediente o porción antes de guardar.'
    ),
    isDemo: false,
  };
}

interface FoodNutritionEntry {
  keywords: string[];
  displayName: string;
  defaultPortion: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

const FOOD_DICTIONARY: FoodNutritionEntry[] = [
  {
    keywords: ['clara de huevo', 'claras'],
    displayName: 'Claras de huevo',
    defaultPortion: '1 clara (33 g)',
    gramsPerUnit: 33,
    kcalPer100g: 52,
    proteinPer100g: 11,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
  },
  {
    keywords: ['huevo', 'huevos', 'blanquillo'],
    displayName: 'Huevo',
    defaultPortion: '1 pieza (55 g)',
    gramsPerUnit: 55,
    kcalPer100g: 155,
    proteinPer100g: 13,
    carbsPer100g: 1.1,
    fatPer100g: 11,
  },
  {
    keywords: ['tortilla de harina', 'tortillas de harina'],
    displayName: 'Tortilla de harina',
    defaultPortion: '1 pieza (45 g)',
    gramsPerUnit: 45,
    kcalPer100g: 310,
    proteinPer100g: 8,
    carbsPer100g: 52,
    fatPer100g: 8,
  },
  {
    keywords: ['tortilla', 'tortillas'],
    displayName: 'Tortilla de maíz',
    defaultPortion: '1 pieza (28 g)',
    gramsPerUnit: 28,
    kcalPer100g: 218,
    proteinPer100g: 5.7,
    carbsPer100g: 45,
    fatPer100g: 2.8,
  },
  {
    keywords: ['pan tostado', 'pan integral', 'rebanada de pan', 'pan de caja', 'pan'],
    displayName: 'Pan de caja / tostado',
    defaultPortion: '1 rebanada (30 g)',
    gramsPerUnit: 30,
    kcalPer100g: 265,
    proteinPer100g: 9,
    carbsPer100g: 49,
    fatPer100g: 3.5,
  },
  {
    keywords: ['bolillo', 'telera'],
    displayName: 'Bolillo',
    defaultPortion: '1 pieza (60 g)',
    gramsPerUnit: 60,
    kcalPer100g: 270,
    proteinPer100g: 8.5,
    carbsPer100g: 56,
    fatPer100g: 1.5,
  },
  {
    keywords: ['arroz'],
    displayName: 'Arroz cocido',
    defaultPortion: '1 taza (160 g)',
    gramsPerUnit: 160,
    kcalPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
  },
  {
    keywords: ['frijol', 'frijoles'],
    displayName: 'Frijoles cocidos',
    defaultPortion: '1 taza (170 g)',
    gramsPerUnit: 170,
    kcalPer100g: 127,
    proteinPer100g: 8.7,
    carbsPer100g: 23,
    fatPer100g: 0.5,
  },
  {
    keywords: ['lenteja', 'lentejas'],
    displayName: 'Lentejas cocidas',
    defaultPortion: '1 taza (180 g)',
    gramsPerUnit: 180,
    kcalPer100g: 116,
    proteinPer100g: 9,
    carbsPer100g: 20,
    fatPer100g: 0.4,
  },
  {
    keywords: ['pechuga de pollo', 'pechuga', 'pollo'],
    displayName: 'Pechuga de pollo',
    defaultPortion: '150 g',
    gramsPerUnit: 150,
    kcalPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
  },
  {
    keywords: ['carne asada', 'bistec', 'res', 'carne de res', 'arrachera', 'carne'],
    displayName: 'Carne de res',
    defaultPortion: '150 g',
    gramsPerUnit: 150,
    kcalPer100g: 215,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 12,
  },
  {
    keywords: ['cerdo', 'chuleta', 'carnitas', 'pastor', 'jamon', 'jamón'],
    displayName: 'Carne de cerdo / jamón',
    defaultPortion: '100 g',
    gramsPerUnit: 100,
    kcalPer100g: 195,
    proteinPer100g: 21,
    carbsPer100g: 1,
    fatPer100g: 12,
  },
  {
    keywords: ['salchicha', 'chorizo', 'tocino'],
    displayName: 'Embutido / tocino',
    defaultPortion: '1 porción (50 g)',
    gramsPerUnit: 50,
    kcalPer100g: 310,
    proteinPer100g: 14,
    carbsPer100g: 2,
    fatPer100g: 27,
  },
  {
    keywords: ['atun', 'atún'],
    displayName: 'Atún en agua',
    defaultPortion: '1 lata (100 g)',
    gramsPerUnit: 100,
    kcalPer100g: 116,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 1,
  },
  {
    keywords: ['salmon', 'salmón'],
    displayName: 'Salmón',
    defaultPortion: '150 g',
    gramsPerUnit: 150,
    kcalPer100g: 208,
    proteinPer100g: 20,
    carbsPer100g: 0,
    fatPer100g: 13,
  },
  {
    keywords: ['pescado', 'tilapia', 'filete de pescado', 'mojarra'],
    displayName: 'Filete de pescado',
    defaultPortion: '150 g',
    gramsPerUnit: 150,
    kcalPer100g: 128,
    proteinPer100g: 24,
    carbsPer100g: 0,
    fatPer100g: 3,
  },
  {
    keywords: ['camaron', 'camarón', 'camarones'],
    displayName: 'Camarones',
    defaultPortion: '120 g',
    gramsPerUnit: 120,
    kcalPer100g: 99,
    proteinPer100g: 24,
    carbsPer100g: 0.2,
    fatPer100g: 0.3,
  },
  {
    keywords: ['aguacate', 'guacamole'],
    displayName: 'Aguacate',
    defaultPortion: '1/2 pieza (75 g)',
    gramsPerUnit: 75,
    kcalPer100g: 160,
    proteinPer100g: 2,
    carbsPer100g: 8.5,
    fatPer100g: 14.7,
  },
  {
    keywords: ['queso panela', 'requeson', 'requesón', 'cottage'],
    displayName: 'Queso fresco / panela',
    defaultPortion: '50 g',
    gramsPerUnit: 50,
    kcalPer100g: 190,
    proteinPer100g: 17,
    carbsPer100g: 2,
    fatPer100g: 12,
  },
  {
    keywords: ['queso', 'manchego', 'oaxaca', 'mozzarella', 'cheddar'],
    displayName: 'Queso',
    defaultPortion: '40 g',
    gramsPerUnit: 40,
    kcalPer100g: 320,
    proteinPer100g: 22,
    carbsPer100g: 2,
    fatPer100g: 25,
  },
  {
    keywords: ['leche'],
    displayName: 'Leche',
    defaultPortion: '1 vaso (240 ml)',
    gramsPerUnit: 240,
    kcalPer100g: 52,
    proteinPer100g: 3.4,
    carbsPer100g: 5,
    fatPer100g: 2,
  },
  {
    keywords: ['yogur', 'yogurt'],
    displayName: 'Yogur natural',
    defaultPortion: '1 taza (170 g)',
    gramsPerUnit: 170,
    kcalPer100g: 75,
    proteinPer100g: 6,
    carbsPer100g: 7,
    fatPer100g: 2.5,
  },
  {
    keywords: ['avena'],
    displayName: 'Avena',
    defaultPortion: '1/2 taza seca (45 g)',
    gramsPerUnit: 45,
    kcalPer100g: 380,
    proteinPer100g: 13,
    carbsPer100g: 67,
    fatPer100g: 7,
  },
  {
    keywords: ['platano', 'plátano', 'banana'],
    displayName: 'Plátano',
    defaultPortion: '1 pieza (115 g)',
    gramsPerUnit: 115,
    kcalPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 23,
    fatPer100g: 0.3,
  },
  {
    keywords: ['manzana'],
    displayName: 'Manzana',
    defaultPortion: '1 pieza (160 g)',
    gramsPerUnit: 160,
    kcalPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 14,
    fatPer100g: 0.2,
  },
  {
    keywords: ['naranja', 'mandarina', 'papaya', 'melón', 'melon', 'sandia', 'sandía', 'piña', 'fruta'],
    displayName: 'Fruta fresca',
    defaultPortion: '1 taza (150 g)',
    gramsPerUnit: 150,
    kcalPer100g: 48,
    proteinPer100g: 0.8,
    carbsPer100g: 12,
    fatPer100g: 0.2,
  },
  {
    keywords: ['fresa', 'fresas', 'frutos rojos', 'arándanos', 'arandanos', 'moras'],
    displayName: 'Frutos rojos',
    defaultPortion: '1 taza (140 g)',
    gramsPerUnit: 140,
    kcalPer100g: 40,
    proteinPer100g: 0.8,
    carbsPer100g: 9,
    fatPer100g: 0.3,
  },
  {
    keywords: ['ensalada', 'lechuga', 'espinaca', 'nopales', 'verduras', 'brocoli', 'brócoli', 'zanahoria', 'tomate', 'jitomate', 'pepino'],
    displayName: 'Verduras / ensalada',
    defaultPortion: '1 porción (150 g)',
    gramsPerUnit: 150,
    kcalPer100g: 32,
    proteinPer100g: 2,
    carbsPer100g: 6,
    fatPer100g: 0.3,
  },
  {
    keywords: ['papa', 'papas', 'patata', 'camote'],
    displayName: 'Papa / camote',
    defaultPortion: '1 pieza (150 g)',
    gramsPerUnit: 150,
    kcalPer100g: 93,
    proteinPer100g: 2.2,
    carbsPer100g: 21,
    fatPer100g: 0.1,
  },
  {
    keywords: ['pasta', 'espagueti', 'fideos', 'macarrones'],
    displayName: 'Pasta cocida',
    defaultPortion: '1 taza (150 g)',
    gramsPerUnit: 150,
    kcalPer100g: 158,
    proteinPer100g: 5.8,
    carbsPer100g: 31,
    fatPer100g: 0.9,
  },
  {
    keywords: ['pizza'],
    displayName: 'Rebanada de pizza',
    defaultPortion: '1 rebanada (115 g)',
    gramsPerUnit: 115,
    kcalPer100g: 266,
    proteinPer100g: 11,
    carbsPer100g: 33,
    fatPer100g: 10,
  },
  {
    keywords: ['hamburguesa'],
    displayName: 'Hamburguesa',
    defaultPortion: '1 pieza (220 g)',
    gramsPerUnit: 220,
    kcalPer100g: 245,
    proteinPer100g: 13,
    carbsPer100g: 22,
    fatPer100g: 12,
  },
  {
    keywords: ['taco', 'tacos'],
    displayName: 'Taco',
    defaultPortion: '1 pieza (75 g)',
    gramsPerUnit: 75,
    kcalPer100g: 225,
    proteinPer100g: 11,
    carbsPer100g: 22,
    fatPer100g: 10,
  },
  {
    keywords: ['quesadilla', 'quesadillas'],
    displayName: 'Quesadilla',
    defaultPortion: '1 pieza (90 g)',
    gramsPerUnit: 90,
    kcalPer100g: 265,
    proteinPer100g: 11,
    carbsPer100g: 26,
    fatPer100g: 13,
  },
  {
    keywords: ['torta', 'sandwich', 'sándwich'],
    displayName: 'Sándwich / torta',
    defaultPortion: '1 pieza (180 g)',
    gramsPerUnit: 180,
    kcalPer100g: 220,
    proteinPer100g: 11,
    carbsPer100g: 26,
    fatPer100g: 8,
  },
  {
    keywords: ['chilaquiles'],
    displayName: 'Chilaquiles',
    defaultPortion: '1 plato (250 g)',
    gramsPerUnit: 250,
    kcalPer100g: 185,
    proteinPer100g: 7,
    carbsPer100g: 20,
    fatPer100g: 9,
  },
  {
    keywords: ['aceite', 'mantequilla', 'crema', 'mayonesa'],
    displayName: 'Aceite / grasa añadida',
    defaultPortion: '1 cucharada (12 g)',
    gramsPerUnit: 12,
    kcalPer100g: 750,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 83,
  },
  {
    keywords: ['nuez', 'nueces', 'almendra', 'almendras', 'cacahuate', 'crema de mani', 'crema de cacahuate'],
    displayName: 'Frutos secos / crema de maní',
    defaultPortion: '1 puño / 2 cdas (30 g)',
    gramsPerUnit: 30,
    kcalPer100g: 590,
    proteinPer100g: 21,
    carbsPer100g: 18,
    fatPer100g: 50,
  },
  {
    keywords: ['cafe con leche', 'café con leche', 'capuchino', 'latte'],
    displayName: 'Café con leche',
    defaultPortion: '1 taza (240 ml)',
    gramsPerUnit: 240,
    kcalPer100g: 38,
    proteinPer100g: 2,
    carbsPer100g: 4,
    fatPer100g: 1.5,
  },
  {
    keywords: ['cafe', 'café', 'te', 'té', 'agua'],
    displayName: 'Café / té sin azúcar',
    defaultPortion: '1 taza (240 ml)',
    gramsPerUnit: 240,
    kcalPer100g: 2,
    proteinPer100g: 0,
    carbsPer100g: 0.4,
    fatPer100g: 0,
  },
  {
    keywords: ['jugo', 'refresco', 'licuado', 'soda', 'coca'],
    displayName: 'Bebida / jugo',
    defaultPortion: '1 vaso (250 ml)',
    gramsPerUnit: 250,
    kcalPer100g: 46,
    proteinPer100g: 0.4,
    carbsPer100g: 11,
    fatPer100g: 0,
  },
  {
    keywords: ['proteina', 'proteína', 'whey', 'scoop'],
    displayName: 'Proteína en polvo',
    defaultPortion: '1 scoop (32 g)',
    gramsPerUnit: 32,
    kcalPer100g: 380,
    proteinPer100g: 78,
    carbsPer100g: 8,
    fatPer100g: 4,
  },
  {
    keywords: ['chocolate', 'galleta', 'galletas', 'pan dulce', 'pastel', 'dona'],
    displayName: 'Postre / pan dulce',
    defaultPortion: '1 pieza (60 g)',
    gramsPerUnit: 60,
    kcalPer100g: 410,
    proteinPer100g: 5,
    carbsPer100g: 58,
    fatPer100g: 18,
  },
];

function normalizeSpanishText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseQuantityAndGrams(
  text: string,
  defaultGramsPerUnit: number
): { grams: number; portionLabel: string } {
  const combined = normalizeSpanishText(text);

  // Detectar gramos o mililitros explícitos (ej. "200 g", "150gr", "250 ml")
  const gramMatch = combined.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|gramos|ml)\b/);
  if (gramMatch) {
    const val = Number(gramMatch[1].replace(',', '.'));
    if (val > 0) {
      const unit = gramMatch[2] === 'ml' ? 'ml' : 'g';
      return {
        grams: val,
        portionLabel: `${Math.round(val)} ${unit}`,
      };
    }
  }

  // Detectar fracciones comunes ("media", "1/2", "1/4")
  if (/\b(1\/2|media|medio)\b/.test(combined)) {
    return {
      grams: defaultGramsPerUnit * 0.5,
      portionLabel: `1/2 porción (${Math.round(defaultGramsPerUnit * 0.5)} g)`,
    };
  }
  if (/\b(1\/4|un cuarto)\b/.test(combined)) {
    return {
      grams: defaultGramsPerUnit * 0.25,
      portionLabel: `1/4 porción (${Math.round(defaultGramsPerUnit * 0.25)} g)`,
    };
  }

  // Detectar número de unidades (ej. "2 huevos", "3 tortillas", "dos tacos")
  const wordNumbers: Record<string, number> = {
    un: 1,
    una: 1,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
  };

  const numMatch = combined.match(/\b(\d+(?:[.,]\d+)?)\b/);
  if (numMatch) {
    const count = Math.min(20, Math.max(0.25, Number(numMatch[1].replace(',', '.'))));
    return {
      grams: defaultGramsPerUnit * count,
      portionLabel:
        count === 1
          ? `1 porción (${Math.round(defaultGramsPerUnit)} g)`
          : `${count} piezas/porciones (${Math.round(defaultGramsPerUnit * count)} g)`,
    };
  }

  for (const [word, count] of Object.entries(wordNumbers)) {
    const wordRegex = new RegExp(`\\b${word}\\b`);
    if (wordRegex.test(combined)) {
      return {
        grams: defaultGramsPerUnit * count,
        portionLabel:
          count === 1
            ? `1 porción (${Math.round(defaultGramsPerUnit)} g)`
            : `${count} piezas/porciones (${Math.round(defaultGramsPerUnit * count)} g)`,
      };
    }
  }

  return {
    grams: defaultGramsPerUnit,
    portionLabel: `1 porción (${Math.round(defaultGramsPerUnit)} g)`,
  };
}

export function estimateSingleIngredientLocally(
  rawText: string,
  portionHint?: string
): DetectedFoodItem {
  const cleanRaw = rawText.trim();
  const searchSource = normalizeSpanishText(`${cleanRaw} ${portionHint ?? ''}`);

  let matched: FoodNutritionEntry | undefined;
  for (const entry of FOOD_DICTIONARY) {
    if (
      entry.keywords.some((kw) =>
        searchSource.includes(normalizeSpanishText(kw))
      )
    ) {
      matched = entry;
      break;
    }
  }

  if (matched) {
    const { grams, portionLabel } = parseQuantityAndGrams(
      `${cleanRaw} ${portionHint ?? ''}`,
      matched.gramsPerUnit
    );
    const factor = grams / 100;
    return {
      name: cleanRaw.charAt(0).toUpperCase() + cleanRaw.slice(1),
      portion: portionHint?.trim() || portionLabel,
      calories: Math.max(1, Math.round(matched.kcalPer100g * factor)),
      protein: Math.max(0, Math.round(matched.proteinPer100g * factor)),
      carbs: Math.max(0, Math.round(matched.carbsPer100g * factor)),
      fat: Math.max(0, Math.round(matched.fatPer100g * factor)),
    };
  }

  // Fallback genérico si no coincide con el diccionario
  const { grams, portionLabel } = parseQuantityAndGrams(
    `${cleanRaw} ${portionHint ?? ''}`,
    120
  );
  const calories = Math.max(25, Math.round((grams / 100) * 145));
  return {
    name: cleanRaw ? cleanRaw.charAt(0).toUpperCase() + cleanRaw.slice(1) : 'Alimento',
    portion: portionHint?.trim() || portionLabel,
    calories,
    protein: Math.round((calories * 0.22) / 4),
    carbs: Math.round((calories * 0.48) / 4),
    fat: Math.round((calories * 0.3) / 9),
  };
}

function estimateFoodFromTextLocally(
  description: string,
  category: MealCategory
): MealAnalysisResult {
  const rawParts = description
    .split(/[,;\n+]+|\s+y\s+|\s+con\s+/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);

  const parts = rawParts.length > 0 ? rawParts : [description.trim()];
  const items = parts.map((part) => estimateSingleIngredientLocally(part));
  const totals = recalculateTotalsFromItems(items);
  const categoryLabel =
    category === 'desayuno'
      ? 'Desayuno'
      : category === 'comida'
        ? 'Comida'
        : 'Cena';

  const summaryName =
    description.trim().length <= 55
      ? description.trim().charAt(0).toUpperCase() + description.trim().slice(1)
      : `${categoryLabel}: ${items
          .slice(0, 2)
          .map((i) => i.name)
          .join(' y ')}`;

  return {
    mealName: summaryName,
    totalCalories: totals.totalCalories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    items,
    aiTip:
      'Estimación automática local basada en porciones estándar. Conecta tu API Key de Gemini para análisis nutricional con IA avanzada.',
    isDemo: true,
  };
}

/**
 * Calcula automáticamente las calorías y macronutrientes de una comida descrita en texto manual.
 * Usa Gemini (`gemini-4-hydrogen`) cuando hay API Key, o el motor nutricional local cuando no hay clave.
 */
export async function analyzeFoodDescription(params: {
  description: string;
  category: MealCategory;
  forceDemo?: boolean;
}): Promise<MealAnalysisResult> {
  const { description, category, forceDemo } = params;
  const cleanDescription = description.trim();
  if (!cleanDescription) {
    throw new Error('Escribe al menos un alimento para calcular sus calorías.');
  }

  const apiKey = loadGeminiApiKey();

  if (forceDemo || !apiKey) {
    await new Promise((r) => setTimeout(r, 700));
    return estimateFoodFromTextLocally(cleanDescription, category);
  }

  const ai = new GoogleGenAI({ apiKey });
  const categoryLabel =
    category === 'desayuno'
      ? 'Desayuno'
      : category === 'comida'
        ? 'Comida'
        : 'Cena';

  const interaction = await ai.interactions.create({
    model: 'gemini-4-hydrogen',
    input: `Eres un nutriólogo experto. El usuario registró manualmente esta comida (${categoryLabel}): "${cleanDescription}". Desglosa cada alimento mencionado, estima su porción en gramos o medidas caseras, sus calorías (kcal) y macronutrientes (proteínas, carbohidratos y grasas en gramos). Devuelve el resultado en español siguiendo exactamente el esquema JSON.`,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: mealAnalysisJsonSchema,
    },
  });

  const rawText = interaction.output_text;
  if (!rawText) {
    return estimateFoodFromTextLocally(cleanDescription, category);
  }

  const parsed = JSON.parse(rawText) as Partial<MealAnalysisResult>;
  const items: DetectedFoodItem[] = Array.isArray(parsed.items)
    ? parsed.items.map((item) => ({
        name: String(item.name || 'Alimento'),
        portion: String(item.portion || '1 porción'),
        calories: Math.max(0, Math.round(Number(item.calories) || 0)),
        protein: Math.max(0, Math.round(Number(item.protein) || 0)),
        carbs: Math.max(0, Math.round(Number(item.carbs) || 0)),
        fat: Math.max(0, Math.round(Number(item.fat) || 0)),
      }))
    : [];

  const recalculated =
    items.length > 0
      ? recalculateTotalsFromItems(items)
      : {
          totalCalories: Math.max(0, Math.round(Number(parsed.totalCalories) || 0)),
          protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
          carbs: Math.max(0, Math.round(Number(parsed.carbs) || 0)),
          fat: Math.max(0, Math.round(Number(parsed.fat) || 0)),
        };

  return {
    mealName: String(parsed.mealName || cleanDescription),
    totalCalories: recalculated.totalCalories,
    protein: recalculated.protein,
    carbs: recalculated.carbs,
    fat: recalculated.fat,
    items,
    aiTip: String(
      parsed.aiTip ||
        'Puedes ajustar cualquier ingrediente o porción antes de guardar.'
    ),
    isDemo: false,
  };
}

/**
 * Estima automáticamente un solo ingrediente agregado manualmente en la pantalla de revisión.
 */
export async function estimateSingleFoodItem(
  name: string,
  portion: string
): Promise<DetectedFoodItem> {
  const apiKey = loadGeminiApiKey();
  if (!apiKey) {
    return estimateSingleIngredientLocally(name, portion);
  }

  try {
    const result = await analyzeFoodDescription({
      description: `${portion} de ${name}`.trim(),
      category: 'comida',
    });
    if (result.items.length > 0) {
      return result.items[0];
    }
  } catch {
    // Fallback al motor local si falla la red o la API
  }
  return estimateSingleIngredientLocally(name, portion);
}
