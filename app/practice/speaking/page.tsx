"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { SiteNav } from "@/components/site-nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AuthGuard } from "@/lib/auth"
import {
  getEntry,
  submitSpeakingPractice,
  type PracticeResult,
  type VocabEntry,
} from "@/lib/api"

const STEPS = [
  { key: "look", label: "Nhìn" },
  { key: "hide", label: "Che" },
  { key: "say", label: "Nói" },
  { key: "expand", label: "Mở rộng" },
] as const

export default function SpeakingPracticePage() {
  return (
    <React.Suspense fallback={null}>
      <SpeakingPracticePageInner />
    </React.Suspense>
  )
}

function SpeakingPracticePageInner() {
  const searchParams = useSearchParams()
  const entryId = searchParams.get("id") ?? ""
  return (
    <AuthGuard>
      <SpeakingPracticeContent key={entryId} entryId={entryId} />
    </AuthGuard>
  )
}

function SpeakingPracticeContent({ entryId }: { entryId: string }) {
  const router = useRouter()
  const [entry, setEntry] = React.useState<VocabEntry | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [step, setStep] = React.useState(0)
  const [sayText, setSayText] = React.useState("")
  const [expandText, setExpandText] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<PracticeResult | null>(null)

  React.useEffect(() => {
    let cancelled = false
    getEntry(entryId)
      .then((res) => {
        if (!cancelled) setEntry(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
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

  async function handleComplete() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const content = `[SAY] ${sayText} [EXPAND] ${expandText}`
      const res = await submitSpeakingPractice(entryId, content)
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

  if (result) {
    return (
      <div className="min-h-[100dvh]">
        <SiteNav />
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            HOÀN THÀNH
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">
            Đã ghi nhận buổi luyện nói với &quot;{entry.main_chunk}&quot;
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
              onClick={() => router.push(`/practice/writing?id=${entryId}`)}
            >
              Luyện viết tiếp
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const currentStep = STEPS[step]

  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          LUYỆN NÓI · {entry.main_chunk}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {STEPS.map((s, index) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  index === step
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`text-sm ${
                  index === step ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {index < STEPS.length - 1 && (
                <div className="h-px w-6 bg-border" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-border p-6">
          {currentStep.key === "look" && (
            <div>
              <p className="text-sm text-muted-foreground">
                Nhìn kỹ chunk và cách dùng trong khoảng 15 giây.
              </p>
              <p className="mt-4 text-2xl font-medium tracking-tight">
                {entry.main_chunk}
              </p>
              <p className="mt-1 text-muted-foreground">{entry.vn_meaning}</p>
              <p className="mt-4 text-sm leading-relaxed">
                {entry.spoken_example}
              </p>
              {entry.collocations.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.collocations.map((collocation) => (
                    <span
                      key={collocation}
                      className="rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {collocation}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep.key === "hide" && (
            <div>
              <p className="text-sm text-muted-foreground">
                Che chunk lại. Cố nhớ xem chunk tiếng Anh là gì và cách phát
                âm.
              </p>
              <p className="mt-4 text-2xl font-medium tracking-tight text-muted-foreground/40 select-none">
                ███ ███ ███
              </p>
              <p className="mt-1 text-muted-foreground">{entry.vn_meaning}</p>
            </div>
          )}

          {currentStep.key === "say" && (
            <div>
              <p className="text-sm text-muted-foreground">
                Nói to chunk này ra miệng, sau đó gõ lại đúng những gì bạn
                vừa nói.
              </p>
              <Textarea
                value={sayText}
                onChange={(event) => setSayText(event.target.value)}
                rows={3}
                placeholder="Gõ lại những gì bạn vừa nói..."
                className="mt-4"
              />
            </div>
          )}

          {currentStep.key === "expand" && (
            <div>
              <p className="text-sm text-muted-foreground">
                Mở rộng: viết một câu của riêng bạn sử dụng chunk này.
              </p>
              <Textarea
                value={expandText}
                onChange={(event) => setExpandText(event.target.value)}
                rows={3}
                placeholder="Viết câu của riêng bạn..."
                className="mt-4"
              />
            </div>
          )}
        </div>

        {submitError && (
          <p className="mt-4 text-sm text-destructive">{submitError}</p>
        )}

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
          >
            Quay lại
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
            >
              Tiếp tục
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={submitting || !sayText.trim() || !expandText.trim()}
            >
              {submitting ? "Đang gửi..." : "Hoàn thành"}
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
