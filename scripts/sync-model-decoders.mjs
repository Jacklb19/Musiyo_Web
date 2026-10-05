import { mkdir, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const source = join(dirname(require.resolve('three')), '../examples/jsm/libs/draco/gltf')
const target = fileURLToPath(new URL('../public/model-decoders/draco/', import.meta.url))
await mkdir(target, { recursive: true })
for (const name of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
  await copyFile(join(source, name), join(target, name))
}

await copyFile(fileURLToPath(new URL('licenses/draco.txt', import.meta.url)), join(target, 'LICENSE.txt'))
