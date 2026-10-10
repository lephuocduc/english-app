import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, Variables } from './types'
import { authMiddleware } from './middleware/auth'
import { lessonsRouter } from './routes/lessons'
import { segmentsRouter } from './routes/segments'
import { attemptsRouter } from './routes/attempts'
import { progressRouter } from './routes/progress'
import { vocabularyRouter } from './routes/vocabulary'
import { transcriptRouter } from './routes/transcript'

export const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// 1. CORS Configuration for Cloudflare Worker & frontend clients
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Api-Key'],
    maxAge: 86400,
  })
)

// 2. Health check endpoint (Public - no auth required)
app.get('/api/health', async (c) => {
  let dbStatus = 'unconfigured'
  if (c.env.DB) {
    try {
      const res = await c.env.DB.prepare('SELECT 1 as ok').first<{ ok: number }>()
      dbStatus = res?.ok === 1 ? 'connected' : 'error'
    } catch {
      dbStatus = 'unavailable'
    }
  }

  return c.json({
    status: 'healthy',
    service: 'ListenFlow D1 Hono API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  })
})

// 3. Mount Authentication Middleware on protected /api/* routes
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health' || c.req.path.startsWith('/api/transcript')) {
    return next()
  }
  return authMiddleware(c, next)
})

// 4. Mount API feature routers
app.route('/api/lessons', lessonsRouter)
app.route('/api/segments', segmentsRouter)
app.route('/api/attempts', attemptsRouter)
app.route('/api/progress', progressRouter)
app.route('/api/vocabulary', vocabularyRouter)
app.route('/api/transcript', transcriptRouter)

// 5. Global 404 Not Found Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: `Resource not found: ${c.req.method} ${c.req.path}`,
    },
    404
  )
})

// 6. Global Error Handler (Sanitizes stack traces and prevents secret leakage)
app.onError((err, c) => {
  console.error('[ListenFlow API Unhandled Error]', err)
  return c.json(
    {
      success: false,
      error: 'An internal server error occurred',
      message: err instanceof Error ? err.message : 'Unknown error',
    },
    500
  )
})

export default app
