import { copy, readJSON, remove, writeJSON } from 'fs-extra'

export async function moveFiles (output: string) {
  await remove(output)

  const files = [
    'README.md',
    'CHANGELOG.md',
    'snippets',
    '.vscodeignore'
  ]
  for (const f of files) {
    await copy(`./${f}`, `${output}/${f}`)
    console.log('Copy', f)
  }
  const json = await readJSON('./package.json')
  delete json.scripts
  delete json.devDependencies
  json.main = 'extension.js'
  await writeJSON(`${output}/package.json`, json)
}
