import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../../server'
import { createTestD1Database } from '../../server/test/d1-sqlite'
import type { D1Database } from '../../server/types'

describe('ListenFlow Cloudflare D1 & Hono API', () => {
  let db: D1Database

  beforeEach(() => {
    // Fresh in-memory D1 database with schema for every test
    db = createTestD1Database(false)
  })

  const makeRequest = async (
    path: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: unknown
      env?: Record<string, unknown>
    } = {}
  ) => {
    const { method = 'GET', headers = {}, body, env = {} } = options

    const reqHeaders: Record<string, string> = {
      'content-type': 'application/json',
      ...headers,
    }

    const init: RequestInit = {
      method,
      headers: reqHeaders,
    }

    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    return app.request(path, init, {
      DB: db,
      ...env,
    })
  }

  describe('1. Health Check & Public Endpoints', () => {
    it('returns 200 and healthy status with D1 connected', async () => {
      const res = await makeRequest('/api/health')
      expect(res.status).toBe(200)

      const json = await res.json() as { status: string; database: string }
      expect(json.status).toBe('healthy')
      expect(json.database).toBe('connected')
    })
  })

  describe('2. Authentication, Authorization & Multi-User Isolation', () => {
    it('rejects requests missing user identity with 401 Unauthorized', async () => {
      const res = await makeRequest('/api/lessons')
      expect(res.status).toBe(401)

      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('Unauthorized')
    })

    it('rejects invalid user identifier format with 400 Bad Request', async () => {
      const res = await makeRequest('/api/lessons', {
        headers: { 'x-user-id': 'bad user with spaces & special characters $$$' },
      })
      expect(res.status).toBe(400)
    })

    it('enforces server-side API secret if configured in environment', async () => {
      const envWithSecret = { API_SECRET: 'super-secret-token-123' }

      // Call without secret and without user
      const unauth = await makeRequest('/api/lessons', { env: envWithSecret })
      expect(unauth.status).toBe(401)

      // Call with wrong secret
      const wrong = await makeRequest('/api/lessons', {
        headers: { 'x-api-key': 'wrong-key' },
        env: envWithSecret,
      })
      expect(wrong.status).toBe(401)

      // Call with valid secret and user
      const valid = await makeRequest('/api/lessons', {
        headers: { 'x-api-key': 'super-secret-token-123', 'x-user-id': 'user-alice' },
        env: envWithSecret,
      })
      expect(valid.status).toBe(200)
    })

    it('enforces strict multi-user data ownership isolation', async () => {
      const userAlice = 'user-alice'
      const userBob = 'user-bob'

      // Alice creates a lesson
      const createRes = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': userAlice },
        body: {
          videoId: 'dQw4w9WgXcQ',
          title: "Alice's Private English Lesson",
          sentences: [
            { startTime: 0, endTime: 3.5, text: 'Never gonna give you up' },
          ],
        },
      })
      expect(createRes.status).toBe(201)
      const created = await createRes.json() as { data: { id: string } }
      const lessonId = created.data.id

      // Bob attempts to read Alice's lesson -> 403 Forbidden
      const bobReadRes = await makeRequest(`/api/lessons/${lessonId}`, {
        headers: { 'x-user-id': userBob },
      })
      expect(bobReadRes.status).toBe(403)

      // Bob attempts to update Alice's lesson -> 403 Forbidden
      const bobUpdateRes = await makeRequest(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userBob },
        body: { title: 'Hacked by Bob' },
      })
      expect(bobUpdateRes.status).toBe(403)

      // Bob attempts to delete Alice's lesson -> 403 Forbidden
      const bobDeleteRes = await makeRequest(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userBob },
      })
      expect(bobDeleteRes.status).toBe(403)

      // Alice can read her own lesson -> 200 OK
      const aliceReadRes = await makeRequest(`/api/lessons/${lessonId}`, {
        headers: { 'x-user-id': userAlice },
      })
      expect(aliceReadRes.status).toBe(200)
    })
  })

  describe('3. Saved Lessons CRUD & Schema Validation', () => {
    const user = 'test-user-1'

    it('validates lesson payload schema and rejects invalid input', async () => {
      // Empty title
      const res1 = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: { videoId: 'abc12345', title: '' },
      })
      expect(res1.status).toBe(400)

      // Missing videoId
      const res2 = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: { title: 'Valid Title' },
      })
      expect(res2.status).toBe(400)

      // Sentence with endTime < startTime
      const res3 = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          videoId: 'abc12345',
          title: 'Valid Title',
          sentences: [{ startTime: 10, endTime: 5, text: 'Invalid timestamps' }],
        },
      })
      expect(res3.status).toBe(400)
    })

    it('creates, reads, updates, and deletes a lesson with segments', async () => {
      // 1. Create lesson
      const createRes = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          videoId: 'UF8uR6Z6KLc',
          title: 'Stanford Commencement Address',
          description: 'Stay hungry, stay foolish.',
          level: 'Advanced',
          language: 'en',
          sentences: [
            { startTime: 0, endTime: 4.5, text: 'I am honored to be with you today.' },
            { startTime: 4.6, endTime: 8.0, text: 'I never graduated from college.' },
          ],
        },
      })
      expect(createRes.status).toBe(201)
      const created = await createRes.json() as { data: { id: string; sentenceCount: number } }
      expect(created.data.sentenceCount).toBe(2)
      const lessonId = created.data.id

      // 2. Read lesson by ID
      const getRes = await makeRequest(`/api/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      expect(getRes.status).toBe(200)
      const fetched = await getRes.json() as { data: { title: string; sentences: unknown[] } }
      expect(fetched.data.title).toBe('Stanford Commencement Address')
      expect(fetched.data.sentences.length).toBe(2)

      // 3. List lessons
      const listRes = await makeRequest('/api/lessons', {
        headers: { 'x-user-id': user },
      })
      expect(listRes.status).toBe(200)
      const list = await listRes.json() as { data: Array<{ id: string }> }
      expect(list.data.some((l) => l.id === lessonId)).toBe(true)

      // 4. Update lesson
      const updateRes = await makeRequest(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'x-user-id': user },
        body: { title: 'Updated Title' },
      })
      expect(updateRes.status).toBe(200)

      const verifyUpdateRes = await makeRequest(`/api/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      const updatedJson = await verifyUpdateRes.json() as { data: { title: string } }
      expect(updatedJson.data.title).toBe('Updated Title')

      // 5. Delete lesson
      const delRes = await makeRequest(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user },
      })
      expect(delRes.status).toBe(200)

      // Verify it is gone
      const verifyDelRes = await makeRequest(`/api/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      expect(verifyDelRes.status).toBe(404)
    })
  })

  describe('4. User-provided Transcript Segments', () => {
    const user = 'test-user-segments'
    let lessonId: string

    beforeEach(async () => {
      const res = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          videoId: 'vid123',
          title: 'Test Lesson for Segments',
        },
      })
      const json = await res.json() as { data: { id: string } }
      lessonId = json.data.id
    })

    it('adds, updates, and deletes transcript segments', async () => {
      // 1. Add batch segments
      const addRes = await makeRequest(`/api/segments/lessons/${lessonId}`, {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          segments: [
            { startTime: 0, endTime: 3.0, text: 'First segment' },
            { startTime: 3.1, endTime: 6.0, text: 'Second segment', hint: 'two' },
          ],
        },
      })
      expect(addRes.status).toBe(201)
      const addJson = await addRes.json() as { data: { count: number; insertedIds: string[] } }
      expect(addJson.data.count).toBe(2)
      const segmentId = addJson.data.insertedIds[0]

      // 2. Fetch segments for lesson
      const listRes = await makeRequest(`/api/segments/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      expect(listRes.status).toBe(200)
      const listJson = await listRes.json() as { data: Array<{ id: string; text: string }> }
      expect(listJson.data.length).toBe(2)
      expect(listJson.data[0].text).toBe('First segment')

      // 3. Update segment
      const updateRes = await makeRequest(`/api/segments/${segmentId}`, {
        method: 'PUT',
        headers: { 'x-user-id': user },
        body: { text: 'Updated First segment text' },
      })
      expect(updateRes.status).toBe(200)

      // 4. Delete segment
      const delRes = await makeRequest(`/api/segments/${segmentId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user },
      })
      expect(delRes.status).toBe(200)

      const remainingRes = await makeRequest(`/api/segments/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      const remainingJson = await remainingRes.json() as { data: unknown[] }
      expect(remainingJson.data.length).toBe(1)
    })
  })

  describe('5. Dictation Attempts and Scores', () => {
    const user = 'test-user-attempts'
    let lessonId: string
    let segmentId: string

    beforeEach(async () => {
      const lessonRes = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          videoId: 'vid456',
          title: 'Dictation Test Lesson',
          sentences: [{ startTime: 0, endTime: 4.0, text: 'Hello world of dictation' }],
        },
      })
      const lessonJson = await lessonRes.json() as { data: { id: string } }
      lessonId = lessonJson.data.id

      const segRes = await makeRequest(`/api/segments/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      const segJson = await segRes.json() as { data: Array<{ id: string }> }
      segmentId = segJson.data[0].id
    })

    it('rejects attempt with invalid score or accuracy', async () => {
      const res = await makeRequest('/api/attempts', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          lessonId,
          segmentId,
          userInput: 'Hello',
          score: 150, // Invalid: > 100
          accuracy: 1.5, // Invalid: > 1.0
        },
      })
      expect(res.status).toBe(400)
    })

    it('records attempt and auto-updates sentence progress', async () => {
      const attemptRes = await makeRequest('/api/attempts', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          lessonId,
          segmentId,
          userInput: 'Hello world of dictation',
          score: 100,
          accuracy: 1.0,
          correctCount: 4,
          missingCount: 0,
          incorrectCount: 0,
          extraCount: 0,
        },
      })
      expect(attemptRes.status).toBe(201)
      const attemptJson = await attemptRes.json() as { data: { score: number; completed: boolean } }
      expect(attemptJson.data.score).toBe(100)
      expect(attemptJson.data.completed).toBe(true)

      // Verify attempts query for lesson
      const listRes = await makeRequest(`/api/attempts/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      expect(listRes.status).toBe(200)
      const listJson = await listRes.json() as { data: Array<{ score: number }> }
      expect(listJson.data.length).toBe(1)
      expect(listJson.data[0].score).toBe(100)

      // Verify sentence progress was automatically updated
      const progRes = await makeRequest(`/api/progress/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      expect(progRes.status).toBe(200)
      const progJson = await progRes.json() as {
        data: { sentenceProgress: Record<string, { score: number; completed: boolean }> }
      }
      expect(progJson.data.sentenceProgress[segmentId].score).toBe(100)
      expect(progJson.data.sentenceProgress[segmentId].completed).toBe(true)
    })
  })

  describe('6. Per-Sentence Learning Progress', () => {
    const user = 'test-user-prog'
    let lessonId: string
    let segmentId: string

    beforeEach(async () => {
      const lessonRes = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          videoId: 'vid-prog-1',
          title: 'Progress Test Lesson',
          sentences: [{ startTime: 0, endTime: 5.0, text: 'Sentence for progress test' }],
        },
      })
      const lessonJson = await lessonRes.json() as { data: { id: string } }
      lessonId = lessonJson.data.id

      const segRes = await makeRequest(`/api/segments/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      const segJson = await segRes.json() as { data: Array<{ id: string }> }
      segmentId = segJson.data[0].id
    })

    it('upserts and retrieves sentence learning progress', async () => {
      // 1. Upsert progress
      const upsertRes = await makeRequest(`/api/progress/lessons/${lessonId}/${segmentId}`, {
        method: 'PUT',
        headers: { 'x-user-id': user },
        body: {
          userInput: 'Partial typing text',
          score: 75,
          isRevealed: false,
          completed: false,
        },
      })
      expect(upsertRes.status).toBe(200)

      // 2. Get progress
      const getRes = await makeRequest(`/api/progress/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      expect(getRes.status).toBe(200)
      const json = await getRes.json() as {
        data: { sentenceProgress: Record<string, { userInput: string; score: number }> }
      }
      expect(json.data.sentenceProgress[segmentId].userInput).toBe('Partial typing text')
      expect(json.data.sentenceProgress[segmentId].score).toBe(75)

      // 3. Clear progress
      const delRes = await makeRequest(`/api/progress/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user },
      })
      expect(delRes.status).toBe(200)

      const afterClear = await makeRequest(`/api/progress/lessons/${lessonId}`, {
        headers: { 'x-user-id': user },
      })
      const afterJson = await afterClear.json() as {
        data: { sentenceProgress: Record<string, unknown> }
      }
      expect(Object.keys(afterJson.data.sentenceProgress).length).toBe(0)
    })
  })

  describe('7. Saved Vocabulary Notebook', () => {
    const user = 'test-user-vocab'

    it('rejects saving vocabulary with empty word', async () => {
      const res = await makeRequest('/api/vocabulary', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: { word: '' },
      })
      expect(res.status).toBe(400)
    })

    it('saves, lists, and deletes vocabulary items', async () => {
      // 1. Save word
      const saveRes = await makeRequest('/api/vocabulary', {
        method: 'POST',
        headers: { 'x-user-id': user },
        body: {
          word: 'perseverance',
          meaning: 'Persistence in doing something despite difficulty or delay in achieving success.',
          contextSentence: 'With hard work and perseverance, you can achieve your goals.',
          timestamp: 12.5,
          videoId: 'UF8uR6Z6KLc',
          lessonTitle: 'Inspirational Speech',
        },
      })
      expect(saveRes.status).toBe(201)
      const saveJson = await saveRes.json() as { data: { id: string; word: string } }
      expect(saveJson.data.word).toBe('perseverance')
      const vocabId = saveJson.data.id

      // 2. List vocabulary
      const listRes = await makeRequest('/api/vocabulary', {
        headers: { 'x-user-id': user },
      })
      expect(listRes.status).toBe(200)
      const listJson = await listRes.json() as { data: Array<{ id: string; word: string }> }
      expect(listJson.data.some((v) => v.id === vocabId && v.word === 'perseverance')).toBe(true)

      // 3. Other user cannot delete Alice's word
      const otherUserDelete = await makeRequest(`/api/vocabulary/${vocabId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'user-intruder' },
      })
      expect(otherUserDelete.status).toBe(403)

      // 4. Owner deletes word
      const delRes = await makeRequest(`/api/vocabulary/${vocabId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user },
      })
      expect(delRes.status).toBe(200)

      // Verify word is removed
      const listAfter = await makeRequest('/api/vocabulary', {
        headers: { 'x-user-id': user },
      })
      const listAfterJson = await listAfter.json() as { data: Array<{ id: string }> }
      expect(listAfterJson.data.some((v) => v.id === vocabId)).toBe(false)
    })
  })

  describe('8. Edge Cases, Failure Handling & Security', () => {
    it('returns 400 for invalid JSON body', async () => {
      const res = await makeRequest('/api/lessons', {
        method: 'POST',
        headers: { 'x-user-id': 'user-1' },
        body: 'invalid-non-json-string{',
      })
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
    })

    it('returns 404 for unknown API endpoints', async () => {
      const res = await makeRequest('/api/unknown-endpoint', {
        headers: { 'x-user-id': 'user-1' },
      })
      expect(res.status).toBe(404)
    })
  })
})
