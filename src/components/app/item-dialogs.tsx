import { CheckIcon, ChevronsUpDownIcon, FileUpIcon, Loader2Icon, MinusIcon, PlusIcon, UploadIcon } from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"

import { FieldError } from "@/components/app/bits"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError } from "@/lib/api"
import { STATUS_LABEL } from "@/lib/format"
import { useAction, useCategories, useLocations, useUsers } from "@/lib/queries"
import type { ImportResult, ImportRowError, Item, ItemInput, ItemStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Field({ label, htmlFor, error, children, className }: { label: string; htmlFor: string; error?: string[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError messages={error} />
    </div>
  )
}

const NONE = "none"

type ItemFormProps = { item?: Item; onSaved?: (item: Item) => void }

export function ItemFormDialog({ open, onOpenChange, ...rest }: DialogProps & ItemFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <ItemForm onOpenChange={onOpenChange} {...rest} />
      </DialogContent>
    </Dialog>
  )
}

// Dialog content unmounts when closed, so form state starts fresh on every open.
function ItemForm({ onOpenChange, item, onSaved }: Pick<DialogProps, "onOpenChange"> & ItemFormProps) {
  const categories = useCategories()
  const locations = useLocations()
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? "active")
  const [categoryId, setCategoryId] = useState(item?.category_id ? String(item.category_id) : NONE)
  const [locationId, setLocationId] = useState(item?.location_id ? String(item.location_id) : NONE)
  const save = useAction((data: ItemInput) => (item ? api.updateItem(item.id, data) : api.createItem(data)), {
    success: item ? "Item updated" : "Item created",
  })

  const fields = save.error instanceof ApiError ? save.error.fields : {}

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    const text = (k: string) => String(d.get(k) ?? "").trim() || null
    const num = (k: string) => (text(k) == null ? null : Number(text(k)))
    const data: ItemInput = {
      name: text("name") ?? "",
      sku: text("sku"),
      serial_number: text("serial_number"),
      description: text("description"),
      reorder_level: num("reorder_level") ?? 0,
      unit_cost: num("unit_cost"),
      status,
      category_id: categoryId === NONE ? null : Number(categoryId),
      location_id: locationId === NONE ? null : Number(locationId),
    }
    // Quantity changes on existing items go through "Adjust stock" (keeps the audit reason).
    if (!item) data.quantity = num("quantity") ?? 1
    save.mutate(data, {
      onSuccess: (saved) => {
        onOpenChange(false)
        onSaved?.(saved)
      },
    })
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>{item ? "Update details. Use “Adjust stock” to change quantity." : "Add something to the inventory."}</DialogDescription>
        </DialogHeader>
        <form id="item-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={fields.name} className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={item?.name} required maxLength={200} placeholder="MacBook Pro 14”" />
          </Field>
          <Field label="SKU" htmlFor="sku" error={fields.sku}>
            <Input id="sku" name="sku" defaultValue={item?.sku ?? ""} maxLength={64} className="font-mono" placeholder="LAP-0042" />
          </Field>
          <Field label="Serial number" htmlFor="serial_number" error={fields.serial_number}>
            <Input id="serial_number" name="serial_number" defaultValue={item?.serial_number ?? ""} maxLength={100} className="font-mono" />
          </Field>
          <Field label="Category" htmlFor="category">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No category</SelectItem>
                {categories.data?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location" htmlFor="location">
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="location" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No location</SelectItem>
                {locations.data?.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {!item && (
            <Field label="Quantity" htmlFor="quantity" error={fields.quantity}>
              <Input id="quantity" name="quantity" type="number" min={0} defaultValue={1} className="font-mono" />
            </Field>
          )}
          <Field label="Reorder level" htmlFor="reorder_level" error={fields.reorder_level}>
            <Input id="reorder_level" name="reorder_level" type="number" min={0} defaultValue={item?.reorder_level ?? 0} className="font-mono" />
          </Field>
          <Field label="Unit cost (USD)" htmlFor="unit_cost" error={fields.unit_cost}>
            <Input id="unit_cost" name="unit_cost" type="number" min={0} step="0.01" defaultValue={item?.unit_cost ?? ""} className="font-mono" placeholder="0.00" />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select value={status} onValueChange={(v) => setStatus(v as ItemStatus)}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" defaultValue={item?.description ?? ""} rows={3} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" disabled={save.isPending}>
            {save.isPending && <Loader2Icon className="animate-spin" />}
            {item ? "Save changes" : "Create item"}
          </Button>
        </DialogFooter>
    </>
  )
}

export function AdjustStockDialog({ open, onOpenChange, item }: DialogProps & { item: Item }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AdjustStockForm onOpenChange={onOpenChange} item={item} />
      </DialogContent>
    </Dialog>
  )
}

function AdjustStockForm({ onOpenChange, item }: Pick<DialogProps, "onOpenChange"> & { item: Item }) {
  const [delta, setDelta] = useState(1)
  const [reason, setReason] = useState("")
  const adjust = useAction(() => api.adjustStock(item.id, delta, reason), { success: "Stock updated" })

  const next = item.quantity + delta
  const invalid = delta === 0 || next < 0 || next < item.assigned_quantity

  return (
    <>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {item.name} · {item.quantity} in stock, {item.assigned_quantity} assigned
          </DialogDescription>
        </DialogHeader>
        <form
          id="adjust-form"
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            adjust.mutate(undefined, { onSuccess: () => onOpenChange(false) })
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <Button type="button" variant="outline" size="icon-lg" onClick={() => setDelta((d) => d - 1)} aria-label="Remove one">
              <MinusIcon />
            </Button>
            <Input
              type="number"
              value={delta}
              onChange={(e) => setDelta(Math.trunc(Number(e.target.value) || 0))}
              className="h-12 w-28 text-center font-mono text-2xl font-semibold"
              aria-label="Change"
            />
            <Button type="button" variant="outline" size="icon-lg" onClick={() => setDelta((d) => d + 1)} aria-label="Add one">
              <PlusIcon />
            </Button>
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-center text-sm">
            <span className="text-muted-foreground">New quantity </span>
            <span className={cn("font-mono font-semibold", invalid && delta !== 0 && "text-destructive")}>{next}</span>
            {next < item.assigned_quantity && next >= 0 && (
              <p className="mt-1 text-xs text-destructive">Can't go below the {item.assigned_quantity} assigned units.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={delta < 0 ? "e.g. broken, lost" : "e.g. new delivery"} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="adjust-form" disabled={invalid || adjust.isPending}>
            {adjust.isPending && <Loader2Icon className="animate-spin" />}
            {delta >= 0 ? `Add ${delta}` : `Remove ${-delta}`}
          </Button>
        </DialogFooter>
    </>
  )
}

export function AssignDialog({ open, onOpenChange, item }: DialogProps & { item: Item }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AssignForm onOpenChange={onOpenChange} item={item} />
      </DialogContent>
    </Dialog>
  )
}

function AssignForm({ onOpenChange, item }: Pick<DialogProps, "onOpenChange"> & { item: Item }) {
  const users = useUsers(1, 100)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")
  const assign = useAction(
    () => api.assign({ item_id: item.id, user_id: userId!, quantity, notes: notes || undefined }),
    { success: (a) => `Assigned to ${a.assignee_name}` },
  )

  const selected = users.data?.data.find((u) => u.id === userId)
  const tooMany = quantity > item.available_quantity

  return (
    <>
        <DialogHeader>
          <DialogTitle>Assign item</DialogTitle>
          <DialogDescription>
            {item.name} · {item.available_quantity} available
          </DialogDescription>
        </DialogHeader>
        <form
          id="assign-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            assign.mutate(undefined, { onSuccess: () => onOpenChange(false) })
          }}
        >
          <div className="space-y-2">
            <Label>Person</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selected ? (
                    <span className="truncate">
                      {selected.name} <span className="text-muted-foreground">{selected.email}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{users.isPending ? "Loading people…" : "Choose a person"}</span>
                  )}
                  <ChevronsUpDownIcon className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search people…" />
                  <CommandList>
                    <CommandEmpty>{users.isError ? "Couldn't load people." : "No one found."}</CommandEmpty>
                    <CommandGroup>
                      {users.data?.data.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.name} ${u.email ?? ""}`}
                          onSelect={() => {
                            setUserId(u.id)
                            setPickerOpen(false)
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{u.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                          <CheckIcon className={cn(u.id === userId ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-4">
            <div className="space-y-2">
              <Label htmlFor="assign-qty">Quantity</Label>
              <Input
                id="assign-qty"
                type="number"
                min={1}
                max={item.available_quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-notes">Notes</Label>
              <Input id="assign-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          {tooMany && <p className="text-xs text-destructive">Only {item.available_quantity} available.</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="assign-form" disabled={!userId || tooMany || assign.isPending}>
            {assign.isPending && <Loader2Icon className="animate-spin" />} Assign
          </Button>
        </DialogFooter>
    </>
  )
}

export function ImportDialog({ open, onOpenChange }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ImportForm onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

function ImportForm({ onOpenChange }: Pick<DialogProps, "onOpenChange">) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([])
  const [dragging, setDragging] = useState(false)
  const [skipPreview, setSkipPreview] = useState(false)

  const run = useAction((dryRun: boolean) => api.importItems(file!, dryRun), {
    silentError: true,
    success: (r) => (r.dry_run ? "" : `Imported: ${r.created} created, ${r.updated} updated`),
  })

  const choose = (f: File | null | undefined) => {
    setFile(f ?? null)
    setPreview(null)
    setRowErrors([])
    run.reset()
  }

  const execute = (dryRun: boolean) =>
    run.mutate(dryRun, {
      onSuccess: (r) => {
        if (r.dry_run) setPreview(r)
        else onOpenChange(false)
      },
      onError: (err) => {
        const detail = err instanceof ApiError ? (err.body as { detail?: { errors?: ImportRowError[] } } | null)?.detail : null
        setRowErrors(detail?.errors ?? [])
      },
    })

  const error = run.error instanceof ApiError ? run.error : null

  return (
    <>
        <DialogHeader>
          <DialogTitle>Import items from CSV</DialogTitle>
          <DialogDescription>
            Same columns as the export. Rows match by <code className="font-mono">id</code>, then <code className="font-mono">sku</code>; others are created. Nothing is saved if any row is invalid.
          </DialogDescription>
        </DialogHeader>

        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            choose(e.dataTransfer.files[0])
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40",
          )}
        >
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {file ? <FileUpIcon className="size-5" /> : <UploadIcon className="size-5" />}
          </div>
          {file ? (
            <p className="text-sm font-medium">
              {file.name} <span className="font-normal text-muted-foreground">({Math.ceil(file.size / 1024)} KB)</span>
            </p>
          ) : (
            <>
              <p className="text-sm font-medium">Drop a CSV here or click to browse</p>
              <p className="text-xs text-muted-foreground">Up to 2 MB, 5,000 rows</p>
            </>
          )}
        </label>

        {preview && (
          <Alert>
            <CheckIcon />
            <AlertTitle>Ready to import</AlertTitle>
            <AlertDescription>
              {preview.created} new, {preview.updated} updated, {preview.unchanged} unchanged.
              {!!preview.created_categories.length && ` New categories: ${preview.created_categories.join(", ")}.`}
              {!!preview.created_locations.length && ` New locations: ${preview.created_locations.join(", ")}.`}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>{error.message}</AlertTitle>
            {!!rowErrors.length && (
              <AlertDescription>
                <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs">
                  {rowErrors.map((r) => (
                    <li key={r.row}>
                      <span className="font-mono font-medium">Line {r.row}:</span> {r.errors.join("; ")}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            )}
          </Alert>
        )}

        <DialogFooter className="items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={skipPreview} onCheckedChange={setSkipPreview} /> Skip preview
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!file || run.isPending} onClick={() => execute(!preview && !skipPreview)}>
              {run.isPending && <Loader2Icon className="animate-spin" />}
              {preview || skipPreview ? "Import" : "Preview"}
            </Button>
          </div>
        </DialogFooter>
    </>
  )
}
