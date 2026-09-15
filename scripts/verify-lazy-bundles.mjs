import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const initialJavaScriptBudgetBytes = 325 * 1024
const outputDirectory = path.resolve('dist')
const manifestPath = path.join(outputDirectory, '.vite', 'manifest.json')

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

function chunkKeyByName(name) {
  const matches = Object.entries(manifest)
    .filter(([, chunk]) => chunk.name === name)
    .map(([key]) => key)

  invariant(matches.length === 1, `Expected one ${name} chunk in ${manifestPath}, found ${matches.length}.`)
  return matches[0]
}

function staticDependencyKeys(rootKey) {
  invariant(manifest[rootKey], `Missing ${rootKey} from ${manifestPath}.`)
  const dependencies = new Set()
  const pending = [rootKey]

  while (pending.length > 0) {
    const key = pending.pop()
    if (dependencies.has(key)) continue

    const chunk = manifest[key]
    invariant(chunk, `Manifest references missing chunk ${key}.`)
    dependencies.add(key)
    pending.push(...(chunk.imports || []))
  }

  return dependencies
}

function assertDeferred(rootKey, deferredKey, label) {
  const staticDependencies = staticDependencyKeys(rootKey)
  invariant(
    !staticDependencies.has(deferredKey),
    `${label} became a static dependency of ${rootKey}; it must remain lazy-loaded.`,
  )
}

const entryKey = Object.entries(manifest).find(([, chunk]) => chunk.isEntry)?.[0]
invariant(entryKey, `No application entry was found in ${manifestPath}.`)

const gameRoomKey = 'src/GameRoom.jsx'
const chessBoard3DKey = 'src/ChessBoard3D.jsx'
const threeKey = chunkKeyByName('three')
const liveKitKey = chunkKeyByName('livekit')

assertDeferred(entryKey, threeKey, 'Three.js')
assertDeferred(entryKey, liveKitKey, 'LiveKit')
assertDeferred(gameRoomKey, threeKey, 'Three.js')
assertDeferred(gameRoomKey, liveKitKey, 'LiveKit')

const builtHtml = await readFile(path.join(outputDirectory, 'index.html'), 'utf8')
for (const deferredKey of [threeKey, liveKitKey]) {
  const deferredFile = manifest[deferredKey].file
  invariant(
    !builtHtml.includes(deferredFile),
    `${deferredFile} appears in the initial HTML and must not be preloaded.`,
  )
}

const gameRoomDynamicImports = new Set(manifest[gameRoomKey]?.dynamicImports || [])
invariant(
  gameRoomDynamicImports.has(chessBoard3DKey),
  'GameRoom must dynamically import ChessBoard3D.',
)
invariant(
  gameRoomDynamicImports.has(liveKitKey),
  'GameRoom must dynamically import LiveKit.',
)

const chessBoardDependencies = staticDependencyKeys(chessBoard3DKey)
invariant(
  chessBoardDependencies.has(threeKey),
  'ChessBoard3D no longer references the expected Three.js chunk.',
)

const initialDependencyKeys = staticDependencyKeys(entryKey)
const initialJavaScriptBytes = (await Promise.all(
  [...initialDependencyKeys].map(async (key) => {
    const chunk = manifest[key]
    if (!chunk.file.endsWith('.js')) return 0
    return (await stat(path.join(outputDirectory, chunk.file))).size
  }),
)).reduce((total, size) => total + size, 0)

invariant(
  initialJavaScriptBytes <= initialJavaScriptBudgetBytes,
  `Initial JavaScript is ${formatKiB(initialJavaScriptBytes)}, exceeding the ${formatKiB(initialJavaScriptBudgetBytes)} budget.`,
)

console.log('Bundle guard passed.')
console.log(`Initial JavaScript: ${formatKiB(initialJavaScriptBytes)} / ${formatKiB(initialJavaScriptBudgetBytes)}`)
console.log(`Deferred chunks: ${manifest[threeKey].file}, ${manifest[liveKitKey].file}`)
