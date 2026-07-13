"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { SiteNav } from "@/components/site-nav"
import { AuthGuard } from "@/lib/auth"
import { getTopicEntries, type VocabEntry } from "@/lib/api"
import { categoryLabel } from "@/lib/curriculum"

export default function TopicPage() {
  return (
    <React.Suspense fallback={null}>
      <TopicPageInner />
    </React.Suspense>
  )
}

function TopicPageInner() {
  const searchParams = useSearchParams()
  const category = searchParams.get("category") ?? ""
  return (
    <AuthGuard>
      <TopicContent key={category} category={category} />
    </AuthGuard>
  )
}

function TopicContent({ category }: { category: string }) {
  const [entries, setEntries] = React.useState<VocabEntry[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    getTopicEntries(category)
      .then((res) => {
        if (!cancelled) setEntries(res.entries)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Không thể tải chủ đề."
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [category])

  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          CHỦ ĐỀ
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">
          {categoryLabel(category)}
        </h1>

        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        {entries === null && !error && (
          <div className="mt-6 flex flex-col gap-2">
            <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {entries !== null && entries.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            Chủ đề này chưa có mục từ vựng nào.
          </p>
        )}

        {entries && entries.length > 0 && (
          <ul className="mt-6 flex flex-col divide-y divide-border rounded-lg border border-border">
            {entries.map((entry) => (
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
