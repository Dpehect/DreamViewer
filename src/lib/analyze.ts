/**
 * Dream analysis engine
 * Parses text (TR/EN) → Scene Bible → image prompt + multi-section report
 */

import type { DreamReport, Lang, SymbolReading } from '../types/dream'

/* ── Utils ───────────────────────────────────────────────── */

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

function L(lang: Lang, en: string, tr: string): string {
  return lang === 'tr' ? tr : en
}

function has(lower: string, keys: readonly string[]): boolean {
  return keys.some((k) => lower.includes(k))
}

function scoreKeys(lower: string, keys: readonly string[], weight = 1): number {
  let s = 0
  for (const k of keys) if (lower.includes(k)) s += weight
  return s
}

type Scored<T> = T & { score: number }

function rank<T extends { keys: readonly string[]; w?: number }>(
  lower: string,
  list: readonly T[],
): Scored<T>[] {
  return list
    .map((item) => ({ ...item, score: scoreKeys(lower, item.keys, item.w ?? 1) }))
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
}

function extractPhrases(text: string): string[] {
  const stop = new Set([
    'bir', 've', 'ile', 'the', 'and', 'was', 'were', 'gibi', 'sonra', 'çok', 'ama',
    'that', 'this', 'için', 'ben', 'my', 'then', 'gördüm', 'oldu', 'birden',
  ])
  const out: string[] = []
  for (const w of text.replace(/[.,;:!?…"""'()\-]/g, ' ').split(/\s+/)) {
    if (w.length < 3 || stop.has(w.toLowerCase())) continue
    if (!out.some((x) => x.toLowerCase() === w.toLowerCase())) out.push(w)
    if (out.length >= 14) break
  }
  return out
}

/* ── Lexicons ────────────────────────────────────────────── */

const EMOTIONS = [
  { keys: ['kork', 'fear', 'scared', 'terrif', 'kâbus', 'kabus', 'nightmare', 'panik'], id: 'fear', en: 'vigilant tension', tr: 'uyanık gerilim', w: 4 },
  { keys: ['savaş', 'dövüş', 'kavga', 'fight', 'battle', 'struggle', 'mücadele'], id: 'conflict', en: 'fierce confrontation', tr: 'şiddetli yüzleşme', w: 5 },
  { keys: ['cesaret', 'güç', 'brave', 'courage', 'power', 'strong', 'zafer'], id: 'courage', en: 'courageous force', tr: 'cesur güç', w: 4 },
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
  { keys: ['orman', 'forest', 'ağaç', 'tree'], id: 'forest', en: 'forest', tr: 'orman', scene: 'ancient atmospheric forest with mist between tall trees and mossy ground' },
  { keys: ['deniz', 'ocean', 'sea', 'okyanus'], id: 'sea', en: 'sea', tr: 'deniz', scene: 'cinematic seascape with luminous waves and endless horizon' },
  { keys: ['gökyüzü', 'sky', 'bulut', 'cloud'], id: 'sky', en: 'sky', tr: 'gökyüzü', scene: 'infinite sky among sculpted pastel clouds' },
  { keys: ['ev', 'house', 'home', 'oda', 'room'], id: 'house', en: 'home', tr: 'ev', scene: 'liminal childhood house with warm strange interior light' },
  { keys: ['şehir', 'city', 'cadde'], id: 'city', en: 'city', tr: 'şehir', scene: 'hushed dream-city with empty streets and soft haze' },
  { keys: ['bahçe', 'garden', 'çiçek'], id: 'garden', en: 'garden', tr: 'bahçe', scene: 'secret garden blooming in dusk light' },
  { keys: ['çöl', 'desert', 'savan', 'ova', 'plain'], id: 'savanna', en: 'plain', tr: 'ova', scene: 'golden-peach open plain under a vast emotional sky' },
  { keys: ['dağ', 'mountain'], id: 'mountain', en: 'mountains', tr: 'dağlar', scene: 'dramatic mountain ridges fading into pastel mist' },
  { keys: ['uzay', 'space', 'yıldız', 'star'], id: 'cosmos', en: 'cosmos', tr: 'kozmos', scene: 'soft cosmic expanse of stars and nebulae' },
  { keys: ['arena', 'stadyum'], id: 'arena', en: 'arena', tr: 'arena', scene: 'mythic open arena of stone and dust under theatrical light' },
] as const

const CREATURES = [
  { keys: ['aslan', 'lion', 'aslanlar', 'lions'], id: 'lion', en: 'lion', tr: 'aslan', visual: 'majestic lions with powerful realistic anatomy, golden-rose fur in cinematic light, fierce yet noble' },
  { keys: ['kaplan', 'tiger'], id: 'tiger', en: 'tiger', tr: 'kaplan', visual: 'powerful tiger with painterly stripes and regal eyes' },
  { keys: ['kurt', 'wolf'], id: 'wolf', en: 'wolf', tr: 'kurt', visual: 'wolves with silver-dust fur and intelligent eyes' },
  { keys: ['yılan', 'snake'], id: 'snake', en: 'serpent', tr: 'yılan', visual: 'luminous serpent with iridescent pastel scales' },
  { keys: ['kedi', 'cat'], id: 'cat', en: 'cat', tr: 'kedi', visual: 'silver soft-furred cat with luminous eyes' },
  { keys: ['kuş', 'bird'], id: 'bird', en: 'birds', tr: 'kuşlar', visual: 'birds as soft messengers in the sky' },
  { keys: ['at', 'horse'], id: 'horse', en: 'horse', tr: 'at', visual: 'pale powerful horses with manes flowing like light' },
  { keys: ['canavar', 'monster', 'beast'], id: 'beast', en: 'beast', tr: 'canavar', visual: 'symbolic powerful beast form, elegant not gory' },
] as const

const OBJECTS = [
  { keys: ['kapı', 'door', 'geçit', 'gate'], id: 'door', en: 'Door', tr: 'Kapı', visual: 'a luminous monumental doorway' },
  { keys: ['ayna', 'mirror'], id: 'mirror', en: 'Mirror', tr: 'Ayna', visual: 'freestanding mirror reflecting another light' },
  { keys: ['kılıç', 'sword', 'silah', 'weapon'], id: 'weapon', en: 'Weapon', tr: 'Silah', visual: 'symbolic weapon catching soft dramatic light, no gore' },
  { keys: ['su', 'water', 'yağmur', 'rain', 'dalga'], id: 'water', en: 'Water', tr: 'Su', visual: 'water as waves, rain, or reflective pools' },
  { keys: ['ateş', 'fire', 'alev'], id: 'fire', en: 'Fire', tr: 'Ateş', visual: 'painterly fire and ember light' },
  { keys: ['anahtar', 'key'], id: 'key', en: 'Key', tr: 'Anahtar', visual: 'ornate floating key' },
  { keys: ['ay', 'moon'], id: 'moon', en: 'Moon', tr: 'Ay', visual: 'large emotional moon near the horizon' },
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

const SYMBOL_DB: Record<string, { en: string; tr: string; meanEn: string; meanTr: string }> = {
  lion: {
    en: 'Lion',
    tr: 'Aslan',
    meanEn:
      'Instinctual power, sovereignty, and the raw Self. Fighting lions often means confronting your own strength, pride, anger, or a dominant force in waking life. The lion is both trial and teacher — power you must face without being consumed.',
    meanTr:
      'İçgüdüsel güç, egemenlik ve ham Benlik. Aslanlarla savaşmak çoğu zaman kendi gücünüzle, gururla, öfkeyle veya uyanık hayattaki baskın bir kuvvetle yüzleşmek demektir. Aslan hem imtihan hem öğretmendir.',
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
  snake: {
    en: 'Serpent',
    tr: 'Yılan',
    meanEn: 'Transformation and shedding of old skin — fear of snakes often tracks fear of change.',
    meanTr: 'Dönüşüm ve eski deriyi bırakmak — yılan korkusu çoğu zaman değişim korkusuna yapışıktır.',
  },
}

/* ── Scene bible ─────────────────────────────────────────── */

type PlaceView = { id: string; en: string; tr: string; scene: string }

type SceneBible = {
  seed: number
  variation: number
  excerpt: string
  phrases: string[]
  emotions: Scored<(typeof EMOTIONS)[number]>[]
  place: PlaceView
  creatures: Scored<(typeof CREATURES)[number]>[]
  objects: Scored<(typeof OBJECTS)[number]>[]
  action?: Scored<(typeof ACTIONS)[number]>
  drama: number
  palette: string
}

function buildBible(dreamText: string, variation: number): SceneBible {
  const raw = dreamText.trim()
  const lower = raw.toLowerCase()
  const seed = (hash(lower) + variation * 7919) >>> 0
  const excerpt = raw.length > 500 ? `${raw.slice(0, 497)}…` : raw

  const emotions = rank(lower, EMOTIONS)
  const places = rank(lower, PLACES)
  const creatures = rank(lower, CREATURES)
  const objects = rank(lower, OBJECTS)
  const actions = rank(lower, ACTIONS)

  const emo = emotions[0]
  const act = actions[0]
  const creature = creatures[0]

  let drama = Number(act?.drama ?? 0.25)
  if (emo && ['conflict', 'fear', 'anger', 'courage', 'urgency'].includes(emo.id)) {
    drama = Math.max(drama, 0.7)
  }
  if (creatures.some((c) => ['lion', 'tiger', 'beast', 'wolf'].includes(c.id))) {
    drama = Math.max(drama, 0.75)
  }
  if (has(lower, ['aslan', 'lion', 'savaş', 'fight', 'battle'])) {
    drama = Math.max(drama, 0.85)
  }

  let place: PlaceView
  if (places[0]) {
    place = { id: places[0].id, en: places[0].en, tr: places[0].tr, scene: places[0].scene }
  } else if (creature && (creature.id === 'lion' || creature.id === 'tiger')) {
    const sav = PLACES.find((p) => p.id === 'savanna')!
    place = { id: sav.id, en: sav.en, tr: sav.tr, scene: sav.scene }
  } else if (drama >= 0.8) {
    const ar = PLACES.find((p) => p.id === 'arena')!
    place = { id: ar.id, en: ar.en, tr: ar.tr, scene: ar.scene }
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
      : 'blush pink (#f6c1d4), soft lavender (#c4b5fd), powder blue (#93c5fd), mint (#6ee7b7), warm peach (#fdba74)'

  return {
    seed,
    variation,
    excerpt,
    phrases: extractPhrases(raw),
    emotions,
    place,
    creatures,
    objects,
    action: act,
    drama,
    palette,
  }
}

/* ── Public API ──────────────────────────────────────────── */

/**
 * Analyze dream text and produce a full report + image prompt.
 * Pure function — safe to call on language switch without side effects.
 */
export function analyzeDream(
  dreamText: string,
  lang: Lang,
  variation = 0,
): DreamReport {
  const bible = buildBible(dreamText, variation)
  const emo = bible.emotions[0]
  const act = bible.action
  const creature = bible.creatures[0]

  const title = buildTitle(lang, bible.seed, creature?.id, act?.id, bible.place.id)
  const mood = emo
    ? emo[lang === 'tr' ? 'tr' : 'en']
    : L(lang, 'layered wonder', 'katmanlı hayret')

  const tags = [
    mood,
    lang === 'tr' ? bible.place.tr : bible.place.en,
    ...bible.creatures.slice(0, 2).map((c) => (lang === 'tr' ? c.tr : c.en)),
  ].filter(Boolean)

  return {
    seed: bible.seed,
    variation,
    title,
    mood,
    tags,
    imagePrompt: buildImagePrompt(bible),
    imageNote: L(
      lang,
      bible.drama >= 0.65
        ? 'Cinematic fine art · emotional pastel drama'
        : 'Poetic fine art · soft pastel light',
      bible.drama >= 0.65
        ? 'Sinematik sanat · duygusal pastel drama'
        : 'Poetik sanat · yumuşak pastel ışık',
    ),
    drama: bible.drama,
    emotionalAtmosphere: sectionEmotional(lang, bible),
    symbols: buildSymbols(lang, bible),
    psychology: sectionPsychology(lang, bible),
    hiddenMessages: sectionHidden(lang, bible),
    personalAdvice: sectionAdvice(lang, bible).text,
    reflectionQuestions: sectionAdvice(lang, bible).questions,
    thematicConnections: sectionThemes(lang, bible),
  }
}

/* ── Title & symbols ─────────────────────────────────────── */

function buildTitle(
  lang: Lang,
  seed: number,
  creature?: string,
  action?: string,
  place?: string,
): string {
  if (creature === 'lion' && action === 'fight') {
    return L(lang, 'Trial of the Lions', 'Aslanların İmtihanı')
  }
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

function buildSymbols(lang: Lang, b: SceneBible): SymbolReading[] {
  const ids: string[] = []
  for (const c of b.creatures.slice(0, 3)) ids.push(c.id)
  for (const o of b.objects.slice(0, 3)) ids.push(o.id)
  if (b.action?.id === 'fight') ids.push('fight')
  if (b.action?.id === 'fly') ids.push('flight')
  if (b.emotions[0]?.id === 'fear') ids.push('shadow')
  if (b.place.id === 'forest') ids.push('forest')
  if (b.place.id === 'house') ids.push('house')
  ids.push('dreamer')

  const out: SymbolReading[] = []
  for (const id of ids) {
    const s = SYMBOL_DB[id]
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
        'Hâlâ oluşan kişisel bir sembol — olay örgüsünden çok hisle kalın.',
      ),
    })
  }
  return out.slice(0, 6)
}

/* ── Image prompt engineering ────────────────────────────── */

function buildImagePrompt(b: SceneBible): string {
  const creatureLine = b.creatures
    .slice(0, 3)
    .map((c) => c.visual)
    .join('; ')
  const objectLine = b.objects
    .slice(0, 3)
    .map((o) => o.visual)
    .join('; ')

  const style =
    b.drama >= 0.7
      ? pick(
          [
            'cinematic fine art painting, epic yet elegant, realistic anatomy with painterly brushwork, museum quality',
            'dramatic romantic-realism oil painting, soft pastel emotion, gallery masterpiece',
            'high-end concept art still, filmic composition, artistic not cartoon',
          ] as const,
          b.seed,
        )
      : pick(
          [
            'museum-quality fine art digital painting, soft oil brushwork, ethereal dreamcore',
            'poetic realism with sfumato edges, premium dream illustration',
          ] as const,
          b.seed,
        )

  const lighting =
    b.drama >= 0.7
      ? 'cinematic volumetric light, strong key and soft pastel fill, god-rays, dust particles in air'
      : 'diffused pastel volumetric light, gentle bloom, soft shadows'

  const actionEn = b.action?.en ?? 'a dreamer figure with clear emotional presence in the scene'

  return [
    b.variation > 0
      ? `Alternate masterful composition #${b.variation + 1} of the same dream.`
      : 'Single definitive masterpiece of this dream.',
    `Ultra-detailed artwork of this dream (stay faithful to the narrative): "${b.excerpt}".`,
    `Primary action/state: ${actionEn}.`,
    `Environment: ${b.place.scene}.`,
    creatureLine ? `Creatures (accurate, powerful, beautiful): ${creatureLine}.` : '',
    objectLine ? `Symbolic objects: ${objectLine}.` : '',
    b.phrases.length
      ? `Ground details in the dreamer's language cues: ${b.phrases.slice(0, 8).join(', ')}.`
      : '',
    `Emotional pastel color palette (harmonious, not neon): ${b.palette}.`,
    `Lighting: ${lighting}.`,
    `Artistic style: ${style}.`,
    b.drama >= 0.7
      ? 'Composition: cinematic frame, dynamic diagonal action, clear hero focal point, epic but tasteful. Tone: noble drama, not gore, not meme.'
      : 'Composition: elegant focal point, breathing negative space, coherent depth. Tone: magical, serene, meaningful.',
    'Quality: highly detailed, coherent anatomy, beautiful, professional single image.',
    'Avoid: text, watermark, logo, UI, cartoon, anime chibi, extra limbs, excessive blood, low quality, random unrelated objects.',
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 1200)
}

/* ── Analysis sections ───────────────────────────────────── */

function sectionEmotional(lang: Lang, b: SceneBible): string {
  const emo = b.emotions[0]
  const sec = b.emotions[1]
  const creature = b.creatures[0]
  const act = b.action

  const p1 = emo
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

  const p2 =
    b.drama >= 0.7
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

  const p3 = creature
    ? L(
        lang,
        `\n\nThe ${creature.en} amplifies everything — creatures give body and motion to forces waking language keeps abstract.`,
        `\n\n${creature.tr.charAt(0).toUpperCase()}${creature.tr.slice(1)} her şeyi yükseltir — yaratıklar uyanık dilin soyut bıraktığı kuvvetlere beden verir.`,
      )
    : ''

  const p4 = act
    ? L(
        lang,
        `\n\nYour stance — ${act.en} — is emotion in verb form. Notice whether the dream-body felt capable, trapped, furious, or strangely calm.`,
        `\n\nDuruşunuz — ${act.en} — fiil formunda duygudur. Rüya-bedenin yeterli, sıkışmış, öfkeli veya sakin hissedip hissetmediğine bakın.`,
      )
    : ''

  const p5 = L(
    lang,
    `\n\nSet inside a ${b.place.en}, mood and place reinforce each other. In your words — “${b.excerpt.slice(0, 130)}${b.excerpt.length > 130 ? '…' : ''}” — atmosphere is the first truth offered.`,
    `\n\nBir ${b.place.tr} içinde hâl ve mekân birbirini besler. “${b.excerpt.slice(0, 130)}${b.excerpt.length > 130 ? '…' : ''}” anlatınızda atmosfer sunulan ilk hakikattir.`,
  )

  const p6 = sec
    ? L(
        lang,
        `\n\nUnder the dominant tone runs a secondary current of ${sec.en}. The dream is not a single emoji — it is a chord.`,
        `\n\nBaskın tonun altında ${sec.tr} akıntısı dolaşır. Rüya tek emoji değil, bir akordur.`,
      )
    : ''

  return p1 + p2 + p3 + p4 + p5 + p6
}

function sectionPsychology(lang: Lang, b: SceneBible): string {
  const emo = b.emotions[0]
  const creature = b.creatures[0]
  const act = b.action
  const lionFight = creature?.id === 'lion' && act?.id === 'fight'

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

  const p3 = lionFight
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
    `\n\nThe ${b.place.en} is stage design for inner architecture — environment is mood made spatial.`,
    `\n\n${b.place.tr.charAt(0).toUpperCase()}${b.place.tr.slice(1)}, iç mimarinin sahne tasarımıdır — ortam mekânsallaşmış hâldir.`,
  )

  const p5 = L(
    lang,
    `\n\nTreat the dream as data about need and strategy, not a verdict on character. In “${b.excerpt.slice(0, 90)}${b.excerpt.length > 90 ? '…' : ''}”, intention is already half-visible.`,
    `\n\nRüyayı karakter hükmü değil, ihtiyaç ve strateji verisi sayın. “${b.excerpt.slice(0, 90)}${b.excerpt.length > 90 ? '…' : ''}” içinde niyet yarı görünürdür.`,
  )

  const p6 =
    b.drama >= 0.7
      ? L(
          lang,
          '\n\nHigh-arousal dreams leave residual charge. Ground after waking: water, longer exhales, name five colors in the room — so insight can land without jitter.',
          '\n\nYüksek uyarılmalı rüyalar artakalan yük bırakır. Uyanınca topraklanın: su, uzun nefes veriş, odada beş renk — içgörü titreme olmadan insin.',
        )
      : ''

  return p1 + p2 + p3 + p4 + p5 + p6
}

function sectionHidden(lang: Lang, b: SceneBible): string {
  const lines: string[] = [
    L(
      lang,
      'Beneath the plot, invitations often hide inside images:',
      'Olay örgüsünün altında davetler çoğu zaman imgelerin içinde gizlidir:',
    ),
  ]

  const emo = b.emotions[0]
  const creature = b.creatures[0]
  const act = b.action

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
  if (b.objects.some((o) => o.id === 'door' || o.id === 'key' || o.id === 'bridge')) {
    lines.push(
      L(
        lang,
        '• Threshold symbols imply a decision already half-made — the dream lets you feel cost and promise.',
        '• Eşik sembolleri yarı verilmiş kararı ima eder — rüya bedeli ve vaadi hissettirir.',
      ),
    )
  }
  if (b.objects.some((o) => o.id === 'water')) {
    lines.push(
      L(
        lang,
        '• Water asks for feeling before fixing. Management without mourning keeps dreams loud.',
        '• Su, düzeltmeden önce hissetmeyi ister. Yas tutmadan yönetmek rüyaları gürültülü tutar.',
      ),
    )
  }
  if (b.drama >= 0.7) {
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
  b: SceneBible,
): { text: string; questions: string[] } {
  const emo = b.emotions[0]
  const creature = b.creatures[0]
  const act = b.action
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
  if (emo?.id === 'fear' || b.drama >= 0.7) {
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

function sectionThemes(lang: Lang, b: SceneBible): string {
  const themes: string[] = []
  const emo = b.emotions[0]
  const act = b.action
  const creature = b.creatures[0]

  if (creature?.id === 'lion' || act?.id === 'fight') {
    themes.push(
      L(lang, 'Initiation & the trial of power', 'İnisiasyon ve güç imtihanı'),
      L(lang, 'Shadow strength / noble aggression', 'Gölge güç / soylu saldırganlık'),
    )
  }
  if (emo?.id === 'freedom' || act?.id === 'fly') {
    themes.push(L(lang, 'Liberation & wider perspective', 'Özgürleşme ve geniş bakış'))
  }
  if (b.objects.some((o) => o.id === 'door' || o.id === 'bridge' || o.id === 'key')) {
    themes.push(L(lang, 'Thresholds & life transitions', 'Eşikler ve hayat geçişleri'))
  }
  if (b.objects.some((o) => o.id === 'water')) {
    themes.push(L(lang, 'Emotional flow & cleansing', 'Duygusal akış ve arınma'))
  }
  if (emo?.id === 'love') {
    themes.push(L(lang, 'Attachment, care, and longing', 'Bağlanma, özen ve özlem'))
  }
  if (emo?.id === 'fear' || b.drama >= 0.7) {
    themes.push(L(lang, 'Courage under pressure', 'Baskı altında cesaret'))
  }
  if (b.place.id === 'forest') {
    themes.push(L(lang, 'Descent into the living unknown', 'Canlı bilinmeze iniş'))
  }
  if (emo?.id === 'nostalgia') {
    themes.push(L(lang, 'Memory & the inner child', 'Bellek ve iç çocuk'))
  }
  if (!themes.length) {
    themes.push(
      L(lang, 'Self-inquiry through night images', 'Gece imgeleriyle öz-sorgulama'),
      L(lang, 'Feeling made visible', 'Görünür kılınmış his'),
    )
  }

  const intro = L(
    lang,
    'This dream resonates with wider human motifs found in myth, art, and depth psychology:',
    'Bu rüya mit, sanat ve derinlik psikolojisinde bulunan daha geniş insani motiflerle rezonans kurar:',
  )
  const body = themes.map((th) => `• ${th}`).join('\n')
  const myth =
    creature?.id === 'lion' && act?.id === 'fight'
      ? L(
          lang,
          '\n\nMythic echo: lion combat recalls hero initiations where the beast is both obstacle and teacher. Your psyche borrows that ancient grammar for a modern pressure.',
          '\n\nMitik yankı: aslan savaşı kahraman inisiasyonlarını hatırlatır; canavar hem engel hem öğretmendir. Psişeniz modern bir baskı için o eski grameri ödünç alır.',
        )
      : L(
          lang,
          '\n\nThese motifs endure because they mark universal passages of growth. Your dream personalizes them — that personalization is the gift.',
          '\n\nBu motifler büyümeye dair evrensel geçitleri işaret ettiği için sürer. Rüyanız onları kişiselleştirir — hediye budur.',
        )

  return `${intro}\n${body}${myth}`
}
