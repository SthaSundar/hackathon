"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

function VerifyInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [msg, setMsg] = useState("Verifying your payment…")
  const [err, setErr] = useState("")

  useEffect(() => {
    if (sessionStatus === "loading") return
    const data = searchParams.get("data")
    if (!data) {
      setErr("Missing payment data from eSewa.")
      return
    }
    const bookingId =
      typeof window !== "undefined" ? window.localStorage.getItem("pending_esewa_booking_id") : null
    if (!bookingId) {
      setErr("Could not find booking reference. Open your booking from the dashboard and contact support if money was deducted.")
      return
    }

    const token =
      (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
    if (!token) {
      setErr("Please sign in again to verify payment.")
      return
    }
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/payment/esewa/verify/`, {
          method: "POST",
          headers,
          body: JSON.stringify({ data, booking_id: Number(bookingId) }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.detail || "Verification failed")
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("pending_esewa_booking_id")
        }
        setMsg("Payment successful.")
        router.replace(`/bookings/${bookingId}?payment=success`)
      } catch (e) {
        setErr(e.message || "Verification failed")
      }
    })()
  }, [searchParams, router, session?.accessToken, sessionStatus])

  if (err) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-destructive font-medium">{err}</p>
          <Button asChild variant="outline" className="rounded-full font-bold">
            <Link href="/dashboard?tab=bookings">Back to bookings</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground font-medium">{msg}</p>
    </div>
  )
}

export default function EsewaSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  )
}
