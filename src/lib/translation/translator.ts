/**
 * Translation service for ListenFlow
 * Translates English text / vocabulary to Vietnamese using Google Translate client API
 * with MyMemory as fallback and in-memory caching.
 */

const translationCache = new Map<string, string>()

// Pre-fill cache with common words for instant speed
const COMMON_DICTIONARY: Record<string, string> = {
  hello: 'xin chào',
  hi: 'chào',
  yes: 'có, vâng',
  no: 'không',
  thank: 'cảm ơn',
  thanks: 'cảm ơn',
  please: 'làm ơn, xin vui lòng',
  good: 'tốt, hay',
  great: 'tuyệt vời',
  world: 'thế giới',
  life: 'cuộc sống, cuộc đời',
  time: 'thời gian',
  day: 'ngày',
  today: 'hôm nay',
  story: 'câu chuyện',
  stories: 'những câu chuyện',
  connect: 'kết nối',
  dots: 'các dấu chấm, điểm nối',
  love: 'yêu, tình yêu',
  loss: 'mất mát',
  death: 'cái chết, sự qua đời',
  stay: 'hãy ở lại, giữ vững',
  hungry: 'khao khát, đói',
  foolish: 'dại khờ, ngốc nghếch',
  opportunity: 'cơ hội',
  listen: 'lắng nghe',
  practice: 'luyện tập',
}

/**
 * Clean a word token by removing leading/trailing punctuation
 */
export function cleanWord(raw: string): string {
  if (!raw) return ''
  return raw.replace(/^[^\w\s]+|[^\w\s]+$/g, '').trim()
}

/**
 * Translates English text to Vietnamese
 */
export async function translateToVietnamese(rawText: string): Promise<string> {
  const text = rawText.trim()
  if (!text) return ''

  const lower = text.toLowerCase()
  if (COMMON_DICTIONARY[lower]) {
    return COMMON_DICTIONARY[lower]
  }

  if (translationCache.has(lower)) {
    return translationCache.get(lower)!
  }

  // 1. Google Translate GTX API (Free, high quality, supports CORS)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0]
          .map((item: any) => (Array.isArray(item) ? item[0] : ''))
          .filter(Boolean)
          .join('')
          .trim()

        if (translated) {
          translationCache.set(lower, translated)
          return translated
        }
      }
    }
  } catch (err) {
    console.warn('[ListenFlow Translator] Google GTX translation error:', err)
  }

  // 2. MyMemory Fallback
  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`
    const res = await fetch(mmUrl)
    if (res.ok) {
      const data = await res.json()
      const translated = data?.responseData?.translatedText?.trim()
      if (translated && !translated.includes('MYMEMORY WARNING')) {
        translationCache.set(lower, translated)
        return translated
      }
    }
  } catch (err) {
    console.warn('[ListenFlow Translator] MyMemory fallback error:', err)
  }

  return ''
}
