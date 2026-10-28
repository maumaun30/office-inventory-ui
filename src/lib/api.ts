import type {
  Assignment,
  Category,
  DirectoryUser,
  ImportResult,
  InventorySummary,
  Item,
  ItemInput,
  ItemStatus,
  Location,
  Me,
  Page,
  StockMovement,
} from "@/lib/types"

const INVENTORY_URL = (import.meta.env.VITE_INVENTORY_API_URL ?? "http://localhost:8001").replace(/\/$/, "")
const USERS_URL = (import.meta.env.VITE_USERS_API_URL ?? "http://localhost:8000").replace(/\/$/, "")

const TOKEN_KEY = "inventory.token"

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      // storage unavailable (private mode); session lasts until reload
    }
  },
}

export class ApiError extends Error {
  status: number
  /** Field -> messages, from Laravel validation or FastAPI 422s. */
  fields: Record<string, string[]>
  /** Raw response body, for callers that need structured details (e.g. CSV row errors). */
  body: unknown

  constructor(status: number, message: string, fields: Record<string, string[]> = {}, body?: unknown) {
    super(message)
    this.status = status
    this.fields = fields
    this.body = body
  }
}

let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

function parseError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>
    // Laravel: {message, errors: {field: [msg]}}
    if (b.errors && typeof b.errors === "object" && !Array.isArray(b.errors)) {
      return new ApiError(status, String(b.message ?? "Request failed"), b.errors as Record<string, string[]>, body)
    }
    const detail = b.detail
    if (typeof detail === "string") return new ApiError(status, detail, {}, body)
    // FastAPI validation: [{loc: [..., field], msg}]
    if (Array.isArray(detail)) {
      const fields: Record<string, string[]> = {}
      for (const d of detail as { loc?: unknown[]; msg?: string }[]) {
        const key = String(d.loc?.[d.loc.length - 1] ?? "form")
        ;(fields[key] ??= []).push(d.msg ?? "Invalid value")
      }
      const first = Object.entries(fields)[0]
      return new ApiError(status, first ? `${first[0]}: ${first[1][0]}` : "Invalid request", fields, body)
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      return new ApiError(status, String((detail as { message: unknown }).message), {}, body)
    }
  }
  return new ApiError(status, status >= 500 ? "Server error, try again shortly" : `Request failed (${status})`, {}, body)
}

async function request(base: string, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")
  const token = tokenStore.get()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json")

  let res: Response
  try {
    res = await fetch(base + path, { ...init, headers })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection.")
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (res.status === 401 && token) onUnauthorized()
    throw parseError(res.status, body)
  }
  return res
}

async function json<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await request(base, path, init)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

const inv = <T>(path: string, init?: RequestInit) => json<T>(INVENTORY_URL, path, init)
const body = (data: unknown) => JSON.stringify(data)

function qs(params: Record<string, string | number | boolean | null | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ""
}

export interface ItemFilters {
  q?: string
  status?: ItemStatus
  category_id?: number
  location_id?: number
  low_stock?: boolean
}

export const api = {
  // Users API (Laravel)
  login: (email: string, password: string) =>
    json<{ token: string }>(USERS_URL, "/api/login", { method: "POST", body: body({ email, password, device_name: "web" }) }),
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    json<{ token: string }>(USERS_URL, "/api/register", { method: "POST", body: body({ ...data, device_name: "web" }) }),
  logout: () => json<void>(USERS_URL, "/api/logout", { method: "POST" }),

  // Inventory API
  me: () => inv<Me>("/me"),
  myAssignments: (active?: boolean) => inv<Assignment[]>(`/me/assignments${qs({ active })}`),

  summary: () => inv<InventorySummary>("/items/summary"),
  items: (f: ItemFilters = {}) => inv<Item[]>(`/items${qs({ ...f, low_stock: f.low_stock || undefined, limit: 500 })}`),
  item: (id: number) => inv<Item>(`/items/${id}`),
  createItem: (data: ItemInput) => inv<Item>("/items", { method: "POST", body: body(data) }),
  updateItem: (id: number, data: ItemInput) => inv<Item>(`/items/${id}`, { method: "PATCH", body: body(data) }),
  deleteItem: (id: number) => inv<void>(`/items/${id}`, { method: "DELETE" }),
  adjustStock: (id: number, delta: number, reason?: string) =>
    inv<Item>(`/items/${id}/adjust`, { method: "POST", body: body({ delta, reason: reason || null }) }),
  movements: (id: number) => inv<StockMovement[]>(`/items/${id}/movements`),

  exportItems: async () => {
    const res = await request(INVENTORY_URL, "/items/export")
    const name = /filename="?([^"]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "items.csv"
    return { blob: await res.blob(), name }
  },
  importItems: (file: File, dryRun: boolean) => {
    const fd = new FormData()
    fd.append("file", file)
    return inv<ImportResult>(`/items/import${qs({ dry_run: dryRun })}`, { method: "POST", body: fd })
  },

  categories: () => inv<Category[]>("/categories"),
  createCategory: (data: Partial<Category>) => inv<Category>("/categories", { method: "POST", body: body(data) }),
  updateCategory: (id: number, data: Partial<Category>) =>
    inv<Category>(`/categories/${id}`, { method: "PATCH", body: body(data) }),
  deleteCategory: (id: number) => inv<void>(`/categories/${id}`, { method: "DELETE" }),

  locations: () => inv<Location[]>("/locations"),
  createLocation: (data: Partial<Location>) => inv<Location>("/locations", { method: "POST", body: body(data) }),
  updateLocation: (id: number, data: Partial<Location>) =>
    inv<Location>(`/locations/${id}`, { method: "PATCH", body: body(data) }),
  deleteLocation: (id: number) => inv<void>(`/locations/${id}`, { method: "DELETE" }),

  assignments: (f: { item_id?: number; user_id?: number; assignee?: string; active?: boolean } = {}) =>
    inv<Assignment[]>(`/assignments${qs({ ...f, limit: 500 })}`),
  assign: (data: { item_id: number; user_id: number; quantity: number; notes?: string }) =>
    inv<Assignment>("/assignments", { method: "POST", body: body(data) }),
  returnAssignment: (id: number) => inv<Assignment>(`/assignments/${id}/return`, { method: "POST" }),

  users: async (page = 1, perPage = 20): Promise<Page<DirectoryUser>> => {
    const res = await request(INVENTORY_URL, `/users${qs({ page, per_page: perPage })}`)
    const data = (await res.json()) as DirectoryUser[]
    const num = (h: string, fallback: number) => Number(res.headers.get(h) ?? fallback)
    return {
      data,
      page: num("X-Page", page),
      perPage: num("X-Per-Page", perPage),
      total: num("X-Total-Count", data.length),
      lastPage: num("X-Last-Page", 1),
    }
  },
  userAssignments: (id: number) => inv<Assignment[]>(`/users/${id}/assignments`),
}
