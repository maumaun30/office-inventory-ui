import { ArrowLeftRightIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router"

import { EmptyState, PageHeader, TableSkeleton } from "@/components/app/bits"
import { ReturnButton } from "@/components/app/return-button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDebounced } from "@/hooks/use-debounced"
import { fmt, initials } from "@/lib/format"
import { useAssignments, useItems } from "@/lib/queries"

type View = "open" | "returned" | "all"

export function AssignmentsPage() {
  const [view, setView] = useState<View>("open")
  const [search, setSearch] = useState("")
  const assignee = useDebounced(search)
  const q = useAssignments({ active: view === "all" ? undefined : view === "open", assignee: assignee || undefined })
  const items = useItems()
  const names = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i.name])), [items.data])
  const rows = q.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Assignments" description="Who has what, and what came back." />
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="open">Checked out</TabsTrigger>
              <TabsTrigger value="returned">Returned</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative sm:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search person or email…" className="pl-8" />
          </div>
        </div>

        {q.isPending ? (
          <TableSkeleton />
        ) : !rows.length ? (
          <EmptyState
            icon={ArrowLeftRightIcon}
            title={assignee ? "No one matches" : view === "open" ? "Nothing checked out" : "No assignments"}
            description={view === "open" && !assignee ? "Assign items from an item's page." : undefined}
          />
        ) : (
          <>
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Person</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {initials(a.assignee_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.assignee_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.assignee_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <Link to={`/items/${a.item_id}`} className="block truncate hover:text-primary hover:underline">
                        {names.get(a.item_id) ?? `Item #${a.item_id}`}
                      </Link>
                      {a.notes && <p className="truncate text-xs text-muted-foreground">{a.notes}</p>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{a.quantity}</TableCell>
                    <TableCell className="text-muted-foreground" title={fmt.dateTime(a.assigned_at)}>
                      {fmt.date(a.assigned_at)}
                    </TableCell>
                    <TableCell>
                      {a.returned_at ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Returned {fmt.date(a.returned_at)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                          Checked out
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">{!a.returned_at && <ReturnButton assignment={a} itemName={names.get(a.item_id)} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <ul className="divide-y md:hidden">
              {rows.map((a) => (
                <li key={a.id} className="flex items-center gap-3 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {initials(a.assignee_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.assignee_name}</p>
                    <Link to={`/items/${a.item_id}`} className="block truncate text-sm text-muted-foreground">
                      {a.quantity > 1 && `${a.quantity} × `}
                      {names.get(a.item_id) ?? `Item #${a.item_id}`}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {a.returned_at ? `Returned ${fmt.date(a.returned_at)}` : `Since ${fmt.date(a.assigned_at)}`}
                    </p>
                  </div>
                  {!a.returned_at && <ReturnButton assignment={a} itemName={names.get(a.item_id)} />}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
