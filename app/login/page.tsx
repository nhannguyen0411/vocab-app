"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/lib/cognito"

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)

  if (message.startsWith("NEW_PASSWORD_REQUIRED")) {
    return "Tài khoản của bạn cần đặt lại mật khẩu. Vui lòng liên hệ quản trị viên."
  }
  if (
    message.includes("Incorrect username or password") ||
    message.includes("NotAuthorizedException")
  ) {
    return "Email hoặc mật khẩu không đúng."
  }
  if (message.includes("UserNotFoundException")) {
    return "Không tìm thấy tài khoản với email này."
  }
  return "Đăng nhập thất bại. Vui lòng thử lại."
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expired = searchParams.get("expired") === "1"
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(email, password)
      router.push("/dashboard")
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-zinc-950 p-12 text-zinc-50 lg:flex">
        <span className="text-sm font-medium tracking-tight">Diễn Đạt</span>
        <div className="max-w-md">
          <p className="text-3xl leading-snug font-medium tracking-tight">
            Học một chunk, dùng được trong cả bài nói lẫn bài viết.
          </p>
          <p className="mt-4 text-sm text-zinc-400">
            Luyện theo phương pháp Nhìn, Che, Nói, Mở rộng, rồi viết đoạn văn
            của riêng bạn.
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          Dành cho người học tiếng Anh trình độ trung cấp trở lên.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="text-sm font-medium tracking-tight">
              Diễn Đạt
            </span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Đăng nhập</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tiếp tục lộ trình từ vựng của bạn.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            {expired && (
              <p role="alert" className="text-sm text-destructive">
                Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="mt-2 h-10 w-full"
            >
              {pending ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
