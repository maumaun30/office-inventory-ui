import { ArrowLeftRightIcon, MoreHorizontalIcon, PackagePlusIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import { AdjustStockDialog, AssignDialog, ItemFormDialog } from "@/components/app/item-dialogs"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { useAction } from "@/lib/queries"
import type { Item } from "@/lib/types"

type Open = "edit" | "adjust" | "assign" | "delete" | null

/** Admin actions for one item: a "…" menu plus the dialogs it opens. */
export function ItemActions({ item, onDeleted, trigger }: { item: Item; onDeleted?: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState<Open>(null)
  const close = (o: boolean) => !o && setOpen(null)
  const del = useAction(() => api.deleteItem(item.id), { success: "Item deleted" })
  const canAssign = item.status === "active" && item.available_quantity > 0

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.name}`} onClick={(e) => e.stopPropagation()}>
              <MoreHorizontalIcon />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setOpen("assign")} disabled={!canAssign}>
            <ArrowLeftRightIcon /> Assign
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen("adjust")}>
            <PackagePlusIcon /> Adjust stock
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen("edit")}>
            <PencilIcon /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setOpen("delete")}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ItemFormDialog open={open === "edit"} onOpenChange={close} item={item} />
      <AdjustStockDialog open={open === "adjust"} onOpenChange={close} item={item} />
      <AssignDialog open={open === "assign"} onOpenChange={close} item={item} />
      <AlertDialog open={open === "delete"} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {item.assigned_quantity
                ? `${item.assigned_quantity} unit(s) are still assigned. Return them before deleting.`
                : "This removes the item and its stock history. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!!item.assigned_quantity || del.isPending}
              onClick={() => del.mutate(undefined, { onSuccess: () => onDeleted?.() })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
