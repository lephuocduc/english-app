import { Hono } from 'hono'
import type { AiBinding, Env, Variables } from '../types'

export const ttsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const ALLOWED_LANGS = new Set(['en', 'en-US', 'en-GB', 'en-AU'])

// Authentic regional neural speakers on Cloudflare Workers AI (@cf/deepgram/aura-2-en)
// Alternates genuine Male & Female native speakers for 2-person dialogues!
const AURA2_SPEAKERS: Record<string, [string, string]> = {
  'en-GB': ['draco', 'pandora'], // Authentic British Male Baritone + Authentic British Female
  'en-US': ['orion', 'luna'], // Authentic American Male + Authentic American Female
  'en-AU': ['hyperion', 'theia'], // Authentic Australian Male + Authentic Australian Female
  en: ['draco', 'pandora'],
}

function splitForTtsChunks(text: string, maxLen = 180): string[] {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= maxLen) return [cleaned]

  const words = cleaned.split(' ')
  const chunks: string[] = []
  let current = ''

  for (const word of words) {
    if (!current) {
      current = word
    } else if (current.length + 1 + word.length <= maxLen) {
      current += ` ${word}`
    } else {
      chunks.push(current)
      current = word
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.byteLength, 0)
  const merged = new Uint8Array(new ArrayBuffer(totalLength))
  let offset = 0
  for (const arr of arrays) {
    merged.set(arr, offset)
    offset += arr.byteLength
  }
  return merged
}

async function readAiAudioBytes(
  raw: Response | ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (raw instanceof Response) {
    if (!raw.ok) return null
    const ct = (raw.headers.get('content-type') || '').toLowerCase()
    if (ct.includes('application/json') || ct.includes('text/html')) return null
    const buf = new Uint8Array(await raw.arrayBuffer())
    return buf.byteLength >= 64 ? buf : null
  }
  if (raw instanceof Uint8Array) {
    const copy = new Uint8Array(new ArrayBuffer(raw.byteLength))
    copy.set(raw)
    return copy.byteLength >= 64 ? copy : null
  }
  if (raw instanceof ArrayBuffer) {
    const copy = new Uint8Array(new ArrayBuffer(raw.byteLength))
    copy.set(new Uint8Array(raw))
    return copy.byteLength >= 64 ? copy : null
  }
  if (raw && typeof (raw as ReadableStream<Uint8Array>).getReader === 'function') {
    const reader = (raw as ReadableStream<Uint8Array>).getReader()
    const parts: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) parts.push(value)
    }
    const merged = concatUint8Arrays(parts)
    return merged.byteLength >= 64 ? merged : null
  }
  return null
}

async function synthesizeWithWorkersAi(
  ai: AiBinding,
  text: string,
  lang: string,
  speakerSlot: number
): Promise<{ bytes: Uint8Array<ArrayBuffer>; speaker: string } | null> {
  const pair = AURA2_SPEAKERS[lang] || AURA2_SPEAKERS['en-GB']
  const speaker = pair[speakerSlot % pair.length]

  try {
    const raw = await ai.run(
      '@cf/deepgram/aura-2-en',
      {
        text,
        speaker,
        encoding: 'mp3',
      },
      { returnRawResponse: true }
    )
    const bytes = await readAiAudioBytes(raw)
    if (bytes) {
      return { bytes, speaker }
    }
  } catch (err) {
    console.warn('[ListenFlow TTS Aura-2 fallback]', err)
  }

  return null
}

function buildAudioResponse(
  bytes: Uint8Array<ArrayBuffer>,
  provider: string,
  speaker: string,
  distinctVoice: boolean
): Response {
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(bytes.byteLength),
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-Tts-Provider, X-Tts-Speaker, X-Tts-Distinct-Voice',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=604800',
      'X-Tts-Provider': provider,
      'X-Tts-Speaker': speaker,
      'X-Tts-Distinct-Voice': distinctVoice ? '1' : '0',
    },
  })
}

ttsRouter.get('/', async (c) => {
  const rawText = (c.req.query('text') || '').trim()
  const rawLang = (c.req.query('lang') || 'en-GB').trim()
  const lang = ALLOWED_LANGS.has(rawLang) ? rawLang : 'en-GB'
  const rawSpeaker = Number(c.req.query('speaker') || 0)
  const speakerSlot = Number.isFinite(rawSpeaker) ? Math.abs(Math.floor(rawSpeaker)) % 2 : 0

  if (!rawText) {
    return c.json({ success: false, error: 'Missing required query parameter: text' }, 400)
  }

  if (rawText.length > 500) {
    return c.json({ success: false, error: 'Text exceeds maximum 500 characters per segment' }, 400)
  }

  // 1. Check Cloudflare Edge Cache first (0 AI Neurons on cache hit!)
  const cacheApi = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined
  const cacheKeyUrl = `https://tts-cache.listenflow.internal/v2?lang=${encodeURIComponent(lang)}&speaker=${speakerSlot}&text=${encodeURIComponent(rawText)}`
  const cacheRequest = new Request(cacheKeyUrl, { method: 'GET' })

  if (cacheApi) {
    try {
      const cached = await cacheApi.match(cacheRequest)
      if (cached) {
        return cached
      }
    } catch {
      // ignore cache errors in non-Workers test environments
    }
  }

  try {
    // 2. Primary: Authentic Regional Neural Voices via Cloudflare Workers AI (Deepgram Aura-2)
    //    UK: draco (British Male) / pandora (British Female)
    //    US: orion (American Male) / luna (American Female)
    //    AU: hyperion (Australian Male) / theia (Australian Female)
    if (c.env?.AI) {
      const aiResult = await synthesizeWithWorkersAi(c.env.AI, rawText, lang, speakerSlot)
      if (aiResult) {
        const res = buildAudioResponse(aiResult.bytes, 'cloudflare-aura-2', aiResult.speaker, true)
        if (cacheApi) {
          try {
            c.executionCtx?.waitUntil(cacheApi.put(cacheRequest, res.clone()))
          } catch {
            // ignore if executionCtx unavailable
          }
        }
        return res
      }
    }

    // 3. Fallback: Google Translate TTS proxy
    const chunks = splitForTtsChunks(rawText, 180)
    const audioBuffers: Uint8Array[] = []

    for (const chunk of chunks) {
      const upstreamCandidates = [
        `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(chunk)}`,
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(chunk)}`,
      ]

      let chunkBuf: Uint8Array | null = null
      let lastStatus = 502

      for (const upstreamUrl of upstreamCandidates) {
        try {
          const upstreamRes = await fetch(upstreamUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              Referer: 'https://translate.google.com/',
              Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
            },
          })

          if (!upstreamRes.ok) {
            lastStatus = upstreamRes.status
            continue
          }

          const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase()
          if (contentType.includes('text/html')) {
            lastStatus = 502
            continue
          }

          const buf = new Uint8Array(await upstreamRes.arrayBuffer())
          if (buf.byteLength === 0) {
            lastStatus = 502
            continue
          }

          chunkBuf = buf
          break
        } catch {
          // Try next upstream candidate
        }
      }

      if (!chunkBuf) {
        return c.json(
          { success: false, error: `Upstream TTS provider returned HTTP ${lastStatus}` },
          502
        )
      }

      audioBuffers.push(chunkBuf)
    }

    const merged = concatUint8Arrays(audioBuffers)
    return buildAudioResponse(merged, 'google-translate', lang, false)
  } catch (err) {
    console.error('[ListenFlow TTS Proxy Error]', err)
    return c.json({ success: false, error: 'Failed to synthesize TTS audio' }, 500)
  }
})
