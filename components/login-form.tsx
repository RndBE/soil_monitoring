"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { LogInIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type LoginResponse = {
  user?: {
    id: string
    name: string
    email: string
    role: string
    access?: string
  }
  error?: string
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const payload = (await response.json().catch(() => ({}))) as LoginResponse
    setSubmitting(false)

    if (!response.ok || !payload.user) {
      setMessage(payload.error ?? "Login gagal.")
      return
    }

    window.localStorage.setItem("irigasi:user", JSON.stringify(payload.user))
    setMessage(`Masuk sebagai ${payload.user.name} (${payload.user.role}).`)
    router.push("/")
    router.refresh()
  }

  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      {...props}
      onSubmit={submitLogin}
    >
      <FieldGroup>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Masuk ke Dashboard</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Gunakan akun operator yang terdaftar di sistem.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="operator@irigasi.local"
            required
            type="email"
            value={email}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <FieldDescription>
            Akun seed: operator@irigasi.local / operator123
          </FieldDescription>
        </Field>
        <Field>
          <Button disabled={submitting} type="submit">
            <LogInIcon />
            {submitting ? "Memproses" : "Masuk"}
          </Button>
        </Field>
        {message ? <FieldError>{message}</FieldError> : null}
      </FieldGroup>
    </form>
  )
}
