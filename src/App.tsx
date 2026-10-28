import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ComponentType } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"

import { AdminOnly, AppLayout } from "@/components/app/app-layout"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ApiError } from "@/lib/api"
import { AuthProvider } from "@/lib/auth"
import { ThemeProvider } from "@/lib/theme"
import { LoginPage } from "@/pages/login"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Don't retry client errors (401/403/404/422); do retry flaky network/5xx (free-tier cold starts).
      retry: (count, err) => count < 2 && !(err instanceof ApiError && err.status >= 400 && err.status < 500),
    },
  },
})

/** Route-level code splitting: each page loads on first visit. */
function page<M>(load: () => Promise<M>, name: keyof M, adminOnly = false) {
  return async () => {
    const Page = (await load())[name] as ComponentType
    return { Component: adminOnly ? () => <AdminOnly><Page /></AdminOnly> : Page }
  }
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, lazy: page(() => import("@/pages/dashboard"), "DashboardPage") },
      { path: "my-items", lazy: page(() => import("@/pages/my-items"), "MyItemsPage") },
      { path: "items", lazy: page(() => import("@/pages/items"), "ItemsPage") },
      { path: "items/:id", lazy: page(() => import("@/pages/item-detail"), "ItemDetailPage") },
      { path: "categories", lazy: page(() => import("@/pages/reference-list"), "CategoriesPage") },
      { path: "locations", lazy: page(() => import("@/pages/reference-list"), "LocationsPage") },
      { path: "assignments", lazy: page(() => import("@/pages/assignments"), "AssignmentsPage", true) },
      { path: "users", lazy: page(() => import("@/pages/users"), "UsersPage", true) },
      { path: "*", lazy: page(() => import("@/pages/not-found"), "NotFoundPage") },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
