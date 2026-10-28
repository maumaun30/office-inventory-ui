import { DownloadIcon, FilterXIcon, PackageIcon, PlusIcon, SearchIcon, UploadIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { EmptyState, PageHeader, StatusBadge, StockMeter, TableSkeleton } from "@/components/app/bits"
import { ItemActions } from "@/components/app/item-actions"
import { ImportDialog, ItemFormDialog } from "@/components/app/item-dialogs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDebounced } from "@/hooks/use-debounced"
import { api, ApiError, type ItemFilters } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { fmt, STATUS_LABEL } from "@/lib/format"
import { useCategories, useItems, useLocations } from "@/lib/queries"
import type { ItemStatus } from "@/lib/types"

const ALL = "all"

export function ItemsPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get("q") ?? "")
  const debouncedQ = useDebounced(q)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const categories = useCategories()
  const locations = useLocations()

  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (p) => {
          if (value) p.set(key, value)
          else p.delete(key)
          return p
        },
        { replace: true },
      ),
    [setParams],
  )

  useEffect(() => setParam("q", debouncedQ || null), [debouncedQ, setParam])

  const filters: ItemFilters = {
    q: params.get("q") ?? undefined,
    status: (params.get("status") as ItemStatus) ?? undefined,
    category_id: params.get("category") ? Number(params.get("category")) : undefined,
    location_id: params.get("location") ? Number(params.get("location")) : undefined,
    low_stock: params.get("low_stock") === "1",
  }
  const items = useItems(filters)
  const filtered = !!(filters.q || filters.status || filters.category_id || filters.location_id || filters.low_stock)

  const exportCsv = async () => {
    setExporting(true)
    try {
      const { blob, name } = await api.exportItems()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement("a"), { href: url, download: name })
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        description={items.data ? `${items.data.length} ${filtered ? "matching" : "total"} item${items.data.length === 1 ? "" : "s"}` : "Everything the office owns"}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>
              <DownloadIcon /> Export
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" onClick={() => setImporting(true)}>
                  <UploadIcon /> Import
                </Button>
                <Button onClick={() => setCreating(true)}>
                  <PlusIcon /> New item
                </Button>
              </>
            )}
          </>
        }
      />

      <Card className="gap-0 overflow-visible py-0">
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or serial…" className="pl-8" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Select value={params.get("status") ?? ALL} onValueChange={(v) => setParam("status", v === ALL ? null : v)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={params.get("category") ?? ALL} onValueChange={(v) => setParam("category", v === ALL ? null : v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.data?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={params.get("location") ?? ALL} onValueChange={(v) => setParam("location", v === ALL ? null : v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All locations</SelectItem>
                {locations.data?.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="flex h-8 items-center gap-2 rounded-lg border px-2.5 text-sm font-normal whitespace-nowrap">
              <Switch checked={filters.low_stock} onCheckedChange={(v) => setParam("low_stock", v ? "1" : null)} />
              Low stock
            </Label>
          </div>
        </div>

        {items.isPending ? (
          <TableSkeleton />
        ) : items.isError ? (
          <EmptyState icon={PackageIcon} title="Couldn't load items" description={items.error.message} />
        ) : !items.data.length ? (
          <EmptyState
            icon={filtered ? FilterXIcon : PackageIcon}
            title={filtered ? "No items match" : "No items yet"}
            description={filtered ? "Try a different search or clear the filters." : "Add your first item or import a spreadsheet."}
            action={
              filtered ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("")
                    setParams({}, { replace: true })
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                isAdmin && (
                  <Button onClick={() => setCreating(true)}>
                    <PlusIcon /> New item
                  </Button>
                )
              )
            }
          />
        ) : (
          <>
            {/* Desktop */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  {isAdmin && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.data.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell className="max-w-72 pl-4">
                      <Link to={`/items/${item.id}`} className="block min-w-0">
                        <p className="truncate font-medium group-hover:text-primary">{item.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{item.sku ?? item.serial_number ?? `#${item.id}`}</p>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.location?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <StockMeter item={item} className="w-32" />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular">{fmt.money(item.unit_cost)}</TableCell>
                    {isAdmin && (
                      <TableCell className="pr-3">
                        <ItemActions item={item} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Mobile */}
            <ul className="divide-y md:hidden">
              {items.data.map((item) => (
                <li key={item.id} className="flex items-start gap-3 p-4">
                  <Link to={`/items/${item.id}`} className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[item.category?.name, item.location?.name].filter(Boolean).join(" · ") || "Uncategorized"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={item.status} />
                      <StockMeter item={item} className="flex-1" />
                    </div>
                  </Link>
                  {isAdmin && <ItemActions item={item} />}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <ItemFormDialog open={creating} onOpenChange={setCreating} onSaved={(item) => navigate(`/items/${item.id}`)} />
      <ImportDialog open={importing} onOpenChange={setImporting} />
    </div>
  )
}
