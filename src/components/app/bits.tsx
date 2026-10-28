import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { isLowStock, STATUS_LABEL } from "@/lib/format"
import type { Item, ItemStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const STATUS_STYLE: Record<ItemStatus, string> = {
  active: "bg-success/12 text-success border-success/25",
  in_repair: "bg-warning/12 text-warning border-warning/25",
  retired: "bg-muted text-muted-foreground border-border",
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", STATUS_STYLE[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export function StockMeter({ item, className }: { item: Item; className?: string }) {
  const pct = item.quantity ? Math.round((item.assigned_quantity / item.quantity) * 100) : 0
  const low = isLowStock(item)
  return (
    <div className={cn("flex min-w-28 flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={cn("font-mono tabular font-medium", low ? "text-warning" : "text-foreground")}>
          {item.available_quantity}
          <span className="text-muted-foreground">/{item.quantity}</span>
        </span>
        {low && <span className="text-[0.7rem] font-medium text-warning">Low</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", low ? "bg-warning" : "bg-primary")}
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  loading,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: "primary" | "success" | "warning" | "muted"
  loading?: boolean
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/12 text-warning",
    muted: "bg-muted text-muted-foreground",
  }[tone]
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="truncate font-mono text-2xl font-semibold tracking-tight tabular">{value}</p>
          )}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", toneClass)}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-xs text-destructive">{messages[0]}</p>
}
