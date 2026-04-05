"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function SeasonalBanner() {
  const [event, setEvent] = useState(null)

  useEffect(() => {
    const api = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
    if (!api) return
    fetch(`${api}/bookings/seasonal-events/upcoming/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setEvent(data[0])
      })
      .catch(() => {})
  }, [])

  if (!event) return null

  const q = new URLSearchParams({ prebooking: "true", event_id: String(event.id) }).toString()

  return (
    <div
      className="text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      style={{ background: "#1D5E44" }}
    >
      <div>
        <p className="font-semibold text-sm">{event.name} is coming</p>
        <p className="text-xs opacity-80 mt-0.5">
          Pre-book your decorator or flower vendor now before slots fill up
        </p>
      </div>
      <Link
        href={`/services?${q}`}
        className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold text-white shrink-0"
        style={{ background: "#E8793A" }}
      >
        Pre-book now
      </Link>
    </div>
  )
}
