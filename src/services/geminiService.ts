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
