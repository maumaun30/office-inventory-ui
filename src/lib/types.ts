export type ItemStatus = "active" | "in_repair" | "retired"
export type MovementKind = "initial" | "adjust" | "edit"

export interface Category {
  id: number
  name: string
  description: string | null
}

export interface Location {
  id: number
  name: string
  building: string | null
  floor: string | null
  room: string | null
}

export interface Item {
  id: number
  name: string
  sku: string | null
  serial_number: string | null
  description: string | null
  quantity: number
  reorder_level: number
  unit_cost: number | null
  status: ItemStatus
  category_id: number | null
  location_id: number | null
  assigned_quantity: number
  available_quantity: number
  created_at: string
  updated_at: string
  category: Category | null
  location: Location | null
}

export type ItemInput = Partial<
  Pick<
    Item,
    | "name"
    | "sku"
    | "serial_number"
    | "description"
    | "quantity"
    | "reorder_level"
    | "unit_cost"
    | "status"
    | "category_id"
    | "location_id"
  >
>

export interface Assignment {
  id: number
  item_id: number
  user_id: number
  assignee_name: string
  assignee_email: string | null
  quantity: number
  notes: string | null
  assigned_at: string
  returned_at: string | null
  assigned_by_user_id: number | null
  returned_by_user_id: number | null
}

export interface StockMovement {
  id: number
  item_id: number
  kind: MovementKind
  delta: number
  quantity_after: number
  reason: string | null
  user_id: number | null
  created_at: string
}

export interface InventorySummary {
  total_items: number
  total_units: number
  assigned_units: number
  total_value: number
  low_stock_items: number
  by_status: Record<ItemStatus, number>
}

export interface Me {
  id: number
  name: string
  email: string | null
  is_admin: boolean
}

export interface DirectoryUser {
  id: number
  name: string
  email: string | null
}

export interface Page<T> {
  data: T[]
  page: number
  perPage: number
  total: number
  lastPage: number
}

export interface ImportResult {
  dry_run: boolean
  created: number
  updated: number
  unchanged: number
  created_categories: string[]
  created_locations: string[]
}

export interface ImportRowError {
  row: number
  errors: string[]
}
