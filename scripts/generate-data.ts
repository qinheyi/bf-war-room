// Regenerates data/*.csv from the fixed seed. Output is byte-identical on every run.
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { generateDataset, SEED } from "../src/data/generate.ts"

const dir = join(import.meta.dirname, "..", "data")
mkdirSync(dir, { recursive: true })
const ds = generateDataset(SEED)
for (const [name, text] of Object.entries(ds.files)) writeFileSync(join(dir, name), text)
writeFileSync(join(dir, "planted_defects.json"), JSON.stringify(ds.planted, null, 2) + "\n")
console.log(`wrote ${Object.keys(ds.files).length} CSV files + planted_defects.json to data/ (seed ${SEED})`)
