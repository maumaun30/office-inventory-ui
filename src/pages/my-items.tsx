import { PackageCheckIcon, PackageIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router"

import { EmptyState, PageHeader, StatusBadge } from "@/components/app/bits"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fmt } from "@/lib/format"
import { useItems, useMyAssignments } from "@/lib/queries"

export function MyItemsPage() {
  const q = useMyAssignments()
  const items = useItems()
  const byId = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data])
  const open = (q.data ?? []).filter((a) => !a.returned_at)
  const past = (q.data ?? []).filter((a) => a.returned_at)

  return (
    <div className="space-y-6">
      <PageHeader title="My items" description="Equipment checked out to you. Ask an admin to return or swap something." />
      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !open.length ? (
        <Card>
          <EmptyState icon={PackageCheckIcon} title="Nothing checked out to you" description="When an admin assigns you equipment, it will show up here." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {open.map((a) => {
            const item = byId.get(a.item_id)
            return (
              <Link key={a.id} to={`/items/${a.item_id}`} className="group">
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary/30">
                  <CardContent className="flex h-full flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <PackageIcon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item?.name ?? `Item #${a.item_id}`}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{item?.sku ?? item?.serial_number ?? `#${a.item_id}`}</p>
                      </div>
                      {a.quantity > 1 && <span className="font-mono text-sm text-muted-foreground">×{a.quantity}</span>}
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>Since {fmt.date(a.assigned_at)}</span>
                      {item && <StatusBadge status={item.status} />}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {!!past.length && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Previously held</h2>
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {past.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="truncate">{byId.get(a.item_id)?.name ?? `Item #${a.item_id}`}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmt.date(a.assigned_at)} – {fmt.date(a.returned_at!)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}
