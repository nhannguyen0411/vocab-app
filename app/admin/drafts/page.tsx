"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AuthGuard } from "@/lib/auth"
import { logout } from "@/lib/cognito"
import {
  generateEntry,
  getDrafts,
  publishEntry,
  updateEntry,
  type VocabEntry,
} from "@/lib/api"
import { CATEGORY_LABELS } from "@/lib/curriculum"

const LEVELS = ["B", "N", "W-F"]

const KNOWN_AXES = Object.entries(CATEGORY_LABELS).map(([slug, label]) => ({
  slug,
  label,
}))

// Lowercase, strip Vietnamese diacritics, collapse non-alphanumeric runs
// into a single hyphen, trim leading/trailing hyphens. Mirrors the
// constraint that axis values become a DynamoDB partition key and a URL
// path segment (GET /topics/{category}).
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

type DraftFormState = {
  main_chunk: string
  vn_meaning: string
  level: string
  collocations: string
  spoken_example: string
  written_example: string
  vn_trap: string
  near_synonym: string
}

function toFormState(entry: VocabEntry): DraftFormState {
  return {
    main_chunk: entry.main_chunk,
    vn_meaning: entry.vn_meaning,
    level: entry.level,
    collocations: entry.collocations.join("\n"),
    spoken_example: entry.spoken_example,
    written_example: entry.written_example,
    vn_trap: entry.vn_trap,
    near_synonym: entry.near_synonym,
  }
}

function fromFormState(form: DraftFormState): Partial<VocabEntry> {
  return {
    main_chunk: form.main_chunk,
    vn_meaning: form.vn_meaning,
    level: form.level,
    collocations: form.collocations
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean),
    spoken_example: form.spoken_example,
    written_example: form.written_example,
    vn_trap: form.vn_trap,
    near_synonym: form.near_synonym,
  }
}

export default function AdminDraftsPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminDraftsContent />
    </AuthGuard>
  )
}

function AdminDraftsContent() {
  const router = useRouter()
  const [drafts, setDrafts] = React.useState<VocabEntry[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<DraftFormState | null>(null)
  const [savingId, setSavingId] = React.useState<string | null>(null)
  const [publishingId, setPublishingId] = React.useState<string | null>(null)

  const [axisMode, setAxisMode] = React.useState<"known" | "custom">("known")
  const [knownAxis, setKnownAxis] = React.useState("")
  const [customAxisInput, setCustomAxisInput] = React.useState("")
  const customAxisSlug = slugify(customAxisInput)
  const axis = axisMode === "known" ? knownAxis : customAxisSlug
  const [provider, setProvider] = React.useState("anthropic")
  const [generating, setGenerating] = React.useState(false)
  const [generateError, setGenerateError] = React.useState<string | null>(
    null
  )

  const loadDrafts = React.useCallback(() => {
    return getDrafts()
      .then((res) => {
        setDrafts(res.drafts)
        setError(null)
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Không thể tải bản nháp."
        )
      })
  }, [])

  React.useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  function handleExpand(entry: VocabEntry) {
    if (expandedId === entry.entry_id) {
      setExpandedId(null)
      setForm(null)
      return
    }
    setExpandedId(entry.entry_id)
    setForm(toFormState(entry))
  }

  async function handleSave(entryId: string) {
    if (!form) return
    setSavingId(entryId)
    try {
      const updated = await updateEntry(entryId, fromFormState(form))
      setDrafts((prev) =>
        prev ? prev.map((d) => (d.entry_id === entryId ? updated : d)) : prev
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu thay đổi.")
    } finally {
      setSavingId(null)
    }
  }

  async function handlePublish(entryId: string) {
    setPublishingId(entryId)
    try {
      await publishEntry(entryId)
      setDrafts((prev) =>
        prev ? prev.filter((d) => d.entry_id !== entryId) : prev
      )
      if (expandedId === entryId) {
        setExpandedId(null)
        setForm(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xuất bản.")
    } finally {
      setPublishingId(null)
    }
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault()
    if (!axis) return
    setGenerateError(null)
    setGenerating(true)
    try {
      await generateEntry(axis, provider)
      setKnownAxis("")
      setCustomAxisInput("")
      await loadDrafts()
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Không thể tạo bản nháp."
      )
    } finally {
      setGenerating(false)
    }
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Duyệt bản nháp từ vựng
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chỉnh sửa và xuất bản các mục từ vựng do hệ thống tạo ra.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>

      <form
        onSubmit={handleGenerate}
        className="mt-8 flex flex-wrap items-end gap-3 rounded-lg border border-border p-4"
      >
        <div className="flex min-w-64 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="axis">Chủ đề / trục sinh từ</Label>
            <button
              type="button"
              onClick={() =>
                setAxisMode((mode) => (mode === "known" ? "custom" : "known"))
              }
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {axisMode === "known" ? "Chủ đề khác" : "Chọn từ danh sách"}
            </button>
          </div>

          {axisMode === "known" ? (
            <Select
              value={knownAxis}
              onValueChange={(value) => {
                if (value) setKnownAxis(value)
              }}
            >
              <SelectTrigger id="axis" className="w-full">
                <SelectValue placeholder="Chọn chủ đề..." />
              </SelectTrigger>
              <SelectContent>
                {KNOWN_AXES.map(({ slug, label }) => (
                  <SelectItem key={slug} value={slug}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex flex-col gap-1">
              <Input
                id="axis"
                required
                value={customAxisInput}
                onChange={(event) => setCustomAxisInput(event.target.value)}
                placeholder="vd: Vấn đề mới"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Slug sẽ dùng:{" "}
                <span className="font-mono">{customAxisSlug || "—"}</span>
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="provider">Nhà cung cấp</Label>
          <Select
            value={provider}
            onValueChange={(value) => {
              if (value) setProvider(value)
            }}
          >
            <SelectTrigger id="provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={generating || !axis}>
          {generating ? "Đang tạo..." : "Tạo bản nháp mới"}
        </Button>
        {generateError && (
          <p role="alert" className="w-full text-sm text-destructive">
            {generateError}
          </p>
        )}
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {drafts === null && !error && (
          <>
            <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
          </>
        )}

        {drafts !== null && drafts.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Không có bản nháp nào đang chờ duyệt. Tạo một bản nháp mới ở
              trên để bắt đầu.
            </p>
          </div>
        )}

        {drafts?.map((entry) => (
          <DraftCard
            key={entry.entry_id}
            entry={entry}
            expanded={expandedId === entry.entry_id}
            form={expandedId === entry.entry_id ? form : null}
            onExpand={() => handleExpand(entry)}
            onChange={setForm}
            onSave={() => handleSave(entry.entry_id)}
            onPublish={() => handlePublish(entry.entry_id)}
            saving={savingId === entry.entry_id}
            publishing={publishingId === entry.entry_id}
          />
        ))}
      </div>
    </div>
  )
}

function DraftCard({
  entry,
  expanded,
  form,
  onExpand,
  onChange,
  onSave,
  onPublish,
  saving,
  publishing,
}: {
  entry: VocabEntry
  expanded: boolean
  form: DraftFormState | null
  onExpand: () => void
  onChange: (form: DraftFormState) => void
  onSave: () => void
  onPublish: () => void
  saving: boolean
  publishing: boolean
}) {
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {entry.level}
          </span>
          <span className="font-medium">{entry.main_chunk}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {entry.vn_meaning}
        </span>
      </button>

      {expanded && form && (
        <div className="border-t border-border px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Chunk chính">
              <Input
                value={form.main_chunk}
                onChange={(event) =>
                  onChange({ ...form, main_chunk: event.target.value })
                }
                className="h-9"
              />
            </Field>
            <Field label="Cấp độ">
              <Select
                value={form.level}
                onValueChange={(level) => {
                  if (level) onChange({ ...form, level })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nghĩa tiếng Việt" className="sm:col-span-2">
              <Input
                value={form.vn_meaning}
                onChange={(event) =>
                  onChange({ ...form, vn_meaning: event.target.value })
                }
                className="h-9"
              />
            </Field>
            <Field
              label="Cụm từ đi kèm (mỗi dòng một cụm)"
              className="sm:col-span-2"
            >
              <Textarea
                value={form.collocations}
                onChange={(event) =>
                  onChange({ ...form, collocations: event.target.value })
                }
                rows={3}
              />
            </Field>
            <Field label="Ví dụ nói">
              <Textarea
                value={form.spoken_example}
                onChange={(event) =>
                  onChange({ ...form, spoken_example: event.target.value })
                }
                rows={2}
              />
            </Field>
            <Field label="Ví dụ viết">
              <Textarea
                value={form.written_example}
                onChange={(event) =>
                  onChange({ ...form, written_example: event.target.value })
                }
                rows={2}
              />
            </Field>
            <Field label="Lỗi thường gặp (bẫy tiếng Việt)">
              <Textarea
                value={form.vn_trap}
                onChange={(event) =>
                  onChange({ ...form, vn_trap: event.target.value })
                }
                rows={2}
              />
            </Field>
            <Field label="Từ gần nghĩa">
              <Textarea
                value={form.near_synonym}
                onChange={(event) =>
                  onChange({ ...form, near_synonym: event.target.value })
                }
                rows={2}
              />
            </Field>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
            <Button onClick={onPublish} disabled={publishing}>
              {publishing ? "Đang xuất bản..." : "Xuất bản"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
