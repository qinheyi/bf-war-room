import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseCsv, type CsvRow } from "../util.ts"

export const DATA_DIR = join(import.meta.dirname, "..", "..", "data")

export type Data = {
  dir: string
  orders: CsvRow[]
  disputes: CsvRow[]
  settlements: CsvRow[]
  fees: CsvRow[]
}

export function loadData(dir = DATA_DIR): Data {
  const read = (f: string) => parseCsv(readFileSync(join(dir, f), "utf8"))
  return {
    dir,
    orders: read("orders.csv"),
    disputes: read("disputes.csv"),
    settlements: read("settlements.csv"),
    fees: read("fee_schedule.csv"),
  }
}
