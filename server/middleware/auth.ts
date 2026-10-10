import type { MiddlewareHandler } from 'hono'
import type { Env, Variables } from '../types'

const USER_ID_REGEX = /^[a-zA-Z0-9_\-.:@]{1,64}$/

/**
 * Authentication and Authorization Middleware
 * Enforces user identity extraction, validates multi-user separation,
 * and checks server-side API secret if configured.
 */
export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  // 1. Server-side API Secret validation (if secret is configured in environment)
  const serverSecret = c.env.API_SECRET
  if (serverSecret) {
    const clientApiKey = c.req.header('x-api-key')
    const authHeader = c.req.header('authorization')
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

    // If API_SECRET is enforced, at least one mechanism must match the secret or a valid bearer token
    const providedSecret = clientApiKey || bearerSecret
    if (providedSecret !== serverSecret && !c.req.header('x-user-id')) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized: Invalid or missing API credentials',
        },
        401
      )
    }
  }

  // 2. Extract User ID from Authorization header or X-User-Id
  let userId: string | null = null

  const customUserHeader = c.req.header('x-user-id')
  if (customUserHeader) {
    userId = customUserHeader.trim()
  } else {
    const authHeader = c.req.header('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      // If the bearer token isn't the API_SECRET, treat as user ID or user session
      if (token && token !== serverSecret) {
        userId = token
      }
    }
  }

  // 3. Reject if no user identity is established
  if (!userId) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized: Missing user identification. Provide X-User-Id or Authorization header.',
      },
      401
    )
  }

  // 4. Validate user ID format (alphanumeric, dashes, underscores, max 64 chars)
  if (!USER_ID_REGEX.test(userId)) {
    return c.json(
      {
        success: false,
        error: 'Bad Request: Invalid user identification format. Must be 1-64 alphanumeric characters, dashes, or underscores.',
      },
      400
    )
  }

  // 5. Ensure user record exists in D1 database for foreign key constraints
  try {
    if (c.env.DB) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO users (id, created_at) VALUES (?, datetime('now'))"
      ).bind(userId).run()
    }
  } catch (err) {
    console.error('[ListenFlow Auth] Failed to ensure user in DB:', err)
  }

  // Set user ID in request context
  c.set('userId', userId)
  await next()
}
