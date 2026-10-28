import type { Item, ItemStatus } from "@/lib/types"

const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" })
const compactMoney = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", notation: "compact" })
const number = new Intl.NumberFormat()
const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

export const fmt = {
  money: (n: number | null | undefined) => (n == null ? "—" : money.format(n)),
  compactMoney: (n: number) => (n >= 100_000 ? compactMoney.format(n) : money.format(n)),
  number: (n: number) => number.format(n),
  date: (s: string) => date.format(new Date(s)),
  dateTime: (s: string) => dateTime.format(new Date(s)),
  relative: (s: string) => {
    const seconds = (new Date(s).getTime() - Date.now()) / 1000
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ["year", 31536000],
      ["month", 2592000],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ]
    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
    }
    return "just now"
  },
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  active: "Active",
  in_repair: "In repair",
  retired: "Retired",
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

export function isLowStock(item: Item) {
  return item.status === "active" && item.available_quantity <= item.reorder_level
}
