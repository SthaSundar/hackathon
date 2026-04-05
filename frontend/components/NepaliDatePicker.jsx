"use client"

import { useEffect, useState } from "react"
import NepaliDate from "nepali-date-converter"
import NepaliBsMonthGrid from "@/components/NepaliBsMonthGrid"
import { Button } from "@/components/ui/button"

function cursorFromAdYmd(value) {
  if (value) {
    try {
      const n = new NepaliDate(new Date(`${value}T12:00:00`))
      return { y: n.getYear(), m: n.getMonth() }
    } catch {
      /* fall through */
    }
  }
  const n = new NepaliDate()
  return { y: n.getYear(), m: n.getMonth() }
}

function bsLineFromAdYmd(adYmd) {
  if (!adYmd) return ""
  try {
    const n = new NepaliDate(new Date(`${adYmd}T12:00:00`))
    const y = n.getYear()
    const m = n.getMonth() + 1
    const d = n.getDate()
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} BS`
  } catch {
    return ""
  }
}

/**
 * Bikram Sambat calendar; `value` / `onChange` use AD YYYY-MM-DD for APIs.
 */
export default function NepaliDatePicker({ value, onChange, label, className = "", disabled }) {
  const [cursorY, setCursorY] = useState(() => cursorFromAdYmd(value).y)
  const [cursorM, setCursorM] = useState(() => cursorFromAdYmd(value).m)

  useEffect(() => {
    const c = cursorFromAdYmd(value)
    setCursorY(c.y)
    setCursorM(c.m)
  }, [value])

  const handleCursorChange = (y, m) => {
    setCursorY(y)
    setCursorM(m)
  }

  const handlePick = (adYmd) => {
    onChange?.(adYmd)
  }

  const bsPreview = value ? bsLineFromAdYmd(value) : ""

  return (
    <div className={className}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {label}
        </label>
      )}
      <div className="rounded-2xl border border-primary/15 bg-background p-3">
        <NepaliBsMonthGrid
          cursorYear={cursorY}
          cursorMonth={cursorM}
          onCursorChange={handleCursorChange}
          selectedAdYmd={value || undefined}
          onDayClick={handlePick}
          disabled={disabled}
        />
      </div>
      {value && (
        <div className="mt-2 space-y-1 pl-0.5">
          <p className="text-[11px] font-semibold text-[#1D5E44]">Selected (BS): {bsPreview}</p>
          <p className="text-[10px] text-muted-foreground">Saved as Gregorian: {value}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            disabled={disabled}
            onClick={() => onChange?.("")}
          >
            Clear date
          </Button>
        </div>
      )}
      {!value && (
        <p className="text-[10px] text-muted-foreground mt-2 pl-0.5">
          Tap a day in Bikram Sambat. The server stores the matching Gregorian date.
        </p>
      )}
    </div>
  )
}
