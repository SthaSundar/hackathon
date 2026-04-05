"use client"

import { useCallback, useEffect, useState } from "react"
import NepaliDate from "nepali-date-converter"
import { toast } from "sonner"
import { getApiBase } from "@/lib/apiBase"
import NepaliBsMonthGrid, { daysInBsMonth } from "@/components/NepaliBsMonthGrid"

function uniqueAdMonthsForBsMonth(bsYear, bsMonth) {
  const n = daysInBsMonth(bsYear, bsMonth)
  const months = new Set()
  for (let day = 1; day <= n; day++) {
    const js = new NepaliDate(bsYear, bsMonth, day).toJsDate()
    months.add(`${js.getFullYear()}-${String(js.getMonth() + 1).padStart(2, "0")}`)
  }
  return [...months]
}

/**
 * @param {number} providerId
 * @param {boolean} editable
 * @param {() => string | null} getToken
 */
export default function ProviderAvailabilityCalendar({ providerId, editable, getToken }) {
  const init = new NepaliDate()
  const [cursorY, setCursorY] = useState(() => init.getYear())
  const [cursorM, setCursorM] = useState(() => init.getMonth())
  const [unavailable, setUnavailable] = useState(() => new Set())
  const [busy, setBusy] = useState(false)

  const handleCursorChange = (y, m) => {
    setCursorY(y)
    setCursorM(m)
  }

  const load = useCallback(async () => {
    if (!providerId) return
    const api = getApiBase()
    try {
      const monthKeys = uniqueAdMonthsForBsMonth(cursorY, cursorM)
      const merged = new Set()
      for (const monthStr of monthKeys) {
        const r = await fetch(`${api}/accounts/providers/${providerId}/availability/?month=${monthStr}`)
        if (r.ok) {
          const d = await r.json()
          ;(d.unavailable_dates || []).forEach((s) => merged.add(s))
        }
      }
      setUnavailable(merged)
    } catch {
      setUnavailable(new Set())
      toast.error("Could not load availability.")
    }
  }, [providerId, cursorY, cursorM])

  useEffect(() => {
    load()
  }, [load])

  const getTileClassName = (adYmd) =>
    unavailable.has(adYmd) ? "npw-cal-unavailable" : "npw-cal-available"

  const onDayClick = async (adYmd) => {
    if (!editable || busy) return
    const token = getToken?.()
    if (!token) {
      toast.error("Sign in again to change availability.")
      return
    }
    const api = getApiBase()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    setBusy(true)
    try {
      if (unavailable.has(adYmd)) {
        const r = await fetch(`${api}/accounts/providers/${providerId}/availability/${adYmd}/`, {
          method: "DELETE",
          headers,
        })
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          toast.error(j.detail || "Could not clear that date.")
          return
        }
      } else {
        const r = await fetch(`${api}/accounts/providers/${providerId}/availability/`, {
          method: "POST",
          headers,
          body: JSON.stringify({ date: adYmd }),
        })
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          toast.error(j.detail || "Could not block that date.")
          return
        }
      }
      await load()
    } catch {
      toast.error("Network error.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`npw-cal-wrap max-w-md ${busy ? "opacity-70" : ""}`}>
      <NepaliBsMonthGrid
        cursorYear={cursorY}
        cursorMonth={cursorM}
        onCursorChange={handleCursorChange}
        getTileClassName={getTileClassName}
        onDayClick={editable ? onDayClick : undefined}
        disabled={busy}
      />
      <p className="text-[11px] text-muted-foreground mt-3">
        Bikram Sambat (Nepali) calendar — days are stored in Gregorian for bookings.
      </p>
      {editable && (
        <p className="text-xs text-muted-foreground mt-1">
          Tap a date to mark unavailable (red). Tap again to mark available (green).
        </p>
      )}
    </div>
  )
}
