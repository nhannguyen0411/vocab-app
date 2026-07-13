"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { SiteNav } from "@/components/site-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthGuard } from "@/lib/auth"
import { searchVocab, type VocabEntry } from "@/lib/api"

export default function SearchPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<SearchFallback />}>
        <SearchContent />
      </Suspense>
    </AuthGuard>
  )
}

function SearchFallback() {
  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </main>
    </div>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""
  const [query, setQuery] = React.useState(initialQuery)
  const [results, setResults] = React.useState<VocabEntry[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  // Auto-run the search carried over from the URL (e.g. from the dashboard
  // search bar). Kept separate from handleSubmit below since setting a
  // loading flag synchronously at the top of an effect is a React anti-pattern.
  React.useEffect(() => {
    if (!initialQuery.trim()) return
    let cancelled = false
    searchVocab(initialQuery.trim())
      .then((res) => {
        if (!cancelled) setResults(res.entries)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể tìm kiếm.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [initialQuery])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (!q) {
      setResults(null)
      return
    }
    setPending(true)
    setError(null)
    searchVocab(q)
      .then((res) => setResults(res.entries))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không thể tìm kiếm.")
      })
      .finally(() => setPending(false))
  }

  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-medium tracking-tight">Tìm từ vựng</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhập một câu hoặc ý tiếng Việt, hệ thống sẽ tìm chunk tiếng Anh
          phù hợp.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="vd: giá cả tăng nhanh quá"
            className="h-10 flex-1"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Đang tìm..." : "Tìm"}
          </Button>
        </form>

        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        {pending && results === null && (
          <div className="mt-6 flex flex-col gap-2">
            <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {results !== null && results.length === 0 && !pending && (
          <p className="mt-6 text-sm text-muted-foreground">
            Không tìm thấy chunk phù hợp. Hãy thử diễn đạt lại câu tìm kiếm.
          </p>
        )}

        {results && results.length > 0 && (
          <ul className="mt-6 flex flex-col divide-y divide-border rounded-lg border border-border">
            {results.map((entry) => (
              <li key={entry.entry_id}>
                <Link
                  href={`/vocab?id=${entry.entry_id}`}
                  className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{entry.main_chunk}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {entry.vn_meaning}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {entry.level}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
