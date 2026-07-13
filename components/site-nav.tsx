"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useIsAdmin } from "@/lib/auth"
import { logout } from "@/lib/cognito"

const LINKS = [
  { href: "/dashboard", label: "Trang chủ" },
  { href: "/search", label: "Tìm kiếm" },
  { href: "/progress", label: "Tiến độ" },
]

export function SiteNav() {
  const pathname = usePathname()
  const router = useRouter()
  const admin = useIsAdmin()

  function handleLogout() {
    logout()
    router.push("/login")
  }

  const links = admin
    ? [...LINKS, { href: "/admin/drafts", label: "Quản trị" }]
    : LINKS

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium tracking-tight"
        >
          Diễn Đạt
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                pathname === link.href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>
    </header>
  )
}
