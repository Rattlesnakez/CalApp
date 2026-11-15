# CONTEXT.md — CalApp IA

Documento de contexto técnico y funcional de **CalApp IA**, una aplicación web progresiva (PWA) móvil en español para contar calorías con análisis nutricional por fotografía, cálculo automático de comidas escritas manualmente y evaluación diaria de cumplimiento calórico.

---

## 1. Visión General y Enlaces

- **Repositorio GitHub:** https://github.com/Rattlesnakez/CalApp (rama principal: `main`, publicación estática en `gh-pages`)
- **App publicada (GitHub Pages):** https://rattlesnakez.github.io/CalApp/
- **Objetivo del producto:**
  1. Calcular las calorías y macronutrientes diarios requeridos a partir de los datos personales del usuario y su objetivo.
  2. Registrar alimentos en tres tiempos de comida: **Desayuno**, **Comida** y **Cena**.
  3. Detectar calorías y macros por **fotografía** (usando cámara integrada en la app o galería con Gemini Vision, más un Modo Demo sin costo) y mediante **entrada manual en texto** con estimación automática.
  4. Recomendar platillos con IA desde la pestaña **Platillos** (según calorías/macros restantes del día o según ingredientes disponibles en casa) con registro directo en 1 toque.
  5. Mostrar un **veredicto diario** claro indicando si el usuario **Cumplió**, **No cumplió** o **Excedió** sus calorías necesarias, junto con un historial semanal de 7 días.
  6. Guardar todo localmente en el dispositivo (`localStorage`) sin requerir backend ni cuentas externas.

---

## 2. Stack Tecnológico

Definido en `package.json` y `vite.config.ts`:

- **Framework UI:** React `^19.1.0` + TypeScript `~5.8.0` (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`)
- **Bundler:** Vite `^6.3.0` (`base: './'` en `vite.config.ts` para funcionar bajo subruta de GitHub Pages `/CalApp/`)
- **Estilos:** Tailwind CSS `^4.1.0` (`@tailwindcss/vite`)
- **Iconografía:** `lucide-react` `^0.511.0`
- **IA Generativa:** `@google/genai` `^3.2.0` (`GoogleGenAI` usando el endpoint `interactions.create` en versión `v1beta` con modelo `gemini-4-hydrogen`)
- **Persistencia:** `window.localStorage`

---

## 3. Arquitectura y Mapa de Archivos

```text
CalApp/
├── .github/workflows/deploy.yml   # Build automático (Node 22) y push de dist/ a rama gh-pages
├── public/
│   ├── manifest.json              # Configuración PWA móvil
│   ├── icon.svg                   # Ícono de la aplicación
│   └── .nojekyll                  # Evita procesamiento Jekyll en GitHub Pages
├── index.html                     # Entrada HTML con meta tags PWA / viewport móvil
├── vite.config.ts                 # Configuración Vite (base: './')
└── src/
    ├── main.tsx                   # Punto de montaje React
    ├── App.tsx                    # Estado raíz (perfil, entradas, fecha seleccionada, tab activo y modal)
    ├── index.css                  # Tailwind v4 + animación scanBeam + utilidades .pt-safe / .pb-safe
    ├── types.ts                   # Tipos TypeScript de perfil, comidas, análisis IA y evaluación diaria
    ├── vite-env.d.ts              # Declaraciones Vite client (ImportMeta.env)
    ├── utils/
    │   ├── nutrition.ts           # Fórmulas Mifflin-St Jeor, TDEE, IMC, macros, evaluateDailyStatus, fechas y parseo/escalado de porciones
    │   └── storage.ts             # Persistencia localStorage con compactación ante límite de cuota
    ├── services/
    │   └── geminiService.ts       # Cliente Gemini v1beta, compresión de fotos, FOOD_DICTIONARY y sugerencias de platillos
    └── components/
        ├── BottomNav.tsx              # Barra inferior fija (Hoy, Platillos, Foto IA, Historial, Mi Perfil)
        ├── DailyDashboardView.tsx     # Tab "Hoy": header/fecha unificados, anillo calórico, veredicto, macros y 3 comidas (con editar/eliminar)
        ├── MealSuggestionsView.tsx    # Tab "Platillos": recomendaciones IA/locales por meta restante o ingredientes disponibles
        ├── PhotoScannerModal.tsx      # Modal de registro y edición: cámara WebRTC, galería, texto manual y revisión editable
        ├── DeleteMealConfirmModal.tsx # Diálogo de confirmación en español antes de eliminar un platillo registrado
        ├── OnboardingOrProfileView.tsx # Registro inicial y pestaña "Mi Perfil" (incluye configuración de API Key)
        ├── HistoryView.tsx            # Tab "Historial": resumen de 7 días, gráfica de barras y detalle por día (con editar/eliminar)
        └── ApiKeyTutorialBox.tsx      # Guía en 3 pasos para obtener una API Key gratis en Google AI Studio
```

### Detalle rápido de componentes clave

- **`src/App.tsx`**: si `!profile.onboardingCompleted`, muestra `OnboardingOrProfileView` con `isInitialOnboarding={true}` sin la barra inferior. Una vez completado el registro inicial, muestra el flujo principal con `BottomNav` y las pestañas `hoy`, `platillos`, `historial` y `perfil`. Gestiona `editingEntry` para reabrir `PhotoScannerModal` precargado al editar un `MealEntry` (`handleUpdateMeal`) preservando su `id`, `date`, `timestamp` y `photoDataUrl`. El botón central `Foto IA` selecciona automáticamente la categoría sugerida según la hora (`<12` Desayuno, `12–17` Comida, `>=18` Cena).
- **`src/components/DailyDashboardView.tsx`**: interfaz simplificada con cabecera y selector de fecha (`< Hoy >`) en una sola fila; una única tarjeta principal con anillo de progreso, mensaje directo (`Faltan ... kcal` / `¡Meta cumplida!` / `+... kcal sobre tu meta`), franja compacta de veredicto (`data-testid="daily-verdict-banner"`) y barras de macros; y secciones limpias de **Desayuno**, **Comida** y **Cena** con botón `+ Agregar`, botón **Editar** (`Pencil`) y botón **Eliminar** (`Trash2` con confirmación previa vía `DeleteMealConfirmModal`).
- **`src/components/HistoryView.tsx`**: resumen de 7 días, gráfica de barras y detalle por día donde también se pueden **editar** (`Pencil`) o **eliminar** (`Trash2` con `DeleteMealConfirmModal`) comidas ya registradas.
- **`src/components/MealSuggestionsView.tsx`**: pestaña **Platillos** con dos modos: **Para mi meta de hoy** (calcula calorías y macros restantes según la hora o tiempo de comida elegido) y **Con lo que tengo** (chips/input de ingredientes disponibles, filtro opcional de comida y ajuste opcional a calorías restantes). Incluye selector de porción (`0.5x`, `1x`, `1.5x`) que actualiza calorías, macros e ingredientes en vivo antes de guardar como `MealEntry` en el día seleccionado.
- **`src/components/PhotoScannerModal.tsx`**: pasos `choose` -> (`camera` | `manual_input`) -> `analyzing` -> `review`. Tanto al registrar como al editar (`editingEntry` + `onUpdateMeal`), mantiene una referencia inmutable `baseAnalysis` (`1x`), un selector táctil de **Tamaño de porción del platillo** (`0.5x`, `0.75x`, `1x`, `1.5x`, `2x` y stepper `±0.25x`), controles intuitivos por ingrediente (`-`/`+` según unidad `±25` g/ml o `±0.5`, chips `½`, `1`, `1.5`, `2`, cambio de unidad con recálculo vía `estimateSingleFoodItem`), recálculo automático de totales y macros individuales ocultos bajo **"Ajustar macros manualmente"** para mantener limpia la UI móvil.
- **`src/components/DeleteMealConfirmModal.tsx`**: modal en español (en lugar de `window.confirm()`) que muestra el nombre del platillo, su categoría y calorías antes de confirmar **Eliminar** o **Cancelar**.
- **`src/components/OnboardingOrProfileView.tsx`**: durante `isInitialOnboarding` oculta la tarjeta de cálculo calórico (`Calorías diarias requeridas` / IMC / macros) y muestra los campos de datos personales limpios usando `placeholder` para no obligar a borrar ejemplos previos. En `Mi Perfil` sí muestra la tarjeta resumen y permite editar o fijar una meta manual (`customCalorieTarget`).

---

## 4. Reglas de Negocio y Fórmulas (`src/utils/nutrition.ts`)

### Cálculo de calorías requeridas y macros
- **TMB (Mifflin-St Jeor, `calculateBMR`):**
  - Hombre: `10 * pesoKg + 6.25 * alturaCm - 5 * edad + 5`
  - Mujer: `10 * pesoKg + 6.25 * alturaCm - 5 * edad - 161`
- **TDEE (`calculateTDEE`):** `TMB * factorActividad`
  - `sedentary`: `1.2`, `light`: `1.375`, `moderate`: `1.55`, `active`: `1.725`, `very_active`: `1.9`
- **Meta diaria (`calculateCalorieTarget`):**
  - Si existe `customCalorieTarget >= 800`, usa ese valor manual.
  - `lose` (Perder grasa / Déficit): `max(1200, TDEE - 500)`
  - `maintain` (Mantener peso / Equilibrio): `TDEE`
  - `gain` (Ganar músculo / Superávit): `TDEE + 350`
- **Reparto por comida (`MEAL_CATEGORY_META`):**
  - **Desayuno:** `30%` (`0.3`)
  - **Comida:** `40%` (`0.4`)
  - **Cena:** `30%` (`0.3`)
- **Macronutrientes (`calculateMacroTargets`):**
  - `lose`: `32%` proteína, `38%` carbos, `30%` grasa
  - `maintain`: `28%` proteína, `44%` carbos, `28%` grasa
  - `gain`: `28%` proteína, `47%` carbos, `25%` grasa
  - Conversión a gramos: proteína y carbos `kcal / 4`, grasa `kcal / 9`.

### Veredicto diario (`evaluateDailyStatus`)
Evalúa las calorías consumidas frente a `targetCalories`:
- **Rango ideal:** entre `90%` (`minIdeal`) y `105%` (`maxIdeal`) de la meta diaria.
- **`no_cumplio` (`No cumplió`):** `< 90%` de la meta.
- **`cumplio` (`Cumplió`):** entre `90%` y `105%` inclusive.
- **`excedio` (`Excedió`):** `> 105%` de la meta.

---

## 5. Integración de IA, Cámara y Persistencia

### Google Gemini API (`src/services/geminiService.ts`)
- **Modelo usado:** `gemini-4-hydrogen`.
- **Importante — Versión `v1beta`:** `analyzeFoodPhoto`, `analyzeFoodDescription` y `generateMealSuggestions` instancian `new GoogleGenAI({ apiKey, apiVersion: 'v1beta' })` y pasan `api_version: 'v1beta'` en `ai.interactions.create(...)`. La versión por defecto (`v1`) del SDK `@google/genai` rechaza entradas de imagen (`{ type: 'image', data, mime_type }`) con error `400`.
- **Salida estructurada:** Se solicita JSON validado con `mealAnalysisJsonSchema` (`mealName`, `totalCalories`, `protein`, `carbs`, `fat`, `aiTip`, `items[]`) y `mealSuggestionsJsonSchema` (`suggestions[]` para 3 platillos recomendados), recalculando totales con `recalculateTotalsFromItems` cuando hay ingredientes detectados.
- **Modo Demo y cálculo manual sin API Key:**
  - Si no hay API Key configurada, `analyzeFoodPhoto` usa `DEMO_MEAL_TEMPLATES` editables, `analyzeFoodDescription` / `estimateSingleFoodItem` usan `estimateFoodFromTextLocally` apoyado en `FOOD_DICTIONARY` (tabla local de alimentos frecuentes en español con detección de gramos/mililitros, fracciones y unidades) y `generateMealSuggestions` utiliza el catálogo y motor local `suggestMealsLocally`.
  - La API Key del usuario se obtiene con el tutorial de `ApiKeyTutorialBox` (`https://aistudio.google.com/apikey`) y se guarda localmente en `localStorage` bajo `calapp_gemini_api_key` (con fallback a `VITE_GEMINI_API_KEY`).

### Cámara integrada en vivo (`src/components/PhotoScannerModal.tsx`)
- **WebRTC (`getUserMedia`):** Al tocar **Tomar Foto**, abre `step === 'camera'` dentro del mismo modal usando `navigator.mediaDevices.getUserMedia` con `<video autoPlay playsInline muted>`.
- Permite alternar entre cámara trasera (`environment`) y frontal (`user`), encuadrar el platillo con guías visuales y capturar en `<canvas>` (lado máximo `1024px`, JPEG calidad `0.82`).
- Detiene todos los `MediaStreamTrack` (`stopCameraStream`) al capturar, volver atrás o cerrar el modal.
- Si el navegador bloquea permisos o no soporta `getUserMedia`, muestra el botón de respaldo conectado al input nativo `<input type="file" accept="image/*" capture="environment">`.
- Subir fotos desde galería usa `compressImageToDataUrl` (máximo `800px` de ancho, JPEG `0.78`).

### Recomendación de Platillos con IA (`src/components/MealSuggestionsView.tsx` y `src/services/geminiService.ts`)
- **Tipos en `src/types.ts`:** `AppTab` (`'hoy' | 'platillos' | 'historial' | 'perfil'`), `SuggestionMode` (`'goal' | 'pantry'`), `PantryCategoryFilter` (`'any' | MealCategory`), `SuggestedMeal` y `MealSuggestionRequest`.
- **Modo `"Para mi meta de hoy"` (`goal`):**
  - Calcula en tiempo real `remainingCalories` (`targetCalories - consumed.calories`) y `remainingMacros` (proteína, carbos y grasas restantes del día seleccionado).
  - Detecta automáticamente el tiempo de comida según la hora del dispositivo (`<12` Desayuno, `12–17` Comida, `>=18` Cena) y permite cambiar entre `Desayuno`, `Comida` y `Cena` o generar nuevas opciones.
  - Adapta porciones y selección al objetivo del usuario (`lose`, `maintain`, `gain`).
- **Modo `"Con lo que tengo"` (`pantry`):**
  - Input de ingredientes con soporte de comas, tecla `Enter` / botón `+`, chips removibles, botón `Limpiar` y etiquetas rápidas (`QUICK_INGREDIENTS`: Huevo, Pollo, Atún, Arroz, Aguacate, Avena, Tortillas, Queso panela).
  - Incluye filtro opcional de tiempo de comida (`Cualquiera`, `Desayuno`, `Comida`, `Cena`) y toggle `adjustToRemainingCalories` para escalar porciones al presupuesto calórico restante.
  - Destaca en cada tarjeta los ingredientes aprovechados (`matchedIngredients`) y los básicos extra sugeridos (`extraIngredients`).
- **Generación IA y respaldo sin API Key:**
  - `generateMealSuggestions` llama a `gemini-4-hydrogen` (`apiVersion: 'v1beta'` / `api_version: 'v1beta'`) con `mealSuggestionsJsonSchema`.
  - Si no existe `calapp_gemini_api_key` o falla la red, usa `suggestMealsLocally`: filtra y escala `LOCAL_SUGGESTED_MEALS` y, cuando faltan coincidencias en modo `pantry`, construye combinaciones dinámicas con `buildDynamicPantryMeal` apoyándose en `estimateSingleIngredientLocally`.
- **Registro directo con ajuste de porción:** Cada tarjeta permite seleccionar `0.5x`, `1x` o `1.5x` escalando calorías, macros e ingredientes (`scaleIngredientLine`) en tiempo real; al tocar `+ Registrar en [Desayuno/Comida/Cena]`, `buildItemsFromSuggestion` y `splitIngredientLineToPortionAndName` generan un `MealEntry` con porciones parseables y lo guardan vía `onSaveMeal` en `localStorage` (`calapp_meal_entries_v1`).

### Almacenamiento local (`src/utils/storage.ts`)
- Claves en `localStorage`:
  - `calapp_user_profile_v1`: perfil `UserProfile` (`onboardingCompleted: false` por defecto).
  - `calapp_meal_entries_v1`: arreglo de `MealEntry`. Si se alcanza la cuota del navegador por almacenar muchas imágenes en DataURL, `saveMealEntries` recorta `photoDataUrl` de las entradas más antiguas automáticamente.
  - `calapp_gemini_api_key`: clave personal de Google AI Studio.

---

## 6. Decisiones de UX Móvil Importantes

- **Safe area superior e inferior (`src/index.css`):** `.pt-safe` aplica `padding-top: max(3.5rem, calc(env(safe-area-inset-top, 0px) + 0.85rem))` en pantallas `<= 640px` para evitar que el notch o la barra de estado de iPhone se sobrepongan al encabezado; `.pb-safe` respeta el indicador inferior en `BottomNav.tsx`, `PhotoScannerModal.tsx` y `DeleteMealConfirmModal.tsx`. Los modales limitan su altura con `max-h-[86dvh]`.
- **Inputs sin `0` bloqueado ni ejemplos forzados (`OnboardingOrProfileView.tsx` y `PhotoScannerModal.tsx`):**
  - Los campos de **Nombre**, **Edad**, **Peso** y **Altura** mantienen estado `string` en el formulario y arrancan vacíos en el registro inicial (`isInitialOnboarding`), mostrando solo `placeholder` (`Ej. Carlos`, `Ej. 25`, `Ej. 70`, `Ej. 170`).
  - Los inputs numéricos no convierten cadenas vacías a `Number("") -> 0` mientras se edita (`itemDrafts` en `PhotoScannerModal.tsx`), permitiendo borrar por completo cantidades de porción, calorías, macros o pesos sin que quede un `0` atascado (`inputMode="decimal"` y `step="any"` en peso, cantidades de ingredientes, calorías y macros; `inputMode="numeric"` en edad, altura y meta manual).

---

## 7. Comandos y Despliegue

```bash
npm install      # Instalar dependencias
npm run dev      # Servidor local de desarrollo Vite
npm run build    # Verificación TypeScript (tsc -b) + build de producción en dist/
npm run preview  # Vista previa local del build de producción
```

- **Despliegue continuo:** El workflow `.github/workflows/deploy.yml` se ejecuta automáticamente en cada push a `main`, corre `npm ci` + `npm run build` con Node `22` y publica el contenido de `dist/` en la rama `gh-pages`.
- **Nota operativa:** Evitar hacer `git push` manual directo a `gh-pages` inmediatamente después de empujar a `main`, ya que `deploy.yml` ya publica en `gh-pages` y dos ejecuciones simultáneas pueden quedar en cola en GitHub Pages.

---

## 8. Historial de Cambios Recientes (Changelog)

> **Regla de mantenimiento:** Actualizar `CONTEXT.md` (y `README.md` si cambian funcionalidades visibles) después de cada cambio relevante en la aplicación.

- **Ajuste intuitivo de porciones (`nutrition.ts`, `PhotoScannerModal.tsx`, `MealSuggestionsView.tsx`):** Se añadieron utilidades de parseo y escalado (`parsePortionText`, `extractItemPortionBase`, `scaleFoodItemByQuantity`, `scaleAnalysisByMultiplier`, `scaleIngredientLine`, `splitIngredientLineToPortionAndName`), referencia base `1x` inmutable en `review` con multiplicador de platillo (`0.5x`–`2x` y stepper `±0.25x`), controles `-`/`+` y chips `½/1/1.5/2` por ingrediente con recálculo automático (y vía `estimateSingleFoodItem` al cambiar de unidad), panel colapsable **"Ajustar macros manualmente"** y selector `0.5x/1x/1.5x` en las tarjetas de `Platillos`.
- **`2bd90ed` — Confirmación antes de eliminar y edición completa de comidas:** Se añadió `DeleteMealConfirmModal.tsx` para confirmar en español antes de eliminar cualquier platillo en `Hoy` (`DailyDashboardView.tsx`) e `Historial` (`HistoryView.tsx`), y se habilitó la edición completa de comidas guardadas (`mealName`, categoría, ingredientes/porciones/kcal/P-C-G y totales directos) reutilizando `PhotoScannerModal.tsx` con `editingEntry` e inputs numéricos sin `0` bloqueado (`itemDrafts`).
- **`a28ec87` — Actualización de `CONTEXT.md` y `README.md`:** Se documentó la pestaña `Platillos` y la arquitectura de recomendaciones en `CONTEXT.md` y `README.md`.
- **`18da971` — Pestaña `Platillos` (Recomendación de Platillos con IA):** Se añadió `MealSuggestionsView.tsx`, barra inferior de 5 botones (`Hoy`, `Platillos`, `Foto IA`, `Historial`, `Mi Perfil`), modos *"Para mi meta de hoy"* y *"Con lo que tengo"*, `generateMealSuggestions` (`gemini-4-hydrogen`, `v1beta`) y respaldo local `suggestMealsLocally`.
- **`ee230cc` — Documentación inicial:** Se crearon `CONTEXT.md` y `README.md` en la raíz del proyecto.
- **`adc0814` — Simplificación visual:** Se redujo la saturación en `DailyDashboardView.tsx`, `PhotoScannerModal.tsx` y `OnboardingOrProfileView.tsx` (header + fecha en 1 fila, tarjeta unificada, eliminación de botones duplicados y de la cuadrícula demo del modal).
- **`e857209` — Cámara integrada en vivo:** Se integró WebRTC (`getUserMedia` + `<canvas>`) dentro de `PhotoScannerModal.tsx` con cambio de cámara frontal/trasera y respaldo nativo.
- **`82fe2a3` — Onboarding limpio:** Se ocultó la tarjeta de cálculo calórico durante el registro inicial y se hicieron requeridos edad, peso y altura.
- **`7c0562e` — Placeholders e inputs numéricos:** Los campos iniciales arrancan vacíos con `placeholder` y los inputs numéricos permiten borrar todo sin dejar un `0` bloqueado.
- **`7c535d9` — Fix Gemini Vision `v1beta`:** Se fijó `apiVersion: 'v1beta'` y `api_version: 'v1beta'` en `geminiService.ts` para evitar el error `400` al enviar imágenes.
- **`255f9aa` — Safe area iOS:** Se agregó `.pt-safe` en `index.css` para evitar el solapamiento de la barra de estado de iPhone.
- **`e5434c5` — Tutorial API Key y entrada manual automática:** Se añadió `ApiKeyTutorialBox.tsx` y cálculo automático de comidas escritas manualmente (`FOOD_DICTIONARY` + Gemini).
- **`8bc94f7` — Lanzamiento inicial:** Base PWA de CalApp IA con Desayuno/Comida/Cena, Mifflin-St Jeor, veredicto diario e historial de 7 días.
