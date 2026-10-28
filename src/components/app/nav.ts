import {
  ArrowLeftRightIcon,
  BoxesIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  PackageCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  admin?: boolean
}

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboardIcon },
      { to: "/my-items", label: "My items", icon: PackageCheckIcon },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/items", label: "Items", icon: BoxesIcon },
      { to: "/assignments", label: "Assignments", icon: ArrowLeftRightIcon, admin: true },
      { to: "/categories", label: "Categories", icon: FolderTreeIcon },
      { to: "/locations", label: "Locations", icon: MapPinIcon },
    ],
  },
  {
    label: "People",
    items: [{ to: "/users", label: "Users", icon: UsersIcon, admin: true }],
  },
]
