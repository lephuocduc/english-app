import { DEFAULT_YOUTUBE_VIDEOS } from '../../data/defaultVideo'
import type {
  SentenceSegment,
  TranscriptProvider,
  TranscriptResult,
} from '../../types'

/**
 * Provider 1: Starter YouTube Video Transcript Provider
 * Supplies verified transcripts for initial starter YouTube video.
 */
export class LocalDemoTranscriptProvider implements TranscriptProvider {
  name = 'Bản phụ đề YouTube khởi tạo (Starter Video Transcript)'

  canProvide(videoId: string): boolean {
    return DEFAULT_YOUTUBE_VIDEOS.some((lesson) => lesson.videoId === videoId)
  }

  async getTranscript(videoId: string): Promise<TranscriptResult> {
    const lesson = DEFAULT_YOUTUBE_VIDEOS.find((l) => l.videoId === videoId)
    if (lesson && lesson.sentences.length > 0) {
      return {
        status: 'available',
        data: lesson.sentences,
        sourceName: lesson.transcriptSource || 'YouTube Transcript',
      }
    }

    return {
      status: 'unavailable',
      error: 'Video này chưa có phụ đề tự nhập. Hãy thêm phân đoạn câu để luyện tập.',
    }
  }
}

/**
 * Provider 2: User-Supplied Transcript Provider
 * Architecture for user-provided transcript text or SRT/VTT with custom timestamps.
 */
export class UserSuppliedTranscriptProvider implements TranscriptProvider {
  name = 'Phụ đề do người học cung cấp (User-Provided Transcript)'
  private customSegmentsMap = new Map<string, SentenceSegment[]>()

  registerCustomTranscript(videoId: string, segments: SentenceSegment[]): void {
    this.customSegmentsMap.set(videoId, segments)
  }

  canProvide(videoId: string): boolean {
    return this.customSegmentsMap.has(videoId)
  }

  async getTranscript(videoId: string): Promise<TranscriptResult> {
    const segments = this.customSegmentsMap.get(videoId)
    if (segments && segments.length > 0) {
      return {
        status: 'available',
        data: segments,
        sourceName: 'Người học tự cung cấp (User Custom)',
      }
    }
    return {
      status: 'unavailable',
      error: 'Chưa có phụ đề tự nhập cho video này.',
    }
  }
}

/**
 * Provider 3: Permitted Transcript Source (Future integration point)
 * For integration with authorized caption providers or official APIs with credentials.
 */
export class PermittedTranscriptProvider implements TranscriptProvider {
  name = 'Nguồn phụ đề được cấp phép (Permitted Source - Planned)'

  canProvide(_videoId: string): boolean {
    return false // Not active in frontend MVP
  }

  async getTranscript(_videoId: string): Promise<TranscriptResult> {
    return {
      status: 'unavailable',
      error: 'Dịch vụ phụ đề có bản quyền yêu cầu cấu hình API credentials trong bản phát hành sau.',
    }
  }
}

/**
 * Provider 4: Backend Speech-to-Text Service (Future integration point)
 * For integration with authorized whisper/speech-to-text backend for user-uploaded media.
 */
export class BackendSpeechToTextProvider implements TranscriptProvider {
  name = 'Dịch vụ Backend STT (Speech-to-Text - Planned)'

  canProvide(_videoId: string): boolean {
    return false // Requires backend service
  }

  async getTranscript(_videoId: string): Promise<TranscriptResult> {
    return {
      status: 'unavailable',
      error: 'Dịch vụ Speech-to-Text backend sẽ được triển khai khi có hạ tầng máy chủ xử lý âm thanh hợp pháp.',
    }
  }
}

/**
 * Coordinator for transcript fetching across providers.
 */
export class TranscriptService {
  private providers: TranscriptProvider[]

  constructor() {
    this.providers = [
      new LocalDemoTranscriptProvider(),
      new UserSuppliedTranscriptProvider(),
      new PermittedTranscriptProvider(),
      new BackendSpeechToTextProvider(),
    ]
  }

  async fetchTranscript(videoId: string): Promise<TranscriptResult> {
    // Check providers in order of priority
    for (const provider of this.providers) {
      if (provider.canProvide(videoId)) {
        try {
          const result = await provider.getTranscript(videoId)
          if (result.status === 'available') {
            return result
          }
        } catch (err) {
          return {
            status: 'error',
            error: err instanceof Error ? err.message : 'Lỗi khi tải phụ đề từ nhà cung cấp.',
            sourceName: provider.name,
          }
        }
      }
    }

    // Explicitly do not fake AI transcripts or download without authorization
    return {
      status: 'unavailable',
      error:
        'Video nhập từ bên ngoài không có sẵn phụ đề đối chiếu trong hệ thống mẫu. Video vẫn có thể xem và nghe tự do qua trình phát chính thức của YouTube.',
    }
  }
}

export const transcriptService = new TranscriptService()
