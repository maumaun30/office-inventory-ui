import { CompassIcon } from "lucide-react"
import { Link } from "react-router"

import { EmptyState } from "@/components/app/bits"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <EmptyState
      icon={CompassIcon}
      title="Page not found"
      description="That page doesn't exist or moved."
      action={
        <Button asChild>
          <Link to="/">Go to dashboard</Link>
        </Button>
      }
      className="min-h-[60svh]"
    />
  )
}
