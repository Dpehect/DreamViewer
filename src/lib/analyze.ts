/**
 * Dream text → detailed Grok Imagine prompt + 5-section analysis (EN/TR)
 */

import type { Lang } from './i18n'

export type SymbolReading = { name: string; meaning: string }

export type DreamReport = {
  seed: number
  title: string
  mood: string
  tags: string[]
  imagePrompt: string
  emotionalAtmosphere: string
  symbols: SymbolReading[]
  psychology: string
  hiddenMessages: string
  advice: string
  reflectionQuestions: string[]
}

type Scored<T> = T & { score: number }

/* ── Lexicons ────────────────────────────────────────────── */

const EMOTIONS = [
  { keys: ['kork', 'fear', 'scared', 'terrif', 'kâbus', 'kabus', 'nightmare', 'panik'], id: 'fear', en: 'vigilant tension', tr: 'uyanık gerilim', w: 4 },
  { keys: ['savaş', 'dövüş', 'kavga', 'fight', 'battle', 'struggle', 'mücadele'], id: 'conflict', en: 'fierce confrontation', tr: 'şiddetli yüzleşme', w: 5 },
  { keys: ['cesaret', 'güç', 'brave', 'courage', 'power', 'strong', 'zafer', 'victory'], id: 'courage', en: 'courageous force', tr: 'cesur güç', w: 4 },
  { keys: ['üzgün', 'hüzün', 'ağla', 'sad', 'cry', 'melanchol', 'yalnız', 'alone'], id: 'sadness', en: 'melancholy', tr: 'hüzün', w: 3 },
  { keys: ['mutlu', 'neşe', 'happy', 'joy', 'gül'], id: 'joy', en: 'radiant joy', tr: 'neşe', w: 3 },
  { keys: ['aşk', 'sevgi', 'love', 'kalp', 'heart', 'öp', 'sarıl'], id: 'love', en: 'deep tenderness', tr: 'şefkat', w: 3 },
  { keys: ['huzur', 'sakin', 'calm', 'peace', 'dingin'], id: 'calm', en: 'serenity', tr: 'huzur', w: 3 },
  { keys: ['uç', 'uçmak', 'fly', 'süzül', 'özgür', 'freedom'], id: 'freedom', en: 'liberation', tr: 'özgürlük', w: 3 },
  { keys: ['kaç', 'koş', 'run', 'chase', 'takip'], id: 'urgency', en: 'urgency', tr: 'aciliyet', w: 3 },
  { keys: ['öfke', 'kızgın', 'angry', 'rage'], id: 'anger', en: 'raw anger', tr: 'öfke', w: 4 },
  { keys: ['nostalji', 'çocuk', 'childhood', 'anı', 'geçmiş', 'eski'], id: 'nostalgia', en: 'nostalgia', tr: 'nostalji', w: 2 },
] as const

const PLACES = [
  { keys: ['orman', 'forest', 'ağaç', 'tree'], id: 'forest', en: 'forest', tr: 'orman', scene: 'ancient atmospheric forest, mist between tall trees, mossy ground' },
  { keys: ['deniz', 'ocean', 'sea', 'okyanus'], id: 'sea', en: 'sea', tr: 'deniz', scene: 'cinematic seascape with luminous waves and endless horizon' },
  { keys: ['gökyüzü', 'sky', 'bulut', 'cloud'], id: 'sky', en: 'sky', tr: 'gökyüzü', scene: 'infinite sky among sculpted pastel clouds' },
  { keys: ['ev', 'house', 'home', 'oda', 'room'], id: 'house', en: 'home', tr: 'ev', scene: 'liminal childhood house with warm strange interior light' },
  { keys: ['şehir', 'city', 'cadde'], id: 'city', en: 'city', tr: 'şehir', scene: 'hushed dream-city, empty streets, soft haze' },
  { keys: ['bahçe', 'garden', 'çiçek'], id: 'garden', en: 'garden', tr: 'bahçe', scene: 'secret garden blooming in dusk light' },
  { keys: ['çöl', 'desert', 'savan', 'savanna', 'ova', 'plain'], id: 'savanna', en: 'plain', tr: 'ova', scene: 'golden-peach open plain under a vast emotional sky' },
  { keys: ['dağ', 'mountain'], id: 'mountain', en: 'mountains', tr: 'dağlar', scene: 'dramatic mountain ridges fading into pastel mist' },
  { keys: ['uzay', 'space', 'yıldız', 'star'], id: 'cosmos', en: 'cosmos', tr: 'kozmos', scene: 'soft cosmic expanse of stars and nebulae' },
] as const

const CREATURES = [
  { keys: ['aslan', 'lion', 'aslanlar', 'lions'], id: 'lion', en: 'lion', tr: 'aslan', visual: 'majestic lions, powerful realistic anatomy, golden-rose fur in cinematic light, fierce yet noble' },
  { keys: ['kaplan', 'tiger'], id: 'tiger', en: 'tiger', tr: 'kaplan', visual: 'powerful tiger with painterly stripes and regal eyes' },
  { keys: ['kurt', 'wolf'], id: 'wolf', en: 'wolf', tr: 'kurt', visual: 'wolves with silver-dust fur and intelligent eyes' },
  { keys: ['yılan', 'snake'], id: 'snake', en: 'serpent', tr: 'yılan', visual: 'luminous serpent with iridescent pastel scales' },
  { keys: ['kedi', 'cat'], id: 'cat', en: 'cat', tr: 'kedi', visual: 'silver soft-furred cat with luminous eyes' },
  { keys: ['kuş', 'bird'], id: 'bird', en: 'birds', tr: 'kuşlar', visual: 'birds as soft messengers in the sky' },
  { keys: ['at', 'horse'], id: 'horse', en: 'horse', tr: 'at', visual: 'pale powerful horses, manes flowing like light' },
  { keys: ['canavar', 'monster', 'beast'], id: 'beast', en: 'beast', tr: 'canavar', visual: 'symbolic powerful beast form, elegant not gory' },
] as const

const OBJECTS = [
  { keys: ['kapı', 'door', 'geçit', 'gate'], id: 'door', en: 'Door', tr: 'Kapı', visual: 'a luminous monumental doorway' },
  { keys: ['ayna', 'mirror'], id: 'mirror', en: 'Mirror', tr: 'Ayna', visual: 'freestanding mirror reflecting another light' },
  { keys: ['kılıç', 'sword', 'silah', 'weapon'], id: 'weapon', en: 'Weapon', tr: 'Silah', visual: 'symbolic weapon catching soft dramatic light, no gore' },
  { keys: ['su', 'water', 'yağmur', 'rain', 'dalga'], id: 'water', en: 'Water', tr: 'Su', visual: 'water as waves, rain, or reflective pools' },
  { keys: ['ateş', 'fire', 'alev'], id: 'fire', en: 'Fire', tr: 'Ateş', visual: 'painterly fire and ember light' },
  { keys: ['anahtar', 'key'], id: 'key', en: 'Key', tr: 'Anahtar', visual: 'ornate floating key' },
  { keys: ['ay', 'moon'], id: 'moon', en: 'Moon', tr: 'Ay', visual: 'large emotional moon near horizon' },
  { keys: ['köprü', 'bridge'], id: 'bridge', en: 'Bridge', tr: 'Köprü', visual: 'arched soft bridge as transition' },
] as const

const ACTIONS = [
  { keys: ['savaş', 'dövüş', 'fight', 'battle', 'struggle', 'mücadele'], id: 'fight', en: 'locked in a fierce struggle', drama: 0.95 },
  { keys: ['kaç', 'flee', 'escape'], id: 'flee', en: 'fleeing with urgent motion', drama: 0.75 },
  { keys: ['koş', 'run', 'koşuy'], id: 'run', en: 'running through the dream landscape', drama: 0.55 },
  { keys: ['uç', 'fly', 'süzül', 'uçuy'], id: 'fly', en: 'floating or flying through air', drama: 0.45 },
  { keys: ['yüz', 'swim'], id: 'swim', en: 'swimming through luminous water', drama: 0.35 },
  { keys: ['düş', 'fall'], id: 'fall', en: 'in a weightless fall', drama: 0.55 },
  { keys: ['koru', 'protect', 'savun'], id: 'protect', en: 'protecting someone or something', drama: 0.65 },
  { keys: ['bul', 'find', 'keşfet'], id: 'find', en: 'discovering a luminous place or object', drama: 0.3 },
] as const

const SYMBOL_TEXT: Record<string, { en: string; tr: string; meanEn: string; meanTr: string }> = {
  lion: {
    en: 'Lion',
    tr: 'Aslan',
    meanEn:
      'Instinctual power, sovereignty, and the raw Self. Fighting lions often means confronting your own strength, pride, anger, or a dominant force in waking life. The lion is both trial and teacher — power you must face without being consumed by it.',
    meanTr:
      'İçgüdüsel güç, egemenlik ve ham Benlik. Aslanlarla savaşmak çoğu zaman kendi gücünüzle, gururla, öfkeyle veya uyanık hayattaki baskın bir kuvvetle yüzleşmek demektir. Aslan hem imtihan hem öğretmendir — yok edilmeden yüzleşmeniz gereken güç.',
  },
  tiger: {
    en: 'Tiger',
    tr: 'Kaplan',
    meanEn: 'Passionate instinct and beauty fused with danger — desire that feels magnetic and risky.',
    meanTr: 'Tutkulu içgüdü ve güzelliğin tehlikeyle kaynaşması — manyetik ve riskli arzu.',
  },
  wolf: {
    en: 'Wolf',
    tr: 'Kurt',
    meanEn: 'Loyalty, tribe, and wild intelligence. Who is your true pack — and what will you not betray?',
    meanTr: 'Sadakat, kabile ve yabani zekâ. Gerçek sürünüz kim — neyi ihanet etmezsiniz?',
  },
  door: {
    en: 'Door / Threshold',
    tr: 'Kapı / Eşik',
    meanEn: 'A chapter change. A door marks readiness or resistance toward a decision already forming.',
    meanTr: 'Bölüm değişimi. Kapı, oluşmakta olan bir karara hazırlık veya direnci işaret eder.',
  },
  water: {
    en: 'Water',
    tr: 'Su',
    meanEn: 'Emotion in motion: calm = clarity; storm = overwhelm; rain = release.',
    meanTr: 'Hareket halindeki duygu: sakin = berraklık; fırtına = taşma; yağmur = salıverme.',
  },
  fire: {
    en: 'Fire',
    tr: 'Ateş',
    meanEn: 'Transformation, anger, creative heat — or burnout if uncontrolled.',
    meanTr: 'Dönüşüm, öfke, yaratıcı ısı — kontrolsüzse tükenmişlik.',
  },
  weapon: {
    en: 'Weapon',
    tr: 'Silah',
    meanEn: 'Agency and boundary — “I can act,” more than “I want harm.”',
    meanTr: 'Seçim gücü ve sınır — “zarar”dan çok “harekete geçebilirim.”',
  },
  fight: {
    en: 'Struggle / Combat',
    tr: 'Mücadele / Savaş',
    meanEn:
      'Active conflict work. Fighting in dreams often means a part of you still believes agency is possible — healthier than frozen helplessness.',
    meanTr:
      'Aktif çatışma çalışması. Rüyada savaşmak, bir yanınızın hâlâ seçim gücüne inandığını gösterir — donmuş çaresizlikten daha sağlıklıdır.',
  },
  flight: {
    en: 'Flight',
    tr: 'Uçmak',
    meanEn: 'Freedom and perspective — or escape, if fear dominates the tone.',
    meanTr: 'Özgürlük ve bakış açısı — ton korkuysa kaçış da olabilir.',
  },
  cat: {
    en: 'Cat',
    tr: 'Kedi',
    meanEn: 'Independent intuition — the self-possessed part that knows without forcing.',
    meanTr: 'Bağımsız sezgi — zorlamadan bilen, kendine hâkim yan.',
  },
  bird: {
    en: 'Birds',
    tr: 'Kuşlar',
    meanEn: 'Messages and spirit — news from a freer self.',
    meanTr: 'Mesaj ve ruh — daha özgür benlikten haber.',
  },
  moon: {
    en: 'Moon',
    tr: 'Ay',
    meanEn: 'Cycles and intuition — what logic cannot fully name.',
    meanTr: 'Döngüler ve sezgi — mantığın tam adlandıramadığı.',
  },
  mirror: {
    en: 'Mirror',
    tr: 'Ayna',
    meanEn: 'Honest self-recognition. Which face will you meet without flinching?',
    meanTr: 'Dürüst kendini tanıma. Hangi yüzle irkilmeden buluşacaksınız?',
  },
  key: {
    en: 'Key',
    tr: 'Anahtar',
    meanEn: 'Access and readiness — you may already hold what opens the next room.',
    meanTr: 'Erişim ve hazırlık — sonraki odayı açan şeye zaten sahip olabilirsiniz.',
  },
  dreamer: {
    en: 'The Dreamer (You)',
    tr: 'Rüyacı (Siz)',
    meanEn: 'Your witnessing and acting self. Fight, freeze, fly, or watch — that stance mirrors waking patterns.',
    meanTr: 'Tanıklık eden ve hareket eden benliğiniz. Savaş, don, uç veya izle — bu duruş uyanık örüntüleri yansıtır.',
  },
  shadow: {
    en: 'Shadow',
    tr: 'Gölge',
    meanEn: 'Disowned strength or truth. Darkness is often unintegrated power, not moral failure.',
    meanTr: 'Sahipsiz güç veya hakikat. Karanlık çoğu zaman ahlaki kusur değil, entegre edilmemiş kuvvettir.',
  },
  forest: {
    en: 'Forest',
    tr: 'Orman',
    meanEn: 'The living unconscious — growth, mystery, and initiation paths.',
    meanTr: 'Canlı bilinçaltı — büyüme, gizem ve inisiasyon yolları.',
  },
  house: {
    en: 'House',
    tr: 'Ev',
    meanEn: 'Architecture of identity and family psyche — rooms of memory and privacy.',
    meanTr: 'Kimlik ve aile psişesinin mimarisi — bellek ve mahremiyet odaları.',
  },
}

/* ── Utils ───────────────────────────────────────────────── */

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(arr: readonly T[], seed: number) {
  return arr[Math.abs(seed) % arr.length]
}

function L(lang: Lang, en: string, tr: string) {
  return lang === 'tr' ? tr : en
}

function score(lower: string, keys: readonly string[], w = 1) {
  let s = 0
  for (const k of keys) if (lower.includes(k)) s += w
  return s
}

function rank<T extends { keys: readonly string[]; w?: number }>(lower: string, list: readonly T[]): Scored<T>[] {
  return list
    .map((item) => ({ ...item, score: score(lower, item.keys, item.w ?? 1) }))
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
}

function phrases(text: string) {
  const stop = new Set(['bir', 've', 'the', 'and', 'was', 'ile', 'gibi', 'çok', 'sonra', 'ama', 'that', 'this'])
  const out: string[] = []
  for (const w of text.replace(/[.,;:!?…"""'']/g, ' ').split(/\s+/)) {
    if (w.length < 3 || stop.has(w.toLowerCase())) continue
    if (!out.some((x) => x.toLowerCase() === w.toLowerCase())) out.push(w)
    if (out.length >= 12) break
  }
  return out
}

/* ── Main ────────────────────────────────────────────────── */

export function analyzeDream(dreamText: string, lang: Lang, variation = 0): DreamReport {
  const raw = dreamText.trim()
  const lower = raw.toLowerCase()
  const seed = (hash(lower) + variation * 7919) >>> 0
  const excerpt = raw.length > 500 ? `${raw.slice(0, 497)}…` : raw
  const words = phrases(raw)

  const emotions = rank(lower, EMOTIONS)
  const places = rank(lower, PLACES)
  const creatures = rank(lower, CREATURES)
  const objects = rank(lower, OBJECTS)
  const actions = rank(lower, ACTIONS)

  const emo = emotions[0]
  const act = actions[0]
  const creature = creatures[0]

  let drama = Number(act?.drama ?? 0.25)
  if (emo && ['conflict', 'fear', 'anger', 'courage', 'urgency'].includes(emo.id)) drama = Math.max(drama, 0.7)
  if (creatures.some((c) => ['lion', 'tiger', 'beast', 'wolf'].includes(c.id))) drama = Math.max(drama, 0.75)
  if (score(lower, ['aslan', 'lion', 'savaş', 'fight', 'battle'])) drama = Math.max(drama, 0.85)

  type PlaceView = { id: string; en: string; tr: string; scene: string }
  let place: PlaceView
  if (places[0]) {
    place = { id: places[0].id, en: places[0].en, tr: places[0].tr, scene: places[0].scene }
  } else if (creature && (creature.id === 'lion' || creature.id === 'tiger')) {
    const sav = PLACES.find((p) => p.id === 'savanna')!
    place = { id: sav.id, en: sav.en, tr: sav.tr, scene: sav.scene }
  } else {
    place = {
      id: 'liminal',
      en: 'dreamscape',
      tr: 'rüya manzarası',
      scene: 'vast emotional dream landscape between earth and sky, cinematic scale',
    }
  }

  const palette =
    drama >= 0.7
      ? 'dusty rose gold (#e8b4a0), deep lavender dusk (#8b7a9e), peach amber (#f0c090), soft plum shadow (#5c4a62), misty ivory (#f4ebe4)'
      : 'blush pink (#f6c1d4), soft lavender (#c9b8e8), powder blue (#a8d4f0), mint (#b8e8d4), warm peach (#f5c9a8)'

  const title = buildTitle(lang, seed, creature?.id, act?.id, place.id)
  const mood = emo ? emo[lang === 'tr' ? 'tr' : 'en'] : L(lang, 'layered wonder', 'katmanlı hayret')
  const tags = [
    mood,
    lang === 'tr' ? place.tr : place.en,
    ...creatures.slice(0, 2).map((c) => (lang === 'tr' ? c.tr : c.en)),
  ].filter(Boolean)

  const imagePrompt = buildPrompt({
    excerpt,
    scene: place.scene,
    creatures,
    objects,
    actionEn: act?.en,
    palette,
    drama,
    words,
    variation,
    seed,
  })

  const symbols = buildSymbols(lang, creatures, objects, act?.id, emo?.id)

  return {
    seed,
    title,
    mood,
    tags,
    imagePrompt,
    emotionalAtmosphere: sectionEmotional(lang, excerpt, emo, place, creature, act, drama),
    symbols,
    psychology: sectionPsychology(lang, excerpt, emo, creature, act, place, drama),
    hiddenMessages: sectionHidden(lang, emo, creature, objects, act, drama),
    advice: sectionAdvice(lang, emo, creature, act, drama).text,
    reflectionQuestions: sectionAdvice(lang, emo, creature, act, drama).questions,
  }
}

function buildTitle(lang: Lang, seed: number, creature?: string, action?: string, place?: string) {
  if (creature === 'lion' && action === 'fight') return L(lang, 'Trial of the Lions', 'Aslanların İmtihanı')
  if (creature === 'lion') return L(lang, 'The Golden Roar', 'Altın Kükreme')
  if (action === 'fight') return L(lang, 'Night of Confrontation', 'Yüzleşme Gecesi')
  if (action === 'fly') return L(lang, 'Weightless Kingdom', 'Ağırlıksız Krallık')
  if (place === 'forest') return L(lang, 'Canopy of Secrets', 'Sır Gölgeliği')
  return pick(
    lang === 'tr'
      ? (['Sessiz Eşik', 'Şeftali Ufuk', 'Lavanta Alacakaranlık', 'Açık Kapı', 'Pembe Kor'] as const)
      : (['Quiet Threshold', 'Peach Horizon', 'Lavender Dusk', 'The Open Gate', 'Pink Embers'] as const),
    seed,
  )
}

function buildSymbols(
  lang: Lang,
  creatures: Scored<(typeof CREATURES)[number]>[],
  objects: Scored<(typeof OBJECTS)[number]>[],
  actionId?: string,
  emoId?: string,
): SymbolReading[] {
  const ids: string[] = []
  for (const c of creatures.slice(0, 3)) ids.push(c.id)
  for (const o of objects.slice(0, 3)) ids.push(o.id)
  if (actionId === 'fight') ids.push('fight')
  if (actionId === 'fly') ids.push('flight')
  if (emoId === 'fear') ids.push('shadow')
  ids.push('dreamer')

  const out: SymbolReading[] = []
  for (const id of ids) {
    const s = SYMBOL_TEXT[id]
    if (!s) continue
    const name = lang === 'tr' ? s.tr : s.en
    if (out.some((x) => x.name === name)) continue
    out.push({ name, meaning: lang === 'tr' ? s.meanTr : s.meanEn })
  }
  if (out.length < 2) {
    out.push({
      name: L(lang, 'Night Image', 'Gece İmgesi'),
      meaning: L(
        lang,
        'A personal symbol still forming — stay with the feeling longer than the plot.',
        'Hâlâ oluşan kişisel sembol — olay örgüsünden çok hisle kalın.',
      ),
    })
  }
  return out.slice(0, 6)
}

function buildPrompt(opts: {
  excerpt: string
  scene: string
  creatures: Scored<(typeof CREATURES)[number]>[]
  objects: Scored<(typeof OBJECTS)[number]>[]
  actionEn?: string
  palette: string
  drama: number
  words: string[]
  variation: number
  seed: number
}) {
  const { excerpt, scene, creatures, objects, actionEn, palette, drama, words, variation, seed } = opts
  const creatureLine = creatures
    .slice(0, 3)
    .map((c) => c.visual)
    .join('; ')
  const objectLine = objects
    .slice(0, 3)
    .map((o) => o.visual)
    .join('; ')

  const style =
    drama >= 0.7
      ? pick(
          [
            'cinematic fine art painting, epic yet elegant, realistic anatomy with painterly brushwork, museum quality',
            'dramatic romantic-realism oil painting, soft pastel emotion, gallery masterpiece',
            'high-end concept art still, filmic composition, artistic not cartoon',
          ] as const,
          seed,
        )
      : pick(
          [
            'museum-quality fine art digital painting, soft oil brushwork, ethereal dreamcore',
            'poetic realism with sfumato edges, premium dream illustration',
          ] as const,
          seed,
        )

  const lighting =
    drama >= 0.7
      ? 'cinematic volumetric light, strong key and soft pastel fill, god-rays, dust in air'
      : 'diffused pastel volumetric light, gentle bloom, soft shadows'

  return [
    variation > 0 ? `Alternate masterful composition #${variation + 1} of the same dream.` : 'Single definitive masterpiece of this dream.',
    `Ultra-detailed artwork of this dream (stay faithful): "${excerpt}".`,
    `Action: ${actionEn ?? 'a dreamer figure with clear emotional presence in the scene'}.`,
    `Environment: ${scene}.`,
    creatureLine ? `Creatures: ${creatureLine}.` : '',
    objectLine ? `Objects: ${objectLine}.` : '',
    words.length ? `Language cues from dreamer: ${words.slice(0, 8).join(', ')}.` : '',
    `Emotional pastel palette: ${palette}. No neon, no garish saturation.`,
    `Lighting: ${lighting}.`,
    `Style: ${style}.`,
    drama >= 0.7
      ? 'Composition: cinematic frame, dynamic diagonals, clear focal point, epic but tasteful. Tone: noble drama, not gore, not meme.'
      : 'Composition: elegant focal point, breathing space, coherent depth. Tone: magical, serene, meaningful.',
    'Quality: highly detailed, coherent anatomy, beautiful, professional single image.',
    'Avoid: text, watermark, logo, UI, cartoon, anime chibi, extra limbs, excessive blood, low quality, random unrelated objects.',
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 1200)
}

/* ── Analysis sections ───────────────────────────────────── */

function sectionEmotional(
  lang: Lang,
  excerpt: string,
  emo: Scored<(typeof EMOTIONS)[number]> | undefined,
  place: { en: string; tr: string },
  creature: Scored<(typeof CREATURES)[number]> | undefined,
  act: Scored<(typeof ACTIONS)[number]> | undefined,
  drama: number,
) {
  const a = emo
    ? L(
        lang,
        `The emotional weather is dominated by ${emo.en}. That tone is the psyche’s headline — the feeling it most needs you to notice on waking.`,
        `Duygusal havaya ${emo.tr} egemendir. Bu ton psişenin manşetidir — uyanınca fark etmenizi istediği histir.`,
      )
    : L(
        lang,
        'The emotional weather is layered and open: several feelings share the stage without one fully conquering the others.',
        'Duygusal hava katmanlı ve açıktır: birkaç his sahneyi paylaşır, biri diğerlerini tamamen ele geçirmez.',
      )

  const b =
    drama >= 0.7
      ? L(
          lang,
          `\n\nIntensity here is creative as well as confrontational. High-drama dreams expand a compressed knot of power, anger, dignity, or fear into a scene you can finally feel in full color.`,
          `\n\nBuradaki yoğunluk hem yüzleştirici hem yaratıcıdır. Yüksek dramalı rüyalar güç, öfke, haysiyet veya korku düğümünü tam renkli bir sahneye yayar.`,
        )
      : L(
          lang,
          `\n\nThe atmosphere is porous rather than explosive: images breathe, light moves slowly, meaning arrives as mood before story.`,
          `\n\nAtmosfer patlayıcıdan çok gözeneklidir: imgeler nefes alır, ışık yavaş hareket eder, anlam hikâyeden önce hâl olarak gelir.`,
        )

  const c = creature
    ? L(
        lang,
        `\n\nThe ${creature.en} amplifies everything — creatures give body and motion to forces waking language keeps abstract.`,
        `\n\n${creature.tr.charAt(0).toUpperCase()}${creature.tr.slice(1)} her şeyi yükseltir — yaratıklar uyanık dilin soyut bıraktığı kuvvetlere beden verir.`,
      )
    : ''

  const d = act
    ? L(
        lang,
        `\n\nYour stance — ${act.en} — is emotion in verb form. Notice whether the dream-body felt capable, trapped, furious, or strangely calm.`,
        `\n\nDuruşunuz — ${act.en} — fiil formunda duygudur. Rüya-bedenin yeterli, sıkışmış, öfkeli veya sakin hissedip hissetmediğine bakın.`,
      )
    : ''

  const e = L(
    lang,
    `\n\nSet inside a ${place.en}, mood and place reinforce each other. In your words — “${excerpt.slice(0, 130)}${excerpt.length > 130 ? '…' : ''}” — atmosphere is the first truth offered.`,
    `\n\nBir ${place.tr} içinde hâl ve mekân birbirini besler. “${excerpt.slice(0, 130)}${excerpt.length > 130 ? '…' : ''}” anlatınızda atmosfer sunulan ilk hakikattir.`,
  )

  return a + b + c + d + e
}

function sectionPsychology(
  lang: Lang,
  excerpt: string,
  emo: Scored<(typeof EMOTIONS)[number]> | undefined,
  creature: Scored<(typeof CREATURES)[number]> | undefined,
  act: Scored<(typeof ACTIONS)[number]> | undefined,
  place: { en: string; tr: string },
  drama: number,
) {
  const p1 = L(
    lang,
    'Psychologically, dreams are overnight integration more than prophecy: the mind stages images so unfinished feelings and intentions can be rehearsed safely. Your dream is private theatre with perfect casting.',
    'Psikolojik olarak rüyalar kehanetten çok gece boyu entegrasyondur: zihin bitmemiş hisleri güvenli prova için sahneye koyar. Rüyanız kusursuz kadrolu özel tiyatrodur.',
  )

  const p2 = emo
    ? L(
        lang,
        `\n\nThe dominant affect of ${emo.en} is triage, not punishment — something in waking life made this feeling urgent enough to claim the night’s main stage.`,
        `\n\nBaskın ${emo.tr} duygulanımı ceza değil triyajdır — uyanık hayatta bir şey bu hissi gecenin ana sahnesini devralacak kadar acil kılmıştır.`,
      )
    : ''

  const p3 =
    creature?.id === 'lion' && act?.id === 'fight'
      ? L(
          lang,
          `\n\nFighting lions is a classic power-confrontation motif. It often clusters around: asserting boundaries against a dominant other; meeting your own aggression or ambition without shame; fear that strength will destroy or corrupt you; a courage test before a real trial. The dream asks less “will you win?” and more “can you stay present while power is in the room?”`,
          `\n\nAslanlarla savaşmak klasik güç-yüzleşme motifidir. Çoğu zaman: baskın ötekine sınır, utançsız güç/hırs, gücün yok edeceği korkusu, gerçek bir imtihandan önce cesaret. Rüya “kazanacak mısın?”dan çok “güç odadayken hazır bulunabilir misin?” diye sorar.`,
        )
      : act?.id === 'fight'
        ? L(
            lang,
            `\n\nCombat means the ego is practicing engagement. Active struggle often signals that a part of you still believes agency is possible — a different picture from frozen helplessness.`,
            `\n\nSavaş, egonun teması prova ettiğini gösterir. Aktif mücadele çoğu zaman seçim gücüne hâlâ inanıldığını işaret eder — donmuş çaresizlikten farklı bir tablo.`,
          )
        : L(
            lang,
            `\n\nEven without battle, the dream organizes experience into a narrative you can revisit. Each retelling reassigns meaning and softens raw charge.`,
            `\n\nSavaş olmasa bile rüya deneyimi yeniden ziyaret edilebilir bir anlatıya dizer. Her anlatım anlamı yeniden atar ve ham yükü yumuşatır.`,
          )

  const p4 = L(
    lang,
    `\n\nThe ${place.en} is stage design for inner architecture — environment is mood made spatial.`,
    `\n\n${place.tr.charAt(0).toUpperCase()}${place.tr.slice(1)}, iç mimarinin sahne tasarımıdır — ortam mekânsallaşmış hâldir.`,
  )

  const p5 = L(
    lang,
    `\n\nTreat the dream as data about need and strategy, not a verdict on character. In “${excerpt.slice(0, 90)}${excerpt.length > 90 ? '…' : ''}”, intention is already half-visible.`,
    `\n\nRüyayı karakter hükmü değil, ihtiyaç ve strateji verisi sayın. “${excerpt.slice(0, 90)}${excerpt.length > 90 ? '…' : ''}” içinde niyet yarı görünürdür.`,
  )

  const p6 =
    drama >= 0.7
      ? L(
          lang,
          '\n\nHigh-arousal dreams leave residual charge. Ground after waking: water, longer exhales, name five colors in the room — so insight can land without jitter.',
          '\n\nYüksek uyarılmalı rüyalar artakalan yük bırakır. Uyanınca topraklanın: su, uzun nefes veriş, odada beş renk — içgörü titreme olmadan insin.',
        )
      : ''

  return p1 + p2 + p3 + p4 + p5 + p6
}

function sectionHidden(
  lang: Lang,
  emo: Scored<(typeof EMOTIONS)[number]> | undefined,
  creature: Scored<(typeof CREATURES)[number]> | undefined,
  objects: Scored<(typeof OBJECTS)[number]>[],
  act: Scored<(typeof ACTIONS)[number]> | undefined,
  drama: number,
) {
  const lines: string[] = [
    L(
      lang,
      'Beneath the plot, invitations often hide inside images:',
      'Olay örgüsünün altında davetler çoğu zaman imgelerin içinde gizlidir:',
    ),
  ]

  if (creature?.id === 'lion' || act?.id === 'fight') {
    lines.push(
      L(
        lang,
        '• The “enemy” may be disowned strength — assertiveness, leadership, or anger with a backbone you refuse by day.',
        '• “Düşman” sahipsiz güç olabilir — gündüz reddettiğiniz iddia, liderlik veya omurgalı öfke.',
      ),
      L(
        lang,
        '• Surviving the scene equals dignity under pressure: the psyche trains you not to collapse.',
        '• Sahnede hayatta kalmak baskı altında haysiyete denktir: psişe çökmemeyi alıştırır.',
      ),
    )
  }
  if (emo?.id === 'fear') {
    lines.push(
      L(
        lang,
        '• Fear is often a boundary messenger: something needs protection, honesty, or a slower pace.',
        '• Korku sıklıkla sınır ulakıdır: korunma, dürüstlük veya daha yavaş tempo gerekir.',
      ),
    )
  }
  if (objects.some((o) => o.id === 'door' || o.id === 'key' || o.id === 'bridge')) {
    lines.push(
      L(
        lang,
        '• Threshold symbols imply a decision already half-made — the dream lets you feel cost and promise.',
        '• Eşik sembolleri yarı verilmiş kararı ima eder — rüya bedeli ve vaadi hissettirir.',
      ),
    )
  }
  if (objects.some((o) => o.id === 'water')) {
    lines.push(
      L(
        lang,
        '• Water asks for feeling before fixing. Management without mourning keeps dreams loud.',
        '• Su, düzeltmeden önce hissetmeyi ister. Yas tutmadan yönetmek rüyaları gürültülü tutar.',
      ),
    )
  }
  if (drama >= 0.7) {
    lines.push(
      L(
        lang,
        '• Epic scale means the issue is not trivial to the psyche — even if daytime politeness minimized it.',
        '• Epik ölçek, konunun psişe için önemsiz olmadığını gösterir — gündüz nezaketi küçültmüş olsa bile.',
      ),
    )
  }
  if (lines.length < 4) {
    lines.push(
      L(
        lang,
        '• What felt unfinished on waking is often the real message — a sensation, not a slogan.',
        '• Uyanınca eksik kalan his çoğu zaman asıl mesajdır — slogan değil, duyum.',
      ),
    )
  }
  lines.push(
    L(
      lang,
      '\nMaps for self-inquiry — not medical diagnosis or destiny decrees.',
      '\nÖz-sorgulama haritaları — tıbbi tanı veya kader hükmü değil.',
    ),
  )
  return lines.join('\n')
}

function sectionAdvice(
  lang: Lang,
  emo: Scored<(typeof EMOTIONS)[number]> | undefined,
  creature: Scored<(typeof CREATURES)[number]> | undefined,
  act: Scored<(typeof ACTIONS)[number]> | undefined,
  drama: number,
) {
  const tips: string[] = [
    L(
      lang,
      'Retell the dream in present tense on paper (“I am fighting…”) — present tense unlocks fresher body memory.',
      'Rüyayı şimdiki zamanda yazın (“Savaşıyorum…”) — şimdiki zaman taze beden belleğini açar.',
    ),
  ]

  if (creature?.id === 'lion' || act?.id === 'fight') {
    tips.push(
      L(
        lang,
        'Name the “lion” in waking life in one concrete sentence (person, pressure, inner critic, deadline).',
        'Uyanık hayattaki “aslan”ı tek somut cümlede adlandırın (kişi, baskı, iç eleştirmen, son tarih).',
      ),
      L(
        lang,
        'Practice one small act of clean power today: a clear no, a direct request, or a boundary without apology-spam.',
        'Bugün küçük bir temiz güç eylemi: net hayır, doğrudan rica veya özür yağmursuz sınır.',
      ),
    )
  }
  if (emo?.id === 'fear' || drama >= 0.7) {
    tips.push(
      L(
        lang,
        'Downshift after intense dreams: longer exhales, cold water on wrists, bare feet on the floor for a minute.',
        'Yoğun rüyadan sonra regüle olun: uzun nefes veriş, bileklere soğuk su, bir dakika yere ayak.',
      ),
    )
  }
  if (emo?.id === 'love' || emo?.id === 'sadness') {
    tips.push(
      L(
        lang,
        'Give the tender self five undistracted minutes — tea, music, or a short phoneless walk.',
        'Narin yana beş dakikalık bölünmemiş özen — çay, müzik veya telefonsuz yürüyüş.',
      ),
    )
  }
  if (act?.id === 'fly' || emo?.id === 'freedom') {
    tips.push(
      L(
        lang,
        'Drop one obligation that no longer fits. Dream liberation wants a miniature real-world echo.',
        'Artık uymayan bir yükümlülüğü bırakın. Rüyadaki özgürleşme minik bir gerçek yankı ister.',
      ),
    )
  }
  tips.push(
    L(
      lang,
      'Keep a two-line dream log for seven nights. Patterns clarify meaning more than any single spectacular dream.',
      'Yedi gece iki satırlık rüya kaydı tutun. Örüntüler tek muhteşem rüyadan daha çok anlam netleştirir.',
    ),
  )

  const questions =
    lang === 'tr'
      ? [
          'Uyanır uyanmaz bedenimin neresi konuştu — çene, göğüs, karın, eller?',
          'Rüya-benlik hangi stratejiyi kullandı: savaş, kaç, don, pazarlık, seyir?',
          'Aslan / rakip / engel uyanık hayatta kimin veya neyin yüzü olabilir?',
          'Bu rüya bana hangi gücü geri vermek istiyor olabilir?',
          'Yüzleşmekten kaçındığım tek konuşma veya karar nedir?',
          'Kendime hangi tek cümlelik haysiyetli mesajı söyleyebilirim?',
        ]
      : [
          'Where did my body speak on waking — jaw, chest, belly, hands?',
          'Which strategy did the dream-self use: fight, flee, freeze, bargain, watch?',
          'Whose face might the lion / rival / obstacle wear in waking life?',
          'What power might this dream be trying to return to me?',
          'What one conversation or decision have I postponed out of fear?',
          'What single sentence of dignity can I offer myself today?',
        ]

  if (creature?.id === 'lion') {
    questions[2] =
      lang === 'tr'
        ? 'Aslan benim bir yanımsa ne istiyor — saygı, dinlenme, alan, dürüstlük?'
        : 'If the lion is a part of me, what does it want — respect, rest, territory, honesty?'
  }

  return {
    text: tips.map((x, i) => `${i + 1}. ${x}`).join('\n\n'),
    questions,
  }
}
