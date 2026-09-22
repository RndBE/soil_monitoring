"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircleIcon, EyeIcon, EyeOffIcon, LoaderCircleIcon, LogInIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type LoginResponse = {
  user?: { name: string; role: string }
  error?: string
}

/**
 * Hanya izinkan tujuan berupa path internal. Menolak "//evil.com" dan
 * "/\evil.com" yang dibaca browser sebagai host eksternal (open redirect).
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/")) return "/"
  if (value.startsWith("//") || value.startsWith("/\\")) return "/"
  return value
}

/** Akun hasil `npm run db:seed` — tombol isi cepat untuk demo. */
const DEMO_ACCOUNTS = [
  { label: "Admin", username: "admin", password: "admin123" },
  { label: "Operator", username: "operator", password: "operator123" },
  { label: "Viewer", username: "viewer", password: "viewer123" },
]

const inputClass =
  "h-11 rounded-lg border-white/10 bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/25 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-400/20"

export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const router = useRouter()
  const next = safeNext(useSearchParams().get("next"))
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const payload = (await response.json().catch(() => ({}))) as LoginResponse

      if (!response.ok || !payload.user) {
        setError(payload.error ?? "Login gagal. Coba lagi.")
        return
      }

      toast.success(`Selamat datang, ${payload.user.name}`, { description: payload.user.role })
      router.replace(next)
      router.refresh()
    } catch {
      setError("Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-5", className)} {...props} onSubmit={submitLogin}>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-white">
          Masuk ke Sistem
        </h1>
        <p className="text-[12.5px] leading-relaxed text-white/45">
          Gunakan akun operator estate yang terdaftar untuk membuka dashboard pemantauan.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[12.5px] leading-snug text-red-300"
        >
          <AlertCircleIcon className="mt-px size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username" className="text-[11.5px] font-medium text-white/60">
          Username
        </Label>
        <Input
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect="off"
          autoFocus
          className={inputClass}
          id="username"
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          placeholder="nama.pengguna"
          required
          spellCheck={false}
          value={username}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-[11.5px] font-medium text-white/60">
          Password
        </Label>
        <div className="relative">
          <Input
            autoComplete="current-password"
            className={cn(inputClass, "pr-11")}
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-white/35 transition-colors hover:text-white/70"
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>

      <Button
        disabled={submitting}
        type="submit"
        className="h-11 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-[13.5px] font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/30 disabled:opacity-70"
      >
        {submitting ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : (
          <LogInIcon />
        )}
        {submitting ? "Memverifikasi…" : "Masuk"}
      </Button>

      <div className="flex flex-col gap-2 border-t border-white/8 pt-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
          Akun demo
        </span>
        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.username}
              type="button"
              onClick={() => {
                setUsername(account.username)
                setPassword(account.password)
                setError(null)
              }}
              className="rounded-md border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/60 transition-colors hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}
