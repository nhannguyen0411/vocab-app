"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AUTH_TOKEN_EVENT, getToken } from "@/lib/cognito"

export type JwtClaims = {
  sub?: string
  email?: string
  "cognito:groups"?: string[]
  exp?: number
  [key: string]: unknown
}

export function decodeToken(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1]
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function subscribeToken(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(AUTH_TOKEN_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(AUTH_TOKEN_EVENT, callback)
  }
}

function getTokenServerSnapshot(): string | null {
  return null
}

/** Synchronously synced with localStorage; safe to read during render. */
export function useAuthToken(): string | null {
  return React.useSyncExternalStore(
    subscribeToken,
    getToken,
    getTokenServerSnapshot
  )
}

export function useAuthClaims(): JwtClaims | null {
  const token = useAuthToken()
  return React.useMemo(() => (token ? decodeToken(token) : null), [token])
}

export function useIsAuthenticated(): boolean {
  return useAuthToken() !== null
}

export function useIsAdmin(): boolean {
  const claims = useAuthClaims()
  const groups = claims?.["cognito:groups"]
  return Array.isArray(groups) && groups.includes("admin")
}

/**
 * Client-side route guard. Wrap any page's content with this; it redirects
 * unauthenticated users to /login and non-admins to /dashboard (when
 * requireAdmin is set) before rendering children.
 */
export function AuthGuard({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode
  requireAdmin?: boolean
}) {
  const router = useRouter()
  const authenticated = useIsAuthenticated()
  const admin = useIsAdmin()
  const authorized = authenticated && (!requireAdmin || admin)

  React.useEffect(() => {
    if (!authenticated) {
      router.replace("/login")
    } else if (requireAdmin && !admin) {
      router.replace("/dashboard")
    }
  }, [authenticated, admin, requireAdmin, router])

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col gap-4 px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return <>{children}</>
}
