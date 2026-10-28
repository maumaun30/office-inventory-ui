import { ChevronLeftIcon, ChevronRightIcon, PackageIcon, UsersIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router"

import { EmptyState, PageHeader, TableSkeleton } from "@/components/app/bits"
import { ReturnButton } from "@/components/app/return-button"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmt, initials } from "@/lib/format"
import { useItems, useUserAssignments, useUsers } from "@/lib/queries"
import type { DirectoryUser } from "@/lib/types"

const PER_PAGE = 20

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<DirectoryUser | null>(null)
  const q = useUsers(page, PER_PAGE)
  const p = q.data

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description={p ? `${fmt.number(p.total)} people in the directory` : "From the company directory"} />
      <Card className="gap-0 py-0">
        {q.isPending ? (
          <TableSkeleton />
        ) : q.isError ? (
          <EmptyState icon={UsersIcon} title="Couldn't load the directory" description={q.error.message} />
        ) : !p?.data.length ? (
          <EmptyState icon={UsersIcon} title="No users yet" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="w-24 pr-4 text-right">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={q.isPlaceholderData ? "opacity-60" : undefined}>
                {p.data.map((u) => (
                  <TableRow key={u.id} className="cursor-pointer" onClick={() => setSelected(u)}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground sm:hidden">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{u.email}</TableCell>
                    <TableCell className="pr-4 text-right font-mono text-xs text-muted-foreground">#{u.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Page <span className="font-mono text-foreground">{p.page}</span> of <span className="font-mono text-foreground">{p.lastPage}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                  <ChevronLeftIcon /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= p.lastPage} onClick={() => setPage((n) => n + 1)}>
                  Next <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
      <UserSheet user={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function UserSheet({ user, onClose }: { user: DirectoryUser | null; onClose: () => void }) {
  const q = useUserAssignments(user?.id ?? null)
  const items = useItems()
  const names = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i.name])), [items.data])
  const open = (q.data ?? []).filter((a) => !a.returned_at)
  const past = (q.data ?? []).filter((a) => a.returned_at)

  return (
    <Sheet open={user != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">{initials(user?.name ?? "?")}</div>
            <div className="min-w-0">
              <SheetTitle className="truncate">{user?.name}</SheetTitle>
              <SheetDescription className="truncate">{user?.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {q.isPending ? (
            <Skeleton className="h-24" />
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  Holding <span className="font-mono text-muted-foreground">{open.length}</span>
                </h3>
                {open.length ? (
                  <ul className="divide-y rounded-lg border">
                    {open.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <Link to={`/items/${a.item_id}`} className="block truncate text-sm font-medium hover:text-primary">
                            {a.quantity > 1 && `${a.quantity} × `}
                            {names.get(a.item_id) ?? `Item #${a.item_id}`}
                          </Link>
                          <p className="text-xs text-muted-foreground">Since {fmt.date(a.assigned_at)}</p>
                        </div>
                        <ReturnButton assignment={a} itemName={names.get(a.item_id)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon={PackageIcon} title="Nothing checked out" className="rounded-lg border py-8" />
                )}
              </section>
              {!!past.length && (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">History</h3>
                  <ul className="space-y-1 text-sm">
                    {past.map((a) => (
                      <li key={a.id} className="flex justify-between gap-3">
                        <span className="truncate">{names.get(a.item_id) ?? `Item #${a.item_id}`}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">returned {fmt.date(a.returned_at!)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
