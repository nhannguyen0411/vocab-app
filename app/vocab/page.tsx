"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { SiteNav } from "@/components/site-nav"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/lib/auth"
import { getEntry, type VocabEntry } from "@/lib/api"

export default function VocabPage() {
  return (
    <React.Suspense fallback={null}>
      <VocabPageInner />
    </React.Suspense>
  )
}

function VocabPageInner() {
  const searchParams = useSearchParams()
  const entryId = searchParams.get("id") ?? ""
  return (
    <AuthGuard>
      <VocabContent key={entryId} entryId={entryId} />
    </AuthGuard>
  )
}

function VocabContent({ entryId }: { entryId: string }) {
  const [entry, setEntry] = React.useState<VocabEntry | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    getEntry(entryId)
      .then((res) => {
        if (!cancelled) setEntry(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải mục từ vựng."
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [entryId])

  if (error) {
    return (
      <div className="min-h-[100dvh]">
        <SiteNav />
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-sm text-destructive">{error}</p>
        </main>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="min-h-[100dvh]">
        <SiteNav />
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="mt-6 h-64 w-full animate-pulse rounded-lg bg-muted" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {entry.level}
        </span>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          {entry.main_chunk}
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">
          {entry.vn_meaning}
        </p>

        <div className="mt-8 flex flex-col gap-6">
          {entry.collocations.length > 0 && (
            <Section label="Cụm từ đi kèm">
              <div className="flex flex-wrap gap-2">
                {entry.collocations.map((collocation) => (
                  <span
                    key={collocation}
                    className="rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    {collocation}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Section label="Ví dụ khi nói">
            <p className="text-sm leading-relaxed">{entry.spoken_example}</p>
          </Section>

          <Section label="Ví dụ khi viết">
            <p className="text-sm leading-relaxed">{entry.written_example}</p>
          </Section>

          {entry.near_synonym && (
            <Section label="Từ gần nghĩa">
              <p className="text-sm leading-relaxed">{entry.near_synonym}</p>
            </Section>
          )}

          {entry.vn_trap && (
            <div className="rounded-lg border border-amber-600/30 bg-amber-600/10 px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-amber-700 dark:text-amber-500">
                LỖI THƯỜNG GẶP
              </p>
              <p className="mt-1 text-sm leading-relaxed">{entry.vn_trap}</p>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-border px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Trước khi luyện tập, hãy tự đặt một câu của riêng bạn với chunk
            này. Không ai chấm điểm câu đó, đây là bước tự luyện.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            render={
              <Link href={`/practice/speaking?id=${entry.entry_id}`}>
                Luyện nói
              </Link>
            }
          />
          <Button
            variant="outline"
            render={
              <Link href={`/practice/writing?id=${entry.entry_id}`}>
                Luyện viết
              </Link>
            }
          />
        </div>
      </main>
    </div>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        {label.toUpperCase()}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
