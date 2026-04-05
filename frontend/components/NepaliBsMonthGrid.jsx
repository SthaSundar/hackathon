"use client"

import NepaliDate, { dateConfigMap } from "nepali-date-converter"

const MONTH_KEYS = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
]

export const BS_MONTH_NAMES = MONTH_KEYS

export function daysInBsMonth(year, monthIndex) {
  const cfg = dateConfigMap[String(year)]
  if (!cfg) return 30
  const key = MONTH_KEYS[monthIndex]
  const n = cfg[key]
  return typeof n === "number" ? n : 30
}

export function adYmdFromBsParts(bsYear, monthIndex, day) {
  const js = new NepaliDate(bsYear, monthIndex, day).toJsDate()
  const y = js.getFullYear()
  const m = js.getMonth() + 1
  const d = js.getDate()
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export function bsYearBounds() {
  const ys = Object.keys(dateConfigMap)
    .map(Number)
    .sort((a, b) => a - b)
  return { minY: ys[0], maxY: ys[ys.length - 1] }
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/**
 * Bikram Sambat month grid. Clicks receive AD YYYY-MM-DD for API use.
 */
export default function NepaliBsMonthGrid({
  cursorYear,
  cursorMonth,
  onCursorChange,
  getTileClassName,
  onDayClick,
  selectedAdYmd,
  disabled,
}) {
  const { minY, maxY } = bsYearBounds()
  const nDays = daysInBsMonth(cursorYear, cursorMonth)
  let firstWd = 0
  try {
    firstWd = new NepaliDate(cursorYear, cursorMonth, 1).getDay()
  } catch {
    firstWd = 0
  }
  const startPad = (firstWd + 6) % 7

  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= nDays; d++) cells.push(d)

  const bumpMonth = (delta) => {
    let y = cursorYear
    let m = cursorMonth + delta
    while (m < 0) {
      m += 12
      y -= 1
    }
    while (m > 11) {
      m -= 12
      y += 1
    }
    y = Math.min(maxY, Math.max(minY, y))
    if (!dateConfigMap[String(y)]) return
    onCursorChange(y, m)
  }

  const bumpYear = (delta) => {
    const y = Math.min(maxY, Math.max(minY, cursorYear + delta))
    if (!dateConfigMap[String(y)]) return
    onCursorChange(y, cursorMonth)
  }

  return (
    <div className="npw-nepali-cal-wrap w-full max-w-md">
      <div className="flex items-center justify-between gap-1 mb-3 px-0.5">
        <button
          type="button"
          className="npw-nepali-cal-nav rounded-lg px-2 py-1.5 text-sm font-bold text-foreground hover:bg-primary/10 disabled:opacity-30"
          aria-label="Previous BS year"
          disabled={disabled || cursorYear <= minY}
          onClick={() => bumpYear(-1)}
        >
          «
        </button>
        <button
          type="button"
          className="npw-nepali-cal-nav rounded-lg px-2 py-1.5 text-lg font-bold text-foreground hover:bg-primary/10 disabled:opacity-30"
          aria-label="Previous BS month"
          disabled={disabled}
          onClick={() => bumpMonth(-1)}
        >
          ‹
        </button>
        <span className="flex-1 text-center text-sm font-black text-foreground px-1">
          {MONTH_KEYS[cursorMonth]} {cursorYear}
        </span>
        <button
          type="button"
          className="npw-nepali-cal-nav rounded-lg px-2 py-1.5 text-lg font-bold text-foreground hover:bg-primary/10 disabled:opacity-30"
          aria-label="Next BS month"
          disabled={disabled}
          onClick={() => bumpMonth(1)}
        >
          ›
        </button>
        <button
          type="button"
          className="npw-nepali-cal-nav rounded-lg px-2 py-1.5 text-sm font-bold text-foreground hover:bg-primary/10 disabled:opacity-30"
          aria-label="Next BS year"
          disabled={disabled || cursorYear >= maxY}
          onClick={() => bumpYear(1)}
        >
          »
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`pad-${idx}`} className="h-9" />
          const ad = adYmdFromBsParts(cursorYear, cursorMonth, day)
          return (
            <button
              key={day}
              type="button"
              disabled={disabled || typeof onDayClick !== "function"}
              className={[
                "npw-nepali-cal-day h-9 rounded-xl text-sm font-bold transition-colors",
                getTileClassName?.(ad) || "",
                selectedAdYmd === ad ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onDayClick?.(ad)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
