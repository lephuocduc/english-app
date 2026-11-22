/**
 * Translation service for ListenFlow
 * Translates English text / vocabulary to Vietnamese using Google Translate client API
 * with MyMemory as fallback and in-memory caching.
 */

import { lookupContextualWord } from './itOpsWordDictionary'

const translationCache = new Map<string, string>()

// Pre-fill cache with common words for instant speed
const COMMON_DICTIONARY: Record<string, string> = {
  hello: '(phr) xin chào',
  hi: '(phr) chào',
  yes: '(adv) có, vâng',
  no: '(adv) không',
  thank: '(v) cảm ơn',
  thanks: '(n/v) cảm ơn',
  please: '(adv) làm ơn, vui lòng',
  good: '(adj) tốt, hay',
  great: '(adj) tuyệt vời',
  world: '(n) thế giới',
  life: '(n) cuộc sống, cuộc đời',
  time: '(n) thời gian',
  day: '(n) ngày',
  today: '(adv/n) hôm nay',
  story: '(n) câu chuyện',
  stories: '(n) những câu chuyện',
  connect: '(v) kết nối',
  dots: '(n) các dấu chấm, điểm nối',
  love: '(v/n) yêu, tình yêu',
  loss: '(n) mất mát',
  death: '(n) cái chết, sự qua đời',
  stay: '(v) giữ nguyên, ở lại',
  hungry: '(adj) khao khát, đói',
  foolish: '(adj) dại khờ, ngốc nghếch',
  opportunity: '(n) cơ hội',
  listen: '(v) lắng nghe',
  practice: '(v/n) luyện tập',
}

/**
 * Clean a word token by removing leading/trailing punctuation
 */
export function cleanWord(raw: string): string {
  if (!raw) return ''
  return raw.replace(/^[^\w\s]+|[^\w\s]+$/g, '').trim()
}

/**
 * Translates English text to Vietnamese.
 * Single words check our hand-curated IT Ops contextual dictionary (with part of speech) first.
 */
export async function translateToVietnamese(rawText: string): Promise<string> {
  const text = rawText.trim()
  if (!text) return ''

  const lower = text.toLowerCase()
  const isSingleWord = !/\s/.test(lower)
  if (isSingleWord) {
    const contextual = lookupContextualWord(lower)
    if (contextual) return contextual
  }

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
