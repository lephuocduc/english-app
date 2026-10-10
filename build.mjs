import { build } from 'vite'
import { cpSync, rmSync, existsSync, copyFileSync, writeFileSync } from 'node:fs'
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
  // Create 404.html fallback for GitHub Pages SPA routing
  if (existsSync(join('dist', 'index.html'))) {
    copyFileSync(join('dist', 'index.html'), join('dist', '404.html'))
  }
  // Create .nojekyll to disable Jekyll processing on GitHub Pages
  writeFileSync(join('dist', '.nojekyll'), '')
  console.log('✓ Production build completed successfully!')
} catch (err) {
  console.error('Copy to dist error:', err)
  process.exit(1)
}
