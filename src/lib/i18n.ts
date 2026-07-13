import type { Lang } from '../types/dream'

export type UiCopy = {
  brand: string
  tagline: string
  eyebrow: string
  heroTitle: string
  heroItalic: string
  heroSub: string
  inputLabel: string
  placeholder: string
  cta: string
  ctaLoading: string
  loadingTitle: string
  loadingSub: string
  newDream: string
  again: string
  analysisTitle: string
  imageCaption: string
  sections: {
    emotional: string
    symbols: string
    psychology: string
    hidden: string
    advice: string
    themes: string
  }
  questionsLabel: string
  errorGeneric: string
  errorNetwork: string
  noKeyHint: string
  footer: string
  charEmpty: string
  charMore: string
  charReady: string
  examples: readonly string[]
}

const en: UiCopy = {
  brand: 'DreamViewer',
  tagline: 'Grok Imagine · Dream art',
  eyebrow: 'From night to canvas',
  heroTitle: 'Tell the dream.',
  heroItalic: 'We paint its truth.',
  heroSub:
    'Write what you saw. One museum-quality image appears, then a deep psychological reading unfolds beneath it.',
  inputLabel: 'Your dream',
  placeholder:
    'I was fighting lions on a golden plain while the sky burned soft peach and violet…',
  cta: 'Visualize my dream',
  ctaLoading: 'Weaving with Grok Imagine…',
  loadingTitle: 'Painting the night…',
  loadingSub: 'Image · symbols · meaning',
  newDream: 'New dream',
  again: 'Generate again',
  analysisTitle: 'Dream analysis',
  imageCaption: 'Artistic still',
  sections: {
    emotional: 'Emotional Atmosphere',
    symbols: 'Key Symbols & Meanings',
    psychology: 'Psychological Interpretation',
    hidden: 'Hidden Messages',
    advice: 'Personal Advice & Reflection Questions',
    themes: 'Thematic Connections',
  },
  questionsLabel: 'Reflection questions',
  errorGeneric: 'Something went wrong while weaving. Please try again.',
  errorNetwork: 'Network error. Check your connection and try again.',
  noKeyHint: 'Add XAI_API_KEY in .env for Grok Imagine (Flux is used as fallback).',
  footer: 'DreamViewer AI · for reflection, not clinical diagnosis',
  charEmpty: 'A few sentences is enough',
  charMore: 'A little more detail…',
  charReady: 'characters · ready',
  examples: [
    'I was fighting lions on a golden plain while the sky burned soft peach and violet…',
    'I floated over a pink ocean while paper birds whispered my name…',
    'In my childhood home a glowing door opened onto a starlit forest…',
  ],
}

const tr: UiCopy = {
  brand: 'DreamViewer',
  tagline: 'Grok Imagine · Rüya sanatı',
  eyebrow: 'Geceden tuvale',
  heroTitle: 'Rüyanı anlat.',
  heroItalic: 'Biz hakikatini boyayalım.',
  heroSub:
    'Gördüğünü yaz. Tek, müzeye yakışır bir görsel oluşur; altında derin bir psikolojik okuma açılır.',
  inputLabel: 'Rüyan',
  placeholder:
    'Altın bir ovada aslanlarla savaşıyordum; gökyüzü şeftali ve mor yanıyordu…',
  cta: 'Rüyamı Görselleştir',
  ctaLoading: 'Grok Imagine ile örülüyor…',
  loadingTitle: 'Gece boyanıyor…',
  loadingSub: 'Görsel · sembol · anlam',
  newDream: 'Yeni rüya',
  again: 'Yeniden üret',
  analysisTitle: 'Rüya analizi',
  imageCaption: 'Sanatsal kare',
  sections: {
    emotional: 'Duygusal Atmosfer',
    symbols: 'Ana Semboller ve Anlamları',
    psychology: 'Psikolojik Yorum',
    hidden: 'Gizli Mesajlar',
    advice: 'Kişisel Tavsiye ve Yansıma Soruları',
    themes: 'Tematik Bağlantılar',
  },
  questionsLabel: 'Yansıma soruları',
  errorGeneric: 'Örme sırasında bir sorun oluştu. Lütfen tekrar dene.',
  errorNetwork: 'Ağ hatası. Bağlantını kontrol edip tekrar dene.',
  noKeyHint: 'Grok Imagine için .env içine XAI_API_KEY ekle (yoksa Flux yedek kullanılır).',
  footer: 'DreamViewer AI · yansıma içindir, klinik tanı değildir',
  charEmpty: 'Birkaç cümle yeter',
  charMore: 'Biraz daha detay…',
  charReady: 'karakter · hazır',
  examples: [
    'Altın bir ovada aslanlarla savaşıyordum; gökyüzü şeftali ve mor yanıyordu…',
    'Pembe bir okyanusun üzerinde süzülüyordum, kâğıt kuşlar ismimi fısıldıyordu…',
    'Çocukluğumun evinde parlayan bir kapı açıldı; ardında yıldızlı bir orman vardı…',
  ],
}

export const ui: Record<Lang, UiCopy> = { en, tr }

export function detectDefaultLang(): Lang {
  try {
    const saved = localStorage.getItem('dw-lang')
    if (saved === 'en' || saved === 'tr') return saved
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('tr')) {
    return 'tr'
  }
  return 'en'
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem('dw-lang', lang)
  } catch {
    /* ignore */
  }
}
