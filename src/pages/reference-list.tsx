import { FolderTreeIcon, Loader2Icon, MapPinIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon, type LucideIcon } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router"

import { EmptyState, FieldError, PageHeader } from "@/components/app/bits"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useAction, useCategories, useItems, useLocations } from "@/lib/queries"
import type { Category, Item, Location } from "@/lib/types"

interface FieldDef {
  key: string
  label: string
  multiline?: boolean
  placeholder?: string
  half?: boolean
}

interface Config<T extends { id: number; name: string }> {
  title: string
  singular: string
  description: string
  icon: LucideIcon
  filterParam: string
  fields: FieldDef[]
  useList: () => { data?: T[]; isPending: boolean }
  subtitle: (row: T) => string | null
  itemKey: (item: Item) => number | null
  create: (data: Record<string, string | null>) => Promise<T>
  update: (id: number, data: Record<string, string | null>) => Promise<T>
  remove: (id: number) => Promise<void>
}

function ReferenceList<T extends { id: number; name: string }>({ config: c }: { config: Config<T> }) {
  const { isAdmin } = useAuth()
  const list = c.useList()
  const items = useItems()
  const [editing, setEditing] = useState<T | "new" | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)

  const counts = useMemo(() => {
    const m = new Map<number, number>()
    for (const i of items.data ?? []) {
      const k = c.itemKey(i)
      if (k != null) m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [items.data, c])

  const save = useAction(
    (data: Record<string, string | null>) => (editing && editing !== "new" ? c.update(editing.id, data) : c.create(data)),
    { success: editing && editing !== "new" ? `${c.singular} updated` : `${c.singular} created` },
  )
  const del = useAction((id: number) => c.remove(id), { success: `${c.singular} deleted` })
  const fields = save.error instanceof ApiError ? save.error.fields : {}

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    const data = Object.fromEntries(c.fields.map((f) => [f.key, String(d.get(f.key) ?? "").trim() || null]))
    save.mutate(data, { onSuccess: () => setEditing(null) })
  }

  const current = editing && editing !== "new" ? (editing as unknown as Record<string, string | null>) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.title}
        description={c.description}
        actions={
          isAdmin && (
            <Button
              onClick={() => {
                save.reset()
                setEditing("new")
              }}
            >
              <PlusIcon /> New {c.singular.toLowerCase()}
            </Button>
          )
        }
      />

      {list.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !list.data?.length ? (
        <Card>
          <EmptyState icon={c.icon} title={`No ${c.title.toLowerCase()} yet`} description={isAdmin ? `Create one, or import a CSV with a ${c.singular.toLowerCase()} column.` : undefined} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.map((row) => {
            const count = counts.get(row.id) ?? 0
            return (
              <Card key={row.id} className="group transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <c.icon className="size-5" />
                  </div>
                  <Link to={`/items?${c.filterParam}=${row.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium group-hover:text-primary">{row.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{c.subtitle(row) ?? " "}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">{count}</span> item{count === 1 ? "" : "s"}
                    </p>
                  </Link>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.name}`}>
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            save.reset()
                            setEditing(row)
                          }}
                        >
                          <PencilIcon /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(row)}>
                          <Trash2Icon /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{current ? `Edit ${c.singular.toLowerCase()}` : `New ${c.singular.toLowerCase()}`}</DialogTitle>
            <DialogDescription>{c.description}</DialogDescription>
          </DialogHeader>
          <form id="ref-form" onSubmit={onSubmit} className="grid grid-cols-2 gap-4" key={current ? String(current.id) : "new"}>
            {c.fields.map((f) => (
              <div key={f.key} className={f.half ? "space-y-2" : "col-span-2 space-y-2"}>
                <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                {f.multiline ? (
                  <Textarea id={`f-${f.key}`} name={f.key} defaultValue={current?.[f.key] ?? ""} placeholder={f.placeholder} rows={3} />
                ) : (
                  <Input
                    id={`f-${f.key}`}
                    name={f.key}
                    defaultValue={current?.[f.key] ?? ""}
                    placeholder={f.placeholder}
                    required={f.key === "name"}
                    maxLength={f.key === "name" ? 100 : undefined}
                    autoFocus={f.key === "name"}
                  />
                )}
                <FieldError messages={fields[f.key]} />
              </div>
            ))}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="ref-form" disabled={save.isPending}>
              {save.isPending && <Loader2Icon className="animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && counts.get(deleting.id)
                ? `${counts.get(deleting.id)} item(s) use this ${c.singular.toLowerCase()}; they'll be left without one.`
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleting && del.mutate(deleting.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const categoryConfig: Config<Category> = {
  title: "Categories",
  singular: "Category",
  description: "Group items by kind, like laptops, furniture or supplies.",
  icon: FolderTreeIcon,
  filterParam: "category",
  fields: [
    { key: "name", label: "Name", placeholder: "Laptops" },
    { key: "description", label: "Description", multiline: true },
  ],
  useList: useCategories,
  subtitle: (c) => c.description,
  itemKey: (i) => i.category_id,
  create: (d) => api.createCategory(d),
  update: (id, d) => api.updateCategory(id, d),
  remove: api.deleteCategory,
}

const locationConfig: Config<Location> = {
  title: "Locations",
  singular: "Location",
  description: "Where things live: buildings, floors and rooms.",
  icon: MapPinIcon,
  filterParam: "location",
  fields: [
    { key: "name", label: "Name", placeholder: "HQ · 2nd floor storage" },
    { key: "building", label: "Building", half: true },
    { key: "floor", label: "Floor", half: true },
    { key: "room", label: "Room", half: true },
  ],
  useList: useLocations,
  subtitle: (l) =>
    [l.building, l.floor && `Floor ${l.floor}`, l.room && `Room ${l.room}`].filter(Boolean).join(" · ") || null,
  itemKey: (i) => i.location_id,
  create: (d) => api.createLocation(d),
  update: (id, d) => api.updateLocation(id, d),
  remove: api.deleteLocation,
}

export const CategoriesPage = () => <ReferenceList config={categoryConfig} />
export const LocationsPage = () => <ReferenceList config={locationConfig} />
