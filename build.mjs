import { build } from 'vite'
import { cpSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tempOut = join(tmpdir(), 'listenflow_dist_build')
if (existsSync(tempOut)) {
  rmSync(tempOut, { recursive: true, force: true })
}

console.log('Bundling ListenFlow production release...')
await build({
  build: {
    outDir: tempOut,
    emptyOutDir: true,
  },
})

console.log('Syncing artifacts to dist/ ...')
try {
  cpSync(tempOut, 'dist', { recursive: true, force: true })
  console.log('✓ Production build completed successfully!')
} catch (err) {
  console.error('Copy to dist error:', err)
  process.exit(1)
}
