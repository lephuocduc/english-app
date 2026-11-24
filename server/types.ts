// Cloudflare D1 and ListenFlow Server Type Definitions

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[]
  success: boolean
  meta?: Record<string, unknown>
  error?: string
}

export interface D1ExecResult {
  count: number
  duration: number
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  exec(query: string): Promise<D1ExecResult>
}

export interface AiBinding {
  run(
    model: string,
    input: Record<string, unknown>,
    options?: { returnRawResponse?: boolean }
  ): Promise<Response | ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array>
}

export interface Env {
  DB: D1Database
  AI?: AiBinding
  API_SECRET?: string
  JWT_SECRET?: string
  ENVIRONMENT?: string
}

export interface Variables {
  userId: string
  userRole?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}
