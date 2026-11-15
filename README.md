# CalApp IA

Aplicación web progresiva (**PWA**) optimizada para teléfono móvil en español para llevar el control diario de calorías con **IA integrada**, cálculo automático de requerimientos diarios y evaluación de cumplimiento.

**App en vivo:** https://rattlesnakez.github.io/CalApp/

---

## Funcionalidades principales

- **Cámara integrada en vivo y escáner con IA:** Toma fotos directamente desde la app (WebRTC) o sube imágenes desde tu galería para detectar alimentos, porciones, calorías y macronutrientes con Google Gemini (`gemini-4-hydrogen`).
- **Recomendación de Platillos con IA (pestaña `Platillos`):** Sugiere 3 platillos listos para registrar en **Desayuno**, **Comida** o **Cena** con dos modos: *"Para mi meta de hoy"* (según tus calorías y macros restantes) y *"Con lo que tengo"* (armado con los ingredientes que ya tienes disponibles en casa), con ajuste rápido de porción (`0.5x`, `1x`, `1.5x`) y respaldo local sin API Key.
- **Modo Demo y cálculo manual automático:** Funciona incluso sin API Key gracias al Modo Demo editable y al motor nutricional local en español (`FOOD_DICTIONARY`) para entradas escritas a mano.
- **Guía integrada de API Key:** Tutorial paso a paso dentro de la app para obtener una API Key gratuita en Google AI Studio (`aistudio.google.com/apikey`).
- **Cálculo personal de calorías y macros:** Calcula tu tasa metabólica basal (Mifflin-St Jeor), gasto diario (TDEE), IMC, meta calórica según objetivo (*Perder grasa*, *Mantener peso* o *Ganar músculo*) y macros recomendados.
- **Desayuno, Comida y Cena editables con ajuste rápido de porciones:** Organización diaria por tiempo de comida con desglose frente a la meta sugerida, controles `-`/`+` y edición directa de porción por ingrediente con recálculo automático de calorías y macros, edición completa de platillos guardados y confirmación visual antes de eliminar.
- **Veredicto diario e historial:** Indica automáticamente si **Cumplió** (`90%–105%`), **No cumplió** (`< 90%`) o **Excedió** (`> 105%`) tus calorías requeridas y guarda el historial de los últimos 7 días en el dispositivo (`localStorage`).

---

## Stack tecnológico

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4
- Lucide React
- Google Gen AI SDK (`@google/genai`)

---

## Desarrollo local

```bash
npm install
npm run dev
```

Compilar y verificar tipos para producción:

```bash
npm run build
```

---

## Documentación técnica

Para conocer la arquitectura completa, reglas nutricionales, detalles de la integración con Gemini (`v1beta`) y decisiones de UX móvil, consulta [CONTEXT.md](./CONTEXT.md).
