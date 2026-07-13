"use client"

import { useCallback, useSyncExternalStore } from "react"

export type CurriculumWeek = {
  week: number
  categories: string[]
  isReview?: boolean
}

const WEEK_1_2 = ["tang-giam", "quan-trong-hieu-qua", "van-de-giai-quyet"]
const WEEK_3_4 = ["mo-ta", "so-sanh", "nguyen-nhan-he-qua", "y-kien-mem"]
const WEEK_5_6 = ["gia-dinh", "suc-khoe", "hoc-tap", "cong-nghe", "cong-viec"]
const WEEK_7 = [
  "job-work-career",
  "problem-issue-challenge",
  "say-tell-speak-talk",
  "effective-efficient",
  "price-cost-value",
]

export const CURRICULUM_WEEKS: CurriculumWeek[] = [
  { week: 1, categories: WEEK_1_2 },
  { week: 2, categories: WEEK_1_2 },
  { week: 3, categories: WEEK_3_4 },
  { week: 4, categories: WEEK_3_4 },
  { week: 5, categories: WEEK_5_6 },
  { week: 6, categories: WEEK_5_6 },
  { week: 7, categories: WEEK_7 },
  {
    week: 8,
    categories: [...WEEK_1_2, ...WEEK_3_4, ...WEEK_5_6, ...WEEK_7],
    isReview: true,
  },
]

export const CATEGORY_LABELS: Record<string, string> = {
  "tang-giam": "Tăng / Giảm",
  "quan-trong-hieu-qua": "Quan trọng & Hiệu quả",
  "van-de-giai-quyet": "Vấn đề & Giải quyết",
  "mo-ta": "Mô tả",
  "so-sanh": "So sánh",
  "nguyen-nhan-he-qua": "Nguyên nhân & Hệ quả",
  "y-kien-mem": "Ý kiến (giọng mềm)",
  "gia-dinh": "Gia đình",
  "suc-khoe": "Sức khỏe",
  "hoc-tap": "Học tập",
  "cong-nghe": "Công nghệ",
  "cong-viec": "Công việc",
  "job-work-career": "Job / Work / Career",
  "problem-issue-challenge": "Problem / Issue / Challenge",
  "say-tell-speak-talk": "Say / Tell / Speak / Talk",
  "effective-efficient": "Effective / Efficient",
  "price-cost-value": "Price / Cost / Value",
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

export function getWeek(week: number): CurriculumWeek | undefined {
  return CURRICULUM_WEEKS.find((w) => w.week === week)
}

const CURRENT_WEEK_KEY = "currentWeek"
const CURRENT_WEEK_EVENT = "current-week-changed"

export function getCurrentWeek(): number {
  if (typeof window === "undefined") return 1
  const stored = window.localStorage.getItem(CURRENT_WEEK_KEY)
  const parsed = stored ? Number.parseInt(stored, 10) : 1
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > CURRICULUM_WEEKS.length) {
    return 1
  }
  return parsed
}

export function setCurrentWeek(week: number) {
  if (typeof window === "undefined") return
  const clamped = Math.min(Math.max(week, 1), CURRICULUM_WEEKS.length)
  window.localStorage.setItem(CURRENT_WEEK_KEY, String(clamped))
  window.dispatchEvent(new Event(CURRENT_WEEK_EVENT))
}

function subscribeCurrentWeek(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(CURRENT_WEEK_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(CURRENT_WEEK_EVENT, callback)
  }
}

function getCurrentWeekServerSnapshot(): number {
  return 1
}

/** Synchronously synced with localStorage; returns [week, setWeek]. */
export function useCurrentWeek(): [number, (week: number) => void] {
  const week = useSyncExternalStore(
    subscribeCurrentWeek,
    getCurrentWeek,
    getCurrentWeekServerSnapshot
  )
  const update = useCallback((next: number) => setCurrentWeek(next), [])
  return [week, update]
}
