export type Lang = 'en' | 'tr'

export const ui = {
  en: {
    brand: 'DreamWeaver',
    tagline: 'Grok Imagine · Dream art',
    eyebrow: 'From night to canvas',
    heroTitle: 'Tell the dream.',
    heroItalic: 'We paint its truth.',
    heroSub:
      'Write what you saw. Grok Imagine creates one museum-quality image, then a deep reading unfolds beneath it.',
    placeholder:
      'I was fighting lions on a golden plain while the sky burned soft peach and violet…',
    cta: 'Visualize my dream',
    ctaLoading: 'Weaving with Grok Imagine…',
    loadingTitle: 'Painting the night…',
    loadingSub: 'Image · symbols · meaning',
    newDream: 'New dream',
    again: 'Generate again',
    analysisTitle: 'Dream analysis',
    imageCaption: 'Artistic still · Grok Imagine',
    sections: {
      emotional: 'Emotional Atmosphere',
      symbols: 'Key Symbols & Meanings',
      psychology: 'Psychological Interpretation',
      hidden: 'Hidden Messages',
      advice: 'Personal Advice & Reflection Questions',
    },
    questionsLabel: 'Reflection questions',
    error: 'Something went wrong. Please try again.',
    noKeyHint: 'Tip: add XAI_API_KEY for Grok Imagine (Flux fallback is used without a key).',
    footer: 'DreamWeaver AI · for reflection, not clinical diagnosis',
    charEmpty: 'A few sentences is enough',
    charMore: 'A little more detail…',
    charReady: 'characters · ready',
    examples: [
      'I was fighting lions on a golden plain while the sky burned soft peach and violet…',
      'I floated over a pink ocean while paper birds whispered my name…',
      'In my childhood home a glowing door opened onto a starlit forest…',
    ],
  },
  tr: {
    brand: 'DreamWeaver',
    tagline: 'Grok Imagine · Rüya sanatı',
    eyebrow: 'Geceden tuvale',
    heroTitle: 'Rüyanı anlat.',
    heroItalic: 'Biz hakikatini boyayalım.',
    heroSub:
      'Gördüğünü yaz. Grok Imagine tek, müzeye yakışır bir görsel üretir; altında derin bir okuma açılır.',
    placeholder:
      'Altın bir ovada aslanlarla savaşıyordum; gökyüzü şeftali ve mor yanıyordu…',
    cta: 'Rüyamı Görselleştir',
    ctaLoading: 'Grok Imagine ile örülüyor…',
    loadingTitle: 'Gece boyanıyor…',
    loadingSub: 'Görsel · sembol · anlam',
    newDream: 'Yeni rüya',
    again: 'Yeniden üret',
    analysisTitle: 'Rüya analizi',
    imageCaption: 'Sanatsal kare · Grok Imagine',
    sections: {
      emotional: 'Duygusal Atmosfer',
      symbols: 'Ana Semboller ve Anlamları',
      psychology: 'Psikolojik Yorum',
      hidden: 'Gizli Mesajlar',
      advice: 'Kişisel Tavsiye ve Yansıma Soruları',
    },
    questionsLabel: 'Yansıma soruları',
    error: 'Bir sorun oluştu. Lütfen tekrar dene.',
    noKeyHint: 'İpucu: Grok Imagine için XAI_API_KEY ekle (yoksa Flux yedek kullanılır).',
    footer: 'DreamWeaver AI · yansıma içindir, klinik tanı değildir',
    charEmpty: 'Birkaç cümle yeter',
    charMore: 'Biraz daha detay…',
    charReady: 'karakter · hazır',
    examples: [
      'Altın bir ovada aslanlarla savaşıyordum; gökyüzü şeftali ve mor yanıyordu…',
      'Pembe bir okyanusun üzerinde süzülüyordum, kâğıt kuşlar ismimi fısıldıyordu…',
      'Çocukluğumun evinde parlayan bir kapı açıldı; ardında yıldızlı bir orman vardı…',
    ],
  },
} as const

export type UiCopy = {
  brand: string
  tagline: string
  eyebrow: string
  heroTitle: string
  heroItalic: string
  heroSub: string
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
  }
  questionsLabel: string
  error: string
  noKeyHint: string
  footer: string
  charEmpty: string
  charMore: string
  charReady: string
  examples: readonly string[]
}
