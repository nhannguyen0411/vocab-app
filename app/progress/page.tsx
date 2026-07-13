"use client"

import * as React from "react"
import Link from "next/link"

import { SiteNav } from "@/components/site-nav"
import { AuthGuard } from "@/lib/auth"
import {
  getEntry,
  getMyProgress,
  type ProgressItem,
  type VocabEntry,
} from "@/lib/api"

type GroupedProgress = {
  entryId: string
  items: ProgressItem[]
  earliestNextReview: string
  entry?: VocabEntry
}

function stageLabel(stage: string): string {
  return stage === "automatic" ? "Đã thành thạo" : "Đang luyện tập"
}

function practiceTypeLabel(type: string): string {
  return type === "speaking" ? "Nói" : type === "writing" ? "Viết" : type
}

function groupByEntry(progress: ProgressItem[]): GroupedProgress[] {
  const map = new Map<string, GroupedProgress>()
  for (const item of progress) {
    const existing = map.get(item.entry_id)
    if (existing) {
      existing.items.push(item)
      if (item.next_review_date < existing.earliestNextReview) {
        existing.earliestNextReview = item.next_review_date
      }
    } else {
      map.set(item.entry_id, {
        entryId: item.entry_id,
        items: [item],
        earliestNextReview: item.next_review_date,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.earliestNextReview.localeCompare(b.earliestNextReview)
  )
}

export default function ProgressPage() {
  return (
    <AuthGuard>
      <ProgressContent />
    </AuthGuard>
  )
}

function ProgressContent() {
  const [groups, setGroups] = React.useState<GroupedProgress[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await getMyProgress()
        const grouped = groupByEntry(res.progress)
        const withEntries = await Promise.all(
          grouped.map(async (group) => {
            try {
              const entry = await getEntry(group.entryId)
              return { ...group, entry }
            } catch {
              return group
            }
          })
        )
        if (!cancelled) setGroups(withEntries)
      } catch (err) {
        if (!cancelled) {
          setError(
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

  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-medium tracking-tight">
          Tiến độ của bạn
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trạng thái luyện tập và lịch ôn tập cho từng chunk.
        </p>

        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        {groups === null && !error && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {groups !== null && groups.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            Bạn chưa có mục nào được luyện tập. Hãy bắt đầu từ trang chủ.
          </p>
        )}

        {groups && groups.length > 0 && (
          <ul className="mt-6 flex flex-col gap-3">
            {groups.map((group) => (
              <li
                key={group.entryId}
                className="rounded-lg border border-border p-4"
              >
                <Link
                  href={`/vocab?id=${group.entryId}`}
                  className="font-medium hover:underline"
                >
                  {group.entry?.main_chunk ?? group.entryId}
                </Link>
                {group.entry?.vn_meaning && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {group.entry.vn_meaning}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-3">
                  {group.items.map((item) => (
                    <div
                      key={item.practice_type}
                      className="rounded-md bg-muted px-3 py-2 text-sm"
                    >
                      <span className="font-medium">
                        {practiceTypeLabel(item.practice_type)}
                      </span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {stageLabel(item.stage)}
                        {" · hạn "}
                        {new Date(item.next_review_date).toLocaleDateString(
                          "vi-VN"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
