import { Undo2Icon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useAction } from "@/lib/queries"
import type { Assignment } from "@/lib/types"

export function ReturnButton({ assignment, itemName }: { assignment: Assignment; itemName?: string }) {
  const ret = useAction(() => api.returnAssignment(assignment.id), { success: "Marked as returned" })
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={ret.isPending}>
          <Undo2Icon /> Return
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Check this back in?</AlertDialogTitle>
          <AlertDialogDescription>
            {assignment.quantity} × {itemName ?? `item #${assignment.item_id}`} from {assignment.assignee_name} goes back into available stock.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => ret.mutate(undefined)}>Mark returned</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
