# DreamWeaver AI

Premium dream visualization powered by **Grok Imagine**, with deep multi-section analysis.

## Flow

1. Write your dream  
2. Click **Rüyamı Görselleştir** / **Visualize my dream**  
3. **One** high-quality artistic image (Grok Imagine)  
4. Rich analysis below the image  

### Analysis

- Emotional Atmosphere  
- Key Symbols & Meanings  
- Psychological Interpretation  
- Hidden Messages  
- Personal Advice & Reflection Questions  

## Stack

- React + TypeScript (Vite)  
- Tailwind CSS v4  
- Framer Motion  
- **Grok Imagine** via `POST /api/imagine` (`XAI_API_KEY`)  
- Flux fallback (Pollinations) when no API key  

## Setup

```bash
npm install
cp .env.example .env
# Add: XAI_API_KEY=xai-...
npm run dev
```

Open http://localhost:5173

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Project layout

```
src/
  App.tsx
  components/
    AnalysisPanel.tsx
    LanguageSwitch.tsx
  lib/
    analyze.ts    # dream → prompt + 5-section report
    imagine.ts    # Grok Imagine + Flux fallback
    i18n.ts       # EN / TR
```
