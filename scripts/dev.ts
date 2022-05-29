import { execSync } from 'child_process'
import { moveFiles } from './shared'

const output = './dist'

async function dev () {
  await moveFiles(output)
  execSync('tsup src/extension.ts --format cjs --external vscode --no-shims --sourcemap --watch', { stdio: 'inherit' })
}

dev()
