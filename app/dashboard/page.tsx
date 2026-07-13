"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SiteNav } from "@/components/site-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthGuard } from "@/lib/auth"
import { getEntry, getMyProgress, type ProgressItem } from "@/lib/api"
import {
  CURRICULUM_WEEKS,
  categoryLabel,
  getWeek,
  useCurrentWeek,
} from "@/lib/curriculum"

type DueItem = {
  entryId: string
  nextReviewDate: string
  practiceTypes: string[]
  mainChunk?: string
}

function isDue(dateStr: string): boolean {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() <= Date.now()
}

function practiceTypeLabel(type: string): string {
  return type === "speaking" ? "Nói" : type === "writing" ? "Viết" : type
}

function groupDue(progress: ProgressItem[]): DueItem[] {
  const byEntry = new Map<string, DueItem>()
  for (const item of progress) {
    if (!isDue(item.next_review_date)) continue
    const existing = byEntry.get(item.entry_id)
    if (existing) {
      existing.practiceTypes.push(item.practice_type)
      if (item.next_review_date < existing.nextReviewDate) {
        existing.nextReviewDate = item.next_review_date
      }
    } else {
      byEntry.set(item.entry_id, {
        entryId: item.entry_id,
        nextReviewDate: item.next_review_date,
        practiceTypes: [item.practice_type],
      })
    }
  }
  return Array.from(byEntry.values()).sort((a, b) =>
    a.nextReviewDate.localeCompare(b.nextReviewDate)
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}

function DashboardContent() {
  const router = useRouter()
  const [week, setWeek] = useCurrentWeek()
  const [query, setQuery] = React.useState("")
  const [dueItems, setDueItems] = React.useState<DueItem[] | null>(null)
  const [progressError, setProgressError] = React.useState<string | null>(
    null
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await getMyProgress()
        const due = groupDue(res.progress).slice(0, 5)
        const withChunks = await Promise.all(
          due.map(async (item) => {
            try {
              const entry = await getEntry(item.entryId)
              return { ...item, mainChunk: entry.main_chunk }
            } catch {
              return item
            }
          })
        )
        if (!cancelled) setDueItems(withChunks)
      } catch (err) {
        if (!cancelled) {
          setProgressError(
            err instanceof Error ? err.message : "Không thể tải tiến độ."
          )
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const currentWeek = getWeek(week)

  function changeWeek(delta: number) {
    const next = Math.min(Math.max(week + delta, 1), CURRICULUM_WEEKS.length)
    setWeek(next)
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-medium tracking-tight">
          Lộ trình 8 tuần của bạn
        </h1>

        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập một câu tiếng Việt để tìm từ vựng liên quan..."
            className="h-10 flex-1"
          />
          <Button type="submit">Tìm</Button>
        </form>

        <section className="mt-10 rounded-lg border border-border p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                TUẦN HIỆN TẠI
              </p>
              <p className="mt-1 text-xl font-medium tracking-tight">
                Tuần {week} / {CURRICULUM_WEEKS.length}
                {currentWeek?.isReview ? " · Ôn tập" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeWeek(-1)}
                disabled={week <= 1}
              >
                Tuần trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeWeek(1)}
                disabled={week >= CURRICULUM_WEEKS.length}
              >
                Tuần sau
              </Button>
            </div>
          </div>

          {currentWeek?.isReview ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Tuần ôn tập: không có chủ đề mới. Hãy quay lại các chủ đề bên
              dưới để củng cố.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {currentWeek?.categories.map((category) => (
              <Link
                key={category}
                href={`/topics?category=${category}`}
                className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {categoryLabel(category)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            ĐẾN HẠN ÔN TẬP
          </p>

          {progressError && (
            <p className="mt-3 text-sm text-destructive">{progressError}</p>
          )}

          {dueItems === null && !progressError && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
            </div>
          )}

          {dueItems !== null && dueItems.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Không có mục nào đến hạn ôn tập. Hãy học từ mới ở trên.
            </p>
          )}

          {dueItems && dueItems.length > 0 && (
            <ul className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border">
              {dueItems.map((item) => (
                <li key={item.entryId}>
                  <Link
                    href={`/vocab?id=${item.entryId}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted"
                  >
                    <span className="font-medium">
                      {item.mainChunk ?? item.entryId}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.practiceTypes.map(practiceTypeLabel).join(", ")}
                      {" · hạn "}
                      {new Date(item.nextReviewDate).toLocaleDateString(
                        "vi-VN"
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            TẤT CẢ CHỦ ĐỀ
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(
              new Set(CURRICULUM_WEEKS.flatMap((w) => w.categories))
            ).map((category) => (
              <Link
                key={category}
                href={`/topics?category=${category}`}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {categoryLabel(category)}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
