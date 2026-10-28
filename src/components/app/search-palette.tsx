import { BoxesIcon, SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"

import { NAV } from "@/components/app/nav"
import { StatusBadge } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useAuth } from "@/lib/auth"
import { useItems } from "@/lib/queries"

export function SearchPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const items = useItems()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-8 w-full justify-start gap-2 text-muted-foreground sm:w-64"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        <span className="flex-1 text-left">Search items…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[0.65rem] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Find items and pages">
        <Command>
          <CommandInput placeholder="Search by name, SKU, serial…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Items">
              {(items.data ?? []).slice(0, 200).map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.sku ?? ""} ${item.serial_number ?? ""} #${item.id}`}
                  onSelect={() => go(`/items/${item.id}`)}
                >
                  <BoxesIcon />
                  <span className="min-w-0 flex-1 truncate">
                    {item.name}
                    {item.sku && <span className="ml-2 font-mono text-xs text-muted-foreground">{item.sku}</span>}
                  </span>
                  <StatusBadge status={item.status} />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Pages">
              {NAV.flatMap((g) => g.items)
                .filter((i) => !i.admin || isAdmin)
                .map((i) => (
                  <CommandItem key={i.to} value={`page ${i.label}`} onSelect={() => go(i.to)}>
                    <i.icon />
                    {i.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
