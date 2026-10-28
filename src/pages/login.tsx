import { AlertCircleIcon, BoxIcon, Loader2Icon, PackageSearchIcon, ShieldCheckIcon, TrendingUpIcon } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Navigate, useLocation } from "react-router"

import { FieldError } from "@/components/app/bits"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const FEATURES = [
  { icon: PackageSearchIcon, title: "Know what you have", text: "Every laptop, chair and cable, with live stock levels." },
  { icon: ShieldCheckIcon, title: "Know who has it", text: "Check items out to people and back in, with a full audit trail." },
  { icon: TrendingUpIcon, title: "Restock in time", text: "Low-stock alerts before the last toner runs out." },
]

export function LoginPage() {
  const { token, login, register } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState("login")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  if (token) return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/"} replace />

  const submit = (fn: (data: FormData) => Promise<void>) => async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await fn(new FormData(e.currentTarget))
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Something went wrong"))
    } finally {
      setPending(false)
    }
  }
  const s = (d: FormData, k: string) => String(d.get(k) ?? "")
  const fields = error?.fields ?? {}

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div aria-hidden className="absolute -right-32 -bottom-32 size-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <BoxIcon className="size-5" />
          </div>
          Stockroom
        </div>
        <div className="relative mt-auto max-w-md space-y-8">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">The office, accounted for.</h2>
          <ul className="space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="size-4" />
                </div>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-primary-foreground/75">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BoxIcon className="size-5" />
          </div>
          Stockroom
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">{tab === "login" ? "Welcome back" : "Create your account"}</CardTitle>
            <CardDescription>
              {tab === "login" ? "Sign in with your work account." : "New accounts start as staff; an admin can promote you."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v)
                setError(null)
              }}
            >
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Sign up</TabsTrigger>
              </TabsList>

              {error && !Object.keys(fields).length && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircleIcon />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form className="space-y-4" onSubmit={submit((d) => login(s(d, "email"), s(d, "password")))}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
                    <FieldError messages={fields.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" autoComplete="current-password" required />
                    <FieldError messages={fields.password} />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={pending}>
                    {pending && <Loader2Icon className="animate-spin" />} Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form
                  className="space-y-4"
                  onSubmit={submit((d) =>
                    register({
                      name: s(d, "name"),
                      email: s(d, "email"),
                      password: s(d, "password"),
                      password_confirmation: s(d, "password_confirmation"),
                    }),
                  )}
                >
                  <div className="space-y-2">
                    <Label htmlFor="r-name">Full name</Label>
                    <Input id="r-name" name="name" autoComplete="name" required />
                    <FieldError messages={fields.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-email">Email</Label>
                    <Input id="r-email" name="email" type="email" autoComplete="email" required />
                    <FieldError messages={fields.email} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="r-password">Password</Label>
                      <Input id="r-password" name="password" type="password" autoComplete="new-password" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="r-confirm">Confirm</Label>
                      <Input id="r-confirm" name="password_confirmation" type="password" autoComplete="new-password" required />
                    </div>
                  </div>
                  <FieldError messages={fields.password} />
                  <Button type="submit" className="w-full" size="lg" disabled={pending}>
                    {pending && <Loader2Icon className="animate-spin" />} Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
