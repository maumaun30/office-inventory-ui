import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PackagePlusIcon,
  PencilIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router"

import { EmptyState, StatusBadge } from "@/components/app/bits"
import { ItemActions } from "@/components/app/item-actions"
import { AdjustStockDialog, AssignDialog, ItemFormDialog } from "@/components/app/item-dialogs"
import { ReturnButton } from "@/components/app/return-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { fmt, initials, isLowStock } from "@/lib/format"
import { useAssignments, useItem, useMovements } from "@/lib/queries"
import type { Item, MovementKind } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ItemDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const q = useItem(id)
  const [dialog, setDialog] = useState<"edit" | "adjust" | "assign" | null>(null)
  const close = (o: boolean) => !o && setDialog(null)

  if (q.isPending) return <DetailSkeleton />
  if (q.isError)
    return (
      <EmptyState
        icon={PackagePlusIcon}
        title={q.error instanceof ApiError && q.error.status === 404 ? "Item not found" : "Couldn't load item"}
        description={q.error.message}
        action={
          <Button variant="outline" asChild>
            <Link to="/items">Back to items</Link>
          </Button>
        }
      />
    )

  const item = q.data
  const canAssign = item.status === "active" && item.available_quantity > 0

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link to="/items">
            <ArrowLeftIcon /> Items
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight break-words">{item.name}</h1>
              <StatusBadge status={item.status} />
              {isLowStock(item) && (
                <Badge variant="outline" className="border-warning/25 bg-warning/12 text-warning">
                  Low stock
                </Badge>
              )}
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              {[item.sku, item.serial_number && `S/N ${item.serial_number}`, `#${item.id}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 gap-2">
              <Button onClick={() => setDialog("assign")} disabled={!canAssign}>
                <ArrowLeftRightIcon /> Assign
              </Button>
              <Button variant="outline" onClick={() => setDialog("adjust")}>
                <PackagePlusIcon /> <span className="hidden sm:inline">Adjust stock</span>
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDialog("edit")} aria-label="Edit">
                <PencilIcon />
              </Button>
              <ItemActions
                item={item}
                onDeleted={() => navigate("/items")}
                trigger={
                  <Button variant="outline" size="icon" aria-label="More">
                    <MoreHorizontalIcon />
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:order-last">
          <StockCard item={item} />
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Category">{item.category?.name ?? "—"}</Row>
              <Row label="Location">
                {item.location ? (
                  <span className="text-right">
                    {item.location.name}
                    {(item.location.building || item.location.floor || item.location.room) && (
                      <span className="block text-xs text-muted-foreground">
                        {[item.location.building, item.location.floor && `Floor ${item.location.floor}`, item.location.room && `Room ${item.location.room}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Unit cost">
                <span className="font-mono">{fmt.money(item.unit_cost)}</span>
              </Row>
              <Row label="Total value">
                <span className="font-mono">{item.unit_cost == null ? "—" : fmt.money(item.unit_cost * item.quantity)}</span>
              </Row>
              <Separator />
              <Row label="Added">{fmt.date(item.created_at)}</Row>
              <Row label="Updated">{fmt.relative(item.updated_at)}</Row>
              {item.description && (
                <>
                  <Separator />
                  <p className="whitespace-pre-wrap text-muted-foreground">{item.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {isAdmin ? (
            <Tabs defaultValue="holders">
              <TabsList>
                <TabsTrigger value="holders">
                  <UsersIcon /> Holders
                </TabsTrigger>
                <TabsTrigger value="history">
                  <HistoryIcon /> Stock history
                </TabsTrigger>
              </TabsList>
              <TabsContent value="holders">
                <Holders item={item} />
              </TabsContent>
              <TabsContent value="history">
                <History itemId={item.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>About this item</CardTitle>
                <CardDescription>
                  {item.available_quantity > 0
                    ? `${item.available_quantity} available. Ask an admin to check one out to you.`
                    : "None available right now."}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      {isAdmin && (
        <>
          <ItemFormDialog open={dialog === "edit"} onOpenChange={close} item={item} />
          <AdjustStockDialog open={dialog === "adjust"} onOpenChange={close} item={item} />
          <AssignDialog open={dialog === "assign"} onOpenChange={close} item={item} />
        </>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}

function StockCard({ item }: { item: Item }) {
  const low = isLowStock(item)
  const assignedPct = item.quantity ? (item.assigned_quantity / item.quantity) * 100 : 0
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Available</p>
            <p className={cn("font-mono text-4xl font-semibold tracking-tight tabular", low && "text-warning")}>{item.available_quantity}</p>
          </div>
          <p className="pb-1 text-sm text-muted-foreground">
            of <span className="font-mono font-medium text-foreground">{item.quantity}</span> in stock
          </p>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full", low ? "bg-warning" : "bg-primary")} style={{ width: `${100 - assignedPct}%` }} />
          <div className="h-full bg-chart-5/60" style={{ width: `${assignedPct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Assigned</p>
            <p className="font-mono font-semibold">{item.assigned_quantity}</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Reorder at</p>
            <p className="font-mono font-semibold">{item.reorder_level}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Holders({ item }: { item: Item }) {
  const q = useAssignments({ item_id: item.id })
  const open = (q.data ?? []).filter((a) => !a.returned_at)
  const past = (q.data ?? []).filter((a) => a.returned_at)

  return (
    <Card className="gap-0 py-0">
      {q.isPending ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : !q.data?.length ? (
        <EmptyState icon={UsersIcon} title="Never assigned" description="Use “Assign” to check this item out to someone." />
      ) : (
        <ul className="divide-y">
          {[...open, ...past].map((a) => (
            <li key={a.id} className={cn("flex items-center gap-3 p-4", a.returned_at && "opacity-60")}>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {initials(a.assignee_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {a.assignee_name}
                  {a.quantity > 1 && <span className="ml-1.5 font-mono text-xs text-muted-foreground">×{a.quantity}</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.returned_at ? `Returned ${fmt.date(a.returned_at)}` : `Since ${fmt.date(a.assigned_at)}`}
                  {a.notes && ` · ${a.notes}`}
                </p>
              </div>
              {!a.returned_at && <ReturnButton assignment={a} itemName={item.name} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const KIND: Record<MovementKind, { label: string; icon: typeof SparklesIcon }> = {
  initial: { label: "Initial stock", icon: SparklesIcon },
  adjust: { label: "Adjusted", icon: PackagePlusIcon },
  edit: { label: "Edited", icon: PencilIcon },
}

function History({ itemId }: { itemId: number }) {
  const q = useMovements(itemId)
  const rows = [...(q.data ?? [])].reverse()
  return (
    <Card className="gap-0 py-0">
      {q.isPending ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : !rows.length ? (
        <EmptyState icon={HistoryIcon} title="No stock changes yet" />
      ) : (
        <ol className="relative p-4">
          {rows.map((m, i) => {
            const Kind = KIND[m.kind]
            const up = m.delta > 0
            return (
              <li key={m.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < rows.length - 1 && <span className="absolute top-9 bottom-0 left-4 w-px bg-border" />}
                <div
                  className={cn(
                    "relative flex size-8 shrink-0 items-center justify-center rounded-full",
                    up ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {up ? <ArrowUpIcon className="size-4" /> : <ArrowDownIcon className="size-4" />}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm">
                    <span className="font-medium">{Kind.label}</span>{" "}
                    <span className={cn("font-mono", up ? "text-success" : "text-destructive")}>
                      {up ? "+" : ""}
                      {m.delta}
                    </span>{" "}
                    <span className="text-muted-foreground">→ {m.quantity_after}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt.dateTime(m.created_at)}
                    {m.user_id != null && ` · user #${m.user_id}`}
                    {m.reason && ` · ${m.reason}`}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}
