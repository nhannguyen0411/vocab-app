import { getToken, logout } from "@/lib/cognito"

export type VocabEntry = {
  entry_id: string
  main_chunk: string
  vn_meaning: string
  level: string
  collocations: string[]
  spoken_example: string
  written_example: string
  vn_trap: string
  near_synonym: string
}

export type PracticeType = "speaking" | "writing"

export type ProgressItem = {
  entry_id: string
  practice_type: PracticeType
  stage: "controlled_active" | "automatic"
  review_count: number
  next_review_date: string
}

export type PracticeResult = {
  stage: string
  review_count: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

const SESSION_EXPIRED_MESSAGE =
  "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."

// A 401 on an authenticated request means the token is expired, revoked, or
// otherwise rejected by the backend — in every case the session is dead, so
// we clear it and send the user back to /login rather than surfacing a
// generic fetch error.
function handleUnauthorized() {
  logout()
  if (typeof window !== "undefined") {
    window.location.href = "/login?expired=1"
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  { auth = false }: { auth?: boolean } = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL env var")
  }

  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")

  if (auth) {
    const token = getToken()
    if (!token) {
      throw new ApiError("Not authenticated", 401)
    }
    headers.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401 && auth) {
    handleUnauthorized()
    throw new ApiError(SESSION_EXPIRED_MESSAGE, 401)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new ApiError(body || res.statusText, res.status)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

// Public, unauthenticated endpoints

export function getTopicEntries(category: string) {
  return apiFetch<{ entries: VocabEntry[] }>(
    `/topics/${encodeURIComponent(category)}`
  )
}

export function getEntry(entryId: string) {
  return apiFetch<VocabEntry>(`/vocab/${encodeURIComponent(entryId)}`)
}

export function searchVocab(query: string) {
  return apiFetch<{ entries: VocabEntry[] }>(`/search`, {
    method: "POST",
    body: JSON.stringify({ query }),
  })
}

// Authenticated learner endpoints

export function submitSpeakingPractice(entryId: string, content: string) {
  return apiFetch<PracticeResult>(
    `/vocab/${encodeURIComponent(entryId)}/practice/speaking`,
    { method: "POST", body: JSON.stringify({ content }) },
    { auth: true }
  )
}

export function submitWritingPractice(entryId: string, content: string) {
  return apiFetch<PracticeResult>(
    `/vocab/${encodeURIComponent(entryId)}/practice/writing`,
    { method: "POST", body: JSON.stringify({ content }) },
    { auth: true }
  )
}

export function getMyProgress() {
  return apiFetch<{ progress: ProgressItem[] }>(
    `/progress/me`,
    {},
    { auth: true }
  )
}

// Authenticated admin endpoints

export function getDrafts() {
  return apiFetch<{ drafts: VocabEntry[] }>(
    `/admin/vocab/drafts`,
    {},
    { auth: true }
  )
}

export function updateEntry(entryId: string, fields: Partial<VocabEntry>) {
  return apiFetch<VocabEntry>(
    `/admin/vocab/${encodeURIComponent(entryId)}`,
    { method: "PATCH", body: JSON.stringify(fields) },
    { auth: true }
  )
}

export function publishEntry(entryId: string) {
  return apiFetch<VocabEntry>(
    `/admin/vocab/${encodeURIComponent(entryId)}/publish`,
    { method: "PATCH" },
    { auth: true }
  )
}

export function generateEntry(axis: string, provider: string) {
  return apiFetch<VocabEntry>(
    `/admin/vocab/generate`,
    { method: "POST", body: JSON.stringify({ axis, provider }) },
    { auth: true }
  )
}
