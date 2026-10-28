import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api, ApiError, type ItemFilters } from "@/lib/api"

export const keys = {
  summary: ["summary"] as const,
  items: (f?: ItemFilters) => ["items", f ?? {}] as const,
  item: (id: number) => ["item", id] as const,
  movements: (id: number) => ["movements", id] as const,
  categories: ["categories"] as const,
  locations: ["locations"] as const,
  assignments: (f?: object) => ["assignments", f ?? {}] as const,
  myAssignments: ["my-assignments"] as const,
  users: (page: number, perPage: number) => ["users", page, perPage] as const,
  userAssignments: (id: number) => ["user-assignments", id] as const,
}

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: api.summary })
export const useItems = (f: ItemFilters = {}) => useQuery({ queryKey: keys.items(f), queryFn: () => api.items(f) })
export const useItem = (id: number) => useQuery({ queryKey: keys.item(id), queryFn: () => api.item(id) })
export const useMovements = (id: number, enabled = true) =>
  useQuery({ queryKey: keys.movements(id), queryFn: () => api.movements(id), enabled })
export const useCategories = () => useQuery({ queryKey: keys.categories, queryFn: api.categories })
export const useLocations = () => useQuery({ queryKey: keys.locations, queryFn: api.locations })
export const useAssignments = (f: Parameters<typeof api.assignments>[0] = {}, enabled = true) =>
  useQuery({ queryKey: keys.assignments(f), queryFn: () => api.assignments(f), enabled })
export const useMyAssignments = () => useQuery({ queryKey: keys.myAssignments, queryFn: () => api.myAssignments() })
export const useUsers = (page: number, perPage = 20, enabled = true) =>
  useQuery({ queryKey: keys.users(page, perPage), queryFn: () => api.users(page, perPage), enabled, placeholderData: (prev) => prev })
export const useUserAssignments = (id: number | null) =>
  useQuery({ queryKey: keys.userAssignments(id ?? 0), queryFn: () => api.userAssignments(id!), enabled: id != null })

/**
 * Mutation that toasts on success/failure and refreshes all inventory data.
 * Everything is cheap to refetch, so invalidating broadly keeps counts consistent.
 */
export function useAction<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  opts: { success?: string | ((r: TResult) => string); silentError?: boolean } = {},
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" })
      const msg = typeof opts.success === "function" ? opts.success(result) : opts.success
      if (msg) toast.success(msg)
    },
    onError: (err) => {
      if (!opts.silentError) toast.error(err instanceof ApiError ? err.message : "Something went wrong")
    },
  })
}
