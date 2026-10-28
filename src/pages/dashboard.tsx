import { AlertTriangleIcon, ArrowLeftRightIcon, ArrowRightIcon, BoxesIcon, CircleDollarSignIcon, PackageIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router"
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts"

import { EmptyState, PageHeader, StatCard, StockMeter } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { fmt, initials, isLowStock, STATUS_LABEL } from "@/lib/format"
import { useAssignments, useItems, useMyAssignments, useSummary } from "@/lib/queries"
import type { ItemStatus } from "@/lib/types"

const statusConfig = {
  count: { label: "Items" },
  active: { label: STATUS_LABEL.active, color: "var(--chart-2)" },
  in_repair: { label: STATUS_LABEL.in_repair, color: "var(--chart-3)" },
  retired: { label: STATUS_LABEL.retired, color: "var(--muted-foreground)" },
} satisfies ChartConfig

const categoryConfig = {
  available: { label: "Available", color: "var(--chart-1)" },
  assigned: { label: "Assigned", color: "var(--chart-5)" },
} satisfies ChartConfig

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

export function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const summary = useSummary()
  const items = useItems()
  const s = summary.data

  const statusData = useMemo(
    () =>
      s
        ? (Object.keys(STATUS_LABEL) as ItemStatus[]).map((k) => ({ status: k, count: s.by_status[k] ?? 0, fill: `var(--color-${k})` }))
        : [],
    [s],
  )

  const byCategory = useMemo(() => {
    const map = new Map<string, { category: string; available: number; assigned: number }>()
    for (const i of items.data ?? []) {
      const key = i.category?.name ?? "Uncategorized"
      const row = map.get(key) ?? { category: key, available: 0, assigned: 0 }
      row.available += i.available_quantity
      row.assigned += i.assigned_quantity
      map.set(key, row)
    }
    return [...map.values()].sort((a, b) => b.available + b.assigned - (a.available + a.assigned)).slice(0, 6)
  }, [items.data])

  const lowStock = useMemo(
    () => (items.data ?? []).filter(isLowStock).sort((a, b) => a.available_quantity - b.available_quantity).slice(0, 6),
    [items.data],
  )

  const utilization = s && s.total_units ? Math.round((s.assigned_units / s.total_units) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(" ")[0]}`}
        description="Here's what's happening in the stockroom."
        actions={
          <Button asChild>
            <Link to="/items">
              <BoxesIcon /> Browse items
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Items tracked" value={s && fmt.number(s.total_items)} icon={PackageIcon} loading={!s} hint={s && `${fmt.number(s.by_status.active ?? 0)} active`} />
        <StatCard
          label="Units in stock"
          value={s && fmt.number(s.total_units)}
          icon={ArrowLeftRightIcon}
          tone="success"
          loading={!s}
          hint={s && `${fmt.number(s.assigned_units)} assigned · ${utilization}% in use`}
        />
        <StatCard label="Inventory value" value={s && fmt.compactMoney(s.total_value)} icon={CircleDollarSignIcon} tone="muted" loading={!s} hint="Quantity × unit cost" />
        <StatCard
          label="Low stock"
          value={s && fmt.number(s.low_stock_items)}
          icon={AlertTriangleIcon}
          tone={s?.low_stock_items ? "warning" : "muted"}
          loading={!s}
          hint="At or below reorder level"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Item status</CardTitle>
            <CardDescription>Across all tracked items</CardDescription>
          </CardHeader>
          <CardContent>
            {!s ? (
              <Skeleton className="mx-auto aspect-square max-h-56 rounded-full" />
            ) : (
              <>
                <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-56">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="status" />} />
                    <Pie data={statusData} dataKey="count" nameKey="status" innerRadius="62%" strokeWidth={4} paddingAngle={2}>
                      {statusData.map((d) => (
                        <Cell key={d.status} fill={d.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) =>
                          viewBox && "cx" in viewBox ? (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-mono text-3xl font-semibold">
                                {s.total_items}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                                items
                              </tspan>
                            </text>
                          ) : null
                        }
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
                  {statusData.map((d) => (
                    <div key={d.status} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: statusConfig[d.status].color }} />
                      <span className="text-muted-foreground">{STATUS_LABEL[d.status]}</span>
                      <span className="font-mono font-medium tabular">{d.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Units by category</CardTitle>
            <CardDescription>Available vs. assigned, top categories</CardDescription>
          </CardHeader>
          <CardContent>
            {items.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : byCategory.length ? (
              <ChartContainer config={categoryConfig} className="h-64 w-full">
                <BarChart data={byCategory} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid horizontal={false} />
                  <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={96} tickFormatter={(v: string) => (v.length > 13 ? `${v.slice(0, 12)}…` : v)} />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="available" stackId="a" fill="var(--color-available)" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="assigned" stackId="a" fill="var(--color-assigned)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState icon={BoxesIcon} title="No items yet" description="Add items to see how stock is spread across categories." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Running low</CardTitle>
            <CardDescription>Available at or below reorder level</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/items?low_stock=1">
                  View all <ArrowRightIcon />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {items.isPending ? (
              <div className="space-y-2 px-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : lowStock.length ? (
              <ul className="divide-y">
                {lowStock.map((item) => (
                  <li key={item.id}>
                    <Link to={`/items/${item.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Reorder at {item.reorder_level}
                          {item.location && ` · ${item.location.name}`}
                        </p>
                      </div>
                      <StockMeter item={item} className="w-28" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={PackageIcon} title="All stocked up" description="Nothing is at or below its reorder level." className="py-8" />
            )}
          </CardContent>
        </Card>

        {isAdmin ? <RecentAssignments /> : <MyItemsCard />}
      </div>
    </div>
  )
}

function RecentAssignments() {
  const q = useAssignments({ active: true })
  const items = useItems()
  const names = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i.name])), [items.data])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checked out</CardTitle>
        <CardDescription>Most recent open assignments</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/assignments">
              View all <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {q.isPending ? (
          <div className="space-y-2 px-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : q.data?.length ? (
          <ul className="divide-y">
            {q.data.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link to={`/items/${a.item_id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {initials(a.assignee_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.assignee_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.quantity > 1 && `${a.quantity} × `}
                      {names.get(a.item_id) ?? `Item #${a.item_id}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmt.relative(a.assigned_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ArrowLeftRightIcon} title="Nothing checked out" description="Assign items to people from an item's page." className="py-8" />
        )}
      </CardContent>
    </Card>
  )
}

function MyItemsCard() {
  const q = useMyAssignments()
  const items = useItems()
  const names = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i.name])), [items.data])
  const open = (q.data ?? []).filter((a) => !a.returned_at)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your items</CardTitle>
        <CardDescription>Equipment currently checked out to you</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/my-items">
              View all <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {q.isPending ? (
          <Skeleton className="mx-4 h-24" />
        ) : open.length ? (
          <ul className="divide-y">
            {open.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link to={`/items/${a.item_id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PackageIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{names.get(a.item_id) ?? `Item #${a.item_id}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.quantity > 1 && `${a.quantity} units · `}since {fmt.date(a.assigned_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={PackageIcon} title="Nothing checked out" description="Items assigned to you will show up here." className="py-8" />
        )}
      </CardContent>
    </Card>
  )
}
