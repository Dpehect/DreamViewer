/**
 * Dream analysis engine
 * Parses text (TR/EN) → Scene Bible → rich image prompt + multi-section report
 *
 * Goals:
 * - Faithful to the dreamer's narrative (not generic stock scenes)
 * - Image prompts that read like art-direction briefs for Grok Imagine
 * - Analysis dense enough for real reflection, still non-clinical
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

/** Content words for grounding the image prompt in the dreamer's lexicon */
function extractPhrases(text: string): string[] {
  const stop = new Set([
    'bir', 've', 'ile', 'the', 'and', 'was', 'were', 'gibi', 'sonra', 'çok', 'ama',
    'that', 'this', 'için', 'ben', 'my', 'then', 'gördüm', 'oldu', 'birden', 'there',
    'from', 'with', 'over', 'into', 'onto', 'olan', 'olarak', 'kadar', 'daha', 'her',
    'var', 'yok', 'beni', 'bana', 'seni', 'onun', 'they', 'them', 'have', 'had',
  ])
  const out: string[] = []
  for (const w of text.replace(/[.,;:!?…"""'()\-]/g, ' ').split(/\s+/)) {
    if (w.length < 3 || stop.has(w.toLowerCase())) continue
    if (!out.some((x) => x.toLowerCase() === w.toLowerCase())) out.push(w)
    if (out.length >= 18) break
  }
  return out
}

function cap(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function clipExcerpt(raw: string, n: number): string {
  const t = raw.trim()
  if (t.length <= n) return t
  return `${t.slice(0, n - 1).trim()}…`
}

/* ── Lexicons ────────────────────────────────────────────── */

const EMOTIONS = [
  { keys: ['kork', 'fear', 'scared', 'terrif', 'kâbus', 'kabus', 'nightmare', 'panik', 'dehşet'], id: 'fear', en: 'vigilant dread', tr: 'uyanık ürperti', w: 4 },
  { keys: ['savaş', 'dövüş', 'kavga', 'fight', 'battle', 'struggle', 'mücadele', 'çatış'], id: 'conflict', en: 'fierce confrontation', tr: 'şiddetli yüzleşme', w: 5 },
  { keys: ['cesaret', 'güç', 'brave', 'courage', 'power', 'strong', 'zafer', 'kahraman'], id: 'courage', en: 'courageous force', tr: 'cesur güç', w: 4 },
  { keys: ['üzgün', 'hüzün', 'ağla', 'sad', 'cry', 'melanchol', 'yalnız', 'alone', 'keder'], id: 'sadness', en: 'deep melancholy', tr: 'derin hüzün', w: 3 },
  { keys: ['mutlu', 'neşe', 'happy', 'joy', 'gül', 'sevinç', 'keyif'], id: 'joy', en: 'radiant joy', tr: 'ışıyan neşe', w: 3 },
  { keys: ['aşk', 'sevgi', 'love', 'kalp', 'heart', 'öp', 'sarıl', 'tutku'], id: 'love', en: 'tender longing', tr: 'şefkatli özlem', w: 3 },
  { keys: ['huzur', 'sakin', 'calm', 'peace', 'dingin', 'sessiz'], id: 'calm', en: 'luminous serenity', tr: 'ışıltılı huzur', w: 3 },
  { keys: ['uç', 'uçmak', 'fly', 'süzül', 'özgür', 'freedom', 'serbest'], id: 'freedom', en: 'weightless liberation', tr: 'ağırlıksız özgürlük', w: 3 },
  { keys: ['kaç', 'koş', 'run', 'chase', 'takip', 'koval'], id: 'urgency', en: 'breathless urgency', tr: 'nefes kesen aciliyet', w: 3 },
  { keys: ['öfke', 'kızgın', 'angry', 'rage', 'sinir'], id: 'anger', en: 'raw sacred anger', tr: 'ham kutsal öfke', w: 4 },
  { keys: ['nostalji', 'çocuk', 'childhood', 'anı', 'geçmiş', 'eski', 'hatıra'], id: 'nostalgia', en: 'bittersweet nostalgia', tr: 'buruk nostalji', w: 2 },
  { keys: ['şaş', 'hayret', 'wonder', 'awe', 'mucize', 'büyü'], id: 'wonder', en: 'awe-struck wonder', tr: 'hayret dolu huşu', w: 2 },
  { keys: ['utanç', 'shame', 'mahcup', 'gizle'], id: 'shame', en: 'quiet shame', tr: 'sessiz utanç', w: 3 },
  { keys: ['merak', 'curious', 'keşfet', 'soru'], id: 'curiosity', en: 'curious pull', tr: 'meraklı çekim', w: 2 },
] as const

const PLACES = [
  {
    keys: ['orman', 'forest', 'ağaç', 'tree', 'koru'],
    id: 'forest',
    en: 'forest',
    tr: 'orman',
    scene:
      'an ancient atmospheric forest: towering trunks, moss carpets, shafts of misted light, ferns, soft undergrowth, depth fading into blue-green haze',
    moodPlace: 'living unconscious, initiation path, quiet secrets',
  },
  {
    keys: ['deniz', 'ocean', 'sea', 'okyanus', 'kıyı', 'sahil', 'beach'],
    id: 'sea',
    en: 'sea',
    tr: 'deniz',
    scene:
      'a cinematic seascape: luminous layered waves, wet sand reflections, endless horizon, salt air haze, tide lines',
    moodPlace: 'emotional expanse, horizon of feeling',
  },
  {
    keys: ['gökyüzü', 'sky', 'bulut', 'cloud', 'ufuk'],
    id: 'sky',
    en: 'sky',
    tr: 'gökyüzü',
    scene:
      'an infinite dream-sky among sculpted pastel clouds, aerial perspective, soft gradient atmosphere, vast negative space',
    moodPlace: 'perspective, weightlessness, spirit',
  },
  {
    keys: ['ev', 'house', 'home', 'oda', 'room', 'koridor', 'merdiven'],
    id: 'house',
    en: 'home interior',
    tr: 'ev içi',
    scene:
      'a liminal childhood house: warm strange interior light, slightly warped geometry, soft wallpaper memory, doorways leading to other moods',
    moodPlace: 'identity architecture, family psyche, privacy',
  },
  {
    keys: ['şehir', 'city', 'cadde', 'sokak', 'bina'],
    id: 'city',
    en: 'city',
    tr: 'şehir',
    scene:
      'a hushed dream-city: empty or sparsely populated streets, soft rain haze, glowing windows, architectural silence',
    moodPlace: 'collective mind, anonymity, night paths',
  },
  {
    keys: ['bahçe', 'garden', 'çiçek', 'gül', 'park'],
    id: 'garden',
    en: 'garden',
    tr: 'bahçe',
    scene:
      'a secret garden at dusk: blooming overgrowth, wet petals, stone paths, soft bioluminescent accents, intimate enclosure',
    moodPlace: 'tended soul, growth, protected beauty',
  },
  {
    keys: ['çöl', 'desert', 'savan', 'ova', 'plain', 'step', 'steppe', 'altın ova'],
    id: 'savanna',
    en: 'open plain',
    tr: 'açık ova',
    scene:
      'a golden-peach open plain under a vast emotional sky: dry grass, distant heat shimmer, monumental sky weight, mythic scale',
    moodPlace: 'trial ground, exposure, destiny stage',
  },
  {
    keys: ['dağ', 'mountain', 'zirve', 'tepe'],
    id: 'mountain',
    en: 'mountains',
    tr: 'dağlar',
    scene:
      'dramatic mountain ridges fading into pastel mist, cliff edges, cold thin air, layered silhouettes, sacred height',
    moodPlace: 'ascent, challenge, solitude',
  },
  {
    keys: ['uzay', 'space', 'yıldız', 'star', 'galaksi', 'nebula'],
    id: 'cosmos',
    en: 'cosmos',
    tr: 'kozmos',
    scene:
      'a soft cosmic expanse: nebulae, starfields, floating islands of light dust, gentle gravity of wonder',
    moodPlace: 'transcendence, vast self',
  },
  {
    keys: ['arena', 'stadyum', 'alan', 'meydan'],
    id: 'arena',
    en: 'mythic arena',
    tr: 'mitik arena',
    scene:
      'a mythic open arena of stone and dust under theatrical light, circular stage of fate, spectators as shadows or empty stands',
    moodPlace: 'public trial, honor, confrontation',
  },
  {
    keys: ['göl', 'lake', 'nehir', 'river', 'dere'],
    id: 'waterbody',
    en: 'still waters',
    tr: 'sakin sular',
    scene:
      'a mirror-like lake or slow river: reflective surface doubling the sky, reeds, soft ripples, liminal shoreline',
    moodPlace: 'reflection, depth of feeling',
  },
  {
    keys: ['mağara', 'cave', 'tünel', 'tunnel', 'yeraltı'],
    id: 'cave',
    en: 'cave',
    tr: 'mağara',
    scene:
      'a cavern of stone and soft biolight: dripping mineral walls, narrow mouth of daylight, echo-space of the deep psyche',
    moodPlace: 'descent, womb of transformation',
  },
  {
    keys: ['okul', 'school', 'sınıf', 'classroom'],
    id: 'school',
    en: 'school',
    tr: 'okul',
    scene:
      'a dream-school corridor or classroom with skewed perspective, chalk dust light, empty desks, soft institutional pastel',
    moodPlace: 'evaluation, belonging, unfinished lessons',
  },
] as const

const CREATURES = [
  {
    keys: ['aslan', 'lion', 'aslanlar', 'lions'],
    id: 'lion',
    en: 'lion',
    tr: 'aslan',
    visual:
      'majestic lions with anatomically convincing powerful bodies, golden-rose and amber fur catching cinematic rim light, intelligent fierce eyes, noble muscle structure, no cartoon stylization',
  },
  {
    keys: ['kaplan', 'tiger'],
    id: 'tiger',
    en: 'tiger',
    tr: 'kaplan',
    visual:
      'a powerful tiger with painterly yet realistic stripes, velvet orange-black coat, regal amber eyes, silent coiled strength',
  },
  {
    keys: ['kurt', 'wolf', 'kurtlar'],
    id: 'wolf',
    en: 'wolf',
    tr: 'kurt',
    visual:
      'wolves with silver-dust and ash fur, intelligent amber eyes, lean wild grace, pack presence',
  },
  {
    keys: ['yılan', 'snake', 'serpent'],
    id: 'snake',
    en: 'serpent',
    tr: 'yılan',
    visual:
      'a luminous serpent with iridescent pastel-oil scales, elegant coiling geometry, hypnotic still eyes',
  },
  {
    keys: ['kedi', 'cat', 'kediler'],
    id: 'cat',
    en: 'cat',
    tr: 'kedi',
    visual:
      'a soft-furred cat with luminous eyes, poised independent body language, silver or midnight coat catching specular light',
  },
  {
    keys: ['kuş', 'bird', 'kuşlar', 'birds', 'kartal', 'eagle', 'karga'],
    id: 'bird',
    en: 'birds',
    tr: 'kuşlar',
    visual:
      'birds as soft messengers — detailed wing structure, motion blur on feathers, sky-slicing silhouettes',
  },
  {
    keys: ['at', 'horse', 'atlar'],
    id: 'horse',
    en: 'horse',
    tr: 'at',
    visual:
      'pale or dark powerful horses with manes flowing like liquid light, muscular realism, mythic nobility',
  },
  {
    keys: ['canavar', 'monster', 'beast', 'ejder', 'dragon'],
    id: 'beast',
    en: 'beast',
    tr: 'canavar',
    visual:
      'a symbolic powerful beast form — elegant silhouette, textured hide, awe not gore, dream-creature anatomy',
  },
  {
    keys: ['balık', 'fish', 'balina', 'whale', 'yunus'],
    id: 'fish',
    en: 'sea creature',
    tr: 'deniz yaratığı',
    visual:
      'a luminous aquatic creature moving through layered water light, scales or skin catching caustics',
  },
  {
    keys: ['köpek', 'dog', 'köpekler'],
    id: 'dog',
    en: 'dog',
    tr: 'köpek',
    visual:
      'a loyal dog with expressive eyes, soft fur detail, emotional presence as companion or guide',
  },
] as const

const OBJECTS = [
  {
    keys: ['kapı', 'door', 'geçit', 'gate', 'eşik'],
    id: 'door',
    en: 'Door',
    tr: 'Kapı',
    visual: 'a luminous monumental doorway or gate as threshold — light spilling from beyond',
  },
  {
    keys: ['ayna', 'mirror'],
    id: 'mirror',
    en: 'Mirror',
    tr: 'Ayna',
    visual: 'a freestanding ornate mirror reflecting another sky or self, slight dream distortion',
  },
  {
    keys: ['kılıç', 'sword', 'silah', 'weapon', 'mızrak'],
    id: 'weapon',
    en: 'Weapon',
    tr: 'Silah',
    visual: 'a symbolic weapon catching soft dramatic light — elegant metal, no gore, no brutality porn',
  },
  {
    keys: ['su', 'water', 'yağmur', 'rain', 'dalga', 'wave'],
    id: 'water',
    en: 'Water',
    tr: 'Su',
    visual: 'water as living element — waves, rain veils, reflective pools, translucent layers',
  },
  {
    keys: ['ateş', 'fire', 'alev', 'ember'],
    id: 'fire',
    en: 'Fire',
    tr: 'Ateş',
    visual: 'painterly fire and ember light — warm glow, floating sparks, controlled drama',
  },
  {
    keys: ['anahtar', 'key'],
    id: 'key',
    en: 'Key',
    tr: 'Anahtar',
    visual: 'an ornate floating key with soft specular highlights, metal and memory',
  },
  {
    keys: ['ay', 'moon', 'mehtap'],
    id: 'moon',
    en: 'Moon',
    tr: 'Ay',
    visual: 'a large emotional moon near the horizon, soft crater texture, silver-peach light',
  },
  {
    keys: ['köprü', 'bridge'],
    id: 'bridge',
    en: 'Bridge',
    tr: 'Köprü',
    visual: 'an arched soft bridge as transition between two emotional lands',
  },
  {
    keys: ['kitap', 'book', 'mektup', 'letter'],
    id: 'book',
    en: 'Book / Letter',
    tr: 'Kitap / Mektup',
    visual: 'an open book or letter with faintly glowing text textures (illegible), intimate scale',
  },
  {
    keys: ['saat', 'clock', 'time'],
    id: 'clock',
    en: 'Clock',
    tr: 'Saat',
    visual: 'a dream-clock or melting timepiece, soft surreal presence without cartoon excess',
  },
  {
    keys: ['ışık', 'light', 'lamba', 'candle', 'mum'],
    id: 'light',
    en: 'Light source',
    tr: 'Işık kaynağı',
    visual: 'a singular intimate light source — candle, lantern, or impossible glow as emotional center',
  },
] as const

const ACTIONS = [
  { keys: ['savaş', 'dövüş', 'fight', 'battle', 'struggle', 'mücadele'], id: 'fight', en: 'locked in a fierce but dignified struggle', drama: 0.95 },
  { keys: ['kaç', 'flee', 'escape', 'kurtul'], id: 'flee', en: 'fleeing with urgent, kinetic motion', drama: 0.75 },
  { keys: ['koş', 'run', 'koşuy'], id: 'run', en: 'running through the dream landscape with purpose', drama: 0.55 },
  { keys: ['uç', 'fly', 'süzül', 'uçuy'], id: 'fly', en: 'floating or flying through air with weightless grace', drama: 0.45 },
  { keys: ['yüz', 'swim', 'dalış'], id: 'swim', en: 'swimming through luminous water', drama: 0.35 },
  { keys: ['düş', 'fall', 'düşüy'], id: 'fall', en: 'in a weightless or accelerating fall', drama: 0.55 },
  { keys: ['koru', 'protect', 'savun', 'kucak'], id: 'protect', en: 'protecting someone or something precious', drama: 0.65 },
  { keys: ['bul', 'find', 'keşfet', 'aç'], id: 'find', en: 'discovering a luminous place or object', drama: 0.3 },
  { keys: ['izle', 'watch', 'bak', 'seyret'], id: 'watch', en: 'witnessing the scene with intense presence', drama: 0.25 },
  { keys: ['konuş', 'speak', 'söyle', 'bağır'], id: 'speak', en: 'speaking or calling out into the dream', drama: 0.35 },
  { keys: ['ağla', 'cry', 'weep'], id: 'weep', en: 'emotion breaking through as tears in soft light', drama: 0.4 },
  { keys: ['dans', 'dance', 'şarkı', 'sing'], id: 'dance', en: 'moving as if dance or song holds the world', drama: 0.35 },
] as const

const TIME_OF_DAY = [
  { keys: ['gece', 'night', 'midnight', 'karanlık'], id: 'night', en: 'deep night', lightingBias: 'moonlit and artificial soft glows, high contrast soft shadows' },
  { keys: ['şafak', 'dawn', 'tan', 'sunrise'], id: 'dawn', en: 'dawn', lightingBias: 'horizontal peach-gold dawn light, long shadows, cool residual night' },
  { keys: ['gün batım', 'sunset', 'dusk', 'alacakaranlık', 'akşam'], id: 'dusk', en: 'dusk', lightingBias: 'lavender-peach sunset, rim light, rose clouds' },
  { keys: ['sabah', 'morning', 'gündüz', 'day', 'öğlen'], id: 'day', en: 'daylight', lightingBias: 'soft daylight with dreamlike overcast diffusion' },
] as const

const WEATHER = [
  { keys: ['yağmur', 'rain', 'sağanak'], id: 'rain', en: 'rain', visual: 'fine rain veils, wet surfaces, specular ground, atmospheric depth' },
  { keys: ['sis', 'fog', 'mist', 'pus'], id: 'fog', en: 'fog', visual: 'thick luminous fog, soft occlusion, mystery depth layers' },
  { keys: ['fırtına', 'storm', 'şimşek', 'thunder'], id: 'storm', en: 'storm', visual: 'charged storm sky, distant lightning glow, wind-driven atmosphere' },
  { keys: ['kar', 'snow'], id: 'snow', en: 'snow', visual: 'soft falling snow, muted palette, quiet isolation' },
  { keys: ['rüzgar', 'wind'], id: 'wind', en: 'wind', visual: 'wind-swept fabric and hair, grass lean, airborne particles' },
] as const

const SYMBOL_DB: Record<string, { en: string; tr: string; meanEn: string; meanTr: string }> = {
  lion: {
    en: 'Lion',
    tr: 'Aslan',
    meanEn:
      'Instinctual power, sovereignty, and the raw Self. Fighting lions often means confronting your own strength, pride, anger, or a dominant force in waking life. The lion is both trial and teacher — power you must face without being consumed by it or abandoning yourself to it.',
    meanTr:
      'İçgüdüsel güç, egemenlik ve ham Benlik. Aslanlarla savaşmak çoğu zaman kendi gücünüzle, gururla, öfkeyle veya uyanık hayattaki baskın bir kuvvetle yüzleşmek demektir. Aslan hem imtihan hem öğretmendir — yutulmadan ve teslim olmadan kalabileceğiniz güç.',
  },
  tiger: {
    en: 'Tiger',
    tr: 'Kaplan',
    meanEn:
      'Passionate instinct and beauty fused with danger — desire, creativity, or rage that feels magnetic and risky. The tiger asks whether you can honor intensity without letting it maul your relationships or self-respect.',
    meanTr:
      'Tutkulu içgüdü ve güzelliğin tehlikeyle kaynaşması — manyetik ve riskli arzu, yaratıcılık veya öfke. Kaplan, yoğunluğu ilişkilerinizi veya özsaygınızı parçalamadan onurlandırıp onurlandıramayacağınızı sorar.',
  },
  wolf: {
    en: 'Wolf',
    tr: 'Kurt',
    meanEn:
      'Loyalty, tribe, and wild intelligence. Who is your true pack — and what will you not betray? Lone-wolf scenes may speak to exile; pack scenes to belonging and hierarchy.',
    meanTr:
      'Sadakat, kabile ve yabani zekâ. Gerçek sürünüz kim — neyi ihanet etmezsiniz? Yalnız kurt sahneleri sürgüne; sürü sahneleri aidiyet ve hiyerarşiye işaret edebilir.',
  },
  door: {
    en: 'Door / Threshold',
    tr: 'Kapı / Eşik',
    meanEn:
      'A chapter change. A door marks readiness or resistance toward a decision already forming. Notice whether it is locked, open, glowing, or terrifying — that is the emotional weather of transition.',
    meanTr:
      'Bölüm değişimi. Kapı, oluşmakta olan bir karara hazırlık veya direnci işaret eder. Kilitli, açık, parlayan veya korkutucu oluşu geçişin duygusal havasıdır.',
  },
  water: {
    en: 'Water',
    tr: 'Su',
    meanEn:
      'Emotion in motion: calm water = clarity or depth; storm = overwhelm; rain = release and grief; drowning imagery = saturation without support. Water asks for feeling before fixing.',
    meanTr:
      'Hareket halindeki duygu: sakin su = berraklık veya derinlik; fırtına = taşma; yağmur = salıverme ve yas; boğulma = desteksiz doygunluk. Su, düzeltmeden önce hissetmeyi ister.',
  },
  fire: {
    en: 'Fire',
    tr: 'Ateş',
    meanEn:
      'Transformation, anger, creative heat — or burnout if uncontrolled. Fire can purify a false story or scorch a life that refuses boundaries.',
    meanTr:
      'Dönüşüm, öfke, yaratıcı ısı — kontrolsüzse tükenmişlik. Ateş sahte bir hikâyeyi arındırabilir veya sınır koymayan bir hayatı yakabilir.',
  },
  weapon: {
    en: 'Weapon',
    tr: 'Silah',
    meanEn:
      'Agency and boundary — “I can act,” more than “I want harm.” In dreams a weapon often appears when the psyche is done being only passive or polite.',
    meanTr:
      'Seçim gücü ve sınır — “zarar”dan çok “harekete geçebilirim.” Rüyada silah çoğu zaman psişe yalnızca pasif veya nazik olmaktan bıktığında belirir.',
  },
  fight: {
    en: 'Struggle / Combat',
    tr: 'Mücadele / Savaş',
    meanEn:
      'Active conflict work. Fighting in dreams often means a part of you still believes agency is possible — healthier than frozen helplessness. The quality of the fight (fair, hopeless, heroic, dirty) mirrors how you meet conflict by day.',
    meanTr:
      'Aktif çatışma çalışması. Rüyada savaşmak, bir yanınızın hâlâ seçim gücüne inandığını gösterir — donmuş çaresizlikten daha sağlıklıdır. Kavganın niteliği (adil, umutsuz, kahramanca, kirli) gündüz çatışmaya nasıl yaklaştığınızı yansıtır.',
  },
  flight: {
    en: 'Flight',
    tr: 'Uçmak',
    meanEn:
      'Freedom and perspective — or escape, if fear dominates the tone. Flying high can mean rising above a stuck narrative; struggling to stay aloft can mean fragile new independence.',
    meanTr:
      'Özgürlük ve bakış açısı — ton korkuysa kaçış da olabilir. Yüksekten uçmak sıkışmış bir anlatının üstüne çıkmayı; havada kalmakta zorlanmak kırılgan yeni bağımsızlığı ima edebilir.',
  },
  cat: {
    en: 'Cat',
    tr: 'Kedi',
    meanEn:
      'Independent intuition — the self-possessed part that knows without forcing. Cats often appear when the psyche wants sovereignty without noise.',
    meanTr:
      'Bağımsız sezgi — zorlamadan bilen, kendine hâkim yan. Kediler çoğu zaman psişe gürültüsüz egemenlik istediğinde belirir.',
  },
  bird: {
    en: 'Birds',
    tr: 'Kuşlar',
    meanEn:
      'Messages and spirit — news from a freer self. A flock can be community; a single bird can be a precise omen or a lonely freedom.',
    meanTr:
      'Mesaj ve ruh — daha özgür benlikten haber. Sürü topluluk; tek kuş kesin bir işaret veya yalnız bir özgürlük olabilir.',
  },
  moon: {
    en: 'Moon',
    tr: 'Ay',
    meanEn:
      'Cycles and intuition — what logic cannot fully name. The moon lights the night psyche without the harsh noon of rational control.',
    meanTr:
      'Döngüler ve sezgi — mantığın tam adlandıramadığı. Ay, rasyonel kontrolün sert öğlesi olmadan gece psişesini aydınlatır.',
  },
  mirror: {
    en: 'Mirror',
    tr: 'Ayna',
    meanEn:
      'Honest self-recognition. Which face will you meet without flinching? Distorted mirrors can mean self-image lagging behind truth.',
    meanTr:
      'Dürüst kendini tanıma. Hangi yüzle irkilmeden buluşacaksınız? Bozuk aynalar, benlik imgesinin hakikatin gerisinde kaldığını ima edebilir.',
  },
  key: {
    en: 'Key',
    tr: 'Anahtar',
    meanEn:
      'Access and readiness — you may already hold what opens the next room. Losing a key can mean feeling locked out of your own life.',
    meanTr:
      'Erişim ve hazırlık — sonraki odayı açan şeye zaten sahip olabilirsiniz. Anahtarı kaybetmek, kendi hayatınızın dışında kalmış hissetmek demektir.',
  },
  dreamer: {
    en: 'The Dreamer (You)',
    tr: 'Rüyacı (Siz)',
    meanEn:
      'Your witnessing and acting self. Fight, freeze, fly, or watch — that stance mirrors waking patterns of agency, defense, and hope. The dream-self is less a character and more a live rehearsal of how you meet power and feeling.',
    meanTr:
      'Tanıklık eden ve hareket eden benliğiniz. Savaş, don, uç veya izle — bu duruş uyanık hayattaki seçim, savunma ve umut örüntülerini yansıtır. Rüya-benlik bir karakterden çok, güç ve hisle karşılaşma provasıdır.',
  },
  shadow: {
    en: 'Shadow',
    tr: 'Gölge',
    meanEn:
      'Disowned strength or truth. Darkness is often unintegrated power, not moral failure — the energy you refuse by day returns by night wearing a dramatic costume.',
    meanTr:
      'Sahipsiz güç veya hakikat. Karanlık çoğu zaman ahlaki kusur değil, entegre edilmemiş kuvvettir — gündüz reddettiğiniz enerji gece dramatik bir kostümle döner.',
  },
  forest: {
    en: 'Forest',
    tr: 'Orman',
    meanEn:
      'The living unconscious — growth, mystery, and initiation paths. Getting lost can mean disorientation before a new identity; finding a path can mean emerging guidance.',
    meanTr:
      'Canlı bilinçaltı — büyüme, gizem ve inisiasyon yolları. Kaybolmak yeni kimlik öncesi yön yitimi; yol bulmak beliren rehberlik olabilir.',
  },
  house: {
    en: 'House',
    tr: 'Ev',
    meanEn:
      'Architecture of identity and family psyche — rooms of memory, privacy, unfinished renovations of the self. Attics and basements often hold stored history.',
    meanTr:
      'Kimlik ve aile psişesinin mimarisi — bellek, mahremiyet, benliğin yarım tadilat odaları. Tavan araları ve bodrumlar çoğu zaman depolanmış tarihi tutar.',
  },
  snake: {
    en: 'Serpent',
    tr: 'Yılan',
    meanEn:
      'Transformation and shedding of old skin — fear of snakes often tracks fear of change, sexuality, or instinct. A calm snake can be medicine; a biting snake can be a boundary ignored.',
    meanTr:
      'Dönüşüm ve eski deriyi bırakmak — yılan korkusu çoğu zaman değişim, cinsellik veya içgüdü korkusuna yapışıktır. Sakin yılan ilaç; ısıran yılan ihmal edilmiş sınır olabilir.',
  },
  horse: {
    en: 'Horse',
    tr: 'At',
    meanEn:
      'Vital drive and directed power — instinct that can be ridden, guided, or bolted. A wild horse may be unclaimed life force; a calm horse, integrated will.',
    meanTr:
      'Yaşamsal itki ve yönlendirilmiş güç — binilebilen, güdülebilen veya şahlanan içgüdü. Yabani at sahipsiz yaşam kuvveti; sakin at entegre irade olabilir.',
  },
  beast: {
    en: 'Beast',
    tr: 'Canavar',
    meanEn:
      'The uncivilized truth of a feeling or situation. Beasts in dreams often ask: what have you called “monster” that is actually raw life needing a better container?',
    meanTr:
      'Bir his veya durumun medeniyetsiz hakikati. Rüyadaki canavarlar çoğu zaman sorar: “canavar” dediğiniz aslında daha iyi bir kaba ihtiyaç duyan ham yaşam mı?',
  },
  book: {
    en: 'Book / Letter',
    tr: 'Kitap / Mektup',
    meanEn:
      'Unread knowledge, a message waiting for courage, or a story of the self still being written. Illegible text often means “you know this in the body before the mind.”',
    meanTr:
      'Okunmamış bilgi, cesaret bekleyen mesaj veya hâlâ yazılmakta olan benlik hikâyesi. Okunaksız metin çoğu zaman “bunu zihin bilmeden beden bilir” demektir.',
  },
  clock: {
    en: 'Clock / Time',
    tr: 'Saat / Zaman',
    meanEn:
      'Pressure, mortality, deadlines of the soul, or the sense that a season is ending. Stopped clocks can mean frozen time after trauma or waiting.',
    meanTr:
      'Baskı, ölümlülük, ruhun son tarihleri veya bir mevsimin bittiği hissi. Durmuş saatler travma veya bekleme sonrası donmuş zamanı ima edebilir.',
  },
  bridge: {
    en: 'Bridge',
    tr: 'Köprü',
    meanEn:
      'Transition between two states of life — career, love, identity, grief and recovery. Crossing, refusing, or watching a bridge collapse all carry different truths.',
    meanTr:
      'İki hayat hali arasında geçiş — kariyer, aşk, kimlik, yas ve toparlanma. Köprüyü geçmek, reddetmek veya çöküşünü izlemek farklı hakikatler taşır.',
  },
  light: {
    en: 'Light',
    tr: 'Işık',
    meanEn:
      'Insight, hope, guidance, or the part of you that still knows where warmth is. A single light in darkness is often the psyche’s refusal to abandon you.',
    meanTr:
      'İçgörü, umut, rehberlik veya hâlâ sıcaklığın nerede olduğunu bilen yanınız. Karanlıkta tek ışık çoğu zaman psişenin sizi terk etmeyi reddetmesidir.',
  },
  dog: {
    en: 'Dog',
    tr: 'Köpek',
    meanEn:
      'Loyalty, protection, and uncomplicated love — or, if threatening, a distorted attachment or guilt about fidelity. Dogs often guard the heart’s simple truths.',
    meanTr:
      'Sadakat, koruma ve yalın sevgi — tehditkârsa çarpık bağlanma veya sadakat suçu. Köpekler çoğu zaman kalbin yalın doğrularını korur.',
  },
  fish: {
    en: 'Sea creature',
    tr: 'Deniz yaratığı',
    meanEn:
      'Contents of the deep emotional unconscious rising into awareness — fertility of feeling, messages from silence, life below the surface mind.',
    meanTr:
      'Derin duygusal bilinçaltının farkındalığa yükselen içerikleri — hissin bereketi, sessizlikten mesaj, yüzey zihnin altındaki yaşam.',
  },
  fall: {
    en: 'Falling',
    tr: 'Düşmek',
    meanEn:
      'Loss of control, surrender, or the terror of unsupported change. Sometimes a fall is the psyche teaching you that free-fall can become flight.',
    meanTr:
      'Kontrol kaybı, teslimiyet veya desteksiz değişim dehşeti. Bazen düşüş, psişenin serbest düşüşün uçuşa dönüşebileceğini öğretmesidir.',
  },
  school: {
    en: 'School',
    tr: 'Okul',
    meanEn:
      'Evaluation, belonging, unfinished lessons, and the inner critic’s classroom. Dreams of tests often track performance anxiety or a life lesson still incomplete.',
    meanTr:
      'Değerlendirme, aidiyet, yarım dersler ve iç eleştirmenin sınıfı. Sınav rüyaları çoğu zaman performans kaygısını veya tamamlanmamış bir hayat dersini izler.',
  },
}

/* ── Scene bible ─────────────────────────────────────────── */

type PlaceView = {
  id: string
  en: string
  tr: string
  scene: string
  moodPlace: string
}

type PaletteSpec = {
  /** Short hex-friendly list for prompt */
  colors: string
  /** Emotional reading of the palette */
  storyEn: string
  storyTr: string
}

type LightSpec = {
  en: string
  /** Full lighting direction for image model */
  direction: string
}

type StyleSpec = {
  name: string
  direction: string
}

type SceneBible = {
  seed: number
  variation: number
  excerpt: string
  shortExcerpt: string
  phrases: string[]
  emotions: Scored<(typeof EMOTIONS)[number]>[]
  place: PlaceView
  creatures: Scored<(typeof CREATURES)[number]>[]
  objects: Scored<(typeof OBJECTS)[number]>[]
  action?: Scored<(typeof ACTIONS)[number]>
  timeOfDay?: Scored<(typeof TIME_OF_DAY)[number]>
  weather?: Scored<(typeof WEATHER)[number]>
  drama: number
  palette: PaletteSpec
  lighting: LightSpec
  artStyle: StyleSpec
  atmosphereEn: string
  atmosphereTr: string
  subjectFocus: string
}

function buildPalette(drama: number, emoId?: string, seed = 0): PaletteSpec {
  if (emoId === 'fear' || emoId === 'anger') {
    return {
      colors:
        'deep plum shadow (#3d2a42), bruised violet (#6b4c7a), cold steel blue (#7a8fa8), ember rose (#c47a7a), pale bone highlight (#f0e6dc)',
      storyEn: 'a tense, nocturnal palette — beauty held inside threat',
      storyTr: 'gerilimli, geceye ait bir palet — tehdidin içindeki güzellik',
    }
  }
  if (emoId === 'sadness' || emoId === 'nostalgia') {
    return {
      colors:
        'dusty mauve (#b89bb0), faded denim blue (#8aa0b8), soft grey-lilac (#c5b8c8), muted gold memory (#d4c09a), milk fog (#f2eef2)',
      storyEn: 'a bittersweet, memory-washed palette with gentle desaturation',
      storyTr: 'buruk, bellek yıkanmış, yumuşak doygunluksuz bir palet',
    }
  }
  if (emoId === 'love' || emoId === 'joy') {
    return {
      colors:
        'blush rose (#f3b6c8), warm apricot (#f0b888), soft gold (#e8c97a), lilac silk (#c9b4e8), cream light (#fff6ee)',
      storyEn: 'a tender, luminous romantic palette with warm accents',
      storyTr: 'narin, ışıltılı, romantik ve sıcak vurgulu bir palet',
    }
  }
  if (emoId === 'calm' || emoId === 'freedom' || emoId === 'wonder') {
    return {
      colors:
        'powder blue (#a8c8e8), mint mist (#a8e0c8), lavender air (#c8b8e8), pearl white (#f7f4ff), soft sunrise peach (#f5d0b8)',
      storyEn: 'an airy ethereal palette — breath, space, and soft wonder',
      storyTr: 'havadar, ethereal bir palet — nefes, boşluk ve yumuşak hayret',
    }
  }
  if (drama >= 0.7) {
    return pick(
      [
        {
          colors:
            'dusty rose gold (#e8b4a0), deep lavender dusk (#8b7a9e), peach amber (#f0c090), soft plum shadow (#5c4a62), misty ivory (#f4ebe4)',
          storyEn: 'epic pastel drama — dusk gold meeting purple shadow',
          storyTr: 'epik pastel drama — mor gölgeyle buluşan alacakaranlık altını',
        },
        {
          colors:
            'cinematic terracotta (#c9886a), indigo dusk (#4a4e78), champagne haze (#e8d4b8), copper ember (#c47a4a), cool slate (#6a7088)',
          storyEn: 'mythic earth-and-sky drama with warm hero light',
          storyTr: 'sıcak kahraman ışığıyla mitik yer-gök dramı',
        },
      ] as const,
      seed,
    )
  }
  return pick(
    [
      {
        colors:
          'blush pink (#f6c1d4), soft lavender (#c4b5fd), powder blue (#93c5fd), mint (#6ee7b7), warm peach (#fdba74)',
        storyEn: 'classic dreamcore pastels — soft, museum-friendly harmony',
        storyTr: 'klasik rüya-pastel uyumu — yumuşak, müzeye yakışır harmoni',
      },
      {
        colors:
          'rose quartz (#e8b4c8), periwinkle (#a8b4e8), butter cream (#f5e6c8), sage whisper (#b8d4c0), lilac mist (#d4c4e8)',
        storyEn: 'quiet gemstone pastels with gentle contrast',
        storyTr: 'yumuşak kontrastlı sakin mücevher pastelleri',
      },
    ] as const,
    seed,
  )
}

function buildLighting(
  drama: number,
  emoId: string | undefined,
  time?: Scored<(typeof TIME_OF_DAY)[number]>,
  weather?: Scored<(typeof WEATHER)[number]>,
  seed = 0,
): LightSpec {
  const timeBit = time?.lightingBias ?? ''
  const weatherBit = weather
    ? weather.id === 'storm'
      ? 'intermittent storm light, charged atmosphere'
      : weather.id === 'fog'
        ? 'light scattering through fog, soft halos'
        : weather.id === 'rain'
          ? 'wet reflections, rain-softened key light'
          : weather.id === 'snow'
            ? 'diffuse overcast snow light'
            : 'wind-carried particulate light'
    : ''

  if (drama >= 0.75) {
    return {
      en: 'cinematic dramatic light',
      direction: [
        'cinematic volumetric lighting with a strong emotional key light and soft pastel fill',
        'subtle god-rays or rim light separating subject from atmosphere',
        'controlled contrast, dust and fine particles in air, museum-grade light design',
        timeBit,
        weatherBit,
        emoId === 'fear' ? 'cooler shadows, warmer highlights on faces and eyes for tension' : '',
      ]
        .filter(Boolean)
        .join('; '),
    }
  }

  return {
    en: pick(
      ['diffused dream light', 'soft volumetric glow', 'gentle sfumato illumination'] as const,
      seed,
    ),
    direction: [
      'diffused pastel volumetric light, gentle bloom, soft contact shadows',
      'painterly light falloff, no harsh flash, coherent single light logic',
      timeBit || 'timeless dream hour between day and night',
      weatherBit,
    ]
      .filter(Boolean)
      .join('; '),
  }
}

function buildArtStyle(drama: number, seed: number): StyleSpec {
  if (drama >= 0.75) {
    return pick(
      [
        {
          name: 'cinematic romantic realism',
          direction:
            'cinematic fine-art still, romantic realism, realistic anatomy with painterly brush discipline, epic yet elegant composition, museum-quality concept art, filmic color grade, not cartoon, not anime, not stock photo',
        },
        {
          name: 'mythic oil drama',
          direction:
            'dramatic romantic-realism oil painting energy, soft pastel emotion inside high-stakes scene, gallery masterpiece finish, refined texture, noble drama',
        },
        {
          name: 'high-end film concept',
          direction:
            'high-end film concept art still frame, anamorphic sense of depth, artistic matte-painting quality, coherent world-building, premium illustration',
        },
      ] as const,
      seed,
    )
  }
  return pick(
    [
      {
        name: 'ethereal fine art',
        direction:
          'museum-quality fine art digital painting, soft oil and pastel brushwork, ethereal dreamcore, poetic realism, sfumato edges, premium gallery illustration',
      },
      {
        name: 'poetic sfumato',
        direction:
          'poetic realism with sfumato transitions, delicate atmospheric perspective, refined color harmony, contemplative fine-art mood',
      },
      {
        name: 'pastel dream painting',
        direction:
          'contemporary fine-art dream painting, airy pastel light, tactile pigment feel, quiet magical realism, no kawaii or cartoon language',
      },
    ] as const,
    seed,
  )
}

function buildAtmosphere(
  emo: Scored<(typeof EMOTIONS)[number]> | undefined,
  place: PlaceView,
  drama: number,
  weather?: Scored<(typeof WEATHER)[number]>,
): { en: string; tr: string } {
  const eEn = emo?.en ?? 'layered wonder'
  const eTr = emo?.tr ?? 'katmanlı hayret'
  const wEn = weather ? `, ${weather.en} in the air` : ''
  const wTr = weather
    ? weather.id === 'rain'
      ? ', havada yağmur'
      : weather.id === 'fog'
        ? ', havada sis'
        : weather.id === 'storm'
          ? ', havada fırtına'
          : weather.id === 'snow'
            ? ', havada kar'
            : ', havada rüzgâr'
    : ''
  const scaleEn =
    drama >= 0.75 ? 'mythic, high-stakes emotional scale' : 'intimate yet spatially deep emotional scale'
  const scaleTr =
    drama >= 0.75 ? 'mitik, yüksek riskli duygusal ölçek' : 'samimi ama mekânsal olarak derin duygusal ölçek'

  return {
    en: `${eEn} saturates a ${place.en} (${place.moodPlace})${wEn}; ${scaleEn}; mood before plot, feeling made spatial`,
    tr: `${eTr}, bir ${place.tr} mekânını (${place.moodPlace}) doldurur${wTr}; ${scaleTr}; olaydan önce hâl, mekânsallaşmış his`,
  }
}

function buildSubjectFocus(b: {
  creatures: Scored<(typeof CREATURES)[number]>[]
  action?: Scored<(typeof ACTIONS)[number]>
  place: PlaceView
  drama: number
}): string {
  const c = b.creatures[0]
  const act = b.action
  if (c && act) {
    return `primary focal subject: the dreamer in relation to ${c.en}(s), action = ${act.en}, clear hero focal point inside the ${b.place.en}`
  }
  if (c) {
    return `primary focal subject: ${c.en} as living symbol of power/feeling, dreamer presence implied or visible, clear silhouette hierarchy in the ${b.place.en}`
  }
  if (act) {
    return `primary focal subject: the dreamer figure ${act.en}, emotional body language readable at a glance, environment as second character`
  }
  return b.drama >= 0.7
    ? `primary focal subject: a human dreamer figure with strong emotional presence inside a vast ${b.place.en}, epic scale, clear center of interest`
    : `primary focal subject: a human dreamer figure with quiet emotional presence inside a ${b.place.en}, breathing negative space, clear center of interest`
}

function buildBible(dreamText: string, variation: number): SceneBible {
  const raw = dreamText.trim()
  const lower = raw.toLowerCase()
  const seed = (hash(lower) + variation * 7919) >>> 0
  const excerpt = raw.length > 700 ? `${raw.slice(0, 697)}…` : raw

  const emotions = rank(lower, EMOTIONS)
  const places = rank(lower, PLACES)
  const creatures = rank(lower, CREATURES)
  const objects = rank(lower, OBJECTS)
  const actions = rank(lower, ACTIONS)
  const times = rank(lower, TIME_OF_DAY)
  const weathers = rank(lower, WEATHER)

  const emo = emotions[0]
  const act = actions[0]
  const creature = creatures[0]
  const timeOfDay = times[0]
  const weather = weathers[0]

  let drama = Number(act?.drama ?? 0.25)
  if (emo && ['conflict', 'fear', 'anger', 'courage', 'urgency'].includes(emo.id)) {
    drama = Math.max(drama, 0.7)
  }
  if (creatures.some((c) => ['lion', 'tiger', 'beast', 'wolf'].includes(c.id))) {
    drama = Math.max(drama, 0.75)
  }
  if (has(lower, ['aslan', 'lion', 'savaş', 'fight', 'battle', 'kâbus', 'kabus', 'nightmare'])) {
    drama = Math.max(drama, 0.85)
  }
  if (weather?.id === 'storm') drama = Math.max(drama, 0.7)
  drama = Math.min(1, drama + (variation % 3) * 0.02)

  let place: PlaceView
  if (places[0]) {
    place = {
      id: places[0].id,
      en: places[0].en,
      tr: places[0].tr,
      scene: places[0].scene,
      moodPlace: places[0].moodPlace,
    }
  } else if (creature && (creature.id === 'lion' || creature.id === 'tiger')) {
    const sav = PLACES.find((p) => p.id === 'savanna')!
    place = { id: sav.id, en: sav.en, tr: sav.tr, scene: sav.scene, moodPlace: sav.moodPlace }
  } else if (drama >= 0.8) {
    const ar = PLACES.find((p) => p.id === 'arena')!
    place = { id: ar.id, en: ar.en, tr: ar.tr, scene: ar.scene, moodPlace: ar.moodPlace }
  } else {
    place = {
      id: 'liminal',
      en: 'liminal dreamscape',
      tr: 'eşiksel rüya manzarası',
      scene:
        'a vast emotional dream landscape between earth and sky, soft impossible geography, cinematic scale, coherent horizon, poetic ground textures',
      moodPlace: 'open psyche, unbound stage',
    }
  }

  const palette = buildPalette(drama, emo?.id, seed)
  const lighting = buildLighting(drama, emo?.id, timeOfDay, weather, seed)
  const artStyle = buildArtStyle(drama, seed)
  const atmosphere = buildAtmosphere(emo, place, drama, weather)

  const bibleCore = {
    creatures,
    action: act,
    place,
    drama,
  }

  return {
    seed,
    variation,
    excerpt,
    shortExcerpt: clipExcerpt(raw, 160),
    phrases: extractPhrases(raw),
    emotions,
    place,
    creatures,
    objects,
    action: act,
    timeOfDay,
    weather,
    drama,
    palette,
    lighting,
    artStyle,
    atmosphereEn: atmosphere.en,
    atmosphereTr: atmosphere.tr,
    subjectFocus: buildSubjectFocus(bibleCore),
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

  const title = buildTitle(lang, bible.seed, creature?.id, act?.id, bible.place.id, emo?.id)
  const mood = emo
    ? emo[lang === 'tr' ? 'tr' : 'en']
    : L(lang, 'layered wonder', 'katmanlı hayret')

  const tags = [
    mood,
    lang === 'tr' ? bible.place.tr : bible.place.en,
    ...bible.creatures.slice(0, 2).map((c) => (lang === 'tr' ? c.tr : c.en)),
    ...bible.objects.slice(0, 1).map((o) => (lang === 'tr' ? o.tr : o.en)),
    bible.timeOfDay ? bible.timeOfDay.en : null,
  ].filter((x): x is string => Boolean(x))

  const advice = sectionAdvice(lang, bible)

  return {
    seed: bible.seed,
    variation,
    title,
    mood,
    tags: [...new Set(tags)].slice(0, 8),
    imagePrompt: buildImagePrompt(bible),
    imageNote: L(
      lang,
      bible.drama >= 0.65
        ? `${bible.artStyle.name} · ${bible.lighting.en} · emotional pastel drama`
        : `${bible.artStyle.name} · ${bible.lighting.en} · soft poetic light`,
      bible.drama >= 0.65
        ? `${bible.artStyle.name} · duygusal pastel drama`
        : `${bible.artStyle.name} · yumuşak poetik ışık`,
    ),
    drama: bible.drama,
    emotionalAtmosphere: sectionEmotional(lang, bible),
    symbols: buildSymbols(lang, bible),
    psychology: sectionPsychology(lang, bible),
    hiddenMessages: sectionHidden(lang, bible),
    personalAdvice: advice.text,
    reflectionQuestions: advice.questions,
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
  emotion?: string,
): string {
  if (creature === 'lion' && action === 'fight') {
    return L(lang, 'Trial of the Lions', 'Aslanların İmtihanı')
  }
  if (creature === 'lion') return L(lang, 'The Golden Roar', 'Altın Kükreme')
  if (creature === 'tiger' && action === 'fight') {
    return L(lang, 'The Striped Threshold', 'Çizgili Eşik')
  }
  if (action === 'fight') return L(lang, 'Night of Confrontation', 'Yüzleşme Gecesi')
  if (action === 'fly') return L(lang, 'Weightless Kingdom', 'Ağırlıksız Krallık')
  if (action === 'fall') return L(lang, 'The Soft Descent', 'Yumuşak İniş')
  if (place === 'forest') return L(lang, 'Canopy of Secrets', 'Sır Gölgeliği')
  if (place === 'house') return L(lang, 'Rooms of Memory', 'Bellek Odaları')
  if (place === 'sea' || place === 'waterbody') return L(lang, 'Tide of the Heart', 'Kalbin Gelgiti')
  if (emotion === 'love') return L(lang, 'Tender Gravity', 'Narin Yerçekimi')
  if (emotion === 'fear') return L(lang, 'The Watchful Dark', 'Uyanık Karanlık')
  if (emotion === 'freedom') return L(lang, 'Open Air Covenant', 'Açık Hava Ahitı')
  return pick(
    lang === 'tr'
      ? (['Sessiz Eşik', 'Şeftali Ufuk', 'Lavanta Alacakaranlık', 'Açık Kapı', 'Pembe Kor', 'Gizli Işık', 'İkinci Ay'] as const)
      : (['Quiet Threshold', 'Peach Horizon', 'Lavender Dusk', 'The Open Gate', 'Pink Embers', 'Hidden Light', 'Second Moon'] as const),
    seed,
  )
}

function buildSymbols(lang: Lang, b: SceneBible): SymbolReading[] {
  const ids: string[] = []
  for (const c of b.creatures.slice(0, 3)) ids.push(c.id)
  for (const o of b.objects.slice(0, 3)) ids.push(o.id)
  if (b.action?.id === 'fight') ids.push('fight')
  if (b.action?.id === 'fly') ids.push('flight')
  if (b.action?.id === 'fall') ids.push('fall')
  if (b.emotions[0]?.id === 'fear' || b.emotions[0]?.id === 'shame') ids.push('shadow')
  if (b.place.id === 'forest') ids.push('forest')
  if (b.place.id === 'house') ids.push('house')
  if (b.place.id === 'school') ids.push('school')
  ids.push('dreamer')

  const out: SymbolReading[] = []
  for (const id of ids) {
    const s = SYMBOL_DB[id]
    if (!s) continue
    const name = lang === 'tr' ? s.tr : s.en
    if (out.some((x) => x.name === name)) continue

    // Contextual enrichment: weave place + emotion into stock meanings
    let meaning = lang === 'tr' ? s.meanTr : s.meanEn
    const emo = b.emotions[0]
    if (emo && (id === 'dreamer' || id === b.creatures[0]?.id)) {
      const bridge = L(
        lang,
        ` In this dream the surrounding mood of ${emo.en} colors how the symbol lands in the body.`,
        ` Bu rüyada ${emo.tr} hâli, sembolün bedende nasıl yer ettiğini renklendirir.`,
      )
      meaning = `${meaning}${bridge}`
    }
    if (id === b.place.id || (id === 'forest' && b.place.id === 'forest') || (id === 'house' && b.place.id === 'house')) {
      meaning = `${meaning}${L(
        lang,
        ` Here it is staged inside a ${b.place.en} — place and symbol reinforce each other.`,
        ` Burada bir ${b.place.tr} içinde sahnelenir — mekân ve sembol birbirini güçlendirir.`,
      )}`
    }

    out.push({ name, meaning })
  }

  // Always try to include a place-as-symbol if missing
  if (!out.some((x) => x.name === (lang === 'tr' ? b.place.tr : b.place.en))) {
    const placeSym = SYMBOL_DB[b.place.id]
    if (placeSym) {
      out.splice(Math.min(2, out.length), 0, {
        name: lang === 'tr' ? placeSym.tr : placeSym.en,
        meaning: lang === 'tr' ? placeSym.meanTr : placeSym.meanEn,
      })
    }
  }

  if (out.length < 3) {
    out.push({
      name: L(lang, 'Night Image', 'Gece İmgesi'),
      meaning: L(
        lang,
        `A personal symbol still forming inside “${b.shortExcerpt}”. Stay with the feeling longer than the plot — the body often finishes the sentence the mind cannot.`,
        `“${b.shortExcerpt}” içinde hâlâ oluşan kişisel bir sembol. Olay örgüsünden çok hisle kalın — beden zihnin bitiremediği cümleyi çoğu zaman tamamlar.`,
      ),
    })
  }
  return out.slice(0, 7)
}

/* ── Image prompt engineering ────────────────────────────── */

/**
 * Build a dense, art-direction-grade prompt for Grok Imagine / Flux.
 * Structured as a brief: subject → world → symbols → emotion → light → palette → style → quality.
 */
function buildImagePrompt(b: SceneBible): string {
  const creatureBlock = b.creatures
    .slice(0, 3)
    .map((c, i) => `(${i + 1}) ${c.visual}`)
    .join(' ')

  const objectBlock = b.objects
    .slice(0, 4)
    .map((o) => o.visual)
    .join('; ')

  const weatherBlock = b.weather?.visual ?? ''
  const timeBlock = b.timeOfDay
    ? `Time of day: ${b.timeOfDay.en}.`
    : 'Time of day: timeless dream-hour between dusk and memory.'

  const emotionChord = b.emotions
    .slice(0, 3)
    .map((e) => e.en)
    .join(', ')

  const phraseGround = b.phrases.length
    ? `Ground the scene in the dreamer's own language cues (as visual motifs, not text overlays): ${b.phrases.slice(0, 10).join(', ')}.`
    : ''

  const variationLine =
    b.variation > 0
      ? `Alternate masterful composition #${b.variation + 1} of the same dream — new camera angle and staging, same emotional truth and symbols.`
      : 'Single definitive masterpiece of this dream — one cohesive still, not a collage.'

  const composition =
    b.drama >= 0.7
      ? 'Composition: cinematic widescreen sense of depth, dynamic diagonal or triangular action, clear hero focal point, epic but tasteful negative space, readable silhouette hierarchy, no clutter.'
      : 'Composition: elegant focal point, breathing negative space, layered depth (foreground / midground / atmosphere), coherent perspective, quiet monumentality.'

  const tone =
    b.drama >= 0.7
      ? 'Tone: noble emotional drama, mythic dignity, intense but beautiful — never gore, never meme, never horror-excess.'
      : 'Tone: magical, serene, meaningful, slightly uncanny in a poetic way — intimate wonder.'

  // Multi-section brief (models respond well to labeled structure)
  const parts = [
    variationLine,
    `ART DIRECTION BRIEF — Dream still for a museum-quality generative image.`,
    `NARRATIVE ANCHOR (stay faithful, do not invent unrelated fantasy tropes): "${b.excerpt}".`,
    `SUBJECT & ACTION: ${b.subjectFocus}. Primary action/state: ${b.action?.en ?? 'a dreamer figure with clear emotional presence inhabiting the scene'}.`,
    creatureBlock ? `CREATURES (accurate anatomy, powerful, beautiful, non-cartoon): ${creatureBlock}.` : '',
    objectBlock ? `SYMBOLIC OBJECTS: ${objectBlock}.` : '',
    `ENVIRONMENT: ${b.place.scene}. Symbolic role of place: ${b.place.moodPlace}.`,
    timeBlock,
    weatherBlock ? `WEATHER / AIR: ${weatherBlock}.` : '',
    `ATMOSPHERE & EMOTIONAL TONE: ${b.atmosphereEn}. Emotional chord: ${emotionChord || 'layered wonder'}. The image must make the viewer feel this before they parse the story.`,
    phraseGround,
    `COLOR PALETTE (harmonious emotional pastels / dusk tones — no neon, no garish saturation): ${b.palette.colors}. Palette story: ${b.palette.storyEn}.`,
    `LIGHTING: ${b.lighting.direction}.`,
    `ARTISTIC STYLE: ${b.artStyle.direction}. Style label: ${b.artStyle.name}.`,
    composition,
    tone,
    'CAMERA / DETAIL: highly detailed materials (skin, fabric, fur, stone, water, air), coherent anatomy and proportions, refined hands and faces if visible, beautiful professional single image.',
    'STRICT AVOID: text, letters, watermark, logo, UI, frames, borders, collage, split screen, cartoon, anime chibi, extra limbs, deformed hands, excessive blood, gore, low quality, random unrelated objects, stock-photo people smiling at camera.',
  ]

  // Keep generous for Grok; flux client already clips ~1100
  return parts.filter(Boolean).join('\n').slice(0, 2200)
}

/* ── Analysis sections ───────────────────────────────────── */

function sectionEmotional(lang: Lang, b: SceneBible): string {
  const emo = b.emotions[0]
  const sec = b.emotions[1]
  const third = b.emotions[2]
  const creature = b.creatures[0]
  const act = b.action

  const p1 = emo
    ? L(
        lang,
        `The emotional weather of this dream is dominated by ${emo.en}. That tone is the psyche’s headline — the feeling it most needs you to notice on waking, before you tidy the plot into a “story.”`,
        `Bu rüyanın duygusal havasına ${emo.tr} egemendir. Bu ton psişenin manşetidir — olay örgüsünü “hikâye” diye düzeltmeden önce uyanınca fark etmenizi istediği histir.`,
      )
    : L(
        lang,
        'The emotional weather is layered and open: several feelings share the stage without one fully conquering the others. That chord-like quality is itself information — your system may be integrating more than one unfinished thread.',
        'Duygusal hava katmanlı ve açıktır: birkaç his sahneyi paylaşır, biri diğerlerini tamamen ele geçirmez. Bu akor niteliği de bilgidir — sisteminiz birden fazla yarım ipliği entegre ediyor olabilir.',
      )

  const p2 =
    b.drama >= 0.7
      ? L(
          lang,
          `\n\nIntensity here is creative as well as confrontational. High-drama dreams expand a compressed knot of power, anger, dignity, fear, or courage into a scene you can finally feel in full color and scale. The “epic” is not decoration — it is the psyche saying: this matters.`,
          `\n\nBuradaki yoğunluk hem yüzleştirici hem yaratıcıdır. Yüksek dramalı rüyalar güç, öfke, haysiyet, korku veya cesaret düğümünü tam renkli ve ölçekli bir sahneye yayar. “Epik” süs değildir — psişenin “bu önemli” demesidir.`,
        )
      : L(
          lang,
          `\n\nThe atmosphere is porous rather than explosive: images breathe, light moves slowly, meaning arrives as mood before story. Soft dreams can still be precise — they often encode attachment, grief, or quiet knowing that loud plots would crush.`,
          `\n\nAtmosfer patlayıcıdan çok gözeneklidir: imgeler nefes alır, ışık yavaş hareket eder, anlam hikâyeden önce hâl olarak gelir. Yumuşak rüyalar yine de kesin olabilir — yüksek sesli olayların ezeceği bağlanma, yas veya sessiz bilmeyi kodlarlar.`,
        )

  const p3 = creature
    ? L(
        lang,
        `\n\nThe ${creature.en} amplifies everything — creatures give body, motion, and gaze to forces waking language keeps abstract. Notice the creature’s eyes, distance, and intent: threat, alliance, mirror, or teacher. Your nervous system already knows which.`,
        `\n\n${cap(creature.tr)} her şeyi yükseltir — yaratıklar uyanık dilin soyut bıraktığı kuvvetlere beden, hareket ve bakış verir. Yaratığın gözüne, mesafesine ve niyetine bakın: tehdit, müttefik, ayna veya öğretmen. Sinir sisteminiz hangisi olduğunu çoktan bilir.`,
      )
    : ''

  const p4 = act
    ? L(
        lang,
        `\n\nYour stance — ${act.en} — is emotion in verb form. The dream does not only show what you feel; it shows what you do with feeling. Notice whether the dream-body felt capable, trapped, furious, tender, or strangely calm — that somatic signature is the most honest line of the report.`,
        `\n\nDuruşunuz — ${act.en} — fiil formunda duygudur. Rüya yalnızca ne hissettiğinizi değil, hisle ne yaptığınızı da gösterir. Rüya-bedenin yeterli, sıkışmış, öfkeli, narin veya tuhaf biçimde sakin hissedip hissetmediğine bakın — o bedensel imza raporun en dürüst satırıdır.`,
      )
    : L(
        lang,
        `\n\nEven without a clear action verb, your orientation in space (watching, waiting, approaching, withdrawing) is a posture of the soul. Stillness can be freeze, reverence, or strategic pause — decode it by body sensation, not only plot.`,
        `\n\nNet bir eylem fiili olmasa bile mekândaki yöneliminiz (izleme, bekleme, yaklaşma, geri çekilme) ruhun duruşudur. Hareketsizlik donma, huşu veya stratejik durak olabilir — yalnızca olayla değil beden duyumuyla okuyun.`,
      )

  const p5 = L(
    lang,
    `\n\nSet inside a ${b.place.en} (${b.place.moodPlace}), mood and place reinforce each other. Environment is not backdrop; it is emotion made spatial. In your words — “${b.shortExcerpt}” — atmosphere is the first truth offered.`,
    `\n\nBir ${b.place.tr} içinde (${b.place.moodPlace}) hâl ve mekân birbirini besler. Ortam dekor değil; mekânsallaşmış duygudur. “${b.shortExcerpt}” anlatınızda atmosfer sunulan ilk hakikattir.`,
  )

  const p6 = sec
    ? L(
        lang,
        `\n\nUnder the dominant tone runs a secondary current of ${sec.en}${third ? `, with a faint third note of ${third.en}` : ''}. The dream is not a single emoji — it is a chord. Naming only the loudest note often misses the music that heals.`,
        `\n\nBaskın tonun altında ${sec.tr} akıntısı dolaşır${third ? `; zayıf bir üçüncü nota olarak ${third.tr}` : ''}. Rüya tek emoji değil, bir akordur. Yalnızca en gürültülü notayı adlandırmak çoğu zaman iyileştiren müziği kaçırır.`,
      )
    : ''

  const p7 = L(
    lang,
    `\n\nVisually, this atmosphere wants ${b.palette.storyEn}, under ${b.lighting.en}. If you re-enter the dream in imagination, let color and light lead before dialogue or “meaning.”`,
    `\n\nGörsel olarak bu atmosfer ${b.palette.storyTr} ister; ışık dili: ${b.lighting.en}. Rüyaya imgelemle yeniden girerseniz, diyalog veya “anlam”dan önce renk ve ışığın önderlik etmesine izin verin.`,
  )

  return p1 + p2 + p3 + p4 + p5 + p6 + p7
}

function sectionPsychology(lang: Lang, b: SceneBible): string {
  const emo = b.emotions[0]
  const creature = b.creatures[0]
  const act = b.action
  const lionFight = creature?.id === 'lion' && act?.id === 'fight'

  const p1 = L(
    lang,
    'Psychologically, dreams are overnight integration more than prophecy: the mind stages images so unfinished feelings, intentions, and relational patterns can be rehearsed safely. Your dream is private theatre with uncanny casting — every figure, weather, and room is on payroll for a reason.',
    'Psikolojik olarak rüyalar kehanetten çok gece boyu entegrasyondur: zihin bitmemiş hisleri, niyetleri ve ilişki örüntülerini güvenli prova için sahneye koyar. Rüyanız tuhaf kadrolu özel tiyatrodur — her figür, hava ve oda bir nedenle bordrodadır.',
  )

  const p2 = emo
    ? L(
        lang,
        `\n\nThe dominant affect of ${emo.en} is triage, not punishment — something in waking life made this feeling urgent enough to claim the night’s main stage. Ask: where did this feeling get postponed, minimized, or politely swallowed yesterday? Dreams often collect unpaid emotional invoices.`,
        `\n\nBaskın ${emo.tr} duygulanımı ceza değil triyajdır — uyanık hayatta bir şey bu hissi gecenin ana sahnesini devralacak kadar acil kılmıştır. Sorun: bu his dün nerede ertelendi, küçültüldü veya nazikçe yutuldu? Rüyalar çoğu zaman ödenmemiş duygusal faturaları toplar.`,
      )
    : ''

  const p3 = lionFight
    ? L(
        lang,
        `\n\nFighting lions is a classic power-confrontation motif across cultures. It often clusters around: asserting boundaries against a dominant other; meeting your own aggression or ambition without shame; fear that strength will destroy or corrupt you; a courage test before a real trial. The dream asks less “will you win?” and more “can you stay present — breathing, choosing, dignified — while power is in the room?”`,
        `\n\nAslanlarla savaşmak kültürler arası klasik güç-yüzleşme motifidir. Çoğu zaman: baskın ötekine sınır koymak; utançsız güç/hırsla buluşmak; gücün yok edeceği veya bozacağı korkusu; gerçek bir imtihandan önce cesaret. Rüya “kazanacak mısın?”dan çok “güç odadayken — nefes alarak, seçerek, haysiyetle — hazır bulunabilir misin?” diye sorar.`,
      )
    : act?.id === 'fight'
      ? L(
          lang,
          `\n\nCombat means the ego is practicing engagement. Active struggle often signals that a part of you still believes agency is possible — a different picture from frozen helplessness. Study the “rules” of the fight: fair or rigged, endless or winnable, alone or supported — those rules often mirror waking conflict scripts.`,
          `\n\nSavaş, egonun teması prova ettiğini gösterir. Aktif mücadele çoğu zaman seçim gücüne hâlâ inanıldığını işaret eder — donmuş çaresizlikten farklı bir tablo. Kavganın “kurallarına” bakın: adil mi hileli mi, sonsuz mu kazanılabilir mi, yalnız mı destekli mi — bu kurallar çoğu zaman uyanık çatışma senaryolarını yansıtır.`,
        )
      : act?.id === 'fly'
        ? L(
            lang,
            `\n\nFlight motifs often appear when the psyche wants altitude: perspective, freedom, or escape from a sticky identity. If flight felt joyful, the system may be ready for expansion; if strained, independence may be desired but under-supported.`,
            `\n\nUçuş motifleri çoğu zaman psişe irtifa istediğinde belirir: bakış açısı, özgürlük veya yapışkan bir kimlikten kaçış. Uçuş neşeliyse sistem genişlemeye hazır olabilir; zorlanmalıysa bağımsızlık arzu edilir ama yetersiz destekleniyor olabilir.`,
          )
        : L(
            lang,
            `\n\nEven without battle, the dream organizes experience into a narrative you can revisit. Each retelling reassigns meaning and softens raw charge — which is why writing the dream matters as much as “interpreting” it.`,
            `\n\nSavaş olmasa bile rüya deneyimi yeniden ziyaret edilebilir bir anlatıya dizer. Her anlatım anlamı yeniden atar ve ham yükü yumuşatır — bu yüzden rüyayı yazmak “yorumlamak” kadar önemlidir.`,
          )

  const p4 = L(
    lang,
    `\n\nThe ${b.place.en} is stage design for inner architecture — environment is mood made spatial. A ${b.place.moodPlace} setting suggests the psyche chose this “set” because it already knows how that place feels in your body history (safety, exile, trial, wonder).`,
    `\n\n${cap(b.place.tr)}, iç mimarinin sahne tasarımıdır — ortam mekânsallaşmış hâldir. “${b.place.moodPlace}” nitelikli bir set, psişenin bu mekânı beden tarihinde nasıl hissettirdiğini (güven, sürgün, imtihan, hayret) bildiği için seçildiğini düşündürür.`,
  )

  const p5 =
    b.objects.length > 0
      ? L(
          lang,
          `\n\nObjects in the dream (${b.objects
            .slice(0, 3)
            .map((o) => o.en)
            .join(', ')}) are props with psychological contracts: tools of agency, thresholds, messages, or mirrors. Ask what each object “allows” you to do that bare hands could not.`,
          `\n\nRüyadaki nesneler (${b.objects
            .slice(0, 3)
            .map((o) => o.tr)
            .join(', ')}) psikolojik sözleşmeli aksesuarlardır: seçim araçları, eşikler, mesajlar veya aynalar. Her nesnenin çıplak elle yapamayacağınız neyi “mümkün kıldığına” sorun.`,
        )
      : ''

  const p6 = L(
    lang,
    `\n\nTreat the dream as data about need and strategy, not a verdict on character. In “${b.shortExcerpt}”, intention is already half-visible — especially in what the dream-self protects, pursues, or refuses to abandon.`,
    `\n\nRüyayı karakter hükmü değil, ihtiyaç ve strateji verisi sayın. “${b.shortExcerpt}” içinde niyet yarı görünürdür — özellikle rüya-benliğin neyi koruduğu, peşine düştüğü veya terk etmeyi reddettiği yerde.`,
  )

  const p7 =
    b.drama >= 0.7
      ? L(
          lang,
          '\n\nHigh-arousal dreams leave residual charge in the nervous system. Ground after waking: water, longer exhales, bare feet on the floor, name five colors in the room — so insight can land without jitter. Interpretation works better after regulation.',
          '\n\nYüksek uyarılmalı rüyalar sinir sisteminde artakalan yük bırakır. Uyanınca topraklanın: su, uzun nefes veriş, yere ayak, odada beş renk — içgörü titreme olmadan insin. Yorum, regülasyon sonrası daha iyi işler.',
        )
      : L(
          lang,
          '\n\nSoft-arousal dreams still deserve a landing ritual: one sentence written before phone, one breath longer than usual. The psyche rewards continuity more than cleverness.',
          '\n\nDüşük uyarılmalı rüyalar yine de bir iniş ritüeli hak eder: telefondan önce bir cümle, her zamankinden uzun bir nefes. Psişe zekâdan çok sürekliliği ödüllendirir.',
        )

  return p1 + p2 + p3 + p4 + p5 + p6 + p7
}

function sectionHidden(lang: Lang, b: SceneBible): string {
  const lines: string[] = [
    L(
      lang,
      'Beneath the plot, invitations often hide inside images — not as secret codes to crack once, but as living questions the dream keeps asking until life answers them:',
      'Olay örgüsünün altında davetler çoğu zaman imgelerin içinde gizlidir — bir kez çözülecek gizli kodlar değil, hayat cevap verene kadar rüyanın sormaya devam ettiği canlı sorular:',
    ),
  ]

  const emo = b.emotions[0]
  const creature = b.creatures[0]
  const act = b.action

  if (creature?.id === 'lion' || act?.id === 'fight') {
    lines.push(
      L(
        lang,
        '• The “enemy” may be disowned strength — assertiveness, leadership, or anger with a backbone you refuse by day. What you fight may be what you are ready to integrate.',
        '• “Düşman” sahipsiz güç olabilir — gündüz reddettiğiniz iddia, liderlik veya omurgalı öfke. Savaştığınız şey, entegre etmeye hazır olduğunuz şey olabilir.',
      ),
      L(
        lang,
        '• Surviving the scene equals dignity under pressure: the psyche trains you not to collapse when power enters the room — outer power or your own.',
        '• Sahnede hayatta kalmak baskı altında haysiyete denktir: psişe güç (dışarıdaki veya sizinki) odaya girdiğinde çökmemeyi alıştırır.',
      ),
    )
  }
  if (emo?.id === 'fear') {
    lines.push(
      L(
        lang,
        '• Fear is often a boundary messenger: something needs protection, honesty, or a slower pace. Fear is not always “stop forever” — sometimes it is “not like this, not alone, not yet.”',
        '• Korku sıklıkla sınır ulakıdır: korunma, dürüstlük veya daha yavaş tempo gerekir. Korku her zaman “sonsuza dek dur” değildir — bazen “böyle değil, yalnız değil, henüz değil” demektir.',
      ),
    )
  }
  if (emo?.id === 'shame') {
    lines.push(
      L(
        lang,
        '• Shame dreams often hide a longing to be seen without performing. The hidden message may be: find one safe witness, not a perfect self.',
        '• Utanç rüyaları çoğu zaman performans olmadan görülme özlemini gizler. Gizli mesaj: kusursuz benlik değil, bir güvenli tanık bul.',
      ),
    )
  }
  if (b.objects.some((o) => o.id === 'door' || o.id === 'key' || o.id === 'bridge')) {
    lines.push(
      L(
        lang,
        '• Threshold symbols imply a decision already half-made — the dream lets you feel cost and promise before the calendar forces a choice.',
        '• Eşik sembolleri yarı verilmiş kararı ima eder — rüya takvim zorlamadan önce bedeli ve vaadi hissettirir.',
      ),
    )
  }
  if (b.objects.some((o) => o.id === 'water')) {
    lines.push(
      L(
        lang,
        '• Water asks for feeling before fixing. Management without mourning keeps dreams loud; tears, art, and honest talk are not detours — they are the path.',
        '• Su, düzeltmeden önce hissetmeyi ister. Yas tutmadan yönetmek rüyaları gürültülü tutar; gözyaşı, sanat ve dürüst konuşma sapma değil yoldur.',
      ),
    )
  }
  if (b.objects.some((o) => o.id === 'mirror')) {
    lines.push(
      L(
        lang,
        '• Mirrors hide a confrontation with self-image: the face you avoid may be the one that can lead you now.',
        '• Aynalar benlik imgesiyle yüzleşmeyi gizler: kaçındığınız yüz, şimdi size önderlik edebilecek yüz olabilir.',
      ),
    )
  }
  if (act?.id === 'fly' || emo?.id === 'freedom') {
    lines.push(
      L(
        lang,
        '• Liberation images often conceal a permission slip you have been waiting for from someone else — the dream may be issuing it from within.',
        '• Özgürleşme imgeleri çoğu zaman başkasından beklenen bir izin kâğıdını gizler — rüya onu içeriden düzenliyor olabilir.',
      ),
    )
  }
  if (b.drama >= 0.7) {
    lines.push(
      L(
        lang,
        '• Epic scale means the issue is not trivial to the psyche — even if daytime politeness, humor, or productivity minimized it. Grandeur is a seriousness signal.',
        '• Epik ölçek, konunun psişe için önemsiz olmadığını gösterir — gündüz nezaketi, mizah veya verimlilik küçültmüş olsa bile. İhtişam bir ciddiyet sinyalidir.',
      ),
    )
  }
  if (b.weather?.id === 'storm' || b.weather?.id === 'rain') {
    lines.push(
      L(
        lang,
        '• Weather is mood with physics: storms and rain often mean emotional weather systems that cannot be scheduled away.',
        '• Hava, fiziği olan hâldir: fırtına ve yağmur çoğu zaman takvime sığmayan duygusal hava sistemleri demektir.',
      ),
    )
  }
  if (lines.length < 5) {
    lines.push(
      L(
        lang,
        '• What felt unfinished on waking is often the real message — a sensation in chest, jaw, or belly, not a slogan. Follow the residue.',
        '• Uyanınca eksik kalan his çoğu zaman asıl mesajdır — slogan değil; göğüs, çene veya karındaki duyum. Artakalanı izleyin.',
      ),
      L(
        lang,
        '• The dream may be less about “what will happen” and more about “what stance do you practice when the unknown arrives.”',
        '• Rüya “ne olacak”tan çok “bilinmeyen geldiğinde hangi duruşu provaya alıyorsun” ile ilgili olabilir.',
      ),
    )
  }
  lines.push(
    L(
      lang,
      '\nThese are maps for self-inquiry — not medical diagnosis, fortune-telling, or destiny decrees. Keep what resonates; release what does not.',
      '\nBunlar öz-sorgulama haritalarıdır — tıbbi tanı, fal veya kader hükmü değil. Yankı yapanı tutun; yapmayanı bırakın.',
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
      'Retell the dream in present tense on paper (“I am fighting…”, “I am standing at the door…”) — present tense unlocks fresher body memory than past-tense summary.',
      'Rüyayı şimdiki zamanda yazın (“Savaşıyorum…”, “Kapıdayım…”) — şimdiki zaman, geçmiş zaman özetinden daha taze beden belleğini açar.',
    ),
    L(
      lang,
      `Name the atmosphere in three sensory words (e.g. dusty, gold, breathless) before you name the plot. Your dream’s air was: ${b.atmosphereEn}.`,
      `Olayı adlandırmadan önce atmosferi üç duyusal kelimeyle adlandırın (ör. tozlu, altın, nefessiz). Rüyanızın havası: ${b.atmosphereTr}.`,
    ),
  ]

  if (creature?.id === 'lion' || act?.id === 'fight') {
    tips.push(
      L(
        lang,
        'Name the “lion” (or rival force) in waking life in one concrete sentence: person, pressure, inner critic, institution, or deadline — not a vague “everything.”',
        'Uyanık hayattaki “aslan”ı (veya rakip kuvveti) tek somut cümlede adlandırın: kişi, baskı, iç eleştirmen, kurum veya son tarih — muğlak “her şey” değil.',
      ),
      L(
        lang,
        'Practice one small act of clean power today: a clear no, a direct request, or a boundary without apology-spam. Dreams of struggle want a miniature real-world echo.',
        'Bugün küçük bir temiz güç eylemi: net hayır, doğrudan rica veya özür yağmursuz sınır. Mücadele rüyaları minik bir gerçek yankı ister.',
      ),
    )
  }
  if (emo?.id === 'fear' || b.drama >= 0.7) {
    tips.push(
      L(
        lang,
        'Downshift after intense dreams: longer exhales, cold water on wrists, bare feet on the floor for a minute, then one sentence of meaning — regulation first, insight second.',
        'Yoğun rüyadan sonra regüle olun: uzun nefes veriş, bileklere soğuk su, bir dakika yere ayak, sonra bir cümlelik anlam — önce regülasyon, sonra içgörü.',
      ),
    )
  }
  if (emo?.id === 'love' || emo?.id === 'sadness' || emo?.id === 'nostalgia') {
    tips.push(
      L(
        lang,
        'Give the tender self five undistracted minutes — tea, music, or a short phoneless walk. Soft dreams often ask for soft time, not solutions.',
        'Narin yana beş dakikalık bölünmemiş özen — çay, müzik veya telefonsuz yürüyüş. Yumuşak rüyalar çoğu zaman çözüm değil, yumuşak zaman ister.',
      ),
    )
  }
  if (act?.id === 'fly' || emo?.id === 'freedom') {
    tips.push(
      L(
        lang,
        'Drop one obligation that no longer fits, or open one window (literal or metaphorical). Dream liberation wants a miniature real-world echo.',
        'Artık uymayan bir yükümlülüğü bırakın veya bir pencere açın (gerçek ya da mecazi). Rüyadaki özgürleşme minik bir gerçek yankı ister.',
      ),
    )
  }
  if (b.objects.some((o) => o.id === 'door' || o.id === 'key' || o.id === 'bridge')) {
    tips.push(
      L(
        lang,
        'Write the decision the threshold points to in one line: “If I crossed, I would ___.” Completing the blank is often more useful than interpreting the door.',
        'Eşiğin işaret ettiği kararı tek satırda yazın: “Geçseydim ___.” Boşluğu doldurmak çoğu zaman kapıyı yorumlamaktan daha işe yarar.',
      ),
    )
  }
  tips.push(
    L(
      lang,
      'Keep a two-line dream log for seven nights (image + feeling). Patterns clarify meaning more than any single spectacular dream — and they train the psyche that you are listening.',
      'Yedi gece iki satırlık rüya kaydı tutun (imge + his). Örüntüler tek muhteşem rüyadan daha çok anlam netleştirir — ve psişeye dinlediğinizi öğretir.',
    ),
  )

  const questions =
    lang === 'tr'
      ? [
          'Uyanır uyanmaz bedenimin neresi konuştu — çene, göğüs, karın, eller, boğaz?',
          'Rüya-benlik hangi stratejiyi kullandı: savaş, kaç, don, pazarlık, seyir, koruma?',
          'Sahnenin “rakibi / engeli / aslanı” uyanık hayatta kimin veya neyin yüzü olabilir?',
          'Bu rüya bana hangi gücü, izni veya yas hakkını geri vermek istiyor olabilir?',
          'Yüzleşmekten, yavaşlamaktan veya istemekten kaçındığım tek konuşma veya karar nedir?',
          'Kendime hangi tek cümlelik haysiyetli mesajı bugün söyleyebilirim?',
          `Mekân (${b.place.tr}) benim iç dünyamda neyin sahnesi — güvenlik, imtihan, sürgün, hayret?`,
        ]
      : [
          'Where did my body speak on waking — jaw, chest, belly, hands, throat?',
          'Which strategy did the dream-self use: fight, flee, freeze, bargain, watch, protect?',
          'Whose face might the rival / obstacle / lion wear in waking life?',
          'What power, permission, or right to grieve might this dream be trying to return to me?',
          'What one conversation or decision have I postponed out of fear, politeness, or exhaustion?',
          'What single sentence of dignity can I offer myself today?',
          `What is the ${b.place.en} a stage for in my inner world — safety, trial, exile, wonder?`,
        ]

  if (creature?.id === 'lion') {
    questions[2] =
      lang === 'tr'
        ? 'Aslan benim bir yanımsa ne istiyor — saygı, dinlenme, alan, dürüstlük, liderlik?'
        : 'If the lion is a part of me, what does it want — respect, rest, territory, honesty, leadership?'
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
  if (b.objects.some((o) => o.id === 'water') || b.place.id === 'sea' || b.place.id === 'waterbody') {
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
  if (b.place.id === 'house' || b.place.id === 'school') {
    themes.push(L(lang, 'Architecture of identity & belonging', 'Kimlik ve aidiyet mimarisi'))
  }
  if (emo?.id === 'nostalgia') {
    themes.push(L(lang, 'Memory & the inner child', 'Bellek ve iç çocuk'))
  }
  if (b.objects.some((o) => o.id === 'mirror')) {
    themes.push(L(lang, 'Self-recognition & the honest face', 'Kendini tanıma ve dürüst yüz'))
  }
  if (act?.id === 'fall') {
    themes.push(L(lang, 'Surrender, free-fall, and trust', 'Teslimiyet, serbest düşüş ve güven'))
  }
  if (!themes.length) {
    themes.push(
      L(lang, 'Self-inquiry through night images', 'Gece imgeleriyle öz-sorgulama'),
      L(lang, 'Feeling made visible', 'Görünür kılınmış his'),
    )
  }

  const intro = L(
    lang,
    'This dream resonates with wider human motifs found in myth, art, and depth psychology. Naming the motif does not shrink your dream — it places your private night inside a longer human conversation:',
    'Bu rüya mit, sanat ve derinlik psikolojisinde bulunan daha geniş insani motiflerle rezonans kurar. Motifi adlandırmak rüyanızı küçültmez — özel gecenizi daha uzun bir insanlık sohbetine yerleştirir:',
  )
  const body = themes.map((th) => `• ${th}`).join('\n')
  const myth =
    creature?.id === 'lion' && act?.id === 'fight'
      ? L(
          lang,
          '\n\nMythic echo: lion combat recalls hero initiations where the beast is both obstacle and teacher — Gilgamesh, Heracles, and countless folk tales use the same grammar. Your psyche borrows that ancient syntax for a modern pressure: workplace, family, ambition, or inner critic. The gift is not “be a hero,” but “meet power without abandoning yourself.”',
          '\n\nMitik yankı: aslan savaşı kahraman inisiasyonlarını hatırlatır; canavar hem engel hem öğretmendir — Gılgamış, Herakles ve sayısız halk masalı aynı grameri kullanır. Psişeniz modern bir baskı (iş, aile, hırs veya iç eleştirmen) için o eski sözdizimini ödünç alır. Hediye “kahraman ol” değil, “kendini terk etmeden güçle buluş”tur.',
        )
      : b.objects.some((o) => o.id === 'door' || o.id === 'bridge')
        ? L(
            lang,
            '\n\nMythic echo: thresholds (doors, bridges, gates) are the oldest narrative engines — rites of passage, underworld descents, wedding and funeral processions. Your dream personalizes the archetype: the specific light, fear, or hope on the threshold is yours alone.',
            '\n\nMitik yankı: eşikler (kapı, köprü, geçit) en eski anlatı motorlarıdır — geçiş ayinleri, yeraltı inişleri, düğün ve cenaze alayları. Rüyanız arketipi kişiselleştirir: eşikteki ışık, korku veya umut yalnızca sizindir.',
          )
        : L(
            lang,
            '\n\nThese motifs endure because they mark universal passages of growth — separation, ordeal, return, recognition. Your dream personalizes them with your places, creatures, and private weather. That personalization is the gift; the motif is only the shared language.',
            '\n\nBu motifler büyümeye dair evrensel geçitleri (ayrılma, imtihan, dönüş, tanınma) işaret ettiği için sürer. Rüyanız onları mekânlarınız, yaratıklarınız ve özel havanızla kişiselleştirir. Hediye kişiselleştirmedir; motif yalnızca ortak dildir.',
          )

  const art = L(
    lang,
    `\n\nArt-direction echo for this night: ${b.artStyle.name}, palette as ${b.palette.storyEn}. If you painted this dream, you would already be doing depth psychology with color and light.`,
    `\n\nBu gece için sanat yönetimi yankısı: ${b.artStyle.name}; palet: ${b.palette.storyTr}. Bu rüyayı boyasaydınız, renk ve ışıkla derinlik psikolojisi yapıyor olurdunuz.`,
  )

  return `${intro}\n${body}${myth}${art}`
}
