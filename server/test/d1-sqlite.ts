import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { D1Database, D1PreparedStatement, D1Result, D1ExecResult } from '../types'

/**
 * Creates an in-memory SQLite database simulating Cloudflare D1
 * using Node 24 native node:sqlite engine.
 */
export function createTestD1Database(withSeed = false): D1Database {
  const sqlite = new DatabaseSync(':memory:')

  // Enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON;')

  // Run initial migration
  const migrationPath = join(process.cwd(), 'migrations', '0001_initial.sql')
  const migrationSql = readFileSync(migrationPath, 'utf8')
  sqlite.exec(migrationSql)

  if (withSeed) {
    const seedPath = join(process.cwd(), 'migrations', 'seed.sql')
    const seedSql = readFileSync(seedPath, 'utf8')
    sqlite.exec(seedSql)
  }

  function createPreparedStatement(query: string, boundValues: unknown[] = []): D1PreparedStatement {
    return {
      bind(...values: unknown[]) {
        return createPreparedStatement(query, values)
      },
      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const stmt = sqlite.prepare(query)
        // Convert boolean to 1 or 0, undefined to null
        const sanitized = boundValues.map((v) => {
          if (typeof v === 'boolean') return v ? 1 : 0
          if (v === undefined) return null
          return v
        })
        const row = stmt.get(...sanitized) as Record<string, unknown> | undefined
        if (!row) return null
        if (colName && typeof colName === 'string') {
          return (row[colName] as unknown as T) ?? null
        }
        return row as unknown as T
      },
      async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query)
        const sanitized = boundValues.map((v) => {
          if (typeof v === 'boolean') return v ? 1 : 0
          if (v === undefined) return null
          return v
        })
        const results = stmt.all(...sanitized) as T[]
        return {
          results: results || [],
          success: true,
        }
      },
      async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query)
        const sanitized = boundValues.map((v) => {
          if (typeof v === 'boolean') return v ? 1 : 0
          if (v === undefined) return null
          return v
        })
        const info = stmt.run(...sanitized)
        return {
          results: [],
          success: true,
          meta: {
            changes: info.changes,
            last_row_id: info.lastInsertRowid,
          },
        }
      },
    }
  }

  return {
    prepare(query: string): D1PreparedStatement {
      return createPreparedStatement(query)
    },
    async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      // Execute within transaction
      sqlite.exec('BEGIN TRANSACTION')
      try {
        const results: D1Result<T>[] = []
        for (const s of statements) {
          const res = await s.run<T>()
          results.push(res)
        }
        sqlite.exec('COMMIT')
        return results
      } catch (err) {
        sqlite.exec('ROLLBACK')
        throw err
      }
    },
    async exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query)
      return { count: 1, duration: 0 }
    },
  }
}
