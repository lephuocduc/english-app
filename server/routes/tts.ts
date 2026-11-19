import { Hono } from 'hono'
import type { Env, Variables } from '../types'

export const ttsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const ALLOWED_LANGS = new Set(['en', 'en-US', 'en-GB', 'en-AU'])

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

ttsRouter.get('/', async (c) => {
  const rawText = (c.req.query('text') || '').trim()
  const rawLang = (c.req.query('lang') || 'en-GB').trim()
  const lang = ALLOWED_LANGS.has(rawLang) ? rawLang : 'en-GB'

  if (!rawText) {
    return c.json({ success: false, error: 'Missing required query parameter: text' }, 400)
  }

  if (rawText.length > 500) {
    return c.json({ success: false, error: 'Text exceeds maximum 500 characters per segment' }, 400)
  }

  try {
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

    return new Response(merged, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('[ListenFlow TTS Proxy Error]', err)
    return c.json({ success: false, error: 'Failed to synthesize TTS audio' }, 500)
  }
})
