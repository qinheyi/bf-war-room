// Small shared helpers: seeded RNG, CSV I/O, money rounding and formatting.

/** Deterministic PRNG (mulberry32) so the synthetic dataset is reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100
export const round1 = (n: number): number => Math.round((n + Number.EPSILON) * 10) / 10

export function usd(n: number): string {
  const sign = n < 0 ? "-" : ""
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function int(n: number): string {
  return n.toLocaleString("en-US")
}

export function pct(n: number): string {
  return `${round1(n).toFixed(1)}%`
}

/** One parsed CSV row plus the 1-based line number it came from (header = line 1). */
export type CsvRow = Record<string, string> & { __line: number }

export function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0)
  const header = lines[0].split(",")
  return lines.slice(1).map((line, i) => {
    const cells = line.split(",")
    const row = { __line: i + 2 } as CsvRow
    header.forEach((h, j) => {
      row[h] = cells[j] ?? ""
    })
    return row
  })
}

export function toCsv(header: string[], rows: Array<Record<string, string | number>>): string {
  const out = [header.join(",")]
  for (const r of rows) out.push(header.map((h) => String(r[h] ?? "")).join(","))
  return out.join("\n") + "\n"
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
