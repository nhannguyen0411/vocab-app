"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { SiteNav } from "@/components/site-nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AuthGuard } from "@/lib/auth"
import {
  getEntry,
  getMyProgress,
  submitWritingPractice,
  type PracticeResult,
  type VocabEntry,
} from "@/lib/api"

const MIN_WORDS = 120
const MAX_WORDS = 150
const MIN_CHUNKS = 5

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Word-boundary match on the left side only: a chunk counts as "used" if it
// starts at a word boundary, but we deliberately allow it to be followed by
// more letters (e.g. "opportunity" matches inside "opportunities"). Learners
// naturally inflect chunks they've learned, and that should still count.
// What we guard against is a short chunk matching *inside* an unrelated word,
// e.g. "go" inside "ego" or "argos".
function isChunkUsed(text: string, chunk: string): boolean {
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(chunk.toLowerCase())}`,
    "u"
  )
  return pattern.test(text.toLowerCase())
}

export default function WritingPracticePage() {
  return (
    <React.Suspense fallback={null}>
      <WritingPracticePageInner />
    </React.Suspense>
  )
}

function WritingPracticePageInner() {
  const searchParams = useSearchParams()
  const entryId = searchParams.get("id") ?? ""
  return (
    <AuthGuard>
      <WritingPracticeContent key={entryId} entryId={entryId} />
    </AuthGuard>
  )
}

function WritingPracticeContent({ entryId }: { entryId: string }) {
  const router = useRouter()
  const [entry, setEntry] = React.useState<VocabEntry | null>(null)
  const [chunkPool, setChunkPool] = React.useState<VocabEntry[] | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [text, setText] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<PracticeResult | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [current, progressRes] = await Promise.all([
          getEntry(entryId),
          getMyProgress(),
        ])
        if (cancelled) return
        setEntry(current)

        const learnedIds = Array.from(
          new Set(progressRes.progress.map((p) => p.entry_id))
        )
        if (!learnedIds.includes(entryId)) learnedIds.push(entryId)

        const entries = await Promise.all(
          learnedIds.slice(0, 40).map(async (id) => {
            if (id === entryId) return current
            try {
              return await getEntry(id)
            } catch {
              return null
            }
          })
        )
        if (!cancelled) {
          setChunkPool(entries.filter((e): e is VocabEntry => e !== null))
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Không thể tải dữ liệu."
          )
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [entryId])

  const wordCount = countWords(text)
  const usedChunks = chunkPool
    ? chunkPool.filter((e) => isChunkUsed(text, e.main_chunk))
    : []
  const wordCountOk = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS
  const chunkCountOk = usedChunks.length >= MIN_CHUNKS
  const canSubmit = wordCountOk && chunkCountOk && !submitting

  async function handleSubmit() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await submitWritingPractice(entryId, text)
      setResult(res)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Không thể gửi bài luyện tập."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="min-h-[100dvh]">
        <SiteNav />
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-sm text-destructive">{loadError}</p>
        </main>
      </div>
    )
  }

  if (!entry || !chunkPool) {
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

  if (chunkPool.length < MIN_CHUNKS) {
    const missing = MIN_CHUNKS - chunkPool.length
    return (
      <div className="min-h-[100dvh]">
        <SiteNav />
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            LUYỆN VIẾT · {entry.main_chunk}
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">
            Chưa đủ cụm từ để luyện viết
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Bạn cần học và luyện tập thêm ít nhất {missing} cụm từ nữa trước
            khi có thể viết đoạn văn cho chunk này (yêu cầu tối thiểu{" "}
            {MIN_CHUNKS} cụm từ đã học).
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => router.push("/dashboard")}>
              Về trang chủ
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/vocab?id=${entryId}`)}
            >
              Quay lại thẻ từ
            </Button>
          </div>
        </main>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-[100dvh]">
        <SiteNav />
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            HOÀN THÀNH
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">
            Đã ghi nhận bài viết của bạn
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Giai đoạn: {result.stage} · Số lần ôn tập: {result.review_count}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => router.push(`/vocab?id=${entryId}`)}>
              Quay lại thẻ từ
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Về trang chủ
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          LUYỆN VIẾT · {entry.main_chunk}
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">
          Viết một đoạn văn tiếng Anh
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Viết {MIN_WORDS}-{MAX_WORDS} từ, sử dụng ít nhất {MIN_CHUNKS} cụm
          từ vựng bạn đã học bên dưới.
        </p>

        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={10}
          placeholder="Viết đoạn văn của bạn ở đây..."
          className="mt-6 leading-relaxed"
        />

        <div className="mt-2 flex justify-between text-sm">
          <span
            className={
              wordCountOk ? "text-muted-foreground" : "text-amber-600"
            }
          >
            {wordCount} / {MIN_WORDS}-{MAX_WORDS} từ
          </span>
          <span
            className={
              chunkCountOk ? "text-muted-foreground" : "text-amber-600"
            }
          >
            Đã dùng {usedChunks.length}/{MIN_CHUNKS} cụm từ
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            CỤM TỪ ĐÃ HỌC
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chunkPool.map((e) => {
              const used = isChunkUsed(text, e.main_chunk)
              return (
                <span
                  key={e.entry_id}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    used
                      ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {e.main_chunk}
                </span>
              )
            })}
          </div>
        </div>

        {submitError && (
          <p className="mt-4 text-sm text-destructive">{submitError}</p>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "Đang gửi..." : "Hoàn thành"}
          </Button>
        </div>
      </main>
    </div>
  )
}
